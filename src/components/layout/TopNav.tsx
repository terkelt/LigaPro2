"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  Search,
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

const ALL_BOOKMARK_OPTIONS: NavItem[] = [
  { label: "Dashboard", href: "/game/dashboard", icon: LayoutDashboard },
  { label: "Kader", href: "/game/squad", icon: Users },
  { label: "Taktik", href: "/game/tactics", icon: Target },
  { label: "Spielplan", href: "/game/schedule", icon: Calendar },
  { label: "Tabelle", href: "/game/table", icon: TableProperties },
  { label: "Transfers", href: "/game/transfers", icon: ArrowLeftRight },
  { label: "Finanzen", href: "/game/finances", icon: Wallet },
  { label: "Training", href: "/game/training", icon: Dumbbell },
  { label: "Jugend", href: "/game/youth", icon: GraduationCap },
  { label: "Staff", href: "/game/staff", icon: UserCog },
  { label: "News", href: "/game/news", icon: Newspaper },
  { label: "Statistiken", href: "/game/stats", icon: BarChart3 },
  { label: "Karten", href: "/game/cards", icon: Layers },
  { label: "Manager", href: "/game/manager", icon: User },
  { label: "Pokal", href: "/game/cup", icon: Trophy },
  { label: "International", href: "/game/international", icon: Globe },
];

const DEFAULT_BOOKMARKS = [
  "/game/dashboard",
  "/game/tactics",
  "/game/squad",
  "/game/schedule",
  "/game/table",
  "/game/transfers",
];

// ── Helpers ──

function formatCurrency(amount: number): string {
  if (amount >= 1_000_000) return `${(amount / 1_000_000).toFixed(1)} Mio. €`;
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
    year: "numeric",
  });
}

// ── Dropdown Component ──

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
          "flex items-center gap-1 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
          hasActive
            ? "text-primary"
            : "text-muted-foreground hover:text-foreground",
          isOpen && "bg-secondary text-foreground"
        )}
      >
        {section.title}
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-52 rounded-xl border border-border bg-popover shadow-xl shadow-black/30 py-1.5 z-50 animate-slide-up">
          {section.items.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "text-primary bg-primary/10"
                    : "text-foreground/80 hover:bg-secondary hover:text-foreground"
                )}
              >
                <item.icon className="w-4 h-4 shrink-0" />
                <span>{item.label}</span>
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
  nextMatchDate,
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

  const bookmarkHrefs = DEFAULT_BOOKMARKS;

  const bookmarks = useMemo(() => {
    const cupName = gameState ? getCupName(gameState) : 'Pokal';
    return bookmarkHrefs.map(href => {
      const item = ALL_BOOKMARK_OPTIONS.find(o => o.href === href);
      if (!item) return null;
      if (item.href === '/game/cup') return { ...item, label: cupName };
      return item;
    }).filter(Boolean) as NavItem[];
  }, [bookmarkHrefs, gameState]);

  const toggleDropdown = useCallback((title: string) => {
    setOpenDropdown(prev => prev === title ? null : title);
  }, []);

  const closeDropdown = useCallback(() => setOpenDropdown(null), []);

  return (
    <div className="shrink-0">
      {/* ── Primary Nav Bar ── */}
      <nav className="h-12 bg-[hsl(var(--topnav))] border-b border-border/40 flex items-center px-4 gap-1 glass-panel shadow-lg shadow-black/30">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-1.5 mr-4 shrink-0">
          <span className="font-display text-lg font-bold">
            <span className="text-primary neon-primary">LIGA</span>{" "}
            <span className="text-accent neon-accent">PRO</span>
          </span>
        </Link>

        {/* Nav Sections */}
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

        {/* Info strip */}
        <div className="hidden md:flex items-center gap-3 text-xs text-muted-foreground mr-3">
          <div className="flex items-center gap-1.5">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
              <span className="text-primary font-display font-bold text-[9px]">
                {teamName.substring(0, 2).toUpperCase()}
              </span>
            </div>
            <span className="font-semibold text-foreground text-xs">{teamName}</span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1">
            <CalendarDays className="w-3 h-3" />
            <span>{formatGameDate(currentDate)}</span>
          </div>

          <span className="text-border">|</span>

          <div className="flex items-center gap-1">
            <Wallet className="w-3 h-3" />
            <span className="text-primary font-medium">{formatCurrency(budget)}</span>
          </div>

          {nextOpponent && (
            <>
              <span className="text-border">|</span>
              <span>
                vs. <span className="text-foreground font-medium">{nextOpponent}</span>
              </span>
            </>
          )}
        </div>

        {/* Pack notification */}
        {unopenedPackCount > 0 && (
          <div className="relative mr-2">
            <Gift className="w-4 h-4 text-accent animate-pulse" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-accent text-accent-foreground text-[8px] font-bold flex items-center justify-center px-0.5">
              {unopenedPackCount}
            </span>
          </div>
        )}

        {/* Actions */}
        {onSave && (
          <Button
            variant="ghost"
            size="sm"
            className="text-xs gap-1 text-muted-foreground hover:text-foreground h-8 px-2"
            onClick={onSave}
          >
            <Save className="w-3.5 h-3.5" />
          </Button>
        )}

        <Link href="/settings">
          <Button
            variant="ghost"
            size="sm"
            className="text-xs text-muted-foreground hover:text-foreground h-8 px-2"
          >
            <Settings className="w-3.5 h-3.5" />
          </Button>
        </Link>

        {onAdvance && (
          <Button
            size="sm"
            className={cn(
              "text-xs gap-1.5 h-8 ml-1",
              isMatchDay
                ? "bg-accent hover:bg-accent/90 text-accent-foreground font-bold"
                : canAdvance
                  ? "bg-primary hover:bg-primary/90"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
            )}
            onClick={canAdvance ? onAdvance : undefined}
            disabled={!canAdvance}
            title={!canAdvance ? 'Es gibt noch offene Aufgaben für heute' : isMatchDay ? 'SPIELTAG!' : ''}
          >
            {isMatchDay ? "Spieltag!" : "Weiter"}
            <ChevronRight className="w-3.5 h-3.5" />
          </Button>
        )}
      </nav>

      {/* ── Bookmarks Bar ── */}
      <div className="h-9 bg-[hsl(var(--topnav)/0.8)] border-b border-border/30 flex items-center px-4 gap-1 overflow-x-auto">
        {bookmarks.map(item => {
          const isActive = pathname.startsWith(item.href);
          const badge = item.href === '/game/news' && unreadNewsCount > 0
            ? unreadNewsCount
            : item.href === '/game/cards' && (gameState?.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired).length > 0
              ? (gameState?.cardInventory ?? []).filter(c => !c.isUsed && !c.isExpired).length
              : 0;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium transition-all shrink-0",
                isActive
                  ? "bg-primary/15 text-primary border border-primary/30"
                  : "text-muted-foreground hover:text-foreground hover:bg-secondary/60 border border-transparent"
              )}
            >
              <item.icon className="w-3 h-3" />
              <span>{item.label}</span>
              {badge > 0 && (
                <span className="min-w-[16px] h-4 rounded-full bg-destructive text-destructive-foreground text-[9px] font-bold flex items-center justify-center px-1">
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
