import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { chatWithAI } from "@/server/ai";
import { Send, X, Sparkles, Trash2, Brain } from "lucide-react";
import { getSettings } from "@/lib/settings";
import { isOwner } from "@/lib/device";

type Msg = { role: "user" | "assistant"; content: string };

const STORAGE = "studyroom_ai_history";
const MEM_KEY = "studyroom_ai_memory";
const INITIAL: Msg[] = [
  { role: "assistant", content: "Hi! I'm your AI study buddy. Ask me anything — concepts, focus tips, study plans." },
];

function loadHistory(): Msg[] {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (!raw) return INITIAL;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length) return parsed;
  } catch {}
  return INITIAL;
}
function loadMemory(): string[] {
  try {
    const raw = localStorage.getItem(MEM_KEY);
    if (!raw) return [];
    const p = JSON.parse(raw);
    return Array.isArray(p) ? p.slice(-30) : [];
  } catch { return []; }
}
function saveMemory(facts: string[]) {
  try { localStorage.setItem(MEM_KEY, JSON.stringify(facts.slice(-30))); } catch {}
}

export function AIChatPanel({ onClose }: { onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>(loadHistory);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [showMem, setShowMem] = useState(false);
  const [memory, setMemory] = useState<string[]>(loadMemory);
  const [newFact, setNewFact] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  function maybeCensor(text: string): string {
    let myName = "";
    try { myName = JSON.parse(localStorage.getItem("studyroom_profile") || "{}").name || ""; } catch {}
    if (!isOwner(myName)) return text;
    if (!getSettings().aiCensor) return text;
    // Replace any case-variant of "AI" as a standalone token with "A1".
    return text.replace(/\bAI\b/g, "A1").replace(/\bai\b/gi, "A1");
  }

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE, JSON.stringify(messages));
    } catch {}
  }, [messages]);

  function clearHistory() {
    setMessages(INITIAL);
    try { localStorage.removeItem(STORAGE); } catch {}
  }

  function addFact(e: React.FormEvent) {
    e.preventDefault();
    const f = newFact.trim();
    if (!f) return;
    const next = [...memory, f].slice(-30);
    setMemory(next); saveMemory(next); setNewFact("");
  }
  function removeFact(i: number) {
    const next = memory.filter((_, idx) => idx !== i);
    setMemory(next); saveMemory(next);
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    const next: Msg[] = [...messages, { role: "user", content }];
    setMessages(next);
    setInput("");
    setLoading(true);
    // Auto-capture simple "remember that X" / "my X is Y" facts
    const lower = content.toLowerCase();
    const remMatch = content.match(/^remember(?: that)?[:\s]+(.+)/i);
    if (remMatch) {
      const fact = remMatch[1].trim();
      const upd = [...memory, fact].slice(-30);
      setMemory(upd); saveMemory(upd);
    } else if (/(my name is|i am|i'm|i like|i love|i hate|my favorite)/i.test(lower) && content.length < 200) {
      const upd = [...memory, content].slice(-30);
      setMemory(upd); saveMemory(upd);
    }
    try {
      const memMsgs: Msg[] = memory.length
        ? [{ role: "user", content: "::MEMORY::\n" + memory.map((f) => `- ${f}`).join("\n") }, ...next]
        : next;
      const { reply } = await chatWithAI({ data: { messages: memMsgs } });
      setMessages((m) => [...m, { role: "assistant", content: maybeCensor(reply) }]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "AI failed.";
      setMessages((m) => [...m, { role: "assistant", content: `⚠️ ${msg}` }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-full sm:w-96 bg-card border-r border-border z-20 flex flex-col shadow-2xl animate-in slide-in-from-left duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-lg font-bold flex items-center gap-2">
          <Sparkles className="w-4 h-4" style={{ color: "var(--accent)" }} /> AI Buddy
        </h2>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" onClick={() => setShowMem((s) => !s)} title="Memory">
            <Brain className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={clearHistory} title="Clear history">
            <Trash2 className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-4 h-4" /></Button>
        </div>
      </div>
      {showMem && (
        <div className="border-b border-border bg-muted/20 p-3 max-h-60 overflow-y-auto">
          <p className="text-xs font-semibold mb-2 flex items-center gap-1"><Brain className="w-3 h-3" /> AI Memory ({memory.length}/30)</p>
          <p className="text-[10px] text-muted-foreground mb-2">Stored on this device only. Say "remember that ..." in chat to auto-add.</p>
          <form onSubmit={addFact} className="flex gap-1 mb-2">
            <Input value={newFact} onChange={(e) => setNewFact(e.target.value)} placeholder="Add a fact about you" className="h-8 text-xs" />
            <Button type="submit" size="sm" disabled={!newFact.trim()}>Add</Button>
          </form>
          <ul className="space-y-1">
            {memory.length === 0 && <li className="text-xs text-muted-foreground italic">No memories yet.</li>}
            {memory.map((f, i) => (
              <li key={i} className="flex items-start gap-1 text-xs bg-background rounded px-2 py-1">
                <span className="flex-1">{f}</span>
                <button onClick={() => removeFact(i)} className="text-muted-foreground hover:text-destructive shrink-0"><X className="w-3 h-3" /></button>
              </li>
            ))}
          </ul>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
            <div
              className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm ${
                m.role === "user"
                  ? "bg-primary text-primary-foreground rounded-br-sm"
                  : "bg-muted text-foreground rounded-bl-sm"
              }`}
            >
              <p className="whitespace-pre-wrap">{m.content}</p>
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-start">
            <div className="bg-muted rounded-2xl px-3 py-2 text-sm flex gap-1">
              <span className="animate-bounce">·</span>
              <span className="animate-bounce" style={{ animationDelay: "0.15s" }}>·</span>
              <span className="animate-bounce" style={{ animationDelay: "0.3s" }}>·</span>
            </div>
          </div>
        )}
      </div>
      <form onSubmit={send} className="p-3 border-t border-border flex gap-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} placeholder="Ask anything…" disabled={loading} />
        <Button type="submit" size="icon" disabled={loading || !input.trim()}><Send className="w-4 h-4" /></Button>
      </form>
    </aside>
  );
}
