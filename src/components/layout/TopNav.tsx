import { Link, useLocation } from "react-router-dom";

function usePathname() {
  return useLocation().pathname;
}
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Users,
  Target,
  Calendar,
  TableProperties,
  ArrowLeftRight,
  Wallet,
  Dumbbell,
  GraduationCap,
  UserCog,
  Settings,
  Newspaper,
  Trophy,
  BarChart3,
  User,
  Globe,
  Gift,
  Layers,
  LucideIcon,
  ChevronDown,
  Save,
  ChevronRight,
  CalendarDays,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCallback, useMemo, useRef, useState, useEffect } from "react";
import { useGameStore } from "@/store/game-store";
import { getCupName } from "@/lib/cup-engine";

// ── Types ──

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

// ── Navigation Data ──

const baseSections: NavSection[] = [
  {
    title: "Spiel",
    items: [
      { label: "Dashboard", href: "/game/dashboard", icon: LayoutDashboard },
      { label: "Spielplan", href: "/game/schedule", icon: Calendar },
      { label: "Tabelle", href: "/game/table", icon: TableProperties },
      { label: "Pokal", href: "/game/cup", icon: Trophy },
      { label: "International", href: "/game/international", icon: Globe },
      { label: "News", href: "/game/news", icon: Newspaper },
    ],
  },
  {
    title: "Team",
    items: [
      { label: "Kader", href: "/game/squad", icon: Users },
      { label: "Taktik", href: "/game/tactics", icon: Target },
      { label: "Training", href: "/game/training", icon: Dumbbell },
      { label: "Jugend", href: "/game/youth", icon: GraduationCap },
    ],
  },
  {
    title: "Verein",
    items: [
      { label: "Transfers", href: "/game/transfers", icon: ArrowLeftRight },
      { label: "Finanzen", href: "/game/finances", icon: Wallet },
      { label: "Staff", href: "/game/staff", icon: UserCog },
    ],
  },
  {
    title: "Info",
    items: [
      { label: "Statistiken", href: "/game/stats", icon: BarChart3 },
      { label: "Karten", href: "/game/cards", icon: Layers },
      { label: "Manager", href: "/game/manager", icon: User },
    ],
  },
];

const QUICK_NAV: NavItem[] = [
  { label: "Dashboard", href: "/game/dashboard", icon: LayoutDashboard },
  { label: "Kader", href: "/game/squad", icon: Users },
  { label: "Taktik", href: "/game/tactics", icon: Target },
  { label: "Spielplan", href: "/game/schedule", icon: Calendar },
  { label: "Tabelle", href: "/game/table", icon: TableProperties },
  { label: "Transfers", href: "/game/transfers", icon: ArrowLeftRight },
];

