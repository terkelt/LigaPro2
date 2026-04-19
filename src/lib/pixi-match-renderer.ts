/**
 * PixiJS v8 — 2.5D Isometric Match Renderer (Phase 3 Enhanced)
 *
 * GPU-accelerated football pitch with isometric projection,
 * sprite-based players with position-colored rings, ball trails with arc physics,
 * event camera zoom, weather particles, stadium atmosphere,
 * in-renderer scoreboard, camera shake, scene-data pass/shot lines,
 * commentary overlay, day/night lighting, enhanced crowd animation.
 */

import {
  Application,
  Container,
  Graphics,
  Text,
  TextStyle,
} from "pixi.js";

import type { LiveMatchContext } from "@/lib/match-engine";
import type { FormationType } from "@/types/tactics";
import type { WeatherType, SceneData, SceneStep } from "@/types/match";
import { FORMATION_POSITIONS } from "@/types/tactics";

// ════════════════════════════════════════════════════════
//  CONSTANTS
// ════════════════════════════════════════════════════════

/** Virtual pitch dimensions (world-space, pre-projection) */
const WORLD_W = 1050;
const WORLD_H = 680;

/** Isometric skew factor  (0 = top-down, 0.5 = strong 2.5D) */
const ISO_SKEW = 0.38;

/** Player disc radius in world units */
const PLAYER_R = 13;
const BALL_R = 6;

const LERP_SPEED = 0.045;
const BALL_LERP = 0.075;
const CAMERA_LERP = 0.03;

const PITCH_GREEN_1 = 0x2d7a3a;
const PITCH_GREEN_2 = 0x267032;
const LINE_COLOR = 0xffffff;
const LINE_ALPHA = 0.55;
const LINE_W = 2;

const GOAL_W = 80;
const GOAL_H = 28;
const PEN_W = 200;
const PEN_H = 80;
const CENTER_R = 72;
const CORNER_R = 12;

/** Camera zoom settings */
const ZOOM_DEFAULT = 1.0;
const ZOOM_EVENT = 1.35;
const ZOOM_LERP = 0.025;

// ════════════════════════════════════════════════════════
//  TYPES
// ════════════════════════════════════════════════════════

interface Vec2 {
  x: number;
  y: number;
}

interface PlayerSprite {
  id: string;
  name: string;
  position: string;
  isGK: boolean;
  isHome: boolean;
  current: Vec2;
  target: Vec2;
  stamina: number;
  jerseyNum: number;
  /** PixiJS container for the player disc + label */
  container: Container;
  disc: Graphics;
  shadow: Graphics;
  numText: Text;
  nameText: Text;
  staminaArc: Graphics;
}

interface BallSprite {
  current: Vec2;
  target: Vec2;
  carrier: number;
  trail: Vec2[];
  /** Ball height for arc physics (0 = ground, positive = airborne) */
  height: number;
  heightVel: number;
  /** Ball spin angle for rotation visual */
  spinAngle: number;
  container: Container;
  body: Graphics;
  shadow: Graphics;
  trailGfx: Graphics;
}

export interface PixiMatchRendererHandle {
  destroy(): void;
  resize(w: number, h: number): void;
  updateCtx(
    ctx: LiveMatchContext,
    homeFormation?: FormationType,
    awayFormation?: FormationType,
  ): void;
}

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

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

/** Convert world (flat top-down) coords to isometric screen coords */
function toIso(wx: number, wy: number): Vec2 {
  return {
    x: wx,
    y: wy * (1 - ISO_SKEW),
  };
}

/** Effective pitch height after iso squash */
const ISO_H = WORLD_H * (1 - ISO_SKEW);

// ════════════════════════════════════════════════════════
//  FORMATION → PITCH COORDINATES
// ════════════════════════════════════════════════════════

function formationToPitch(fx: number, fy: number, isHome: boolean): Vec2 {
  const margin = 40;
  const usableW = WORLD_W - margin * 2;
  const usableH = WORLD_H / 2 - margin;

  if (isHome) {
    return {
      x: margin + (fx / 100) * usableW,
      y: WORLD_H / 2 + margin + ((100 - fy) / 100) * usableH * -1 + usableH,
    };
  } else {
    return {
      x: margin + ((100 - fx) / 100) * usableW,
      y: margin + ((100 - fy) / 100) * usableH,
    };
  }
}

// ════════════════════════════════════════════════════════
//  TARGET COMPUTATION  (same logic as Canvas version)
// ════════════════════════════════════════════════════════

function computeTargets(
  ctx: LiveMatchContext,
  homeFormation: FormationType | undefined,
  awayFormation: FormationType | undefined,
  allPlayers: PlayerSprite[],
  ball: BallSprite,
): void {
  const isHomeAtk = ctx.attackingTeamId === ctx.homeTeam.id;
  const zone = ctx.ballZone;

  const atkPhase = -12;
  const defPhase = 8;

  const homeSlots = homeFormation ? FORMATION_POSITIONS[homeFormation] : null;
  const awaySlots = awayFormation ? FORMATION_POSITIONS[awayFormation] : null;

  const zoneY: Record<string, number> = {
    home_defense: WORLD_H * 0.82,
    home_midfield: WORLD_H * 0.65,
    center: WORLD_H * 0.5,
    away_midfield: WORLD_H * 0.35,
    away_defense: WORLD_H * 0.18,
  };
  const ballTargetY = zoneY[zone] ?? WORLD_H * 0.5;
  const ballTargetX =
    WORLD_W * 0.5 + (seededRandom(ctx.currentMinute * 17 + 3) - 0.5) * 200;

  ball.target = { x: ballTargetX, y: ballTargetY };

  for (let i = 0; i < allPlayers.length; i++) {
    const p = allPlayers[i];
    const isHome = p.isHome;
    const slots = isHome ? homeSlots : awaySlots;
    const players = isHome ? ctx.homePlayers : ctx.awayPlayers;
    const localIdx = players.findIndex((pl) => pl.id === p.id);

    if (localIdx < 0 || !slots || localIdx >= slots.length) {
      p.target = formationToPitch(
        ((localIdx + 1) / (players.length + 1)) * 100,
        50,
        isHome,
      );
      continue;
    }

    const slot = slots[localIdx];
    const base = formationToPitch(slot.x, slot.y, isHome);

    const isTeamAtk = isHome ? isHomeAtk : !isHomeAtk;
    const phaseShift = isTeamAtk ? atkPhase : defPhase;
    const yShift = isHome ? -phaseShift : phaseShift;

    const ballDist = Math.abs(ball.target.y - base.y);
    const pullStrength =
      Math.max(0, 1 - ballDist / (WORLD_H * 0.5)) * 25;
    const pullDir = ball.target.y > base.y ? 1 : -1;
    const xPull = (ball.target.x - base.x) * 0.06;

    const jSeed = ctx.currentMinute * 100 + i * 7;
    const jx = (seededRandom(jSeed) - 0.5) * 18;
    const jy = (seededRandom(jSeed + 1) - 0.5) * 14;

    if (p.isGK) {
      const gkY = isHome ? WORLD_H - 30 : 30;
      const gkX =
        WORLD_W / 2 + (ball.target.x - WORLD_W / 2) * 0.15;
      p.target = {
        x: clamp(gkX, WORLD_W / 2 - 60, WORLD_W / 2 + 60),
        y: gkY,
      };
      continue;
    }

    p.target = {
      x: clamp(base.x + xPull + jx, 30, WORLD_W - 30),
      y: clamp(
        base.y + yShift + pullDir * pullStrength + jy,
        30,
        WORLD_H - 30,
      ),
    };
  }

  // Ball carrier: closest attacker
  const atkPlayers = allPlayers.filter((p) => {
    if (p.isGK) return false;
    return (isHomeAtk && p.isHome) || (!isHomeAtk && !p.isHome);
  });
  if (atkPlayers.length > 0) {
    let closest = atkPlayers[0];
    let minD = dist(closest.target, ball.target);
    for (const ap of atkPlayers) {
      const d = dist(ap.target, ball.target);
      if (d < minD) {
        minD = d;
        closest = ap;
      }
    }
    ball.carrier = allPlayers.indexOf(closest);
  }
}

// ════════════════════════════════════════════════════════
//  DRAW PITCH (static Graphics object)
// ════════════════════════════════════════════════════════

