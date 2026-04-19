/**
 * Match Commentary System — 50+ unique play-by-play narrations.
 *
 * Each template uses placeholders:
 *   {shooter}   — The player who shoots
 *   {assister}  — The player who assists
 *   {keeper}    — The goalkeeper
 *   {defender}  — A random defender
 *   {midfielder} — A random midfielder
 *   {winger}    — A random winger (LA/RA)
 *   {fouler}    — The player who commits the foul
 *   {fouled}    — The player who is fouled
 *   {atkTeam}   — Attacking team short name
 *   {defTeam}   — Defending team short name
 *   {score}     — Current score e.g. "2:1"
 *   {minute}    — Current minute
 */

// ════════════════════════════════════════════════════════
//  GOAL NARRATIONS
// ════════════════════════════════════════════════════════

export const GOAL_WITH_ASSIST: string[] = [
  `⚽ TOOOR! {assister} spielt einen genialen Steilpass in die Tiefe — {shooter} nimmt den Ball perfekt mit und schiebt ihn eiskalt am Torwart vorbei ins lange Eck! {score}`,
  `⚽ TOOOR! Traumkombination! {assister} tanzt sich über die linke Seite durch, legt quer und {shooter} muss nur noch einschieben! {score}`,
  `⚽ TOOOR! {assister} mit einer Maßflanke von der rechten Seite — {shooter} steigt am höchsten und köpft wuchtig ein! Der Torwart ist machtlos! {score}`,
  `⚽ TOOOR! Schneller Konter! {assister} leitet den Angriff ein, spielt den entscheidenden Pass und {shooter} vollendet mit einem präzisen Flachschuss ins untere Eck! {score}`,
  `⚽ TOOOR! Was für ein Spielzug! Über drei Stationen geht es blitzschnell nach vorne — {assister} mit dem letzten Pass und {shooter} trifft aus 12 Metern! {score}`,
  `⚽ TOOOR! {assister} chippt den Ball über die Abwehrkette — {shooter} lässt den Ball einmal aufspringen und hämmert ihn dann volley ins Netz! Weltklasse! {score}`,
  `⚽ TOOOR! Doppelpass zwischen {assister} und {shooter}! Der Rückpass kommt perfekt und {shooter} schließt trocken ab! {score}`,
  `⚽ TOOOR! Ecke von {assister}, Gewühl im Strafraum — und {shooter} staubt ab! Der Ball zappelt im Netz! {score}`,
  `⚽ TOOOR! {assister} erobert den Ball im Mittelfeld, sieht {shooter} starten und spielt einen perfekten Diagonalball — {shooter} nimmt ihn direkt und trifft flach ins linke Eck! {score}`,
  `⚽ TOOOR! Freistoß-Variante! {assister} legt kurz ab auf {shooter}, der aus 20 Metern abzieht — der Ball senkt sich perfekt ins Torwarteck! {score}`,
  `⚽ TOOOR! {assister} mit einem Hackentrick am Strafraum — {shooter} steht goldrichtig und schiebt den Ball unter dem herausstürzenden Torwart durch! {score}`,
  `⚽ TOOOR! Langer Ball von {assister} auf {shooter}, der sich im Laufduell durchsetzt und den Keeper mit einem Lupfer überwindet! Eiskalt! {score}`,
  `⚽ TOOOR! {atkTeam} kombiniert sich durch! {assister} legt mit der Brust ab, {shooter} nimmt den Ball direkt und knallt ihn unhaltbar unter die Latte! {score}`,
  `⚽ TOOOR! Bilderbuch-Angriff über die rechte Seite! {assister} flankt scharf an den Fünfmeterraum und {shooter} drückt den Ball per Kopf über die Linie! {score}`,
  `⚽ TOOOR! {assister} spielt einen genialen Außenrist-Pass durch die Schnittstelle — {shooter} ist frei und lässt {keeper} keine Chance! {score}`,
];

