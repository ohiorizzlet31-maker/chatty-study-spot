import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";

/* =================================================================== */
/* Shared gambling balance helpers (synced to gambling_stats table)    */
/* =================================================================== */
const G_KEY = "gambling_balance_v1";
function loadGBalance(): number {
  const v = Number(localStorage.getItem(G_KEY));
  return Number.isFinite(v) && v > 0 ? v : 50;
}
function saveGBalance(v: number) {
  localStorage.setItem(G_KEY, String(v));
  const name = (() => {
    try { return JSON.parse(localStorage.getItem("studyroom_profile") || "{}").name as string | undefined; }
    catch { return undefined; }
  })();
  if (!name) return;
  // upsert to gambling_stats so leaderboard works
  (supabase as any).from("gambling_stats").upsert(
    { name, balance: Math.round(v * 100) / 100, updated_at: new Date().toISOString() },
    { onConflict: "name" },
  ).then(() => {}, () => {});
}
function useGBalance(): [number, (n: number) => void, () => void] {
  const [b, setB] = useState(loadGBalance);
  const set = (n: number) => { const r = Math.round(n * 100) / 100; setB(r); saveGBalance(r); };
  const reset = () => set(50);
  return [b, set, reset];
}

/* =================================================================== */
/* DINO — Chrome Dinosaur                                              */
/* =================================================================== */
export function Dino() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("dino_best") || 0));
  const [over, setOver] = useState(false);

  const W = 600, H = 180;
  const stateRef = useRef({
    y: 130, vy: 0, jumping: false,
    obstacles: [] as Array<{ x: number; w: number; h: number }>,
    speed: 6, frame: 0, last: 0, score: 0, dead: false,
  });

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.dead) {
      // restart
      s.y = 130; s.vy = 0; s.jumping = false; s.obstacles = []; s.speed = 6;
      s.frame = 0; s.score = 0; s.dead = false; s.last = 0;
      setOver(false); setScore(0); return;
    }
    if (!s.jumping) { s.vy = -10; s.jumping = true; }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [jump]);

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    const tick = (ts: number) => {
      const s = stateRef.current;
      const dt = s.last ? Math.min(0.04, (ts - s.last) / 1000) : 1/60;
      s.last = ts;
      ctx.fillStyle = "#f7f7f7"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#535353"; ctx.fillRect(0, 150, W, 2);

      if (!s.dead) {
        s.frame += dt * 60;
        s.vy += 0.55;
        s.y += s.vy;
        if (s.y >= 130) { s.y = 130; s.vy = 0; s.jumping = false; }
        s.speed += dt * 0.15;
        s.score += dt * 10;
        if (Math.floor(s.score) !== score) setScore(Math.floor(s.score));

        if (s.obstacles.length === 0 || s.obstacles[s.obstacles.length-1].x < W - 200 - Math.random()*200) {
          const h = 20 + Math.random() * 30;
          s.obstacles.push({ x: W, w: 14 + Math.random() * 14, h });
        }
        s.obstacles.forEach(o => o.x -= s.speed);
        s.obstacles = s.obstacles.filter(o => o.x + o.w > 0);

        for (const o of s.obstacles) {
          if (40 + 30 > o.x && 40 < o.x + o.w && s.y + 20 > 150 - o.h) {
            s.dead = true;
            setOver(true);
            const b = Math.max(best, Math.floor(s.score));
            localStorage.setItem("dino_best", String(b));
            setBest(b);
          }
        }
      }

      // dino
      ctx.fillStyle = "#535353";
      ctx.fillRect(40, s.y - 30, 30, 30);
      ctx.fillRect(60, s.y - 40, 14, 14);
      ctx.fillStyle = "white";
      ctx.fillRect(68, s.y - 36, 3, 3);
      // legs animate
      const legSwap = Math.floor(s.frame / 6) % 2 === 0 && !s.jumping;
      ctx.fillStyle = "#535353";
      if (legSwap) { ctx.fillRect(42, s.y, 6, 10); ctx.fillRect(58, s.y, 6, 4); }
      else { ctx.fillRect(42, s.y, 6, 4); ctx.fillRect(58, s.y, 6, 10); }

      // obstacles (cacti)
      ctx.fillStyle = "#3a8a3a";
      for (const o of s.obstacles) {
        ctx.fillRect(o.x, 150 - o.h, o.w, o.h);
      }

      ctx.fillStyle = "#535353";
      ctx.font = "bold 14px monospace";
      ctx.textAlign = "right";
      ctx.fillText(`HI ${String(best).padStart(5,"0")}  ${String(Math.floor(s.score)).padStart(5,"0")}`, W - 10, 20);

      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.5)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white"; ctx.font = "bold 24px monospace";
        ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W/2, H/2 - 4);
        ctx.font = "12px monospace";
        ctx.fillText("press space / tap to restart", W/2, H/2 + 16);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [score, best]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onPointerDown={jump}
        className="rounded-xl border border-border touch-none cursor-pointer max-w-full"
        style={{ width: "100%", maxWidth: W, imageRendering: "pixelated" }}
      />
      <p className="text-xs text-muted-foreground">Tap or SPACE to jump · Best {best}{over && " · Game over"}</p>
    </div>
  );
}

