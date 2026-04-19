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
  ChevronLeft,
  ChevronRight,
  Newspaper,
  Trophy,
  BarChart3,
  User,
  Globe,
  Gift,
  Layers,
  LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { useGameStore } from "@/store/game-store";
import { useSettingsStore } from "@/store/settings-store";
import { getCupName } from "@/lib/cup-engine";

interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const baseNavItems: NavItem[] = [
  { label: "Dashboard", href: "/game/dashboard", icon: LayoutDashboard },
  { label: "News", href: "/game/news", icon: Newspaper },
  { label: "Kader", href: "/game/squad", icon: Users },
  { label: "Taktik", href: "/game/tactics", icon: Target },
  { label: "Spielplan", href: "/game/schedule", icon: Calendar },
  { label: "Tabelle", href: "/game/table", icon: TableProperties },
  { label: "Transfers", href: "/game/transfers", icon: ArrowLeftRight },
  { label: "Finanzen", href: "/game/finances", icon: Wallet },
  { label: "Training", href: "/game/training", icon: Dumbbell },
  { label: "Jugend", href: "/game/youth", icon: GraduationCap },
  { label: "Staff", href: "/game/staff", icon: UserCog },
  { label: "Pokal", href: "/game/cup", icon: Trophy },
  { label: "International", href: "/game/international", icon: Globe },
  { label: "Statistiken", href: "/game/stats", icon: BarChart3 },
  { label: "Karten", href: "/game/cards", icon: Layers },
  { label: "Manager", href: "/game/manager", icon: User },
];

const modernSections: NavSection[] = [
  {
    title: "Spiel",
    items: [
      { label: "Dashboard", href: "/game/dashboard", icon: LayoutDashboard },
      { label: "Spielplan", href: "/game/schedule", icon: Calendar },
      { label: "Tabelle", href: "/game/table", icon: TableProperties },
      { label: "Pokal", href: "/game/cup", icon: Trophy },
      { label: "International", href: "/game/international", icon: Globe },
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
      { label: "News", href: "/game/news", icon: Newspaper },
      { label: "Statistiken", href: "/game/stats", icon: BarChart3 },
      { label: "Karten", href: "/game/cards", icon: Layers },
      { label: "Manager", href: "/game/manager", icon: User },
    ],
  },
];

