const STORAGE_KEY = "releasecheck.clientId";

export function getClientId(): string {
  if (typeof window === "undefined") {
    return "";
  }
  const existing = window.sessionStorage.getItem(STORAGE_KEY);
  if (existing) {
    return existing;
  }
  const created = window.crypto.randomUUID();
  window.sessionStorage.setItem(STORAGE_KEY, created);
  return created;
}
