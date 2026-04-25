import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Lock, Code2, Play, ArrowLeft, BadgeCheck, Trash2 } from "lucide-react";
import { isVerifiedName, checkVerifiedPassword } from "@/lib/verified";

type HtmlGame = {
  id: string;
  author: string;
  title: string;
  description: string | null;
  image_url: string | null;
  code: string;
  created_at: string;
};

export function HtmlGamesPanel({ name }: { name: string }) {
  const [items, setItems] = useState<HtmlGame[]>([]);
  const [playing, setPlaying] = useState<HtmlGame | null>(null);
  const [showPost, setShowPost] = useState(false);

  // Posting form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [code, setCode] = useState("");

  // Auth gate
  const [canTry, setCanTry] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [pw, setPw] = useState("");
  const [pwError, setPwError] = useState("");
  const [checking, setChecking] = useState(false);

  const canDelete = name === "Hallo_e99" || name === "Aiden";

  useEffect(() => {
    isVerifiedName(name).then(setCanTry);
  }, [name]);

  useEffect(() => {
    let active = true;
    (supabase as any)
      .from("html_games")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100)
      .then(({ data }: { data: HtmlGame[] | null }) => {
        if (active && data) setItems(data);
      });
    const channel = supabase
      .channel("public:html_games")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "html_games" }, (payload) => {
        setItems((prev) => [payload.new as HtmlGame, ...prev]);
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
    const { error } = await (supabase as any).from("html_games").insert({
      author: name,
      title: title.trim(),
      description: description.trim() || null,
      image_url: imageUrl.trim() || null,
      code: code,
    });
    if (error) { console.error(error); return; }
    setTitle(""); setDescription(""); setImageUrl(""); setCode("");
    setShowPost(false);
  }

  async function deleteGame(g: HtmlGame) {
    if (!canDelete) return;
    if (!confirm(`Delete "${g.title}"? This cannot be undone.`)) return;
    const { error } = await (supabase as any).from("html_games").delete().eq("id", g.id);
    if (error) { console.error(error); alert("Delete failed: " + error.message); return; }
    setItems((prev) => prev.filter((x) => x.id !== g.id));
  }

  if (playing) {
    const blob = new Blob([playing.code], { type: "text/html" });
    const src = URL.createObjectURL(blob);
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => { URL.revokeObjectURL(src); setPlaying(null); }}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to games
          </Button>
          <p className="text-sm font-semibold truncate">{playing.title}</p>
        </div>
        <iframe
          src={src}
          sandbox="allow-scripts allow-same-origin allow-pointer-lock"
          className="w-full h-[70vh] rounded-xl border border-border bg-white"
          title={playing.title}
        />
      </div>
    );
  }

  if (showPost) {
    return (
      <div className="space-y-3">
        <Button variant="ghost" size="sm" onClick={() => setShowPost(false)}>
          <ArrowLeft className="w-4 h-4 mr-1" /> Back
        </Button>
        {!canTry && (
          <p className="text-sm text-muted-foreground">Only verified authors can post HTML games.</p>
        )}
        {canTry && !unlocked && (
          <form onSubmit={handleUnlock} className="p-3 rounded-xl border border-border bg-muted/30">
            <p className="text-sm font-medium mb-2 flex items-center gap-1"><Lock className="w-3 h-3" /> Verify to post</p>
            <div className="flex gap-2">
              <Input type="password" value={pw} onChange={(e) => setPw(e.target.value)} placeholder="Password" />
              <Button type="submit" size="sm" disabled={checking}>{checking ? "…" : "Unlock"}</Button>
            </div>
            {pwError && <p className="text-xs text-destructive mt-1">{pwError}</p>}
          </form>
        )}
        {canTry && unlocked && (
          <form onSubmit={post} className="space-y-2">
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Game title (required)" maxLength={120} />
            <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Description (optional)" maxLength={300} />
            <Input value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="Image URL (optional)" />
            <Textarea
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="<!DOCTYPE html><html>...</html>"
              rows={10}
              className="font-mono text-xs"
            />
            <Button type="submit" disabled={!title.trim() || !code.trim()} className="w-full">
              Post HTML game
            </Button>
          </form>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">Community-built HTML5 games. Tap to play.</p>
        {canTry && (
          <Button size="sm" onClick={() => setShowPost(true)}>
            <Code2 className="w-4 h-4 mr-1" /> Post game
          </Button>
        )}
      </div>
      {items.length === 0 && (
        <p className="text-center text-muted-foreground text-sm py-8">No HTML games yet.</p>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {items.map((g) => (
          <div
            key={g.id}
            className="relative rounded-2xl border border-border hover:border-primary transition-all overflow-hidden bg-card"
          >
            <button onClick={() => setPlaying(g)} className="text-left w-full">
              {g.image_url ? (
                <img src={g.image_url} alt={g.title} className="w-full h-32 object-cover" />
              ) : (
                <div className="w-full h-32 flex items-center justify-center bg-gradient-to-br from-primary/20 to-primary/5">
                  <Play className="w-10 h-10 text-primary" />
                </div>
              )}
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{g.title}</p>
                {g.description && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{g.description}</p>
                )}
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1">
                  by {g.author} <BadgeCheck className="w-3 h-3 text-primary" />
                </p>
              </div>
            </button>
            {canDelete && (
              <button
                onClick={(e) => { e.stopPropagation(); deleteGame(g); }}
                title="Delete game"
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-background/90 border border-border hover:bg-destructive hover:text-destructive-foreground transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}