/* =================================================================== */
/* MINESWEEPER                                                         */
/* =================================================================== */
type MSCell = { mine: boolean; revealed: boolean; flagged: boolean; n: number };
export function Minesweeper() {
  const SIZE = 9, MINES = 10;
  const [grid, setGrid] = useState<MSCell[][]>(() => makeGrid());
  const [over, setOver] = useState<"play" | "win" | "lose">("play");

  function makeGrid(): MSCell[][] {
    const g: MSCell[][] = Array.from({ length: SIZE }, () =>
      Array.from({ length: SIZE }, () => ({ mine: false, revealed: false, flagged: false, n: 0 }))
    );
    let placed = 0;
    while (placed < MINES) {
      const x = Math.floor(Math.random() * SIZE), y = Math.floor(Math.random() * SIZE);
      if (!g[y][x].mine) { g[y][x].mine = true; placed++; }
    }
    for (let y = 0; y < SIZE; y++) for (let x = 0; x < SIZE; x++) {
      if (g[y][x].mine) continue;
      let n = 0;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x+dx, ny = y+dy;
        if (nx>=0 && nx<SIZE && ny>=0 && ny<SIZE && g[ny][nx].mine) n++;
      }
      g[y][x].n = n;
    }
    return g;
  }

  function reveal(x: number, y: number, g: MSCell[][]) {
    if (x<0||y<0||x>=SIZE||y>=SIZE||g[y][x].revealed||g[y][x].flagged) return;
    g[y][x].revealed = true;
    if (g[y][x].n === 0 && !g[y][x].mine) {
      for (let dy=-1;dy<=1;dy++) for (let dx=-1;dx<=1;dx++) reveal(x+dx, y+dy, g);
    }
  }

  function click(x: number, y: number) {
    if (over !== "play") return;
    const g = grid.map(r => r.map(c => ({...c})));
    if (g[y][x].flagged) return;
    if (g[y][x].mine) {
      g.forEach(r => r.forEach(c => { if (c.mine) c.revealed = true; }));
      setGrid(g); setOver("lose"); return;
    }
    reveal(x, y, g);
    const won = g.every(r => r.every(c => c.mine || c.revealed));
    setGrid(g);
    if (won) setOver("win");
  }

  function flag(e: React.MouseEvent, x: number, y: number) {
    e.preventDefault();
    if (over !== "play" || grid[y][x].revealed) return;
    const g = grid.map(r => r.map(c => ({...c})));
    g[y][x].flagged = !g[y][x].flagged;
    setGrid(g);
  }

  function reset() { setGrid(makeGrid()); setOver("play"); }

  const colors = ["", "#1976d2","#388e3c","#d32f2f","#7b1fa2","#ff8f00","#0097a7","#000","#616161"];

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="text-sm font-medium">{over === "play" ? "💣 Find all safe cells" : over === "win" ? "🎉 You won!" : "💥 Boom!"}</p>
        <Button size="sm" variant="outline" onClick={reset}>New game</Button>
      </div>
      <div className="grid mx-auto select-none" style={{ gridTemplateColumns: `repeat(${SIZE}, 32px)`, width: SIZE*32 }}>
        {grid.map((row, y) => row.map((c, x) => (
          <button
            key={`${x}-${y}`}
            onClick={() => click(x, y)}
            onContextMenu={(e) => flag(e, x, y)}
            className={`w-8 h-8 border border-border text-sm font-bold flex items-center justify-center ${
              c.revealed ? (c.mine ? "bg-destructive/40" : "bg-muted/30") : "bg-muted hover:bg-muted/70"
            }`}
          >
            {c.flagged && !c.revealed ? "🚩" : c.revealed ? (c.mine ? "💣" : c.n > 0 ? <span style={{ color: colors[c.n] }}>{c.n}</span> : "") : ""}
          </button>
        )))}
      </div>
      <p className="text-[10px] text-muted-foreground text-center">Right-click to flag</p>
    </div>
  );
}

/* =================================================================== */
/* PLINKO — drop ball, $50 starting balance                           */
/* =================================================================== */
export function Plinko() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance, resetBalance] = useGBalance();
  const [bet, setBet] = useState(5);
  const ballsRef = useRef<Array<{ x: number; y: number; vx: number; vy: number; bet: number }>>([]);
  const [lastWin, setLastWin] = useState<string>("");

  const W = 360, H = 480;
  const ROWS = 10;
  const PEG_R = 4;
  const BALL_R = 6;
  const slotMultipliers = [5, 2, 1, 0.5, 0.2, 0.5, 1, 2, 5];

  const pegs = useRef<Array<{x:number;y:number}>>([]);
  if (pegs.current.length === 0) {
    for (let r = 0; r < ROWS; r++) {
      const count = r + 3;
      const spacing = W / (count + 1);
      for (let i = 0; i < count; i++) {
        pegs.current.push({ x: spacing * (i+1), y: 60 + r * 32 });
      }
    }
  }

  function drop() {
    if (balance < bet || bet <= 0) return;
    setBalance(balance - bet);
    ballsRef.current.push({ x: W/2 + (Math.random()-0.5)*20, y: 10, vx: (Math.random()-0.5)*0.5, vy: 0, bet });
  }

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    const tick = () => {
      ctx.fillStyle = "#1a1a2e"; ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = "#facc15";
      for (const p of pegs.current) { ctx.beginPath(); ctx.arc(p.x, p.y, PEG_R, 0, Math.PI*2); ctx.fill(); }

      // slots at bottom
      const slotW = W / slotMultipliers.length;
      const slotY = H - 40;
      slotMultipliers.forEach((m, i) => {
        const isHigh = m >= 2;
        ctx.fillStyle = isHigh ? "#ef4444" : m >= 1 ? "#22c55e" : "#3b82f6";
        ctx.fillRect(i * slotW + 2, slotY, slotW - 4, 32);
        ctx.fillStyle = "white"; ctx.font = "bold 12px sans-serif"; ctx.textAlign = "center";
        ctx.fillText(`${m}x`, i * slotW + slotW/2, slotY + 20);
      });

      // physics
      for (const ball of ballsRef.current) {
        ball.vy += 0.25;
        ball.x += ball.vx; ball.y += ball.vy;
        if (ball.x < BALL_R) { ball.x = BALL_R; ball.vx = -ball.vx*0.5; }
        if (ball.x > W - BALL_R) { ball.x = W - BALL_R; ball.vx = -ball.vx*0.5; }
        for (const p of pegs.current) {
          const dx = ball.x - p.x, dy = ball.y - p.y;
          const d = Math.hypot(dx, dy);
          const min = PEG_R + BALL_R;
          if (d < min && d > 0) {
            const nx = dx / d, ny = dy / d;
            ball.x = p.x + nx * min; ball.y = p.y + ny * min;
            const dot = ball.vx * nx + ball.vy * ny;
            ball.vx = (ball.vx - 2*dot*nx) * 0.7 + (Math.random()-0.5)*0.5;
            ball.vy = (ball.vy - 2*dot*ny) * 0.7;
          }
        }
      }
      // draw + landed
      ctx.fillStyle = "white";
      const survivors: typeof ballsRef.current = [];
      for (const ball of ballsRef.current) {
        if (ball.y >= slotY) {
          const idx = Math.max(0, Math.min(slotMultipliers.length - 1, Math.floor(ball.x / slotW)));
          const win = Math.round(ball.bet * slotMultipliers[idx] * 100) / 100;
          // read fresh from localStorage to avoid stale closure
          setBalance(loadGBalance() + win);
          setLastWin(`${slotMultipliers[idx]}x · +$${win.toFixed(2)}`);
        } else {
          survivors.push(ball);
          ctx.beginPath(); ctx.arc(ball.x, ball.y, BALL_R, 0, Math.PI*2); ctx.fill();
        }
      }
      ballsRef.current = survivors;

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  function reset() { resetBalance(); setLastWin(""); }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <p className="text-2xl font-bold">${balance.toFixed(2)} <span className="text-xs text-muted-foreground">(fake)</span></p>
          {lastWin && <p className="text-xs text-muted-foreground">Last: {lastWin}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={reset}>Reset to $50</Button>
      </div>
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border border-border max-w-full mx-auto block" style={{ width: "100%", maxWidth: W }} />
      <div className="flex items-center gap-2">
        <label className="text-sm">Bet $</label>
        <input type="number" min={1} max={Math.max(1, Math.floor(balance))} value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||1))} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
        <Button onClick={drop} disabled={balance < bet || bet <= 0} className="ml-auto">Drop ball</Button>
      </div>
      {balance <= 0 && <p className="text-xs text-destructive">You're broke! Reset to play again.</p>}
    </div>
  );
}

