"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { TeamLogo } from "@/components/ui/team-logo";
import { Team } from "@/types/team";
import { ManagerProfile, SKILL_NAMES, ManagerSkills } from "@/types/manager";

interface Props {
  team: Team;
  manager: ManagerProfile;
  onComplete: () => void;
}

// ── Splash Phases ──
type SplashPhase = 'blackout' | 'club_reveal' | 'club_details' | 'manager_card' | 'missions' | 'ready';

const PHASE_DURATION: Record<SplashPhase, number> = {
  blackout: 800,
  club_reveal: 2200,
  club_details: 3000,
  manager_card: 3500,
  missions: 2500,
  ready: 0, // user-driven
};

const PHASES: SplashPhase[] = ['blackout', 'club_reveal', 'club_details', 'manager_card', 'missions', 'ready'];

function getLeagueName(leagueId: string): string {
  if (leagueId === 'bundesliga') return '1. Bundesliga';
  if (leagueId === 'zweite-liga') return '2. Bundesliga';
  if (leagueId === 'dritte-liga') return '3. Liga';
  return leagueId;
}

function getExpectationText(pos: number): string {
  if (pos <= 3) return 'Meisterschaftskandidat';
  if (pos <= 6) return 'Internationaler Wettbewerb';
  if (pos <= 10) return 'Obere Tabellenhälfte';
  if (pos <= 14) return 'Mittelfeldplatz';
  return 'Klassenerhalt';
}

