import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Gamepad2 } from "lucide-react";
import { HtmlGamesPanel } from "@/components/HtmlGamesPanel";
import { GnMathPanel } from "@/components/GnMathPanel";
import {
  Dino,
  Minesweeper,
  Plinko,
  MinesGame,
  Pong,
  RPS,
  WhackAMole,
  Asteroids,
  MiniMinecraft,
  Hangman,
  Crash,
  Roulette,
  Jackpot777,
} from "@/components/MoreGames";
import { Minecraft3D } from "@/components/Minecraft3D";

type GameId =
  | "menu" | "ttt" | "flappy" | "g2048" | "tetris" | "snake" | "html" | "gnmath"
  | "dino" | "msweeper" | "plinko" | "mines" | "pong" | "rps" | "whack" | "asteroids" | "mc"
  | "hangman" | "crash" | "roulette" | "jackpot" | "mc3d";

export function GamesPanel({ onClose, name }: { onClose: () => void; name: string }) {
  const [game, setGame] = useState<GameId>("menu");

  const titles: Record<GameId, string> = {
    menu: "Games",
    ttt: "Tic Tac Toe",
    flappy: "Flappy Bird",
    g2048: "2048",
    tetris: "Tetris",
    snake: "Snake",
    html: "HTML Games",
    gnmath: "gn-math",
    dino: "Dino Run",
    msweeper: "Minesweeper",
    plinko: "Plinko",
    mines: "Mines",
    pong: "Pong",
    rps: "Rock Paper Scissors",
    whack: "Whack-a-Mole",
    asteroids: "Asteroids",
    mc: "Mini Minecraft",
    hangman: "Hangman",
    crash: "Crash",
    roulette: "Roulette",
    jackpot: "Jackpot 777",
    mc3d: "Minecraft 3D",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-3xl shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            {titles[game]}
          </h2>
          <div className="flex items-center gap-2">
            {game !== "menu" && (
              <Button variant="ghost" size="sm" onClick={() => setGame("menu")}>← Back</Button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {game === "menu" && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <GameTile emoji="⭕❌" name="Tic Tac Toe" desc="vs AI or 2 player" onClick={() => setGame("ttt")} />
            <GameTile emoji="🐦" name="Flappy Bird" desc="Tap / space to flap" onClick={() => setGame("flappy")} />
            <GameTile emoji="🔢" name="2048" desc="Arrows / swipe" onClick={() => setGame("g2048")} />
            <GameTile emoji="🧱" name="Tetris" desc="Stack & clear lines" onClick={() => setGame("tetris")} />
            <GameTile emoji="🐍" name="Snake" desc="Eat & grow" onClick={() => setGame("snake")} />
            <GameTile emoji="🌐" name="HTML Games" desc="Custom community games" onClick={() => setGame("html")} />
            <GameTile emoji="🧮" name="gn-math" desc="Math game hub" onClick={() => setGame("gnmath")} badge="BETA" />
            <GameTile emoji="🦖" name="Dino Run" desc="Jump cacti, classic" onClick={() => setGame("dino")} />
            <GameTile emoji="💣" name="Minesweeper" desc="9×9 · 10 mines" onClick={() => setGame("msweeper")} />
            <GameTile emoji="🪙" name="Plinko" desc="Drop ball, win fake $" onClick={() => setGame("plinko")} />
            <GameTile emoji="💎" name="Mines" desc="Crypto-style mines" onClick={() => setGame("mines")} />
            <GameTile emoji="🏓" name="Pong" desc="vs AI" onClick={() => setGame("pong")} />
            <GameTile emoji="✊" name="Rock Paper Scissors" desc="Best of forever" onClick={() => setGame("rps")} />
            <GameTile emoji="🐹" name="Whack-a-Mole" desc="30s scramble" onClick={() => setGame("whack")} />
            <GameTile emoji="🚀" name="Asteroids" desc="← → ↑ + Space" onClick={() => setGame("asteroids")} />
            <GameTile emoji="⛏️" name="Mini Minecraft" desc="2D survival" onClick={() => setGame("mc")} badge="NEW" />
            <GameTile emoji="🧊" name="Minecraft 3D" desc="First-person voxel" onClick={() => setGame("mc3d")} badge="NEW" />
            <GameTile emoji="🔤" name="Hangman" desc="Guess the word" onClick={() => setGame("hangman")} />
            <GameTile emoji="📈" name="Crash" desc="Cash out before crash" onClick={() => setGame("crash")} badge="$" />
            <GameTile emoji="🎡" name="Roulette" desc="Place your bets" onClick={() => setGame("roulette")} badge="$" />
            <GameTile emoji="🎰" name="Jackpot 777" desc="Slots — 50x jackpot" onClick={() => setGame("jackpot")} badge="$" />
          </div>
        )}

        {game === "ttt" && <TicTacToe />}
        {game === "flappy" && <FlappyBird />}
        {game === "g2048" && <Game2048 />}
        {game === "tetris" && <Tetris />}
        {game === "snake" && <Snake />}
        {game === "html" && <HtmlGamesPanel name={name} />}
        {game === "gnmath" && <GnMathPanel />}
        {game === "dino" && <Dino />}
        {game === "msweeper" && <Minesweeper />}
        {game === "plinko" && <Plinko />}
        {game === "mines" && <MinesGame />}
        {game === "pong" && <Pong />}
        {game === "rps" && <RPS />}
        {game === "whack" && <WhackAMole />}
        {game === "asteroids" && <Asteroids />}
        {game === "mc" && <MiniMinecraft />}
        {game === "mc3d" && <Minecraft3D />}
        {game === "hangman" && <Hangman />}
        {game === "crash" && <Crash />}
        {game === "roulette" && <Roulette />}
        {game === "jackpot" && <Jackpot777 />}
      </div>
    </div>
  );
}

function GameTile({ emoji, name, desc, onClick, badge }: { emoji: string; name: string; desc: string; onClick: () => void; badge?: string }) {
  return (
    <button onClick={onClick} className="relative p-4 rounded-2xl border border-border hover:border-primary transition-all text-left">
      {badge && (
        <span className="absolute top-2 right-2 text-[9px] font-bold px-1.5 py-0.5 rounded-md bg-amber-500 text-white">
          {badge}
        </span>
      )}
      <p className="text-3xl mb-2">{emoji}</p>
      <p className="font-semibold">{name}</p>
      <p className="text-xs text-muted-foreground">{desc}</p>
    </button>
  );
}

/* ---------------- Tic Tac Toe ---------------- */

type Cell = "X" | "O" | null;
type Mode = "ai-easy" | "ai-medium" | "ai-hard" | "2p";

function TicTacToe() {
  const [mode, setMode] = useState<Mode>("ai-medium");
  const [board, setBoard] = useState<Cell[]>(Array(9).fill(null));
  const [turn, setTurn] = useState<"X" | "O">("X");
  const winner = checkWinner(board);
  const draw = !winner && board.every((c) => c !== null);
  const aiTurn = mode !== "2p" && turn === "O" && !winner && !draw;

  useEffect(() => {
    if (!aiTurn) return;
    const t = setTimeout(() => {
      const move = mode === "ai-easy" ? randomMove(board) : mode === "ai-medium" ? mediumMove(board) : bestMove(board, "O");
      if (move != null) play(move);
    }, 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [aiTurn, board, mode]);

  function play(i: number) {
    if (board[i] || winner) return;
    const next = [...board];
    next[i] = turn;
    setBoard(next);
    setTurn(turn === "X" ? "O" : "X");
  }

  function reset() {
    setBoard(Array(9).fill(null));
    setTurn("X");
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["ai-easy", "ai-medium", "ai-hard", "2p"] as Mode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); reset(); }}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${mode === m ? "border-primary bg-primary text-primary-foreground" : "border-border hover:border-primary/50"}`}
          >
            {m === "2p" ? "2 Player" : m === "ai-easy" ? "AI · Easy" : m === "ai-medium" ? "AI · Medium" : "AI · Hard"}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-3 gap-2 max-w-xs mx-auto">
        {board.map((c, i) => (
          <button
            key={i}
            onClick={() => !aiTurn && play(i)}
            disabled={!!c || !!winner || aiTurn}
            className="aspect-square text-4xl font-bold rounded-xl border-2 border-border bg-muted/30 hover:bg-muted disabled:cursor-not-allowed flex items-center justify-center"
          >
            <span className={c === "X" ? "text-primary" : "text-accent-foreground"}>{c}</span>
          </button>
        ))}
      </div>

      <div className="text-center">
        {winner ? (
          <p className="font-semibold">🎉 {winner} wins!</p>
        ) : draw ? (
          <p className="font-semibold">It's a draw.</p>
        ) : (
          <p className="text-sm text-muted-foreground">{aiTurn ? "AI is thinking…" : `Turn: ${turn}`}</p>
        )}
        <Button onClick={reset} variant="outline" size="sm" className="mt-2">New game</Button>
      </div>
    </div>
  );
}

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
function checkWinner(b: Cell[]): Cell {
  for (const [a, c, d] of LINES) {
    if (b[a] && b[a] === b[c] && b[a] === b[d]) return b[a];
  }
  return null;
}
function randomMove(b: Cell[]): number | null {
  const empty = b.map((c, i) => (c ? -1 : i)).filter((i) => i >= 0);
  if (!empty.length) return null;
  return empty[Math.floor(Math.random() * empty.length)];
}
function mediumMove(b: Cell[]): number | null {
  return Math.random() < 0.5 ? bestMove(b, "O") : randomMove(b);
}
function bestMove(b: Cell[], player: "X" | "O"): number | null {
  let best = -Infinity;
  let move: number | null = null;
  for (let i = 0; i < 9; i++) {
    if (!b[i]) {
      const next = [...b];
      next[i] = player;
      const score = minimax(next, false, player);
      if (score > best) {
        best = score;
        move = i;
      }
    }
  }
  return move;
}
function minimax(b: Cell[], maximizing: boolean, ai: "X" | "O"): number {
  const human = ai === "X" ? "O" : "X";
  const w = checkWinner(b);
  if (w === ai) return 1;
  if (w === human) return -1;
  if (b.every((c) => c)) return 0;
  if (maximizing) {
    let best = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const n = [...b]; n[i] = ai;
        best = Math.max(best, minimax(n, false, ai));
      }
    }
    return best;
  } else {
    let best = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!b[i]) {
        const n = [...b]; n[i] = human;
        best = Math.min(best, minimax(n, true, ai));
      }
    }
    return best;
  }
}

/* ---------------- Flappy Bird (improved) ---------------- */

function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("flappy_best") || 0));
  const runningRef = useRef(false);
  const overRef = useRef(false);
  const [, force] = useState(0);
  const scoreRef = useRef(0);

  const W = 360;
  const H = 540;
  const GRAVITY = 1500;
  const FLAP = -360;
  const PIPE_W = 60;
  const PIPE_GAP = 150;
  const PIPE_SPACING = 1.55;
  const SPEED = 130;
  const GROUND_H = 80;
  const BIRD_X = 90;
  const BIRD_R = 13;

  const stateRef = useRef({
    bird: { y: H / 2, v: 0 },
    pipes: [] as Array<{ x: number; gapY: number; passed: boolean }>,
    frame: 0,
    sinceLastPipe: 99,
    groundOffset: 0,
    cloudOffset: 0,
    runId: 0,
    lastTime: 0,
  });

  function reset() {
    stateRef.current.bird = { y: H / 2, v: 0 };
    stateRef.current.pipes = [];
    stateRef.current.frame = 0;
    stateRef.current.sinceLastPipe = 99;
    stateRef.current.lastTime = 0;
    setScore(0);
    scoreRef.current = 0;
    overRef.current = false;
    force((n) => n + 1);
  }

  function flap() {
    if (overRef.current) {
      reset();
      runningRef.current = true;
      // first flap to start motion
      stateRef.current.bird.v = FLAP;
      force((n) => n + 1);
      return;
    }
    if (!runningRef.current) {
      runningRef.current = true;
    }
    stateRef.current.bird.v = FLAP;
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.code === "ArrowUp") {
        e.preventDefault();
        flap();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const myRun = ++stateRef.current.runId;

    function endGame() {
      if (overRef.current) return;
      overRef.current = true;
      runningRef.current = false;
      setScore((sc) => {
        const prevBest = Number(localStorage.getItem("flappy_best") || 0);
        if (sc > prevBest) {
          localStorage.setItem("flappy_best", String(sc));
          setBest(sc);
        }
        return sc;
      });
      force((n) => n + 1);
    }

    function tick(ts: number) {
      if (myRun !== stateRef.current.runId) return;
      const s = stateRef.current;
      const delta = s.lastTime ? Math.min(0.03, (ts - s.lastTime) / 1000) : 1 / 60;
      s.lastTime = ts;

      // background sky gradient
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#4ec0ca");
      grad.addColorStop(1, "#9be0c0");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // clouds (parallax)
      s.cloudOffset = (s.cloudOffset + 18 * delta) % W;
      ctx.fillStyle = "rgba(255,255,255,0.7)";
      for (let i = 0; i < 4; i++) {
        const cx = ((i * 130) - s.cloudOffset + W) % W;
        const cy = 60 + (i % 2) * 40;
        ctx.beginPath();
        ctx.arc(cx, cy, 18, 0, Math.PI * 2);
        ctx.arc(cx + 18, cy + 4, 22, 0, Math.PI * 2);
        ctx.arc(cx + 38, cy, 16, 0, Math.PI * 2);
        ctx.fill();
      }

      if (runningRef.current && !overRef.current) {
        s.frame += delta * 60;
        s.sinceLastPipe += delta;
        s.bird.v += GRAVITY * delta;
        if (s.bird.v > 560) s.bird.v = 560;
        s.bird.y += s.bird.v * delta;

        if (s.sinceLastPipe >= PIPE_SPACING) {
          const minGap = 75;
          const maxGap = H - GROUND_H - PIPE_GAP - 75;
          const gapY = minGap + Math.random() * (maxGap - minGap);
          s.pipes.push({ x: W + 10, gapY, passed: false });
          s.sinceLastPipe = 0;
        }
        s.pipes.forEach((p) => (p.x -= SPEED * delta));
        s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -10);

        // collisions
        if (s.bird.y + BIRD_R > H - GROUND_H) {
          s.bird.y = H - GROUND_H - BIRD_R;
          endGame();
        }
        if (s.bird.y - BIRD_R < 0) {
          s.bird.y = BIRD_R;
          s.bird.v = 0;
        }
        for (const p of s.pipes) {
          // circle-vs-rect collision
          const rectTop = { x: p.x, y: 0, w: PIPE_W, h: p.gapY };
          const rectBot = { x: p.x, y: p.gapY + PIPE_GAP, w: PIPE_W, h: H - GROUND_H - (p.gapY + PIPE_GAP) };
          if (circleRectHit(BIRD_X, s.bird.y, BIRD_R, rectTop) || circleRectHit(BIRD_X, s.bird.y, BIRD_R, rectBot)) {
            endGame();
          }
          if (!p.passed && p.x + PIPE_W < BIRD_X - BIRD_R) {
            p.passed = true;
            scoreRef.current += 1;
            setScore(scoreRef.current);
          }
        }
      }

      // pipes
      for (const p of stateRef.current.pipes) {
        drawPipe(ctx, p.x, 0, PIPE_W, p.gapY, "down");
        drawPipe(ctx, p.x, p.gapY + PIPE_GAP, PIPE_W, H - GROUND_H - (p.gapY + PIPE_GAP), "up");
      }

      // ground (scrolling)
      if (runningRef.current && !overRef.current) {
        s.groundOffset = (s.groundOffset + SPEED * delta) % 24;
      }
      ctx.fillStyle = "#ded895";
      ctx.fillRect(0, H - GROUND_H, W, GROUND_H);
      ctx.fillStyle = "#7CB342";
      ctx.fillRect(0, H - GROUND_H, W, 10);
      ctx.fillStyle = "#5d4037";
      for (let i = -1; i < W / 24 + 2; i++) {
        ctx.fillRect(i * 24 - s.groundOffset, H - GROUND_H + 10, 12, 6);
      }

      // bird
      const b = stateRef.current.bird;
      ctx.save();
      ctx.translate(BIRD_X, b.y);
      const tilt = Math.max(-0.45, Math.min(1.15, b.v / 420));
      ctx.rotate(tilt);
      // body
      ctx.fillStyle = "#FFD54F";
      ctx.beginPath();
      ctx.arc(0, 0, BIRD_R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#F57F17";
      ctx.lineWidth = 2;
      ctx.stroke();
      // wing - animate flap
      const wingY = Math.sin(stateRef.current.frame * 0.4) * 2;
      ctx.fillStyle = "#FFB300";
      ctx.beginPath();
      ctx.ellipse(-3, 2 + wingY, 8, 5, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      // eye
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(5, -3, 4, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath(); ctx.arc(6, -3, 2, 0, Math.PI * 2); ctx.fill();
      // beak
      ctx.fillStyle = "#FF6F00";
      ctx.strokeStyle = "#BF360C";
      ctx.beginPath();
      ctx.moveTo(11, -1);
      ctx.lineTo(20, -3);
      ctx.lineTo(20, 3);
      ctx.lineTo(11, 4);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // Score
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 4;
      ctx.font = "bold 36px sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(String(score), W / 2, 60);
      ctx.fillText(String(score), W / 2, 60);

      if (!runningRef.current && !overRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.45)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 24px sans-serif";
        ctx.fillText("Tap or press SPACE", W / 2, H / 2 - 10);
        ctx.font = "16px sans-serif";
        ctx.fillText("to flap & start", W / 2, H / 2 + 16);
      } else if (overRef.current) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 30px sans-serif";
        ctx.fillText("Game Over", W / 2, H / 2 - 30);
        ctx.font = "18px sans-serif";
        ctx.fillText(`Score ${score}`, W / 2, H / 2);
        ctx.fillText(`Best ${best}`, W / 2, H / 2 + 24);
        ctx.font = "14px sans-serif";
        ctx.fillText("Tap to retry", W / 2, H / 2 + 56);
      }

      raf = requestAnimationFrame(tick);
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stateRef.current.runId++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [score, best]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={W}
        height={H}
        onMouseDown={flap}
        onTouchStart={(e) => { e.preventDefault(); flap(); }}
        className="rounded-xl border border-border touch-none cursor-pointer max-w-full"
        style={{ width: "100%", maxWidth: W }}
      />
      <p className="text-xs text-muted-foreground">Best: {best} · Press SPACE or click/tap to flap</p>
    </div>
  );
}

function circleRectHit(cx: number, cy: number, r: number, rect: { x: number; y: number; w: number; h: number }) {
  const closestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const closestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - closestX;
  const dy = cy - closestY;
  return dx * dx + dy * dy < r * r;
}

function drawPipe(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, dir: "up" | "down") {
  if (h <= 0) return;
  const grad = ctx.createLinearGradient(x, 0, x + w, 0);
  grad.addColorStop(0, "#388E3C");
  grad.addColorStop(0.4, "#66BB6A");
  grad.addColorStop(1, "#2E7D32");
  ctx.fillStyle = grad;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = "#1B5E20";
  ctx.lineWidth = 2;
  ctx.strokeRect(x, y, w, h);
  // lip
  const lipH = 16;
  const lipX = x - 4;
  const lipW = w + 8;
  const lipY = dir === "down" ? y + h - lipH : y;
  ctx.fillStyle = grad;
  ctx.fillRect(lipX, lipY, lipW, lipH);
  ctx.strokeRect(lipX, lipY, lipW, lipH);
}

/* ---------------- 2048 ---------------- */

function Game2048() {
  const [sizeInput, setSizeInput] = useState("4");
  const [size, setSize] = useState(4);
  const [grid, setGrid] = useState<number[][]>(() => addRandom(addRandom(emptyGrid(4))));
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("2048_best") || 0));
  const [over, setOver] = useState(false);
  const [won, setWon] = useState(false);
  const [newTiles, setNewTiles] = useState<Set<string>>(new Set());
  const [mergedTiles, setMergedTiles] = useState<Set<string>>(new Set());

  function reset(n?: number) {
    const s = n ?? size;
    setGrid(addRandom(addRandom(emptyGrid(s))));
    setScore(0);
    setOver(false);
    setWon(false);
    setNewTiles(new Set());
    setMergedTiles(new Set());
  }

  function move(dir: "up" | "down" | "left" | "right") {
    if (over) return;
    const { grid: ng, gained, moved, merges } = slide(grid, dir);
    if (!moved) return;
    const withTile = addRandom(ng);
    // Find new tile position
    const nt = new Set<string>();
    for (let r = 0; r < withTile.length; r++) {
      for (let c = 0; c < withTile[r].length; c++) {
        if (withTile[r][c] !== 0 && ng[r][c] === 0) nt.add(`${r}-${c}`);
      }
    }
    setNewTiles(nt);
    setMergedTiles(merges);
    setTimeout(() => { setNewTiles(new Set()); setMergedTiles(new Set()); }, 200);
    setGrid(withTile);
    setScore((s) => {
      const ns = s + gained;
      if (ns > best) {
        setBest(ns);
        localStorage.setItem("2048_best", String(ns));
      }
      return ns;
    });
    if (withTile.flat().includes(2048) && !won) setWon(true);
    if (!hasMoves(withTile)) setOver(true);
  }

  function applySize() {
    const n = Math.max(2, Math.min(10, parseInt(sizeInput) || 4));
    setSizeInput(String(n));
    setSize(n);
    reset(n);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const map: Record<string, "up" | "down" | "left" | "right"> = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (dir) {
        e.preventDefault();
        move(dir);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  });

  // Touch swipe
  const touchRef = useRef<{ x: number; y: number } | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchRef.current = { x: t.clientX, y: t.clientY };
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchRef.current.x;
    const dy = t.clientY - touchRef.current.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 20) return;
    if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? "right" : "left");
    else move(dy > 0 ? "down" : "up");
  }

  const tileColors: Record<number, string> = {
    0: "bg-muted/40 text-transparent",
    2: "bg-amber-100 text-amber-900",
    4: "bg-amber-200 text-amber-900",
    8: "bg-orange-300 text-white",
    16: "bg-orange-400 text-white",
    32: "bg-orange-500 text-white",
    64: "bg-red-500 text-white",
    128: "bg-yellow-300 text-yellow-900",
    256: "bg-yellow-400 text-yellow-900",
    512: "bg-yellow-500 text-white",
    1024: "bg-emerald-500 text-white",
    2048: "bg-emerald-600 text-white",
  };

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-3 items-center text-sm w-full max-w-sm justify-between flex-wrap">
        <div><span className="text-muted-foreground">Score</span> <span className="font-bold">{score}</span></div>
        <div><span className="text-muted-foreground">Best</span> <span className="font-bold">{best}</span></div>
        <div className="flex items-center gap-1">
          <input
            value={sizeInput}
            onChange={(e) => setSizeInput(e.target.value)}
            onBlur={applySize}
            onKeyDown={(e) => { if (e.key === "Enter") applySize(); }}
            className="w-10 h-8 text-center rounded border border-border bg-muted/30 text-sm"
            maxLength={2}
          />
          <span className="text-xs text-muted-foreground">×{sizeInput}</span>
        </div>
        <Button onClick={() => reset()} variant="outline" size="sm">New</Button>
      </div>
      <div
        className="grid gap-1.5 p-2 rounded-xl bg-muted/40 touch-none select-none"
        style={{ width: "min(360px, 100%)", gridTemplateColumns: `repeat(${size}, 1fr)` }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {grid.flat().map((v, i) => {
          const r = Math.floor(i / size);
          const c = i % size;
          const key = `${r}-${c}`;
          const isNew = newTiles.has(key);
          const isMerged = mergedTiles.has(key);
          const fontSize = size <= 4 ? "text-xl" : size <= 6 ? "text-sm" : "text-xs";
          return (
            <div
              key={i}
              className={`aspect-square rounded-lg flex items-center justify-center font-bold ${fontSize} ${tileColors[v] ?? "bg-emerald-700 text-white"} transition-transform duration-150 ${isNew ? "animate-[scaleIn_0.15s_ease-out]" : ""} ${isMerged ? "animate-[pop_0.2s_ease-out]" : ""}`}
            >
              {v || ""}
            </div>
          );
        })}
      </div>
      {(won || over) && (
        <p className="text-sm font-semibold">{won ? "🎉 You hit 2048!" : "No more moves."}</p>
      )}
      <p className="text-xs text-muted-foreground">Arrow keys or swipe to move</p>
    </div>
  );
}

function emptyGrid(n: number) { return Array.from({ length: n }, () => Array(n).fill(0)); }
function addRandom(g: number[][]) {
  const empties: Array<[number, number]> = [];
  g.forEach((row, r) => row.forEach((v, c) => { if (v === 0) empties.push([r, c]); }));
  if (!empties.length) return g;
  const [r, c] = empties[Math.floor(Math.random() * empties.length)];
  const ng = g.map((row) => [...row]);
  ng[r][c] = Math.random() < 0.9 ? 2 : 4;
  return ng;
}
function slide(g: number[][], dir: "up" | "down" | "left" | "right") {
  const n = g.length;
  let rotated = g.map((row) => [...row]);
  // normalize so we always slide left
  const rotations = dir === "left" ? 0 : dir === "up" ? 3 : dir === "right" ? 2 : 1;
  for (let i = 0; i < rotations; i++) rotated = rotateCW(rotated);
  let gained = 0;
  let moved = false;
  const mergePositions: Array<[number, number]> = [];
  const next = rotated.map((row, rowIdx) => {
    const filtered = row.filter((v) => v !== 0);
    for (let i = 0; i < filtered.length - 1; i++) {
      if (filtered[i] === filtered[i + 1]) {
        filtered[i] *= 2;
        gained += filtered[i];
        mergePositions.push([rowIdx, i]);
        filtered.splice(i + 1, 1);
      }
    }
    while (filtered.length < n) filtered.push(0);
    if (!moved && row.some((v, i) => v !== filtered[i])) moved = true;
    return filtered;
  });
  let unrotated = next;
  for (let i = 0; i < (4 - rotations) % 4; i++) unrotated = rotateCW(unrotated);
  // Transform merge positions back to original orientation
  const merges = new Set<string>();
  for (const [r, c] of mergePositions) {
    let pr = r, pc = c;
    for (let i = 0; i < (4 - rotations) % 4; i++) {
      const tmp = pc;
      pc = n - 1 - pr;
      pr = tmp;
    }
    merges.add(`${pr}-${pc}`);
  }
  return { grid: unrotated, gained, moved, merges };
}
function rotateCW(g: number[][]) {
  const n = g.length;
  const r = emptyGrid(n);
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) r[j][n - 1 - i] = g[i][j];
  return r;
}
function hasMoves(g: number[][]) {
  if (g.flat().includes(0)) return true;
  const n = g.length;
  for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    if (j + 1 < n && g[i][j] === g[i][j + 1]) return true;
    if (i + 1 < n && g[i][j] === g[i + 1][j]) return true;
  }
  return false;
}

/* ---------------- Tetris ---------------- */

const TETRIS_W = 10;
const TETRIS_H = 20;
type TPiece = { shape: number[][]; color: string };
const PIECES: TPiece[] = [
  { shape: [[1, 1, 1, 1]], color: "#22d3ee" }, // I
  { shape: [[1, 1], [1, 1]], color: "#facc15" }, // O
  { shape: [[0, 1, 0], [1, 1, 1]], color: "#a855f7" }, // T
  { shape: [[1, 0, 0], [1, 1, 1]], color: "#3b82f6" }, // J
  { shape: [[0, 0, 1], [1, 1, 1]], color: "#fb923c" }, // L
  { shape: [[0, 1, 1], [1, 1, 0]], color: "#22c55e" }, // S
  { shape: [[1, 1, 0], [0, 1, 1]], color: "#ef4444" }, // Z
];

function Tetris() {
  const [board, setBoard] = useState<string[][]>(() => Array.from({ length: TETRIS_H }, () => Array(TETRIS_W).fill("")));
  const [piece, setPiece] = useState<{ p: TPiece; x: number; y: number } | null>(null);
  const [score, setScore] = useState(0);
  const [lines, setLines] = useState(0);
  const [over, setOver] = useState(false);
  const [paused, setPaused] = useState(false);
  const boardRef = useRef(board);
  const pieceRef = useRef(piece);
  boardRef.current = board;
  pieceRef.current = piece;

  function spawn() {
    const p = PIECES[Math.floor(Math.random() * PIECES.length)];
    const np = { p, x: Math.floor((TETRIS_W - p.shape[0].length) / 2), y: 0 };
    if (collides(boardRef.current, np)) {
      setOver(true);
      return;
    }
    setPiece(np);
  }

  function reset() {
    setBoard(Array.from({ length: TETRIS_H }, () => Array(TETRIS_W).fill("")));
    setScore(0);
    setLines(0);
    setOver(false);
    setPaused(false);
    setPiece(null);
    setTimeout(spawn, 0);
  }

  useEffect(() => {
    if (!piece && !over) spawn();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // gravity
  useEffect(() => {
    if (over || paused) return;
    const speed = Math.max(120, 600 - lines * 20);
    const t = setInterval(() => tick(), speed);
    return () => clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over, paused, lines]);

  function tick() {
    const cur = pieceRef.current;
    if (!cur) return;
    const moved = { ...cur, y: cur.y + 1 };
    if (collides(boardRef.current, moved)) {
      lockPiece();
    } else {
      setPiece(moved);
    }
  }

  function lockPiece() {
    const cur = pieceRef.current;
    if (!cur) return;
    const nb = boardRef.current.map((r) => [...r]);
    cur.p.shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v) {
        const x = cur.x + dx;
        const y = cur.y + dy;
        if (y >= 0 && y < TETRIS_H && x >= 0 && x < TETRIS_W) nb[y][x] = cur.p.color;
      }
    }));
    // clear lines
    let cleared = 0;
    const filtered = nb.filter((row) => {
      if (row.every((c) => c)) { cleared++; return false; }
      return true;
    });
    while (filtered.length < TETRIS_H) filtered.unshift(Array(TETRIS_W).fill(""));
    setBoard(filtered);
    if (cleared) {
      setLines((l) => l + cleared);
      setScore((s) => s + [0, 100, 300, 500, 800][cleared]);
    }
    setPiece(null);
    setTimeout(spawn, 0);
  }

  function tryMove(dx: number, dy: number) {
    const cur = pieceRef.current;
    if (!cur || over) return;
    const moved = { ...cur, x: cur.x + dx, y: cur.y + dy };
    if (!collides(boardRef.current, moved)) setPiece(moved);
    else if (dy > 0) lockPiece();
  }
  function rotate() {
    const cur = pieceRef.current;
    if (!cur || over) return;
    const rotated = rotateShape(cur.p.shape);
    const moved = { ...cur, p: { ...cur.p, shape: rotated } };
    // wall kicks
    for (const kick of [0, -1, 1, -2, 2]) {
      const tryP = { ...moved, x: moved.x + kick };
      if (!collides(boardRef.current, tryP)) { setPiece(tryP); return; }
    }
  }
  function hardDrop() {
    let cur = pieceRef.current;
    if (!cur || over) return;
    while (cur && !collides(boardRef.current, { ...cur, y: cur.y + 1 })) {
      cur = { ...cur, y: cur.y + 1 };
    }
    setPiece(cur);
    setTimeout(lockPiece, 0);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (over) return;
      if (e.code === "ArrowLeft") { e.preventDefault(); tryMove(-1, 0); }
      else if (e.code === "ArrowRight") { e.preventDefault(); tryMove(1, 0); }
      else if (e.code === "ArrowDown") { e.preventDefault(); tryMove(0, 1); }
      else if (e.code === "ArrowUp") { e.preventDefault(); rotate(); }
      else if (e.code === "Space") { e.preventDefault(); hardDrop(); }
      else if (e.key === "p" || e.key === "P") setPaused((p) => !p);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [over]);

  // render
  const display = board.map((r) => [...r]);
  if (piece) {
    piece.p.shape.forEach((row, dy) => row.forEach((v, dx) => {
      if (v) {
        const x = piece.x + dx;
        const y = piece.y + dy;
        if (y >= 0 && y < TETRIS_H && x >= 0 && x < TETRIS_W) display[y][x] = piece.p.color;
      }
    }));
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="flex gap-4 items-center text-sm w-full max-w-xs justify-between">
        <div><span className="text-muted-foreground">Score</span> <span className="font-bold">{score}</span></div>
        <div><span className="text-muted-foreground">Lines</span> <span className="font-bold">{lines}</span></div>
        <Button onClick={reset} variant="outline" size="sm">{over ? "Restart" : "New"}</Button>
      </div>
      <div
        className="grid bg-black p-1 rounded-lg"
        style={{ gridTemplateColumns: `repeat(${TETRIS_W}, 1fr)`, width: "min(280px, 90vw)" }}
      >
        {display.flat().map((c, i) => (
          <div
            key={i}
            className="aspect-square border border-black/30"
            style={{ background: c || "#1a1a1a" }}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-2 sm:hidden w-full max-w-xs">
        <Button variant="outline" onClick={() => tryMove(-1, 0)}>◀</Button>
        <Button variant="outline" onClick={rotate}>⟳</Button>
        <Button variant="outline" onClick={() => tryMove(1, 0)}>▶</Button>
        <Button variant="outline" onClick={() => tryMove(0, 1)}>▼</Button>
        <Button variant="outline" onClick={hardDrop}>⬇⬇</Button>
        <Button variant="outline" onClick={() => setPaused((p) => !p)}>{paused ? "▶︎" : "❚❚"}</Button>
      </div>
      {over && <p className="font-semibold">Game Over · Score {score}</p>}
      <p className="text-xs text-muted-foreground">← → move · ↑ rotate · ↓ soft drop · Space hard drop · P pause</p>
    </div>
  );
}

function collides(board: string[][], piece: { p: TPiece; x: number; y: number }) {
  for (let dy = 0; dy < piece.p.shape.length; dy++) {
    for (let dx = 0; dx < piece.p.shape[dy].length; dx++) {
      if (!piece.p.shape[dy][dx]) continue;
      const x = piece.x + dx;
      const y = piece.y + dy;
      if (x < 0 || x >= TETRIS_W || y >= TETRIS_H) return true;
      if (y >= 0 && board[y][x]) return true;
    }
  }
  return false;
}
function rotateShape(s: number[][]) {
  const h = s.length, w = s[0].length;
  const r = Array.from({ length: w }, () => Array(h).fill(0));
  for (let i = 0; i < h; i++) for (let j = 0; j < w; j++) r[j][h - 1 - i] = s[i][j];
  return r;
}

/* ---------------- Snake ---------------- */

function Snake() {
  const SIZE = 20;
  const CELL = 16;
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("snake_best") || 0));
  const [over, setOver] = useState(false);
  const [running, setRunning] = useState(false);

  const stateRef = useRef({
    snake: [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }],
    dir: { x: 1, y: 0 },
    nextDir: { x: 1, y: 0 },
    food: { x: 15, y: 10 },
    runId: 0,
  });

  function reset() {
    stateRef.current.snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    stateRef.current.dir = { x: 1, y: 0 };
    stateRef.current.nextDir = { x: 1, y: 0 };
    stateRef.current.food = { x: 15, y: 10 };
    setScore(0);
    setOver(false);
  }

  function start() {
    if (over) reset();
    setRunning(true);
  }

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const d = stateRef.current.dir;
      const map: Record<string, { x: number; y: number }> = {
        ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
        ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
        w: { x: 0, y: -1 }, s: { x: 0, y: 1 }, a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
      };
      const nd = map[e.key];
      if (!nd) return;
      e.preventDefault();
      if (nd.x === -d.x && nd.y === -d.y) return; // no reverse
      stateRef.current.nextDir = nd;
      if (!running && !over) setRunning(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const myRun = ++stateRef.current.runId;
    let timer: any;

    function draw() {
      // bg
      ctx.fillStyle = "#0f172a";
      ctx.fillRect(0, 0, SIZE * CELL, SIZE * CELL);
      // grid
      ctx.strokeStyle = "#1e293b";
      for (let i = 0; i <= SIZE; i++) {
        ctx.beginPath(); ctx.moveTo(i * CELL, 0); ctx.lineTo(i * CELL, SIZE * CELL); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, i * CELL); ctx.lineTo(SIZE * CELL, i * CELL); ctx.stroke();
      }
      // food
      const f = stateRef.current.food;
      ctx.fillStyle = "#ef4444";
      ctx.beginPath();
      ctx.arc(f.x * CELL + CELL / 2, f.y * CELL + CELL / 2, CELL / 2 - 2, 0, Math.PI * 2);
      ctx.fill();
      // snake
      stateRef.current.snake.forEach((seg, i) => {
        ctx.fillStyle = i === 0 ? "#22c55e" : "#16a34a";
        ctx.fillRect(seg.x * CELL + 1, seg.y * CELL + 1, CELL - 2, CELL - 2);
      });
      if (!running && !over) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, SIZE * CELL, SIZE * CELL);
        ctx.fillStyle = "white";
        ctx.font = "bold 18px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Press an arrow key", SIZE * CELL / 2, SIZE * CELL / 2);
      }
      if (over) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, SIZE * CELL, SIZE * CELL);
        ctx.fillStyle = "white";
        ctx.font = "bold 22px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText("Game Over", SIZE * CELL / 2, SIZE * CELL / 2 - 10);
        ctx.font = "14px sans-serif";
        ctx.fillText(`Score ${score} · Best ${best}`, SIZE * CELL / 2, SIZE * CELL / 2 + 14);
      }
    }

    function step() {
      if (myRun !== stateRef.current.runId) return;
      if (running && !over) {
        const s = stateRef.current;
        s.dir = s.nextDir;
        const head = { x: s.snake[0].x + s.dir.x, y: s.snake[0].y + s.dir.y };
        if (head.x < 0 || head.x >= SIZE || head.y < 0 || head.y >= SIZE || s.snake.some((seg) => seg.x === head.x && seg.y === head.y)) {
          setOver(true);
          setRunning(false);
          setScore((sc) => {
            const prev = Number(localStorage.getItem("snake_best") || 0);
            if (sc > prev) { localStorage.setItem("snake_best", String(sc)); setBest(sc); }
            return sc;
          });
        } else {
          s.snake.unshift(head);
          if (head.x === s.food.x && head.y === s.food.y) {
            setScore((sc) => sc + 1);
            // new food (not on snake)
            let nf: { x: number; y: number };
            do {
              nf = { x: Math.floor(Math.random() * SIZE), y: Math.floor(Math.random() * SIZE) };
            } while (s.snake.some((seg) => seg.x === nf.x && seg.y === nf.y));
            s.food = nf;
          } else {
            s.snake.pop();
          }
        }
      }
      draw();
      timer = setTimeout(step, 110);
    }
    step();
    return () => { clearTimeout(timer); stateRef.current.runId++; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, score, best]);

  return (
    <div className="flex flex-col items-center gap-3">
      <canvas
        ref={canvasRef}
        width={SIZE * CELL}
        height={SIZE * CELL}
        className="rounded-lg border border-border max-w-full"
        style={{ width: "min(320px, 100%)" }}
      />
      <div className="flex gap-3 items-center text-sm">
        <span>Score <b>{score}</b></span>
        <span>Best <b>{best}</b></span>
        <Button size="sm" variant="outline" onClick={start}>{over ? "Restart" : running ? "Running…" : "Start"}</Button>
      </div>
      <div className="grid grid-cols-3 gap-2 sm:hidden">
        <div />
        <Button variant="outline" size="sm" onClick={() => { stateRef.current.nextDir = { x: 0, y: -1 }; setRunning(true); }}>▲</Button>
        <div />
        <Button variant="outline" size="sm" onClick={() => { stateRef.current.nextDir = { x: -1, y: 0 }; setRunning(true); }}>◀</Button>
        <Button variant="outline" size="sm" onClick={() => { stateRef.current.nextDir = { x: 0, y: 1 }; setRunning(true); }}>▼</Button>
        <Button variant="outline" size="sm" onClick={() => { stateRef.current.nextDir = { x: 1, y: 0 }; setRunning(true); }}>▶</Button>
      </div>
      <p className="text-xs text-muted-foreground">Arrow keys / WASD to move</p>
    </div>
  );
}
