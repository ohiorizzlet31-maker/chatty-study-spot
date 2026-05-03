import { useEffect, useRef, useState } from "react";
import * as THREE from "three";

const BLOCK_TYPES = ["grass","dirt","stone","wood","leaves","sand","plank","glass","cobble"] as const;
type BlockType = typeof BLOCK_TYPES[number];
const BLOCK_COLORS: Record<BlockType, number> = {
  grass: 0x5d9b3a, dirt: 0x8b5a2b, stone: 0x8a8a8a,
  wood: 0x5b3a1c, leaves: 0x3e7a2e, sand: 0xe8d589, plank: 0xc08a4a,
  glass: 0xbfe6ff, cobble: 0x6b6b6b,
};

// Build a small canvas texture per block type so faces have detail, not flat color.
function makeBlockTexture(type: BlockType): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 32; c.height = 32;
  const g = c.getContext("2d")!;
  const base = "#" + BLOCK_COLORS[type].toString(16).padStart(6, "0");
  g.fillStyle = base; g.fillRect(0, 0, 32, 32);
  // noise speckles
  for (let i = 0; i < 90; i++) {
    const x = Math.floor(Math.random() * 32), y = Math.floor(Math.random() * 32);
    const s = (Math.random() - 0.5) * 40;
    g.fillStyle = `rgba(${s > 0 ? 255 : 0},${s > 0 ? 255 : 0},${s > 0 ? 255 : 0},${Math.abs(s) / 200})`;
    g.fillRect(x, y, 2, 2);
  }
  if (type === "wood") {
    g.strokeStyle = "rgba(0,0,0,0.4)"; g.lineWidth = 1;
    for (let y = 4; y < 32; y += 6) { g.beginPath(); g.moveTo(0, y); g.lineTo(32, y + (Math.random()-0.5)*2); g.stroke(); }
  }
  if (type === "plank") {
    g.strokeStyle = "rgba(0,0,0,0.35)";
    for (let y = 0; y < 32; y += 8) g.fillRect(0, y, 32, 1);
    for (let x = 0; x < 32; x += 16) g.fillRect(x, 0, 1, 32);
  }
  if (type === "leaves") {
    for (let i = 0; i < 60; i++) {
      g.fillStyle = `rgba(0,${100+Math.random()*60},0,${0.3+Math.random()*0.4})`;
      g.beginPath(); g.arc(Math.random()*32, Math.random()*32, 1.5, 0, Math.PI*2); g.fill();
    }
  }
  if (type === "glass") {
    g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineWidth = 2;
    g.strokeRect(1, 1, 30, 30);
  }
  if (type === "cobble") {
    g.strokeStyle = "rgba(0,0,0,0.4)";
    for (let i = 0; i < 8; i++) {
      const x = Math.random()*32, y = Math.random()*32, r = 3 + Math.random()*4;
      g.beginPath(); g.arc(x, y, r, 0, Math.PI*2); g.stroke();
    }
  }
  const tex = new THREE.CanvasTexture(c);
  tex.magFilter = THREE.NearestFilter;
  tex.minFilter = THREE.NearestFilter;
  return tex;
}