/* =================================================================== */
/* MINES — crypto-style                                                */
/* =================================================================== */
export function MinesGame() {
  const SIZE = 5;
  const [balance, setBalance] = useState(() => {
    const s = Number(localStorage.getItem("mines_balance"));
    return Number.isFinite(s) && s > 0 ? s : 50;
  });
  const [bet, setBet] = useState(5);
  const [mineCount, setMineCount] = useState(3);
  const [grid, setGrid] = useState<Array<{ mine: boolean; revealed: boolean }>>([]);
  const [round, setRound] = useState<"idle" | "play" | "lost">("idle");
  const [picked, setPicked] = useState(0);

  useEffect(() => { localStorage.setItem("mines_balance", String(balance)); }, [balance]);

  function start() {
    if (balance < bet || bet <= 0) return;
    setBalance(b => Math.round((b - bet)*100)/100);
    const cells: number[] = Array.from({length: SIZE*SIZE}, (_, i) => i);
    cells.sort(() => Math.random() - 0.5);
    const mines = new Set(cells.slice(0, mineCount));
    setGrid(Array.from({length: SIZE*SIZE}, (_, i) => ({ mine: mines.has(i), revealed: false })));
    setPicked(0); setRound("play");
  }

  const safe = SIZE*SIZE - mineCount;
  const multiplier = picked === 0 ? 1 : (() => {
    let m = 1;
    for (let i = 0; i < picked; i++) m *= (safe - i) / (SIZE*SIZE - mineCount - i) * (SIZE*SIZE - i) / (SIZE*SIZE - mineCount - i);
    // simpler payout: 1 + 0.4*picked * (mineCount/3)
    return Math.round((1 + picked * 0.35 * (mineCount/2)) * 100) / 100;
  })();

  function pick(i: number) {
    if (round !== "play" || grid[i].revealed) return;
    const g = grid.map(c => ({...c}));
    g[i].revealed = true;
    if (g[i].mine) {
      g.forEach(c => { if (c.mine) c.revealed = true; });
      setGrid(g); setRound("lost"); return;
    }
    const newPicked = picked + 1;
    setPicked(newPicked); setGrid(g);
    if (newPicked === safe) cashout(g, newPicked);
  }

  function cashout(g = grid, p = picked) {
    if (round !== "play" || p === 0) { setRound("idle"); return; }
    const win = Math.round(bet * (1 + p * 0.35 * (mineCount/2)) * 100) / 100;
    setBalance(b => Math.round((b + win)*100)/100);
    setRound("idle"); setPicked(0); setGrid([]);
  }

  function reset() { setBalance(50); localStorage.setItem("mines_balance", "50"); setRound("idle"); setGrid([]); setPicked(0); }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-2xl font-bold">${balance.toFixed(2)} <span className="text-xs text-muted-foreground">(fake)</span></p>
        <Button size="sm" variant="outline" onClick={reset}>Reset to $50</Button>
      </div>
      {round !== "play" && (
        <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
          <label className="text-sm">Bet $</label>
          <input type="number" min={1} max={Math.max(1, Math.floor(balance))} value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||1))} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
          <label className="text-sm ml-2">Mines</label>
          <select value={mineCount} onChange={(e) => setMineCount(Number(e.target.value))} className="h-8 px-2 rounded-md border border-border bg-background text-sm">
            {[1,2,3,5,7,10].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <Button onClick={start} disabled={balance < bet || bet <= 0} className="ml-auto">Start round</Button>
        </div>
      )}
      {round === "play" && (
        <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30">
          <span>Picked: {picked}/{safe}</span>
          <span>Multiplier: <b>{multiplier.toFixed(2)}x</b></span>
          <span>Cashout: <b>${(bet * multiplier).toFixed(2)}</b></span>
        </div>
      )}
      {grid.length > 0 && (
        <div className="grid gap-2 mx-auto" style={{ gridTemplateColumns: `repeat(${SIZE}, 1fr)`, maxWidth: 320 }}>
          {grid.map((c, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={c.revealed || round !== "play"}
              className={`aspect-square rounded-lg border text-2xl font-bold flex items-center justify-center transition ${
                c.revealed
                  ? c.mine ? "bg-destructive/30 border-destructive" : "bg-emerald-500/20 border-emerald-500"
                  : "bg-muted hover:bg-muted/70 border-border"
              }`}
            >
              {c.revealed ? (c.mine ? "💣" : "💎") : ""}
            </button>
          ))}
        </div>
      )}
      {round === "play" && (
        <Button onClick={() => cashout()} disabled={picked === 0} className="w-full" variant="outline">Cashout ${(bet * multiplier).toFixed(2)}</Button>
      )}
      {round === "lost" && (
        <div className="text-center">
          <p className="text-destructive font-semibold">💥 Hit a mine!</p>
          <Button onClick={() => { setRound("idle"); setGrid([]); setPicked(0); }} variant="outline" size="sm" className="mt-2">New round</Button>
        </div>
      )}
    </div>
  );
}

