import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, Gamepad2 } from "lucide-react";

type GameId = "menu" | "ttt" | "flappy";

export function GamesPanel({ onClose }: { onClose: () => void }) {
  const [game, setGame] = useState<GameId>("menu");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 backdrop-blur-md p-4" onClick={onClose}>
      <div className="bg-card border border-border rounded-3xl p-6 w-full max-w-2xl shadow-[var(--shadow-soft)] max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Gamepad2 className="w-6 h-6 text-primary" />
            {game === "menu" ? "Games" : game === "ttt" ? "Tic Tac Toe" : "Flappy Bird"}
          </h2>
          <div className="flex items-center gap-2">
            {game !== "menu" && (
              <Button variant="ghost" size="sm" onClick={() => setGame("menu")}>← Back</Button>
            )}
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-muted"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {game === "menu" && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <button onClick={() => setGame("ttt")} className="p-6 rounded-2xl border border-border hover:border-primary transition-all text-left">
              <p className="text-3xl mb-2">⭕❌</p>
              <p className="font-semibold">Tic Tac Toe</p>
              <p className="text-xs text-muted-foreground">vs AI (easy/med/hard) or 2 player</p>
            </button>
            <button onClick={() => setGame("flappy")} className="p-6 rounded-2xl border border-border hover:border-primary transition-all text-left">
              <p className="text-3xl mb-2">🐦</p>
              <p className="font-semibold">Flappy Bird</p>
              <p className="text-xs text-muted-foreground">Tap / space to flap</p>
            </button>
          </div>
        )}

        {game === "ttt" && <TicTacToe />}
        {game === "flappy" && <FlappyBird />}
      </div>
    </div>
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
  // 50% best, 50% random
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

/* ---------------- Flappy Bird ---------------- */

