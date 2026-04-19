"use client";

import { useRef, useEffect, useCallback } from "react";
import { LiveMatchContext } from "@/lib/match-engine";
import { FORMATION_POSITIONS, FormationType } from "@/types/tactics";

// ════════════════════════════════════════════════════════
//  TYPES & CONSTANTS
// ════════════════════════════════════════════════════════

interface Match2DCanvasProps {
  ctx: LiveMatchContext;
  homeFormation?: FormationType;
  awayFormation?: FormationType;
  className?: string;
}

interface Vec2 { x: number; y: number; }

interface PlayerState {
  id: string;
  name: string;
  position: string;
  isGK: boolean;
  isHome: boolean;
  current: Vec2;
  target: Vec2;
  stamina: number;
  jerseyNum: number;
}

interface BallState {
  current: Vec2;
  target: Vec2;
  carrier: number; // index into allPlayers, -1 = free
  trail: Vec2[];
}

interface SceneState {
  type: string;
  startTime: number;
  duration: number;
  data?: Record<string, unknown>;
}

// Virtual pitch coordinates (0-1000 x 0-680)
const PITCH_W = 1000;
const PITCH_H = 680;
const GOAL_W = 80;
const GOAL_H = 28;
const PEN_W = 200;
const PEN_H = 80;
const CENTER_R = 72;
const CORNER_R = 12;
const PLAYER_RADIUS = 12;
const BALL_RADIUS = 6;
const LERP_SPEED = 0.04; // base interpolation speed per frame
const BALL_LERP = 0.07;

// Colors
const PITCH_GREEN_1 = "#2d7a3a";
const PITCH_GREEN_2 = "#267032";
const LINE_COLOR = "rgba(255,255,255,0.55)";
const LINE_WIDTH = 1.8;

// ════════════════════════════════════════════════════════
//  MATH HELPERS
// ════════════════════════════════════════════════════════

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: lerp(a.x, b.x, t), y: lerp(a.y, b.y, t) };
}

function dist(a: Vec2, b: Vec2): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

// Seeded pseudo-random for deterministic jitter
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

// ════════════════════════════════════════════════════════
//  FORMATION → PITCH COORDINATES
// ════════════════════════════════════════════════════════

function formationToPitch(fx: number, fy: number, isHome: boolean): Vec2 {
  // Formation coords: x=0-100 (left-right), y=0-100 (0=attacking end, 100=own goal)
  // Pitch coords: 0-PITCH_W, 0-PITCH_H (0,0=top-left)
  // Home team plays bottom half (attacks toward top)
  // Away team plays top half (attacks toward bottom)
  const margin = 40;
  const usableW = PITCH_W - margin * 2;
  const usableH = PITCH_H / 2 - margin;

  if (isHome) {
    // Home: own goal at bottom (y=PITCH_H), attacks toward top
    return {
      x: margin + (fx / 100) * usableW,
      y: PITCH_H / 2 + margin + ((100 - fy) / 100) * usableH * -1 + usableH,
    };
  } else {
    // Away: own goal at top (y=0), attacks toward bottom — mirror
    return {
      x: margin + ((100 - fx) / 100) * usableW,
      y: margin + ((100 - fy) / 100) * usableH,
    };
  }
}

// ════════════════════════════════════════════════════════
//  COMPUTE TARGET POSITIONS BASED ON GAME STATE
// ════════════════════════════════════════════════════════