export const GOAL_SOLO: string[] = [
  `⚽ TOOOR! {shooter} macht es ganz alleine! Dribbelt an zwei Gegenspielern vorbei und schlenzt den Ball ins lange Eck! Nicht zu halten! {score}`,
  `⚽ TOOOR! Fernschuss von {shooter}! Der Ball fliegt wie eine Rakete aus 25 Metern in den Winkel — {keeper} streckt sich vergeblich! {score}`,
  `⚽ TOOOR! {shooter} bekommt den Ball am Strafraum, dreht sich blitzschnell und schießt — drin! Der Ball schlägt im unteren Eck ein! {score}`,
  `⚽ TOOOR! {shooter} nutzt einen Abwehrfehler eiskalt aus! Balleroberung, drei Schritte, Schuss — Tor! {score}`,
  `⚽ TOOOR! {shooter} mit einem Traumtor! Nimmt den Ball auf der Brust an, lässt ihn einmal auftippen und zieht dann volley ab — unhaltbar! {score}`,
  `⚽ TOOOR! Abstauber! Der erste Schuss wird geblockt, aber {shooter} ist zur Stelle und drückt den Abpraller über die Linie! {score}`,
  `⚽ TOOOR! {shooter} zieht von der Strafraumkante ab — der Ball wird noch abgefälscht und trudelt unhaltbar für {keeper} ins Netz! {score}`,
  `⚽ TOOOR! Kopfballtor! {shooter} steigt nach einer Ecke am höchsten und wuchtet den Ball in die Maschen! {score}`,
  `⚽ TOOOR! {shooter} tanzt durch den Strafraum, lässt {defender} stehen und schiebt den Ball am herauslaufenden {keeper} vorbei ins leere Tor! {score}`,
  `⚽ TOOOR! Was für ein Schuss! {shooter} nimmt Maß aus der Distanz und der Ball fliegt wie an der Schnur gezogen in den Winkel! {score}`,
];

// ════════════════════════════════════════════════════════
//  SHOT SAVED — Goalkeeper Saves
// ════════════════════════════════════════════════════════

export const SAVE_NARRATIONS: string[] = [
  `🧤 Riesenchance! {shooter} zieht ab, aber {keeper} ist zur Stelle und pariert glänzend mit einer Flugeinlage nach links!`,
  `🧤 {shooter} kommt frei zum Schuss — aber {keeper} macht sich ganz breit und blockt den Ball mit dem Fuß! Starke Parade!`,
  `🧤 Kopfball von {shooter} aus fünf Metern — aber {keeper} kratzt den Ball mit den Fingerspitzen noch von der Linie! Unglaublich!`,
  `🧤 {shooter} versucht es mit einem platzierten Flachschuss ins linke Eck — {keeper} taucht ab und hält sicher! Weltklasse-Reflex!`,
  `🧤 Fernschuss von {shooter}! Der Ball kommt mit Effet — aber {keeper} fliegt in die Ecke und lenkt ihn gerade noch zur Seite!`,
  `🧤 {shooter} allein vor dem Tor! Er versucht den Lupfer — aber {keeper} bleibt stehen und fängt den Ball souverän! Gut gelesen!`,
  `🧤 Doppelchance! Erst pariert {keeper} den Schuss von {shooter}, dann wirft er sich auch noch auf den Nachschuss! Was für ein Keeper!`,
  `🧤 {shooter} köpft aus kurzer Distanz — {keeper} reißt die Arme hoch und lenkt den Ball über die Latte! Ecke!`,
  `🧤 Gefährlicher Distanzschuss von {shooter}! {keeper} muss sich strecken und faustet den Ball gerade noch weg!`,
  `🧤 1-gegen-1! {shooter} umkurvt {keeper} — aber der Torwart erholt sich und blockt den Schuss aus spitzem Winkel! Sensationell!`,
  `🧤 {shooter} zieht aus der Drehung ab — {keeper} reagiert blitzschnell und pariert mit dem Knie! Glück und Können!`,
  `🧤 Freistoß von {shooter} über die Mauer — {keeper} fliegt in den Winkel und fischt den Ball heraus! Parade des Spiels!`,
];