function buildPitchGraphics(): Graphics {
  const g = new Graphics();

  // Mow stripes (in world-space; the container will iso-project)
  const stripes = 12;
  for (let i = 0; i < stripes; i++) {
    g.rect(0, (i / stripes) * WORLD_H, WORLD_W, WORLD_H / stripes + 1);
    g.fill({ color: i % 2 === 0 ? PITCH_GREEN_1 : PITCH_GREEN_2 });
  }

  // Helper for line drawing
  const lw = LINE_W;

  g.setStrokeStyle({ width: lw, color: LINE_COLOR, alpha: LINE_ALPHA });

  // Outline
  g.rect(2, 2, WORLD_W - 4, WORLD_H - 4);
  g.stroke();

  // Center line
  g.moveTo(0, WORLD_H / 2);
  g.lineTo(WORLD_W, WORLD_H / 2);
  g.stroke();

  // Center circle
  g.circle(WORLD_W / 2, WORLD_H / 2, CENTER_R);
  g.stroke();

  // Center dot
  g.circle(WORLD_W / 2, WORLD_H / 2, 3);
  g.fill({ color: LINE_COLOR, alpha: LINE_ALPHA });

  // Top penalty area
  const topPenX = WORLD_W / 2 - PEN_W / 2;
  g.rect(topPenX, 2, PEN_W, PEN_H);
  g.stroke();

  // Top goal area
  const topGoalX = WORLD_W / 2 - GOAL_W / 2;
  g.rect(topGoalX, 2, GOAL_W, GOAL_H);
  g.stroke();

  // Top penalty spot
  g.circle(WORLD_W / 2, PEN_H - 12, 2.5);
  g.fill({ color: LINE_COLOR, alpha: LINE_ALPHA });

  // Top penalty arc
  g.arc(WORLD_W / 2, PEN_H - 12, 36, 0.25 * Math.PI, 0.75 * Math.PI);
  g.stroke();

  // Bottom penalty area
  g.rect(topPenX, WORLD_H - PEN_H, PEN_W, PEN_H - 2);
  g.stroke();

  // Bottom goal area
  g.rect(topGoalX, WORLD_H - GOAL_H, GOAL_W, GOAL_H - 2);
  g.stroke();

  // Bottom penalty spot
  g.circle(WORLD_W / 2, WORLD_H - PEN_H + 12, 2.5);
  g.fill({ color: LINE_COLOR, alpha: LINE_ALPHA });

  // Bottom penalty arc
  g.arc(
    WORLD_W / 2,
    WORLD_H - PEN_H + 12,
    36,
    1.25 * Math.PI,
    1.75 * Math.PI,
  );
  g.stroke();

  // Corner arcs
  g.arc(0, 0, CORNER_R, 0, 0.5 * Math.PI);
  g.stroke();
  g.arc(WORLD_W, 0, CORNER_R, 0.5 * Math.PI, Math.PI);
  g.stroke();
  g.arc(0, WORLD_H, CORNER_R, 1.5 * Math.PI, 2 * Math.PI);
  g.stroke();
  g.arc(WORLD_W, WORLD_H, CORNER_R, Math.PI, 1.5 * Math.PI);
  g.stroke();

  // Goal nets (semi-transparent rectangles behind goal lines)
  g.rect(topGoalX, 0, GOAL_W, 16);
  g.fill({ color: 0xffffff, alpha: 0.06 });
  g.rect(topGoalX, WORLD_H - 16, GOAL_W, 16);
  g.fill({ color: 0xffffff, alpha: 0.06 });

  // Net mesh lines
  g.setStrokeStyle({ width: 0.5, color: 0xffffff, alpha: 0.08 });
  for (let n = 0; n < 8; n++) {
    const xx = topGoalX + (n / 7) * GOAL_W;
    g.moveTo(xx, 0);
    g.lineTo(xx, 16);
    g.stroke();
    g.moveTo(xx, WORLD_H - 16);
    g.lineTo(xx, WORLD_H);
    g.stroke();
  }

  return g;
}

// ════════════════════════════════════════════════════════
//  CREATE PLAYER SPRITE
// ════════════════════════════════════════════════════════

function createPlayerSprite(
  p: {
    id: string;
    lastName: string;
    position: string;
  },
  isHome: boolean,
  jerseyNum: number,
  stamina: number,
  homeColors: { primary: string; secondary: string },
  awayColors: { primary: string; secondary: string },
): PlayerSprite {
  const container = new Container();
  container.sortableChildren = true;

  // Shadow (ellipse below player)
  const shadow = new Graphics();
  shadow.ellipse(0, 4, PLAYER_R * 0.85, PLAYER_R * 0.4);
  shadow.fill({ color: 0x000000, alpha: 0.3 });
  shadow.zIndex = 0;
  container.addChild(shadow);

  // Main disc
  const isGK = p.position === "TW";
  const colors = isHome ? homeColors : awayColors;
  const fillColor = isGK
    ? isHome
      ? 0x1a6b2a
      : 0x8b6914
    : parseInt(colors.primary.replace("#", ""), 16) || 0x1c7ed6;
  const borderColor = isGK
    ? 0xffffff
    : parseInt(colors.secondary.replace("#", ""), 16) || 0xffffff;

  const disc = new Graphics();
  disc.circle(0, 0, PLAYER_R);
  disc.fill({ color: fillColor });
  disc.setStrokeStyle({ width: 1.5, color: borderColor, alpha: 0.9 });
  disc.circle(0, 0, PLAYER_R);
  disc.stroke();
  // Position-based inner ring
  const posRingColor = getPositionRingColor(p.position);
  disc.setStrokeStyle({ width: 1.2, color: posRingColor, alpha: 0.7 });
  disc.circle(0, 0, PLAYER_R - 3);
  disc.stroke();
  disc.zIndex = 2;
  container.addChild(disc);

  // Stamina arc (visible when low)
  const staminaArc = new Graphics();
  staminaArc.zIndex = 3;
  container.addChild(staminaArc);

  // Jersey number
  const numStyle = new TextStyle({
    fontFamily: "Inter, sans-serif",
    fontSize: 10,
    fontWeight: "700",
    fill: 0xffffff,
    align: "center",
  });
  const numText = new Text({ text: String(jerseyNum), style: numStyle });
  numText.anchor.set(0.5, 0.5);
  numText.zIndex = 4;
  container.addChild(numText);

  // Name label
  const nameStyle = new TextStyle({
    fontFamily: "Inter, sans-serif",
    fontSize: 7,
    fontWeight: "600",
    fill: 0xffffff,
    align: "center",
  });
  const shortName =
    p.lastName.length > 8 ? p.lastName.substring(0, 7) + "." : p.lastName;
  const nameText = new Text({ text: shortName, style: nameStyle });
  nameText.anchor.set(0.5, 1);
  nameText.y = -PLAYER_R - 4;
  nameText.alpha = 0.75;
  nameText.zIndex = 4;
  container.addChild(nameText);

  const initPos = formationToPitch(50, 50, isHome);

  return {
    id: p.id,
    name: shortName,
    position: p.position,
    isGK,
    isHome,
    current: { ...initPos },
    target: { ...initPos },
    stamina,
    jerseyNum,
    container,
    disc,
    shadow,
    numText,
    nameText,
    staminaArc,
  };
}

// ════════════════════════════════════════════════════════
//  CREATE BALL SPRITE
// ════════════════════════════════════════════════════════

function createBallSprite(): BallSprite {
  const container = new Container();
  container.sortableChildren = true;

  // Shadow
  const shadow = new Graphics();
  shadow.ellipse(2, 3, BALL_R * 0.8, BALL_R * 0.35);
  shadow.fill({ color: 0x000000, alpha: 0.35 });
  shadow.zIndex = 0;
  container.addChild(shadow);

  // Ball body
  const body = new Graphics();
  body.circle(0, 0, BALL_R);
  body.fill({ color: 0xffffff });
  // Pentagon pattern
  for (let a = 0; a < 5; a++) {
    const angle = (a / 5) * Math.PI * 2 - Math.PI / 2;
    const px = Math.cos(angle) * BALL_R * 0.5;
    const py = Math.sin(angle) * BALL_R * 0.5;
    body.circle(px, py, BALL_R * 0.18);
    body.fill({ color: 0x000000, alpha: 0.12 });
  }
  body.zIndex = 2;
  container.addChild(body);

  // Trail line graphics
  const trailGfx = new Graphics();
  trailGfx.zIndex = -1;
  container.addChild(trailGfx);

  return {
    current: { x: WORLD_W / 2, y: WORLD_H / 2 },
    target: { x: WORLD_W / 2, y: WORLD_H / 2 },
    carrier: -1,
    trail: [],
    height: 0,
    heightVel: 0,
    spinAngle: 0,
    container,
    body,
    shadow,
    trailGfx,
  };
}

// ════════════════════════════════════════════════════════
//  OVERLAY EFFECTS
// ════════════════════════════════════════════════════════

interface ActiveEffect {
  type: string;
  startTime: number;
  durationMs: number;
  gfx: Graphics;
}

function createEffectLayer(screenW: number, screenH: number): {
  container: Container;
  triggerEffect: (type: string) => void;
  update: (now: number) => void;
  resize: (w: number, h: number) => void;
} {
  const container = new Container();
  container.zIndex = 100;
  let effects: ActiveEffect[] = [];
  let sw = screenW;
  let sh = screenH;

  function triggerEffect(type: string) {
    const gfx = new Graphics();
    container.addChild(gfx);

    let dur = 1200;
    if (type === "goal") dur = 2500;
    else if (type === "red_card" || type === "second_yellow") dur = 1500;

    effects.push({ type, startTime: performance.now(), durationMs: dur, gfx });
  }

  function update(now: number) {
    for (let i = effects.length - 1; i >= 0; i--) {
      const e = effects[i];
      const elapsed = now - e.startTime;
      if (elapsed > e.durationMs) {
        container.removeChild(e.gfx);
        e.gfx.destroy();
        effects.splice(i, 1);
        continue;
      }
      const progress = elapsed / e.durationMs;

      e.gfx.clear();

      if (e.type === "goal") {
        const alpha = Math.max(0, 0.35 * (1 - progress));
        e.gfx.rect(0, 0, sw, sh);
        e.gfx.fill({ color: 0xffffff, alpha });
      } else if (
        e.type === "shot_saved" ||
        e.type === "shot_post" ||
        e.type === "shot_missed"
      ) {
        const alpha = Math.max(0, 0.2 * (1 - progress));
        e.gfx.rect(0, 0, sw, sh);
        e.gfx.fill({ color: 0xffb400, alpha });
      } else if (e.type === "red_card" || e.type === "second_yellow") {
        const alpha = Math.max(0, 0.25 * (1 - progress));
        e.gfx.rect(0, 0, sw, sh);
        e.gfx.fill({ color: 0xff3232, alpha });
      }
    }
  }

  function resize(w: number, h: number) {
    sw = w;
    sh = h;
  }

  return { container, triggerEffect, update, resize };
}

// ════════════════════════════════════════════════════════
//  GOAL TEXT OVERLAY
// ════════════════════════════════════════════════════════