function formatBudget(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} Mio. €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k €`;
  return `${amount} €`;
}

function SkillBar({ value, max = 20 }: { value: number; max?: number }) {
  const pct = (value / max) * 100;
  const color = pct >= 50 ? 'bg-emerald-500' : pct >= 30 ? 'bg-yellow-500' : 'bg-orange-500';
  return (
    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
      <motion.div
        className={`h-full rounded-full ${color}`}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </div>
  );
}

export function GameStartSplash({ team, manager, onComplete }: Props) {
  const router = useRouter();
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = PHASES[phaseIdx];

  // Auto-advance phases
  useEffect(() => {
    if (phase === 'ready') return;
    const timeout = setTimeout(() => {
      setPhaseIdx(prev => Math.min(prev + 1, PHASES.length - 1));
    }, PHASE_DURATION[phase]);
    return () => clearTimeout(timeout);
  }, [phase]);

  const handleStart = useCallback(() => {
    onComplete();
    router.push('/game/preseason');
  }, [onComplete, router]);

  // Skip on click (advance to next phase, or start if at ready)
  const handleClick = useCallback(() => {
    if (phase === 'ready') {
      handleStart();
    } else {
      setPhaseIdx(prev => Math.min(prev + 1, PHASES.length - 1));
    }
  }, [phase, handleStart]);

  const primaryColor = team.colors.primary;
  const secondaryColor = team.colors.secondary;

  return (
    <motion.div
      className="fixed inset-0 z-[9999] flex items-center justify-center overflow-hidden cursor-pointer select-none"
      style={{ background: `linear-gradient(135deg, ${primaryColor}22 0%, #09090b 40%, #09090b 60%, ${secondaryColor}22 100%)` }}
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      {/* Ambient glow */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full blur-[120px]"
          style={{ background: primaryColor, width: 600, height: 600, opacity: 0.08 }}
          animate={{ scale: [1, 1.2, 1], opacity: [0.06, 0.12, 0.06] }}
          transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        />
      </div>

      <div className="relative z-10 w-full max-w-3xl px-6">
        <AnimatePresence mode="wait">

          {/* Phase: Blackout → subtle text */}
          {phase === 'blackout' && (
            <motion.div
              key="blackout"
              className="text-center"
              initial={{ opacity: 0 }}
              animate={{ opacity: 0.6 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <p className="text-sm tracking-[0.3em] uppercase text-white/40">Saison 2025/26</p>
            </motion.div>
          )}

          {/* Phase: Club Reveal — big logo + name */}
          {phase === 'club_reveal' && (
            <motion.div
              key="club_reveal"
              className="flex flex-col items-center gap-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, y: -30 }}
              transition={{ duration: 0.6, ease: 'easeOut' }}
            >
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.8, ease: [0.34, 1.56, 0.64, 1] }}
              >
                <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={120} />
              </motion.div>
              <motion.h1
                className="font-display text-4xl md:text-5xl font-bold text-white text-center"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {team.name}
              </motion.h1>
              <motion.p
                className="text-lg text-white/50 tracking-wide"
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.6, duration: 0.4 }}
              >
                {getLeagueName(team.league)} • Gegründet {team.founded}
              </motion.p>
            </motion.div>
          )}

          {/* Phase: Club Details — stadium, budget, expectations */}
          {phase === 'club_details' && (
            <motion.div
              key="club_details"
              className="space-y-8"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-4 justify-center">
                <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={56} />
                <div>
                  <h2 className="text-2xl font-bold text-white">{team.name}</h2>
                  <p className="text-sm text-white/40">{getLeagueName(team.league)}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  { label: 'Stadion', value: team.stadium.name, sub: `${(team.stadium.capacity).toLocaleString('de-DE')} Plätze` },
                  { label: 'Budget', value: formatBudget(team.budget), sub: 'Transferbudget' },
                  { label: 'Erwartung', value: getExpectationText(team.boardExpectations.leaguePosition), sub: `Platz ${team.boardExpectations.leaguePosition}` },
                  { label: 'Fan-Loyalität', value: `${team.fans.loyalty}/100`, sub: `Ø ${team.fans.baseAttendance.toLocaleString('de-DE')} Zuschauer` },
                ].map((item, i) => (
                  <motion.div
                    key={item.label}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm"
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.15 * i, duration: 0.4 }}
                  >
                    <p className="text-[10px] uppercase tracking-wider text-white/30">{item.label}</p>
                    <p className="text-sm font-bold text-white mt-1">{item.value}</p>
                    <p className="text-[10px] text-white/40 mt-0.5">{item.sub}</p>
                  </motion.div>
                ))}
              </div>

              {/* Facilities */}
              <motion.div
                className="flex items-center justify-center gap-6"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                {[
                  { label: 'Training', value: team.facilities.training },
                  { label: 'Jugend', value: team.facilities.youth },
                  { label: 'Stadion', value: team.facilities.stadium },
                  { label: 'Medizin', value: team.facilities.medical },
                ].map(f => (
                  <div key={f.label} className="text-center">
                    <p className="text-[9px] uppercase tracking-wide text-white/30">{f.label}</p>
                    <div className="flex gap-0.5 mt-1 justify-center">
                      {Array.from({ length: 10 }, (_, i) => (
                        <div key={i} className={`w-1.5 h-3 rounded-sm ${i < f.value ? 'bg-emerald-500' : 'bg-white/10'}`} />
                      ))}
                    </div>
                  </div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Phase: Manager Card — cinematic manager presentation */}
          {phase === 'manager_card' && (
            <motion.div
              key="manager_card"
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, x: -40 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex flex-col md:flex-row items-center gap-8">
                {/* Manager avatar area */}
                <motion.div
                  className="relative"
                  initial={{ scale: 0.8, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={{ duration: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                >
                  <div
                    className="w-32 h-32 rounded-2xl flex items-center justify-center text-5xl font-bold text-white/80 border-2"
                    style={{
                      borderColor: primaryColor,
                      background: `linear-gradient(135deg, ${primaryColor}30, ${secondaryColor}20)`,
                    }}
                  >
                    {manager.firstName.charAt(0)}{manager.lastName.charAt(0)}
                  </div>
                  <motion.div
                    className="absolute -bottom-2 -right-2 bg-primary text-primary-foreground text-xs font-bold px-2 py-0.5 rounded-lg"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: 0.5 }}
                  >
                    Lv. {manager.level}
                  </motion.div>
                </motion.div>

                {/* Manager info */}
                <motion.div
                  className="text-center md:text-left flex-1"
                  initial={{ x: 20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: 0.3, duration: 0.5 }}
                >
                  <p className="text-[10px] uppercase tracking-[0.2em] text-white/30">Dein Manager</p>
                  <h2 className="text-3xl font-bold text-white mt-1">
                    {manager.firstName} {manager.lastName}
                  </h2>
                  <p className="text-sm text-white/50 mt-1">
                    {manager.nationality} • {2025 - parseInt(manager.dateOfBirth.split('-')[0])} Jahre
                  </p>
                  <p className="text-xs text-white/30 mt-2">
                    Vertrag bei {team.name} bis {manager.contractUntil.split('-')[0]}
                  </p>
                </motion.div>
              </div>

              {/* Skills Grid */}
              <motion.div
                className="grid grid-cols-2 md:grid-cols-4 gap-3"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.5 }}
              >
                {(Object.entries(SKILL_NAMES) as [keyof ManagerSkills, typeof SKILL_NAMES[keyof ManagerSkills]][]).map(([key, info], i) => (
                  <motion.div
                    key={key}
                    className="p-3 rounded-lg border border-white/10 bg-white/5"
                    initial={{ y: 15, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.7 + i * 0.08, duration: 0.3 }}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-sm">{info.icon}</span>
                      <span className="text-[10px] font-medium text-white/70">{info.name}</span>
                      <span className="text-[10px] font-mono text-white/40 ml-auto">{manager.skills[key]}</span>
                    </div>
                    <SkillBar value={manager.skills[key]} />
                  </motion.div>
                ))}
              </motion.div>
            </motion.div>
          )}

          {/* Phase: Missions Preview */}
          {phase === 'missions' && (
            <motion.div
              key="missions"
              className="space-y-6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.5 }}
            >
              <motion.div
                className="text-center"
                initial={{ y: -10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
              >
                <p className="text-[10px] uppercase tracking-[0.3em] text-white/30">Deine ersten</p>
                <h2 className="text-2xl font-bold text-white mt-1">Wöchentlichen Missionen</h2>
                <p className="text-xs text-white/40 mt-1">Erfülle Missionen, um XP zu sammeln und Manager-Traits freizuschalten</p>
              </motion.div>

              <div className="space-y-3 max-w-md mx-auto">
                {manager.activeMissions.map((mission, i) => (
                  <motion.div
                    key={mission.id}
                    className="p-4 rounded-xl border border-white/10 bg-white/5 backdrop-blur-sm flex items-start gap-3"
                    initial={{ x: -30, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ delay: 0.3 + i * 0.2, duration: 0.4 }}
                  >
                    <span className="text-2xl">{mission.icon}</span>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-white">{mission.title}</p>
                      <p className="text-xs text-white/50 mt-0.5">{mission.description}</p>
                      <div className="flex items-center gap-2 mt-2">
                        <span className="text-[9px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-medium">+{mission.reward.xp} XP</span>
                        {mission.reward.skillBoost && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-medium">
                            +{mission.reward.skillBoost.amount} {SKILL_NAMES[mission.reward.skillBoost.skill].name}
                          </span>
                        )}
                        {mission.reward.reputationBoost && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 font-medium">
                            +{mission.reward.reputationBoost} Reputation
                          </span>
                        )}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Phase: Ready — final call to action */}
          {phase === 'ready' && (
            <motion.div
              key="ready"
              className="text-center space-y-8"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6 }}
            >
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.5 }}
              >
                <TeamLogo teamId={team.id} teamName={team.name} shortName={team.shortName} colors={team.colors} size={80} />
              </motion.div>

              <div>
                <motion.h2
                  className="text-3xl md:text-4xl font-bold text-white"
                  initial={{ y: 15, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                >
                  {manager.firstName} {manager.lastName}
                </motion.h2>
                <motion.p
                  className="text-lg text-white/50 mt-1"
                  initial={{ y: 10, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.4 }}
                >
                  Cheftrainer von {team.name}
                </motion.p>
              </div>

              <motion.div
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.7 }}
              >
                <button
                  onClick={(e) => { e.stopPropagation(); handleStart(); }}
                  className="group relative px-10 py-4 rounded-xl font-bold text-lg text-white overflow-hidden transition-all hover:scale-105 active:scale-95"
                  style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor || primaryColor})` }}
                >
                  <span className="relative z-10">🏟️ Saison starten</span>
                  <div className="absolute inset-0 bg-white/0 group-hover:bg-white/10 transition-colors" />
                </button>
              </motion.div>

              <motion.p
                className="text-xs text-white/20"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                Klicke irgendwo oder drücke den Button
              </motion.p>
            </motion.div>
          )}

        </AnimatePresence>

        {/* Phase indicator dots */}
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 flex gap-2">
          {PHASES.map((p, i) => (
            <motion.div
              key={p}
              className={`w-1.5 h-1.5 rounded-full transition-colors ${i <= phaseIdx ? 'bg-white/40' : 'bg-white/10'}`}
              animate={{ scale: i === phaseIdx ? 1.3 : 1 }}
            />
          ))}
        </div>

        {/* Skip hint */}
        {phase !== 'ready' && (
          <motion.p
            className="fixed bottom-4 left-1/2 -translate-x-1/2 text-[10px] text-white/15"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2 }}
          >
            Klicke zum Überspringen
          </motion.p>
        )}
      </div>
    </motion.div>
  );
}
