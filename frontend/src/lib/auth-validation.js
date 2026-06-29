export function normalizeMobile(phone) {
  return String(phone || "").replace(/\D/g, "").slice(0, 10);
}

export function isValidIndianMobile(phone) {
  return /^[0-9]{10}$/.test(normalizeMobile(phone));
}

export function validateLogin({ phone, password }) {
  const errors = {};
  const mobile = normalizeMobile(phone);

  if (!mobile) {
    errors.phone = "Mobile number is required.";
  } else if (!/^[0-9]{10}$/.test(mobile)) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  if (!password || !String(password).trim()) {
    errors.password = "Password is required.";
  } else if (String(password).length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    mobile,
  };
}

export function validateRegister({ name, business, phone, password }) {
  const errors = {};
  const trimmedName = String(name || "").trim();
  const trimmedBusiness = String(business || "").trim();
  const mobile = normalizeMobile(phone);

  if (!trimmedName) errors.name = "Name is required.";
  if (!trimmedBusiness) errors.business = "Business name is required.";

  if (!mobile) {
    errors.phone = "Mobile number is required.";
  } else if (!/^[0-9]{10}$/.test(mobile)) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  if (!password || !String(password).trim()) {
    errors.password = "Password is required.";
  } else if (String(password).length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    mobile,
    name: trimmedName,
    business: trimmedBusiness,
  };
}

export function validateForgotPassword({ phone }) {
  const errors = {};
  const mobile = normalizeMobile(phone);

  if (!mobile) {
    errors.phone = "Mobile number is required.";
  } else if (!/^[0-9]{10}$/.test(mobile)) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    mobile,
  };
}

export function validateResetPassword({ phone, code, password, confirmPassword }) {
  const errors = {};
  const mobile = normalizeMobile(phone);
  const resetCode = String(code || "").trim();
  const nextPassword = String(password || "");
  const confirm = String(confirmPassword || "");

  if (!mobile) {
    errors.phone = "Mobile number is required.";
  } else if (!/^[0-9]{10}$/.test(mobile)) {
    errors.phone = "Enter a valid 10-digit mobile number.";
  }

  if (!/^[0-9]{6}$/.test(resetCode)) {
    errors.code = "Enter the 6-digit reset code.";
  }

  if (!nextPassword.trim()) {
    errors.password = "New password is required.";
  } else if (nextPassword.length < 4) {
    errors.password = "Password must be at least 4 characters.";
  }

  if (!confirm.trim()) {
    errors.confirmPassword = "Confirm your new password.";
  } else if (confirm !== nextPassword) {
    errors.confirmPassword = "Passwords do not match.";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
    mobile,
    code: resetCode,
    password: nextPassword,
  };
}

export function getFirebaseAuthErrorMessage(error) {
  const code = error?.code || "";
  const host =
    typeof window !== "undefined" ? window.location.hostname : "your-vercel-domain.vercel.app";
  const map = {
    "auth/popup-closed-by-user": "Google sign-in was cancelled. Please try again.",
    "auth/popup-blocked": "Popup was blocked. Allow popups for this site and try again.",
    "auth/cancelled-popup-request": "Google sign-in was interrupted. Please try again.",
    "auth/network-request-failed": "Network error. Check your connection and try again.",
    "auth/account-exists-with-different-credential": "This email is linked to another sign-in method.",
    "auth/invalid-credential": "Google sign-in failed. Please try again.",
    "auth/operation-not-allowed": "Google sign-in is not enabled in Firebase. Enable Google provider.",
    "auth/unauthorized-domain": `Add "${host}" in Firebase Console → Authentication → Settings → Authorized domains.`,
    "auth/internal-error": "Google sign-in failed. Check Firebase authorized domains and OAuth settings.",
  };
  return map[code] || error?.message || "Google sign-in failed. Please try again.";
}