function computeTargets(
  ctx: LiveMatchContext,
  homeFormation: FormationType | undefined,
  awayFormation: FormationType | undefined,
  allPlayers: PlayerState[],
  ball: BallState,
): void {
  const isHomeAtk = ctx.attackingTeamId === ctx.homeTeam.id;
  const zone = ctx.ballZone;

  // Phase shift: how much the entire team pushes forward/back
  // -15 = push forward, +10 = sit back
  const atkPhase = -12;
  const defPhase = 8;

  const homeSlots = homeFormation ? FORMATION_POSITIONS[homeFormation] : null;
  const awaySlots = awayFormation ? FORMATION_POSITIONS[awayFormation] : null;

  // Ball zone → Y position on pitch
  const zoneY: Record<string, number> = {
    home_defense: PITCH_H * 0.82,
    home_midfield: PITCH_H * 0.65,
    center: PITCH_H * 0.50,
    away_midfield: PITCH_H * 0.35,
    away_defense: PITCH_H * 0.18,
  };
  const ballTargetY = zoneY[zone] ?? PITCH_H * 0.5;
  const ballTargetX = PITCH_W * 0.5 + (seededRandom(ctx.currentMinute * 17 + 3) - 0.5) * 200;

  ball.target = { x: ballTargetX, y: ballTargetY };

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    const isHome = p.isHome;
    const slots = isHome ? homeSlots : awaySlots;
    const players = isHome ? ctx.homePlayers : ctx.awayPlayers;
    const localIdx = players.findIndex(pl => pl.id === p.id);

    if (localIdx < 0 || !slots || localIdx >= slots.length) {
      // Fallback position
      p.target = formationToPitch(
        ((localIdx + 1) / (players.length + 1)) * 100,
        50,
        isHome,
      );
      continue;
    }

    const slot = slots[localIdx];
    const base = formationToPitch(slot.x, slot.y, isHome);

    // Apply phase shift based on attacking/defending
    const isTeamAtk = isHome ? isHomeAtk : !isHomeAtk;
    const phaseShift = isTeamAtk ? atkPhase : defPhase;
    const yShift = isHome ? -phaseShift : phaseShift;

    // Ball magnet: players drift toward ball
    const ballDist = Math.abs(ball.target.y - base.y);
    const pullStrength = Math.max(0, 1 - ballDist / (PITCH_H * 0.5)) * 25;
    const pullDir = ball.target.y > base.y ? 1 : -1;

    // Lateral pull toward ball X
    const xPull = (ball.target.x - base.x) * 0.06;

    // Per-player jitter for natural movement
    const jSeed = ctx.currentMinute * 100 + i * 7;
    const jx = (seededRandom(jSeed) - 0.5) * 18;
    const jy = (seededRandom(jSeed + 1) - 0.5) * 14;

    // GK stays close to goal
    if (p.isGK) {
      const gkY = isHome ? PITCH_H - 30 : 30;
      const gkX = PITCH_W / 2 + (ball.target.x - PITCH_W / 2) * 0.15;
      p.target = { x: clamp(gkX, PITCH_W / 2 - 60, PITCH_W / 2 + 60), y: gkY };
      continue;
    }

    p.target = {
      x: clamp(base.x + xPull + jx, 30, PITCH_W - 30),
      y: clamp(base.y + yShift + pullDir * pullStrength + jy, 30, PITCH_H - 30),
    };
  }

  // Ball carrier: the attacker closest to the ball
  const atkPlayers = allPlayers.filter(p => {
    if (p.isGK) return false;
    return (isHomeAtk && p.isHome) || (!isHomeAtk && !p.isHome);
  });
  if (atkPlayers.length > 0) {
    let closest = atkPlayers[0];
    let minD = dist(closest.target, ball.target);
    for (const ap of atkPlayers) {
      const d = dist(ap.target, ball.target);
      if (d < minD) { minD = d; closest = ap; }
    }
    ball.carrier = allPlayers.indexOf(closest);
  }
}

// ════════════════════════════════════════════════════════
//  PITCH DRAWING
// ════════════════════════════════════════════════════════

