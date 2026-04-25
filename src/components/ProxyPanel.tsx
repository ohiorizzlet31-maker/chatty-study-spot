import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Shield, Globe, Zap, FileCode2, ExternalLink, Search } from "lucide-react";

type Mode = "uv" | "scramjet" | "fetch";

// Public hosted instances (these come and go — users can override).
// Ultraviolet front-ends typically use #/ + base64-encoded URL.
const UV_HOSTS = [
  "https://holyubofficial.net",
  "https://radon.games",
  "https://utopia.fans",
];

// Scramjet hosted demos — fewer exist; we route through UV-style if user picks one
// but offer a dedicated Scramjet demo too.
const SCRAMJET_HOSTS = [
  "https://scramjet.titaniumnetwork.org",
  "https://app.incog.live",
];

function normalize(input: string, defaultSearch: "brave" | "google" | "ddg" = "brave"): string {
  const v = input.trim();
  if (!v) return v;
  // If it looks like a URL or domain, treat as URL
  if (/^https?:\/\//i.test(v)) return v;
  if (/^[\w-]+(\.[\w-]+)+(\/.*)?$/i.test(v)) return "https://" + v;
  // Otherwise treat as a search query
  const q = encodeURIComponent(v);
  if (defaultSearch === "brave") return `https://search.brave.com/search?q=${q}`;
  if (defaultSearch === "google") return `https://www.google.com/search?q=${q}`;
  return `https://duckduckgo.com/?q=${q}`;
}

function uvUrl(host: string, target: string): string {
  // Standard UV pattern: <host>/uv/service/<base64(target)>
  // Many forks also support <host>/#<base64(target)>
  const enc = btoa(target).replace(/=+$/, "");
  return `${host}/uv/service/${enc}`;
}

function scramjetUrl(host: string, target: string): string {
  // Scramjet demos commonly expose /scramjet/service/<encoded>
  return `${host}/scramjet/service/${encodeURIComponent(target)}`;
}

export function ProxyPanel({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<Mode>("fetch");
  const [query, setQuery] = useState("");
  const [uvHost, setUvHost] = useState(UV_HOSTS[0]);
  const [scramHost, setScramHost] = useState(SCRAMJET_HOSTS[0]);
  const [fetchSrc, setFetchSrc] = useState<string | null>(null);
  const [fetchUrl, setFetchUrl] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<string[]>([]);

  function pushHistory(u: string) {
    setHistory((h) => [u, ...h.filter((x) => x !== u)].slice(0, 8));
  }

  function go() {
    setError(null);
    const target = normalize(query, "brave");
    if (!target) return;
    pushHistory(target);

    if (mode === "uv") {
      const u = uvUrl(uvHost, target);
      window.open(u, "_blank");
      return;
    }
    if (mode === "scramjet") {
      const u = scramjetUrl(scramHost, target);
      window.open(u, "_blank");
      return;
    }
    // HTML Fetch — fetch HTML, rewrite <base>, run via blob iframe
    runHtmlFetch(target);
  }

  async function runHtmlFetch(target: string) {
    setLoading(true);
    setFetchSrc(null);
    setFetchUrl(target);
    try {
      // Try multiple CORS-friendly proxies (libcurl-style raw HTML fetch).
      // These are public read-through proxies; they can rate-limit or go down.
      const proxies = [
        (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
        (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
        (u: string) => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`,
      ];
      let html: string | null = null;
      let lastErr = "";
      for (const p of proxies) {
        try {
          const res = await fetch(p(target), { method: "GET" });
          if (!res.ok) { lastErr = `HTTP ${res.status}`; continue; }
          html = await res.text();
          if (html && html.length > 0) break;
        } catch (e: unknown) {
          lastErr = e instanceof Error ? e.message : String(e);
        }
      }
      if (!html) throw new Error(lastErr || "All proxies failed");

      // Inject <base> so relative links/assets resolve to the original origin
      const baseTag = `<base href="${target}">`;
      if (/<head[^>]*>/i.test(html)) {
        html = html.replace(/<head[^>]*>/i, (m) => m + baseTag);
      } else if (/<html[^>]*>/i.test(html)) {
        html = html.replace(/<html[^>]*>/i, (m) => m + `<head>${baseTag}</head>`);
      } else {
        html = `<head>${baseTag}</head>` + html;
      }

      const blob = new Blob([html], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      setFetchSrc(url);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`Fetch failed: ${msg}`);
    } finally {
      setLoading(false);
    }
  }

  function openFetchInNewTab() {
    if (!fetchSrc) return;
    window.open(fetchSrc, "_blank");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-4xl shadow-[var(--shadow-soft)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Shield className="w-6 h-6 text-primary" /> Proxy
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Three proxy modes. Ultraviolet & Scramjet require a hosted backend (we route to public instances).
          HTML Fetch runs entirely client-side — uses libcurl-style read-through proxies, then executes the page via blob.
        </p>

        {/* Mode tabs */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setMode("uv")}
            className={`p-3 rounded-xl border text-left transition ${mode === "uv" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <div className="flex items-center gap-2 font-semibold"><Globe className="w-4 h-4" /> Ultraviolet</div>
            <div className="text-xs text-muted-foreground mt-1">Mature, broad site support</div>
          </button>
          <button
            onClick={() => setMode("scramjet")}
            className={`p-3 rounded-xl border text-left transition ${mode === "scramjet" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <div className="flex items-center gap-2 font-semibold"><Zap className="w-4 h-4" /> Scramjet</div>
            <div className="text-xs text-muted-foreground mt-1">Modern, faster on JS apps</div>
          </button>
          <button
            onClick={() => setMode("fetch")}
            className={`p-3 rounded-xl border text-left transition ${mode === "fetch" ? "border-primary bg-primary/10" : "border-border hover:border-primary/50"}`}
          >
            <div className="flex items-center gap-2 font-semibold"><FileCode2 className="w-4 h-4" /> HTML Fetch</div>
            <div className="text-xs text-muted-foreground mt-1">Pure client. Brave search default.</div>
          </button>
        </div>

        {/* Host selector for UV / Scramjet */}
        {mode === "uv" && (
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Ultraviolet host</label>
            <select
              className="w-full bg-background border border-border rounded-lg p-2 text-sm"
              value={uvHost}
              onChange={(e) => setUvHost(e.target.value)}
            >
              {UV_HOSTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        )}
        {mode === "scramjet" && (
          <div className="mb-3">
            <label className="text-xs text-muted-foreground block mb-1">Scramjet host</label>
            <select
              className="w-full bg-background border border-border rounded-lg p-2 text-sm"
              value={scramHost}
              onChange={(e) => setScramHost(e.target.value)}
            >
              {SCRAMJET_HOSTS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>
          </div>
        )}

        <div className="flex gap-2 mb-3">
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") go(); }}
            placeholder={mode === "fetch" ? "Search Brave or enter URL…" : "Search or URL"}
          />
          <Button onClick={go} disabled={loading}>
            {mode === "fetch" ? <Search className="w-4 h-4 mr-1" /> : <ExternalLink className="w-4 h-4 mr-1" />}
            {loading ? "Loading…" : mode === "fetch" ? "Fetch" : "Open"}
          </Button>
        </div>

        {history.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-foreground mb-1">Recent</p>
            <div className="flex flex-wrap gap-1">
              {history.map((h) => (
                <button
                  key={h}
                  onClick={() => setQuery(h)}
                  className="text-xs px-2 py-1 rounded-full border border-border hover:border-primary truncate max-w-[260px]"
                  title={h}
                >
                  {h}
                </button>
              ))}
            </div>
          </div>
        )}

        {error && (
          <div className="mb-3 p-3 rounded-lg border border-destructive/40 bg-destructive/10 text-sm">
            {error}
          </div>
        )}

        {mode === "fetch" && fetchSrc && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate max-w-[70%]" title={fetchUrl}>Source: {fetchUrl}</span>
              <button onClick={openFetchInNewTab} className="underline hover:text-foreground">Open in new tab</button>
            </div>
            <div className="rounded-xl overflow-hidden border border-border bg-black" style={{ height: "62vh" }}>
              <iframe
                key={fetchSrc}
                src={fetchSrc}
                className="w-full h-full bg-white"
                sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
                referrerPolicy="no-referrer"
                title="HTML Fetch result"
              />
            </div>
          </div>
        )}

        {mode !== "fetch" && (
          <div className="text-xs text-muted-foreground bg-muted/40 rounded-lg p-3">
            Heads up: {mode === "uv" ? "Ultraviolet" : "Scramjet"} requires a server-side proxy backend.
            We open the selected public host in a new tab — these instances can be rate-limited or taken down.
            If one fails, switch hosts above.
          </div>
        )}
      </div>
    </div>
  );
}