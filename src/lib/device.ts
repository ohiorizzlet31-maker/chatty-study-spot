// Stable per-browser device ID for DM identity
const KEY = "studyroom_device_id";

export function getDeviceId(): string {
  if (typeof window === "undefined") return "ssr";
  let id = localStorage.getItem(KEY);
  if (!id) {
    id = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now().toString(36);
    localStorage.setItem(KEY, id);
  }
  return id;
}

export const OWNER_NAMES = new Set(["hallo_e99", "aiden"]);

export function isOwner(name: string): boolean {
  return OWNER_NAMES.has(name.trim().toLowerCase());
}