function createGoalText(): {
  container: Container;
  show: () => void;
  update: (now: number) => void;
} {
  const container = new Container();
  container.zIndex = 110;
  container.visible = false;

  const style = new TextStyle({
    fontFamily: "Oswald, sans-serif",
    fontSize: 64,
    fontWeight: "900",
    fill: 0xffffff,
    dropShadow: {
      color: 0x000000,
      blur: 8,
      distance: 2,
      alpha: 0.5,
    },
  });
  const text = new Text({ text: "GOAL!", style });
  text.anchor.set(0.5, 0.5);
  container.addChild(text);

  let showStart = 0;
  const showDur = 2500;

  function show() {
    showStart = performance.now();
    container.visible = true;
  }

  function update(now: number) {
    if (!container.visible) return;
    const elapsed = now - showStart;
    if (elapsed > showDur) {
      container.visible = false;
      return;
    }
    const p = elapsed / showDur;
    const scale = 1 + p * 0.3;
    container.scale.set(scale);
    container.alpha =
      p < 0.1 ? p / 0.1 : p > 0.6 ? Math.max(0, (1 - p) / 0.4) : 1;
  }

  return { container, show, update };
}

// ════════════════════════════════════════════════════════
//  VIGNETTE OVERLAY (static)
// ════════════════════════════════════════════════════════

function createVignette(w: number, h: number): Graphics {
  const g = new Graphics();
  // Four darkened edges using overlapping rects with gradient alpha
  // Simulated with concentric semi-transparent black ellipses
  for (let i = 0; i < 5; i++) {
    const alpha = 0.06 * (i + 1);
    const inset = w * 0.08 * (5 - i);
    g.rect(0, 0, w, h);
    g.fill({ color: 0x000000, alpha: 0 }); // placeholder
  }
  // Simple approach: dark rectangle at edges
  g.rect(0, 0, w, h);
  // Use a radial-ish approach with overlapping darker edges
  const edgeAlpha = 0.25;
  // Top edge
  g.rect(0, 0, w, h * 0.12);
  g.fill({ color: 0x000000, alpha: edgeAlpha });
  // Bottom edge
  g.rect(0, h * 0.88, w, h * 0.12);
  g.fill({ color: 0x000000, alpha: edgeAlpha });
  // Left edge
  g.rect(0, 0, w * 0.06, h);
  g.fill({ color: 0x000000, alpha: edgeAlpha * 0.6 });
  // Right edge
  g.rect(w * 0.94, 0, w * 0.06, h);
  g.fill({ color: 0x000000, alpha: edgeAlpha * 0.6 });

  g.zIndex = 90;
  return g;
}

// ════════════════════════════════════════════════════════
//  POSSESSION BAR
// ════════════════════════════════════════════════════════

function createPossessionBar(
  w: number,
): {
  container: Container;
  update: (homePoss: number, homeColor: number, awayColor: number) => void;
  reposition: (screenW: number, screenH: number) => void;
} {
  const container = new Container();
  container.zIndex = 95;

  const barW = w * 0.5;
  const barH = 5;
  const bg = new Graphics();
  const homeFill = new Graphics();
  const awayFill = new Graphics();

  container.addChild(bg, homeFill, awayFill);

  const homeLabel = new Text({
    text: "50%",
    style: new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: 9,
      fontWeight: "700",
      fill: 0xffffff,
    }),
  });
  homeLabel.anchor.set(1, 0.5);
  homeLabel.alpha = 0.6;

  const awayLabel = new Text({
    text: "50%",
    style: new TextStyle({
      fontFamily: "Inter, sans-serif",
      fontSize: 9,
      fontWeight: "700",
      fill: 0xffffff,
    }),
  });
  awayLabel.anchor.set(0, 0.5);
  awayLabel.alpha = 0.6;

  container.addChild(homeLabel, awayLabel);

  function update(
    homePoss: number,
    homeColor: number,
    awayColor: number,
  ) {
    const frac = homePoss / 100;
    bg.clear();
    bg.rect(0, 0, barW, barH);
    bg.fill({ color: 0x000000, alpha: 0.4 });

    homeFill.clear();
    homeFill.rect(0, 0, barW * frac, barH);
    homeFill.fill({ color: homeColor });

    awayFill.clear();
    awayFill.rect(barW * frac, 0, barW * (1 - frac), barH);
    awayFill.fill({ color: awayColor });

    homeLabel.text = `${homePoss}%`;
    homeLabel.x = -6;
    homeLabel.y = barH / 2;
    awayLabel.text = `${100 - homePoss}%`;
    awayLabel.x = barW + 6;
    awayLabel.y = barH / 2;
  }

  function reposition(screenW: number, screenH: number) {
    container.x = (screenW - barW) / 2;
    container.y = screenH - 18;
  }

  return { container, update, reposition };
}

// ════════════════════════════════════════════════════════
//  PARTICLE SYSTEM  (simple confetti for goals)
// ════════════════════════════════════════════════════════

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

function createParticleSystem(): {
  container: Container;
  emit: (cx: number, cy: number, count: number, colors: number[]) => void;
  update: (dt: number) => void;
} {
  const container = new Container();
  container.zIndex = 105;
  const gfx = new Graphics();
  container.addChild(gfx);
  const particles: Particle[] = [];

  function emit(cx: number, cy: number, count: number, colors: number[]) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 40 + Math.random() * 120;
      particles.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 60,
        life: 1,
        maxLife: 0.8 + Math.random() * 0.7,
        color: colors[Math.floor(Math.random() * colors.length)],
        size: 2 + Math.random() * 3,
      });
    }
  }

  function update(dt: number) {
    gfx.clear();
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 180 * dt; // gravity
      p.life -= dt / p.maxLife;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      gfx.circle(p.x, p.y, p.size * p.life);
      gfx.fill({ color: p.color, alpha: p.life * 0.8 });
    }
  }

  return { container, emit, update };
}

// ════════════════════════════════════════════════════════
//  TEAM LABELS  (replaced by scoreboard — kept minimal)
// ════════════════════════════════════════════════════════

// ════════════════════════════════════════════════════════
//  STADIUM CROWD & FLOODLIGHTS
// ════════════════════════════════════════════════════════

function buildStadiumAtmosphere(): {
  container: Container;
  rebuild: (w: number, h: number) => void;
} {
  const container = new Container();
  container.zIndex = -5;

  function rebuild(w: number, h: number) {
    container.removeChildren();

    const g = new Graphics();

    // Dark surround behind pitch
    g.rect(-60, -40, WORLD_W + 120, WORLD_H + 80);
    g.fill({ color: 0x0a1628, alpha: 1 });

    // ── Crowd rows (top & bottom) ──
    const crowdH = 28;
    const crowdColors = [0x334155, 0x475569, 0x3b4a5c, 0x2c3e50, 0x3d5266];

    // Top crowd (behind away goal)
    for (let row = 0; row < 3; row++) {
      const y = -40 + row * (crowdH * 0.7);
      for (let i = 0; i < 60; i++) {
        const x = -40 + i * (WORLD_W + 80) / 60;
        const col = crowdColors[(i + row * 7) % crowdColors.length];
        const size = 5 + seededRandom(i * 13 + row * 99) * 3;
        g.circle(x + size / 2, y + crowdH / 2, size / 2);
        g.fill({ color: col, alpha: 0.5 + seededRandom(i * 7 + row) * 0.3 });
      }
    }

    // Bottom crowd (behind home goal)
    for (let row = 0; row < 3; row++) {
      const y = WORLD_H + 2 + row * (crowdH * 0.7);
      for (let i = 0; i < 60; i++) {
        const x = -40 + i * (WORLD_W + 80) / 60;
        const col = crowdColors[(i + row * 3) % crowdColors.length];
        const size = 5 + seededRandom(i * 17 + row * 51) * 3;
        g.circle(x + size / 2, y + crowdH / 2, size / 2);
        g.fill({ color: col, alpha: 0.5 + seededRandom(i * 11 + row) * 0.3 });
      }
    }

    // Left & right crowd (sideline)
    for (let side = 0; side < 2; side++) {
      const baseX = side === 0 ? -50 : WORLD_W + 10;
      for (let row = 0; row < 2; row++) {
        const x = baseX + row * 14;
        for (let i = 0; i < 35; i++) {
          const y = 20 + i * (WORLD_H - 40) / 35;
          const col = crowdColors[(i + row * 5 + side * 11) % crowdColors.length];
          const size = 4 + seededRandom(i * 23 + row * 7 + side * 41) * 3;
          g.circle(x + size / 2, y, size / 2);
          g.fill({ color: col, alpha: 0.4 + seededRandom(i * 3 + side) * 0.3 });
        }
      }
    }

    // ── Floodlight glow (4 corners) ──
    const floodPositions = [
      { x: -30, y: -20 },
      { x: WORLD_W + 30, y: -20 },
      { x: -30, y: WORLD_H + 20 },
      { x: WORLD_W + 30, y: WORLD_H + 20 },
    ];
    for (const fp of floodPositions) {
      // Light post
      g.rect(fp.x - 2, fp.y - 8, 4, 16);
      g.fill({ color: 0x888888, alpha: 0.6 });
      // Glow circle
      for (let r = 0; r < 3; r++) {
        g.circle(fp.x, fp.y, 20 + r * 15);
        g.fill({ color: 0xffffcc, alpha: 0.03 - r * 0.008 });
      }
    }

    container.addChild(g);
  }

  return { container, rebuild };
}

// ════════════════════════════════════════════════════════
//  WEATHER PARTICLE SYSTEM
// ════════════════════════════════════════════════════════

interface WeatherParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
}

