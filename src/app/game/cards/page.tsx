import { useMemo, useState, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useGameStore } from "@/store/game-store";
import { CollectibleCard, RARITY_INFO, PackRarity, RewardType } from "@/types/packs";
import { Filter, Clock, CheckCircle, XCircle, Sparkles, ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

type FilterStatus = 'all' | 'unused' | 'used' | 'expired';
type FilterRarity = 'all' | PackRarity;

const REWARD_TYPE_LABELS: Partial<Record<RewardType, string>> = {
  budget: 'Budget',
  morale_all: 'Moral',
  manager_xp: 'Manager-XP',
  condition_all: 'Kondition',
  form_boost: 'Form',
  training_double: 'Training',
  tactic_boost: 'Taktik',
  injury_heal: 'Heilung',
  contract_extend: 'Vertrag',
  scout_report: 'Scout',
  youth_quality: 'Jugend',
  player_trait: 'Eigenschaft',
  stadium_speed: 'Stadion',
  sponsor_premium: 'Sponsor',
  reputation: 'Reputation',
  match_practice: 'Spielpraxis',
};

const RARITY_BORDER: Record<PackRarity, string> = {
  common: "border-gray-500/40",
  uncommon: "border-green-500/50",
  rare: "border-blue-500/60",
  epic: "border-purple-500/70",
};

const RARITY_BG: Record<PackRarity, string> = {
  common: "from-gray-500/10 to-gray-600/5",
  uncommon: "from-green-500/15 to-green-600/5",
  rare: "from-blue-500/20 to-blue-600/5",
  epic: "from-purple-500/25 to-purple-600/10",
};

const RARITY_GLOW: Record<PackRarity, string> = {
  common: "",
  uncommon: "shadow-[0_0_12px_rgba(34,197,94,0.15)]",
  rare: "shadow-[0_0_16px_rgba(59,130,246,0.25)]",
  epic: "shadow-[0_0_24px_rgba(168,85,247,0.35)]",
};

function daysUntil(dateStr: string | null, currentDate: string): number | null {
  if (!dateStr) return null;
  const exp = new Date(dateStr).getTime();
  const now = new Date(currentDate).getTime();
  return Math.max(0, Math.ceil((exp - now) / (1000 * 60 * 60 * 24)));
}

export default function CardsPage() {
  const gameState = useGameStore((s) => s.gameState);
  const redeemCard = useGameStore((s) => s.redeemCard);
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('unused');
  const [rarityFilter, setRarityFilter] = useState<FilterRarity>('all');
  const [redeemingId, setRedeemingId] = useState<string | null>(null);

  const cards: CollectibleCard[] = useMemo(() => gameState?.cardInventory ?? [], [gameState]);
  const currentDate = gameState?.currentDate ?? '';

  const filtered = useMemo(() => {
    return cards.filter(c => {
      if (statusFilter === 'unused' && (c.isUsed || c.isExpired)) return false;
      if (statusFilter === 'used' && !c.isUsed) return false;
      if (statusFilter === 'expired' && !c.isExpired) return false;
      if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
      return true;
    }).sort((a, b) => {
      // Unused first, then by rarity (epic > rare > uncommon > common), then by expiry
      const rarityOrder: PackRarity[] = ['epic', 'rare', 'uncommon', 'common'];
      if (a.isUsed !== b.isUsed) return a.isUsed ? 1 : -1;
      if (a.isExpired !== b.isExpired) return a.isExpired ? 1 : -1;
      const ra = rarityOrder.indexOf(a.rarity);
      const rb = rarityOrder.indexOf(b.rarity);
      if (ra !== rb) return ra - rb;
      // Expiring soonest first
      const da = a.expiresDate ? new Date(a.expiresDate).getTime() : Infinity;
      const db = b.expiresDate ? new Date(b.expiresDate).getTime() : Infinity;
      return da - db;
    });
  }, [cards, statusFilter, rarityFilter]);

  const stats = useMemo(() => ({
    total: cards.length,
    unused: cards.filter(c => !c.isUsed && !c.isExpired).length,
    used: cards.filter(c => c.isUsed).length,
    expired: cards.filter(c => c.isExpired).length,
    expiringSoon: cards.filter(c => !c.isUsed && !c.isExpired && c.expiresDate && daysUntil(c.expiresDate, currentDate)! <= 3).length,
  }), [cards, currentDate]);

  const handleRedeem = useCallback((cardId: string) => {
    setRedeemingId(cardId);
    setTimeout(() => {
      redeemCard(cardId);
      setRedeemingId(null);
    }, 400);
  }, [redeemCard]);

  if (!gameState) return null;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold flex items-center gap-2">🃏 Sammelkarten</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Karten werden durch Packs verdient. Löse sie ein, bevor sie ablaufen!
          </p>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="px-2 py-1 rounded-md bg-primary/10 text-primary font-bold">{stats.unused} verfügbar</span>
          {stats.expiringSoon > 0 && (
            <span className="px-2 py-1 rounded-md bg-red-500/10 text-red-400 font-bold animate-pulse">⚠️ {stats.expiringSoon} laufen bald ab</span>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-2">
        <Filter className="w-4 h-4 text-muted-foreground" />
        {/* Status */}
        {(['all', 'unused', 'used', 'expired'] as FilterStatus[]).map(s => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              statusFilter === s ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {s === 'all' ? 'Alle' : s === 'unused' ? `Verfügbar (${stats.unused})` : s === 'used' ? `Eingelöst (${stats.used})` : `Abgelaufen (${stats.expired})`}
          </button>
        ))}
        <span className="text-muted-foreground/30">|</span>
        {/* Rarity */}
        {(['all', 'epic', 'rare', 'uncommon', 'common'] as FilterRarity[]).map(r => (
          <button
            key={r}
            onClick={() => setRarityFilter(r)}
            className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
              rarityFilter === r ? 'bg-primary text-primary-foreground' : 'bg-secondary/50 text-muted-foreground hover:bg-secondary'
            }`}
          >
            {r === 'all' ? 'Alle Seltenheiten' : RARITY_INFO[r].label}
          </button>
        ))}
      </div>

      {/* Cards grid */}
      {filtered.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="py-12 text-center">
            <p className="text-4xl mb-3">🃏</p>
            <p className="text-sm text-muted-foreground">
              {statusFilter === 'unused' ? 'Keine verfügbaren Karten. Öffne Packs um neue zu erhalten!' : 'Keine Karten in dieser Kategorie.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filtered.map(card => {
            const rarityInfo = RARITY_INFO[card.rarity];
            const days = daysUntil(card.expiresDate, currentDate);
            const isExpiringSoon = days !== null && days <= 3 && !card.isUsed && !card.isExpired;
            const isRedeeming = redeemingId === card.id;
            const canRedeem = !card.isUsed && !card.isExpired;

            return (
              <div
                key={card.id}
                className={`relative rounded-xl border-2 p-3 transition-all duration-300 flex flex-col items-center text-center gap-1.5 min-h-[170px] ${
                  card.isUsed
                    ? 'bg-card/30 border-border/50 opacity-50'
                    : card.isExpired
                    ? 'bg-red-500/5 border-red-500/20 opacity-40'
                    : `bg-gradient-to-b ${RARITY_BG[card.rarity]} ${RARITY_BORDER[card.rarity]} ${RARITY_GLOW[card.rarity]}`
                } ${isRedeeming ? 'scale-95 opacity-50' : ''} ${isExpiringSoon ? 'ring-2 ring-red-500/40 ring-offset-1 ring-offset-background' : ''}`}
              >
                {/* Status badge */}
                {card.isUsed && (
                  <div className="absolute top-1.5 right-1.5">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                  </div>
                )}
                {card.isExpired && (
                  <div className="absolute top-1.5 right-1.5">
                    <XCircle className="w-4 h-4 text-red-400" />
                  </div>
                )}

                {/* Icon */}
                <span className="text-3xl mt-1">{card.icon}</span>

                {/* Title */}
                <p className="text-[11px] font-bold leading-tight">{card.title}</p>

                {/* Description */}
                <p className="text-[9px] text-muted-foreground leading-tight">{card.description}</p>

                {/* Rarity */}
                <span className={`text-[8px] font-bold uppercase tracking-wider ${rarityInfo.color}`}>
                  {rarityInfo.label}
                </span>

                {/* Expiry countdown */}
                {canRedeem && days !== null && (
                  <div className={`flex items-center gap-1 text-[9px] ${isExpiringSoon ? 'text-red-400 font-bold' : 'text-muted-foreground'}`}>
                    <Clock className="w-3 h-3" />
                    {days === 0 ? 'Läuft heute ab!' : `${days}d übrig`}
                  </div>
                )}
                {canRedeem && days === null && (
                  <div className="flex items-center gap-1 text-[9px] text-muted-foreground">
                    <span>∞ Kein Ablauf</span>
                  </div>
                )}

                {/* Redeem button */}
                {canRedeem && (
                  <Button
                    size="sm"
                    className="w-full h-6 text-[10px] mt-auto gap-1"
                    onClick={() => handleRedeem(card.id)}
                    disabled={isRedeeming}
                  >
                    <Sparkles className="w-3 h-3" /> Einlösen
                  </Button>
                )}

                {card.isUsed && (
                  <p className="text-[9px] text-green-400/70 mt-auto">✓ Eingelöst</p>
                )}
                {card.isExpired && (
                  <p className="text-[9px] text-red-400/70 mt-auto">✗ Abgelaufen</p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
