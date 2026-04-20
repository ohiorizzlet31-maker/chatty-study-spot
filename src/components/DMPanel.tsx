import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Send, ArrowLeft, MessageSquare, BadgeCheck, Crown } from "lucide-react";
import { getDeviceId, isOwner } from "@/lib/device";

type DM = {
  id: string;
  sender_name: string;
  sender_device: string;
  recipient_name: string;
  content: string;
  created_at: string;
};

export function DMPanel({
  name,
  language,
  initialPeer,
  verifiedNames,
  onClose,
}: {
  name: string;
  language: string;
  initialPeer?: string | null;
  verifiedNames: Set<string>;
  onClose: () => void;
}) {
  const [peer, setPeer] = useState<string | null>(initialPeer ?? null);
  const [threads, setThreads] = useState<{ peer: string; last: string; at: string }[]>([]);
  const [messages, setMessages] = useState<DM[]>([]);
  const [input, setInput] = useState("");
  const [newPeer, setNewPeer] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const device = getDeviceId();

  // Load thread list (any DMs involving me)
  useEffect(() => {
    let active = true;
    async function load() {
      const { data } = await (supabase as any)
        .from("dm_messages")
        .select("*")
        .or(`sender_name.eq.${name},recipient_name.eq.${name}`)
        .order("created_at", { ascending: false })
        .limit(500);
      if (!active || !data) return;
      const map = new Map<string, { peer: string; last: string; at: string }>();
      for (const m of data as DM[]) {
        const other = m.sender_name === name ? m.recipient_name : m.sender_name;
        if (!map.has(other)) map.set(other, { peer: other, last: m.content, at: m.created_at });
      }
      setThreads(Array.from(map.values()));
    }
    load();
    const channel = supabase
      .channel("dm:threads:" + name)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const m = payload.new as DM;
        if (m.sender_name !== name && m.recipient_name !== name) return;
        load();
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [name]);

  // Load messages with current peer
  useEffect(() => {
    if (!peer) return;
    let active = true;
    async function load() {
      const { data } = await (supabase as any)
        .from("dm_messages")
        .select("*")
        .or(
          `and(sender_name.eq.${name},recipient_name.eq.${peer}),and(sender_name.eq.${peer},recipient_name.eq.${name})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);
      if (active && data) setMessages(data as DM[]);
    }
    load();
    const channel = supabase
      .channel("dm:thread:" + name + ":" + peer)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "dm_messages" }, (payload) => {
        const m = payload.new as DM;
        const involved =
          (m.sender_name === name && m.recipient_name === peer) ||
          (m.sender_name === peer && m.recipient_name === name);
        if (involved) setMessages((prev) => [...prev, m]);
      })
      .subscribe();
    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, [name, peer]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || !peer) return;
    setInput("");
    await (supabase as any).from("dm_messages").insert({
      sender_name: name,
      sender_device: device,
      recipient_name: peer,
      content,
      language,
    });
  }

  function startWith(p: string) {
    if (!p.trim()) return;
    setPeer(p.trim());
    setNewPeer("");
  }

  function NameTag({ n }: { n: string }) {
    return (
      <span className="inline-flex items-center gap-1">
        {n}
        {isOwner(n) && <Crown className="w-3 h-3 text-yellow-500" />}
        {verifiedNames.has(n.toLowerCase()) && <BadgeCheck className="w-3 h-3 text-primary" />}
      </span>
    );
  }

  return (
    <aside className="fixed inset-0 bg-card z-30 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          {peer && (
            <button onClick={() => setPeer(null)} className="p-1 -ml-1 rounded hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <MessageSquare className="w-5 h-5 text-primary" />
          {peer ? <NameTag n={peer} /> : "Direct Messages"}
        </h2>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      {!peer ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              startWith(newPeer);
            }}
            className="flex gap-2"
          >
            <Input
              value={newPeer}
              onChange={(e) => setNewPeer(e.target.value)}
              placeholder="Start DM with username…"
              maxLength={40}
            />
            <Button type="submit">Open</Button>
          </form>
          <div className="space-y-1">
            {threads.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                No conversations yet. Click a name in chat → DM, or type a name above.
              </p>
            )}
            {threads.map((t) => (
              <button
                key={t.peer}
                onClick={() => setPeer(t.peer)}
                className="w-full text-left p-3 rounded-xl hover:bg-muted border border-border"
              >
                <div className="flex items-center justify-between">
                  <p className="font-semibold"><NameTag n={t.peer} /></p>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground truncate">{t.last}</p>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-12">
                No messages yet. Say hi 👋
              </p>
            )}
            {messages.map((m) => {
              const mine = m.sender_name === name;
              return (
                <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                    <div className="text-xs text-muted-foreground px-2">
                      <NameTag n={m.sender_name} /> ·{" "}
                      {new Date(m.created_at).toLocaleTimeString([], {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </div>
                    <div
                      className={`rounded-2xl px-4 py-2.5 ${
                        mine
                          ? "bg-primary text-primary-foreground rounded-br-sm"
                          : "bg-muted border border-border rounded-bl-sm"
                      }`}
                    >
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <form onSubmit={send} className="flex gap-2 p-4 border-t border-border">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={`Message ${peer}…`}
              maxLength={2000}
              className="h-12"
            />
            <Button type="submit" size="lg" disabled={!input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </>
      )}
    </aside>
  );
}
