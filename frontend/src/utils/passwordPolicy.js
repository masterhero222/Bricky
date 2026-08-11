export const PASSWORD_MIN_LENGTH = 6;
export const PASSWORD_MAX_LENGTH = 128;
export const PASSWORD_REQUIREMENTS =
  'Използвайте поне 6 символа, главна буква и цифра.';

export function passwordPolicyError(password) {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return PASSWORD_REQUIREMENTS;
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Паролата може да съдържа най-много ${PASSWORD_MAX_LENGTH} символа.`;
  }

  if (!/[A-Z]/.test(password) || !/\d/.test(password)) {
    return PASSWORD_REQUIREMENTS;
  }

  return '';
}