function drawPitch(c: CanvasRenderingContext2D, w: number, h: number): void {
  const sx = w / PITCH_W;
  const sy = h / PITCH_H;

  // Mow stripes
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    c.fillStyle = i % 2 === 0 ? PITCH_GREEN_1 : PITCH_GREEN_2;
    c.fillRect(0, (i / stripes) * h, w, h / stripes + 1);
  }

  c.strokeStyle = LINE_COLOR;
  c.lineWidth = LINE_WIDTH * sx;

  // Outline
  c.strokeRect(2 * sx, 2 * sy, (PITCH_W - 4) * sx, (PITCH_H - 4) * sy);

  // Center line
  c.beginPath();
  c.moveTo(0, h / 2);
  c.lineTo(w, h / 2);
  c.stroke();

  // Center circle
  c.beginPath();
  c.arc(w / 2, h / 2, CENTER_R * sx, 0, Math.PI * 2);
  c.stroke();

  // Center dot
  c.fillStyle = LINE_COLOR;
  c.beginPath();
  c.arc(w / 2, h / 2, 3 * sx, 0, Math.PI * 2);
  c.fill();

  // Top penalty area
  const topPenX = (PITCH_W / 2 - PEN_W / 2) * sx;
  c.strokeRect(topPenX, 2 * sy, PEN_W * sx, PEN_H * sy);
  // Top goal area
  const topGoalX = (PITCH_W / 2 - GOAL_W / 2) * sx;
  c.strokeRect(topGoalX, 2 * sy, GOAL_W * sx, GOAL_H * sy);
  // Top penalty spot
  c.beginPath();
  c.arc(w / 2, (PEN_H - 12) * sy, 2.5 * sx, 0, Math.PI * 2);
  c.fill();
  // Top penalty arc
  c.beginPath();
  c.arc(w / 2, (PEN_H - 12) * sy, 36 * sx, 0.25 * Math.PI, 0.75 * Math.PI);
  c.stroke();

  // Bottom penalty area
  const botPenY = (PITCH_H - PEN_H) * sy;
  c.strokeRect(topPenX, botPenY, PEN_W * sx, PEN_H * sy - 2 * sy);
  // Bottom goal area
  c.strokeRect(topGoalX, (PITCH_H - GOAL_H) * sy, GOAL_W * sx, GOAL_H * sy - 2 * sy);
  // Bottom penalty spot
  c.beginPath();
  c.arc(w / 2, (PITCH_H - PEN_H + 12) * sy, 2.5 * sx, 0, Math.PI * 2);
  c.fill();
  // Bottom penalty arc
  c.beginPath();
  c.arc(w / 2, (PITCH_H - PEN_H + 12) * sy, 36 * sx, 1.25 * Math.PI, 1.75 * Math.PI);
  c.stroke();

  // Corner arcs
  const cr = CORNER_R * sx;
  c.beginPath(); c.arc(0, 0, cr, 0, 0.5 * Math.PI); c.stroke();
  c.beginPath(); c.arc(w, 0, cr, 0.5 * Math.PI, Math.PI); c.stroke();
  c.beginPath(); c.arc(0, h, cr, 1.5 * Math.PI, 2 * Math.PI); c.stroke();
  c.beginPath(); c.arc(w, h, cr, Math.PI, 1.5 * Math.PI); c.stroke();

  // Goal nets (behind goal lines)
  c.fillStyle = "rgba(255,255,255,0.06)";
  const netDepth = 16 * sy;
  c.fillRect(topGoalX, 0, GOAL_W * sx, netDepth);
  c.fillRect(topGoalX, h - netDepth, GOAL_W * sx, netDepth);

  // Net pattern
  c.strokeStyle = "rgba(255,255,255,0.08)";
  c.lineWidth = 0.5;
  for (let nx = 0; nx < 8; nx++) {
    const xx = topGoalX + (nx / 7) * GOAL_W * sx;
    c.beginPath(); c.moveTo(xx, 0); c.lineTo(xx, netDepth); c.stroke();
    c.beginPath(); c.moveTo(xx, h - netDepth); c.lineTo(xx, h); c.stroke();
  }
}

// ════════════════════════════════════════════════════════
//  PLAYER DRAWING
// ════════════════════════════════════════════════════════

