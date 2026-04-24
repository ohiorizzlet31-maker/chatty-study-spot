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
import { GamesPanel } from "@/components/GamesPanel";
import { LogsPanel } from "@/components/LogsPanel";
import { PrankWatcher } from "@/components/PrankWatcher";
import { DMPanel } from "@/components/DMPanel";
import { ServersPanel } from "@/components/ServersPanel";
import { BookmarkletsPanel } from "@/components/BookmarkletsPanel";
import { HtmlRunnerPanel } from "@/components/HtmlRunnerPanel";
import { Languages, Music, Sparkles, LogOut, Send, Settings, Trophy, Megaphone, Gamepad2, FileText, BadgeCheck, Crown, MessageSquare, Server as ServerIcon, Bookmark, Code } from "lucide-react";
import { loadVerified } from "@/lib/verified";
import { isOwner } from "@/lib/device";
import { getSettings, useSettingsListener, AppSettings } from "@/lib/settings";

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
  const [showGames, setShowGames] = useState(false);
  const [showLogs, setShowLogs] = useState(false);
  const [showDMs, setShowDMs] = useState(false);
  const [showServers, setShowServers] = useState(false);
  const [showBookmarklets, setShowBookmarklets] = useState(false);
  const [showHtmlRunner, setShowHtmlRunner] = useState(false);
  const [dmPeer, setDmPeer] = useState<string | null>(null);
  const [nameMenu, setNameMenu] = useState<string | null>(null);
  const [verifiedNames, setVerifiedNames] = useState<Set<string>>(new Set());
  const [settings, setSettings] = useState<AppSettings>(getSettings());
  const scrollRef = useRef<HTMLDivElement>(null);
  const lastSeenIdRef = useRef<string | null>(null);
  const isAtBottomRef = useRef(true);
  const lastSendRef = useRef(0);
  const [cooldownLeft, setCooldownLeft] = useState(0);

  const COOLDOWN_MS = 3000;

  // Tick the cooldown countdown
  useEffect(() => {
    if (cooldownLeft <= 0) return;
    const t = window.setInterval(() => {
      const remaining = Math.max(0, COOLDOWN_MS - (Date.now() - lastSendRef.current));
      setCooldownLeft(remaining);
      if (remaining <= 0) window.clearInterval(t);
    }, 100);
    return () => window.clearInterval(t);
  }, [cooldownLeft]);

  const isVerified = verifiedNames.has(name.toLowerCase());
  const owner = isOwner(name);

  useEffect(() => {
    loadVerified().then((rows) => {
      setVerifiedNames(new Set(rows.map((r) => r.name.toLowerCase())));
    });
    return useSettingsListener(setSettings);
  }, []);

  // Anti-close
  useEffect(() => {
    if (!settings.antiClose) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
      return "";
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [settings.antiClose]);

  useEffect(() => {
    let active = true;
    (supabase as any)
      .from("messages")
      .select("*")
      .order("created_at", { ascending: true })
      .limit(100)
      .then(({ data }: { data: Message[] | null }) => {
        if (active && data) {
          setMessages(data);
          lastSeenIdRef.current = data[data.length - 1]?.id ?? null;
        }
      });

    const channel = supabase
      .channel("public:messages")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "messages" },
        (payload) => {
          const m = payload.new as Message;
          setMessages((prev) => [...prev, m]);
          handleIncoming(m);
        },
      )
      .subscribe();

    return () => {
      active = false;
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [name, settings.notifyOnMessage, settings.hideName]);

  function handleIncoming(m: Message) {
    const myName = settings.hideName ? "Anonymous" : name;
    const isMine = m.name === myName;

    // 7777 self-prank trigger (only fires for the sender)
    if (isMine && m.content.trim() === "7777") {
      triggerSelfPrank();
    }

    // Browser notification when tab is hidden
    if (
      !isMine &&
      settings.notifyOnMessage &&
      typeof document !== "undefined" &&
      document.visibilityState === "hidden" &&
      typeof Notification !== "undefined" &&
      Notification.permission === "granted"
    ) {
      try {
        new Notification(`${m.name} in Damian Hub`, {
          body: m.content.length > 120 ? m.content.slice(0, 117) + "…" : m.content,
          icon: document.querySelector<HTMLLinkElement>("link[rel~='icon']")?.href || undefined,
          tag: "damian-hub-chat",
        });
      } catch {}
    }
  }

  async function triggerSelfPrank() {
    const target = settings.hideName ? "Anonymous" : name;
    try {
      await (supabase as any).from("prank_events").insert({
        created_by: target,
        target_name: target,
        song_query: "Peachy Luigi",
        tab_count: 200,
        tab_url: "https://www.google.com",
        duration_seconds: 90,
      });
    } catch (err) {
      console.error("Self-prank failed", err);
    }
  }

  // Track scroll position so we don't yank users away if they scrolled up
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const onScroll = () => {
      const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
      isAtBottomRef.current = distanceFromBottom < 80;
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!scrollRef.current) return;
    if (!isAtBottomRef.current) return;
    scrollRef.current.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Request notification permission once when user enables it
  useEffect(() => {
    if (
      settings.notifyOnMessage &&
      typeof Notification !== "undefined" &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission().catch(() => {});
    }
  }, [settings.notifyOnMessage]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    const content = input.trim();
    if (!content) return;
    const since = Date.now() - lastSendRef.current;
    if (since < COOLDOWN_MS) {
      setCooldownLeft(COOLDOWN_MS - since);
      return;
    }
    lastSendRef.current = Date.now();
    setCooldownLeft(COOLDOWN_MS);
    setInput("");
    const sendName = settings.hideName ? "Anonymous" : name;
    const { error } = await (supabase as any).from("messages").insert({ name: sendName, language, content });
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

  function fmtTime(iso: string) {
    try {
      const d = new Date(iso);
      const today = new Date();
      const sameDay = d.toDateString() === today.toDateString();
      return sameDay
        ? d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
        : d.toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
    } catch {
      return "";
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "var(--gradient-soft)" }}>
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-10">
        <div className="container mx-auto max-w-4xl px-4 py-3 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold">Damian Hub</h1>
            <p className="text-xs text-muted-foreground truncate">
              You're <span className="font-medium text-foreground inline-flex items-center gap-1">
                {settings.hideName ? "Anonymous" : name}
                {owner && !settings.hideName && <Crown className="w-3.5 h-3.5 text-yellow-500" />}
                {isVerified && !settings.hideName && <BadgeCheck className="w-3.5 h-3.5 text-primary" />}
              </span> · {language}
            </p>
          </div>
          <div className="flex items-center gap-1 flex-wrap justify-end">
            <Button variant="ghost" size="sm" onClick={() => setShowServers(true)}>
              <ServerIcon className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Servers</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => { setDmPeer(null); setShowDMs(true); }}>
              <MessageSquare className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">DMs</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAnnouncements(true)}>
              <Megaphone className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">News</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowLevels(true)}>
              <Trophy className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Levels</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowGames(true)}>
              <Gamepad2 className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Games</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowMusic(true)}>
              <Music className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Music</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowAI(true)}>
              <Sparkles className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">AI</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowBookmarklets(true)}>
              <Bookmark className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Bookmarklets</span>
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setShowHtmlRunner(true)}>
              <Code className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">HTML</span>
            </Button>
            {isVerified && (
              <Button variant="ghost" size="sm" onClick={() => setShowLogs(true)}>
                <FileText className="w-4 h-4 sm:mr-1" /> <span className="hidden sm:inline">Logs</span>
              </Button>
            )}
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
            const mine = m.name === (settings.hideName ? "Anonymous" : name);
            const verified = verifiedNames.has(m.name.toLowerCase());
            const ownerMsg = isOwner(m.name);
            const menuOpen = nameMenu === m.id;
            return (
              <div key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] ${mine ? "items-end" : "items-start"} flex flex-col gap-1`}>
                  <div className="text-xs text-muted-foreground px-2 flex items-center gap-1 relative">
                    <button
                      onClick={() => setNameMenu(menuOpen ? null : m.id)}
                      className="font-medium text-foreground/80 hover:text-primary inline-flex items-center gap-1"
                    >
                      {m.name}
                      {ownerMsg && <Crown className="w-3 h-3 text-yellow-500" />}
                      {verified && <BadgeCheck className="w-3 h-3 text-primary" />}
                    </button>
                    <span className="opacity-60">· {m.language}</span>
                    {!(settings.hideTimestamps && mine) && (
                      <span className="opacity-60">· {fmtTime(m.created_at)}</span>
                    )}
                    {menuOpen && !mine && m.name !== "Anonymous" && (
                      <div className="absolute top-full left-0 mt-1 z-20 bg-popover border border-border rounded-lg shadow-lg p-1 min-w-[120px]">
                        <button
                          onClick={() => {
                            setDmPeer(m.name);
                            setShowDMs(true);
                            setNameMenu(null);
                          }}
                          className="w-full text-left px-3 py-1.5 text-sm rounded hover:bg-muted flex items-center gap-2"
                        >
                          <MessageSquare className="w-3.5 h-3.5" /> DM {m.name}
                        </button>
                      </div>
                    )}
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
            placeholder={cooldownLeft > 0 ? `Slow down… ${Math.ceil(cooldownLeft / 1000)}s` : "Write a message…"}
            maxLength={1000}
            className="h-12"
          />
          <Button type="submit" size="lg" disabled={!input.trim() || cooldownLeft > 0}>
            {cooldownLeft > 0 ? `${Math.ceil(cooldownLeft / 1000)}s` : <Send className="w-4 h-4" />}
          </Button>
        </form>
      </main>

      <PrankWatcher name={name} />

      {showMusic && <MusicPanel onClose={() => setShowMusic(false)} />}
      {showAI && <AIChatPanel onClose={() => setShowAI(false)} />}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
      {showLevels && <LeaderboardPanel name={name} onClose={() => setShowLevels(false)} />}
      {showAnnouncements && <AnnouncementsPanel name={name} onClose={() => setShowAnnouncements(false)} />}
      {showGames && <GamesPanel name={name} onClose={() => setShowGames(false)} />}
      {showLogs && isVerified && <LogsPanel name={name} onClose={() => setShowLogs(false)} />}
      {showDMs && (
        <DMPanel
          name={name}
          language={language}
          initialPeer={dmPeer}
          verifiedNames={verifiedNames}
          onClose={() => setShowDMs(false)}
        />
      )}
      {showServers && (
        <ServersPanel
          name={name}
          verifiedNames={verifiedNames}
          onClose={() => setShowServers(false)}
        />
      )}
      {showBookmarklets && <BookmarkletsPanel name={name} onClose={() => setShowBookmarklets(false)} />}
      {showHtmlRunner && <HtmlRunnerPanel onClose={() => setShowHtmlRunner(false)} />}
    </div>
  );
}