function createWeatherSystem(): {
  container: Container;
  setWeather: (type: WeatherType, sw: number, sh: number) => void;
  update: (dt: number, sw: number, sh: number) => void;
} {
  const container = new Container();
  container.zIndex = 85;
  const gfx = new Graphics();
  container.addChild(gfx);

  let particles: WeatherParticle[] = [];
  let weatherType: WeatherType = "sunny";
  let targetCount = 0;

  function setWeather(type: WeatherType, sw: number, sh: number) {
    weatherType = type;
    if (type === "rain") targetCount = 120;
    else if (type === "heavy_rain") targetCount = 250;
    else if (type === "snow") targetCount = 80;
    else targetCount = 0;

    // Pre-spawn
    while (particles.length < targetCount) {
      particles.push(spawnParticle(sw, sh, true));
    }
    // Trim excess
    if (particles.length > targetCount) {
      particles.length = targetCount;
    }
  }

  function spawnParticle(sw: number, sh: number, randomY: boolean): WeatherParticle {
    if (weatherType === "snow") {
      return {
        x: Math.random() * sw * 1.2 - sw * 0.1,
        y: randomY ? Math.random() * sh : -5,
        vx: -15 + Math.random() * 10,
        vy: 30 + Math.random() * 25,
        size: 1.5 + Math.random() * 2.5,
        alpha: 0.3 + Math.random() * 0.5,
      };
    }
    // Rain (default)
    return {
      x: Math.random() * sw * 1.3 - sw * 0.15,
      y: randomY ? Math.random() * sh : -5,
      vx: -30 - Math.random() * 20,
      vy: 280 + Math.random() * 180,
      size: 1 + Math.random() * 1.5,
      alpha: 0.15 + Math.random() * 0.2,
    };
  }

  function update(dt: number, sw: number, sh: number) {
    if (targetCount === 0) {
      if (particles.length > 0) {
        particles.length = 0;
        gfx.clear();
      }
      return;
    }

    gfx.clear();

    // Respawn dead particles
    while (particles.length < targetCount) {
      particles.push(spawnParticle(sw, sh, false));
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      if (p.y > sh + 10 || p.x < -30) {
        particles[i] = spawnParticle(sw, sh, false);
        continue;
      }

      if (weatherType === "snow") {
        // Snow: small circles with slight horizontal wobble
        p.vx += (Math.sin(p.y * 0.02 + p.x * 0.01) * 20 - p.vx) * dt;
        gfx.circle(p.x, p.y, p.size);
        gfx.fill({ color: 0xffffff, alpha: p.alpha });
      } else {
        // Rain: short diagonal lines
        gfx.moveTo(p.x, p.y);
        gfx.lineTo(p.x + p.vx * 0.015, p.y + p.vy * 0.015);
        gfx.stroke({ width: p.size, color: 0xaaccff, alpha: p.alpha });
      }
    }
  }

  return { container, setWeather, update };
}

// ════════════════════════════════════════════════════════
//  IN-RENDERER SCOREBOARD
// ════════════════════════════════════════════════════════

function createScoreboard(): {
  container: Container;
  update: (
    homeName: string,
    awayName: string,
    homeScore: number,
    awayScore: number,
    minute: number,
    homeColor: number,
    awayColor: number,
  ) => void;
  reposition: (sw: number, sh: number) => void;
} {
  const container = new Container();
  container.zIndex = 96;

  const bg = new Graphics();
  container.addChild(bg);

  const minuteStyle = new TextStyle({
    fontFamily: "Oswald, Inter, sans-serif",
    fontSize: 13,
    fontWeight: "700",
    fill: 0x22ee66,
  });
  const minuteText = new Text({ text: "0'", style: minuteStyle });
  minuteText.anchor.set(0.5, 0.5);

  const nameStyle = new TextStyle({
    fontFamily: "Inter, sans-serif",
    fontSize: 11,
    fontWeight: "600",
    fill: 0xffffff,
  });
  const homeNameText = new Text({ text: "", style: nameStyle });
  homeNameText.anchor.set(1, 0.5);

  const awayNameText = new Text({ text: "", style: { ...nameStyle } });
  awayNameText.anchor.set(0, 0.5);

  const scoreStyle = new TextStyle({
    fontFamily: "Oswald, Inter, sans-serif",
    fontSize: 18,
    fontWeight: "900",
    fill: 0xffffff,
  });
  const scoreText = new Text({ text: "0 : 0", style: scoreStyle });
  scoreText.anchor.set(0.5, 0.5);

  // Color indicators
  const homeColorDot = new Graphics();
  const awayColorDot = new Graphics();

  container.addChild(homeColorDot, awayColorDot);
  container.addChild(homeNameText, scoreText, awayNameText, minuteText);

  function update(
    homeName: string,
    awayName: string,
    homeScore: number,
    awayScore: number,
    minute: number,
    homeColor: number,
    awayColor: number,
  ) {
    homeNameText.text = homeName;
    awayNameText.text = awayName;
    scoreText.text = `${homeScore} : ${awayScore}`;
    minuteText.text = `${minute}'`;

    // Layout
    const scoreW = 70;
    const totalW = 300;
    const halfW = (totalW - scoreW) / 2;
    const h = 30;

    bg.clear();
    // Background pill
    bg.roundRect(-totalW / 2, -h / 2, totalW, h, 6);
    bg.fill({ color: 0x0a0a1a, alpha: 0.85 });

    // Score center
    scoreText.x = 0;
    scoreText.y = 0;

    // Home side
    homeNameText.x = -scoreW / 2 - 6;
    homeNameText.y = 0;
    homeColorDot.clear();
    homeColorDot.circle(-halfW - scoreW / 2 + 8, 0, 4);
    homeColorDot.fill({ color: homeColor });

    // Away side
    awayNameText.x = scoreW / 2 + 6;
    awayNameText.y = 0;
    awayColorDot.clear();
    awayColorDot.circle(halfW + scoreW / 2 - 8, 0, 4);
    awayColorDot.fill({ color: awayColor });

    // Minute
    minuteText.x = 0;
    minuteText.y = h / 2 + 10;
  }

  function reposition(sw: number, _sh: number) {
    container.x = sw / 2;
    container.y = 22;
  }

  return { container, update, reposition };
}

// ════════════════════════════════════════════════════════
//  CAMERA SHAKE
// ════════════════════════════════════════════════════════

function createCameraShake(): {
  trigger: (intensity: number, durationMs: number) => void;
  getOffset: (now: number) => Vec2;
} {
  let shakeStart = 0;
  let shakeDur = 0;
  let shakeIntensity = 0;

  function trigger(intensity: number, durationMs: number) {
    shakeStart = performance.now();
    shakeDur = durationMs;
    shakeIntensity = intensity;
  }

  function getOffset(now: number): Vec2 {
    if (shakeDur <= 0) return { x: 0, y: 0 };
    const elapsed = now - shakeStart;
    if (elapsed > shakeDur) {
      shakeDur = 0;
      return { x: 0, y: 0 };
    }
    const decay = 1 - elapsed / shakeDur;
    const freq = 30; // Hz
    const t = elapsed / 1000;
    return {
      x: Math.sin(t * freq * 6.28) * shakeIntensity * decay,
      y: Math.cos(t * freq * 4.71) * shakeIntensity * decay * 0.7,
    };
  }

  return { trigger, getOffset };
}

// ════════════════════════════════════════════════════════
//  EVENT CAMERA ZOOM
// ════════════════════════════════════════════════════════

interface ZoomEvent {
  targetZoom: number;
  focusWorld: Vec2;
  startTime: number;
  holdMs: number;
  fadeOutMs: number;
}

function createEventCamera(): {
  triggerZoom: (focusWorld: Vec2, zoom: number, holdMs: number) => void;
  getState: (now: number) => { zoom: number; focus: Vec2 | null };
} {
  let activeZoom: ZoomEvent | null = null;

  function triggerZoom(focusWorld: Vec2, zoom: number, holdMs: number) {
    activeZoom = {
      targetZoom: zoom,
      focusWorld: { ...focusWorld },
      startTime: performance.now(),
      holdMs,
      fadeOutMs: 800,
    };
  }

  function getState(now: number): { zoom: number; focus: Vec2 | null } {
    if (!activeZoom) return { zoom: ZOOM_DEFAULT, focus: null };

    const elapsed = now - activeZoom.startTime;
    const totalDur = activeZoom.holdMs + activeZoom.fadeOutMs;

    if (elapsed > totalDur) {
      activeZoom = null;
      return { zoom: ZOOM_DEFAULT, focus: null };
    }

    if (elapsed < activeZoom.holdMs) {
      // Zoom in phase
      const t = Math.min(1, elapsed / 400); // 400ms ease in
      const eased = t * t * (3 - 2 * t); // smoothstep
      return {
        zoom: lerp(ZOOM_DEFAULT, activeZoom.targetZoom, eased),
        focus: activeZoom.focusWorld,
      };
    }

    // Fade out phase
    const fadeElapsed = elapsed - activeZoom.holdMs;
    const t = fadeElapsed / activeZoom.fadeOutMs;
    const eased = t * t;
    return {
      zoom: lerp(activeZoom.targetZoom, ZOOM_DEFAULT, eased),
      focus: activeZoom.focusWorld,
    };
  }

  return { triggerZoom, getState };
}

// ════════════════════════════════════════════════════════
//  SCENE-DATA PLAY LINES (pass/shot/cross visual)
// ════════════════════════════════════════════════════════

interface ActivePlayLine {
  from: Vec2;
  to: Vec2;
  type: 'pass_line' | 'shot_line' | 'cross_line' | 'dribble_trail';
  startTime: number;
  durationMs: number;
}

