"use client";

import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Newspaper, Trophy, Swords, HeartPulse, FileText, Building2,
  Star, MessageCircle, ScrollText, Sparkles, Users, Dumbbell,
  AlertTriangle, TrendingUp, ChevronDown, ChevronUp,
} from "lucide-react";
import { useNews, useAllPlayers, useCurrentDate } from "@/store/selectors";
import { useGameStore } from "@/store/game-store";
import type { NewsType } from "@/types/news";

// ── Type-specific config ──
const NEWS_CONFIG: Record<NewsType, { icon: typeof Trophy; color: string; bg: string; label: string }> = {
  result:    { icon: Swords,        color: 'text-blue-400',   bg: 'bg-blue-500/10 border-blue-500/20',   label: 'Ergebnis' },
  transfer:  { icon: Users,         color: 'text-emerald-400',bg: 'bg-emerald-500/10 border-emerald-500/20', label: 'Transfer' },
  injury:    { icon: HeartPulse,    color: 'text-red-400',    bg: 'bg-red-500/10 border-red-500/20',     label: 'Verletzung' },
  press:     { icon: MessageCircle, color: 'text-purple-400', bg: 'bg-purple-500/10 border-purple-500/20', label: 'Presse' },
  board:     { icon: Building2,     color: 'text-amber-400',  bg: 'bg-amber-500/10 border-amber-500/20', label: 'Vorstand' },
  milestone: { icon: Star,          color: 'text-yellow-400', bg: 'bg-yellow-500/10 border-yellow-500/20', label: 'Meilenstein' },
  rumor:     { icon: MessageCircle, color: 'text-pink-400',   bg: 'bg-pink-500/10 border-pink-500/20',   label: 'Gerücht' },
  contract:  { icon: ScrollText,    color: 'text-orange-400', bg: 'bg-orange-500/10 border-orange-500/20', label: 'Vertrag' },
  youth:     { icon: Sparkles,      color: 'text-cyan-400',   bg: 'bg-cyan-500/10 border-cyan-500/20',   label: 'Jugend' },
  general:   { icon: FileText,      color: 'text-slate-400',  bg: 'bg-slate-500/10 border-slate-500/20', label: 'Allgemein' },
};

const FILTER_TABS: { key: string; label: string; types: NewsType[] }[] = [
  { key: 'all',      label: 'Alle',         types: [] },
  { key: 'results',  label: 'Ergebnisse',   types: ['result'] },
  { key: 'squad',    label: 'Kader',        types: ['injury', 'transfer', 'contract', 'youth', 'milestone'] },
  { key: 'club',     label: 'Verein',       types: ['board', 'press', 'general'] },
];

