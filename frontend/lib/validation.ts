/**
 * Shared input validation logic for user authentication forms.
 * Mirrors server-side rules (e.g. TA-14 password complexity policy).
 */

export const PASSWORD_MIN_LENGTH = 8;

export function validatePassword(password: string): string | null {
  if (password.length < PASSWORD_MIN_LENGTH) {
    return `Password must be at least ${PASSWORD_MIN_LENGTH} characters long.`;
  }
  if (!/[a-zA-Z]/.test(password)) {
    return "Password must contain at least one letter.";
  }
  if (!/[0-9]/.test(password)) {
    return "Password must contain at least one digit.";
  }
  return null;
}

export function validateEmail(email: string): string | null {
  const simplePattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!simplePattern.test(email)) {
    return "Please enter a valid email address.";
  }
  return null;
}
