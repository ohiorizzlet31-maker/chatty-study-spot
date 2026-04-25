import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Globe, ExternalLink, FileCode2, Eye } from "lucide-react";

const PRESETS = [
  { name: "Google", url: "https://www.google.com" },
  { name: "YouTube", url: "https://www.youtube.com" },
  { name: "Wikipedia", url: "https://wikipedia.org" },
  { name: "DuckDuckGo", url: "https://duckduckgo.com" },
  { name: "Cool Math Games", url: "https://www.coolmathgames.com" },
  { name: "Poki", url: "https://poki.com" },
];

function normalize(input: string): string {
  let v = input.trim();
  if (!v) return v;
  if (!/^https?:\/\//i.test(v)) v = "https://" + v;
  return v;
}

export function WebsitePanel({ onClose }: { onClose: () => void }) {
  const [url, setUrl] = useState("https://www.google.com");
  const [embedSrc, setEmbedSrc] = useState<string | null>(null);
  const [embedFailed, setEmbedFailed] = useState(false);

  function embed() {
    const u = normalize(url);
    if (!u) return;
    setEmbedFailed(false);
    setEmbedSrc(u);
  }

  function openAboutBlank() {
    const u = normalize(url);
    if (!u) return;
    const w = window.open("about:blank", "_blank");
    if (!w) return;
    const html = `<!DOCTYPE html><html><head><title>${u}</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100vw;height:100vh}</style></head><body><iframe src="${u}" allow="fullscreen *"></iframe></body></html>`;
    w.document.write(html);
    w.document.close();
  }

  function openBlob() {
    const u = normalize(url);
    if (!u) return;
    const html = `<!DOCTYPE html><html><head><title>${u}</title><style>html,body{margin:0;height:100%}iframe{border:0;width:100vw;height:100vh}</style></head><body><iframe src="${u}" allow="fullscreen *"></iframe></body></html>`;
    const blob = new Blob([html], { type: "text/html" });
    const blobUrl = URL.createObjectURL(blob);
    window.open(blobUrl, "_blank");
  }

  function openDirect() {
    const u = normalize(url);
    if (!u) return;
    window.open(u, "_blank", "noopener");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div
        className="bg-card border border-border rounded-3xl p-6 w-full max-w-3xl shadow-[var(--shadow-soft)] max-h-[92vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="w-6 h-6 text-primary" /> Website
          </h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-sm text-muted-foreground mb-3">
          Browse any site. Many sites block embedding (X-Frame-Options) — use
          <span className="font-medium"> about:blank</span> or <span className="font-medium">blob:</span> to open them in a fresh, unrecognizable tab.
        </p>

        <div className="flex gap-2 mb-3">
          <Input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") embed(); }}
            placeholder="https://example.com"
          />
          <Button onClick={embed}>
            <Eye className="w-4 h-4 mr-1" /> Embed
          </Button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <Button variant="outline" onClick={openAboutBlank}>
            <FileCode2 className="w-4 h-4 mr-1" /> about:blank
          </Button>
          <Button variant="outline" onClick={openBlob}>
            <FileCode2 className="w-4 h-4 mr-1" /> blob:
          </Button>
          <Button variant="outline" onClick={openDirect}>
            <ExternalLink className="w-4 h-4 mr-1" /> New tab
          </Button>
        </div>

        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Quick links</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {PRESETS.map((p) => (
              <button
                key={p.url}
                onClick={() => setUrl(p.url)}
                className="text-left p-2 rounded-lg border border-border hover:border-primary text-sm truncate"
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {embedSrc && (
          <div className="rounded-xl overflow-hidden border border-border bg-black relative" style={{ height: "60vh" }}>
            <iframe
              key={embedSrc}
              src={embedSrc}
              className="w-full h-full bg-white"
              sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-pointer-lock"
              referrerPolicy="no-referrer"
              title="Embedded site"
              onError={() => setEmbedFailed(true)}
            />
            {embedFailed && (
              <div className="absolute inset-0 flex items-center justify-center bg-black/70 text-white text-sm p-4 text-center">
                This site refused to embed. Try about:blank or blob: instead.
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}