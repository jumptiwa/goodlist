export function validateUsername(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const username = value.trim();
  return /^[a-zA-Z0-9_]{3,32}$/.test(username) ? username : null;
}

export function validatePassword(value: unknown): string | null {
  return typeof value === "string" && value.length >= 8 && value.length <= 128 ? value : null;
}

export function validateTaskText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const text = value.trim();
  return text.length > 0 && text.length <= 500 ? text : null;
}