// ── Helpers ──

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)}M €`;
  if (amount >= 1_000) return `${(amount / 1_000).toFixed(0)}k €`;
  return `${amount} €`;
}

function formatGameDate(dateStr?: string): string {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("de-DE", {
    weekday: "short",
    day: "2-digit",
    month: "short",
  });
}

// ── Dropdown Component (refined) ──

function NavDropdown({ section, isOpen, onToggle, onClose }: {
  section: NavSection;
  isOpen: boolean;
  onToggle: () => void;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  const hasActive = section.items.some(i => pathname.startsWith(i.href));

  useEffect(() => {
    if (!isOpen) return;
    const handle = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [isOpen, onClose]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={onToggle}
        className={cn(
          "flex items-center gap-1 px-2.5 py-1.5 text-[13px] font-medium rounded-lg transition-all duration-150",
          hasActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
          isOpen && "bg-secondary/80 text-foreground"
        )}
      >
        {section.title}
        <ChevronDown className={cn("w-3 h-3 opacity-50 transition-transform duration-200", isOpen && "rotate-180 opacity-80")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-48 rounded-xl border border-border/80 bg-popover/95 backdrop-blur-xl shadow-2xl shadow-black/40 py-1 z-50 animate-scale-in">
          <div className="px-3 py-1.5">
            <span className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground/60">{section.title}</span>
          </div>
          {section.items.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                to={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-2.5 px-3 py-1.5 text-[13px] rounded-lg mx-1 transition-all duration-150",
                  isActive
                    ? "text-primary bg-primary/10 font-medium"
                    : "text-foreground/70 hover:bg-secondary/80 hover:text-foreground"
                )}
              >
                <item.icon className={cn("w-3.5 h-3.5 shrink-0", isActive ? "text-primary" : "text-muted-foreground")} />
                <span>{item.label}</span>
                {isActive && <div className="ml-auto w-1 h-1 rounded-full bg-primary" />}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main TopNav ──

interface TopNavProps {
  teamName?: string;
  currentDate?: string;
  budget?: number;
  nextOpponent?: string;
  nextMatchDate?: string;
  onAdvance?: () => void;
  onSave?: () => void;
  canAdvance?: boolean;
  isMatchDay?: boolean;
}

export function TopNav({
  teamName = "Kein Verein",
  currentDate,
  budget = 0,
  nextOpponent,
  onAdvance,
  onSave,
  canAdvance = true,
  isMatchDay = false,
}: TopNavProps) {
  const pathname = usePathname();
  const gameState = useGameStore((s) => s.gameState);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);

  const sections = useMemo(() => {
    if (!gameState) return baseSections;
    const cupName = getCupName(gameState);
    return baseSections.map(s => ({
      ...s,
      items: s.items.map(item =>
        item.href === '/game/cup' ? { ...item, label: cupName } : item
      ),
    }));
  }, [gameState]);

  const unreadNewsCount = useMemo(() => {
    if (!gameState) return 0;
    const cutoff = new Date(gameState.currentDate);
    cutoff.setDate(cutoff.getDate() - 7);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    return gameState.news.filter(n => !n.isRead && n.date >= cutoffStr).length;
  }, [gameState]);

  const unopenedPackCount = useMemo(() => {
    if (!gameState) return 0;
    return (gameState.pendingPacks ?? []).filter(p => !p.isOpened).length;
  }, [gameState]);

  const unusedCardCount = useMemo(() => {
    if (!gameState) return 0;
    return (gameState.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired).length;
  }, [gameState]);

  const toggleDropdown = useCallback((title: string) => {
    setOpenDropdown(prev => prev === title ? null : title);
  }, []);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  const getBadge = (href: string) => {
    if (href === '/game/news' && unreadNewsCount > 0) return unreadNewsCount;
    if (href === '/game/cards' && unusedCardCount > 0) return unusedCardCount;
    return 0;
  };

  return (
    <div className="shrink-0">
      {/* ═══ Primary Navigation Bar ═══ */}
      <nav className="h-12 bg-[hsl(var(--topnav))] border-b border-border/30 flex items-center px-3 gap-0.5 glass-panel-strong">
        {/* Logo */}
        <Link to="/" className="flex items-center mr-3 shrink-0 group">
          <span className="font-display text-base font-bold tracking-tight">
            <span className="text-primary group-hover:neon-primary transition-all">LIGA</span>
            <span className="text-accent group-hover:neon-accent transition-all ml-1">PRO</span>
          </span>
        </Link>

        {/* Divider */}
        <div className="w-px h-5 bg-border/50 mr-2" />

        {/* Nav Dropdowns */}
        <div className="flex items-center gap-0.5">
          {sections.map(section => (
            <NavDropdown
              key={section.title}
              section={section}
              isOpen={openDropdown === section.title}
              onToggle={() => toggleDropdown(section.title)}
              onClose={closeDropdown}
            />
          ))}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* ── Info Strip (contextual data) ── */}
        <div className="hidden md:flex items-center gap-2 mr-2">
          {/* Team badge */}
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-secondary/50">
            <div className="w-5 h-5 rounded-md bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-display font-bold text-[8px]">
                {teamName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="font-medium text-foreground text-[11px]">{teamName}</span>
          </div>

          {/* Date */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground">
            <CalendarDays className="w-3 h-3" />
            <span>{formatGameDate(currentDate)}</span>
          </div>

          {/* Budget */}
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px]">
            <Wallet className="w-3 h-3 text-muted-foreground" />
            <span className="text-primary font-semibold font-mono">{formatCurrency(budget)}</span>
          </div>

          {/* Next opponent */}
          {nextOpponent && (
            <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted-foreground">
              <span>vs</span>
              <span className="text-foreground font-medium">{nextOpponent}</span>
            </div>
          )}
        </div>

        {/* ── Action buttons ── */}
        <div className="flex items-center gap-1">
          {/* Pack notification */}
          {unopenedPackCount > 0 && (
            <Link to="/game/cards" className="relative p-1.5 rounded-lg hover:bg-secondary/60 transition-colors">
              <Gift className="w-4 h-4 text-accent animate-pulse-soft" />
              <span className="absolute -top-0.5 -right-0.5 min-w-[14px] h-3.5 rounded-full bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                {unopenedPackCount}
              </span>
            </Link>
          )}

          {onSave && (
            <button
              onClick={onSave}
              className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
              title="Speichern"
            >
              <Save className="w-3.5 h-3.5" />
            </button>
          )}

          <Link
            to="/settings"
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-all"
            title="Einstellungen"
          >
            <Settings className="w-3.5 h-3.5" />
          </Link>

          {/* Advance button — the hero CTA */}
          {onAdvance && (
            <Button
              size="sm"
              className={cn(
                "text-xs gap-1 h-7 ml-1 rounded-lg font-semibold transition-all duration-200",
                isMatchDay
                  ? "bg-accent hover:bg-accent/90 text-accent-foreground shadow-[0_0_12px_hsl(var(--accent)/0.3)]"
                  : canAdvance
                    ? "bg-primary hover:bg-primary/90 shadow-[0_0_12px_hsl(var(--primary)/0.2)]"
                    : "bg-muted text-muted-foreground cursor-not-allowed shadow-none"
              )}
              onClick={canAdvance ? onAdvance : undefined}
              disabled={!canAdvance}
              title={!canAdvance ? 'Offene Aufgaben' : isMatchDay ? 'SPIELTAG!' : 'Tag fortsetzen'}
            >
              {isMatchDay ? "⚽ Spieltag" : "Weiter"}
              <ChevronRight className="w-3 h-3" />
            </Button>
          )}
        </div>
      </nav>

      {/* ═══ Quick-Nav Tabs (replaces bookmarks bar — cleaner) ═══ */}
      <div className="h-8 bg-[hsl(var(--surface-overlay))] border-b border-border/20 flex items-center px-3 gap-0.5 overflow-x-auto">
        {QUICK_NAV.map(item => {
          const isActive = pathname.startsWith(item.href);
          const badge = getBadge(item.href);

          return (
            <Link
              key={item.href}
              to={item.href}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-all duration-150 shrink-0",
                isActive
                  ? "bg-primary/12 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/40"
              )}
            >
              <item.icon className="w-3 h-3" />
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[14px] h-3.5 rounded-full bg-destructive text-destructive-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
