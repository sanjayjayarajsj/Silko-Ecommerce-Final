// Shared validation rules for "person / delivery" style form fields.
// Used by the checkout page and the "Add Address" form (profile page) so the
// rules stay identical everywhere instead of being copy-pasted and drifting.

// ---- Name (full name, city) --------------------------------------------
const NAME_PATTERN = /^[A-Za-z]+(?: [A-Za-z]+)*$/;

export function sanitizeNameInput(value: string): string {
  return value
    .replace(/[^A-Za-z ]/g, '')  // strip anything that isn't a letter/space
    .replace(/\s{2,}/g, ' ')     // collapse double spaces
    .replace(/^\s+/, '');        // no leading space
}

export function isValidName(value: string): boolean {
  const v = value.trim();
  return v.length >= 3 && NAME_PATTERN.test(v);
}

export function isValidCity(value: string): boolean {
  const v = value.trim();
  return v.length >= 2 && NAME_PATTERN.test(v);
}

// ---- Address --------------------------------------------------------------
const ADDRESS_PATTERN = /^[A-Za-z0-9][A-Za-z0-9\s,.\-\/#']*$/;

export function sanitizeAddressInput(value: string): string {
  return value
    .replace(/[^A-Za-z0-9\s,.\-\/#']/g, '')
    .replace(/^\s+/, '');
}

export function isValidAddress(value: string): boolean {
  const v = value.trim();
  return v.length >= 5 && ADDRESS_PATTERN.test(v);
}

// ---- Pincode ----------------------------------------------------------
export function sanitizePincodeInput(value: string): string {
  return value.replace(/[^0-9]/g, '').slice(0, 6);
}

export function isValidPincode(value: string): boolean {
  return /^\d{6}$/.test(value);
}