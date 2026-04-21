import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X } from "lucide-react";
import { getSettings, saveSettings, AppSettings } from "@/lib/settings";
import { Keyboard } from "lucide-react";

const CLOAKS = [
  { name: "Google Classroom", favicon: "https://ssl.gstatic.com/classroom/favicon.png" },
  { name: "Clever | Portal", favicon: "https://clever.com/favicon.ico" },
  { name: "i-Ready", favicon: "https://login.i-ready.com/favicon.ico" },
  { name: "Khan Academy", favicon: "https://cdn.kastatic.org/images/favicon.ico" },
  { name: "Google Docs", favicon: "https://ssl.gstatic.com/docs/documents/images/kix-favicon-2023q4.ico" },
  { name: "Google Drive", favicon: "https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png" },
  { name: "Schoology", favicon: "https://www.schoology.com/sites/all/themes/schoology_theme/favicon.ico" },
  { name: "Canvas", favicon: "https://du11hjcvx0uqb.cloudfront.net/dist/images/favicon-e10d657a73.ico" },
];

function setFavicon(url: string) {
  let link = document.querySelector<HTMLLinkElement>("link[rel~='icon']");
  if (!link) {
    link = document.createElement("link");
    link.rel = "icon";
    document.head.appendChild(link);
  }
  link.href = url;
}

export function applySavedCloak() {
  const saved = localStorage.getItem("studyroom_cloak");
  if (saved) {
    try {
      const { name, favicon } = JSON.parse(saved);
      document.title = name;
      if (favicon) setFavicon(favicon);
    } catch {}
  } else {
    document.title = "Google Classroom";
    setFavicon("https://ssl.gstatic.com/classroom/favicon.png");
  }
}

export function maybeAutoLaunchCloak() {
  if (typeof window === "undefined") return;
  if (sessionStorage.getItem("studyroom_autocloak_done")) return;
  const s = getSettings();
  if (s.autoCloak === "off") return;
  sessionStorage.setItem("studyroom_autocloak_done", "1");
  const url = window.location.href;
  const title = document.title || "Google Classroom";
  const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href || "";
  const html = `<!DOCTYPE html><html><head><title>${title}</title><link rel="icon" href="${favicon}"/></head><body style="margin:0"><iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`;
  if (s.autoCloak === "about") {
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    window.location.replace("https://classroom.google.com");
  } else if (s.autoCloak === "blob") {
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    window.location.replace("https://classroom.google.com");
  }
}

export function SettingsPanel({ onClose }: { onClose: () => void }) {
  const [customName, setCustomName] = useState("");
  const [settings, setSettings] = useState<AppSettings>(getSettings());

  useEffect(() => {
    applySavedCloak();
  }, []);

  function update<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const next = { ...settings, [key]: value };
    setSettings(next);
    saveSettings(next);
  }

  function applyCloak(name: string, favicon?: string) {
    document.title = name;
    if (favicon) setFavicon(favicon);
    localStorage.setItem("studyroom_cloak", JSON.stringify({ name, favicon }));
  }

  function openInAboutBlank() {
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    const url = window.location.href;
    const title = document.title;
    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href || "";
    w.document.write(`<!DOCTYPE html><html><head><title>${title}</title><link rel="icon" href="${favicon}"/></head><body style="margin:0"><iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`);
    w.document.close();
    window.location.replace("https://classroom.google.com");
  }

  function openInBlob() {
    const url = window.location.href;
    const title = document.title;
    const favicon = document.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href || "";
    const html = `<!DOCTYPE html><html><head><title>${title}</title><link rel="icon" href="${favicon}"/></head><body style="margin:0"><iframe src="${url}" style="border:0;width:100vw;height:100vh"></iframe></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
    window.location.replace("https://classroom.google.com");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold">Settings</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <section className="mb-6 space-y-3">
          <h3 className="font-semibold">Privacy & UX</h3>
          <Toggle
            title="Hide Message Timestamps"
            desc="Don't show when messages were sent"
            checked={settings.hideTimestamps}
            onChange={(v) => update("hideTimestamps", v)}
          />
          <Toggle
            title="Hide Name"
            desc="Send messages as 'Anonymous'"
            checked={settings.hideName}
            onChange={(v) => update("hideName", v)}
          />
          <Toggle
            title="Anti Close Tab"
            desc="Shows a confirmation dialog when trying to close the tab"
            checked={settings.antiClose}
            onChange={(v) => update("antiClose", v)}
          />
        </section>

        <section className="mb-6">
          <h3 className="font-semibold mb-2">Auto launch in disguise</h3>
          <p className="text-sm text-muted-foreground mb-3">When you open the site, automatically open it inside about:blank or blob: and redirect this tab to Google Classroom.</p>
          <div className="grid grid-cols-3 gap-2">
            {(["off", "about", "blob"] as const).map((m) => (
              <button
                key={m}
                onClick={() => update("autoCloak", m)}
                className={`py-2 rounded-xl border text-sm font-medium ${settings.autoCloak === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
              >
                {m === "off" ? "Off" : m === "about" ? "about:blank" : "blob:"}
              </button>
            ))}
          </div>
        </section>

        <section className="mb-6">
          <h3 className="font-semibold mb-2">Tab Cloak</h3>
          <p className="text-sm text-muted-foreground mb-3">Disguise the tab name & icon.</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {CLOAKS.map((c) => (
              <button
                key={c.name}
                onClick={() => applyCloak(c.name, c.favicon)}
                className="flex items-center gap-2 p-2 rounded-xl border border-border hover:border-primary text-left text-sm"
              >
                <img src={c.favicon} alt="" className="w-4 h-4" />
                <span className="truncate">{c.name}</span>
              </button>
            ))}
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (customName.trim()) {
                applyCloak(customName.trim());
                setCustomName("");
              }
            }}
            className="flex gap-2"
          >
            <Input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Custom tab name…" maxLength={60} />
            <Button type="submit">Set</Button>
          </form>
        </section>

        <section>
          <h3 className="font-semibold mb-2">Open in disguise (now)</h3>
          <p className="text-sm text-muted-foreground mb-3">Opens this app in a new tab and redirects this one to Google Classroom.</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={openInAboutBlank} className="flex-1">about:blank</Button>
            <Button variant="outline" onClick={openInBlob} className="flex-1">blob:</Button>
          </div>
        </section>

        <section className="mt-6">
          <h3 className="font-semibold mb-2 flex items-center gap-2"><Keyboard className="w-4 h-4" /> Panic Key</h3>
          <p className="text-sm text-muted-foreground mb-3">Press this key to instantly switch to the study page. Press again to go back.</p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Current:</span>
            <kbd className="px-3 py-1.5 rounded-lg border border-border bg-muted font-mono text-sm">{settings.panicKey || "`"}</kbd>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                const handler = (e: KeyboardEvent) => {
                  e.preventDefault();
                  const key = e.key === " " ? "Space" : e.key;
                  update("panicKey", key);
                  window.removeEventListener("keydown", handler);
                };
                window.addEventListener("keydown", handler);
              }}
            >
              Press to set
            </Button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Toggle({ title, desc, checked, onChange }: { title: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex items-start gap-3 p-3 rounded-xl border border-border cursor-pointer hover:border-primary/50">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 accent-primary"
      />
      <div className="flex-1">
        <p className="font-medium text-sm">{title}</p>
        <p className="text-xs text-muted-foreground">{desc}</p>
      </div>
    </label>
  );
}