const bottomItems = [
  { label: "Optionen", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const gameState = useGameStore((s) => s.gameState);
  const menuLayout = useSettingsStore((s) => s.settings.menuLayout ?? 'classic');
  const isModern = menuLayout === 'modern';

  const navItems = useMemo(() => {
    if (!gameState) return baseNavItems;
    const cupName = getCupName(gameState);
    return baseNavItems.map(item =>
      item.href === '/game/cup' ? { ...item, label: cupName } : item
    );
  }, [gameState]);

  const sections = useMemo(() => {
    if (!gameState) return modernSections;
    const cupName = getCupName(gameState);
    return modernSections.map(s => ({
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

  const getBadge = (href: string) => {
    if (href === '/game/news' && unreadNewsCount > 0) return unreadNewsCount;
    if (href === '/game/cards' && unusedCardCount > 0) return unusedCardCount;
    return 0;
  };

  // ── Modern Layout: Icon Rail with grouped sections ──
  if (isModern) {
    return (
      <aside className="fixed left-0 top-0 z-40 h-screen w-14 bg-[hsl(var(--sidebar))] border-r border-border flex flex-col transition-all duration-300">
        {/* Logo */}
        <div className="h-14 flex items-center justify-center border-b border-border shrink-0">
          <Link href="/" className="text-primary font-display font-bold text-sm">LP</Link>
        </div>

        {/* Grouped nav */}
        <nav className="flex-1 overflow-y-auto py-1.5">
          {sections.map((section, si) => (
            <div key={section.title}>
              {si > 0 && <div className="mx-2.5 my-1.5 border-t border-border/50" />}
              <p className="text-[7px] uppercase tracking-widest text-muted-foreground/50 text-center mb-0.5 font-bold">{section.title}</p>
              {section.items.map(item => {
                const isActive = pathname.startsWith(item.href);
                const badge = getBadge(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "relative flex items-center justify-center w-full h-9 transition-colors group",
                      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                    )}
                    title={item.label}
                  >
                    {/* Active accent bar */}
                    {isActive && (
                      <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />
                    )}
                    <div className="relative">
                      <item.icon className="w-[18px] h-[18px]" />
                      {badge > 0 && (
                        <span className="absolute -top-1.5 -right-2 min-w-[14px] h-3.5 rounded-full bg-red-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </div>
                    {/* Tooltip on hover */}
                    <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                      {item.label}
                    </div>
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Pack notification */}
        {unopenedPackCount > 0 && (
          <div className="flex justify-center py-1">
            <div className="relative">
              <Gift className="w-[18px] h-[18px] text-amber-400 animate-pulse" />
              <span className="absolute -top-1 -right-1.5 min-w-[14px] h-3.5 rounded-full bg-amber-500 text-white text-[8px] font-bold flex items-center justify-center px-0.5">
                {unopenedPackCount}
              </span>
            </div>
          </div>
        )}

        {/* Bottom: settings */}
        <div className="border-t border-border py-1.5">
          {bottomItems.map(item => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "relative flex items-center justify-center w-full h-9 transition-colors group",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
                title={item.label}
              >
                {isActive && <div className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />}
                <item.icon className="w-[18px] h-[18px]" />
                <div className="absolute left-full ml-2 px-2 py-1 rounded-md bg-popover border border-border text-xs font-medium text-foreground whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity duration-150 z-50 shadow-lg">
                  {item.label}
                </div>
              </Link>
            );
          })}
        </div>
      </aside>
    );
  }

  // ── Classic Layout (original, collapsible) ──
  return (
    <aside
      className={cn(
        "fixed left-0 top-0 z-40 h-screen bg-[hsl(var(--sidebar))] border-r border-border flex flex-col transition-all duration-300",
        collapsed ? "w-16" : "w-60"
      )}
    >
      {/* Logo */}
      <div className="h-14 flex items-center px-4 border-b border-border shrink-0">
        {!collapsed && (
          <Link href="/" className="flex items-center gap-2">
            <span className="font-display text-xl font-bold">
              <span className="text-primary">LIGA</span>{" "}
              <span className="text-accent">PRO</span>
            </span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "shrink-0 text-muted-foreground hover:text-foreground h-8 w-8",
            collapsed ? "mx-auto" : "ml-auto"
          )}
          onClick={() => setCollapsed(!collapsed)}
        >
          {collapsed ? (
            <ChevronRight className="w-4 h-4" />
          ) : (
            <ChevronLeft className="w-4 h-4" />
          )}
        </Button>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-2 px-2">
        <ul className="space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const badge = getBadge(item.href);
            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors relative",
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className="relative shrink-0">
                    <item.icon className={cn(collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4")} />
                    {badge > 0 && collapsed && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                        {badge > 99 ? '99+' : badge}
                      </span>
                    )}
                  </div>
                  {!collapsed && (
                    <>
                      <span>{item.label}</span>
                      {badge > 0 && (
                        <span className="ml-auto min-w-[20px] h-5 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                          {badge > 99 ? '99+' : badge}
                        </span>
                      )}
                    </>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Pack notification */}
      {unopenedPackCount > 0 && (
        <div className="px-2 pb-1">
          <div className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium bg-amber-500/10 border border-amber-500/30 text-amber-400 animate-pulse cursor-default",
          )}>
            <Gift className={cn("shrink-0", collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4")} />
            {!collapsed && (
              <>
                <span>Packs</span>
                <span className="ml-auto min-w-[20px] h-5 rounded-full bg-amber-500 text-white text-[10px] font-bold flex items-center justify-center px-1.5">
                  {unopenedPackCount}
                </span>
              </>
            )}
            {collapsed && (
              <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-amber-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
                {unopenedPackCount}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Bottom items */}
      <div className="border-t border-border p-2">
        {bottomItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                isActive
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-secondary hover:text-foreground"
              )}
              title={collapsed ? item.label : undefined}
            >
              <item.icon className={cn("shrink-0", collapsed ? "w-5 h-5 mx-auto" : "w-4 h-4")} />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </div>
    </aside>
  );
}
