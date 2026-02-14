"use client";

import { useState, useMemo } from "react";
import { useGameStore } from "@/store/game-store";
import { Player, Position, POSITION_LABELS } from "@/types/player";
import { getTraitDefinition, TIER_COLORS, TIER_BG_COLORS, TIER_LABELS, TRAIT_CATALOG } from "@/types/traits";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Search, ArrowLeftRight, ShoppingCart, Tag, Inbox, History, Check, X, AlertCircle, Binoculars, Star, Eye } from "lucide-react";
import {
  calcOverall, formatValue, getAge,
  useMyPlayers, useAllPlayers, useMyFinances, useTransfers,
  useTransferWindow, useLeagues, useTeams, useCurrentTeamId, useScoutReports,
} from "@/store/selectors";

const POSITIONS: Position[] = ["TW", "IV", "LV", "RV", "ZDM", "ZM", "ZOM", "LA", "RA", "ST"];

function ovColor(ov: number) {
  return ov >= 75 ? "text-green-400" : ov >= 65 ? "text-yellow-400" : "text-orange-400";
}

const POTENTIAL_LABELS: Record<string, { label: string; color: string }> = {
  world_class: { label: "Weltklasse", color: "text-yellow-400" },
  excellent: { label: "Hervorragend", color: "text-green-400" },
  promising: { label: "Vielversprechend", color: "text-emerald-400" },
  average: { label: "Durchschnitt", color: "text-muted-foreground" },
  low: { label: "Gering", color: "text-red-400" },
};

const REC_LABELS: Record<string, { label: string; color: string }> = {
  sign_immediately: { label: "Sofort verpflichten!", color: "text-green-400" },
  monitor: { label: "Beobachten", color: "text-yellow-400" },
  not_recommended: { label: "Nicht empfohlen", color: "text-muted-foreground" },
};

