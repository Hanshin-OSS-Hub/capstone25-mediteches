/** Format raw digits as ######-####### */
export function formatResidentId(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 13);
  if (digits.length <= 6) return digits;
  return `${digits.slice(0, 6)}-${digits.slice(6)}`;
}

/** Basic Korean resident registration number checksum validation */
export function validateResidentId(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length !== 13) return false;

  const weights = [2, 3, 4, 5, 6, 7, 8, 9, 2, 3, 4, 5];
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    sum += parseInt(digits[i], 10) * weights[i];
  }
  const check = (11 - (sum % 11)) % 10;
  return check === parseInt(digits[12], 10);
}