function createPlayLineSystem(): {
  container: Container;
  addLine: (from: Vec2, to: Vec2, type: string, durationMs: number) => void;
  playScene: (scene: SceneData, allPlayers: PlayerSprite[], ball: BallSprite) => void;
  update: (now: number) => void;
} {
  const container = new Container();
  container.zIndex = 8; // above pitch, below players
  const gfx = new Graphics();
  container.addChild(gfx);
  const lines: ActivePlayLine[] = [];

  function addLine(from: Vec2, to: Vec2, type: string, durationMs: number) {
    lines.push({
      from: { ...from },
      to: { ...to },
      type: type as ActivePlayLine['type'],
      startTime: performance.now(),
      durationMs,
    });
  }

  function playScene(scene: SceneData, allPlayers: PlayerSprite[], ball: BallSprite) {
    let delay = 0;
    for (const step of scene.steps) {
      if (step.effect && step.ballCarrier) {
        const carrier = allPlayers.find(p => p.id === step.ballCarrier);
        if (carrier) {
          const ballWorldPos = {
            x: (step.ballPos.x / 100) * WORLD_W,
            y: (step.ballPos.y / 100) * WORLD_H,
          };
          setTimeout(() => {
            addLine(carrier.current, ballWorldPos, step.effect!, step.durationMs);
          }, delay);
        }
      }
      // Move players to scene targets
      if (step.playerMoves) {
        setTimeout(() => {
          for (const [pid, pos] of Object.entries(step.playerMoves!)) {
            const ps = allPlayers.find(p => p.id === pid);
            if (ps) {
              ps.target = {
                x: (pos.x / 100) * WORLD_W,
                y: (pos.y / 100) * WORLD_H,
              };
            }
          }
        }, delay);
      }
      delay += step.durationMs;
    }
  }

  function update(now: number) {
    gfx.clear();
    for (let i = lines.length - 1; i >= 0; i--) {
      const l = lines[i];
      const elapsed = now - l.startTime;
      if (elapsed > l.durationMs) {
        lines.splice(i, 1);
        continue;
      }
      const progress = elapsed / l.durationMs;
      const alpha = Math.max(0, 0.7 * (1 - progress));

      // Animated endpoint: line grows then fades
      const drawProgress = Math.min(1, progress * 3); // line appears in first 33%
      const endX = lerp(l.from.x, l.to.x, drawProgress);
      const endY = lerp(l.from.y, l.to.y, drawProgress);

      if (l.type === 'shot_line') {
        // Red-orange shot line, thicker
        gfx.setStrokeStyle({ width: 3, color: 0xff4444, alpha });
        gfx.moveTo(l.from.x, l.from.y);
        gfx.lineTo(endX, endY);
        gfx.stroke();
        // Arrowhead
        const angle = Math.atan2(endY - l.from.y, endX - l.from.x);
        const aLen = 8;
        gfx.moveTo(endX, endY);
        gfx.lineTo(endX - Math.cos(angle - 0.4) * aLen, endY - Math.sin(angle - 0.4) * aLen);
        gfx.stroke();
        gfx.moveTo(endX, endY);
        gfx.lineTo(endX - Math.cos(angle + 0.4) * aLen, endY - Math.sin(angle + 0.4) * aLen);
        gfx.stroke();
      } else if (l.type === 'cross_line') {
        // Curved cross line (slight arc)
        gfx.setStrokeStyle({ width: 2, color: 0x66bbff, alpha });
        const midX = (l.from.x + l.to.x) / 2;
        const midY = Math.min(l.from.y, l.to.y) - 40;
        gfx.moveTo(l.from.x, l.from.y);
        gfx.quadraticCurveTo(midX, midY, endX, endY);
        gfx.stroke();
      } else if (l.type === 'dribble_trail') {
        // Dashed dribble trail
        gfx.setStrokeStyle({ width: 2, color: 0x88ff88, alpha: alpha * 0.6 });
        const steps = 8;
        for (let s = 0; s < steps; s++) {
          const t1 = s / steps * drawProgress;
          const t2 = (s + 0.5) / steps * drawProgress;
          gfx.moveTo(lerp(l.from.x, l.to.x, t1), lerp(l.from.y, l.to.y, t1));
          gfx.lineTo(lerp(l.from.x, l.to.x, t2), lerp(l.from.y, l.to.y, t2));
          gfx.stroke();
        }
      } else {
        // Default pass line: white dashed
        gfx.setStrokeStyle({ width: 2, color: 0xffffff, alpha });
        gfx.moveTo(l.from.x, l.from.y);
        gfx.lineTo(endX, endY);
        gfx.stroke();
        // Small circle at end
        gfx.circle(endX, endY, 3);
        gfx.fill({ color: 0xffffff, alpha: alpha * 0.5 });
      }
    }
  }

  return { container, addLine, playScene, update };
}

// ════════════════════════════════════════════════════════
//  COMMENTARY OVERLAY (animated text on canvas)
// ════════════════════════════════════════════════════════

interface CommentaryEntry {
  text: string;
  startTime: number;
  durationMs: number;
  isImportant: boolean;
}

function createCommentaryOverlay(): {
  container: Container;
  show: (text: string, durationMs?: number, isImportant?: boolean) => void;
  update: (now: number) => void;
  reposition: (sw: number, sh: number) => void;
} {
  const container = new Container();
  container.zIndex = 92;

  const bg = new Graphics();
  container.addChild(bg);

  const style = new TextStyle({
    fontFamily: "Inter, sans-serif",
    fontSize: 12,
    fontWeight: "600",
    fill: 0xffffff,
    wordWrap: true,
    wordWrapWidth: 360,
    align: "center",
  });
  const text = new Text({ text: "", style });
  text.anchor.set(0.5, 0.5);
  container.addChild(text);

  let entry: CommentaryEntry | null = null;
  let sw = 800;
  let sh = 600;

  function show(msg: string, durationMs = 3500, isImportant = false) {
    // Strip emoji for cleaner overlay
    const cleanMsg = msg.replace(/^[^\w\s]+\s*/, '').trim();
    if (!cleanMsg) return;
    // Truncate long messages
    const displayMsg = cleanMsg.length > 120 ? cleanMsg.substring(0, 117) + '...' : cleanMsg;
    entry = {
      text: displayMsg,
      startTime: performance.now(),
      durationMs,
      isImportant,
    };
    text.text = displayMsg;
  }

  function update(now: number) {
    if (!entry) {
      container.visible = false;
      return;
    }
    const elapsed = now - entry.startTime;
    if (elapsed > entry.durationMs) {
      entry = null;
      container.visible = false;
      return;
    }
    container.visible = true;

    const progress = elapsed / entry.durationMs;
    // Fade in first 10%, full, fade out last 30%
    let alpha: number;
    if (progress < 0.1) alpha = progress / 0.1;
    else if (progress > 0.7) alpha = (1 - progress) / 0.3;
    else alpha = 1;

    container.alpha = alpha;

    // Background pill
    const textW = Math.min(380, text.width + 40);
    const textH = text.height + 16;
    bg.clear();
    bg.roundRect(-textW / 2, -textH / 2, textW, textH, 8);
    bg.fill({ color: entry.isImportant ? 0x1a2a44 : 0x0a0a1a, alpha: 0.8 });
    if (entry.isImportant) {
      bg.roundRect(-textW / 2, -textH / 2, textW, textH, 8);
      bg.stroke({ width: 1, color: 0x3b82f6, alpha: 0.4 });
    }

    text.x = 0;
    text.y = 0;
  }

  function reposition(screenW: number, screenH: number) {
    sw = screenW;
    sh = screenH;
    container.x = sw / 2;
    container.y = sh - 52;
  }

  return { container, show, update, reposition };
}

// ════════════════════════════════════════════════════════
//  DAY/NIGHT LIGHTING SYSTEM
// ════════════════════════════════════════════════════════

interface LightingState {
  ambientColor: number;
  ambientAlpha: number;
  floodlightIntensity: number;
  pitchTint: number;
}

function createLightingSystem(): {
  overlay: Graphics;
  getState: (minute: number) => LightingState;
  update: (minute: number, sw: number, sh: number) => void;
} {
  const overlay = new Graphics();
  overlay.zIndex = 7; // above pitch, below play lines

  function getState(minute: number): LightingState {
    // Simulate time of day: match starts ~15:00 or ~20:00
    // For evening games (assumed): starts dim, gets darker
    // For simplicity: minute 0-45 = late afternoon, 45-90 = evening
    const t = clamp(minute / 90, 0, 1);

    if (t < 0.3) {
      // Afternoon: warm light, minimal overlay
      return {
        ambientColor: 0xffe8a0,
        ambientAlpha: 0.03 + t * 0.02,
        floodlightIntensity: 0.3 + t * 0.5,
        pitchTint: 0xfff5e0,
      };
    } else if (t < 0.5) {
      // Late afternoon → dusk transition
      const duskT = (t - 0.3) / 0.2;
      return {
        ambientColor: lerpColor(0xffe8a0, 0x6688cc, duskT),
        ambientAlpha: 0.05 + duskT * 0.06,
        floodlightIntensity: 0.6 + duskT * 0.3,
        pitchTint: lerpColor(0xfff5e0, 0xd8e8ff, duskT),
      };
    } else {
      // Evening: cool blue tint, strong floodlights
      const nightT = (t - 0.5) / 0.5;
      return {
        ambientColor: lerpColor(0x6688cc, 0x334466, nightT * 0.5),
        ambientAlpha: 0.11 + nightT * 0.04,
        floodlightIntensity: 0.9 + nightT * 0.1,
        pitchTint: lerpColor(0xd8e8ff, 0xc0d8ff, nightT),
      };
    }
  }

  function update(minute: number, sw: number, sh: number) {
    const state = getState(minute);
    overlay.clear();
    // Full-screen ambient tint
    overlay.rect(-100, -60, WORLD_W + 200, WORLD_H + 120);
    overlay.fill({ color: state.ambientColor, alpha: state.ambientAlpha });

    // Floodlight beams get brighter in evening
    if (state.floodlightIntensity > 0.5) {
      const spots = [
        { x: 80, y: 80 },
        { x: WORLD_W - 80, y: 80 },
        { x: 80, y: WORLD_H - 80 },
        { x: WORLD_W - 80, y: WORLD_H - 80 },
      ];
      for (const s of spots) {
        for (let r = 0; r < 3; r++) {
          overlay.circle(s.x, s.y, 70 + r * 50);
          overlay.fill({
            color: 0xffeedd,
            alpha: (state.floodlightIntensity - 0.5) * 0.015 / (r + 1),
          });
        }
      }
    }
  }

  return { overlay, getState, update };
}

