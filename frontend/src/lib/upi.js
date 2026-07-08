// UPI payment details for PIXEL DIGITAL. Used to build amount-wise QR codes so
// the customer scans and pays the exact amount shown (order shortfall or the
// custom "pay now" amount they entered).
export const UPI_ID = "paytmqr67sgw9@ptys";
export const UPI_PAYEE_NAME = "PIXEL DIGITAL";

// Builds a UPI deep link like:
//   upi://pay?pa=<id>&pn=PIXEL%20DIGITAL&am=45&cu=INR
// The amount (am) is only included when it is a positive number.
export function buildUpiLink(amount) {
  const amt = Number(amount);
  let link =
    `upi://pay?pa=${encodeURIComponent(UPI_ID)}` +
    `&pn=${encodeURIComponent(UPI_PAYEE_NAME)}`;
  if (Number.isFinite(amt) && amt > 0) {
    // Whole amounts as "45", fractional as "45.50" (max 2 decimals).
    const amStr = Number.isInteger(amt) ? String(amt) : amt.toFixed(2);
    link += `&am=${encodeURIComponent(amStr)}`;
  }
  link += "&cu=INR";
  return link;
}

// Returns a QR image URL (via api.qrserver.com) encoding the amount-wise UPI
// link. Returns null when the amount is not payable.
export function buildUpiQrImageUrl(amount, size = 300) {
  const amt = Number(amount);
  if (!Number.isFinite(amt) || amt <= 0) return null;
  const link = buildUpiLink(amt);
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(link)}`;
}
