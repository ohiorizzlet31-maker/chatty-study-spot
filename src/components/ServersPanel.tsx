import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X, Send, Plus, Hash, Server as ServerIcon, Crown, Shield, Users, Settings as Cog,
  Lock, Globe, EyeOff, Trash2, ArrowLeft, BadgeCheck,
} from "lucide-react";
import { isOwner } from "@/lib/device";

type Server = {
  id: string;
  name: string;
  owner_name: string;
  visibility: "public" | "unlisted" | "private";
  invite_code: string;
};
type Member = { id: string; server_id: string; member_name: string; role: "owner" | "admin" | "member" };
type Channel = {
  id: string;
  server_id: string;
  name: string;
  read_role: "owner" | "admin" | "member";
  write_role: "owner" | "admin" | "member";
  position: number;
};
type SMsg = { id: string; channel_id: string; author_name: string; content: string; created_at: string };

const ROLE_RANK: Record<string, number> = { member: 0, admin: 1, owner: 2 };

export function ServersPanel({
  name,
  verifiedNames,
  onClose,
}: {
  name: string;
  verifiedNames: Set<string>;
  onClose: () => void;
}) {
  const [view, setView] = useState<"browse" | "server">("browse");
  const [servers, setServers] = useState<Server[]>([]);
  const [myServers, setMyServers] = useState<Server[]>([]);
  const [active, setActive] = useState<Server | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [activeChannel, setActiveChannel] = useState<Channel | null>(null);
  const [msgs, setMsgs] = useState<SMsg[]>([]);
  const [input, setInput] = useState("");
  const [newServerName, setNewServerName] = useState("");
  const [newVis, setNewVis] = useState<"public" | "unlisted" | "private">("public");
  const [joinCode, setJoinCode] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  const myRole: Member["role"] | null = active
    ? members.find((m) => m.member_name === name)?.role ?? null
    : null;
  const canManage = myRole === "owner" || myRole === "admin";

  // Load browse list (public + my memberships)
  useEffect(() => {
    let active = true;
    async function load() {
      const { data: pub } = await (supabase as any)
        .from("servers")
        .select("*")
        .eq("visibility", "public")
        .order("created_at", { ascending: false })
        .limit(50);
      const { data: mems } = await (supabase as any)
        .from("server_members")
        .select("server_id")
        .eq("member_name", name);
      const ids = (mems ?? []).map((r: any) => r.server_id);
      let mine: Server[] = [];
      if (ids.length) {
        const { data } = await (supabase as any).from("servers").select("*").in("id", ids);
        mine = (data ?? []) as Server[];
      }
      if (!active) return;
      setServers((pub ?? []) as Server[]);
      setMyServers(mine);
    }
    load();
    return () => {
      active = false;
    };
  }, [name]);

  // Load active server data
  useEffect(() => {
    if (!active) return;
    let alive = true;
    async function load() {
      const [{ data: mems }, { data: chans }] = await Promise.all([
        (supabase as any).from("server_members").select("*").eq("server_id", active!.id),
        (supabase as any).from("server_channels").select("*").eq("server_id", active!.id).order("position"),
      ]);
      if (!alive) return;
      setMembers((mems ?? []) as Member[]);
      const chanList = (chans ?? []) as Channel[];
      setChannels(chanList);
      if (!activeChannel || activeChannel.server_id !== active!.id) {
        setActiveChannel(chanList[0] ?? null);
      }
    }
    load();
    const ch = supabase
      .channel("server:" + active.id)
      .on("postgres_changes", { event: "*", schema: "public", table: "server_members", filter: `server_id=eq.${active.id}` }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "server_channels", filter: `server_id=eq.${active.id}` }, () => load())
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [active?.id]);

  // Load channel messages
  useEffect(() => {
    if (!activeChannel) return;
    let alive = true;
    (supabase as any)
      .from("server_messages")
      .select("*")
      .eq("channel_id", activeChannel.id)
      .order("created_at", { ascending: true })
      .limit(200)
      .then(({ data }: { data: SMsg[] | null }) => {
        if (alive && data) setMsgs(data);
      });
    const ch = supabase
      .channel("chan:" + activeChannel.id)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "server_messages", filter: `channel_id=eq.${activeChannel.id}` },
        (payload) => setMsgs((p) => [...p, payload.new as SMsg]),
      )
      .subscribe();
    return () => {
      alive = false;
      supabase.removeChannel(ch);
    };
  }, [activeChannel?.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [msgs]);

  async function createServer(e: React.FormEvent) {
    e.preventDefault();
    if (!newServerName.trim()) return;
    const { data: srv, error } = await (supabase as any)
      .from("servers")
      .insert({ name: newServerName.trim(), owner_name: name, visibility: newVis })
      .select()
      .single();
    if (error || !srv) return;
    await (supabase as any)
      .from("server_members")
      .insert({ server_id: srv.id, member_name: name, role: "owner" });
    await (supabase as any)
      .from("server_channels")
      .insert([
        { server_id: srv.id, name: "general", position: 0 },
        { server_id: srv.id, name: "announcements", write_role: "admin", position: 1 },
      ]);
    setNewServerName("");
    setMyServers((p) => [srv as Server, ...p]);
    openServer(srv as Server);
  }

  async function joinByCode(e: React.FormEvent) {
    e.preventDefault();
    const code = joinCode.trim();
    if (!code) return;
    const { data: srv } = await (supabase as any)
      .from("servers")
      .select("*")
      .eq("invite_code", code)
      .maybeSingle();
    if (!srv) {
      alert("Invite not found");
      return;
    }
    await (supabase as any)
      .from("server_members")
      .insert({ server_id: srv.id, member_name: name, role: "member" });
    setJoinCode("");
    setMyServers((p) => (p.find((s) => s.id === srv.id) ? p : [srv as Server, ...p]));
    openServer(srv as Server);
  }

  async function joinPublic(s: Server) {
    await (supabase as any)
      .from("server_members")
      .insert({ server_id: s.id, member_name: name, role: "member" });
    setMyServers((p) => (p.find((x) => x.id === s.id) ? p : [s, ...p]));
    openServer(s);
  }

  function openServer(s: Server) {
    setActive(s);
    setActiveChannel(null);
    setView("server");
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!input.trim() || !activeChannel) return;
    if (myRole && ROLE_RANK[myRole] < ROLE_RANK[activeChannel.write_role]) {
      alert("You don't have permission to write here.");
      return;
    }
    const content = input.trim();
    setInput("");
    await (supabase as any).from("server_messages").insert({
      channel_id: activeChannel.id,
      author_name: name,
      content,
    });
  }

  async function addChannel() {
    if (!active || !canManage) return;
    const cname = prompt("Channel name?");
    if (!cname?.trim()) return;
    await (supabase as any).from("server_channels").insert({
      server_id: active.id,
      name: cname.trim().toLowerCase().replace(/\s+/g, "-"),
      position: channels.length,
    });
  }

  async function setMemberRole(m: Member, role: Member["role"]) {
    if (myRole !== "owner") return;
    await (supabase as any).from("server_members").update({ role }).eq("id", m.id);
  }

  async function kickMember(m: Member) {
    if (!canManage || m.role === "owner") return;
    if (!confirm(`Kick ${m.member_name}?`)) return;
    await (supabase as any).from("server_members").delete().eq("id", m.id);
  }

  async function setChannelPerms(c: Channel, read_role: Channel["read_role"], write_role: Channel["write_role"]) {
    if (!canManage) return;
    await (supabase as any).from("server_channels").update({ read_role, write_role }).eq("id", c.id);
  }

  async function deleteChannel(c: Channel) {
    if (!canManage) return;
    if (!confirm(`Delete #${c.name}?`)) return;
    await (supabase as any).from("server_channels").delete().eq("id", c.id);
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

  function VisIcon({ v }: { v: Server["visibility"] }) {
    if (v === "public") return <Globe className="w-3.5 h-3.5" />;
    if (v === "unlisted") return <EyeOff className="w-3.5 h-3.5" />;
    return <Lock className="w-3.5 h-3.5" />;
  }

  // Filter visible channels for current role
  const visibleChannels = channels.filter(
    (c) => myRole && ROLE_RANK[myRole] >= ROLE_RANK[c.read_role],
  );

  return (
    <aside className="fixed inset-0 bg-card z-30 flex flex-col animate-in fade-in duration-200">
      <div className="p-4 border-b border-border flex items-center justify-between">
        <h2 className="font-display text-xl font-bold flex items-center gap-2">
          {view === "server" && (
            <button onClick={() => { setView("browse"); setActive(null); }} className="p-1 -ml-1 rounded hover:bg-muted">
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
          <ServerIcon className="w-5 h-5 text-primary" />
          {view === "server" && active ? active.name : "Servers"}
        </h2>
        <div className="flex gap-1">
          {view === "server" && canManage && (
            <Button variant="ghost" size="icon" onClick={() => setShowSettings((s) => !s)}>
              <Cog className="w-5 h-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="w-5 h-5" />
          </Button>
        </div>
      </div>

      {view === "browse" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-6 max-w-3xl mx-auto w-full">
          <section className="grid md:grid-cols-2 gap-3">
            <form onSubmit={createServer} className="p-4 rounded-2xl border border-border bg-muted/30 space-y-2">
              <h3 className="font-semibold flex items-center gap-1"><Plus className="w-4 h-4" /> Create server</h3>
              <Input value={newServerName} onChange={(e) => setNewServerName(e.target.value)} placeholder="Server name" maxLength={60} />
              <select
                value={newVis}
                onChange={(e) => setNewVis(e.target.value as any)}
                className="w-full h-10 px-3 rounded-md border border-border bg-background text-sm"
              >
                <option value="public">🌍 Public — anyone can join from list</option>
                <option value="unlisted">🙈 Unlisted — invite code only</option>
                <option value="private">🔒 Private — invite code only, hidden</option>
              </select>
              <Button type="submit" className="w-full">Create</Button>
            </form>
            <form onSubmit={joinByCode} className="p-4 rounded-2xl border border-border bg-muted/30 space-y-2">
              <h3 className="font-semibold">Join by invite code</h3>
              <Input value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="invite code" />
              <Button type="submit" className="w-full" variant="secondary">Join</Button>
            </form>
          </section>

          {myServers.length > 0 && (
            <section>
              <h3 className="font-semibold mb-2">Your servers</h3>
              <div className="grid sm:grid-cols-2 gap-2">
                {myServers.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openServer(s)}
                    className="p-3 rounded-xl border border-border hover:bg-muted text-left flex items-center gap-3"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center font-bold text-primary">
                      {s.name.slice(0, 1).toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold truncate">{s.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <VisIcon v={s.visibility} /> {s.visibility} · owner <NameTag n={s.owner_name} />
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            </section>
          )}

          <section>
            <h3 className="font-semibold mb-2">Discover public servers</h3>
            <div className="grid sm:grid-cols-2 gap-2">
              {servers.length === 0 && <p className="text-sm text-muted-foreground">No public servers yet.</p>}
              {servers.map((s) => (
                <div key={s.id} className="p-3 rounded-xl border border-border flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center font-bold">
                    {s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">owner <NameTag n={s.owner_name} /></p>
                  </div>
                  <Button size="sm" onClick={() => joinPublic(s)}>Join</Button>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}

      {view === "server" && active && (
        <div className="flex-1 flex overflow-hidden">
          {/* Channels sidebar */}
          <div className="w-56 border-r border-border bg-muted/20 flex flex-col">
            <div className="p-3 border-b border-border flex items-center justify-between">
              <p className="text-xs font-semibold uppercase text-muted-foreground">Channels</p>
              {canManage && (
                <button onClick={addChannel} className="p-1 hover:bg-muted rounded">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {visibleChannels.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveChannel(c)}
                  className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left ${
                    activeChannel?.id === c.id ? "bg-primary text-primary-foreground" : "hover:bg-muted"
                  }`}
                >
                  <Hash className="w-3.5 h-3.5" />
                  <span className="truncate">{c.name}</span>
                </button>
              ))}
            </div>
            <div className="p-3 border-t border-border text-xs">
              <p className="text-muted-foreground">Invite code:</p>
              <code className="font-mono text-foreground">{active.invite_code}</code>
            </div>
          </div>

          {/* Main area */}
          <div className="flex-1 flex flex-col min-w-0">
            {showSettings ? (
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                <h3 className="font-semibold flex items-center gap-1"><Cog className="w-4 h-4" /> Server settings</h3>
                <div>
                  <p className="text-sm font-medium mb-2 flex items-center gap-1"><Users className="w-4 h-4" /> Members</p>
                  <div className="space-y-1">
                    {members.map((m) => (
                      <div key={m.id} className="flex items-center gap-2 p-2 rounded hover:bg-muted">
                        <span className="flex-1"><NameTag n={m.member_name} /></span>
                        {m.role === "owner" && <span className="text-xs bg-yellow-500/20 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1"><Crown className="w-3 h-3" /> Owner</span>}
                        {m.role === "admin" && <span className="text-xs bg-blue-500/20 text-blue-700 px-2 py-0.5 rounded flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>}
                        {myRole === "owner" && m.role !== "owner" && (
                          <select
                            value={m.role}
                            onChange={(e) => setMemberRole(m, e.target.value as any)}
                            className="text-xs h-7 px-1 rounded border border-border bg-background"
                          >
                            <option value="member">member</option>
                            <option value="admin">admin</option>
                          </select>
                        )}
                        {canManage && m.role !== "owner" && (
                          <button onClick={() => kickMember(m)} className="text-destructive p-1 hover:bg-destructive/10 rounded">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium mb-2">Channel permissions</p>
                  <div className="space-y-2">
                    {channels.map((c) => (
                      <div key={c.id} className="p-2 rounded border border-border">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-sm">#{c.name}</span>
                          <button onClick={() => deleteChannel(c)} className="text-destructive text-xs flex items-center gap-1">
                            <Trash2 className="w-3 h-3" /> Delete
                          </button>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          <label>
                            Read:{" "}
                            <select
                              value={c.read_role}
                              onChange={(e) => setChannelPerms(c, e.target.value as any, c.write_role)}
                              className="h-7 px-1 rounded border border-border bg-background"
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                              <option value="owner">owner</option>
                            </select>
                          </label>
                          <label>
                            Write:{" "}
                            <select
                              value={c.write_role}
                              onChange={(e) => setChannelPerms(c, c.read_role, e.target.value as any)}
                              className="h-7 px-1 rounded border border-border bg-background"
                            >
                              <option value="member">member</option>
                              <option value="admin">admin</option>
                              <option value="owner">owner</option>
                            </select>
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : activeChannel ? (
              <>
                <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                  <Hash className="w-4 h-4" />
                  <p className="font-semibold">{activeChannel.name}</p>
                </div>
                <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-2">
                  {msgs.length === 0 && <p className="text-center text-sm text-muted-foreground py-12">No messages.</p>}
                  {msgs.map((m) => (
                    <div key={m.id} className="flex flex-col">
                      <div className="text-xs text-muted-foreground">
                        <NameTag n={m.author_name} /> ·{" "}
                        {new Date(m.created_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                      </div>
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    </div>
                  ))}
                </div>
                <form onSubmit={send} className="flex gap-2 p-3 border-t border-border">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder={`Message #${activeChannel.name}…`}
                    maxLength={2000}
                  />
                  <Button type="submit" disabled={!input.trim()}>
                    <Send className="w-4 h-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
                {channels.length === 0 ? "No channels yet." : "Pick a channel."}
              </div>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