export function Minecraft3D() {
  const mountRef = useRef<HTMLDivElement>(null);
  const [selected, setSelected] = useState<BlockType>("grass");
  const [locked, setLocked] = useState(false);
  const [inv, setInv] = useState<Record<BlockType, number>>({
    grass: 99, dirt: 99, stone: 99, wood: 50, leaves: 30, sand: 20, plank: 0,
  });
  const selectedRef = useRef(selected); selectedRef.current = selected;
  const invRef = useRef(inv); invRef.current = inv;

  useEffect(() => {
    const mount = mountRef.current!;
    const W = mount.clientWidth, H = 520;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x9ad7ff);
    scene.fog = new THREE.Fog(0x9ad7ff, 40, 110);

    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 300);
    camera.position.set(12, 18, 12);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    mount.appendChild(renderer.domElement);

    const sun = new THREE.DirectionalLight(0xfff3d0, 1.1);
    sun.position.set(30, 50, 20);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0x9ab4d0, 0.55));
    scene.add(new THREE.HemisphereLight(0xbfdfff, 0x3a5a2a, 0.4));

    // World data
    const SIZE = 28;
    const blocks = new Map<string, { mesh: THREE.Mesh; type: BlockType }>();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const materials: Record<BlockType, THREE.MeshLambertMaterial> = Object.fromEntries(
      BLOCK_TYPES.map(t => {
        const tex = makeBlockTexture(t);
        const mat = new THREE.MeshLambertMaterial({
          map: tex,
          transparent: t === "glass" || t === "leaves",
          opacity: t === "glass" ? 0.6 : 1,
        });
        return [t, mat];
      })
    ) as any;

    function key(x: number, y: number, z: number) { return `${x},${y},${z}`; }
    function setBlock(x: number, y: number, z: number, type: BlockType | null) {
      const k = key(x, y, z);
      const existing = blocks.get(k);
      if (existing) { scene.remove(existing.mesh); blocks.delete(k); }
      if (type) {
        const mesh = new THREE.Mesh(geom, materials[type]);
        mesh.position.set(x, y, z);
        scene.add(mesh);
        blocks.set(k, { mesh, type });
      }
    }

    // generate terrain — multi-octave value noise
    const heightMap: number[][] = [];
    for (let x = 0; x < SIZE; x++) {
      heightMap[x] = [];
      for (let z = 0; z < SIZE; z++) {
        const h = Math.floor(
          5 +
          Math.sin(x * 0.35) * 2 + Math.cos(z * 0.3) * 2 +
          Math.sin((x + z) * 0.18) * 1.5 +
          Math.cos(x * 0.12 - z * 0.15) * 1.2
        );
        heightMap[x][z] = h;
        for (let y = 0; y < h; y++) {
          const top = y === h - 1;
          const isSand = h <= 3;
          setBlock(x, y, z, top ? (isSand ? "sand" : "grass") : (y > h - 4 ? "dirt" : "stone"));
        }
      }
    }
    // trees
    const treeCount = 8;
    for (let i = 0; i < treeCount; i++) {
      const tx = 2 + Math.floor(Math.random() * (SIZE - 4));
      const tz = 2 + Math.floor(Math.random() * (SIZE - 4));
      const base = heightMap[tx][tz];
      if (base <= 3) continue;
      const trunkH = 3 + Math.floor(Math.random() * 2);
      for (let y = 0; y < trunkH; y++) setBlock(tx, base + y, tz, "wood");
      for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 2; dy++) {
        const d = Math.abs(dx) + Math.abs(dz) + dy;
        if (d > 0 && d < 4 && Math.random() > 0.15) {
          setBlock(tx + dx, base + trunkH + dy, tz + dz, "leaves");
        }
      }
    }
    // scatter a few stone outcrops
    for (let i = 0; i < 4; i++) {
      const sx = Math.floor(Math.random() * SIZE), sz = Math.floor(Math.random() * SIZE);
      const base = heightMap[sx][sz];
      for (let dy = 0; dy < 2; dy++) setBlock(sx, base + dy, sz, "cobble");
    }

    // Mobs (pigs + zombies)
    type Mob = { mesh: THREE.Group; type: "pig"|"zombie"; vx: number; vz: number };
    const mobs: Mob[] = [];
    function makeMob(type: "pig"|"zombie") {
      const g = new THREE.Group();
      const color = type === "pig" ? 0xf8a8c4 : 0x3a7a3a;
      const body = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.6, 1.2), new THREE.MeshLambertMaterial({ color }));
      body.position.y = 0.5; g.add(body);
      const head = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.6, 0.6), new THREE.MeshLambertMaterial({ color }));
      head.position.set(0, 0.9, type === "pig" ? 0.7 : 0); g.add(head);
      g.position.set(Math.random() * SIZE, 8, Math.random() * SIZE);
      scene.add(g);
      mobs.push({ mesh: g, type, vx: (Math.random()-0.5)*0.02, vz: (Math.random()-0.5)*0.02 });
    }
    for (let i = 0; i < 5; i++) makeMob("pig");
    for (let i = 0; i < 3; i++) makeMob("zombie");

    // First-person controls
    const player = { x: SIZE/2, y: 16, z: SIZE/2, vy: 0, yaw: 0, pitch: 0, onGround: false };
    const keys: Record<string, boolean> = {};
    const onKeyDown = (e: KeyboardEvent) => {
      keys[e.code] = true;
      if (e.code === "Space" && player.onGround) { player.vy = 0.18; player.onGround = false; }
      if (e.code.startsWith("Digit")) {
        const i = Number(e.code.replace("Digit","")) - 1;
        if (BLOCK_TYPES[i]) setSelected(BLOCK_TYPES[i]);
      }
    };
    const onKeyUp = (e: KeyboardEvent) => { keys[e.code] = false; };
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);

    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      player.yaw -= e.movementX * 0.002;
      player.pitch -= e.movementY * 0.002;
      player.pitch = Math.max(-Math.PI/2 + 0.01, Math.min(Math.PI/2 - 0.01, player.pitch));
    };
    document.addEventListener("mousemove", onMouseMove);

    const onClickCanvas = () => { renderer.domElement.requestPointerLock(); };
    renderer.domElement.addEventListener("click", onClickCanvas);
    const onLockChange = () => setLocked(document.pointerLockElement === renderer.domElement);
    document.addEventListener("pointerlockchange", onLockChange);

    // Ray-pick block under crosshair
    const raycaster = new THREE.Raycaster();
    function pickBlock() {
      raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
      const meshes = Array.from(blocks.values()).map(b => b.mesh);
      const hits = raycaster.intersectObjects(meshes);
      return hits[0] || null;
    }
    const onMouseDown = (e: MouseEvent) => {
      if (document.pointerLockElement !== renderer.domElement) return;
      const hit = pickBlock();
      if (!hit) return;
      const dist = hit.distance;
      if (dist > 6) return;
      const pos = hit.object.position;
      if (e.button === 0) {
        // break
        const k = key(pos.x, pos.y, pos.z);
        const b = blocks.get(k);
        if (b) {
          setBlock(pos.x, pos.y, pos.z, null);
          const drop = b.type === "grass" ? "dirt" : b.type;
          setInv(prev => ({ ...prev, [drop]: (prev[drop] || 0) + 1 }));
        }
      } else if (e.button === 2) {
        // place
        const sel = selectedRef.current;
        if ((invRef.current[sel] || 0) <= 0) return;
        const n = hit.face!.normal;
        const nx = pos.x + Math.round(n.x);
        const ny = pos.y + Math.round(n.y);
        const nz = pos.z + Math.round(n.z);
        // dont place inside player
        if (Math.abs(nx - player.x) < 0.7 && Math.abs(nz - player.z) < 0.7 && (ny === Math.floor(player.y) || ny === Math.floor(player.y) - 1)) return;
        setBlock(nx, ny, nz, sel);
        setInv(prev => ({ ...prev, [sel]: prev[sel] - 1 }));
      }
    };
    renderer.domElement.addEventListener("mousedown", onMouseDown);
    renderer.domElement.addEventListener("contextmenu", (e) => e.preventDefault());

    // Game loop
    let raf = 0;
    let last = performance.now();
    const tick = () => {
      const now = performance.now();
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;

      // movement
      const speed = 5 * dt;
      const fx = Math.sin(player.yaw), fz = Math.cos(player.yaw);
      let dx = 0, dz = 0;
      if (keys["KeyW"]) { dx -= fx; dz -= fz; }
      if (keys["KeyS"]) { dx += fx; dz += fz; }
      if (keys["KeyA"]) { dx -= fz; dz += fx; }
      if (keys["KeyD"]) { dx += fz; dz -= fx; }
      const len = Math.hypot(dx, dz);
      if (len > 0) { dx = dx/len * speed; dz = dz/len * speed; }

      // simple AABB collision against blocks
      const tryMove = (nx: number, ny: number, nz: number) => {
        const minX = Math.floor(nx - 0.3), maxX = Math.floor(nx + 0.3);
        const minY = Math.floor(ny - 1.6), maxY = Math.floor(ny);
        const minZ = Math.floor(nz - 0.3), maxZ = Math.floor(nz + 0.3);
        for (let x = minX; x <= maxX; x++)
          for (let y = minY; y <= maxY; y++)
            for (let z = minZ; z <= maxZ; z++)
              if (blocks.has(key(x, y, z))) return false;
        return true;
      };
      if (tryMove(player.x + dx, player.y, player.z)) player.x += dx;
      if (tryMove(player.x, player.y, player.z + dz)) player.z += dz;
      // gravity
      player.vy -= 0.012;
      const ny = player.y + player.vy;
      if (tryMove(player.x, ny, player.z)) { player.y = ny; player.onGround = false; }
      else { if (player.vy < 0) player.onGround = true; player.vy = 0; }
      if (player.y < -10) { player.y = 15; player.x = 8; player.z = 8; }

      camera.position.set(player.x, player.y, player.z);
      const dir = new THREE.Vector3(
        -Math.sin(player.yaw) * Math.cos(player.pitch),
        Math.sin(player.pitch),
        -Math.cos(player.yaw) * Math.cos(player.pitch),
      );
      camera.lookAt(camera.position.clone().add(dir));

      // mob wander + zombie chase
      for (const m of mobs) {
        if (m.type === "zombie") {
          const dxm = player.x - m.mesh.position.x;
          const dzm = player.z - m.mesh.position.z;
          const d = Math.hypot(dxm, dzm) || 1;
          m.mesh.position.x += (dxm/d) * 0.015;
          m.mesh.position.z += (dzm/d) * 0.015;
        } else {
          m.mesh.position.x += m.vx; m.mesh.position.z += m.vz;
          if (Math.random() < 0.005) { m.vx = (Math.random()-0.5)*0.02; m.vz = (Math.random()-0.5)*0.02; }
        }
        // basic gravity for mob
        const mx = Math.floor(m.mesh.position.x), mz = Math.floor(m.mesh.position.z);
        let groundY = 0;
        for (let y = 12; y >= 0; y--) if (blocks.has(key(mx, y, mz))) { groundY = y + 1; break; }
        m.mesh.position.y += (groundY - m.mesh.position.y) * 0.2;
        m.mesh.lookAt(camera.position.x, m.mesh.position.y, camera.position.z);
      }

      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerlockchange", onLockChange);
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div className="space-y-2">
      <div ref={mountRef} className="w-full rounded-xl overflow-hidden border border-border bg-sky-300 relative">
        {!locked && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40 text-white text-center pointer-events-none">
            <div>
              <p className="font-bold">Click to play</p>
              <p className="text-xs">WASD move · Space jump · Mouse look · Left-click break · Right-click place · 1-7 select · ESC unlock</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex gap-1 justify-center flex-wrap">
        {BLOCK_TYPES.map((t, i) => (
          <button
            key={t}
            onClick={() => setSelected(t)}
            className={`w-14 h-14 rounded border-2 flex flex-col items-center justify-center text-[10px] font-mono ${selected === t ? "border-primary" : "border-border"}`}
            style={{ background: `#${BLOCK_COLORS[t].toString(16).padStart(6,"0")}` }}
          >
            <span className="text-white" style={{ textShadow: "1px 1px 2px black" }}>{i+1} {t}</span>
            <span className="text-white" style={{ textShadow: "1px 1px 2px black" }}>{inv[t]}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
