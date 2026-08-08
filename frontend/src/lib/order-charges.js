export const DEFAULT_VIDARBHA_PARCEL = 100;
export const DEFAULT_CREASING_PER_THOUSAND = 100;

export function getCreasingCharge(
  finishOrRequirement,
  quantity,
  perThousand = DEFAULT_CREASING_PER_THOUSAND
) {
  const label = String(finishOrRequirement || "").trim();
  if (!/creasing/i.test(label)) return 0;
  const qty = Number(quantity) || 0;
  const rate = Number(perThousand);
  if (!(qty > 0) || !Number.isFinite(rate) || rate <= 0) return 0;
  return Math.floor(qty / 1000) * rate;
}

export function getVidarbhaParcelCharge(
  transportDetails,
  chargeAmount = DEFAULT_VIDARBHA_PARCEL
) {
  const transport = String(transportDetails || "").trim();
  if (!/vidarbha/i.test(transport)) return 0;
  const amount = Number(chargeAmount);
  return Number.isFinite(amount) && amount > 0 ? amount : 0;
}

export function computeOrderAddons({
  quantity,
  otherRequirement,
  transportDetails,
  vidarbhaParcelCharge = DEFAULT_VIDARBHA_PARCEL,
  creasingPerThousand = DEFAULT_CREASING_PER_THOUSAND,
}) {
  const creasingCharge = getCreasingCharge(
    otherRequirement,
    quantity,
    creasingPerThousand
  );
  const parcelCharge = getVidarbhaParcelCharge(
    transportDetails,
    vidarbhaParcelCharge
  );
  return { creasingCharge, parcelCharge, addonsTotal: creasingCharge + parcelCharge };
}
