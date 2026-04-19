import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { translateMessage } from "@/server/ai";
import { MusicPanel } from "@/components/MusicPanel";
import { AIChatPanel } from "@/components/AIChatPanel";
import { SettingsPanel } from "@/components/SettingsPanel";
import { LeaderboardPanel } from "@/components/LeaderboardPanel";
import { AnnouncementsPanel } from "@/components/AnnouncementsPanel";
import { Languages, Music, Sparkles, LogOut, Send, Settings, Trophy, Megaphone } from "lucide-react";

type Message = {
  id: string;
  name: string;
  language: string;
  content: string;
  created_at: string;
};

export function ChatRoom({
  name,
  language,
  onExit,
}: {
  name: string;
  language: string;
  onExit: () => void;
}) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [translations, setTranslations] = useState<Record<string, string>>({});
  const [translating, setTranslating] = useState<string | null>(null);
  const [showMusic, setShowMusic] = useState(false);
  const [showAI, setShowAI] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showLevels, setShowLevels] = useState(false);
  const [showAnnouncements, setShowAnnouncements] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;
    (supabase as any)
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }: { data: Message[] | null }) => {
        if (active && data) setMessages(data);
      });

    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    setInput("");
    const { error } = await (supabase as any).from("messages").insert({ name, language, content });
    if (error) console.error(error);
  }

  async function translate(msg: Message) {
    if (translations[msg.id]) {
      setTranslations((t) => {
        const next = { ...t };
        delete next[msg.id];
        return next;
      });
      return;
    }
    setTranslating(msg.id);
    try {
      const { translation } = await translateMessage({ data: { text: msg.content, target: language } });
      setTranslations((t) => ({ ...t, [msg.id]: translation }));
    } catch (err) {
      setTranslations((t) => ({ ...t, [msg.id]: "Translation failed." }));
      console.error(err);
    } finally {
      setTranslating(null);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-soft)" }}>
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="font-display text-xl font-bold">studyroom · chat</h1>
            <p className="text-xs text-muted-foreground">
              You're <span className="font-medium text-foreground">{name}</span> · {language}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowAnnouncements(true)}>
              <Megaphone className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">News</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLevels(true)}>
              <Trophy className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Levels</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowMusic(true)}>
              <Music className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Music</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAI(true)}>
              <Sparkles className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">AI</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={onExit}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto max-w-4xl w-full px-4 py-6 flex flex-col">
        <div ref={scrollRef} className="flex-1 overflow-y-auto space-y-4 pb-4">
          {messages.length === 0 && (
            <p className="text-center text-muted-foreground text-sm py-12">No messages yet. Say hi 👋</p>
          )}
          {messages.map((m) => {
            const mine = m.name === name;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className="text-xs text-muted-foreground px-2">
                    {m.name} · <span className="opacity-60">{m.language}</span>
                  </div>
                  <div
                    className={`rounded-2xl px-4 py-2.5 ${
                      mine
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border rounded-bl-sm"
                    }`}
                  >
                    <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    {translations[m.id] && (
                      <p className={`mt-2 pt-2 border-t text-sm italic ${mine ? "border-primary-foreground/30" : "border-border"}`}>
                        {translations[m.id]}
                      </p>
                    )}
                  </div>
                  {!mine && (
                    <button
                      onClick={() => translate(m)}
                      disabled={translating === m.id}
                      className="text-xs text-muted-foreground hover:text-primary px-2 flex items-center gap-1 disabled:opacity-50"
                    >
                      <Languages className="w-3 h-3" />
                      {translating === m.id
                        ? "Translating…"
                        : translations[m.id]
                          ? "Hide translation"
                          : `Translate to ${language}`}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <form onSubmit={send} className="flex gap-2 pt-2">
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Write a message…"
            maxLength={1000}
            className="h-12"
          />
          <Button type="submit" size="lg" disabled={!input.trim()}>
            <Send className="w-4 h-4" />
          </Button>
        </form>
      </main>

      {showMusic && <MusicPanel onClose={() => setShowMusic(false)} />}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showLevels && <LeaderboardPanel name={name} onClose={() => setShowLevels(false)} />}
      {showAnnouncements && <AnnouncementsPanel name={name} onClose={() => setShowAnnouncements(false)} />}
    </div>
  );
}