/* =================================================================== */
/* PONG                                                                */
/* =================================================================== */
export function Pong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ p: 0, ai: 0 });
  const W = 480, H = 300;
  const stateRef = useRef({
    py: H/2, ay: H/2, bx: W/2, by: H/2, vx: 4, vy: 2, last: 0,
    targetY: H/2,
  });

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = c.getBoundingClientRect();
      const cy = ("touches" in e ? e.touches[0].clientY : e.clientY) - rect.top;
      const scale = H / rect.height;
      stateRef.current.targetY = cy * scale;
    };
    c.addEventListener("mousemove", onMove);
    c.addEventListener("touchmove", onMove, { passive: true });

    const tick = () => {
      const s = stateRef.current;
      // smooth player paddle
      s.py += (s.targetY - s.py) * 0.3;
      // ai
      s.ay += Math.max(-3.5, Math.min(3.5, s.by - s.ay));
      // ball
      s.bx += s.vx; s.by += s.vy;
      if (s.by < 8 || s.by > H - 8) s.vy = -s.vy;
      // paddles
      if (s.bx < 24 && Math.abs(s.by - s.py) < 40) { s.vx = Math.abs(s.vx) * 1.05; s.vy += (s.by - s.py) * 0.05; }
      if (s.bx > W - 24 && Math.abs(s.by - s.ay) < 40) { s.vx = -Math.abs(s.vx) * 1.05; s.vy += (s.by - s.ay) * 0.05; }
      if (s.bx < 0) { setScore(sc => ({...sc, ai: sc.ai+1})); s.bx = W/2; s.by = H/2; s.vx = 4; s.vy = (Math.random()-0.5)*4; }
      if (s.bx > W) { setScore(sc => ({...sc, p: sc.p+1})); s.bx = W/2; s.by = H/2; s.vx = -4; s.vy = (Math.random()-0.5)*4; }

      ctx.fillStyle = "#0a0a0a"; ctx.fillRect(0, 0, W, H);
      ctx.strokeStyle = "rgba(255,255,255,0.3)"; ctx.setLineDash([6, 8]);
      ctx.beginPath(); ctx.moveTo(W/2, 0); ctx.lineTo(W/2, H); ctx.stroke(); ctx.setLineDash([]);
      ctx.fillStyle = "white";
      ctx.fillRect(8, s.py - 35, 8, 70);
      ctx.fillRect(W - 16, s.ay - 35, 8, 70);
      ctx.beginPath(); ctx.arc(s.bx, s.by, 7, 0, Math.PI*2); ctx.fill();

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      c.removeEventListener("mousemove", onMove);
      c.removeEventListener("touchmove", onMove);
    };
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <p className="font-mono text-2xl">{score.p} : {score.ai}</p>
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border border-border max-w-full touch-none" style={{ width: "100%", maxWidth: W }} />
      <p className="text-xs text-muted-foreground">Move mouse / drag finger to control left paddle</p>
    </div>
  );
}

/* =================================================================== */
/* ROCK PAPER SCISSORS                                                 */
/* =================================================================== */
export function RPS() {
  const choices = ["rock", "paper", "scissors"] as const;
  const emoji = { rock: "🪨", paper: "📄", scissors: "✂️" };
  const [you, setYou] = useState<typeof choices[number] | null>(null);
  const [cpu, setCpu] = useState<typeof choices[number] | null>(null);
  const [score, setScore] = useState({ w: 0, l: 0, d: 0 });
  const [result, setResult] = useState("");

  function play(c: typeof choices[number]) {
    const ai = choices[Math.floor(Math.random()*3)];
    setYou(c); setCpu(ai);
    if (c === ai) { setResult("Draw"); setScore(s => ({...s, d: s.d+1})); return; }
    const wins: Record<string, string> = { rock: "scissors", paper: "rock", scissors: "paper" };
    if (wins[c] === ai) { setResult("You win!"); setScore(s => ({...s, w: s.w+1})); }
    else { setResult("You lose"); setScore(s => ({...s, l: s.l+1})); }
  }

  return (
    <div className="space-y-4 text-center">
      <p className="text-sm text-muted-foreground">Wins {score.w} · Losses {score.l} · Draws {score.d}</p>
      <div className="flex justify-center gap-8 text-6xl py-4">
        <div>{you ? emoji[you] : "❔"}</div>
        <div className="text-2xl self-center text-muted-foreground">vs</div>
        <div>{cpu ? emoji[cpu] : "❔"}</div>
      </div>
      <p className="font-bold text-lg min-h-[28px]">{result}</p>
      <div className="flex justify-center gap-2">
        {choices.map(c => (
          <Button key={c} onClick={() => play(c)} variant="outline" className="text-2xl h-16 w-16">{emoji[c]}</Button>
        ))}
      </div>
    </div>
  );
}

/* =================================================================== */
/* WHACK-A-MOLE                                                        */
/* =================================================================== */
export function WhackAMole() {
  const [active, setActive] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [time, setTime] = useState(30);
  const [running, setRunning] = useState(false);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setTime(s => s - 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  useEffect(() => {
    if (running && time <= 0) { setRunning(false); setActive(null); }
  }, [time, running]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => {
      setActive(Math.floor(Math.random() * 9));
    }, 700);
    return () => clearInterval(t);
  }, [running]);

  function start() { setScore(0); setTime(30); setRunning(true); }
  function whack(i: number) {
    if (!running) return;
    if (i === active) { setScore(s => s+1); setActive(null); }
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center">
        <p className="font-bold">Score: {score}</p>
        <p className="font-mono">⏱ {time}s</p>
        <Button size="sm" onClick={start} disabled={running}>{running ? "Playing..." : time === 0 ? "Play again" : "Start"}</Button>
      </div>
      <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto">
        {Array.from({length: 9}).map((_, i) => (
          <button
            key={i}
            onClick={() => whack(i)}
            className="aspect-square rounded-2xl bg-amber-900/40 border-2 border-amber-900/60 flex items-center justify-center text-5xl active:scale-95 transition"
          >
            {active === i ? "🐹" : ""}
          </button>
        ))}
      </div>
      {!running && time === 0 && <p className="text-center text-sm">Final: {score}</p>}
    </div>
  );
}