function ScoutedPlayerCard({ player, report, teams, onOffer, onInspect }: {
  player: Player; report: { quality: number; recommendation?: string; potentialAssessment?: string; estimatedValue?: number };
  teams: { id: string; name: string; shortName: string }[]; onOffer: () => void; onInspect: () => void;
}) {
  const ov = calcOverall(player);
  const age = getAge(player.dateOfBirth);
  const pTeam = teams.find((t) => t.id === player.teamId);
  const rec = REC_LABELS[report.recommendation ?? ''] ?? REC_LABELS.not_recommended;
  const pot = POTENTIAL_LABELS[report.potentialAssessment ?? ''] ?? POTENTIAL_LABELS.average;
  const traitIcons = (player.traits ?? []).map((t) => {
    const def = getTraitDefinition(t.traitId);
    return def ? { icon: def.icon, name: def.name, tier: t.tier } : null;
  }).filter(Boolean);

  return (
    <div className="p-3 rounded-lg bg-secondary/20 border border-border/50 hover:border-primary/30 transition-colors">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0 ${ovColor(ov)} bg-card border-2 border-primary/40`}>{ov}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-bold truncate">{player.firstName} {player.lastName}</p>
            <span className="text-[10px] font-mono bg-secondary/50 px-1 py-0.5 rounded shrink-0">{player.position}</span>
          </div>
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-0.5">
            <span>{age} J.</span>
            <span>{player.nationality}</span>
            <span>{pTeam?.name}</span>
            <span className={rec.color + " font-medium"}>{rec.label}</span>
          </div>
          {traitIcons.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {traitIcons.map((t) => t && (
                <span key={t.name} className={`inline-flex items-center gap-0.5 text-[9px] px-1 py-0.5 rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]}`} title={`${t.name} (${TIER_LABELS[t.tier]})`}>
                  {t.icon} {t.name}
                </span>
              ))}
            </div>
          )}
          <div className="flex items-center gap-4 mt-1.5 text-[10px]">
            <span>Marktwert: <span className="text-primary font-medium">{formatValue(report.estimatedValue ?? player.marketValue)}</span></span>
            <span>Potenzial: <span className={pot.color + " font-medium"}>{pot.label}</span></span>
            <span>Report: <span className="text-yellow-400">{"★".repeat(Math.min(5, Math.floor(report.quality / 2)))}</span></span>
          </div>
        </div>
        <div className="flex flex-col gap-1 shrink-0">
          <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={onInspect}><Eye className="w-3 h-3" />Details</Button>
          <Button size="sm" className="h-7 text-xs gap-1" onClick={onOffer}><ShoppingCart className="w-3 h-3" />Angebot</Button>
        </div>
      </div>
    </div>
  );
}

function PlayerInspectDialog({ player, open, onClose }: { player: Player | null; open: boolean; onClose: () => void }) {
  if (!player) return null;
  const ov = calcOverall(player);
  const age = getAge(player.dateOfBirth);
  const a = player.attributes;
  const isGK = player.position === 'TW';

  function Bar({ label, value }: { label: string; value: number }) {
    return (
      <div className="flex items-center gap-2">
        <span className="text-[10px] text-muted-foreground w-20 shrink-0">{label}</span>
        <div className="flex-1 h-1.5 bg-secondary/40 rounded-full overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${value}%`, background: value >= 80 ? '#4ade80' : value >= 65 ? '#34d399' : value >= 50 ? '#facc15' : '#fb923c' }} />
        </div>
        <span className={`text-[10px] font-mono font-bold w-5 text-right ${value >= 80 ? 'text-green-400' : value >= 65 ? 'text-emerald-400' : value >= 50 ? 'text-yellow-400' : 'text-orange-400'}`}>{value}</span>
      </div>
    );
  }

  return (
    <Dialog open={open} onOpenChange={() => onClose()}>
      <DialogContent className="bg-card border-border max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${ovColor(ov)} border-2 border-primary/50`}>{ov}</div>
            <div>
              <p className="text-base font-bold">{player.firstName} {player.lastName}</p>
              <p className="text-[10px] text-muted-foreground">{POSITION_LABELS[player.position]} | {age} J. | {player.nationality}</p>
            </div>
          </DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3 text-xs">
          <div className="flex justify-between"><span className="text-muted-foreground">Marktwert</span><span className="text-primary font-medium">{formatValue(player.marketValue)}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Gehalt</span><span>{formatValue(player.salary)}/J</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Vertrag bis</span><span>{player.contractUntil}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Fuß</span><span>{player.foot === "right" ? "Rechts" : player.foot === "left" ? "Links" : "Beide"}</span></div>
        </div>
        {(player.traits ?? []).length > 0 && (
          <div className="space-y-1.5 mt-2">
            <p className="text-[10px] font-medium text-muted-foreground flex items-center gap-1"><Star className="w-3 h-3 text-yellow-400" /> Spezialeigenschaften</p>
            <div className="space-y-1">
              {(player.traits ?? []).map((t) => {
                const def = getTraitDefinition(t.traitId);
                if (!def) return null;
                return (
                  <div key={t.traitId} className={`flex items-center gap-2 px-2 py-1.5 rounded border ${TIER_BG_COLORS[t.tier]}`}>
                    <span className="text-sm">{def.icon}</span>
                    <div className="flex-1"><p className={`text-[10px] font-semibold ${TIER_COLORS[t.tier]}`}>{def.name} ({TIER_LABELS[t.tier]})</p><p className="text-[9px] text-muted-foreground">{def.description}</p></div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        <div className="space-y-1.5 mt-2">
          {isGK ? (<>
            <p className="text-[10px] font-medium text-muted-foreground">Torwart</p>
            <Bar label="Reflexe" value={a.reflexes} /><Bar label="Fangen" value={a.handling} /><Bar label="Hechten" value={a.diving} /><Bar label="Abschlag" value={a.kicking} /><Bar label="1-gegen-1" value={a.oneOnOne} />
          </>) : (<>
            <p className="text-[10px] font-medium text-muted-foreground">Technisch</p>
            <Bar label="Ballkontrolle" value={a.ballControl} /><Bar label="Dribbling" value={a.dribbling} /><Bar label="Passen" value={a.passing} /><Bar label="Flanken" value={a.crossing} /><Bar label="Schuss" value={a.shooting} /><Bar label="Abschluss" value={a.finishing} /><Bar label="Kopfball" value={a.heading} />
            <p className="text-[10px] font-medium text-muted-foreground mt-2">Physisch</p>
            <Bar label="Tempo" value={a.pace} /><Bar label="Ausdauer" value={a.stamina} /><Bar label="Stärke" value={a.strength} />
            <p className="text-[10px] font-medium text-muted-foreground mt-2">Mental</p>
            <Bar label="Übersicht" value={a.vision} /><Bar label="Gelassenheit" value={a.composure} /><Bar label="Stellungsspiel" value={a.positioning} />
          </>)}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TransfersPage() {
  const makeTransferOffer = useGameStore((s) => s.makeTransferOffer);
  const storeAcceptCounter = useGameStore((s) => s.acceptCounterOffer);
  const togglePlayerTransferList = useGameStore((s) => s.togglePlayerTransferList);
  const respondToIncoming = useGameStore((s) => s.respondToIncoming);
  const sendScout = useGameStore((s) => s.sendScout);

  const myPlayersList = useMyPlayers();
  const allPlayers = useAllPlayers();
  const finances = useMyFinances();
  const transfers = useTransfers();
  const transferWindow = useTransferWindow();
  const leagues = useLeagues();
  const teams = useTeams();
  const currentTeamId = useCurrentTeamId();
  const scoutReports = useScoutReports();

  // Result list filters (for scouted players)
  const [listPosFilter, setListPosFilter] = useState<string>("all");
  const [listLeagueFilter, setListLeagueFilter] = useState<string>("all");
  const [listTraitFilter, setListTraitFilter] = useState<string>("all");
  const [listSearch, setListSearch] = useState("");

  // Offer dialog
  const [offerTarget, setOfferTarget] = useState<Player | null>(null);
  const [offerAmount, setOfferAmount] = useState("");
  const [offerSalary, setOfferSalary] = useState("");
  const [offerYears, setOfferYears] = useState("3");
  const [tab, setTab] = useState("scouting");
  const [inspectPlayer, setInspectPlayer] = useState<Player | null>(null);

  // ── Scout search form (the filters that COST money) ──
  const [scIntensity, setScIntensity] = useState<'quick' | 'standard' | 'deep'>('standard');
  const [scPos, setScPos] = useState<string>("all");
  const [scLeague, setScLeague] = useState<string>("all");
  const [scMinOvr, setScMinOvr] = useState("50");
  const [scMaxOvr, setScMaxOvr] = useState("99");
  const [scMinAge, setScMinAge] = useState("16");
  const [scMaxAge, setScMaxAge] = useState("35");
  const [scFoot, setScFoot] = useState<string>("all");
  const [scNationality, setScNationality] = useState<string>("all");
  const [scContractExpiring, setScContractExpiring] = useState(false);
  const [scTrait, setScTrait] = useState<string>("all");

  const [notification, setNotification] = useState<{ type: "success" | "warning" | "error"; text: string } | null>(null);

  // ── Cost calculation ──
  const INTENSITY_COST = { quick: 25_000, standard: 75_000, deep: 200_000 } as const;
  const INTENSITY_LABELS = { quick: 'Schnellsuche', standard: 'Standardsuche', deep: 'Tiefenanalyse' } as const;
  const INTENSITY_DESC = {
    quick: 'Bis zu 5 Spieler, niedrige Report-Qualität',
    standard: 'Bis zu 10 Spieler, mittlere Report-Qualität',
    deep: 'Bis zu 20 Spieler, hohe Report-Qualität',
  } as const;

  const scoutCost = useMemo(() => {
    let base = INTENSITY_COST[scIntensity];
    // Filter surcharges: each active filter adds 10-25%
    let filterCount = 0;
    if (scPos !== 'all') filterCount++;
    if (scLeague !== 'all') filterCount++;
    if (parseInt(scMinOvr) > 50) filterCount++;
    if (parseInt(scMaxOvr) < 99) filterCount++;
    if (parseInt(scMinAge) > 16) filterCount++;
    if (parseInt(scMaxAge) < 35) filterCount++;
    if (scFoot !== 'all') filterCount++;
    if (scNationality !== 'all') filterCount++;
    if (scContractExpiring) filterCount++;
    if (scTrait !== 'all') filterCount += 2; // Trait search is premium
    base += Math.round(base * filterCount * 0.12);
    return base;
  }, [scIntensity, scPos, scLeague, scMinOvr, scMaxOvr, scMinAge, scMaxAge, scFoot, scNationality, scContractExpiring, scTrait]);

  const myPlayers = useMemo(() => {
    return [...myPlayersList].sort((a, b) => calcOverall(b) - calcOverall(a));
  }, [myPlayersList]);

  // Unique nationalities for filter
  const nationalities = useMemo(() => {
    const set = new Set(allPlayers.map((p) => p.nationality));
    return [...set].sort();
  }, [allPlayers]);

  // Build scouted players list from reports (filtered by LIST filters, not scout search filters)
  const scoutedPlayers = useMemo(() => {
    const playerReports = scoutReports.filter((r) => r.type === 'player' && r.playerId);
    const results: { player: Player; report: typeof playerReports[0] }[] = [];
    for (const report of playerReports) {
      const player = allPlayers.find((p) => p.id === report.playerId);
      if (player && player.teamId !== currentTeamId) results.push({ player, report });
    }
    let filtered = results;
    if (listPosFilter !== "all") filtered = filtered.filter((r) => r.player.position === listPosFilter);
    if (listLeagueFilter !== "all") {
      const ids = new Set(teams.filter((t) => t.league === listLeagueFilter).map((t) => t.id));
      filtered = filtered.filter((r) => ids.has(r.player.teamId));
    }
    if (listTraitFilter !== "all") {
      filtered = filtered.filter((r) => (r.player.traits ?? []).some((t) => t.traitId === listTraitFilter));
    }
    if (listSearch) {
      const s = listSearch.toLowerCase();
      filtered = filtered.filter((r) => r.player.firstName.toLowerCase().includes(s) || r.player.lastName.toLowerCase().includes(s));
    }
    return filtered.sort((a, b) => calcOverall(b.player) - calcOverall(a.player));
  }, [scoutReports, allPlayers, currentTeamId, listPosFilter, listLeagueFilter, listTraitFilter, listSearch, teams]);

  const incomingOffers = useMemo(() => transfers.offers.filter((o) => o.fromTeamId === currentTeamId && o.status === "pending"), [transfers, currentTeamId]);
  const counterOffers = useMemo(() => transfers.offers.filter((o) => o.toTeamId === currentTeamId && o.status === "counter_offer"), [transfers, currentTeamId]);
  const completedTransfers = useMemo(() => [...transfers.completed].reverse().slice(0, 20), [transfers]);

  const budget = finances?.transferBudget ?? 0;

  function handleOffer() {
    if (!offerTarget || !offerAmount) return;
    const fee = parseInt(offerAmount);
    const salary = parseInt(offerSalary) || Math.round(offerTarget.salary * 1.1);
    const years = parseInt(offerYears) || 3;
    if (isNaN(fee) || fee <= 0 || fee > budget) return;
    const result = makeTransferOffer(offerTarget.id, fee, salary, years);
    if (result.decision === "accepted") setNotification({ type: "success", text: `Transfer abgeschlossen! ${offerTarget.lastName} wechselt für ${formatValue(fee)}.` });
    else if (result.decision === "counter_offer") setNotification({ type: "warning", text: `Gegenangebot! ${result.reason}` });
    else setNotification({ type: "error", text: result.reason });
    setOfferTarget(null); setOfferAmount(""); setOfferSalary("");
    setTimeout(() => setNotification(null), 6000);
  }

  function handleSendScout() {
    if (scoutCost > budget) {
      setNotification({ type: "error", text: "Nicht genug Budget für diese Suche!" });
      setTimeout(() => setNotification(null), 4000);
      return;
    }
    const result = sendScout({
      intensity: scIntensity,
      cost: scoutCost,
      position: scPos,
      league: scLeague,
      minOvr: parseInt(scMinOvr) || 1,
      maxOvr: parseInt(scMaxOvr) || 99,
      minAge: parseInt(scMinAge) || 15,
      maxAge: parseInt(scMaxAge) || 45,
      foot: scFoot,
      nationality: scNationality,
      contractExpiring: scContractExpiring,
      traitId: scTrait,
    });
    if (result.found > 0) {
      setNotification({ type: "success", text: `Scout hat ${result.found} neue Spieler entdeckt! Kosten: ${formatValue(result.cost)}` });
    } else {
      setNotification({ type: "warning", text: `Keine neuen Spieler gefunden. Kosten: ${formatValue(result.cost)}. Versuche andere Filter.` });
    }
    setTimeout(() => setNotification(null), 5000);
  }

  function handleAcceptCounter(offerId: string) {
    storeAcceptCounter(offerId);
    setNotification({ type: "success", text: "Transfer abgeschlossen." });
    setTimeout(() => setNotification(null), 5000);
  }

  function handleRespondIncoming(offerId: string, accept: boolean) {
    respondToIncoming(offerId, accept);
    const offer = incomingOffers.find((o) => o.id === offerId);
    const player = offer ? allPlayers.find((p) => p.id === offer.playerId) : null;
    setNotification(accept
      ? { type: "success", text: `${player?.lastName} verkauft für ${formatValue(offer?.fee ?? 0)}.` }
      : { type: "error", text: `Angebot für ${player?.lastName} abgelehnt.` });
    setTimeout(() => setNotification(null), 5000);
  }

  function handleToggleList(playerId: string) {
    togglePlayerTransferList(playerId);
  }

  const pendingCount = incomingOffers.length + counterOffers.length;
  const uniqueTraitsInScouted = useMemo(() => {
    const ids = new Set<string>();
    scoutReports.forEach((r) => {
      const p = allPlayers.find((pl) => pl.id === r.playerId);
      (p?.traits ?? []).forEach((t) => ids.add(t.traitId));
    });
    return TRAIT_CATALOG.filter((t) => ids.has(t.id));
  }, [scoutReports, allPlayers]);

  return (
    <div className="space-y-4">
      {notification && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-lg text-sm font-medium ${
          notification.type === "success" ? "bg-green-500/15 text-green-400 border border-green-500/30" :
          notification.type === "warning" ? "bg-yellow-500/15 text-yellow-400 border border-yellow-500/30" :
          "bg-red-500/15 text-red-400 border border-red-500/30"
        }`}>
          <AlertCircle className="w-4 h-4 shrink-0" />{notification.text}
          <button className="ml-auto text-xs opacity-60 hover:opacity-100" onClick={() => setNotification(null)}>✕</button>
        </div>
      )}

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-bold">Transfermarkt</h1>
        <div className="flex items-center gap-3">
          {transferWindow.isOpen ? (
            <span className="text-xs px-2 py-1 rounded bg-green-500/20 text-green-400 font-medium">{transferWindow.type === "summer" ? "Sommer" : "Winter"}fenster offen</span>
          ) : (
            <span className="text-xs px-2 py-1 rounded bg-red-500/20 text-red-400 font-medium">Transferfenster geschlossen</span>
          )}
          <span className="text-xs text-muted-foreground">Budget: <span className="text-primary font-bold">{formatValue(budget)}</span></span>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="scouting"><Binoculars className="w-3.5 h-3.5 mr-1.5" />Scouting</TabsTrigger>
          <TabsTrigger value="sell"><Tag className="w-3.5 h-3.5 mr-1.5" />Verkaufen</TabsTrigger>
          <TabsTrigger value="offers" className="relative">
            <Inbox className="w-3.5 h-3.5 mr-1.5" />Angebote
            {pendingCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-accent text-[10px] font-bold flex items-center justify-center text-background">{pendingCount}</span>}
          </TabsTrigger>
          <TabsTrigger value="history"><History className="w-3.5 h-3.5 mr-1.5" />Historie</TabsTrigger>
        </TabsList>

        {/* === TAB: SCOUTING === */}
        <TabsContent value="scouting" className="mt-4 space-y-4">
          {/* ── Scouting Auftrag ── */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2"><Binoculars className="w-4 h-4 text-primary" /> Scouting-Auftrag</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Intensity Selection */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Suchintensität wählen:</p>
                <div className="grid grid-cols-3 gap-2">
                  {(['quick', 'standard', 'deep'] as const).map((lvl) => (
                    <button
                      key={lvl}
                      onClick={() => setScIntensity(lvl)}
                      className={`p-3 rounded-lg border text-left transition-all ${
                        scIntensity === lvl
                          ? 'border-primary bg-primary/10 ring-1 ring-primary/50'
                          : 'border-border bg-secondary/10 hover:bg-secondary/20'
                      }`}
                    >
                      <p className="text-xs font-bold">{INTENSITY_LABELS[lvl]}</p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{INTENSITY_DESC[lvl]}</p>
                      <p className="text-xs font-mono text-primary mt-1">{formatValue(INTENSITY_COST[lvl])}</p>
                    </button>
                  ))}
                </div>
              </div>

              {/* Extended Filters */}
              <div>
                <p className="text-[10px] text-muted-foreground mb-2">Suchkriterien (jeder Filter erhöht die Kosten um 12%, Trait-Suche 24%):</p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Position</label>
                    <Select value={scPos} onValueChange={setScPos}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Positionen</SelectItem>
                        {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p} – {POSITION_LABELS[p]}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Liga</label>
                    <Select value={scLeague} onValueChange={setScLeague}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle Ligen</SelectItem>
                        {leagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.shortName}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Min. GES</label>
                    <Input type="number" value={scMinOvr} onChange={(e) => setScMinOvr(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Max. GES</label>
                    <Input type="number" value={scMaxOvr} onChange={(e) => setScMaxOvr(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Min. Alter</label>
                    <Input type="number" value={scMinAge} onChange={(e) => setScMinAge(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Max. Alter</label>
                    <Input type="number" value={scMaxAge} onChange={(e) => setScMaxAge(e.target.value)} className="h-8 text-xs" />
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Fuß</label>
                    <Select value={scFoot} onValueChange={setScFoot}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Egal</SelectItem>
                        <SelectItem value="right">Rechts</SelectItem>
                        <SelectItem value="left">Links</SelectItem>
                        <SelectItem value="both">Beidfüßig</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Nationalität</label>
                    <Select value={scNationality} onValueChange={setScNationality}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {nationalities.map((n) => <SelectItem key={n} value={n}>{n}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <label className="text-[10px] text-muted-foreground block mb-1">Trait</label>
                    <Select value={scTrait} onValueChange={setScTrait}>
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Egal</SelectItem>
                        {TRAIT_CATALOG.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="flex items-end">
                    <label className="flex items-center gap-2 cursor-pointer h-8">
                      <input type="checkbox" checked={scContractExpiring} onChange={(e) => setScContractExpiring(e.target.checked)} className="rounded border-border" />
                      <span className="text-[10px] text-muted-foreground">Vertrag läuft aus</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Cost Preview + Send Button */}
              <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/20 border border-border/50">
                <div>
                  <p className="text-xs font-medium">Kosten für diese Suche:</p>
                  <p className="text-lg font-bold text-primary font-mono">{formatValue(scoutCost)}</p>
                  <p className="text-[10px] text-muted-foreground">Budget: {formatValue(budget)}</p>
                </div>
                <Button
                  onClick={handleSendScout}
                  disabled={scoutCost > budget}
                  className="gap-1.5 px-6"
                  size="lg"
                >
                  <Binoculars className="w-4 h-4" />
                  Scout losschicken
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* ── Gescoutete Spieler (Ergebnisse) ── */}
          {scoutedPlayers.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-medium text-muted-foreground mr-2">Ergebnisse filtern:</p>
              <div className="relative flex-1 min-w-32 max-w-48">
                <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
                <Input placeholder="Name..." value={listSearch} onChange={(e) => setListSearch(e.target.value)} className="pl-7 h-7 text-xs" />
              </div>
              <Select value={listPosFilter} onValueChange={setListPosFilter}>
                <SelectTrigger className="w-24 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Pos.</SelectItem>
                  {POSITIONS.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={listTraitFilter} onValueChange={setListTraitFilter}>
                <SelectTrigger className="w-36 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Trait</SelectItem>
                  {uniqueTraitsInScouted.map((t) => <SelectItem key={t.id} value={t.id}>{t.icon} {t.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={listLeagueFilter} onValueChange={setListLeagueFilter}>
                <SelectTrigger className="w-28 h-7 text-xs"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Liga</SelectItem>
                  {leagues.map((l) => <SelectItem key={l.id} value={l.id}>{l.shortName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}

          {scoutedPlayers.length === 0 ? (
            <Card className="bg-card border-border">
              <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Binoculars className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">Keine gescouteten Spieler</p>
                <p className="text-xs mt-1">Schicke einen Scout los, um Spieler zu entdecken.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">{scoutedPlayers.length} gescoutete Spieler</p>
              {scoutedPlayers.map(({ player, report }) => (
                <ScoutedPlayerCard
                  key={player.id}
                  player={player}
                  report={report}
                  teams={teams}
                  onOffer={() => { setOfferTarget(player); setOfferAmount(String(report.estimatedValue ?? player.marketValue)); setOfferSalary(String(Math.round(player.salary * 1.1))); }}
                  onInspect={() => setInspectPlayer(player)}
                />
              ))}
            </div>
          )}
        </TabsContent>

        {/* === TAB: VERKAUFEN === */}
        <TabsContent value="sell" className="mt-4 space-y-3">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground">
                Spieler auf Transferliste setzen — gelistete Spieler erhalten KI-Angebote
              </CardTitle>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border bg-secondary/30 text-xs text-muted-foreground">
                    <th className="text-left px-3 py-2">Name</th>
                    <th className="text-left px-2 py-2 w-12">Pos</th>
                    <th className="text-center px-2 py-2 w-10">GES</th>
                    <th className="text-right px-3 py-2 w-24">Marktwert</th>
                    <th className="text-right px-3 py-2 w-24">Gehalt</th>
                    <th className="text-center px-2 py-2 w-28">Aktion</th>
                  </tr>
                </thead>
                <tbody>
                  {myPlayers.map((player) => {
                    const ov = calcOverall(player);
                    return (
                      <tr key={player.id} className={`border-b border-border/50 hover:bg-secondary/20 ${player.isTransferListed ? "bg-red-500/5" : ""}`}>
                        <td className="px-3 py-2 font-medium">{player.lastName}, {player.firstName}</td>
                        <td className="px-2 py-2"><span className="text-xs font-mono bg-secondary/50 px-1 py-0.5 rounded">{player.position}</span></td>
                        <td className="text-center px-2 py-2"><span className={`font-mono font-bold ${ovColor(ov)}`}>{ov}</span></td>
                        <td className="text-right px-3 py-2 text-xs text-primary">{formatValue(player.marketValue)}</td>
                        <td className="text-right px-3 py-2 text-xs">{formatValue(player.salary)}/J</td>
                        <td className="text-center px-2 py-2">
                          <Button
                            size="sm"
                            variant={player.isTransferListed ? "destructive" : "outline"}
                            className="h-7 text-xs"
                            onClick={() => handleToggleList(player.id)}
                          >
                            {player.isTransferListed ? "Von Liste nehmen" : "Auf Transferliste"}
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        </TabsContent>

        {/* === TAB: ANGEBOTE === */}
        <TabsContent value="offers" className="mt-4 space-y-4">
          {/* Incoming offers from AI */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <Inbox className="w-4 h-4" />Eingehende Angebote ({incomingOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {incomingOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Keine eingehenden Angebote. Setze Spieler auf die Transferliste, um Angebote zu erhalten.
                </p>
              ) : (
                <div className="space-y-2">
                  {incomingOffers.map((offer) => {
                    const player = allPlayers.find((p) => p.id === offer.playerId);
                    const buyingTeam = teams.find((t) => t.id === offer.toTeamId);
                    if (!player) return null;
                    const ov = calcOverall(player);
                    const ratio = offer.fee / player.marketValue;
                    return (
                      <div key={offer.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/20 border border-border/50">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${ovColor(ov)} bg-secondary/50`}>{ov}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.firstName} {player.lastName} <span className="text-xs text-muted-foreground">({player.position})</span></p>
                          <p className="text-xs text-muted-foreground">
                            {buyingTeam?.name} bietet <span className={`font-bold ${ratio >= 0.95 ? "text-green-400" : ratio >= 0.8 ? "text-yellow-400" : "text-red-400"}`}>{formatValue(offer.fee)}</span>
                            <span className="ml-1">(Marktwert: {formatValue(player.marketValue)})</span>
                          </p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Button size="sm" variant="outline" className="h-7 text-xs text-green-400 border-green-500/30 hover:bg-green-500/10" onClick={() => handleRespondIncoming(offer.id, true)}>
                            <Check className="w-3 h-3 mr-1" />Annehmen
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-red-400 border-red-500/30 hover:bg-red-500/10" onClick={() => handleRespondIncoming(offer.id, false)}>
                            <X className="w-3 h-3 mr-1" />Ablehnen
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Counter offers to respond to */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <ArrowLeftRight className="w-4 h-4" />Gegenangebote ({counterOffers.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {counterOffers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">Keine offenen Gegenangebote.</p>
              ) : (
                <div className="space-y-2">
                  {counterOffers.map((offer) => {
                    const player = allPlayers.find((p) => p.id === offer.playerId);
                    const sellingTeam = teams.find((t) => t.id === offer.fromTeamId);
                    if (!player) return null;
                    return (
                      <div key={offer.id} className="flex items-center gap-3 p-3 rounded-lg bg-yellow-500/5 border border-yellow-500/20">
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">{player.firstName} {player.lastName}</p>
                          <p className="text-xs text-muted-foreground">
                            {sellingTeam?.name} fordert <span className="font-bold text-yellow-400">{formatValue(offer.counterFee ?? 0)}</span>
                            <span className="ml-1">(Dein Angebot: {formatValue(offer.fee)})</span>
                          </p>
                        </div>
                        <Button
                          size="sm"
                          className="h-7 text-xs"
                          disabled={(offer.counterFee ?? 0) > budget}
                          onClick={() => handleAcceptCounter(offer.id)}
                        >
                          <Check className="w-3 h-3 mr-1" />{formatValue(offer.counterFee ?? 0)} zahlen
                        </Button>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* === TAB: HISTORIE === */}
        <TabsContent value="history" className="mt-4">
          <Card className="bg-card border-border overflow-hidden">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                <History className="w-4 h-4" />Abgeschlossene Transfers
              </CardTitle>
            </CardHeader>
            <CardContent>
              {completedTransfers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Noch keine abgeschlossenen Transfers.</p>
              ) : (
                <div className="space-y-2">
                  {completedTransfers.map((t) => {
                    const player = allPlayers.find((p) => p.id === t.playerId);
                    const from = teams.find((tm) => tm.id === t.fromTeamId);
                    const to = teams.find((tm) => tm.id === t.toTeamId);
                    const isIncoming = t.toTeamId === currentTeamId;
                    return (
                      <div key={t.id} className={`flex items-center gap-3 p-3 rounded-lg border ${isIncoming ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                        <span className={`text-lg ${isIncoming ? "text-green-400" : "text-red-400"}`}>{isIncoming ? "↙" : "↗"}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium">
                            {player?.firstName} {player?.lastName}
                            <span className="text-xs text-muted-foreground ml-1">({player?.position})</span>
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {from?.name} → {to?.name} | {t.date}
                          </p>
                        </div>
                        <span className={`text-sm font-bold ${isIncoming ? "text-red-400" : "text-green-400"}`}>
                          {isIncoming ? "-" : "+"}{formatValue(t.fee)}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* === INSPECT DIALOG === */}
      <PlayerInspectDialog player={inspectPlayer} open={!!inspectPlayer} onClose={() => setInspectPlayer(null)} />

      {/* === OFFER DIALOG === */}
      <Dialog open={!!offerTarget} onOpenChange={() => setOfferTarget(null)}>
        <DialogContent className="bg-card border-border">
          <DialogHeader>
            <DialogTitle>Transferangebot</DialogTitle>
          </DialogHeader>
          {offerTarget && (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm ${calcOverall(offerTarget) >= 70 ? "bg-green-500/20 text-green-400" : "bg-yellow-500/20 text-yellow-400"}`}>
                  {calcOverall(offerTarget)}
                </div>
                <div>
                  <p className="font-semibold">{offerTarget.firstName} {offerTarget.lastName}</p>
                  <p className="text-xs text-muted-foreground">{POSITION_LABELS[offerTarget.position]} | {getAge(offerTarget.dateOfBirth)} Jahre | {offerTarget.nationality}</p>
                </div>
              </div>

              {(offerTarget.traits ?? []).length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {(offerTarget.traits ?? []).map((t) => {
                    const def = getTraitDefinition(t.traitId);
                    if (!def) return null;
                    return (
                      <span key={t.traitId} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded border ${TIER_BG_COLORS[t.tier]} ${TIER_COLORS[t.tier]}`}>
                        {def.icon} {def.name}
                      </span>
                    );
                  })}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="flex justify-between"><span className="text-muted-foreground">Marktwert</span><span className="text-primary font-medium">{formatValue(offerTarget.marketValue)}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Akt. Gehalt</span><span>{formatValue(offerTarget.salary)}/Jahr</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Vertrag bis</span><span>{offerTarget.contractUntil}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Dein Budget</span><span className="text-primary">{formatValue(budget)}</span></div>
              </div>

              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Ablösesumme (€)</label>
                  <Input type="number" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)} />
                  <p className="text-[10px] text-muted-foreground mt-0.5">Empfohlen: ab {formatValue(Math.round(offerTarget.marketValue * 0.85))}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Jahresgehalt (€)</label>
                    <Input type="number" value={offerSalary} onChange={(e) => setOfferSalary(e.target.value)} />
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Vertragslaufzeit</label>
                    <Select value={offerYears} onValueChange={setOfferYears}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {[1,2,3,4,5].map((y) => <SelectItem key={y} value={String(y)}>{y} Jahr{y > 1 ? "e" : ""}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Budget impact preview */}
                {offerAmount && (
                  <div className="rounded-lg bg-secondary/30 p-3 text-xs space-y-1">
                    <p className="font-medium text-muted-foreground">Budget-Auswirkung:</p>
                    <div className="flex justify-between">
                      <span>Ablöse</span>
                      <span className="text-red-400">-{formatValue(parseInt(offerAmount) || 0)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Gehalt/Monat</span>
                      <span className="text-red-400">-{formatValue(Math.round((parseInt(offerSalary) || 0) / 12))}</span>
                    </div>
                    <div className="flex justify-between font-medium border-t border-border/50 pt-1 mt-1">
                      <span>Budget danach</span>
                      <span className={budget - (parseInt(offerAmount) || 0) >= 0 ? "text-green-400" : "text-red-400"}>
                        {formatValue(budget - (parseInt(offerAmount) || 0))}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setOfferTarget(null)}>Abbrechen</Button>
            <Button onClick={handleOffer} disabled={!offerAmount || (parseInt(offerAmount) || 0) > budget}>
              <ArrowLeftRight className="w-4 h-4 mr-1.5" />Angebot senden
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
