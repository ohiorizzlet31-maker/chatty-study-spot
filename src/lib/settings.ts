// Centralized client settings (localStorage)
export type AppSettings = {
  hideTimestamps: boolean;
  hideName: boolean;
  antiClose: boolean;
  autoCloak: "off" | "about" | "blob";
  prankTabCount: number;
  panicKey: string;
};

const KEY = "studyroom_settings";

const DEFAULTS: AppSettings = {
  hideTimestamps: false,
  hideName: false,
  antiClose: false,
  autoCloak: "off",
  prankTabCount: 2,
  panicKey: "`",
};

export function getSettings(): AppSettings {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...JSON.parse(raw) };
  } catch {
    return DEFAULTS;
  }
}

export function saveSettings(s: AppSettings) {
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("studyroom-settings-changed"));
}

export function useSettingsListener(cb: (s: AppSettings) => void) {
  if (typeof window === "undefined") return () => {};
  const handler = () => cb(getSettings());
  window.addEventListener("studyroom-settings-changed", handler);
  return () => window.removeEventListener("studyroom-settings-changed", handler);
}