// ════════════════════════════════════════════════════════
//  SHOT MISSED / POST
// ════════════════════════════════════════════════════════

export const MISS_NARRATIONS: string[] = [
  `💨 {shooter} zieht ab — aber der Ball fliegt einen halben Meter über die Latte! Da war mehr drin!`,
  `💨 Chance für {shooter}! Er versucht es mit dem Außenrist, aber der Ball geht knapp am rechten Pfosten vorbei!`,
  `💨 {shooter} kommt aus guter Position zum Abschluss — aber der Schuss geht weit drüber! Er ärgert sich!`,
  `💨 Volley von {shooter} nach einer Flanke — aber er trifft den Ball nicht richtig und schießt weit über das Tor!`,
  `💨 {shooter} hat Platz und zieht ab — der Ball segelt aber deutlich links am Tor vorbei. Kein Druck auf dem Schuss!`,
  `💨 Kopfball von {shooter} nach einer Ecke — knapp daneben! Um Zentimeter verpasst!`,
  `💨 {shooter} probiert es aus der Distanz — der Schuss hat zwar Wucht, geht aber einen Meter neben das Tor!`,
  `💨 Konter! {shooter} hat nur noch {keeper} vor sich, schießt aber in der Hektik am Tor vorbei! Was für eine vergebene Chance!`,
];

export const POST_NARRATIONS: string[] = [
  `😱 PFOSTEN! {shooter} trifft den Ball perfekt, aber die Kugel knallt an den rechten Pfosten und springt zurück ins Feld!`,
  `😱 LATTE! Was für ein Schuss von {shooter}! Der Ball kracht an die Unterkante der Latte und springt wieder raus! So nah dran!`,
  `😱 PFOSTEN! {shooter} zieht aus 18 Metern ab — der Ball klatscht an den Innenpfosten und {keeper} kann ihn gerade noch sichern!`,
  `😱 LATTE! Kopfball von {shooter} — der Ball touchiert die Latte und fliegt dann ins Toraus! Pech für {atkTeam}!`,
  `😱 DOPPEL-ALUMINIUM! Erst an den Pfosten, dann an die Latte — {shooter} kann es nicht fassen! Das Tor will einfach nicht fallen!`,
];

// ════════════════════════════════════════════════════════
//  FOULS
// ════════════════════════════════════════════════════════

export const FOUL_NARRATIONS: string[] = [
  `⚠️ {fouler} grätscht rücksichtslos in {fouled} rein! Freistoß für {atkTeam} in guter Position!`,
  `⚠️ Taktisches Foul von {fouler}! Er stoppt den Konter von {fouled} und nimmt die Verwarnung bewusst in Kauf!`,
  `⚠️ {fouler} kommt zu spät und trifft {fouled} am Knöchel! Der Schiedsrichter pfeift sofort!`,
  `⚠️ Zweikampf im Mittelfeld — {fouler} geht mit gestrecktem Bein rein und erwischt {fouled}! Freistoß!`,
  `⚠️ {fouler} hält {fouled} am Trikot fest — der Schiedsrichter hat es gesehen! Freistoß und eine Ermahnung!`,
  `⚠️ Bodycheck von {fouler} gegen {fouled}! Der Angreifer geht zu Boden, Freistoß an der Mittellinie!`,
  `⚠️ {fouler} steigt {fouled} auf den Fuß — unabsichtlich, aber trotzdem Foul! {fouled} humpelt kurz.`,
  `⚠️ Ellbogencheck von {fouler}! {fouled} hält sich das Gesicht — der Schiedsrichter greift ein!`,
];

// ════════════════════════════════════════════════════════
//  YELLOW / RED CARDS
// ════════════════════════════════════════════════════════

