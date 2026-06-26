const XLSX = require("xlsx");

const ORDER_KEYS = ["orderno", "order no", "order number", "order no.", "order"];
const LR_KEYS = ["lr no", "lrno", "lr number", "lr no.", "lr", "l.r. no", "l.r no"];
const TRANSPORT_KEYS = [
  "transport no",
  "transprt no",
  "transport",
  "transport details",
  "bus",
  "bilty",
  "lr / bilty",
];
const DATE_KEYS = ["date", "dispatch date", "despatch date", "dispatch"];

function normalizeKey(value) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .replace(/[_]+/g, " ")
    .replace(/\s+/g, " ")
    .replace(/\./g, "");
}

function pickValue(row, keys) {
  for (const [header, value] of Object.entries(row)) {
    const normalized = normalizeKey(header);
    if (keys.includes(normalized)) {
      return value;
    }
  }
  return "";
}

function normalizeOrderNumber(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  const pdMatch = raw.match(/^PD-?(\d+)$/i);
  if (pdMatch) {
    return `PD-${String(pdMatch[1]).padStart(5, "0")}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return raw;
  return `PD-${String(Number(digits)).padStart(5, "0")}`;
}

function parseExcelDate(value) {
  if (value == null || value === "") return null;

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (parsed) {
      return new Date(parsed.y, parsed.m - 1, parsed.d);
    }
  }

  const text = String(value).trim();
  if (!text) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    const date = new Date(`${text}T00:00:00+05:30`);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const dmy = text.match(/^(\d{1,2})[./-](\d{1,2})[./-](\d{2,4})$/);
  if (dmy) {
    const day = Number(dmy[1]);
    const month = Number(dmy[2]);
    let year = Number(dmy[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month - 1, day);
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const fallback = new Date(text);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

function parseParcelRowsFromWorkbook(buffer) {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error("Excel file has no sheets.");
  }

  const sheet = workbook.Sheets[sheetName];
  const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: "", raw: false });

  if (!rawRows.length) {
    throw new Error("Excel sheet is empty.");
  }

  return rawRows
    .map((row, index) => {
      const orderNumber = normalizeOrderNumber(pickValue(row, ORDER_KEYS));
      const lrNumber = String(pickValue(row, LR_KEYS) || "").trim();
      const transportDetails = String(pickValue(row, TRANSPORT_KEYS) || "").trim();
      const dispatchDate = parseExcelDate(pickValue(row, DATE_KEYS));

      return {
        rowNumber: index + 2,
        orderNumber,
        lrNumber,
        transportDetails,
        dispatchDate,
      };
    })
    .filter((row) => row.orderNumber || row.lrNumber || row.transportDetails || row.dispatchDate);
}

function buildDispatchUpdateData(order, row) {
  const lr = row.lrNumber;
  if (!lr) {
    return { error: "LR number is required." };
  }

  if (order.status === "COMPLETED") {
    return { error: "Completed orders cannot be updated." };
  }

  if (!["IN_PRINTING", "PAYMENT_VERIFIED", "DISPATCHED"].includes(order.status)) {
    return {
      error: `Order status ${order.status} cannot be updated. Proceed to printing first.`,
    };
  }

  const data = {
    lrNumber: lr,
    transportDetails: row.transportDetails,
    dispatchDate: row.dispatchDate || new Date(),
  };

  if (order.status !== "DISPATCHED") {
    data.status = "DISPATCHED";
  }

  return { data };
}

module.exports = {
  parseParcelRowsFromWorkbook,
  normalizeOrderNumber,
  buildDispatchUpdateData,
};