function drawPlayer(
  c: CanvasRenderingContext2D,
  p: PlayerState,
  sx: number, sy: number,
  homeColors: { primary: string; secondary: string },
  awayColors: { primary: string; secondary: string },
  isBallCarrier: boolean,
): void {
  const x = p.current.x * sx;
  const y = p.current.y * sy;
  const r = PLAYER_RADIUS * sx;

  // Shadow
  c.fillStyle = "rgba(0,0,0,0.25)";
  c.beginPath();
  c.ellipse(x + 2 * sx, y + 3 * sy, r * 0.85, r * 0.45, 0, 0, Math.PI * 2);
  c.fill();

  // Jersey (main circle)
  const colors = p.isHome ? homeColors : awayColors;
  const baseColor = p.isGK ? (p.isHome ? "#1a6b2a" : "#8b6914") : colors.primary;

  // Glow if ball carrier
  if (isBallCarrier) {
    c.shadowColor = "rgba(255,255,255,0.5)";
    c.shadowBlur = 10 * sx;
  }

  c.fillStyle = baseColor;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();

  // Reset shadow
  c.shadowColor = "transparent";
  c.shadowBlur = 0;

  // Border ring
  c.strokeStyle = p.isGK ? "rgba(255,255,255,0.6)" : colors.secondary;
  c.lineWidth = 1.5 * sx;
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.stroke();

  // Stamina indicator (colored arc at bottom)
  const stamPct = clamp(p.stamina / 100, 0, 1);
  if (stamPct < 0.6) {
    const stamColor = stamPct < 0.3 ? "#ef4444" : "#eab308";
    c.strokeStyle = stamColor;
    c.lineWidth = 2 * sx;
    c.beginPath();
    c.arc(x, y, r + 2 * sx, 0.6 * Math.PI, 0.6 * Math.PI + stamPct * 1.8 * Math.PI);
    c.stroke();
  }

  // Jersey number
  c.fillStyle = "#fff";
  c.font = `bold ${Math.round(9 * sx)}px Inter, sans-serif`;
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText(String(p.jerseyNum), x, y);

  // Name label (above)
  c.fillStyle = "rgba(255,255,255,0.75)";
  c.font = `600 ${Math.round(7 * sx)}px Inter, sans-serif`;
  c.fillText(p.name, x, y - r - 5 * sy);
}

// ════════════════════════════════════════════════════════
//  BALL DRAWING
// ════════════════════════════════════════════════════════

function drawBall(c: CanvasRenderingContext2D, ball: BallState, sx: number, sy: number): void {
  const x = ball.current.x * sx;
  const y = ball.current.y * sy;
  const r = BALL_RADIUS * sx;

  // Trail
  if (ball.trail.length > 1) {
    c.strokeStyle = "rgba(255,255,255,0.12)";
    c.lineWidth = 2 * sx;
    c.beginPath();
    c.moveTo(ball.trail[0].x * sx, ball.trail[0].y * sy);
    for (let i = 1; i < ball.trail.length; i++) {
      c.lineTo(ball.trail[i].x * sx, ball.trail[i].y * sy);
    }
    c.stroke();
  }

  // Shadow
  c.fillStyle = "rgba(0,0,0,0.3)";
  c.beginPath();
  c.ellipse(x + 1.5 * sx, y + 2.5 * sy, r * 0.8, r * 0.4, 0, 0, Math.PI * 2);
  c.fill();

  // Ball glow
  c.shadowColor = "rgba(255,255,255,0.4)";
  c.shadowBlur = 6 * sx;

  // Ball body
  c.fillStyle = "#fff";
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();

  // Ball pattern (pentagon shapes)
  c.fillStyle = "rgba(0,0,0,0.15)";
  for (let a = 0; a < 5; a++) {
    const angle = (a / 5) * Math.PI * 2 - Math.PI / 2;
    const px = x + Math.cos(angle) * r * 0.5;
    const py = y + Math.sin(angle) * r * 0.5;
    c.beginPath();
    c.arc(px, py, r * 0.2, 0, Math.PI * 2);
    c.fill();
  }

  c.shadowColor = "transparent";
  c.shadowBlur = 0;
}

// ════════════════════════════════════════════════════════
//  EVENT FLASH OVERLAY
// ════════════════════════════════════════════════════════

function drawEventFlash(
  c: CanvasRenderingContext2D, w: number, h: number,
  scene: SceneState | null, now: number,
): void {
  if (!scene) return;
  const elapsed = now - scene.startTime;
  if (elapsed > scene.duration) return;

  const progress = elapsed / scene.duration;

  if (scene.type === "goal") {
    // White flash that fades out
    const alpha = Math.max(0, 0.4 * (1 - progress));
    c.fillStyle = `rgba(255,255,255,${alpha})`;
    c.fillRect(0, 0, w, h);

    // "GOAL" text
    if (progress < 0.7) {
      const textAlpha = progress < 0.1 ? progress / 0.1 : progress > 0.5 ? (0.7 - progress) / 0.2 : 1;
      const scale = 1 + progress * 0.3;
      c.save();
      c.translate(w / 2, h / 2);
      c.scale(scale, scale);
      c.fillStyle = `rgba(255,255,255,${textAlpha * 0.9})`;
      c.font = `900 ${Math.round(w * 0.08)}px Oswald, sans-serif`;
      c.textAlign = "center";
      c.textBaseline = "middle";
      c.fillText("GOAL!", 0, 0);
      c.restore();
    }
  } else if (scene.type === "shot_saved" || scene.type === "shot_post" || scene.type === "shot_missed") {
    // Quick amber flash
    const alpha = Math.max(0, 0.2 * (1 - progress));
    c.fillStyle = `rgba(255,180,0,${alpha})`;
    c.fillRect(0, 0, w, h);
  } else if (scene.type === "red_card" || scene.type === "second_yellow") {
    // Red flash
    const alpha = Math.max(0, 0.3 * (1 - progress));
    c.fillStyle = `rgba(255,50,50,${alpha})`;
    c.fillRect(0, 0, w, h);
  }
}