export const YELLOW_NARRATIONS: string[] = [
  `🟨 Gelbe Karte! {fouler} sieht Gelb für das rüde Einsteigen! Er muss jetzt aufpassen!`,
  `🟨 Der Schiedsrichter zückt Gelb! {fouler} hat zu hart zugepackt — verdiente Verwarnung!`,
  `🟨 Gelb für {fouler}! Das taktische Foul war zu offensichtlich — der Referee greift durch!`,
  `🟨 {fouler} kassiert die Gelbe Karte! Wiederholtes Foulspiel — die Geduld des Schiedsrichters ist am Ende!`,
  `🟨 Verwarnung für {fouler}! Er hat den Gegenspieler klar am Trikot gezogen — keine Diskussion!`,
];

export const RED_NARRATIONS: string[] = [
  `🟥 PLATZVERWEIS! {fouler} sieht die Rote Karte! Brutales Foul — da gibt es nichts zu diskutieren!`,
  `🟥 ROT! {fouler} muss vom Platz! Notbremse als letzter Mann — klare Sache!`,
  `🟥 GELB-ROT! {fouler} sieht die zweite Gelbe und muss runter! {defTeam} ist jetzt in Unterzahl!`,
];

// ════════════════════════════════════════════════════════
//  CORNERS
// ════════════════════════════════════════════════════════

export const CORNER_NARRATIONS: string[] = [
  `📐 Eckstoß für {atkTeam}! {midfielder} tritt ihn scharf an den ersten Pfosten — Kopfballduell im Strafraum!`,
  `📐 Ecke für {atkTeam}! Kurz ausgeführt auf {winger}, der flankt dann scharf in die Mitte!`,
  `📐 Eckball! {midfielder} schlägt den Ball hoch in den Strafraum — Gewühl vor dem Tor, aber die Abwehr klärt!`,
  `📐 Eckstoß! {atkTeam} macht Druck — der Ball kommt gefährlich an den zweiten Pfosten!`,
  `📐 Ecke für {atkTeam}! Kurze Variante — {winger} und {midfielder} kombinieren am Strafraum!`,
];

// ════════════════════════════════════════════════════════
//  OFFSIDE
// ════════════════════════════════════════════════════════

export const OFFSIDE_NARRATIONS: string[] = [
  `🚩 Abseits! {shooter} startet zu früh — die Fahne geht hoch! {defTeam} hat die Abseitsfalle perfekt gestellt!`,
  `🚩 Abseitsstellung! {shooter} steht einen halben Meter zu weit vorne — gute Entscheidung des Linienrichters!`,
  `🚩 Abseits gegen {atkTeam}! {shooter} war schon losgelaufen, aber der Pass kam zu spät — knapp, aber korrekt!`,
  `🚩 Die Fahne geht hoch! {shooter} stand im Abseits — {defTeam} kann durchatmen!`,
];

// ════════════════════════════════════════════════════════
//  GENERAL PLAY / POSSESSION SEQUENCES
// ════════════════════════════════════════════════════════

export const BUILDUP_NARRATIONS: string[] = [
  `{midfielder} treibt den Ball durchs Mittelfeld, spielt auf {winger}, der die Linie entlangsprintet...`,
  `Spielaufbau über {defender} — der Ball wandert geduldig von links nach rechts, {atkTeam} sucht die Lücke...`,
  `{midfielder} mit einem klugen Seitenwechsel auf {winger} — der hat Platz auf der Außenbahn!`,
  `Pressing von {defTeam}! Aber {midfielder} behauptet den Ball stark und spielt sich frei!`,
  `{atkTeam} lässt den Ball laufen — {midfielder} zu {defender}, zurück zu {midfielder}, dann steil auf {shooter}!`,
  `Schneller Konter! {keeper} wirft den Ball schnell raus auf {winger}, der sofort Tempo aufnimmt!`,
  `{defender} spielt einen langen Ball auf {shooter} — der legt per Kopf ab auf {midfielder}!`,
  `Enge Ballstafetten im Mittelfeld — {midfielder} und {winger} spielen sich durch die Reihen von {defTeam}!`,
];

