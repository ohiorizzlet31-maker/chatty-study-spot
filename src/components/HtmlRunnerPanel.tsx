import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { X, Code, Upload, Play } from "lucide-react";

export function HtmlRunnerPanel({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"manual" | "upload">("manual");
  const [html, setHtml] = useState("");
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function run(content: string) {
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    const blob = new Blob([content], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    setBlobUrl(url);
  }

  function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const content = reader.result as string;
      setHtml(content);
      run(content);
    };
    reader.readAsText(file);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-3xl shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Code className="w-6 h-6 text-primary" /> HTML Runner</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex gap-2 mb-4">
          <button onClick={() => setTab("manual")} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${tab === "manual" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
            Manual Code
          </button>
          <button onClick={() => setTab("upload")} className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${tab === "upload" ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}>
            Upload .html
          </button>
        </div>

        {tab === "manual" && (
          <div className="space-y-3">
            <Textarea
              value={html}
              onChange={(e) => setHtml(e.target.value)}
              placeholder="<html>&#10;<body>&#10;  <h1>Hello!</h1>&#10;</body>&#10;</html>"
              rows={10}
              className="font-mono text-sm"
            />
            <Button onClick={() => run(html)} disabled={!html.trim()} className="w-full">
              <Play className="w-4 h-4 mr-2" /> Run
            </Button>
          </div>
        )}

        {tab === "upload" && (
          <div className="space-y-3">
            <input ref={fileRef} type="file" accept=".html,.htm" onChange={handleUpload} className="hidden" />
            <Button variant="outline" onClick={() => fileRef.current?.click()} className="w-full">
              <Upload className="w-4 h-4 mr-2" /> Choose .html file
            </Button>
          </div>
        )}

        {blobUrl && (
          <div className="mt-4 flex-1 min-h-[300px]">
            <p className="text-xs text-muted-foreground mb-2">Preview:</p>
            <iframe
              src={blobUrl}
              sandbox="allow-scripts allow-same-origin"
              className="w-full h-[400px] rounded-xl border border-border bg-white"
              title="HTML Preview"
            />
          </div>
        )}
      </div>
    </div>
  );
}