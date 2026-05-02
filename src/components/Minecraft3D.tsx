import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { Button } from "@/components/ui/button";

const BLOCK_TYPES = ["grass","dirt","stone","wood","leaves","sand","plank"] as const;
type BlockType = typeof BLOCK_TYPES[number];
const BLOCK_COLORS: Record<BlockType, number> = {
  grass: 0x5d9b3a, dirt: 0x8b5a2b, stone: 0x7a7a7a,
  wood: 0x5b3a1c, leaves: 0x3e7a2e, sand: 0xe8d589, plank: 0xc08a4a,
};

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
    const W = mount.clientWidth, H = 480;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x87ceeb);
    scene.fog = new THREE.Fog(0x87ceeb, 30, 80);

    const camera = new THREE.PerspectiveCamera(75, W / H, 0.1, 200);
    camera.position.set(8, 12, 8);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(W, H);
    mount.appendChild(renderer.domElement);

    const sun = new THREE.DirectionalLight(0xffffff, 1.2);
    sun.position.set(20, 30, 10);
    scene.add(sun);
    scene.add(new THREE.AmbientLight(0xffffff, 0.5));

    // World data
    const SIZE = 16;
    const blocks = new Map<string, { mesh: THREE.Mesh; type: BlockType }>();
    const geom = new THREE.BoxGeometry(1, 1, 1);
    const materials: Record<BlockType, THREE.MeshLambertMaterial> = Object.fromEntries(
      BLOCK_TYPES.map(t => [t, new THREE.MeshLambertMaterial({ color: BLOCK_COLORS[t] })])
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

    // generate terrain
    for (let x = 0; x < SIZE; x++) {
      for (let z = 0; z < SIZE; z++) {
        const h = Math.floor(3 + Math.sin(x * 0.5) * 1.5 + Math.cos(z * 0.4) * 1.5);
        for (let y = 0; y < h; y++) setBlock(x, y, z, y === h - 1 ? "grass" : y > h - 3 ? "dirt" : "stone");
      }
    }
    // a tree
    for (let y = 0; y < 4; y++) setBlock(8, 5 + y, 8, "wood");
    for (let dx = -2; dx <= 2; dx++) for (let dz = -2; dz <= 2; dz++) for (let dy = 0; dy <= 1; dy++) {
      if (Math.abs(dx) + Math.abs(dz) + dy < 4) setBlock(8 + dx, 9 + dy, 8 + dz, "leaves");
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
    for (let i = 0; i < 3; i++) makeMob("pig");
    for (let i = 0; i < 2; i++) makeMob("zombie");

    // First-person controls
    const player = { x: 8, y: 10, z: 8, vy: 0, yaw: 0, pitch: 0, onGround: false };
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
