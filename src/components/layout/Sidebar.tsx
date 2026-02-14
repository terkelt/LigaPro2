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
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

const navItems = [
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
  { label: "Statistiken", href: "/game/stats", icon: Trophy },
  { label: "Manager", href: "/game/manager", icon: User },
  { label: "News", href: "/game/news", icon: Newspaper },
];

const bottomItems = [
  { label: "Optionen", href: "/settings", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

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
            return (
              <li key={item.href}>
                <Link
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
              </li>
            );
          })}
        </ul>
      </nav>

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
