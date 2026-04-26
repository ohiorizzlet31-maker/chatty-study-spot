import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertTriangle, Wifi, WifiOff, RefreshCw, Maximize2, Minimize2, GripHorizontal } from "lucide-react";

const HTML_URL = "/gn-math.html";
const CACHE_KEY = "gn-math-cached-html-v1";
const FIRST_RUN_KEY = "gn-math-has-run";

export function GnMathPanel() {
  const [agreed, setAgreed] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [mode, setMode] = useState<"live" | "cached">("live");
  const [cachedSrc, setCachedSrc] = useState<string | null>(null);
  const [loadError, setLoadError] = useState(false);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [height, setHeight] = useState<number>(() => {
    if (typeof window === "undefined") return 540;
    const saved = Number(localStorage.getItem("gn-math-height") || 0);
    return saved && saved > 200 ? saved : Math.min(640, Math.round(window.innerHeight * 0.7));
  });
  const [isFullscreen, setIsFullscreen] = useState(false);

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      el.requestFullscreen?.().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen?.().then(() => setIsFullscreen(false)).catch(() => {});
    }
  }

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  function startResize(e: React.PointerEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = height;
    const onMove = (ev: PointerEvent) => {
      const next = Math.max(240, Math.min(window.innerHeight - 80, startH + (ev.clientY - startY)));
      setHeight(next);
    };
    const onUp = () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      try { localStorage.setItem("gn-math-height", String(height)); } catch {}
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  useEffect(() => {
    try { localStorage.setItem("gn-math-height", String(height)); } catch {}
  }, [height]);

  // After the iframe loads successfully, snapshot the HTML into localStorage for offline use
  useEffect(() => {
    if (!confirmed || mode !== "live") return;
    let cancelled = false;
    const t = setTimeout(async () => {
      try {
        const res = await fetch(HTML_URL, { cache: "no-store" });
        if (!res.ok) return;
        const html = await res.text();
        if (cancelled) return;
        try {
          localStorage.setItem(CACHE_KEY, html);
          localStorage.setItem(FIRST_RUN_KEY, "1");
        } catch {
          /* quota — ignore */
        }
      } catch {
        /* offline — ignore */
      }
    }, 1500);
    return () => { cancelled = true; clearTimeout(t); };
  }, [confirmed, mode]);

  // If they came back and were offline last time, default to cached
  useEffect(() => {
    if (!confirmed) return;
    if (!navigator.onLine && localStorage.getItem(CACHE_KEY)) {
      loadCached();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [confirmed]);

  function loadCached() {
    const html = localStorage.getItem(CACHE_KEY);
    if (!html) {
      setLoadError(true);
      return;
    }
    const blob = new Blob([html], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setCachedSrc((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return url;
    });
    setMode("cached");
  }

  useEffect(() => {
    return () => { if (cachedSrc) URL.revokeObjectURL(cachedSrc); };
  }, [cachedSrc]);

  const hasCached = typeof window !== "undefined" && !!localStorage.getItem(CACHE_KEY);

  if (!confirmed) {
    return (
      <div className="space-y-4">
        <div className="rounded-2xl border-2 border-destructive bg-destructive/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-6 h-6" />
            <h3 className="text-lg font-bold uppercase">Warning</h3>
            <span className="ml-auto text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">BETA</span>
          </div>
          <p className="text-sm font-semibold leading-relaxed">
            DO NOT RUN THIS AT SCHOOL. ONLY AT HOME.
          </p>
          <p className="text-sm text-muted-foreground leading-relaxed">
            It only works at home — but once you've opened it at home at least once, the
            offline copy will keep working at school too.
          </p>
          <p className="text-xs text-muted-foreground">
            Tip: After it loads the first time, your device will save a cached copy
            automatically. If it doesn't load next time, hit "Use cached version".
          </p>
        </div>

        <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-border hover:border-primary/50">
          <Checkbox checked={agreed} onCheckedChange={(v) => setAgreed(v === true)} />
          <span className="text-sm">I confirm I am at home, not at school.</span>
        </label>

        <Button
          onClick={() => setConfirmed(true)}
          disabled={!agreed}
          className="w-full"
        >
          I'm at Home — Launch gn-math
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="space-y-3 bg-background">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-amber-500 text-white">BETA</span>
        <span className="text-xs flex items-center gap-1 text-muted-foreground">
          {mode === "live" ? <><Wifi className="w-3 h-3" /> Live</> : <><WifiOff className="w-3 h-3" /> Cached (offline)</>}
        </span>
        <div className="ml-auto flex gap-2">
          {mode === "cached" && (
            <Button size="sm" variant="outline" onClick={() => { setMode("live"); setLoadError(false); }}>
              <RefreshCw className="w-3 h-3 mr-1" /> Try live
            </Button>
          )}
          {mode === "live" && (
            <Button size="sm" variant="outline" onClick={loadCached} disabled={!hasCached}>
              <WifiOff className="w-3 h-3 mr-1" /> Use cached version
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={toggleFullscreen}>
            {isFullscreen ? <><Minimize2 className="w-3 h-3 mr-1" /> Exit</> : <><Maximize2 className="w-3 h-3 mr-1" /> Fullscreen</>}
          </Button>
        </div>
      </div>

      {loadError && !hasCached && (
        <div className="text-xs p-2 rounded-lg bg-destructive/10 text-destructive border border-destructive/30">
          No cached copy available yet. Open this at home once while online to save a copy.
        </div>
      )}

      <iframe
        ref={iframeRef}
        key={mode === "live" ? "live" : cachedSrc || "cached"}
        src={mode === "live" ? HTML_URL : cachedSrc || ""}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
        className="w-full rounded-xl border border-border bg-white"
        style={{ height: isFullscreen ? "calc(100vh - 90px)" : `${height}px` }}
        title="gn-math"
      />

      {!isFullscreen && (
        <div
          onPointerDown={startResize}
          className="flex items-center justify-center gap-1 cursor-ns-resize select-none py-1 rounded-md hover:bg-muted text-muted-foreground"
          title="Drag to resize"
        >
          <GripHorizontal className="w-4 h-4" />
          <span className="text-[10px]">drag to resize</span>
        </div>
      )}

      <p className="text-[10px] text-muted-foreground">
        First load saves an offline copy automatically. Next time, if it doesn't load
        (e.g. blocked at school), tap "Use cached version".
      </p>
    </div>
  );
}
