const bcrypt = require("bcryptjs");
const { PrismaClient } = require("@prisma/client");
const { rateRows } = require("../src/data/pricing");

const prisma = new PrismaClient();

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

async function seedCatalog() {
  const paperCount = await prisma.paperType.count();
  if (paperCount > 0) {
    console.log("Catalog already seeded — skipping.");
    return;
  }

  const paperNames = [...new Set(rateRows.map((r) => r.paperGsm))];
  const sizeNames = [...new Set(rateRows.map((r) => r.size))];
  const sideNames = [...new Set(rateRows.map((r) => r.printingSide))];

  const paperMap = {};
  for (let i = 0; i < paperNames.length; i += 1) {
    const name = paperNames[i];
    const row = rateRows.find((r) => r.paperGsm === name && r.quantity === "1000");
    const paper = await prisma.paperType.create({
      data: {
        name,
        availableQuantity: 100000,
        ratePerThousand: row ? row.rate : 0,
        sortOrder: i,
      },
    });
    paperMap[normalize(name)] = paper.id;
  }

  const sizeMap = {};
  for (let i = 0; i < sizeNames.length; i += 1) {
    const name = sizeNames[i];
    const size = await prisma.paperSize.create({ data: { name, sortOrder: i } });
    sizeMap[normalize(name)] = size.id;
  }

  const sideMap = {};
  for (let i = 0; i < sideNames.length; i += 1) {
    const name = sideNames[i];
    const side = await prisma.printingSideOption.create({ data: { name, sortOrder: i } });
    sideMap[normalize(name)] = side.id;
  }

  const seen = new Set();
  for (const row of rateRows) {
    const key = [normalize(row.paperGsm), normalize(row.size), normalize(row.printingSide)].join("|");
    if (seen.has(key)) continue;
    seen.add(key);

    const qty = Number(row.quantity) || 1000;
    const ratePerThousand = Math.round(row.rate / (qty / 1000));

    await prisma.priceRule.create({
      data: {
        paperTypeId: paperMap[normalize(row.paperGsm)],
        sizeId: sizeMap[normalize(row.size)],
        printingSideId: sideMap[normalize(row.printingSide)],
        ratePerThousand,
      },
    });
  }

  await prisma.paymentQr.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, imagePath: "" },
  });

  console.log(`Catalog seeded — ${paperNames.length} papers, ${sizeNames.length} sizes, ${sideNames.length} sides.`);
}

async function main() {
  await prisma.orderCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, value: 1 },
  });

  await prisma.receiptCounter.upsert({
    where: { id: 1 },
    update: {},
    create: { id: 1, value: 1 },
  });

  const adminPhone = process.env.ADMIN_PHONE || "9999999999";
  const adminPassword = process.env.ADMIN_PASSWORD || "1234";
  const adminEmail = process.env.ADMIN_EMAIL || "admin@pixeldigital.com";

  const existing = await prisma.account.findFirst({
    where: { phone: adminPhone, role: "ADMIN" },
  });
  if (!existing) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.account.create({
      data: {
        name: "Admin",
        business: "PIXEL DIGITAL",
        phone: adminPhone,
        email: adminEmail,
        passwordHash,
        role: "ADMIN",
        status: "APPROVED",
        authProvider: "PHONE",
      },
    });
    console.log(`Admin created — phone: ${adminPhone}, password: ${adminPassword}`);
  }

  await seedCatalog();
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