/** Linear color interpolation (RGB channels) */
function lerpColor(c1: number, c2: number, t: number): number {
  const r1 = (c1 >> 16) & 0xff, g1 = (c1 >> 8) & 0xff, b1 = c1 & 0xff;
  const r2 = (c2 >> 16) & 0xff, g2 = (c2 >> 8) & 0xff, b2 = c2 & 0xff;
  const r = Math.round(lerp(r1, r2, t));
  const g = Math.round(lerp(g1, g2, t));
  const b = Math.round(lerp(b1, b2, t));
  return (r << 16) | (g << 8) | b;
}

// ════════════════════════════════════════════════════════
//  ANIMATED CROWD SECTIONS (subtle wave animation)
// ════════════════════════════════════════════════════════

function createCrowdAnimation(): {
  container: Container;
  update: (dt: number, excitement: number) => void;
  rebuild: () => void;
} {
  const container = new Container();
  container.zIndex = -4; // just above static stadium background

  const gfx = new Graphics();
  container.addChild(gfx);

  // Pre-generate crowd "people" positions
  interface CrowdPerson {
    baseX: number;
    baseY: number;
    side: 'top' | 'bottom' | 'left' | 'right';
    phase: number;
    color: number;
    size: number;
  }

  const people: CrowdPerson[] = [];
  const crowdColors = [0x4a6fa5, 0x5a7fb5, 0x3a5f95, 0x6a8fc5, 0x2a4f85, 0x7a9fd5, 0x8aafdd, 0x3a6090];

  function rebuild() {
    people.length = 0;
    // Top stand
    for (let i = 0; i < 80; i++) {
      people.push({
        baseX: -40 + i * (WORLD_W + 80) / 80,
        baseY: -30 + seededRandom(i * 31) * 18,
        side: 'top',
        phase: seededRandom(i * 17) * Math.PI * 2,
        color: crowdColors[i % crowdColors.length],
        size: 3.5 + seededRandom(i * 7) * 2.5,
      });
    }
    // Bottom stand
    for (let i = 0; i < 80; i++) {
      people.push({
        baseX: -40 + i * (WORLD_W + 80) / 80,
        baseY: WORLD_H + 8 + seededRandom(i * 41) * 18,
        side: 'bottom',
        phase: seededRandom(i * 23) * Math.PI * 2,
        color: crowdColors[(i + 3) % crowdColors.length],
        size: 3.5 + seededRandom(i * 11) * 2.5,
      });
    }
    // Sides
    for (let side = 0; side < 2; side++) {
      for (let i = 0; i < 40; i++) {
        people.push({
          baseX: side === 0 ? -40 + seededRandom(i * 51 + side * 99) * 20 : WORLD_W + 15 + seededRandom(i * 53 + side * 77) * 20,
          baseY: 10 + i * (WORLD_H - 20) / 40,
          side: side === 0 ? 'left' : 'right',
          phase: seededRandom(i * 29 + side * 41) * Math.PI * 2,
          color: crowdColors[(i + side * 5) % crowdColors.length],
          size: 3 + seededRandom(i * 13 + side) * 2,
        });
      }
    }
  }

  let time = 0;

  function update(dt: number, excitement: number) {
    time += dt;
    gfx.clear();

    // Excitement drives wave amplitude (0 = calm, 1 = maxed)
    const waveAmp = 1.5 + excitement * 4;
    const waveFreq = 1.5 + excitement * 2;

    for (const p of people) {
      // Mexican wave effect: sinusoidal y-offset based on x position and time
      const waveOffset = Math.sin(time * waveFreq + p.phase + p.baseX * 0.008) * waveAmp;
      const x = p.baseX;
      const y = p.baseY + waveOffset;

      // Color shift on excitement
      const brightBoost = excitement * 0.3;
      const r = Math.min(255, ((p.color >> 16) & 0xff) + Math.round(brightBoost * 60));
      const g = Math.min(255, ((p.color >> 8) & 0xff) + Math.round(brightBoost * 40));
      const b = Math.min(255, (p.color & 0xff) + Math.round(brightBoost * 30));
      const dynColor = (r << 16) | (g << 8) | b;

      gfx.circle(x, y, p.size);
      gfx.fill({ color: dynColor, alpha: 0.55 + excitement * 0.2 });
    }
  }

  rebuild();
  return { container, update, rebuild };
}

// ════════════════════════════════════════════════════════
//  POSITION-BASED RING COLORS (enhanced player visuals)
// ════════════════════════════════════════════════════════

function getPositionRingColor(position: string): number {
  // Position ring: inner ring colored by role
  switch (position) {
    case 'TW': return 0x22c55e; // green for GK
    case 'IV': case 'LV': case 'RV': return 0x3b82f6; // blue for defenders
    case 'ZDM': case 'ZM': case 'ZOM': return 0xf59e0b; // amber for midfield
    case 'LA': case 'RA': case 'LM': case 'RM': return 0x8b5cf6; // purple for wings
    case 'ST': case 'MS': case 'HS': case 'LS': case 'RS': return 0xef4444; // red for strikers
    default: return 0x94a3b8; // gray default
  }
}

// ════════════════════════════════════════════════════════
//  MAIN FACTORY: createPixiMatchRenderer
// ════════════════════════════════════════════════════════

