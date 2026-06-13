const rateRows = [
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 X 5.5", quantity: "1000", printingSide: "Single Side", rate: 600 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 X 5.5", quantity: "1000", printingSide: "Front Back", rate: 1200 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "130 art", size: "8.5 x 5.5", quantity: "1000", printingSide: "Single Side", rate: 800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "130 art", size: "8.5 x 5.5", quantity: "1000", printingSide: "Front Back", rate: 1400 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "80 Mapl.", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 1000 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 1150 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 Mapl.", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 1200 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 1300 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 bond", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 1500 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "1000", printingSide: "Front Back", rate: 1900 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 Mapl.", size: "8.5 x 11", quantity: "1000", printingSide: "Front Back", rate: 2100 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "1000", printingSide: "Front Back", rate: 1950 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 Bond", size: "8.5 x 11", quantity: "1000", printingSide: "Front Back", rate: 2400 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "250 gsm.", size: "8 x 5", quantity: "1000", printingSide: "Single Side", rate: 950 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "250 gsm.", size: "8 x 5", quantity: "1000", printingSide: "Front Back", rate: 1700 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "250 gsm.", size: "8.5 x 11", quantity: "1000", printingSide: "Single Side", rate: 2500 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "250 gsm.", size: "8.5 x 11", quantity: "1000", printingSide: "Front Back", rate: 3500 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "4000", printingSide: "Single Side", rate: 4400 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "4000", printingSide: "Front Back", rate: 4800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "5000", printingSide: "Single Side", rate: 5200 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "5000", printingSide: "Front Back", rate: 5500 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "10000", printingSide: "Single Side", rate: 8200 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "90 art", size: "8.5 x 11", quantity: "10000", printingSide: "Front Back", rate: 8900 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "4000", printingSide: "Single Side", rate: 5550 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "4000", printingSide: "Front Back", rate: 5550 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "5000", printingSide: "Single Side", rate: 6200 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "5000", printingSide: "Front Back", rate: 6800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "10000", printingSide: "Single Side", rate: 10000 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "120 art", size: "8.5 x 11", quantity: "10000", printingSide: "Front Back", rate: 10700 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "4000", printingSide: "Single Side", rate: 4800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "4000", printingSide: "Front Back", rate: 5150 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "5000", printingSide: "Single Side", rate: 5600 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "5000", printingSide: "Front Back", rate: 6000 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "10000", printingSide: "Single Side", rate: 9400 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "100 mapl.", size: "8.5 x 11", quantity: "10000", printingSide: "Front Back", rate: 10000 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "80 mapl.", size: "8.5 x 11", quantity: "4000", printingSide: "Single Side", rate: 4250 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "80 mapl.", size: "8.5 x 11", quantity: "5000", printingSide: "Single Side", rate: 4900 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "80 mapl.", size: "8.5 x 11", quantity: "10000", printingSide: "Single Side", rate: 7600 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "a4 100 bond", size: "8.5 x 11", quantity: "4000", printingSide: "Single Side", rate: 5800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "a4 100 bond", size: "8.5 x 11", quantity: "5000", printingSide: "Single Side", rate: 6600 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "a4 100 bond", size: "8.5 x 11", quantity: "10000", printingSide: "Single Side", rate: 12000 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "350 gsm.", size: "V.C.", quantity: "1000", printingSide: "Single Side", rate: 800 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "350 gsm.", size: "V.C.", quantity: "1000", printingSide: "Front Back", rate: 1150 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "350 gsm.", size: "V.C.+U.V.", quantity: "1000", printingSide: "Single Side", rate: 900 },
  { category: "PAMPLET / LEAFLET", product: "LEAFLET / PAMPLET", paperGsm: "350 gsm.", size: "V.C.+U.V.", quantity: "1000", printingSide: "Front Back", rate: 1250 },
];

const paperGsmOptions = [
  "90 art",
  "130 art",
  "80 Mapl.",
  "100 Mapl.",
  "120 art",
  "100 bond",
  "250 gsm.",
  "350 gsm.",
  "a4 100 bond",
  "OTHER ENQUIRY",
];

const marketingProducts = [
  { name: "Visiting Cards", tag: "Premium finish" },
  { name: "Leaflets / Pamphlets", tag: "Order online", active: true },
  { name: "Posters & Banners", tag: "Large format" },
  { name: "Stickers & Labels", tag: "Custom sizes" },
  { name: "Doctor Files", tag: "Medical stationery" },
  { name: "Bill Books", tag: "NCR copies" },
  { name: "Envelopes", tag: "Branded mailers" },
  { name: "Letterheads", tag: "Corporate identity" },
  { name: "Calendars", tag: "Wall & desk" },
  { name: "Brochures", tag: "Folded marketing" },
  { name: "Packaging", tag: "Boxes & sleeves" },
];

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function findRate({ paperGsm, size, quantity, printingSide }) {
  return rateRows.find(
    (row) =>
      normalize(row.paperGsm) === normalize(paperGsm) &&
      normalize(row.size) === normalize(size) &&
      normalize(row.quantity) === normalize(quantity) &&
      normalize(row.printingSide) === normalize(printingSide)
  );
}

function optionsForGsm(paperGsm) {
  const rows = rateRows.filter((row) => normalize(row.paperGsm) === normalize(paperGsm));
  return {
    sizes: [...new Set(rows.map((r) => r.size))],
    quantities: [...new Set(rows.map((r) => r.quantity))],
    printingSides: [...new Set(rows.map((r) => r.printingSide))],
  };
}

module.exports = {
  rateRows,
  paperGsmOptions,
  marketingProducts,
  findRate,
  optionsForGsm,
};
