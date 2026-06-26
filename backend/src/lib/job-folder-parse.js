function normalizeOrderNumber(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (!raw) return "";

  const pdMatch = raw.match(/^PD-?(\d+)$/i);
  if (pdMatch) {
    return `PD-${String(pdMatch[1]).padStart(5, "0")}`;
  }

  const inline = raw.match(/PD-?(\d+)/i);
  if (inline) {
    return `PD-${String(inline[1]).padStart(5, "0")}`;
  }

  const digits = raw.replace(/\D/g, "");
  if (!digits) return "";
  return `PD-${String(Number(digits)).padStart(5, "0")}`;
}

function extractOrderNumberFromFilename(filename) {
  const name = String(filename || "").trim();
  if (!name) return "";

  const startMatch = name.match(/^PD-?(\d+)/i);
  if (startMatch) {
    return normalizeOrderNumber(startMatch[0]);
  }

  const anyMatch = name.match(/PD-?(\d+)/i);
  if (anyMatch) {
    return normalizeOrderNumber(anyMatch[0]);
  }

  return "";
}

function parseJobFolderFiles(fileList = []) {
  const files = [];

  for (const file of fileList) {
    const relativePath = String(file.webkitRelativePath || file.name || "").trim();
    if (!relativePath) continue;

    const parts = relativePath.split(/[/\\]/).filter(Boolean);
    const fileName = parts[parts.length - 1] || relativePath;
    const businessFolder = parts.length > 1 ? parts[parts.length - 2] : "—";
    const orderNumber = extractOrderNumberFromFilename(fileName);

    if (!orderNumber) continue;

    files.push({
      businessFolder,
      fileName,
      relativePath,
      orderNumber,
    });
  }

  const orderNumbers = [...new Set(files.map((entry) => entry.orderNumber))];
  return { files, orderNumbers };
}

module.exports = {
  normalizeOrderNumber,
  extractOrderNumberFromFilename,
  parseJobFolderFiles,
};