/* =================================================================== */
/* ASTEROIDS                                                           */
/* =================================================================== */
export function Asteroids() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [over, setOver] = useState(false);
  const W = 480, H = 360;

  const sRef = useRef({
    ship: { x: W/2, y: H/2, a: 0, vx: 0, vy: 0 },
    bullets: [] as Array<{x:number;y:number;vx:number;vy:number;life:number}>,
    rocks: [] as Array<{x:number;y:number;vx:number;vy:number;r:number}>,
    keys: {} as Record<string, boolean>,
    last: 0, dead: false, score: 0,
  });

  function spawnRock(r = 30) {
    const edge = Math.floor(Math.random()*4);
    const pos = edge < 2 ? { x: edge ? 0 : W, y: Math.random()*H } : { x: Math.random()*W, y: edge === 2 ? 0 : H };
    const a = Math.random() * Math.PI * 2;
    sRef.current.rocks.push({ ...pos, vx: Math.cos(a)*1.2, vy: Math.sin(a)*1.2, r });
  }

  function reset() {
    sRef.current.ship = { x: W/2, y: H/2, a: 0, vx: 0, vy: 0 };
    sRef.current.bullets = [];
    sRef.current.rocks = [];
    sRef.current.dead = false; sRef.current.score = 0;
    setScore(0); setOver(false);
    for (let i = 0; i < 4; i++) spawnRock();
  }

  useEffect(() => { reset(); /* eslint-disable-line */ }, []);

  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      sRef.current.keys[e.code] = true;
      if (e.code === "Space") {
        e.preventDefault();
        if (sRef.current.dead) { reset(); return; }
        const s = sRef.current.ship;
        sRef.current.bullets.push({ x: s.x, y: s.y, vx: Math.cos(s.a)*7, vy: Math.sin(s.a)*7, life: 60 });
      }
    };
    const onUp = (e: KeyboardEvent) => { sRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    const tick = () => {
      const s = sRef.current;
      ctx.fillStyle = "#000"; ctx.fillRect(0, 0, W, H);

      if (!s.dead) {
        if (s.keys["ArrowLeft"]) s.ship.a -= 0.08;
        if (s.keys["ArrowRight"]) s.ship.a += 0.08;
        if (s.keys["ArrowUp"]) { s.ship.vx += Math.cos(s.ship.a)*0.15; s.ship.vy += Math.sin(s.ship.a)*0.15; }
        s.ship.vx *= 0.99; s.ship.vy *= 0.99;
        s.ship.x = (s.ship.x + s.ship.vx + W) % W;
        s.ship.y = (s.ship.y + s.ship.vy + H) % H;

        s.bullets.forEach(b => { b.x = (b.x + b.vx + W) % W; b.y = (b.y + b.vy + H) % H; b.life--; });
        s.bullets = s.bullets.filter(b => b.life > 0);
        s.rocks.forEach(r => { r.x = (r.x + r.vx + W) % W; r.y = (r.y + r.vy + H) % H; });

        // bullet-rock collision
        for (const b of s.bullets) {
          for (const r of s.rocks) {
            if (Math.hypot(b.x - r.x, b.y - r.y) < r.r) {
              b.life = 0; r.r = 0; s.score += 10;
              setScore(s.score);
              if (r.r === 0) {
                // split if big
                if (r.r === 0) {
                  // intentionally noop
                }
              }
            }
          }
        }
        s.rocks = s.rocks.filter(r => r.r > 0);
        if (s.rocks.length < 3) spawnRock(20 + Math.random()*20);

        // ship-rock collision
        for (const r of s.rocks) {
          if (Math.hypot(s.ship.x - r.x, s.ship.y - r.y) < r.r + 6) {
            s.dead = true; setOver(true);
          }
        }
      }

      // draw ship
      ctx.strokeStyle = "white"; ctx.lineWidth = 1.5;
      ctx.save(); ctx.translate(s.ship.x, s.ship.y); ctx.rotate(s.ship.a);
      ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(-7, -6); ctx.lineTo(-4, 0); ctx.lineTo(-7, 6); ctx.closePath();
      ctx.stroke(); ctx.restore();

      // bullets
      ctx.fillStyle = "white";
      for (const b of s.bullets) { ctx.beginPath(); ctx.arc(b.x, b.y, 2, 0, Math.PI*2); ctx.fill(); }

      // rocks
      for (const r of s.rocks) {
        ctx.beginPath(); ctx.arc(r.x, r.y, r.r, 0, Math.PI*2); ctx.stroke();
      }

      ctx.fillStyle = "white"; ctx.font = "16px monospace";
      ctx.fillText(`SCORE ${s.score}`, 10, 22);

      if (s.dead) {
        ctx.fillStyle = "rgba(0,0,0,0.6)"; ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white"; ctx.font = "bold 28px monospace"; ctx.textAlign = "center";
        ctx.fillText("GAME OVER", W/2, H/2);
        ctx.font = "14px monospace";
        ctx.fillText("Press SPACE to retry", W/2, H/2 + 24);
        ctx.textAlign = "left";
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border border-border max-w-full bg-black" style={{ width: "100%", maxWidth: W }} />
      <p className="text-xs text-muted-foreground">← → rotate · ↑ thrust · SPACE shoot {over && "· Press SPACE to restart"}</p>
    </div>
  );
}

/* =================================================================== */
/* MINI MINECRAFT — 2D survival                                        */
/* =================================================================== */
type Block = "air" | "grass" | "dirt" | "stone" | "wood" | "leaves" | "plank" | "crafting" | "chest";
const BLOCK_COLORS: Record<Block, string> = {
  air: "transparent",
  grass: "#5d9b3a",
  dirt: "#8b5a2b",
  stone: "#7a7a7a",
  wood: "#5b3a1c",
  leaves: "#3e7a2e",
  plank: "#c08a4a",
  crafting: "#9a6b3a",
  chest: "#a87333",
};
const MINEABLE: Block[] = ["grass","dirt","stone","wood","leaves","plank","crafting","chest"];

type Mob = { x: number; y: number; type: "pig" | "zombie"; hp: number; vy: number };

export function MiniMinecraft() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const W = 600, H = 360;
  const TILE = 24;
  const COLS = 40, ROWS = 18;

  const stateRef = useRef<{
    world: Block[][];
    px: number; py: number; vx: number; vy: number;
    keys: Record<string, boolean>;
    onGround: boolean;
    inv: Record<string, number>;
    selected: Block;
    mobs: Mob[];
    chests: Record<string, Record<string, number>>;
    openChest: string | null;
    crafting: boolean;
    last: number;
    health: number;
    cam: number;
    spawnTimer: number;
    pointer: { x: number; y: number; down: boolean; rdown: boolean };
    hurtCd: number;
  }>({
    world: [],
    px: TILE * 5, py: 0, vx: 0, vy: 0,
    keys: {},
    onGround: false,
    inv: {},
    selected: "dirt",
    mobs: [],
    chests: {},
    openChest: null,
    crafting: false,
    last: 0,
    health: 10,
    cam: 0,
    spawnTimer: 0,
    pointer: { x: 0, y: 0, down: false, rdown: false },
    hurtCd: 0,
  });

  const [, force] = useState(0);
  const rerender = () => force(n => n + 1);

  // initialize world
  useEffect(() => {
    const s = stateRef.current;
    if (s.world.length) return;
    const surface: number[] = [];
    let h = 10;
    for (let x = 0; x < COLS; x++) {
      h += Math.round((Math.random() - 0.5) * 1.2);
      h = Math.max(7, Math.min(13, h));
      surface.push(h);
    }
    const world: Block[][] = Array.from({length: ROWS}, () => Array(COLS).fill("air" as Block));
    for (let x = 0; x < COLS; x++) {
      for (let y = 0; y < ROWS; y++) {
        if (y === surface[x]) world[y][x] = "grass";
        else if (y > surface[x] && y < surface[x] + 4) world[y][x] = "dirt";
        else if (y >= surface[x] + 4) world[y][x] = "stone";
      }
    }
    // trees
    for (let i = 0; i < 5; i++) {
      const tx = 4 + Math.floor(Math.random() * (COLS - 8));
      const top = surface[tx] - 1;
      for (let t = 0; t < 4; t++) world[top - t][tx] = "wood";
      for (let dy = -1; dy <= 1; dy++) for (let dx = -2; dx <= 2; dx++) {
        const yy = top - 4 + dy, xx = tx + dx;
        if (yy>=0 && xx>=0 && xx<COLS && Math.abs(dx) + Math.abs(dy) < 3) {
          if (world[yy][xx] === "air") world[yy][xx] = "leaves";
        }
      }
    }
    s.world = world;
    s.py = (surface[5] - 2) * TILE;
    s.inv = { dirt: 0, stone: 0, wood: 0, plank: 0, leaves: 0, grass: 0 };
    s.selected = "dirt";
    rerender();
  }, []);

  // input
  useEffect(() => {
    const onDown = (e: KeyboardEvent) => {
      stateRef.current.keys[e.code] = true;
      if (e.code === "KeyE") { stateRef.current.crafting = !stateRef.current.crafting; rerender(); }
      if (e.code === "Space" && stateRef.current.onGround) {
        stateRef.current.vy = -7; stateRef.current.onGround = false;
      }
      if (e.code.startsWith("Digit")) {
        const types: Block[] = ["dirt","stone","wood","plank","leaves","grass","crafting","chest"];
        const idx = Number(e.code.replace("Digit","")) - 1;
        if (types[idx]) { stateRef.current.selected = types[idx]; rerender(); }
      }
    };
    const onUp = (e: KeyboardEvent) => { stateRef.current.keys[e.code] = false; };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);
    return () => { window.removeEventListener("keydown", onDown); window.removeEventListener("keyup", onUp); };
  }, []);

  // pointer interaction (mine / place)
  useEffect(() => {
    const c = canvasRef.current!;
    const onMove = (e: PointerEvent) => {
      const rect = c.getBoundingClientRect();
      const scaleX = W / rect.width, scaleY = H / rect.height;
      stateRef.current.pointer.x = (e.clientX - rect.left) * scaleX;
      stateRef.current.pointer.y = (e.clientY - rect.top) * scaleY;
    };
    const onDown = (e: PointerEvent) => {
      onMove(e);
      if (e.button === 2) stateRef.current.pointer.rdown = true;
      else stateRef.current.pointer.down = true;
      handleClick(e.button === 2);
    };
    const onUp = (e: PointerEvent) => {
      if (e.button === 2) stateRef.current.pointer.rdown = false;
      else stateRef.current.pointer.down = false;
    };
    const onCtx = (e: MouseEvent) => e.preventDefault();
    c.addEventListener("pointermove", onMove);
    c.addEventListener("pointerdown", onDown);
    c.addEventListener("pointerup", onUp);
    c.addEventListener("contextmenu", onCtx);
    return () => {
      c.removeEventListener("pointermove", onMove);
      c.removeEventListener("pointerdown", onDown);
      c.removeEventListener("pointerup", onUp);
      c.removeEventListener("contextmenu", onCtx);
    };
  }, []);

  function handleClick(rightClick: boolean) {
    const s = stateRef.current;
    const wx = Math.floor((s.pointer.x + s.cam) / TILE);
    const wy = Math.floor(s.pointer.y / TILE);
    if (wx<0||wy<0||wx>=COLS||wy>=ROWS) return;
    const playerTileX = Math.floor((s.px + TILE/2) / TILE);
    const playerTileY = Math.floor((s.py + TILE) / TILE);
    const dist = Math.hypot(wx - playerTileX, wy - playerTileY);
    if (dist > 4) return;

    const block = s.world[wy][wx];
    if (rightClick) {
      // place
      if (block === "air" && s.inv[s.selected] && s.inv[s.selected] > 0) {
        // dont place inside player
        if (wx === playerTileX && (wy === playerTileY || wy === playerTileY - 1)) return;
        s.world[wy][wx] = s.selected;
        s.inv[s.selected]--;
        rerender();
      }
    } else {
      // mine
      if (block === "crafting") { s.crafting = true; rerender(); return; }
      if (block === "chest") {
        const key = `${wx},${wy}`;
        s.openChest = s.openChest === key ? null : key;
        if (!s.chests[key]) s.chests[key] = {};
        rerender(); return;
      }
      if (MINEABLE.includes(block as Block)) {
        s.world[wy][wx] = "air";
        const drop = block === "grass" ? "dirt" : block;
        s.inv[drop] = (s.inv[drop] || 0) + 1;
        rerender();
      }
    }
  }

  // game loop
  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;

    const tick = (ts: number) => {
      const s = stateRef.current;
      const dt = s.last ? Math.min(0.05, (ts - s.last) / 1000) : 1/60;
      s.last = ts;

      // movement
      s.vx = 0;
      if (s.keys["KeyA"] || s.keys["ArrowLeft"]) s.vx = -3;
      if (s.keys["KeyD"] || s.keys["ArrowRight"]) s.vx = 3;
      s.vy += 0.4;
      if (s.vy > 12) s.vy = 12;

      // collision (X then Y)
      const move = (dx: number, dy: number) => {
        const newX = s.px + dx, newY = s.py + dy;
        const w = TILE - 2, hh = TILE * 2 - 2;
        const tlx = Math.floor(newX / TILE), trx = Math.floor((newX + w) / TILE);
        const tly = Math.floor(newY / TILE), tby = Math.floor((newY + hh) / TILE);
        let blocked = false;
        for (let y = tly; y <= tby; y++) {
          for (let x = tlx; x <= trx; x++) {
            if (x<0||y<0||x>=COLS||y>=ROWS) continue;
            const b = s.world[y][x];
            if (b !== "air" && b !== "leaves") { blocked = true; break; }
          }
          if (blocked) break;
        }
        return blocked;
      };

      if (!move(s.vx, 0)) s.px += s.vx;
      if (!move(0, s.vy)) {
        s.py += s.vy; s.onGround = false;
      } else {
        if (s.vy > 0) s.onGround = true;
        s.vy = 0;
      }

      s.px = Math.max(0, Math.min(COLS * TILE - TILE, s.px));
      if (s.py > ROWS * TILE) { s.py = 50; s.health = Math.max(0, s.health - 2); }

      // camera follows player horizontally
      s.cam = Math.max(0, Math.min(COLS * TILE - W, s.px - W / 2 + TILE/2));

      // mob spawn
      s.spawnTimer += dt;
      if (s.spawnTimer > 6 && s.mobs.length < 5) {
        s.spawnTimer = 0;
        const type: "pig" | "zombie" = Math.random() < 0.5 ? "pig" : "zombie";
        const sx = Math.random() < 0.5 ? Math.max(0, s.px - 250) : Math.min(COLS*TILE, s.px + 250);
        s.mobs.push({ x: sx, y: 0, type, hp: type === "pig" ? 2 : 4, vy: 0 });
      }

      // mob ai
      s.hurtCd = Math.max(0, s.hurtCd - dt);
      for (const m of s.mobs) {
        m.vy += 0.4; if (m.vy > 12) m.vy = 12;
        // gravity for mob (simple)
        const mTileY = Math.floor((m.y + TILE) / TILE);
        const mTileX = Math.floor((m.x + TILE/2) / TILE);
        if (mTileY >= 0 && mTileY < ROWS && mTileX>=0 && mTileX<COLS && s.world[mTileY][mTileX] !== "air" && s.world[mTileY][mTileX] !== "leaves") {
          m.vy = 0; m.y = mTileY * TILE - TILE;
        } else {
          m.y += m.vy;
        }
        if (m.type === "zombie") {
          if (m.x < s.px) m.x += 1; else m.x -= 1;
          if (Math.abs(m.x - s.px) < TILE && Math.abs(m.y - s.py) < TILE*2 && s.hurtCd === 0) {
            s.health = Math.max(0, s.health - 1); s.hurtCd = 1.0;
          }
        } else {
          // pig wanders
          if (Math.random() < 0.01) m.x += (Math.random()-0.5) * 30;
        }
      }

      // attack mobs with left-click while down
      if (s.pointer.down) {
        for (const m of s.mobs) {
          const screenX = m.x - s.cam;
          if (Math.abs(screenX + TILE/2 - s.pointer.x) < TILE && Math.abs(m.y + TILE/2 - s.pointer.y) < TILE) {
            if (Math.hypot(s.px - m.x, s.py - m.y) < TILE * 3) {
              m.hp -= dt * 4;
            }
          }
        }
      }
      const removed = s.mobs.filter(m => m.hp <= 0);
      removed.forEach(m => {
        if (m.type === "pig") s.inv["pork"] = (s.inv["pork"] || 0) + 1;
      });
      s.mobs = s.mobs.filter(m => m.hp > 0);

      // ============ DRAW ============
      ctx.fillStyle = "#87ceeb"; ctx.fillRect(0, 0, W, H);
      // sun
      ctx.fillStyle = "#fff5b8"; ctx.beginPath(); ctx.arc(W - 50, 50, 24, 0, Math.PI*2); ctx.fill();

      // world
      const startX = Math.floor(s.cam / TILE);
      const endX = Math.min(COLS, startX + Math.ceil(W / TILE) + 1);
      for (let y = 0; y < ROWS; y++) {
        for (let x = startX; x < endX; x++) {
          const b = s.world[y][x];
          if (b === "air") continue;
          const sx = x * TILE - s.cam;
          ctx.fillStyle = BLOCK_COLORS[b];
          ctx.fillRect(sx, y * TILE, TILE, TILE);
          // grass top stripe
          if (b === "grass") { ctx.fillStyle = "#4a8030"; ctx.fillRect(sx, y * TILE, TILE, 4); }
          // wood texture
          if (b === "wood") { ctx.fillStyle = "#3a2412"; ctx.fillRect(sx + 8, y*TILE, 2, TILE); ctx.fillRect(sx + 14, y*TILE, 2, TILE); }
          // chest
          if (b === "chest") {
            ctx.fillStyle = "#5b3a1c";
            ctx.fillRect(sx + 10, y*TILE + 10, 4, 4);
          }
          if (b === "crafting") {
            ctx.fillStyle = "#5b3a1c";
            ctx.fillRect(sx, y*TILE, TILE, 2); ctx.fillRect(sx, y*TILE + TILE/2, TILE, 1);
            ctx.fillRect(sx + TILE/2, y*TILE, 1, TILE);
          }
          ctx.strokeStyle = "rgba(0,0,0,0.1)";
          ctx.strokeRect(sx, y * TILE, TILE, TILE);
        }
      }

      // player
      ctx.fillStyle = "#3a6dd1"; ctx.fillRect(s.px - s.cam, s.py + TILE, TILE - 2, TILE - 2);
      ctx.fillStyle = "#f1c27d"; ctx.fillRect(s.px - s.cam, s.py, TILE - 2, TILE - 2);
      ctx.fillStyle = "#000"; ctx.fillRect(s.px - s.cam + 14, s.py + 8, 3, 3);
      ctx.fillRect(s.px - s.cam + 6, s.py + 8, 3, 3);

      // mobs
      for (const m of s.mobs) {
        const sx = m.x - s.cam;
        if (m.type === "pig") {
          ctx.fillStyle = "#f8a8c4"; ctx.fillRect(sx, m.y + 6, TILE, TILE - 8);
          ctx.fillStyle = "#000"; ctx.fillRect(sx + 16, m.y + 12, 2, 2);
        } else {
          ctx.fillStyle = "#3a7a3a"; ctx.fillRect(sx, m.y, TILE - 2, TILE * 2 - 2);
          ctx.fillStyle = "#0c2c0c"; ctx.fillRect(sx + 4, m.y + 8, 4, 4); ctx.fillRect(sx + 14, m.y + 8, 4, 4);
        }
      }

      // hover highlight
      const hx = Math.floor((s.pointer.x + s.cam) / TILE);
      const hy = Math.floor(s.pointer.y / TILE);
      if (hx>=0 && hy>=0 && hx<COLS && hy<ROWS) {
        ctx.strokeStyle = "rgba(255,255,255,0.6)"; ctx.lineWidth = 2;
        ctx.strokeRect(hx * TILE - s.cam, hy * TILE, TILE, TILE);
      }

      // health
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i < s.health ? "#ef4444" : "#444";
        ctx.fillRect(8 + i * 14, 8, 12, 12);
      }

      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  const s = stateRef.current;
  const types: Block[] = ["dirt","stone","wood","plank","leaves","grass","crafting","chest"];

  function craft(recipe: { name: Block; cost: Partial<Record<string, number>> }) {
    const sCur = stateRef.current;
    const entries = Object.entries(recipe.cost) as Array<[string, number]>;
    if (entries.every(([k, v]) => (sCur.inv[k] || 0) >= v)) {
      entries.forEach(([k, v]) => { sCur.inv[k] -= v; });
      sCur.inv[recipe.name] = (sCur.inv[recipe.name] || 0) + 1;
      rerender();
    }
  }

  return (
    <div className="space-y-2">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        className="rounded-xl border border-border max-w-full touch-none cursor-crosshair"
        style={{ width: "100%", maxWidth: W }}
      />
      <p className="text-[10px] text-muted-foreground text-center">
        WASD/Arrows + Space to jump · Left-click mine · Right-click place · 1-8 select · E craft
      </p>
      {/* Hotbar */}
      <div className="flex gap-1 justify-center flex-wrap">
        {types.map((t, i) => (
          <button
            key={t}
            onClick={() => { stateRef.current.selected = t; rerender(); }}
            className={`w-12 h-12 rounded border-2 flex flex-col items-center justify-center text-[10px] font-mono ${
              s.selected === t ? "border-primary" : "border-border"
            }`}
            style={{ background: BLOCK_COLORS[t] === "transparent" ? "var(--muted)" : BLOCK_COLORS[t] }}
          >
            <span className="text-white drop-shadow" style={{ textShadow: "1px 1px 2px black" }}>{i+1}</span>
            <span className="text-white drop-shadow" style={{ textShadow: "1px 1px 2px black" }}>{s.inv[t] || 0}</span>
          </button>
        ))}
      </div>
      {s.crafting && (
        <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">🔨 Crafting</p>
            <Button size="sm" variant="ghost" onClick={() => { stateRef.current.crafting = false; rerender(); }}>Close</Button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {[
              { name: "plank" as Block, cost: { wood: 1 }, label: "1 wood → 4 planks", n: 4 },
              { name: "crafting" as Block, cost: { plank: 4 }, label: "4 planks → 1 crafting table", n: 1 },
              { name: "chest" as Block, cost: { plank: 8 }, label: "8 planks → 1 chest", n: 1 },
              { name: "stone" as Block, cost: { dirt: 4 }, label: "4 dirt → 1 stone (cheat!)", n: 1 },
            ].map(r => {
              const can = Object.entries(r.cost).every(([k, v]) => (s.inv[k] || 0) >= v);
              return (
                <button
                  key={r.name + r.label}
                  disabled={!can}
                  onClick={() => { for (let i = 0; i < r.n; i++) craft(r); }}
                  className={`p-2 rounded-lg border text-left ${can ? "border-primary hover:bg-primary/10" : "border-border opacity-40"}`}
                >
                  <p className="font-medium">{r.name}</p>
                  <p className="text-[10px] text-muted-foreground">{r.label}</p>
                </button>
              );
            })}
          </div>
        </div>
      )}
      {s.openChest && (
        <div className="p-3 rounded-xl border border-border bg-muted/30 space-y-2">
          <div className="flex items-center justify-between">
            <p className="font-semibold text-sm">📦 Chest</p>
            <Button size="sm" variant="ghost" onClick={() => { stateRef.current.openChest = null; rerender(); }}>Close</Button>
          </div>
          <p className="text-xs text-muted-foreground">Click an inventory slot to deposit, click chest slot to withdraw.</p>
          <div className="grid grid-cols-6 gap-1">
            {types.concat(["pork" as unknown as Block]).map(t => {
              const inChest = s.chests[s.openChest!]?.[t] || 0;
              const inInv = s.inv[t] || 0;
              return (
                <div key={t as string} className="p-1 rounded border border-border text-[10px] text-center bg-card">
                  <p>{t as string}</p>
                  <button
                    className="block w-full hover:bg-muted rounded"
                    onClick={() => {
                      if (inInv > 0) {
                        s.inv[t as string]--;
                        s.chests[s.openChest!] = s.chests[s.openChest!] || {};
                        s.chests[s.openChest!][t as string] = (s.chests[s.openChest!][t as string] || 0) + 1;
                        rerender();
                      }
                    }}
                  >Inv: {inInv}</button>
                  <button
                    className="block w-full hover:bg-muted rounded"
                    onClick={() => {
                      if (inChest > 0) {
                        s.chests[s.openChest!][t as string]--;
                        s.inv[t as string] = (s.inv[t as string] || 0) + 1;
                        rerender();
                      }
                    }}
                  >Box: {inChest}</button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}