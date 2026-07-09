require("dotenv").config();
const { runDailyBackup } = require("../src/lib/backup");

async function main() {
  const result = await runDailyBackup({ trigger: "cli" });
  console.log("Backup emailed successfully:");
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((error) => {
    console.error("Backup failed:", error.message || error);
    process.exit(1);
  })
  .finally(async () => {
    const { prisma } = require("../src/lib/prisma");
    await prisma.$disconnect();
  });