// ════════════════════════════════════════════════════════
//  HELPER: Pick a random narration and fill placeholders
// ════════════════════════════════════════════════════════

export interface NarrationContext {
  shooter?: string;
  assister?: string;
  keeper?: string;
  defender?: string;
  midfielder?: string;
  winger?: string;
  fouler?: string;
  fouled?: string;
  atkTeam: string;
  defTeam: string;
  score: string;
  minute: number;
}

/**
 * Pick a random narration from a template array and fill in player names.
 */
export function narrate(
  templates: string[],
  ctx: NarrationContext,
  rngValue: number,
): string {
  const idx = Math.floor(rngValue * templates.length) % templates.length;
  let text = templates[idx];
  text = text.replace(/\{shooter\}/g, ctx.shooter ?? '???');
  text = text.replace(/\{assister\}/g, ctx.assister ?? '???');
  text = text.replace(/\{keeper\}/g, ctx.keeper ?? 'Torwart');
  text = text.replace(/\{defender\}/g, ctx.defender ?? 'Verteidiger');
  text = text.replace(/\{midfielder\}/g, ctx.midfielder ?? 'Mittelfeldspieler');
  text = text.replace(/\{winger\}/g, ctx.winger ?? 'Flügelspieler');
  text = text.replace(/\{fouler\}/g, ctx.fouler ?? '???');
  text = text.replace(/\{fouled\}/g, ctx.fouled ?? '???');
  text = text.replace(/\{atkTeam\}/g, ctx.atkTeam);
  text = text.replace(/\{defTeam\}/g, ctx.defTeam);
  text = text.replace(/\{score\}/g, ctx.score);
  text = text.replace(/\{minute\}/g, String(ctx.minute));
  return text;
}

// ════════════════════════════════════════════════════════
//  ATMOSPHERE — Stadion-Stimmung, Fans, Emotionen
// ════════════════════════════════════════════════════════

export const ATMOSPHERE_NARRATIONS: string[] = [
  `🏟️ Die Fans singen lautstark! Was für eine Atmosphäre hier im Stadion!`,
  `🏟️ Gänsehaut-Stimmung! Die Heimfans feuern ihre Mannschaft mit einem Sprechchor an!`,
  `🏟️ Die Stimmung kocht! Beide Fanlager liefern sich ein Duell auf den Rängen!`,
  `🏟️ Stille im Stadion... die Spannung ist mit Händen zu greifen!`,
  `🏟️ Die Fans klatschen rhythmisch — sie wollen ihre Mannschaft nach vorne peitschen!`,
  `🏟️ Unruhe auf den Rängen! Die Fans sind unzufrieden mit der Leistung ihrer Mannschaft!`,
  `🏟️ La Ola rollt durchs Stadion! Die Zuschauer genießen das Spiel!`,
  `🏟️ Die Gästefans machen ordentlich Lärm! Man hört sie bis auf den Platz!`,
  `🏟️ Pfiffe von den Rängen! Die Fans fordern mehr Einsatz!`,
  `🏟️ Standing Ovations für eine tolle Aktion! Das Publikum ist begeistert!`,
];

// ════════════════════════════════════════════════════════
//  TENSION — Spannungskommentare basierend auf Spielstand
// ════════════════════════════════════════════════════════

export const TENSION_CLOSE_GAME: string[] = [
  `⏱️ Noch {minute} Minuten! Jede Aktion kann jetzt entscheidend sein!`,
  `⏱️ Es wird eng! Beide Teams kämpfen um jeden Zentimeter!`,
  `⏱️ Hochspannung! Bei diesem knappen Spielstand zählt jeder Zweikampf!`,
  `⏱️ Die Uhr tickt! Wer macht hier den entscheidenden Fehler?`,
  `⏱️ Nervenkrieg in der Schlussphase! Die Spieler spüren den Druck!`,
  `⏱️ Dramatik pur! Noch ist alles offen in diesem Spiel!`,
];

