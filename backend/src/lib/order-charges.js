const DEFAULT_VIDARBHA_PARCEL = 100;
const DEFAULT_CREASING_PER_THOUSAND = 100;

function getCreasingCharge(finishOrRequirement, quantity, perThousand = DEFAULT_CREASING_PER_THOUSAND) {
  const label = String(finishOrRequirement || "").trim();
  if (!/creasing/i.test(label)) return 0;
  const qty = Number(quantity) || 0;
  const rate = Number(perThousand);
  if (!(qty > 0) || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.floor(qty / 1000) * rate;
}

function getVidarbhaParcelCharge(transportDetails, chargeAmount = DEFAULT_VIDARBHA_PARCEL) {
  const transport = String(transportDetails || "").trim();
  if (!/vidarbha/i.test(transport)) return 0;
  const amount = Number(chargeAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

function getSuperfastCharge(baseAmount) {
  const amount = Number(baseAmount) || 0;
  if (amount <= 0) return 0;
  if (amount < 2000) return 200;
  if (amount <= 5000) return 300;
  return 400;
}

/**
 * Final payable = base + optional superfast + creasing + Vidarbha parcel.
 */
function computeOrderTotal({
  baseAmount,
  quantity,
  finish,
  transportDetails,
  superfastApplied = false,
  vidarbhaParcelCharge = DEFAULT_VIDARBHA_PARCEL,
  creasingPerThousand = DEFAULT_CREASING_PER_THOUSAND,
}) {
  const base = Number(baseAmount) || 0;
  const superfastCharge = superfastApplied ? getSuperfastCharge(base) : 0;
  const creasingCharge = getCreasingCharge(finish, quantity, creasingPerThousand);
  const parcelCharge = getVidarbhaParcelCharge(transportDetails, vidarbhaParcelCharge);
  const total = base + superfastCharge + creasingCharge + parcelCharge;
  return {
    baseAmount: base,
    superfastCharge,
    creasingCharge,
    parcelCharge,
    total,
  };
}

module.exports = {
  DEFAULT_VIDARBHA_PARCEL,
  DEFAULT_CREASING_PER_THOUSAND,
  getCreasingCharge,
  getVidarbhaParcelCharge,
  getSuperfastCharge,
  computeOrderTotal,
};