// ════════════════════════════════════════════════════════
//  VIGNETTE OVERLAY
// ════════════════════════════════════════════════════════

function drawVignette(c: CanvasRenderingContext2D, w: number, h: number): void {
  const grad = c.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.7);
  grad.addColorStop(0, "rgba(0,0,0,0)");
  grad.addColorStop(1, "rgba(0,0,0,0.35)");
  c.fillStyle = grad;
  c.fillRect(0, 0, w, h);
}

// ════════════════════════════════════════════════════════
//  MAIN COMPONENT
// ════════════════════════════════════════════════════════

export function Match2DCanvas({ ctx, homeFormation, awayFormation, className }: Match2DCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number>(0);
  const playersRef = useRef<PlayerState[]>([]);
  const ballRef = useRef<BallState>({
    current: { x: PITCH_W / 2, y: PITCH_H / 2 },
    target: { x: PITCH_W / 2, y: PITCH_H / 2 },
    carrier: -1,
    trail: [],
  });
  const sceneRef = useRef<SceneState | null>(null);
  const lastMinuteRef = useRef(-1);
  const lastEventCountRef = useRef(0);
  const nextPassTimeRef = useRef(0);
  const wanderSeedRef = useRef(0);

  // Initialize player states from context
  const initPlayers = useCallback(() => {
    const players: PlayerState[] = [];

    ctx.homePlayers.forEach((p, i) => {
      players.push({
        id: p.id,
        name: p.lastName.length > 8 ? p.lastName.substring(0, 7) + "." : p.lastName,
        position: p.position,
        isGK: p.position === "TW",
        isHome: true,
        current: formationToPitch(50, 50, true),
        target: formationToPitch(50, 50, true),
        stamina: ctx.stamina[p.id] ?? 80,
        jerseyNum: i + 1,
      });
    });

    ctx.awayPlayers.forEach((p, i) => {
      players.push({
        id: p.id,
        name: p.lastName.length > 8 ? p.lastName.substring(0, 7) + "." : p.lastName,
        position: p.position,
        isGK: p.position === "TW",
        isHome: false,
        current: formationToPitch(50, 50, false),
        target: formationToPitch(50, 50, false),
        stamina: ctx.stamina[p.id] ?? 80,
        jerseyNum: i + 1,
      });
    });

    return players;
  }, [ctx.homePlayers, ctx.awayPlayers, ctx.stamina]);

  // Detect new events for scene triggers
  const checkForNewEvents = useCallback(() => {
    const events = ctx.events;
    if (events.length > lastEventCountRef.current) {
      const newEvents = events.slice(lastEventCountRef.current);
      lastEventCountRef.current = events.length;

      // Find the most important new event
      for (const ev of newEvents) {
        if (["goal", "penalty_scored", "free_kick_goal"].includes(ev.type)) {
          sceneRef.current = { type: "goal", startTime: performance.now(), duration: 2500 };
          break;
        } else if (["shot_saved", "shot_post", "shot_missed", "shot_blocked"].includes(ev.type)) {
          sceneRef.current = { type: ev.type, startTime: performance.now(), duration: 1200 };
          break;
        } else if (["red_card", "second_yellow"].includes(ev.type)) {
          sceneRef.current = { type: ev.type, startTime: performance.now(), duration: 1500 };
          break;
        }
      }
    }
  }, [ctx.events]);

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const c = canvas.getContext("2d");
    if (!c) return;

    // Initialize if needed
    if (playersRef.current.length === 0) {
      playersRef.current = initPlayers();
    }

    // Update on minute change: recalculate targets
    if (ctx.currentMinute !== lastMinuteRef.current) {
      lastMinuteRef.current = ctx.currentMinute;

      // Update stamina
      for (const ps of playersRef.current) {
        ps.stamina = ctx.stamina[ps.id] ?? 80;
      }

      // Sync player lists (handle substitutions)
      const currentIds = new Set([
        ...ctx.homePlayers.map(p => p.id),
        ...ctx.awayPlayers.map(p => p.id),
      ]);
      // Remove players no longer on pitch
      playersRef.current = playersRef.current.filter(ps => currentIds.has(ps.id));
      // Add new players (subs)
      for (const p of ctx.homePlayers) {
        if (!playersRef.current.find(ps => ps.id === p.id)) {
          const idx = ctx.homePlayers.indexOf(p);
          playersRef.current.push({
            id: p.id,
            name: p.lastName.length > 8 ? p.lastName.substring(0, 7) + "." : p.lastName,
            position: p.position, isGK: p.position === "TW", isHome: true,
            current: { x: PITCH_W / 2, y: PITCH_H - 40 },
            target: { x: PITCH_W / 2, y: PITCH_H - 40 },
            stamina: ctx.stamina[p.id] ?? 80, jerseyNum: idx + 1,
          });
        }
      }
      for (const p of ctx.awayPlayers) {
        if (!playersRef.current.find(ps => ps.id === p.id)) {
          const idx = ctx.awayPlayers.indexOf(p);
          playersRef.current.push({
            id: p.id,
            name: p.lastName.length > 8 ? p.lastName.substring(0, 7) + "." : p.lastName,
            position: p.position, isGK: p.position === "TW", isHome: false,
            current: { x: PITCH_W / 2, y: 40 },
            target: { x: PITCH_W / 2, y: 40 },
            stamina: ctx.stamina[p.id] ?? 80, jerseyNum: idx + 1,
          });
        }
      }

      computeTargets(ctx, homeFormation, awayFormation, playersRef.current, ballRef.current);
      checkForNewEvents();
    }

    // Animation loop
    let lastTime = performance.now();

    function frame(now: number) {
      if (!canvas || !c) return;
      const dt = Math.min(now - lastTime, 50); // cap delta at 50ms
      lastTime = now;
      const dtFactor = dt / 16.67; // normalize to 60fps

      // Resize canvas to match CSS size
      const rect = canvas.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;
      const cw = Math.round(rect.width * dpr);
      const ch = Math.round(rect.height * dpr);
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      const w = cw;
      const h = ch;
      const sx = w / PITCH_W;
      const sy = h / PITCH_H;

      // ── Micro-wandering: add continuous slight drift to targets ──
      wanderSeedRef.current += dt * 0.001;
      const wt = wanderSeedRef.current;
      for (let i = 0; i < playersRef.current.length; i++) {
        const p = playersRef.current[i];
        if (p.isGK) continue;
        // Perlin-like sinusoidal wandering
        const wx = Math.sin(wt * 1.3 + i * 2.7) * 6 + Math.sin(wt * 0.7 + i * 4.1) * 3;
        const wy = Math.cos(wt * 1.1 + i * 3.3) * 5 + Math.cos(wt * 0.5 + i * 1.9) * 2;
        const wanderTarget = {
          x: clamp(p.target.x + wx, 30, PITCH_W - 30),
          y: clamp(p.target.y + wy, 30, PITCH_H - 30),
        };
        p.current = lerpVec(p.current, wanderTarget, LERP_SPEED * dtFactor);
      }
      // GKs lerp directly to target (no wander)
      for (const p of playersRef.current) {
        if (p.isGK) p.current = lerpVec(p.current, p.target, LERP_SPEED * dtFactor * 0.8);
      }

      // ── Ball passing: periodically switch carrier to a nearby teammate ──
      const ball = ballRef.current;
      if (now > nextPassTimeRef.current && ball.carrier >= 0 && ball.carrier < playersRef.current.length) {
        const carrier = playersRef.current[ball.carrier];
        const teammates = playersRef.current.filter(p =>
          p.isHome === carrier.isHome && p.id !== carrier.id && !p.isGK
        );
        if (teammates.length > 0) {
          // Pick a nearby teammate (weighted random: closer = more likely)
          const dists = teammates.map(t => ({ t, d: Math.max(30, dist(carrier.current, t.current)) }));
          dists.sort((a, b) => a.d - b.d);
          // Pick from top 3 closest
          const candidates = dists.slice(0, Math.min(3, dists.length));
          const pick = candidates[Math.floor(seededRandom(now * 0.01) * candidates.length)];
          if (pick) {
            ball.carrier = playersRef.current.indexOf(pick.t);
          }
        }
        // Next pass in 1.5-3.5 seconds
        nextPassTimeRef.current = now + 1500 + seededRandom(now * 0.003) * 2000;
      }

      // Interpolate ball
      const ballLerp = BALL_LERP * dtFactor;

      // Ball follows carrier
      if (ball.carrier >= 0 && ball.carrier < playersRef.current.length) {
        const carrier = playersRef.current[ball.carrier];
        const carrierPos = { x: carrier.current.x + 8, y: carrier.current.y + 4 };
        ball.current = lerpVec(ball.current, carrierPos, ballLerp * 1.5);
      } else {
        ball.current = lerpVec(ball.current, ball.target, ballLerp);
      }

      // Ball trail
      ball.trail.push({ ...ball.current });
      if (ball.trail.length > 12) ball.trail.shift();

      // ── DRAW ──
      c.clearRect(0, 0, w, h);

      // Pitch
      drawPitch(c, w, h);

      // Players
      const homeColors = {
        primary: ctx.homeTeam.colors?.primary ?? "#1C7ED6",
        secondary: ctx.homeTeam.colors?.secondary ?? "#fff",
      };
      const awayColors = {
        primary: ctx.awayTeam.colors?.primary ?? "#E8A317",
        secondary: ctx.awayTeam.colors?.secondary ?? "#fff",
      };

      // Draw away players first (top half), then home (bottom)
      const awayP = playersRef.current.filter(p => !p.isHome);
      const homeP = playersRef.current.filter(p => p.isHome);

      for (const p of awayP) {
        drawPlayer(c, p, sx, sy, homeColors, awayColors, playersRef.current.indexOf(p) === ball.carrier);
      }
      for (const p of homeP) {
        drawPlayer(c, p, sx, sy, homeColors, awayColors, playersRef.current.indexOf(p) === ball.carrier);
      }

      // Ball
      drawBall(c, ball, sx, sy);

      // Vignette
      drawVignette(c, w, h);

      // Event flash overlay
      drawEventFlash(c, w, h, sceneRef.current, now);
      // Clean up expired scenes
      if (sceneRef.current && now - sceneRef.current.startTime > sceneRef.current.duration) {
        sceneRef.current = null;
      }

      // Team labels in top-left / bottom-left
      c.fillStyle = "rgba(255,255,255,0.3)";
      c.font = `600 ${Math.round(10 * sx)}px Oswald, sans-serif`;
      c.textAlign = "left";
      c.fillText(ctx.awayTeam.shortName, 12 * sx, 18 * sy);
      c.fillText(ctx.homeTeam.shortName, 12 * sx, (PITCH_H - 8) * sy);

      // Possession bar at bottom
      const barY = h - 14 * sy;
      const barH = 4 * sy;
      const barX = 40 * sx;
      const barW = w - 80 * sx;
      c.fillStyle = "rgba(0,0,0,0.4)";
      c.fillRect(barX, barY, barW, barH);
      const homePoss = ctx.homeStats.possession / 100;
      c.fillStyle = homeColors.primary;
      c.fillRect(barX, barY, barW * homePoss, barH);
      c.fillStyle = awayColors.primary;
      c.fillRect(barX + barW * homePoss, barY, barW * (1 - homePoss), barH);

      // Possession text
      c.fillStyle = "rgba(255,255,255,0.6)";
      c.font = `bold ${Math.round(7 * sx)}px Inter, sans-serif`;
      c.textAlign = "right";
      c.fillText(`${ctx.homeStats.possession}%`, barX - 4 * sx, barY + barH);
      c.textAlign = "left";
      c.fillText(`${ctx.awayStats.possession}%`, barX + barW + 4 * sx, barY + barH);

      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [ctx, homeFormation, awayFormation, initPlayers, checkForNewEvents]);

  return (
    <canvas
      ref={canvasRef}
      className={`w-full h-full rounded-xl ${className ?? ""}`}
      style={{ display: "block" }}
    />
  );
}