export const TENSION_LEADING: string[] = [
  `📊 {atkTeam} verwaltet die Führung clever — lange Ballbesitzphasen, kein Risiko.`,
  `📊 {atkTeam} kontrolliert das Spiel souverän. {defTeam} findet kein Mittel.`,
  `📊 Sicheres Aufbauspiel von {atkTeam}. Sie lassen den Ball laufen und nehmen das Tempo raus.`,
  `📊 {atkTeam} steht tief und lauert auf Konter. Clevere Spielweise bei dieser Führung!`,
];

export const TENSION_TRAILING: string[] = [
  `🔥 {atkTeam} wirft jetzt alles nach vorne! Sie brauchen dringend ein Tor!`,
  `🔥 Anrennen von {atkTeam}! Die Abwehr von {defTeam} steht unter Dauerbeschuss!`,
  `🔥 {atkTeam} spielt mit dem Mut der Verzweiflung! Alles oder nichts!`,
  `🔥 Kann {atkTeam} noch den Ausgleich schaffen? Die Zeit wird knapp!`,
  `🔥 Power-Play von {atkTeam}! Selbst die Verteidiger rücken mit auf!`,
  `🔥 {atkTeam} drängt auf den Anschlusstreffer! {defTeam} wankt, aber fällt noch nicht!`,
];

export const TENSION_DOMINANT: string[] = [
  `📈 Einseitiges Spiel! {atkTeam} dominiert in allen Bereichen!`,
  `📈 {defTeam} kommt kaum noch aus der eigenen Hälfte raus. {atkTeam} macht Druck ohne Ende!`,
  `📈 Totale Überlegenheit von {atkTeam}! Es ist nur eine Frage der Zeit, bis das nächste Tor fällt!`,
  `📈 {atkTeam} spielt {defTeam} an die Wand! Was für eine Vorstellung!`,
];

// ════════════════════════════════════════════════════════
//  WEATHER COMMENTS
// ════════════════════════════════════════════════════════

export const WEATHER_NARRATIONS: string[] = [
  `🌧️ Der Regen wird stärker! Der Rasen wird immer rutschiger — das beeinflusst das Passspiel!`,
  `🌧️ Schwierige Bedingungen bei diesem Wetter! Der Ball springt unberechenbar auf dem nassen Rasen!`,
  `☀️ Gleißendes Sonnenlicht! Der Torwart hat Probleme mit der Sicht bei hohen Bällen!`,
  `❄️ Eisige Temperaturen! Die Spieler müssen aufpassen, nicht auszurutschen!`,
  `💨 Starker Wind! Die langen Bälle werden vom Wind abgelenkt — das macht es für beide Seiten schwierig!`,
  `🌡️ Die Hitze macht den Spielern zu schaffen! Man sieht, wie die Kondition nachlässt!`,
];

// ════════════════════════════════════════════════════════
//  SUBSTITUTION NARRATIONS
// ════════════════════════════════════════════════════════

export const SUB_NARRATIONS: string[] = [
  `🔄 Wechsel bei {atkTeam}! Frische Beine sollen neuen Schwung bringen!`,
  `🔄 Taktischer Wechsel! Der Trainer reagiert und bringt neue Impulse!`,
  `🔄 Auswechslung! Der Spieler hat alles gegeben und wird verdient ausgewechselt!`,
  `🔄 Frisches Blut! Der Einwechselspieler soll das Spiel drehen!`,
];

// ════════════════════════════════════════════════════════
//  KICKOFF / HALFTIME / FULLTIME
// ════════════════════════════════════════════════════════