export async function createPixiMatchRenderer(
  canvas: HTMLCanvasElement,
  initialCtx: LiveMatchContext,
  homeFormation?: FormationType,
  awayFormation?: FormationType,
): Promise<PixiMatchRendererHandle> {
  // ── Init PixiJS Application ──
  const app = new Application();
  await app.init({
    canvas,
    width: canvas.clientWidth,
    height: canvas.clientHeight,
    backgroundColor: 0x0a1628,
    antialias: true,
    resolution: window.devicePixelRatio || 1,
    autoDensity: true,
  });

  const screenW = () => app.screen.width;
  const screenH = () => app.screen.height;

  // ── World container (isometric transform) ──
  const world = new Container();
  world.sortableChildren = true;
  app.stage.addChild(world);

  // Apply isometric skew: squash Y axis
  world.scale.set(1, 1 - ISO_SKEW);

  // ── Stadium atmosphere (behind pitch) ──
  const stadium = buildStadiumAtmosphere();
  stadium.container.zIndex = -5;
  world.addChild(stadium.container);

  // ── Pitch ──
  const pitchGfx = buildPitchGraphics();
  pitchGfx.zIndex = 0;
  world.addChild(pitchGfx);

  // ── Floodlight glow on pitch (4 soft lights) ──
  const floodlightOverlay = new Graphics();
  floodlightOverlay.zIndex = 1;
  const floodSpots = [
    { x: 80, y: 80 },
    { x: WORLD_W - 80, y: 80 },
    { x: 80, y: WORLD_H - 80 },
    { x: WORLD_W - 80, y: WORLD_H - 80 },
  ];
  for (const fs of floodSpots) {
    for (let r = 0; r < 4; r++) {
      floodlightOverlay.circle(fs.x, fs.y, 60 + r * 40);
      floodlightOverlay.fill({ color: 0xffffee, alpha: 0.012 - r * 0.002 });
    }
  }
  world.addChild(floodlightOverlay);

  // ── Player & Ball layers ──
  const playerLayer = new Container();
  playerLayer.sortableChildren = true;
  playerLayer.zIndex = 10;
  world.addChild(playerLayer);

  const ballLayer = new Container();
  ballLayer.sortableChildren = true;
  ballLayer.zIndex = 20;
  world.addChild(ballLayer);

  // ── HUD layers (screen-space, not isometric) ──
  const hud = new Container();
  hud.sortableChildren = true;
  app.stage.addChild(hud);

  // ── Team colors ──
  const homeColors = {
    primary: initialCtx.homeTeam.colors?.primary ?? "#1C7ED6",
    secondary: initialCtx.homeTeam.colors?.secondary ?? "#fff",
  };
  const awayColors = {
    primary: initialCtx.awayTeam.colors?.primary ?? "#E8A317",
    secondary: initialCtx.awayTeam.colors?.secondary ?? "#fff",
  };

  const homeColorHex =
    parseInt(homeColors.primary.replace("#", ""), 16) || 0x1c7ed6;
  const awayColorHex =
    parseInt(awayColors.primary.replace("#", ""), 16) || 0xe8a317;

  // ── Create player sprites ──
  const allPlayers: PlayerSprite[] = [];

  for (let i = 0; i < initialCtx.homePlayers.length; i++) {
    const p = initialCtx.homePlayers[i];
    const ps = createPlayerSprite(
      p,
      true,
      i + 1,
      initialCtx.stamina[p.id] ?? 80,
      homeColors,
      awayColors,
    );
    allPlayers.push(ps);
    playerLayer.addChild(ps.container);
  }
  for (let i = 0; i < initialCtx.awayPlayers.length; i++) {
    const p = initialCtx.awayPlayers[i];
    const ps = createPlayerSprite(
      p,
      false,
      i + 1,
      initialCtx.stamina[p.id] ?? 80,
      homeColors,
      awayColors,
    );
    allPlayers.push(ps);
    playerLayer.addChild(ps.container);
  }

  // ── Ball ──
  const ball = createBallSprite();
  ballLayer.addChild(ball.container);

  // ── HUD elements ──
  const effectLayer = createEffectLayer(screenW(), screenH());
  hud.addChild(effectLayer.container);

  const goalText = createGoalText();
  hud.addChild(goalText.container);

  const particles = createParticleSystem();
  hud.addChild(particles.container);

  const possBar = createPossessionBar(screenW());
  hud.addChild(possBar.container);

  const scoreboard = createScoreboard();
  hud.addChild(scoreboard.container);

  const weatherSys = createWeatherSystem();
  hud.addChild(weatherSys.container);

  const commentary = createCommentaryOverlay();
  hud.addChild(commentary.container);

  const vignette = createVignette(screenW(), screenH());
  hud.addChild(vignette);

  // ── Camera subsystems ──
  const cameraShake = createCameraShake();
  const eventCamera = createEventCamera();

  // ── Play lines (pass/shot/cross visuals in world-space) ──
  const playLines = createPlayLineSystem();
  playLines.container.zIndex = 8;
  world.addChild(playLines.container);

  // ── Day/night lighting ──
  const lighting = createLightingSystem();
  lighting.overlay.zIndex = 7;
  world.addChild(lighting.overlay);

  // ── Animated crowd ──
  const crowdAnim = createCrowdAnimation();
  crowdAnim.container.zIndex = -4;
  world.addChild(crowdAnim.container);

  // ── Excitement level for crowd (0-1, spikes on events) ──
  let crowdExcitement = 0.1;

  // ── Camera state ──
  let cameraTarget: Vec2 = { x: WORLD_W / 2, y: WORLD_H / 2 };
  let cameraCurrent: Vec2 = { ...cameraTarget };
  let currentZoom = ZOOM_DEFAULT;

  // ── Passing timer ──
  let nextPassTime = 0;
  let wanderSeed = 0;

  // ── Ball arc state for shots/passes ──
  let ballArcActive = false;
  let ballArcStart: Vec2 = { x: 0, y: 0 };
  let ballArcEnd: Vec2 = { x: 0, y: 0 };
  let ballArcProgress = 0;
  let ballArcDuration = 0;
  let ballArcPeakHeight = 0;

  // ── Event tracking ──
  let lastMinute = -1;
  let lastEventCount = 0;

  // ── Current context ref ──
  let ctx = initialCtx;
  let hFormation = homeFormation;
  let aFormation = awayFormation;

  // ── Initial target computation ──
  computeTargets(ctx, hFormation, aFormation, allPlayers, ball);

  // ── Set weather from ctx ──
  weatherSys.setWeather(ctx.weather?.type ?? "sunny", screenW(), screenH());

  // ── Fit & center ──
  function fitCamera() {
    const sw = screenW();
    const sh = screenH();

    // Scale world to fit screen with some padding
    const scaleX = sw / WORLD_W;
    const scaleY = sh / ISO_H;
    const baseScale = Math.min(scaleX, scaleY) * 0.88;

    const scale = baseScale * currentZoom;

    world.scale.set(scale, scale * (1 - ISO_SKEW));

    // Center on camera position
    const camIso = toIso(cameraCurrent.x, cameraCurrent.y);
    world.x = sw / 2 - camIso.x * scale;
    world.y = sh / 2 - camIso.y * scale * (1 - ISO_SKEW);

    // Apply shake offset
    const shake = cameraShake.getOffset(performance.now());
    world.x += shake.x;
    world.y += shake.y;

    // Reposition HUD
    effectLayer.resize(sw, sh);
    possBar.reposition(sw, sh);
    goalText.container.x = sw / 2;
    goalText.container.y = sh / 2;
    scoreboard.reposition(sw, sh);
    commentary.reposition(sw, sh);

    // Rebuild vignette
    vignette.clear();
    const edgeAlpha = 0.22;
    vignette.rect(0, 0, sw, sh * 0.08);
    vignette.fill({ color: 0x000000, alpha: edgeAlpha });
    vignette.rect(0, sh * 0.92, sw, sh * 0.08);
    vignette.fill({ color: 0x000000, alpha: edgeAlpha });
    vignette.rect(0, 0, sw * 0.04, sh);
    vignette.fill({ color: 0x000000, alpha: edgeAlpha * 0.5 });
    vignette.rect(sw * 0.96, 0, sw * 0.04, sh);
    vignette.fill({ color: 0x000000, alpha: edgeAlpha * 0.5 });
  }

  // Rebuild stadium for initial size
  stadium.rebuild(screenW(), screenH());
  fitCamera();

  // ════════════════════════════════════════════════════
  //  TICK LOOP
  // ════════════════════════════════════════════════════

  app.ticker.add((ticker) => {
    const dt = ticker.deltaMS / 1000; // seconds
    const dtFactor = ticker.deltaMS / 16.67;
    const now = performance.now();

    // ── On minute change: recompute targets ──
    if (ctx.currentMinute !== lastMinute) {
      lastMinute = ctx.currentMinute;

      // Sync stamina
      for (const ps of allPlayers) {
        ps.stamina = ctx.stamina[ps.id] ?? 80;
      }

      computeTargets(ctx, hFormation, aFormation, allPlayers, ball);

      // Check for new events
      if (ctx.events.length > lastEventCount) {
        const newEvents = ctx.events.slice(lastEventCount);
        lastEventCount = ctx.events.length;

        for (const ev of newEvents) {
          if (
            ["goal", "penalty_scored", "free_kick_goal"].includes(ev.type)
          ) {
            effectLayer.triggerEffect("goal");
            goalText.show();
            cameraShake.trigger(6, 600);
            particles.emit(
              screenW() / 2,
              screenH() / 2,
              60,
              [0xffd700, 0xff6b35, 0x00ff88, 0xffffff],
            );
            // Camera zoom on ball position (goal area)
            eventCamera.triggerZoom(
              { ...ball.current },
              ZOOM_EVENT,
              2000,
            );
            // Launch ball into air (net hit arc)
            ballArcActive = true;
            ballArcStart = { ...ball.current };
            const goalY = ball.current.y < WORLD_H / 2 ? 14 : WORLD_H - 14;
            ballArcEnd = { x: WORLD_W / 2, y: goalY };
            ballArcProgress = 0;
            ballArcDuration = 0.5;
            ballArcPeakHeight = 25;
            // Crowd excitement spike
            crowdExcitement = 1.0;
            // Scene data play line
            if (ev.sceneData) {
              playLines.playScene(ev.sceneData, allPlayers, ball);
            } else {
              // Synthetic shot line to goal
              playLines.addLine(ball.current, { x: WORLD_W / 2, y: goalY }, 'shot_line', 1500);
            }
            // Commentary
            commentary.show(ev.description, 4000, true);
            break;
          } else if (
            ["shot_saved", "shot_post", "shot_missed", "shot_blocked"].includes(
              ev.type,
            )
          ) {
            effectLayer.triggerEffect(ev.type);
            cameraShake.trigger(2.5, 300);
            // Quick zoom on the action
            eventCamera.triggerZoom(
              { ...ball.current },
              1.15,
              800,
            );
            // Shot arc
            ballArcActive = true;
            ballArcStart = { ...ball.current };
            const shotGoalY = ball.current.y < WORLD_H / 2 ? 30 : WORLD_H - 30;
            ballArcEnd = { x: WORLD_W / 2 + (seededRandom(now) - 0.5) * 60, y: shotGoalY };
            ballArcProgress = 0;
            ballArcDuration = 0.4;
            ballArcPeakHeight = 18;
            crowdExcitement = Math.min(1, crowdExcitement + 0.4);
            // Scene data or synthetic
            if (ev.sceneData) {
              playLines.playScene(ev.sceneData, allPlayers, ball);
            } else {
              playLines.addLine(ball.current, { x: WORLD_W / 2, y: shotGoalY }, 'shot_line', 1200);
            }
            commentary.show(ev.description, 3000);
            break;
          } else if (["red_card", "second_yellow"].includes(ev.type)) {
            effectLayer.triggerEffect(ev.type);
            cameraShake.trigger(3, 400);
            particles.emit(
              screenW() / 2,
              screenH() / 3,
              25,
              [0xff0000, 0xff4444],
            );
            // Zoom on foul area
            eventCamera.triggerZoom(
              { ...ball.current },
              1.25,
              1200,
            );
            crowdExcitement = Math.min(1, crowdExcitement + 0.6);
            commentary.show(ev.description, 3500, true);
            break;
          } else if (ev.type === "yellow_card") {
            cameraShake.trigger(1.5, 200);
            crowdExcitement = Math.min(1, crowdExcitement + 0.25);
            commentary.show(ev.description, 2500);
            break;
          } else if (ev.type === "corner") {
            crowdExcitement = Math.min(1, crowdExcitement + 0.15);
            commentary.show(ev.description, 2000);
            break;
          } else if (ev.type === "foul") {
            commentary.show(ev.description, 2000);
            break;
          } else if (ev.type === "substitution") {
            commentary.show(ev.description, 2500);
            break;
          } else if (ev.type === "offside") {
            commentary.show(ev.description, 2000);
            break;
          } else if (ev.type === "half_time" || ev.type === "full_time") {
            commentary.show(ev.description, 4000, true);
            break;
          }
        }
      }
    }

    // ── Micro-wandering ──
    wanderSeed += dt;
    for (let i = 0; i < allPlayers.length; i++) {
      const p = allPlayers[i];
      if (p.isGK) {
        p.current = lerpVec(
          p.current,
          p.target,
          LERP_SPEED * dtFactor * 0.8,
        );
      } else {
        const wx =
          Math.sin(wanderSeed * 1.3 + i * 2.7) * 6 +
          Math.sin(wanderSeed * 0.7 + i * 4.1) * 3;
        const wy =
          Math.cos(wanderSeed * 1.1 + i * 3.3) * 5 +
          Math.cos(wanderSeed * 0.5 + i * 1.9) * 2;
        const wanderTarget = {
          x: clamp(p.target.x + wx, 30, WORLD_W - 30),
          y: clamp(p.target.y + wy, 30, WORLD_H - 30),
        };
        p.current = lerpVec(
          p.current,
          wanderTarget,
          LERP_SPEED * dtFactor,
        );
      }
    }

    // ── Ball passing ──
    if (
      !ballArcActive &&
      now > nextPassTime &&
      ball.carrier >= 0 &&
      ball.carrier < allPlayers.length
    ) {
      const carrier = allPlayers[ball.carrier];
      const teammates = allPlayers.filter(
        (p) =>
          p.isHome === carrier.isHome && p.id !== carrier.id && !p.isGK,
      );
      if (teammates.length > 0) {
        const dists = teammates.map((t) => ({
          t,
          d: Math.max(30, dist(carrier.current, t.current)),
        }));
        dists.sort((a, b) => a.d - b.d);
        const candidates = dists.slice(0, Math.min(3, dists.length));
        const pick =
          candidates[
            Math.floor(seededRandom(now * 0.01) * candidates.length)
          ];
        if (pick) {
          ball.carrier = allPlayers.indexOf(pick.t);

          // Short pass arc for longer passes
          const passDist = dist(carrier.current, pick.t.current);
          if (passDist > 100) {
            ballArcActive = true;
            ballArcStart = { ...ball.current };
            ballArcEnd = { ...pick.t.current };
            ballArcProgress = 0;
            ballArcDuration = 0.35 + passDist / 800;
            ballArcPeakHeight = 6 + passDist / 50;
          }
        }
      }
      nextPassTime = now + 1500 + seededRandom(now * 0.003) * 2000;
    }

    // ── Ball arc physics ──
    if (ballArcActive) {
      ballArcProgress += dt / ballArcDuration;
      if (ballArcProgress >= 1) {
        ballArcActive = false;
        ballArcProgress = 1;
        ball.height = 0;
        ball.heightVel = 0;
      } else {
        // Parabolic arc: height = 4 * peak * t * (1-t)
        const t = ballArcProgress;
        ball.height = 4 * ballArcPeakHeight * t * (1 - t);
        // Interpolate XY along ground
        ball.current = lerpVec(ballArcStart, ballArcEnd, t);
      }
      // Spin proportional to speed
      ball.spinAngle += dt * 12;
    } else {
      // ── Normal ball interpolation ──
      const bl = BALL_LERP * dtFactor;
      if (ball.carrier >= 0 && ball.carrier < allPlayers.length) {
        const c = allPlayers[ball.carrier];
        const cp = { x: c.current.x + 8, y: c.current.y + 4 };
        ball.current = lerpVec(ball.current, cp, bl * 1.5);
      } else {
        ball.current = lerpVec(ball.current, ball.target, bl);
      }
      // Gentle spin when on ground
      ball.spinAngle += dt * 2;
      // Decay height
      ball.height = Math.max(0, ball.height * 0.92);
    }

    ball.trail.push({ ...ball.current });
    if (ball.trail.length > 14) ball.trail.shift();

    // ── Update player sprite positions ──
    for (const p of allPlayers) {
      p.container.x = p.current.x;
      p.container.y = p.current.y;
      // Sort by Y so further players render behind
      p.container.zIndex = Math.round(p.current.y);

      // Update stamina arc
      p.staminaArc.clear();
      const stamPct = clamp(p.stamina / 100, 0, 1);
      if (stamPct < 0.6) {
        const stamCol = stamPct < 0.3 ? 0xef4444 : 0xeab308;
        p.staminaArc.setStrokeStyle({ width: 2, color: stamCol });
        p.staminaArc.arc(
          0,
          0,
          PLAYER_R + 2,
          0.6 * Math.PI,
          0.6 * Math.PI + stamPct * 1.8 * Math.PI,
        );
        p.staminaArc.stroke();
      }

      // Ball carrier glow
      const isCarrier =
        ball.carrier >= 0 && allPlayers[ball.carrier]?.id === p.id;
      p.disc.alpha = isCarrier ? 1 : 0.92;
      // Scale up slightly if carrier
      p.container.scale.set(isCarrier ? 1.08 : 1);
    }

    // ── Ball sprite position (with height offset) ──
    ball.container.x = ball.current.x;
    ball.container.y = ball.current.y;
    ball.container.zIndex = Math.round(ball.current.y) + 1;

    // Ball body lifts up with height, shadow stays on ground
    ball.body.y = -ball.height;
    ball.body.rotation = ball.spinAngle;
    // Shadow spreads/fades when ball is high
    const shadowScale = 1 + ball.height * 0.02;
    ball.shadow.scale.set(shadowScale, shadowScale * 0.5);
    ball.shadow.alpha = Math.max(0.1, 0.35 - ball.height * 0.008);

    // Draw trail
    ball.trailGfx.clear();
    if (ball.trail.length > 1) {
      ball.trailGfx.setStrokeStyle({
        width: 2,
        color: 0xffffff,
        alpha: 0.15,
      });
      ball.trailGfx.moveTo(
        ball.trail[0].x - ball.current.x,
        ball.trail[0].y - ball.current.y,
      );
      for (let i = 1; i < ball.trail.length; i++) {
        ball.trailGfx.lineTo(
          ball.trail[i].x - ball.current.x,
          ball.trail[i].y - ball.current.y,
        );
      }
      ball.trailGfx.stroke();
    }

    // ── Event camera zoom ──
    const camState = eventCamera.getState(now);
    currentZoom = lerp(currentZoom, camState.zoom, ZOOM_LERP * dtFactor * 3);

    // ── Smooth camera following ball (or event focus) ──
    if (camState.focus) {
      cameraTarget = { ...camState.focus };
    } else {
      cameraTarget = { x: ball.current.x, y: ball.current.y };
    }
    cameraCurrent = lerpVec(cameraCurrent, cameraTarget, CAMERA_LERP * dtFactor);

    // ── Refit with zoom + shake every frame ──
    fitCamera();

    // ── HUD updates ──
    effectLayer.update(now);
    goalText.update(now);
    particles.update(dt);
    possBar.update(ctx.homeStats.possession, homeColorHex, awayColorHex);
    scoreboard.update(
      ctx.homeTeam.shortName,
      ctx.awayTeam.shortName,
      ctx.homeScore,
      ctx.awayScore,
      ctx.currentMinute,
      homeColorHex,
      awayColorHex,
    );
    weatherSys.update(dt, screenW(), screenH());
    commentary.update(now);

    // ── World-space updates ──
    playLines.update(now);
    lighting.update(ctx.currentMinute, screenW(), screenH());

    // ── Crowd excitement decay + update ──
    crowdExcitement = Math.max(0.05, crowdExcitement - dt * 0.15);
    crowdAnim.update(dt, crowdExcitement);
  });

  // ════════════════════════════════════════════════════
  //  PUBLIC API
  // ════════════════════════════════════════════════════

  function handleResize(w: number, h: number) {
    app.renderer.resize(w, h);
    fitCamera();
  }

  function updateCtx(
    newCtx: LiveMatchContext,
    newHomeFormation?: FormationType,
    newAwayFormation?: FormationType,
  ) {
    ctx = newCtx;
    hFormation = newHomeFormation;
    aFormation = newAwayFormation;

    // Handle substitutions: sync player list
    const currentIds = new Set([
      ...ctx.homePlayers.map((p) => p.id),
      ...ctx.awayPlayers.map((p) => p.id),
    ]);

    // Remove departed players
    for (let i = allPlayers.length - 1; i >= 0; i--) {
      if (!currentIds.has(allPlayers[i].id)) {
        playerLayer.removeChild(allPlayers[i].container);
        allPlayers[i].container.destroy({ children: true });
        allPlayers.splice(i, 1);
      }
    }

    // Add new subs
    const existingIds = new Set(allPlayers.map((p) => p.id));
    for (let i = 0; i < ctx.homePlayers.length; i++) {
      const p = ctx.homePlayers[i];
      if (!existingIds.has(p.id)) {
        const ps = createPlayerSprite(
          p,
          true,
          i + 1,
          ctx.stamina[p.id] ?? 80,
          homeColors,
          awayColors,
        );
        ps.current = { x: WORLD_W / 2, y: WORLD_H - 40 };
        allPlayers.push(ps);
        playerLayer.addChild(ps.container);
      }
    }
    for (let i = 0; i < ctx.awayPlayers.length; i++) {
      const p = ctx.awayPlayers[i];
      if (!existingIds.has(p.id)) {
        const ps = createPlayerSprite(
          p,
          false,
          i + 1,
          ctx.stamina[p.id] ?? 80,
          homeColors,
          awayColors,
        );
        ps.current = { x: WORLD_W / 2, y: 40 };
        allPlayers.push(ps);
        playerLayer.addChild(ps.container);
      }
    }

    // Sync weather
    weatherSys.setWeather(ctx.weather?.type ?? "sunny", screenW(), screenH());
  }

  function destroy() {
    app.destroy(true, { children: true });
  }

  return { destroy, resize: handleResize, updateCtx };
}
