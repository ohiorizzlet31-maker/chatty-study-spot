import { useEffect, useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { getSettings } from "@/lib/settings";
import { isOwner } from "@/lib/device";

/* =================================================================== */
/* Owner rigging helpers                                               */
/* =================================================================== */
function getOwnerName(): string | undefined {
  try { return JSON.parse(localStorage.getItem("studyroom_profile") || "{}").name; } catch { return undefined; }
}
export function isRigged(): boolean {
  const n = getOwnerName();
  if (!n || !isOwner(n)) return false;
  return !!getSettings().ownerRig;
}
/** Random in [0,1) skewed toward 0 when rigged (favorable for the player). */
function rRandom(): number {
  const u = Math.random();
  if (!isRigged()) return u;
  // bias toward 0 — Math.pow(u, 4) produces low values most of the time
  return Math.pow(u, 5);
}
/** Pick from array, with rigged mode favouring the highest value (assumes payout ordering). */
function rPickIndex(weightsHigh: number[]): number {
  if (!isRigged()) return Math.floor(Math.random() * weightsHigh.length);
  // bias toward highest-payout slots (ends of plinko / specific roulette nums)
  return Math.floor(Math.pow(Math.random(), 0.25) * weightsHigh.length);
}

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

  const W = 700, H = 200;
  const stateRef = useRef({
    y: 150, vy: 0, jumping: false, ducking: false,
    obstacles: [] as Array<{ x: number; w: number; h: number; flying: boolean }>,
    clouds: [] as Array<{ x: number; y: number }>,
    speed: 6, frame: 0, last: 0, score: 0, dead: false,
    groundOffset: 0,
  });
  const GROUND_Y = 170;

  const jump = useCallback(() => {
    const s = stateRef.current;
    if (s.dead) {
      s.y = 150; s.vy = 0; s.jumping = false; s.obstacles = []; s.speed = 6;
      s.frame = 0; s.score = 0; s.dead = false; s.last = 0;
      setOver(false); setScore(0); return;
    }
    if (!s.jumping) { s.vy = -12; s.jumping = true; }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") { e.preventDefault(); jump(); }
      if (e.code === "ArrowDown") { stateRef.current.ducking = true; }
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.code === "ArrowDown") stateRef.current.ducking = false;
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("keyup", onUp);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
    };
  }, [jump]);

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    // seed clouds
    for (let i = 0; i < 4; i++) stateRef.current.clouds.push({ x: Math.random()*W, y: 30 + Math.random()*60 });
    const tick = (ts: number) => {
      const s = stateRef.current;
      const dt = s.last ? Math.min(0.04, (ts - s.last) / 1000) : 1/60;
      s.last = ts;
      // sky
      ctx.fillStyle = "#f7f7f7"; ctx.fillRect(0, 0, W, H);

      if (!s.dead) {
        s.frame += dt * 60;
        s.vy += 0.7;
        s.y += s.vy;
        if (s.y >= 150) { s.y = 150; s.vy = 0; s.jumping = false; }
        s.speed += dt * 0.25;
        s.score += dt * 10;
        if (Math.floor(s.score) !== score) setScore(Math.floor(s.score));
        s.groundOffset = (s.groundOffset + s.speed) % 24;
        // clouds
        s.clouds.forEach(cl => {
          cl.x -= s.speed * 0.2;
          if (cl.x < -50) { cl.x = W + 20; cl.y = 30 + Math.random()*60; }
        });

        if (s.obstacles.length === 0 || s.obstacles[s.obstacles.length-1].x < W - 250 - Math.random()*200) {
          const flying = s.score > 200 && Math.random() < 0.25;
          const h = flying ? 16 : 20 + Math.random() * 30;
          s.obstacles.push({ x: W, w: flying ? 24 : 14 + Math.random() * 14, h, flying });
        }
        s.obstacles.forEach(o => o.x -= s.speed);
        s.obstacles = s.obstacles.filter(o => o.x + o.w > 0);

        const playerH = s.ducking && !s.jumping ? 20 : 40;
        const playerW = s.ducking && !s.jumping ? 44 : 30;
        const playerY = s.ducking && !s.jumping ? s.y + 20 : s.y - 30;
        for (const o of s.obstacles) {
          const oy = o.flying ? GROUND_Y - 60 - o.h : GROUND_Y - o.h;
          if (
            40 + playerW > o.x && 40 < o.x + o.w &&
            playerY + playerH > oy && playerY < oy + o.h
          ) {
            s.dead = true;
            setOver(true);
            const b = Math.max(best, Math.floor(s.score));
            localStorage.setItem("dino_best", String(b));
            setBest(b);
          }
        }
      }

      // clouds
      ctx.fillStyle = "#cfd8dc";
      for (const cl of s.clouds) {
        ctx.beginPath();
        ctx.arc(cl.x, cl.y, 8, 0, Math.PI*2);
        ctx.arc(cl.x + 8, cl.y + 2, 10, 0, Math.PI*2);
        ctx.arc(cl.x + 18, cl.y, 7, 0, Math.PI*2);
        ctx.fill();
      }
      // ground line + dashes
      ctx.fillStyle = "#535353"; ctx.fillRect(0, GROUND_Y, W, 2);
      ctx.fillStyle = "#888";
      for (let i = -1; i < W / 24 + 2; i++) {
        ctx.fillRect(i * 24 - s.groundOffset, GROUND_Y + 4, 12, 2);
      }

      // dino — improved sprite
      ctx.fillStyle = "#535353";
      if (s.ducking && !s.jumping) {
        // ducking long shape
        ctx.fillRect(40, s.y + 20, 44, 20);
        ctx.fillRect(72, s.y + 14, 14, 12);
        ctx.fillStyle = "white"; ctx.fillRect(80, s.y + 18, 3, 3);
      } else {
        // body
        ctx.fillRect(40, s.y - 30, 30, 30);
        // head
        ctx.fillRect(60, s.y - 42, 18, 16);
        // eye
        ctx.fillStyle = "white"; ctx.fillRect(70, s.y - 38, 4, 4);
        ctx.fillStyle = "#535353";
        // mouth
        ctx.fillRect(72, s.y - 30, 6, 2);
        // tail
        ctx.fillRect(28, s.y - 20, 14, 8);
        // arm
        ctx.fillRect(56, s.y - 12, 6, 4);
        // legs animate
        const legSwap = Math.floor(s.frame / 4) % 2 === 0 && !s.jumping;
        if (legSwap) { ctx.fillRect(42, s.y, 8, 12); ctx.fillRect(58, s.y, 8, 4); }
        else { ctx.fillRect(42, s.y, 8, 4); ctx.fillRect(58, s.y, 8, 12); }
      }

      // obstacles (cacti + birds)
      for (const o of s.obstacles) {
        if (o.flying) {
          // bird
          const flap = Math.floor(s.frame / 8) % 2;
          const by = GROUND_Y - 60;
          ctx.fillStyle = "#535353";
          ctx.fillRect(o.x + 4, by + 4, 16, 6); // body
          if (flap) {
            ctx.fillRect(o.x, by - 2, 12, 4);
            ctx.fillRect(o.x + 12, by - 2, 12, 4);
          } else {
            ctx.fillRect(o.x, by + 10, 12, 4);
            ctx.fillRect(o.x + 12, by + 10, 12, 4);
          }
          ctx.fillRect(o.x + 18, by + 2, 6, 4); // beak
        } else {
          ctx.fillStyle = "#3a8a3a";
          ctx.fillRect(o.x, GROUND_Y - o.h, o.w, o.h);
          // cactus arms
          ctx.fillRect(o.x - 4, GROUND_Y - o.h * 0.7, 4, o.h * 0.4);
          ctx.fillRect(o.x + o.w, GROUND_Y - o.h * 0.5, 4, o.h * 0.3);
        }
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
      <p className="text-xs text-muted-foreground">SPACE/↑ jump · ↓ duck · Best {best}{over && " · Game over"}</p>
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
  const [size, setSize] = useState(5);
  const [balance, setBalance, resetBalance] = useGBalance();
  const [bet, setBet] = useState(5);
  const [mineCount, setMineCount] = useState(3);
  const [grid, setGrid] = useState<Array<{ mine: boolean; revealed: boolean }>>([]);
  const [round, setRound] = useState<"idle" | "play" | "lost">("idle");
  const [picked, setPicked] = useState(0);

  // Per-cell payout shrinks as grid grows so big boards pay less per click.
  // multiplier = product over picks i: total/(total - mines_left_after_i)
  // We use a smoother capped formula so 2 mines on 5x5 ≈ 1.08x first pick, 1.18x second...
  function calcMultiplier(p: number) {
    if (p === 0) return 1;
    const total = size * size;
    let m = 1;
    for (let i = 0; i < p; i++) {
      m *= (total - i) / (total - mineCount - i);
    }
    // House edge of ~5%
    return Math.round(m * 0.95 * 100) / 100;
  }

  function start() {
    if (balance < bet || bet <= 0) return;
    if (mineCount >= size * size) return;
    setBalance(balance - bet);
    const cells: number[] = Array.from({length: size*size}, (_, i) => i);
    cells.sort(() => Math.random() - 0.5);
    const mines = new Set(cells.slice(0, mineCount));
    setGrid(Array.from({length: size*size}, (_, i) => ({ mine: mines.has(i), revealed: false })));
    setPicked(0); setRound("play");
  }

  const safe = size*size - mineCount;
  const multiplier = calcMultiplier(picked);
  const nextMultiplier = calcMultiplier(picked + 1);

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
    const win = Math.round(bet * calcMultiplier(p) * 100) / 100;
    setBalance(balance + win);
    setRound("idle"); setPicked(0); setGrid([]);
  }

  function reset() { resetBalance(); setRound("idle"); setGrid([]); setPicked(0); }

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
          <label className="text-sm ml-2">Grid</label>
          <select value={size} onChange={(e) => setSize(Number(e.target.value))} className="h-8 px-2 rounded-md border border-border bg-background text-sm">
            {[3,4,5,6,7,8,10].map(n => <option key={n} value={n}>{n}×{n}</option>)}
          </select>
          <label className="text-sm ml-2">Mines</label>
          <select value={mineCount} onChange={(e) => setMineCount(Number(e.target.value))} className="h-8 px-2 rounded-md border border-border bg-background text-sm">
            {[1,2,3,5,7,10,15,20].filter(n => n < size*size).map(n => <option key={n} value={n}>{n}</option>)}
          </select>
          <Button onClick={start} disabled={balance < bet || bet <= 0} className="ml-auto">Start round</Button>
        </div>
      )}
      {round === "play" && (
        <div className="flex items-center justify-between text-sm p-2 rounded-lg bg-muted/30 flex-wrap gap-2">
          <span>Picked: {picked}/{safe}</span>
          <span>Now: <b>{multiplier.toFixed(2)}x</b> · Next: <b>{nextMultiplier.toFixed(2)}x</b></span>
          <span>Cashout: <b>${(bet * multiplier).toFixed(2)}</b></span>
        </div>
      )}
      {grid.length > 0 && (
        <div className="grid gap-1.5 mx-auto" style={{ gridTemplateColumns: `repeat(${size}, 1fr)`, maxWidth: Math.min(360, size * 50) }}>
          {grid.map((c, i) => (
            <button
              key={i}
              onClick={() => pick(i)}
              disabled={c.revealed || round !== "play"}
              className={`aspect-square rounded-md border font-bold flex items-center justify-center transition ${size <= 5 ? "text-2xl" : size <= 7 ? "text-base" : "text-xs"} ${
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
/* HANGMAN                                                             */
/* =================================================================== */
const HANGMAN_WORDS = [
  "javascript","computer","keyboard","monitor","internet","developer","function",
  "homework","backpack","textbook","calculator","pencil","library","teacher",
  "lemonade","sandwich","skateboard","mountain","airplane","whisper","puzzle",
  "kingdom","dragon","wizard","castle","unicorn","penguin","dolphin","octopus",
];
export function Hangman() {
  const [word, setWord] = useState(() => HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)]);
  const [guessed, setGuessed] = useState<Set<string>>(new Set());
  const [wrong, setWrong] = useState(0);
  const MAX = 6;

  const display = word.split("").map(c => guessed.has(c) ? c : "_").join(" ");
  const won = word.split("").every(c => guessed.has(c));
  const lost = wrong >= MAX;

  function guess(c: string) {
    if (won || lost || guessed.has(c)) return;
    const next = new Set(guessed); next.add(c);
    setGuessed(next);
    if (!word.includes(c)) setWrong(w => w + 1);
  }

  function reset() {
    setWord(HANGMAN_WORDS[Math.floor(Math.random()*HANGMAN_WORDS.length)]);
    setGuessed(new Set()); setWrong(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (/^[a-z]$/.test(k)) guess(k);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  return (
    <div className="space-y-4 text-center">
      <svg width="180" height="200" className="mx-auto">
        <line x1="20" y1="190" x2="160" y2="190" stroke="currentColor" strokeWidth="3" />
        <line x1="50" y1="190" x2="50" y2="20" stroke="currentColor" strokeWidth="3" />
        <line x1="50" y1="20" x2="120" y2="20" stroke="currentColor" strokeWidth="3" />
        <line x1="120" y1="20" x2="120" y2="40" stroke="currentColor" strokeWidth="3" />
        {wrong > 0 && <circle cx="120" cy="55" r="15" stroke="currentColor" strokeWidth="3" fill="none" />}
        {wrong > 1 && <line x1="120" y1="70" x2="120" y2="120" stroke="currentColor" strokeWidth="3" />}
        {wrong > 2 && <line x1="120" y1="80" x2="100" y2="100" stroke="currentColor" strokeWidth="3" />}
        {wrong > 3 && <line x1="120" y1="80" x2="140" y2="100" stroke="currentColor" strokeWidth="3" />}
        {wrong > 4 && <line x1="120" y1="120" x2="100" y2="150" stroke="currentColor" strokeWidth="3" />}
        {wrong > 5 && <line x1="120" y1="120" x2="140" y2="150" stroke="currentColor" strokeWidth="3" />}
      </svg>
      <p className="text-3xl font-mono tracking-widest font-bold">{display}</p>
      <p className="text-sm text-muted-foreground">Wrong guesses: {wrong}/{MAX}</p>
      <div className="grid grid-cols-9 gap-1 max-w-md mx-auto">
        {"abcdefghijklmnopqrstuvwxyz".split("").map(c => (
          <button
            key={c}
            onClick={() => guess(c)}
            disabled={guessed.has(c) || won || lost}
            className={`h-9 rounded-md border text-sm font-semibold uppercase ${guessed.has(c) ? (word.includes(c) ? "bg-emerald-500/30 border-emerald-500" : "bg-destructive/30 border-destructive opacity-50") : "bg-muted hover:bg-muted/70 border-border"}`}
          >{c}</button>
        ))}
      </div>
      {(won || lost) && (
        <div>
          <p className="font-bold text-lg">{won ? "🎉 You won!" : `💀 The word was: ${word}`}</p>
          <Button onClick={reset} className="mt-2">New word</Button>
        </div>
      )}
    </div>
  );
}

/* =================================================================== */
/* CRASH — gambling                                                    */
/* =================================================================== */
export function Crash() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [balance, setBalance, resetBalance] = useGBalance();
  const [bet, setBet] = useState(5);
  const [autoCashout, setAutoCashout] = useState(2);
  const [phase, setPhase] = useState<"idle"|"flying"|"crashed">("idle");
  const [mult, setMult] = useState(1);
  const [crashAt, setCrashAt] = useState(0);
  const [lastWin, setLastWin] = useState("");
  const stateRef = useRef({ start: 0, crashAt: 0, points: [] as Array<[number,number]>, cashedOut: false });

  function start() {
    if (phase === "flying" || balance < bet || bet <= 0) return;
    setBalance(balance - bet);
    // crash point: ~1% house edge — distribution from Bustabit-style formula
    // P(X >= m) = 0.99 / m  =>  X = 0.99 / U where U uniform(0,1)
    const u = Math.random();
    const c = Math.max(1.0, Math.floor((0.99 / Math.max(0.0001, u)) * 100) / 100);
    stateRef.current.crashAt = c;
    stateRef.current.start = performance.now();
    stateRef.current.points = [];
    stateRef.current.cashedOut = false;
    setCrashAt(c);
    setMult(1);
    setLastWin("");
    setPhase("flying");
  }

  function cashout() {
    if (phase !== "flying" || stateRef.current.cashedOut) return;
    stateRef.current.cashedOut = true;
    const m = mult;
    const win = Math.round(bet * m * 100) / 100;
    setBalance(loadGBalance() + win);
    setLastWin(`✅ Cashed out @ ${m.toFixed(2)}x → +$${win.toFixed(2)}`);
  }

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    const W = 480, H = 240;
    let raf = 0;
    const tick = () => {
      ctx.fillStyle = "#0a0a14"; ctx.fillRect(0, 0, W, H);
      // grid
      ctx.strokeStyle = "rgba(255,255,255,0.05)";
      for (let i = 0; i < 10; i++) {
        ctx.beginPath(); ctx.moveTo(0, i*H/10); ctx.lineTo(W, i*H/10); ctx.stroke();
      }
      const s = stateRef.current;
      if (phase === "flying") {
        const t = (performance.now() - s.start) / 1000;
        const m = Math.pow(Math.E, 0.18 * t);
        if (m >= s.crashAt) {
          setMult(s.crashAt);
          setPhase("crashed");
          if (!s.cashedOut) setLastWin(`💥 Crashed @ ${s.crashAt.toFixed(2)}x — lost $${bet.toFixed(2)}`);
        } else {
          setMult(Math.round(m * 100) / 100);
          // auto cashout
          if (!s.cashedOut && autoCashout > 0 && m >= autoCashout) cashout();
        }
        s.points.push([t, m]);
      }
      // draw curve
      if (s.points.length > 1) {
        const maxT = Math.max(2, s.points[s.points.length-1][0] * 1.1);
        const maxM = Math.max(2, s.points[s.points.length-1][1] * 1.05);
        ctx.strokeStyle = phase === "crashed" ? "#ef4444" : "#22c55e";
        ctx.lineWidth = 3;
        ctx.beginPath();
        s.points.forEach(([t, m], i) => {
          const x = (t / maxT) * W;
          const y = H - ((m - 1) / (maxM - 1)) * H;
          if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        });
        ctx.stroke();
      }
      // mult text
      ctx.fillStyle = phase === "crashed" ? "#ef4444" : "#fff";
      ctx.font = "bold 48px monospace";
      ctx.textAlign = "center";
      ctx.fillText(`${mult.toFixed(2)}x`, W/2, H/2);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, mult, bet, autoCashout]);

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-2xl font-bold">${balance.toFixed(2)} <span className="text-xs text-muted-foreground">(fake)</span></p>
        <Button size="sm" variant="outline" onClick={resetBalance}>Reset to $50</Button>
      </div>
      <canvas ref={canvasRef} width={480} height={240} className="rounded-xl border border-border max-w-full block mx-auto" style={{ width: "100%", maxWidth: 480 }} />
      {lastWin && <p className="text-center text-sm font-medium">{lastWin}</p>}
      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
        <label className="text-sm">Bet $</label>
        <input type="number" min={1} max={Math.max(1, Math.floor(balance))} value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||1))} disabled={phase === "flying"} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
        <label className="text-sm ml-2">Auto cashout</label>
        <input type="number" step={0.1} min={1.01} value={autoCashout} onChange={(e) => setAutoCashout(Number(e.target.value)||0)} disabled={phase === "flying"} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
        <span className="text-xs text-muted-foreground">x (0 = manual)</span>
        {phase !== "flying" ? (
          <Button onClick={start} disabled={balance < bet} className="ml-auto">Place bet</Button>
        ) : (
          <Button onClick={cashout} disabled={stateRef.current.cashedOut} className="ml-auto" variant="default">Cashout @ {mult.toFixed(2)}x</Button>
        )}
      </div>
    </div>
  );
}

/* =================================================================== */
/* ROULETTE — gambling                                                 */
/* =================================================================== */
const ROULETTE_NUMS = [0,32,15,19,4,21,2,25,17,34,6,27,13,36,11,30,8,23,10,5,24,16,33,1,20,14,31,9,22,18,29,7,28,12,35,3,26];
const RED = new Set([1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]);
function colorOf(n: number) { return n === 0 ? "green" : RED.has(n) ? "red" : "black"; }

export function Roulette() {
  const [balance, setBalance, resetBalance] = useGBalance();
  const [bet, setBet] = useState(5);
  const [bets, setBets] = useState<{ red: number; black: number; green: number; even: number; odd: number; low: number; high: number; numbers: Record<number, number> }>(
    { red: 0, black: 0, green: 0, even: 0, odd: 0, low: 0, high: 0, numbers: {} }
  );
  const [spinning, setSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [msg, setMsg] = useState("");

  const total = bets.red + bets.black + bets.green + bets.even + bets.odd + bets.low + bets.high
    + Object.values(bets.numbers).reduce((a,b) => a+b, 0);

  function place(field: keyof typeof bets, num?: number) {
    if (spinning || balance < bet) return;
    setBalance(balance - bet);
    setBets(prev => {
      const n = { ...prev, numbers: { ...prev.numbers } };
      if (field === "numbers" && num !== undefined) n.numbers[num] = (n.numbers[num] || 0) + bet;
      else (n as any)[field] = (n as any)[field] + bet;
      return n;
    });
  }

  function clearBets() {
    if (spinning) return;
    setBalance(balance + total);
    setBets({ red: 0, black: 0, green: 0, even: 0, odd: 0, low: 0, high: 0, numbers: {} });
  }

  function spin() {
    if (spinning || total === 0) return;
    setSpinning(true);
    setMsg("");
    setResult(null);
    const winner = ROULETTE_NUMS[Math.floor(Math.random() * ROULETTE_NUMS.length)];
    let ticks = 0;
    const interval = setInterval(() => {
      setResult(ROULETTE_NUMS[Math.floor(Math.random() * ROULETTE_NUMS.length)]);
      ticks++;
      if (ticks > 25) {
        clearInterval(interval);
        setResult(winner);
        // payouts
        let win = 0;
        const c = colorOf(winner);
        if (c === "red") win += bets.red * 2;
        if (c === "black") win += bets.black * 2;
        if (c === "green") win += bets.green * 14;
        if (winner !== 0 && winner % 2 === 0) win += bets.even * 2;
        if (winner % 2 === 1) win += bets.odd * 2;
        if (winner >= 1 && winner <= 18) win += bets.low * 2;
        if (winner >= 19 && winner <= 36) win += bets.high * 2;
        win += (bets.numbers[winner] || 0) * 36;
        if (win > 0) {
          setBalance(loadGBalance() + win);
          setMsg(`🎉 ${winner} ${c} — won $${win.toFixed(2)}`);
        } else {
          setMsg(`😞 ${winner} ${c} — no win`);
        }
        setBets({ red: 0, black: 0, green: 0, even: 0, odd: 0, low: 0, high: 0, numbers: {} });
        setSpinning(false);
      }
    }, 80);
  }

  return (
    <div className="space-y-3">
      <div className="flex justify-between items-center flex-wrap gap-2">
        <p className="text-2xl font-bold">${balance.toFixed(2)} <span className="text-xs text-muted-foreground">(fake)</span></p>
        <Button size="sm" variant="outline" onClick={resetBalance}>Reset to $50</Button>
      </div>

      {/* Wheel display */}
      <div className="text-center p-6 rounded-2xl border-4" style={{ borderColor: result !== null ? (colorOf(result) === "red" ? "#ef4444" : colorOf(result) === "black" ? "#222" : "#22c55e") : "transparent", background: "var(--muted)" }}>
        <p className="text-6xl font-bold font-mono">{result === null ? "—" : result}</p>
        <p className="text-sm mt-1 capitalize">{result !== null ? colorOf(result) : "place your bets"}</p>
      </div>
      {msg && <p className="text-center font-semibold">{msg}</p>}

      {/* Number grid */}
      <div className="grid grid-cols-12 gap-1 text-xs">
        <button
          onClick={() => place("numbers", 0)}
          disabled={spinning || balance < bet}
          className="col-span-12 h-8 rounded bg-emerald-600 text-white font-bold relative"
        >
          0 {(bets.numbers[0] || 0) > 0 && <span className="absolute top-0 right-1 text-[9px]">${bets.numbers[0]}</span>}
        </button>
        {Array.from({length: 36}, (_, i) => i + 1).map(n => (
          <button
            key={n}
            onClick={() => place("numbers", n)}
            disabled={spinning || balance < bet}
            className={`h-8 rounded text-white font-bold relative ${RED.has(n) ? "bg-red-600" : "bg-zinc-800"}`}
          >
            {n}
            {(bets.numbers[n] || 0) > 0 && <span className="absolute top-0 right-0 text-[9px] bg-yellow-400 text-black rounded-bl px-0.5">${bets.numbers[n]}</span>}
          </button>
        ))}
      </div>

      {/* Outside bets */}
      <div className="grid grid-cols-7 gap-1 text-xs">
        {([
          ["red","Red 2x","bg-red-600 text-white"],
          ["black","Black 2x","bg-zinc-800 text-white"],
          ["green","Green 14x","bg-emerald-600 text-white"],
          ["even","Even 2x","bg-muted"],
          ["odd","Odd 2x","bg-muted"],
          ["low","1-18 2x","bg-muted"],
          ["high","19-36 2x","bg-muted"],
        ] as const).map(([k, label, cls]) => (
          <button
            key={k}
            onClick={() => place(k)}
            disabled={spinning || balance < bet}
            className={`h-10 rounded font-bold ${cls} relative`}
          >
            {label}
            {((bets as any)[k] || 0) > 0 && <span className="absolute top-0 right-0 text-[9px] bg-yellow-400 text-black rounded-bl px-1">${(bets as any)[k]}</span>}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2 p-3 rounded-xl border border-border bg-muted/30">
        <label className="text-sm">Chip $</label>
        <input type="number" min={1} value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||1))} disabled={spinning} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
        <span className="text-xs text-muted-foreground">Total bet: ${total}</span>
        <Button onClick={clearBets} disabled={spinning || total === 0} variant="outline" size="sm">Clear</Button>
        <Button onClick={spin} disabled={spinning || total === 0} className="ml-auto">{spinning ? "Spinning…" : "Spin"}</Button>
      </div>
    </div>
  );
}

/* =================================================================== */
/* SNAKE with customizable speed                                       */
/* =================================================================== */
export function SnakeFast() {
  const [speed, setSpeed] = useState(120);
  const [grid, setGrid] = useState(15);
  const [snake, setSnake] = useState<Array<[number, number]>>([[7,7]]);
  const [food, setFood] = useState<[number, number]>([3, 3]);
  const [dir, setDir] = useState<[number, number]>([1, 0]);
  const [over, setOver] = useState(false);
  const [score, setScore] = useState(0);
  const dirRef = useRef(dir); dirRef.current = dir;
  const snakeRef = useRef(snake); snakeRef.current = snake;
  const foodRef = useRef(food); foodRef.current = food;

  function reset() {
    setSnake([[Math.floor(grid/2), Math.floor(grid/2)]]);
    setFood([Math.floor(Math.random()*grid), Math.floor(Math.random()*grid)]);
    setDir([1, 0]); setOver(false); setScore(0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, [number, number]> = {
        ArrowUp: [0,-1], ArrowDown: [0,1], ArrowLeft: [-1,0], ArrowRight: [1,0],
        w: [0,-1], s: [0,1], a: [-1,0], d: [1,0],
      };
      const nd = map[e.key];
      if (nd) {
        const [dx, dy] = dirRef.current;
        if (nd[0] === -dx && nd[1] === -dy) return; // no reverse
        setDir(nd);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (over) return;
    const t = setInterval(() => {
      const sn = snakeRef.current;
      const [hx, hy] = sn[0];
      const [dx, dy] = dirRef.current;
      const nx = hx + dx, ny = hy + dy;
      if (nx < 0 || ny < 0 || nx >= grid || ny >= grid || sn.some(([x,y]) => x===nx && y===ny)) {
        setOver(true); return;
      }
      const ate = nx === foodRef.current[0] && ny === foodRef.current[1];
      const ns: Array<[number, number]> = [[nx, ny], ...sn];
      if (!ate) ns.pop();
      else {
        setScore(s => s + 1);
        let nf: [number, number];
        do { nf = [Math.floor(Math.random()*grid), Math.floor(Math.random()*grid)]; }
        while (ns.some(([x,y]) => x===nf[0] && y===nf[1]));
        setFood(nf);
      }
      setSnake(ns);
    }, speed);
    return () => clearInterval(t);
  }, [over, speed, grid]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3 justify-between">
        <p className="font-bold">Score: {score}</p>
        <div className="flex items-center gap-2 text-xs">
          <label>Speed (ms/tick)</label>
          <input type="range" min={40} max={300} value={speed} onChange={(e) => setSpeed(Number(e.target.value))} />
          <span>{speed}</span>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <label>Grid</label>
          <select value={grid} onChange={(e) => { setGrid(Number(e.target.value)); reset(); }} className="h-7 px-2 rounded border border-border bg-background">
            {[10,15,20,25,30].map(n => <option key={n} value={n}>{n}×{n}</option>)}
          </select>
        </div>
        <Button size="sm" onClick={reset}>{over ? "Restart" : "New"}</Button>
      </div>
      <div className="grid mx-auto bg-black p-1 rounded-lg" style={{ gridTemplateColumns: `repeat(${grid}, 1fr)`, width: "min(360px, 90vw)" }}>
        {Array.from({length: grid*grid}, (_, i) => {
          const x = i % grid, y = Math.floor(i / grid);
          const isHead = snake[0]?.[0] === x && snake[0]?.[1] === y;
          const isBody = !isHead && snake.some(([sx,sy]) => sx===x && sy===y);
          const isFood = food[0] === x && food[1] === y;
          return <div key={i} className="aspect-square" style={{ background: isHead ? "#22c55e" : isBody ? "#15803d" : isFood ? "#ef4444" : "#0a0a0a" }} />;
        })}
      </div>
      {over && <p className="text-center font-semibold">Game over · Score {score}</p>}
      <p className="text-xs text-muted-foreground text-center">WASD or arrows · adjust speed live</p>
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
/* =================================================================== */
/* JACKPOT 777 — slot machine                                         */
/* =================================================================== */
export function Jackpot777() {
  const [balance, setBalance, resetBalance] = useGBalance();
  const [bet, setBet] = useState(5);
  const [reels, setReels] = useState<string[]>(["7","7","7"]);
  const [spinning, setSpinning] = useState(false);
  const [msg, setMsg] = useState("");
  const SYMBOLS = ["🍒","🍋","🍊","🔔","⭐","💎","7️⃣"];

  function spin() {
    if (spinning || balance < bet || bet <= 0) return;
    setSpinning(true);
    setMsg("");
    setBalance(balance - bet);
    let ticks = 0;
    const iv = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
      ]);
      ticks++;
      if (ticks > 18) {
        clearInterval(iv);
        // final result with slight house edge
        const r = Math.random();
        let final: string[];
        let mult = 0;
        if (r < 0.005) { final = ["7️⃣","7️⃣","7️⃣"]; mult = 50; }       // jackpot
        else if (r < 0.02) { final = ["💎","💎","💎"]; mult = 20; }
        else if (r < 0.05) { final = ["⭐","⭐","⭐"]; mult = 10; }
        else if (r < 0.10) { final = ["🔔","🔔","🔔"]; mult = 5; }
        else if (r < 0.20) {
          const s = SYMBOLS[Math.floor(Math.random()*4)];
          final = [s,s,s]; mult = 3;
        } else if (r < 0.40) {
          const s = SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
          const o = SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)];
          final = [s,s,o]; mult = 1.5;
        } else {
          final = [
            SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
            SYMBOLS[Math.floor(Math.random()*SYMBOLS.length)],
          ];
          // ensure not all same accidentally
          if (final[0]===final[1] && final[1]===final[2]) final[2] = SYMBOLS[(SYMBOLS.indexOf(final[2])+1)%SYMBOLS.length];
          mult = 0;
        }
        setReels(final);
        if (mult > 0) {
          const win = Math.round(bet * mult * 100) / 100;
          setBalance(loadGBalance() + win);
          setMsg(mult === 50 ? `🎉 JACKPOT! ${mult}x · +$${win.toFixed(2)}` : `${mult}x · +$${win.toFixed(2)}`);
        } else {
          setMsg("No win.");
        }
        setSpinning(false);
      }
    }, 70);
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-2xl font-bold">${balance.toFixed(2)} <span className="text-xs text-muted-foreground">(fake)</span></p>
          {msg && <p className="text-sm">{msg}</p>}
        </div>
        <Button size="sm" variant="outline" onClick={resetBalance}>Reset $50</Button>
      </div>
      <div className="bg-gradient-to-br from-amber-500 to-red-600 rounded-2xl p-6 text-center">
        <div className="bg-black/40 rounded-xl p-4 inline-flex gap-3">
          {reels.map((s, i) => (
            <div key={i} className="w-20 h-20 bg-white rounded-lg flex items-center justify-center text-5xl shadow-inner">
              {s}
            </div>
          ))}
        </div>
        <p className="text-white/90 text-xs mt-2 font-mono">7️⃣7️⃣7️⃣ = 50x · 💎=20x · ⭐=10x · 🔔=5x</p>
      </div>
      <div className="flex items-center gap-2">
        <label className="text-sm">Bet $</label>
        <input type="number" min={1} max={Math.max(1, Math.floor(balance))} value={bet} onChange={(e) => setBet(Math.max(1, Number(e.target.value)||1))} className="w-20 h-8 px-2 rounded-md border border-border bg-background text-sm" />
        <Button onClick={spin} disabled={spinning || balance < bet || bet <= 0} className="ml-auto">
          {spinning ? "Spinning…" : "🎰 SPIN"}
        </Button>
      </div>
    </div>
  );
}

/* =================================================================== */
/* PING PONG — perspective table tennis vs AI                          */
/* =================================================================== */
export function PingPong() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState({ p: 0, ai: 0 });
  const W = 520, H = 360;
  const stateRef = useRef({
    // ball in 3D-ish coords: x (-1..1 across table), z (0..1 from AI to player), y height
    bx: 0, bz: 0.5, by: 0.4,
    vx: 0.012, vz: 0.022, vy: 0,
    px: 0, ax: 0, // paddle x positions
    targetX: 0,
    serving: true, serveTimer: 60,
  });

  useEffect(() => {
    const c = canvasRef.current!; const ctx = c.getContext("2d")!;
    let raf = 0;
    const onMove = (e: MouseEvent | TouchEvent) => {
      const rect = c.getBoundingClientRect();
      const cx = ("touches" in e ? e.touches[0].clientX : e.clientX) - rect.left;
      stateRef.current.targetX = (cx / rect.width) * 2 - 1;
    };
    c.addEventListener("mousemove", onMove);
    c.addEventListener("touchmove", onMove, { passive: true });

    function reset(toPlayer: boolean) {
      const s = stateRef.current;
      s.bx = 0; s.bz = toPlayer ? 0.5 : 0.5; s.by = 0.4;
      s.vx = (Math.random() - 0.5) * 0.01;
      s.vz = toPlayer ? 0.022 : -0.022;
      s.vy = 0.02;
      s.serving = true; s.serveTimer = 50;
    }

    // project (x in [-1,1], z in [0,1], y height) -> screen
    function project(x: number, z: number, y: number) {
      // perspective: near (z=1) wider, far (z=0) narrower
      const persp = 0.35 + z * 0.65;
      const sx = W/2 + x * (W * 0.42) * persp;
      const sy = H * 0.85 - z * (H * 0.65) - y * 80 * persp;
      return { sx, sy, persp };
    }

    const tick = () => {
      const s = stateRef.current;
      // paddle smoothing
      s.px += (s.targetX - s.px) * 0.25;
      // AI follows ball with limit
      const aiTarget = Math.max(-0.9, Math.min(0.9, s.bx + (Math.random()-0.5)*0.1));
      s.ax += Math.max(-0.025, Math.min(0.025, aiTarget - s.ax));

      if (s.serving) {
        s.serveTimer--;
        if (s.serveTimer <= 0) s.serving = false;
      } else {
        s.bx += s.vx; s.bz += s.vz; s.by += s.vy;
        s.vy -= 0.0018; // gravity
        // bounce off table
        if (s.by < 0 && s.bz > 0.02 && s.bz < 0.98) { s.by = 0; s.vy = Math.abs(s.vy) * 0.85; }
        // walls
        if (s.bx < -1) { s.bx = -1; s.vx = Math.abs(s.vx); }
        if (s.bx > 1) { s.bx = 1; s.vx = -Math.abs(s.vx); }

        // player paddle hit (z near 1)
        if (s.bz >= 0.95 && s.vz > 0) {
          if (Math.abs(s.bx - s.px) < 0.25 && s.by < 0.5) {
            s.vz = -Math.abs(s.vz) * 1.05;
            s.vx += (s.bx - s.px) * 0.04;
            s.vy = 0.025;
          } else if (s.bz > 1.05) {
            setScore(sc => ({ ...sc, ai: sc.ai + 1 }));
            reset(false);
          }
        }
        // AI paddle hit (z near 0)
        if (s.bz <= 0.05 && s.vz < 0) {
          if (Math.abs(s.bx - s.ax) < 0.25 && s.by < 0.5) {
            s.vz = Math.abs(s.vz) * 1.05;
            s.vx += (s.bx - s.ax) * 0.04;
            s.vy = 0.025;
          } else if (s.bz < -0.05) {
            setScore(sc => ({ ...sc, p: sc.p + 1 }));
            reset(true);
          }
        }
        // ball off table sideways or far
        if (s.by < -0.2) { setScore(sc => s.vz > 0 ? { ...sc, ai: sc.ai + 1 } : { ...sc, p: sc.p + 1 }); reset(s.vz < 0); }
      }

      // draw
      // sky/wall gradient
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "#1a3a5a"); grd.addColorStop(1, "#0a1a2a");
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);

      // table (trapezoid)
      const tl = project(-1, 0, 0), tr = project(1, 0, 0);
      const bl = project(-1, 1, 0), br = project(1, 1, 0);
      ctx.fillStyle = "#1f6f3a";
      ctx.beginPath(); ctx.moveTo(tl.sx, tl.sy); ctx.lineTo(tr.sx, tr.sy); ctx.lineTo(br.sx, br.sy); ctx.lineTo(bl.sx, bl.sy); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = "white"; ctx.lineWidth = 2;
      ctx.stroke();
      // center net
      const nl = project(-1, 0.5, 0), nr = project(1, 0.5, 0);
      const nlt = project(-1, 0.5, 0.15), nrt = project(1, 0.5, 0.15);
      ctx.fillStyle = "rgba(255,255,255,0.6)";
      ctx.beginPath(); ctx.moveTo(nl.sx, nl.sy); ctx.lineTo(nr.sx, nr.sy); ctx.lineTo(nrt.sx, nrt.sy); ctx.lineTo(nlt.sx, nlt.sy); ctx.closePath(); ctx.fill();
      // center line
      ctx.strokeStyle = "white"; ctx.lineWidth = 1;
      ctx.beginPath();
      const cf = project(0, 0, 0), cn = project(0, 1, 0);
      ctx.moveTo(cf.sx, cf.sy); ctx.lineTo(cn.sx, cn.sy); ctx.stroke();

      // ball shadow
      const sh = project(s.bx, s.bz, 0);
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.beginPath(); ctx.ellipse(sh.sx, sh.sy, 8 * sh.persp, 3 * sh.persp, 0, 0, Math.PI*2); ctx.fill();

      // ball
      const b = project(s.bx, s.bz, s.by);
      ctx.fillStyle = "#fff";
      ctx.beginPath(); ctx.arc(b.sx, b.sy, 8 * b.persp, 0, Math.PI*2); ctx.fill();

      // AI paddle (far)
      const ap = project(s.ax, 0, 0.1);
      ctx.fillStyle = "#c0392b";
      ctx.fillRect(ap.sx - 22 * ap.persp, ap.sy - 30 * ap.persp, 44 * ap.persp, 8 * ap.persp);
      ctx.fillStyle = "#7f1d0a";
      ctx.fillRect(ap.sx - 3 * ap.persp, ap.sy - 22 * ap.persp, 6 * ap.persp, 18 * ap.persp);

      // player paddle (near)
      const pp = project(s.px, 1, 0.1);
      ctx.fillStyle = "#1e88e5";
      ctx.fillRect(pp.sx - 30 * pp.persp, pp.sy - 40 * pp.persp, 60 * pp.persp, 12 * pp.persp);
      ctx.fillStyle = "#0d3a66";
      ctx.fillRect(pp.sx - 4 * pp.persp, pp.sy - 30 * pp.persp, 8 * pp.persp, 24 * pp.persp);

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
      <p className="font-mono text-2xl">You {score.p} : {score.ai} AI</p>
      <canvas ref={canvasRef} width={W} height={H} className="rounded-xl border border-border max-w-full touch-none" style={{ width: "100%", maxWidth: W }} />
      <p className="text-xs text-muted-foreground">Move mouse left/right to swing your paddle. 3D table tennis vs AI.</p>
    </div>
  );
}

// ===== Basket Random =====
// Two ragdoll-ish stick figures, one key each. Press jump to flail upward; gravity does the rest.
// First to 5 wins. Mode: 2P (W vs ↑) or vs AI.
type BRMode = "2p" | "ai";
type BRPlayer = {
  x: number; y: number;            // hip position
  vx: number; vy: number;
  onGround: boolean;
  facing: 1 | -1;
  // Limb angles (radians from hip-down)
  legAngle: number;                // swings while in air
  armAngle: number;
  jumpCharge: number;              // increases while key held mid-air
  color: string;
  side: "L" | "R";
};
type BRBall = { x: number; y: number; vx: number; vy: number; r: number; spin: number };

export function BasketRandom() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [mode, setMode] = useState<BRMode | null>(null);
  const [score, setScore] = useState({ l: 0, r: 0 });
  const [winner, setWinner] = useState<string | null>(null);
  const [aiDiff, setAiDiff] = useState<"easy" | "normal" | "hard">("normal");
  const scoreRef = useRef(score);
  scoreRef.current = score;

  useEffect(() => {
    if (!mode) return;
    const cv = canvasRef.current!;
    const ctx = cv.getContext("2d")!;
    const W = cv.width, H = cv.height;
    const GROUND = H - 40;
    const GRAV = 0.55;

    // Court constants
    const HOOP_H = GROUND - 130;       // rim height
    const RIM_X_L = 60;                // left rim x (inner edge)
    const RIM_X_R = W - 60;            // right rim x (inner edge)
    const RIM_W = 46;                  // rim diameter
    const POST_X_L = 18;
    const POST_X_R = W - 18;

    function makePlayer(side: "L" | "R"): BRPlayer {
      return {
        x: side === "L" ? 200 : W - 200,
        y: GROUND,
        vx: 0, vy: 0, onGround: true,
        facing: side === "L" ? 1 : -1,
        legAngle: 0, armAngle: 0, jumpCharge: 0,
        color: side === "L" ? "#e11d48" : "#2563eb",
        side,
      };
    }
    function makeBall(servingSide: "L" | "R"): BRBall {
      return {
        x: servingSide === "L" ? 220 : W - 220,
        y: 100,
        vx: 0, vy: 0, r: 16, spin: 0,
      };
    }

    let pL = makePlayer("L");
    let pR = makePlayer("R");
    let ball = makeBall(Math.random() < 0.5 ? "L" : "R");
    let lKey = false, rKey = false;
    let lastScore = 0;
    let resetCool = 0;

    const onDown = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") lKey = true;
      if (e.key === "ArrowUp" && mode === "2p") rKey = true;
      if (e.key === " ") e.preventDefault();
    };
    const onUp = (e: KeyboardEvent) => {
      if (e.key === "w" || e.key === "W") lKey = false;
      if (e.key === "ArrowUp" && mode === "2p") rKey = false;
    };
    window.addEventListener("keydown", onDown);
    window.addEventListener("keyup", onUp);

    // Touch buttons
    const touch = { l: false, r: false };
    (window as any).__br_touch = touch;

    function applyJumpKey(p: BRPlayer, pressed: boolean) {
      // On ground: small forward hop + jump impulse, walks toward ball.
      if (pressed && p.onGround) {
        p.vy = -11;
        // Walk toward ball
        const dir = ball.x > p.x ? 1 : -1;
        p.facing = dir as 1 | -1;
        p.vx += dir * 3.2;
        p.onGround = false;
        p.jumpCharge = 0;
      } else if (pressed && !p.onGround) {
        // Mid-air flail: kick legs upward (toward ball) for big hit
        p.jumpCharge = Math.min(1, p.jumpCharge + 0.06);
        const dir = ball.x > p.x ? 1 : -1;
        p.facing = dir as 1 | -1;
        p.vx += dir * 0.25;
        p.vy -= 0.18; // tiny lift while flailing
      }
      // Animate limbs
      const target = pressed ? 1.6 : 0.0;
      p.legAngle += (target * (p.facing) - p.legAngle) * 0.25;
      p.armAngle += ((pressed ? -1.4 : 0) - p.armAngle) * 0.2;
    }

    function updatePlayer(p: BRPlayer) {
      p.vy += GRAV;
      p.x += p.vx;
      p.y += p.vy;
      p.vx *= 0.86;
      // Bound to court
      if (p.x < 40) { p.x = 40; p.vx = Math.abs(p.vx) * 0.4; }
      if (p.x > W - 40) { p.x = W - 40; p.vx = -Math.abs(p.vx) * 0.4; }
      if (p.y >= GROUND) {
        p.y = GROUND; p.vy = 0; p.onGround = true; p.jumpCharge = 0;
      }
    }

    // Returns which leg endpoint to use for ball collisions
    function legEnd(p: BRPlayer): { x: number; y: number; vx: number; vy: number } {
      const len = 46;
      const ang = -Math.PI / 2 + p.legAngle * p.facing; // up-ish when flailing
      const ex = p.x + Math.cos(ang) * len * (p.facing > 0 ? 1 : -1) * 0.6;
      const ey = p.y - 30 + Math.sin(ang) * len;
      // velocity contribution
      return { x: ex, y: ey, vx: p.vx + p.facing * (p.jumpCharge * 6), vy: p.vy - p.jumpCharge * 6 };
    }
    function headPos(p: BRPlayer) {
      return { x: p.x, y: p.y - 78, r: 14 };
    }
    function bodyPos(p: BRPlayer) {
      return { x: p.x, y: p.y - 50, r: 18 };
    }

    function ballVsCircle(c: { x: number; y: number; r: number }, vx = 0, vy = 0) {
      const dx = ball.x - c.x, dy = ball.y - c.y;
      const d2 = dx * dx + dy * dy;
      const r = ball.r + c.r;
      if (d2 < r * r && d2 > 0.0001) {
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        // Push out
        ball.x = c.x + nx * r;
        ball.y = c.y + ny * r;
        // Reflect with body velocity contribution
        const rvx = ball.vx - vx, rvy = ball.vy - vy;
        const dot = rvx * nx + rvy * ny;
        if (dot < 0) {
          const restitution = 1.15;
          ball.vx = ball.vx - (1 + restitution) * dot * nx;
          ball.vy = ball.vy - (1 + restitution) * dot * ny;
        }
        return true;
      }
      return false;
    }

    function updateBall() {
      ball.vy += GRAV * 0.85;
      ball.vx *= 0.995;
      ball.x += ball.vx;
      ball.y += ball.vy;
      ball.spin += ball.vx * 0.05;
      // Walls
      if (ball.x < ball.r) { ball.x = ball.r; ball.vx = Math.abs(ball.vx) * 0.7; }
      if (ball.x > W - ball.r) { ball.x = W - ball.r; ball.vx = -Math.abs(ball.vx) * 0.7; }
      // Ceiling
      if (ball.y < ball.r + 10) { ball.y = ball.r + 10; ball.vy = Math.abs(ball.vy) * 0.7; }
      // Ground
      if (ball.y > GROUND - ball.r) {
        ball.y = GROUND - ball.r;
        ball.vy = -Math.abs(ball.vy) * 0.6;
        ball.vx *= 0.85;
      }
      // Hoop posts (vertical stand)
      ballVsCircle({ x: POST_X_L, y: HOOP_H + 2, r: 6 });
      ballVsCircle({ x: POST_X_R, y: HOOP_H + 2, r: 6 });
      // Rim endpoints (treat as 2 small circles each side)
      // Left hoop: rim spans from POST_X_L+12 .. POST_X_L+12+RIM_W
      const L_left = { x: POST_X_L + 8, y: HOOP_H, r: 5 };
      const L_right = { x: POST_X_L + 8 + RIM_W, y: HOOP_H, r: 5 };
      const R_right = { x: POST_X_R - 8, y: HOOP_H, r: 5 };
      const R_left = { x: POST_X_R - 8 - RIM_W, y: HOOP_H, r: 5 };
      ballVsCircle(L_left); ballVsCircle(L_right);
      ballVsCircle(R_left); ballVsCircle(R_right);

      // Score detection: ball passing downward through rim line
      const passingDown = ball.vy > 0;
      if (passingDown && resetCool === 0) {
        // Left hoop scored => Right player scores
        if (
          ball.y - ball.r > HOOP_H - 4 &&
          ball.y - ball.r < HOOP_H + 8 &&
          ball.x > L_left.x + 4 && ball.x < L_right.x - 4
        ) {
          scoreRight();
        } else if (
          ball.y - ball.r > HOOP_H - 4 &&
          ball.y - ball.r < HOOP_H + 8 &&
          ball.x > R_left.x + 4 && ball.x < R_right.x - 4
        ) {
          scoreLeft();
        }
      }
    }

    function scoreLeft() {
      const s = { ...scoreRef.current, l: scoreRef.current.l + 1 };
      setScore(s);
      lastScore = performance.now();
      resetCool = 60;
      setTimeout(() => {
        ball = makeBall("R");
        pL = makePlayer("L"); pR = makePlayer("R");
        if (s.l >= 5) setWinner("Left wins!");
      }, 700);
    }
    function scoreRight() {
      const s = { ...scoreRef.current, r: scoreRef.current.r + 1 };
      setScore(s);
      lastScore = performance.now();
      resetCool = 60;
      setTimeout(() => {
        ball = makeBall("L");
        pL = makePlayer("L"); pR = makePlayer("R");
        if (s.r >= 5) setWinner("Right wins!");
      }, 700);
    }

    function aiDecide(): boolean {
      // Predict ball trajectory; jump when close & ball above
      const dx = ball.x - pR.x;
      const reactDist = aiDiff === "easy" ? 90 : aiDiff === "hard" ? 220 : 150;
      const noise = aiDiff === "easy" ? 0.55 : aiDiff === "hard" ? 0.05 : 0.2;
      // Approach the ball if it's on right half, else defend hoop
      if (ball.x > W * 0.45) {
        if (Math.abs(dx) < reactDist && ball.y < pR.y - 30 && pR.onGround) return Math.random() > noise;
        if (!pR.onGround && ball.y < pR.y && Math.abs(dx) < 80) return Math.random() > noise * 0.5;
      } else {
        // Walk back toward right hoop area by tapping toward it (only jump if ball nearby)
        if (Math.abs(dx) < 60 && pR.onGround) return Math.random() > noise;
      }
      return false;
    }

    let raf = 0;
    function loop() {
      // input
      const lp = lKey || (touch as any).l;
      let rp = rKey || (touch as any).r;
      if (mode === "ai") rp = aiDecide();
      applyJumpKey(pL, lp);
      applyJumpKey(pR, rp);

      updatePlayer(pL);
      updatePlayer(pR);
      updateBall();

      // collisions w/ player parts
      const lLeg = legEnd(pL);
      const rLeg = legEnd(pR);
      ballVsCircle({ x: lLeg.x, y: lLeg.y, r: 14 }, lLeg.vx, lLeg.vy);
      ballVsCircle({ x: rLeg.x, y: rLeg.y, r: 14 }, rLeg.vx, rLeg.vy);
      const lH = headPos(pL), rH = headPos(pR);
      ballVsCircle(lH, pL.vx, pL.vy);
      ballVsCircle(rH, pR.vx, pR.vy);
      ballVsCircle(bodyPos(pL), pL.vx, pL.vy);
      ballVsCircle(bodyPos(pR), pR.vx, pR.vy);

      if (resetCool > 0) resetCool--;

      // Render
      // sky
      const grd = ctx.createLinearGradient(0, 0, 0, H);
      grd.addColorStop(0, "#fde68a"); grd.addColorStop(1, "#fcd34d");
      ctx.fillStyle = grd; ctx.fillRect(0, 0, W, H);
      // crowd silhouette
      ctx.fillStyle = "#7c2d12";
      for (let i = 0; i < 40; i++) {
        const x = i * (W / 40);
        ctx.beginPath(); ctx.arc(x, GROUND - 8, 12, 0, Math.PI * 2); ctx.fill();
      }
      // ground
      ctx.fillStyle = "#92400e"; ctx.fillRect(0, GROUND, W, H - GROUND);
      ctx.fillStyle = "#fff"; ctx.fillRect(0, GROUND, W, 3);
      // hoops
      drawHoop(ctx, POST_X_L, GROUND, HOOP_H, "L", RIM_W);
      drawHoop(ctx, POST_X_R, GROUND, HOOP_H, "R", RIM_W);

      // ball
      ctx.save();
      ctx.translate(ball.x, ball.y);
      ctx.rotate(ball.spin * 0.05);
      ctx.fillStyle = "#ea580c";
      ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = "#1c1917"; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, ball.r, 0, Math.PI * 2); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(-ball.r, 0); ctx.lineTo(ball.r, 0); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, -ball.r); ctx.lineTo(0, ball.r); ctx.stroke();
      ctx.restore();

      drawPlayer(ctx, pL, lLeg);
      drawPlayer(ctx, pR, rLeg);

      // score banner
      ctx.fillStyle = "rgba(0,0,0,.7)";
      ctx.fillRect(W / 2 - 70, 10, 140, 38);
      ctx.fillStyle = "#fff"; ctx.font = "bold 26px system-ui";
      ctx.textAlign = "center";
      ctx.fillText(`${scoreRef.current.l}  :  ${scoreRef.current.r}`, W / 2, 38);
      ctx.font = "12px system-ui"; ctx.fillStyle = "#fbbf24";
      ctx.fillText("First to 5", W / 2, 56);

      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onDown);
      window.removeEventListener("keyup", onUp);
    };
  }, [mode, aiDiff]);

  function drawHoop(
    ctx: CanvasRenderingContext2D, postX: number, ground: number, hoopH: number, side: "L" | "R", rimW: number,
  ) {
    // Backboard pole
    ctx.fillStyle = "#374151";
    ctx.fillRect(postX - 5, hoopH - 60, 10, ground - (hoopH - 60));
    // Backboard
    const bbX = side === "L" ? postX - 4 : postX - 4;
    ctx.fillStyle = "#f3f4f6"; ctx.fillRect(bbX, hoopH - 60, 8, 70);
    ctx.strokeStyle = "#111"; ctx.strokeRect(bbX, hoopH - 60, 8, 70);
    // Square on backboard
    ctx.strokeStyle = "#dc2626"; ctx.lineWidth = 2;
    ctx.strokeRect(bbX + (side === "L" ? 8 : -28) + (side === "L" ? 0 : 30), hoopH - 30, 20, 14);
    ctx.lineWidth = 1;
    // Rim
    const rimX = side === "L" ? postX + 8 : postX - 8 - rimW;
    ctx.strokeStyle = "#ef4444"; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(rimX, hoopH); ctx.lineTo(rimX + rimW, hoopH); ctx.stroke();
    ctx.lineWidth = 1;
    // Net
    ctx.strokeStyle = "#fff";
    for (let i = 0; i <= 6; i++) {
      const t = i / 6;
      const x = rimX + t * rimW;
      ctx.beginPath(); ctx.moveTo(x, hoopH);
      ctx.lineTo(rimX + rimW * (0.2 + t * 0.6), hoopH + 26);
      ctx.stroke();
    }
    ctx.beginPath(); ctx.moveTo(rimX + 4, hoopH + 26); ctx.lineTo(rimX + rimW - 4, hoopH + 26); ctx.stroke();
  }

  function drawPlayer(ctx: CanvasRenderingContext2D, p: BRPlayer, leg: { x: number; y: number }) {
    // Body
    ctx.strokeStyle = "#111"; ctx.lineWidth = 5; ctx.lineCap = "round";
    // Hip to head
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 30);
    ctx.lineTo(p.x, p.y - 70);
    ctx.stroke();
    // Head
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y - 84, 14, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = "#111"; ctx.beginPath(); ctx.arc(p.x, p.y - 84, 14, 0, Math.PI * 2); ctx.stroke();
    // Eyes
    ctx.fillStyle = "#fff";
    const eyeOff = p.facing * 4;
    ctx.beginPath(); ctx.arc(p.x + eyeOff, p.y - 86, 3, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = "#000";
    ctx.beginPath(); ctx.arc(p.x + eyeOff + p.facing, p.y - 86, 1.4, 0, Math.PI * 2); ctx.fill();
    // Body torso (jersey)
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - 50, 16, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#111"; ctx.stroke();
    // Number
    ctx.fillStyle = "#fff"; ctx.font = "bold 16px system-ui"; ctx.textAlign = "center";
    ctx.fillText(p.side === "L" ? "1" : "2", p.x, p.y - 44);
    // Arms
    ctx.strokeStyle = "#fde68a"; ctx.lineWidth = 5;
    const armLen = 26;
    const aA = -Math.PI / 2 + p.armAngle * p.facing;
    const aHand = { x: p.x + Math.cos(aA) * armLen * p.facing, y: p.y - 50 + Math.sin(aA) * armLen };
    ctx.beginPath(); ctx.moveTo(p.x, p.y - 55); ctx.lineTo(aHand.x, aHand.y); ctx.stroke();
    // Legs
    ctx.strokeStyle = "#1f2937"; ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 30);
    ctx.lineTo(leg.x, leg.y);
    ctx.stroke();
    // Other (planted) leg
    ctx.beginPath();
    ctx.moveTo(p.x, p.y - 30);
    ctx.lineTo(p.x - p.facing * 8, p.y);
    ctx.stroke();
    // Shoes
    ctx.fillStyle = "#fff";
    ctx.beginPath(); ctx.arc(leg.x, leg.y, 5, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(p.x - p.facing * 8, p.y, 5, 0, Math.PI * 2); ctx.fill();
  }

  if (winner) {
    return (
      <div className="text-center space-y-4 p-6">
        <div className="text-4xl font-black">{winner}</div>
        <div className="text-muted-foreground">Final score {score.l} – {score.r}</div>
        <Button onClick={() => { setScore({ l: 0, r: 0 }); setWinner(null); setMode(null); }}>Play again</Button>
      </div>
    );
  }

  if (!mode) {
    return (
      <div className="space-y-4 p-2">
        <div className="text-center">
          <h3 className="text-2xl font-bold">🏀 Basket Random</h3>
          <p className="text-muted-foreground text-sm">Press one key to flail your stick figure. Whoever scores 5 wins.</p>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setMode("2p")}
            className="p-6 rounded-2xl border border-border hover:border-primary text-left"
          >
            <div className="text-3xl mb-1">👥</div>
            <div className="font-bold">2 Players</div>
            <div className="text-xs text-muted-foreground">Left: <kbd>W</kbd> · Right: <kbd>↑</kbd></div>
          </button>
          <button
            onClick={() => setMode("ai")}
            className="p-6 rounded-2xl border border-border hover:border-primary text-left"
          >
            <div className="text-3xl mb-1">🤖</div>
            <div className="font-bold">vs AI</div>
            <div className="text-xs text-muted-foreground">You play left with <kbd>W</kbd></div>
          </button>
        </div>
        {mode === null && (
          <div className="flex items-center justify-center gap-2 text-xs">
            <span className="text-muted-foreground">AI difficulty:</span>
            {(["easy", "normal", "hard"] as const).map((d) => (
              <button
                key={d}
                onClick={() => setAiDiff(d)}
                className={`px-3 py-1 rounded-full border ${aiDiff === d ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}
              >{d}</button>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-sm">
        <div>
          <span className="font-bold text-rose-600">P1 (W)</span>
          {mode === "2p" ? <span className="ml-3 font-bold text-blue-600">P2 (↑)</span> : <span className="ml-3 font-bold text-blue-600">AI ({aiDiff})</span>}
        </div>
        <Button variant="outline" size="sm" onClick={() => { setScore({ l: 0, r: 0 }); setMode(null); }}>Quit</Button>
      </div>
      <canvas ref={canvasRef} width={760} height={420} className="w-full max-w-full bg-amber-200 rounded-2xl border border-border touch-none" />
      <div className="flex justify-between gap-3">
        <button
          onPointerDown={() => { ((window as any).__br_touch || {}).l = true; }}
          onPointerUp={() => { ((window as any).__br_touch || {}).l = false; }}
          onPointerLeave={() => { ((window as any).__br_touch || {}).l = false; }}
          className="flex-1 py-4 rounded-2xl bg-rose-600 text-white font-bold active:scale-95 select-none"
        >P1 JUMP (W)</button>
        {mode === "2p" && (
          <button
            onPointerDown={() => { ((window as any).__br_touch || {}).r = true; }}
            onPointerUp={() => { ((window as any).__br_touch || {}).r = false; }}
            onPointerLeave={() => { ((window as any).__br_touch || {}).r = false; }}
            className="flex-1 py-4 rounded-2xl bg-blue-600 text-white font-bold active:scale-95 select-none"
          >P2 JUMP (↑)</button>
        )}
      </div>
      <p className="text-xs text-muted-foreground text-center">Move toward the ball, jump and flail to kick it into the opposite hoop. First to 5 wins.</p>
    </div>
  );
}
