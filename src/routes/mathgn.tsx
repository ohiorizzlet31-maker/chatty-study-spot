import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";

/**
 * Standalone /mathgn page — registers a service worker that caches
 * /gn-math.html, so it works offline (e.g. at school behind a filter)
 * after a single online visit at home.
 */
export const Route = createFileRoute("/mathgn")({
  head: () => ({ meta: [{ title: "gn-math" }] }),
  component: MathGn,
});

function MathGn() {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "offline">("loading");
  const [src, setSrc] = useState("/gn-math.html");

  useEffect(() => {
    if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/mathgn-sw.js", { scope: "/" })
        .catch((e) => console.warn("SW register failed", e));
    }
    // Also stash the html in localStorage as a backup
    fetch("/gn-math.html", { cache: "no-store" })
      .then((r) => r.text())
      .then((html) => {
        try { localStorage.setItem("gn-math-html-cache", html); } catch {}
        setStatus("ready");
      })
      .catch(() => {
        const cached = localStorage.getItem("gn-math-html-cache");
        if (cached) {
          const blob = new Blob([cached], { type: "text/html" });
          setSrc(URL.createObjectURL(blob));
          setStatus("offline");
        } else {
          setStatus("offline");
        }
      });
  }, []);

  return (
    <div style={{ position: "fixed", inset: 0, display: "flex", flexDirection: "column", background: "#fff" }}>
      <div style={{ padding: "6px 10px", borderBottom: "1px solid #ddd", display: "flex", gap: 8, alignItems: "center", fontSize: 12, fontFamily: "system-ui" }}>
        <strong>gn-math</strong>
        <span style={{ color: "#888" }}>
          {status === "loading" && "loading…"}
          {status === "ready" && "online (cached for offline)"}
          {status === "offline" && "offline (cached copy)"}
        </span>
      </div>
      <iframe
        ref={iframeRef}
        src={src}
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-modals allow-pointer-lock"
        style={{ flex: 1, border: 0, width: "100%" }}
        title="gn-math"
      />
    </div>
  );
}