function FlappyBird() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [score, setScore] = useState(0);
  const [best, setBest] = useState(() => Number(localStorage.getItem("flappy_best") || 0));
  const [running, setRunning] = useState(false);
  const [over, setOver] = useState(false);

  // Game state stored in refs so the loop doesn't restart
  const stateRef = useRef({
    bird: { y: 200, v: 0 },
    pipes: [] as Array<{ x: number; gapY: number; passed: boolean }>,
    frame: 0,
    runId: 0,
  });

  const W = 360;
  const H = 480;
  const GRAVITY = 0.45;
  const FLAP = -7.5;
  const PIPE_W = 56;
  const PIPE_GAP = 130;
  const PIPE_SPACING = 170;
  const SPEED = 2.2;

  function reset() {
    stateRef.current.bird = { y: H / 2, v: 0 };
    stateRef.current.pipes = [];
    stateRef.current.frame = 0;
    setScore(0);
    setOver(false);
  }

  function flap() {
    if (over) {
      reset();
      setRunning(true);
      return;
    }
    if (!running) setRunning(true);
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
  }, [running, over]);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    let raf = 0;
    const myRun = ++stateRef.current.runId;

    function tick() {
      if (myRun !== stateRef.current.runId) return;
      const s = stateRef.current;

      // bg
      const grad = ctx.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, "#74c7ec");
      grad.addColorStop(1, "#a8e6cf");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, W, H);

      // ground
      ctx.fillStyle = "#ded895";
      ctx.fillRect(0, H - 30, W, 30);
      ctx.fillStyle = "#7CB342";
      ctx.fillRect(0, H - 30, W, 6);

      if (running && !over) {
        s.frame++;
        s.bird.v += GRAVITY;
        s.bird.y += s.bird.v;

        // spawn pipes
        if (s.frame % Math.round(PIPE_SPACING / SPEED) === 0) {
          const gapY = 60 + Math.random() * (H - 60 - 30 - PIPE_GAP - 60);
          s.pipes.push({ x: W, gapY, passed: false });
        }
        // move + cull
        s.pipes.forEach((p) => (p.x -= SPEED));
        s.pipes = s.pipes.filter((p) => p.x + PIPE_W > -10);

        // collisions
        const bx = 80;
        const br = 12;
        if (s.bird.y + br > H - 30 || s.bird.y - br < 0) {
          endGame();
        }
        for (const p of s.pipes) {
          if (bx + br > p.x && bx - br < p.x + PIPE_W) {
            if (s.bird.y - br < p.gapY || s.bird.y + br > p.gapY + PIPE_GAP) {
              endGame();
            }
          }
          if (!p.passed && p.x + PIPE_W < bx - br) {
            p.passed = true;
            setScore((sc) => sc + 1);
          }
        }
      }

      // draw pipes
      ctx.fillStyle = "#43A047";
      ctx.strokeStyle = "#1B5E20";
      ctx.lineWidth = 2;
      for (const p of stateRef.current.pipes) {
        ctx.fillRect(p.x, 0, PIPE_W, p.gapY);
        ctx.strokeRect(p.x, 0, PIPE_W, p.gapY);
        ctx.fillRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - 30 - (p.gapY + PIPE_GAP));
        ctx.strokeRect(p.x, p.gapY + PIPE_GAP, PIPE_W, H - 30 - (p.gapY + PIPE_GAP));
        // lip
        ctx.fillRect(p.x - 3, p.gapY - 12, PIPE_W + 6, 12);
        ctx.fillRect(p.x - 3, p.gapY + PIPE_GAP, PIPE_W + 6, 12);
      }

      // draw bird
      const b = stateRef.current.bird;
      ctx.save();
      ctx.translate(80, b.y);
      const tilt = Math.max(-0.5, Math.min(1.2, b.v / 10));
      ctx.rotate(tilt);
      // body
      ctx.fillStyle = "#FFD54F";
      ctx.beginPath();
      ctx.arc(0, 0, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#F57F17";
      ctx.stroke();
      // wing
      ctx.fillStyle = "#FFB300";
      ctx.beginPath();
      ctx.ellipse(-2, 2, 7, 4, 0, 0, Math.PI * 2);
      ctx.fill();
      // eye
      ctx.fillStyle = "white";
      ctx.beginPath(); ctx.arc(5, -3, 3.5, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = "black";
      ctx.beginPath(); ctx.arc(6, -3, 1.5, 0, Math.PI * 2); ctx.fill();
      // beak
      ctx.fillStyle = "#FF6F00";
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(18, -2);
      ctx.lineTo(18, 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      // Score
      ctx.fillStyle = "white";
      ctx.strokeStyle = "black";
      ctx.lineWidth = 3;
      ctx.font = "bold 28px sans-serif";
      ctx.textAlign = "center";
      ctx.strokeText(String(score), W / 2, 50);
      ctx.fillText(String(score), W / 2, 50);

      if (!running) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 22px sans-serif";
        ctx.fillText("Tap or press SPACE", W / 2, H / 2 - 10);
        ctx.font = "16px sans-serif";
        ctx.fillText("to flap & start", W / 2, H / 2 + 14);
      } else if (over) {
        ctx.fillStyle = "rgba(0,0,0,0.6)";
        ctx.fillRect(0, 0, W, H);
        ctx.fillStyle = "white";
        ctx.font = "bold 28px sans-serif";
        ctx.fillText("Game Over", W / 2, H / 2 - 20);
        ctx.font = "18px sans-serif";
        ctx.fillText(`Score ${score} · Best ${best}`, W / 2, H / 2 + 10);
        ctx.font = "14px sans-serif";
        ctx.fillText("Tap to retry", W / 2, H / 2 + 36);
      }

      raf = requestAnimationFrame(tick);
    }

    function endGame() {
      setOver(true);
      setRunning(false);
      setScore((sc) => {
        const b = Number(localStorage.getItem("flappy_best") || 0);
        if (sc > b) {
          localStorage.setItem("flappy_best", String(sc));
          setBest(sc);
        }
        return sc;
      });
    }

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      stateRef.current.runId++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, over, score, best]);

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