export const KICKOFF_NARRATIONS: string[] = [
  `▶️ Anstoß! Der Ball rollt! Auf geht's in eine spannende Partie!`,
  `▶️ Der Schiedsrichter pfeift an! Das Spiel beginnt!`,
  `▶️ Los geht's! Beide Mannschaften sind bereit — möge das bessere Team gewinnen!`,
];

export const HALFTIME_NARRATIONS: string[] = [
  `⏸️ Halbzeit! Die Mannschaften gehen in die Kabine. Zeit für taktische Anpassungen!`,
  `⏸️ Pause! 45 Minuten sind gespielt. Jetzt zählt die Ansprache des Trainers!`,
  `⏸️ Halbzeitpfiff! Was für eine erste Hälfte! Mal sehen, was die Trainer jetzt ändern.`,
];

export const FULLTIME_NARRATIONS: string[] = [
  `🏁 Abpfiff! Das Spiel ist vorbei! Endstand: {score}`,
  `🏁 Schlusspfiff! Der Schiedsrichter beendet die Partie! {score}`,
  `🏁 Aus! Vorbei! Das war's! Endstand: {score}`,
];

// ════════════════════════════════════════════════════════
//  TACTICAL OBSERVATIONS
// ════════════════════════════════════════════════════════

export const TACTICAL_NARRATIONS: string[] = [
  `📋 {atkTeam} stellt um! Die Formation wird offensiver — mehr Risiko, mehr Chancen!`,
  `📋 Interessante taktische Umstellung bei {defTeam}! Sie ziehen sich weiter zurück.`,
  `📋 Das Mittelfeld ist komplett überladen! Beide Teams kämpfen um die Kontrolle!`,
  `📋 {atkTeam} spielt jetzt mit drei Stürmern! Volle Offensive!`,
  `📋 {defTeam} bildet einen Abwehrriegel! Kompakt und diszipliniert!`,
  `📋 Auffällig: {atkTeam} sucht immer wieder den Weg über die linke Seite!`,
  `📋 {defTeam} presst hoch! Sie wollen den Spielaufbau von {atkTeam} schon früh stören!`,
];

// ════════════════════════════════════════════════════════
//  EXTENDED BUILDUP — Mehr Spielaufbau-Varianten
// ════════════════════════════════════════════════════════

export const BUILDUP_EXTENDED: string[] = [
  `{atkTeam} baut geduldig auf. {defender} zu {midfielder}, weiter auf {winger}... aber kein Durchkommen.`,
  `Ballbesitz {atkTeam}. {midfielder} sucht die Lücke, spielt quer — {defTeam} steht kompakt.`,
  `{winger} bekommt den Ball auf der Außenbahn, zieht nach innen — wird aber von {defender} gestoppt!`,
  `Zweikampf im Mittelfeld! {midfielder} gegen den Gegenspieler — er behauptet den Ball stark!`,
  `{defender} spielt einen langen Diagonalball auf {winger} — gute Ballannahme, aber kein Platz zum Flanken!`,
  `{atkTeam} versucht es über die Mitte. {midfielder} mit einem Doppelpass — aber {defTeam} fängt den Ball ab!`,
  `Schnelle Ballstafetten bei {atkTeam}! {midfielder} zu {shooter}, zurück auf {midfielder}... die Abwehr wackelt!`,
  `{keeper} schlägt den Ball lang nach vorne — {shooter} gewinnt das Kopfballduell, aber der zweite Ball geht an {defTeam}!`,
  `{atkTeam} lässt den Ball in der eigenen Hälfte zirkulieren. Geduld ist gefragt gegen dieses tiefe {defTeam}!`,
  `Pressing von {defTeam}! {midfielder} gerät unter Druck, spielt den Ball aber noch rechtzeitig zu {defender}!`,
  `{winger} sprintet die Seitenlinie entlang! Flanke — aber zu ungenau, {keeper} pflückt den Ball aus der Luft!`,
  `{midfielder} versucht einen Steilpass auf {shooter} — aber die Abwehr hat aufgepasst! Abstoß!`,
  `Guter Zweikampf von {defender}! Er gewinnt den Ball und leitet sofort den Gegenangriff ein!`,
  `{atkTeam} mit einem schnellen Umschaltspiel! Aber {defTeam} ist rechtzeitig zurück und klärt!`,
  `{midfielder} lässt den Ball durch die Beine laufen — schöner Trick! Aber der Angriff versandet.`,
  `Einwurf für {atkTeam}. {defender} wirft lang in den Strafraum — Kopfballduell, aber {defTeam} klärt!`,
];

