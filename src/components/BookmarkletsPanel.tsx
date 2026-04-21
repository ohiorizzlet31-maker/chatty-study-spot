import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { X, Bookmark, Lock, BadgeCheck } from "lucide-react";
import { isVerifiedName, checkVerifiedPassword } from "@/lib/verified";

type Bookmarklet = { id: string; title: string; code: string; author: string; created_at: string };

export function BookmarkletsPanel({ name, onClose }: { name: string; onClose: () => void }) {
  const [items, setItems] = useState<Bookmarklet[]>([]);
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [canTry, setCanTry] = useState(false);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    isVerifiedName(name).then(setCanTry);
  }, [name]);

  useEffect(() => {
    let active = true;
    (supabase as any)
      .from("bookmarklets")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(50)
      .then(({ data }: { data: Bookmarklet[] | null }) => {
        if (active && data) setItems(data);
      });

    const channel = supabase
      .channel("public:bookmarklets")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "bookmarklets" }, (payload) => {
        setItems((prev) => [payload.new as Bookmarklet, ...prev]);
      })
      .subscribe();

    return () => { active = false; supabase.removeChannel(channel); };
  }, []);

  async function handleUnlock(e: React.FormEvent) {
    e.preventDefault();
    setChecking(true);
    const ok = await checkVerifiedPassword(name, pw);
    setChecking(false);
    if (ok) { setUnlocked(true); setPwError(""); }
    else setPwError("Wrong password.");
  }

  async function post(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !code.trim()) return;
    const { error } = await (supabase as any).from("bookmarklets").insert({ author: name, title: title.trim(), code: code.trim() });
    if (error) console.error(error);
    else { setTitle(""); setCode(""); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-lg shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2"><Bookmark className="w-6 h-6 text-primary" /> Bookmarklets</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
        </div>

        <p className="text-sm text-muted-foreground mb-4">Drag the links below to your bookmark bar to use them!</p>

        {canTry && !unlocked && (
          <form onSubmit={handleUnlock} className="mb-4 p-3 rounded-xl border border-border bg-muted/30">
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Verify to post</p>
            <div className="flex gap-2">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" />
              <Button type="submit" size="sm" disabled={checking}>{checking ? "…" : "Unlock"}</Button>
            </div>
            {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
          </form>
        )}

        {canTry && unlocked && (
          <form onSubmit={post} className="mb-4 space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Bookmarklet title…" maxLength={100} />
            <Textarea value={code} onChange={(e) => setCode(e.target.value)} placeholder="javascript:void(...)  or full code" rows={4} />
            <Button type="submit" disabled={!title.trim() || !code.trim()} className="w-full">Post bookmarklet</Button>
          </form>
        )}

        <div className="space-y-3">
          {items.length === 0 && <p className="text-sm text-muted-foreground text-center py-6">No bookmarklets yet.</p>}
          {items.map((b) => {
            const href = b.code.startsWith("javascript:") ? b.code : `javascript:${encodeURIComponent(`(function(){${b.code}})()`)}`;
            return (
              <div key={b.id} className="p-4 rounded-2xl border border-border bg-gradient-to-br from-primary/5 to-transparent">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-semibold text-sm flex items-center gap-1">
                    {b.author} <BadgeCheck className="w-4 h-4 text-primary" />
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(b.created_at).toLocaleString()}</p>
                </div>
                <a
                  href={href}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground font-medium text-sm cursor-grab active:cursor-grabbing hover:bg-primary/90 transition-colors"
                  onClick={(e) => e.preventDefault()}
                  onDragStart={(e) => {
                    e.dataTransfer.setData("text/uri-list", href);
                    e.dataTransfer.setData("text/plain", href);
                    e.dataTransfer.effectAllowed = "copyLink";
                  }}
                  draggable
                >
                  <Bookmark className="w-4 h-4" />
                  {b.title}
                </a>
                <p className="text-xs text-muted-foreground mt-2">↑ Drag this to your bookmark bar</p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}