function formatDateDE(dateStr: string): string {
  const d = new Date(dateStr);
  const days = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const months = ['Jan', 'Feb', 'Mär', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Dez'];
  return `${days[d.getDay()]}, ${d.getDate()}. ${months[d.getMonth()]} ${d.getFullYear()}`;
}

export default function NewsPage() {
  const allNews = useNews();
  const allPlayers = useAllPlayers();
  const currentDate = useCurrentDate();
  const markAllNewsRead = useGameStore((s) => s.markAllNewsRead);
  const [activeFilter, setActiveFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showArchive, setShowArchive] = useState(false);

  const playerMap = useMemo(() => {
    const map: Record<string, { name: string; position: string }> = {};
    for (const p of allPlayers) {
      map[p.id] = { name: `${p.firstName} ${p.lastName}`, position: p.position };
    }
    return map;
  }, [allPlayers]);

  // Split news into recent (last 4 weeks) and archive
  const { recentNews, archiveNews } = useMemo(() => {
    const cutoff = new Date(currentDate);
    cutoff.setDate(cutoff.getDate() - 28);
    const cutoffStr = cutoff.toISOString().split('T')[0];
    const recent = allNews.filter(n => n.date >= cutoffStr);
    const archive = allNews.filter(n => n.date < cutoffStr);
    return { recentNews: recent, archiveNews: archive };
  }, [allNews, currentDate]);

  const newsToShow = showArchive ? allNews : recentNews;

  const filteredNews = useMemo(() => {
    const reversed = [...newsToShow].reverse();
    const tab = FILTER_TABS.find(t => t.key === activeFilter);
    if (!tab || tab.types.length === 0) return reversed;
    return reversed.filter(n => tab.types.includes(n.type));
  }, [newsToShow, activeFilter]);

  // Group by month/year: current year → per month, past years → per year
  const groupedNews = useMemo(() => {
    const currentYear = new Date(currentDate).getFullYear();
    const MONTHS_DE = ['Januar', 'Februar', 'März', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember'];
    const groups: { key: string; label: string; items: typeof filteredNews }[] = [];
    const groupMap = new Map<string, typeof filteredNews>();

    for (const item of filteredNews) {
      const d = new Date(item.date);
      const year = d.getFullYear();
      const month = d.getMonth();
      // Current year: group by month; past years: group by year
      const key = year === currentYear ? `${year}-${String(month).padStart(2, '0')}` : `${year}`;
      if (!groupMap.has(key)) groupMap.set(key, []);
      groupMap.get(key)!.push(item);
    }

    // Sort keys descending (newest first)
    const sortedKeys = [...groupMap.keys()].sort((a, b) => b.localeCompare(a));
    for (const key of sortedKeys) {
      const items = groupMap.get(key)!;
      let label: string;
      if (key.includes('-')) {
        // Current year month: "2026-01" → "Januar 2026"
        const [y, m] = key.split('-');
        label = `${MONTHS_DE[parseInt(m)]} ${y}`;
      } else {
        // Past year: "2025"
        label = key;
      }
      groups.push({ key, label, items });
    }
    return groups;
  }, [filteredNews, currentDate]);

  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set());
  const toggleGroup = (key: string) => {
    setCollapsedGroups(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Stats
  const unreadCount = allNews.filter(n => !n.isRead).length;
  const highCount = allNews.filter(n => n.importance === 'high' && !n.isRead).length;

  return (
    <div className="space-y-4 animate-slide-up max-w-[1400px] mx-auto">
      {/* ═══ Page Header ═══ */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h1 className="font-display text-xl font-bold tracking-tight">Neuigkeiten</h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            {unreadCount > 0 ? `${unreadCount} ungelesen` : 'Alle gelesen'}
            {highCount > 0 && <span className="text-red-400 ml-2">({highCount} wichtig)</span>}
            {archiveNews.length > 0 && (
              <span className="text-muted-foreground/60 ml-2">&middot; {archiveNews.length} im Archiv</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {archiveNews.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 rounded-lg"
              onClick={() => setShowArchive(!showArchive)}
            >
              {showArchive ? 'Archiv ausblenden' : 'Archiv anzeigen'}
            </Button>
          )}
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-8 rounded-lg"
              onClick={markAllNewsRead}
            >
              ✓ Alle gelesen
            </Button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTER_TABS.map(tab => (
          <Button
            key={tab.key}
            size="sm"
            variant={activeFilter === tab.key ? 'default' : 'outline'}
            className="text-xs h-7 px-3 shrink-0"
            onClick={() => setActiveFilter(tab.key)}
          >
            {tab.label}
            {tab.key !== 'all' && (() => {
              const count = allNews.filter(n => tab.types.includes(n.type) && !n.isRead).length;
              return count > 0 ? <span className="ml-1.5 bg-primary/20 text-primary px-1 rounded text-[9px]">{count}</span> : null;
            })()}
          </Button>
        ))}
      </div>

      {filteredNews.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Newspaper className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Keine Neuigkeiten</p>
            <p className="text-xs mt-1">In dieser Kategorie gibt es noch keine Nachrichten.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {groupedNews.map((group) => {
            const isCollapsed = collapsedGroups.has(group.key);
            return (
            <div key={group.key}>
              {/* Month/Year Header */}
              <button
                className="flex items-center gap-2 mb-2 w-full group cursor-pointer"
                onClick={() => toggleGroup(group.key)}
              >
                <div className="h-px flex-1 bg-border" />
                <span className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider px-2 flex items-center gap-1.5">
                  {group.label}
                  <span className="text-[9px] font-normal text-muted-foreground/60">({group.items.length})</span>
                  {isCollapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
                </span>
                <div className="h-px flex-1 bg-border" />
              </button>

              {!isCollapsed && <div className="space-y-1.5">
                {group.items.map((item) => {
                  const config = NEWS_CONFIG[item.type] ?? NEWS_CONFIG.general;
                  const Icon = config.icon;
                  const hasMultiLine = item.content.includes('\n');
                  const isExpanded = expandedIds.has(item.id);
                  const contentLines = item.content.split('\n');
                  const preview = contentLines[0];
                  const relatedPlayer = item.relatedPlayerId ? playerMap[item.relatedPlayerId] : null;

                  return (
                    <Card
                      key={item.id}
                      className={`bg-card border transition-all ${
                        !item.isRead ? 'border-l-2 border-l-primary' : 'border-border'
                      } ${item.importance === 'high' ? 'ring-1 ring-red-500/20' : ''}`}
                    >
                      <CardContent className="p-0">
                        <div
                          className={`flex items-start gap-3 p-3 ${hasMultiLine ? 'cursor-pointer' : ''}`}
                          onClick={hasMultiLine ? () => toggleExpand(item.id) : undefined}
                        >
                          {/* Icon */}
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${config.bg}`}>
                            <Icon className={`w-4 h-4 ${config.color}`} />
                          </div>

                          <div className="flex-1 min-w-0">
                            {/* Header row */}
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-center gap-2 flex-wrap min-w-0">
                                <h3 className="font-semibold text-sm leading-tight">{item.title}</h3>
                                {item.importance === 'high' && (
                                  <span className="text-[8px] px-1.5 py-0.5 rounded bg-red-500/15 border border-red-500/30 text-red-400 font-bold uppercase tracking-wider shrink-0">
                                    Wichtig
                                  </span>
                                )}
                              </div>
                              {hasMultiLine && (
                                <button className="text-muted-foreground shrink-0 mt-0.5">
                                  {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                </button>
                              )}
                            </div>

                            {/* Player badge */}
                            {relatedPlayer && (
                              <div className="flex items-center gap-1.5 mt-1">
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-secondary/50 border border-border font-mono font-bold text-muted-foreground">
                                  {relatedPlayer.position}
                                </span>
                                <span className="text-[10px] font-medium text-foreground/80">{relatedPlayer.name}</span>
                              </div>
                            )}

                            {/* Content */}
                            <div className="mt-1.5">
                              {!hasMultiLine ? (
                                <p className="text-xs text-muted-foreground leading-relaxed">{item.content}</p>
                              ) : isExpanded ? (
                                <div className="space-y-1">
                                  {contentLines.map((line, i) => (
                                    <p key={i} className={`text-xs leading-relaxed ${
                                      line.startsWith('Torschützen:') || line.startsWith('Vorlagen:') ? 'text-foreground/80 font-medium' :
                                      line.startsWith('Spieler des Spiels:') || line.startsWith('Bester Spieler:') ? 'text-yellow-400 font-medium' :
                                      line.startsWith('Verbesserungen:') ? 'text-green-400/80' :
                                      line.includes('Level-Up') ? 'text-blue-400 font-medium' :
                                      line.includes('Verletzt') ? 'text-red-400 font-medium' :
                                      'text-muted-foreground'
                                    }`}>
                                      {line}
                                    </p>
                                  ))}
                                </div>
                              ) : (
                                <p className="text-xs text-muted-foreground leading-relaxed">
                                  {preview}
                                  <span className="text-primary ml-1 text-[10px]">+{contentLines.length - 1} mehr</span>
                                </p>
                              )}
                            </div>

                            {/* Type badge + date */}
                            <div className="flex items-center gap-2 mt-2">
                              <span className={`text-[8px] px-1.5 py-0.5 rounded border font-medium uppercase tracking-wider ${config.bg} ${config.color}`}>
                                {config.label}
                              </span>
                              <span className="text-[10px] text-muted-foreground/60">
                                {formatDateDE(item.date)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>}
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