// ════════════════════════════════════════════════════════
//  SHOT BLOCKED NARRATIONS
// ════════════════════════════════════════════════════════

export const BLOCK_NARRATIONS: string[] = [
  `🛡️ {shooter} zieht ab — aber {defender} wirft sich dazwischen und blockt den Schuss! Starke Aktion!`,
  `🛡️ Schuss geblockt! {defender} stellt sich mutig in den Weg und verhindert Schlimmeres!`,
  `🛡️ {shooter} kommt zum Abschluss, aber {defender} blockt mit dem Körper! Aufopferungsvolle Verteidigung!`,
  `🛡️ Geblockt! {defender} riskiert alles und wirft sich in den Schuss von {shooter}!`,
];

// ════════════════════════════════════════════════════════
//  PENALTY NARRATIONS
// ════════════════════════════════════════════════════════

export const PENALTY_SCORED_NARRATIONS: string[] = [
  `⚽🎯 ELFMETER — TOR! {shooter} verwandelt eiskalt! {keeper} hatte keine Chance! {score}`,
  `⚽🎯 ELFMETER — DRIN! {shooter} schickt {keeper} in die falsche Ecke und schiebt den Ball lässig ins andere Eck! {score}`,
  `⚽🎯 ELFMETER — TOR! {shooter} hämmert den Ball mit voller Wucht unter die Latte! Unhaltbar! {score}`,
];

export const PENALTY_MISSED_NARRATIONS: string[] = [
  `❌🎯 ELFMETER VERSCHOSSEN! {shooter} schießt über das Tor! Was für ein Fehlschuss in dieser Situation!`,
  `❌🎯 ELFMETER DANEBEN! {shooter} setzt den Ball neben den Pfosten! Die Nerven!`,
  `❌🎯 ELFMETER AN DEN PFOSTEN! {shooter} trifft nur das Aluminium! So nah und doch so fern!`,
];

export const PENALTY_SAVED_NARRATIONS: string[] = [
  `🧤🎯 ELFMETER GEHALTEN! {keeper} taucht in die richtige Ecke und pariert den Schuss von {shooter}! Was für ein Held!`,
  `🧤🎯 GEHALTEN! {keeper} ahnt die Ecke und wehrt den Elfmeter von {shooter} ab! Riesenjubel!`,
  `🧤🎯 PARADE! {keeper} hält den Elfmeter! {shooter} ist am Boden zerstört!`,
];

// ════════════════════════════════════════════════════════
//  INJURY TIME NARRATIONS
// ════════════════════════════════════════════════════════

export const INJURY_TIME_NARRATIONS: string[] = [
  `⏱️ {minute} Minuten Nachspielzeit! Jetzt wird es nochmal richtig spannend!`,
  `⏱️ Der vierte Offizielle zeigt {minute} Minuten Nachspielzeit an!`,
  `⏱️ Nachspielzeit! Noch {minute} Minuten — reicht das für eine Wende?`,
];

/**
 * Pick a random player from a position group in a lineup.
 */
export function pickPlayerName(
  players: { lastName: string; position: string }[],
  positions: string[],
  rngValue: number,
): string {
  const pool = players.filter(p => positions.includes(p.position));
  if (pool.length === 0) return players.length > 0 ? players[Math.floor(rngValue * players.length)].lastName : '???';
  return pool[Math.floor(rngValue * pool.length)].lastName;
}
