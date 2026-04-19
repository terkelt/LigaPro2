"use client";

import { useRouter } from "next/navigation";
import { ArrowLeft, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useSettingsStore } from "@/store/settings-store";
import { soundManager } from "@/lib/sound-manager";
import { useState, useEffect } from "react";

export default function SettingsPage() {
  const router = useRouter();
  const { settings, updateSetting, resetSettings } = useSettingsStore();
  const [soundSettings, setSoundSettings] = useState(soundManager.getSettings());

  useEffect(() => {
    soundManager.updateSettings({
      masterVolume: soundSettings.masterVolume,
      menuEnabled: soundSettings.menuEnabled,
      matchAmbientEnabled: soundSettings.matchAmbientEnabled,
      matchEventsEnabled: soundSettings.matchEventsEnabled,
      uiEnabled: soundSettings.uiEnabled,
    });
  }, [soundSettings]);

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-2xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-3xl font-bold">Optionen</h1>
        </div>

        <div className="space-y-6">
          {/* Match Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Spieleinstellungen</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Schwierigkeitsgrad</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Beeinflusst KI-Stärke, Transfers und Vorstandsgeduld
                  </p>
                </div>
                <Select
                  value={settings.difficulty}
                  onValueChange={(v) => updateSetting("difficulty", v as typeof settings.difficulty)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="easy">Leicht</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="hard">Schwer</SelectItem>
                    <SelectItem value="expert">Experte</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Spielgeschwindigkeit</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wie schnell Spiele simuliert werden
                  </p>
                </div>
                <Select
                  value={settings.matchSpeed}
                  onValueChange={(v) => updateSetting("matchSpeed", v as typeof settings.matchSpeed)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instant">Sofort</SelectItem>
                    <SelectItem value="fast">Schnell</SelectItem>
                    <SelectItem value="normal">Normal</SelectItem>
                    <SelectItem value="detailed">Detailliert</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Match-Darstellung</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wie Spiele angezeigt werden
                  </p>
                </div>
                <Select
                  value={settings.matchDisplay}
                  onValueChange={(v) => updateSetting("matchDisplay", v as typeof settings.matchDisplay)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="result-only">Nur Ergebnis</SelectItem>
                    <SelectItem value="ticker">Live-Ticker</SelectItem>
                    <SelectItem value="detailed-2d">2D-Ansicht</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Kalender-Geschwindigkeit</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Wie schnell die Woche in der Kalenderansicht durchläuft
                  </p>
                </div>
                <Select
                  value={settings.simulationSpeed ?? "normal"}
                  onValueChange={(v) => updateSetting("simulationSpeed", v as typeof settings.simulationSpeed)}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="slow">Langsam (1.5s)</SelectItem>
                    <SelectItem value="normal">Normal (0.8s)</SelectItem>
                    <SelectItem value="fast">Schnell (0.3s)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* General Settings */}
          <Card className="bg-card border-border">
            <CardHeader>
              <CardTitle className="text-lg">Allgemein</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-sm font-medium">Sound</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      Master-Schalter für alle Sounds
                    </p>
                  </div>
                  <Switch
                    checked={settings.sound}
                    onCheckedChange={(v) => {
                      updateSetting("sound", v);
                      setSoundSettings(prev => ({ ...prev, masterVolume: v ? 0.5 : 0 }));
                    }}
                  />
                </div>

                {settings.sound && (
                  <div className="ml-4 space-y-3 border-l-2 border-border pl-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-xs font-medium">Lautstärke</Label>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="100"
                        value={Math.round(soundSettings.masterVolume * 100)}
                        onChange={(e) => setSoundSettings(prev => ({ ...prev, masterVolume: Number(e.target.value) / 100 }))}
                        className="w-32 accent-primary"
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Spielereignisse (Tore, Karten, Pfiffe)</Label>
                      <Switch
                        checked={soundSettings.matchEventsEnabled}
                        onCheckedChange={(v) => setSoundSettings(prev => ({ ...prev, matchEventsEnabled: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">Stadionatmosphäre</Label>
                      <Switch
                        checked={soundSettings.matchAmbientEnabled}
                        onCheckedChange={(v) => setSoundSettings(prev => ({ ...prev, matchAmbientEnabled: v }))}
                      />
                    </div>
                    <div className="flex items-center justify-between">
                      <Label className="text-xs">UI-Sounds</Label>
                      <Switch
                        checked={soundSettings.uiEnabled}
                        onCheckedChange={(v) => setSoundSettings(prev => ({ ...prev, uiEnabled: v }))}
                      />
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => soundManager.playSound('goal_cheer')}
                    >
                      🔊 Test-Sound
                    </Button>
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Bestätigungsdialoge</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Vor wichtigen Aktionen nachfragen
                  </p>
                </div>
                <Switch
                  checked={settings.confirmDialogs}
                  onCheckedChange={(v) => updateSetting("confirmDialogs", v)}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Automatisch Speichern</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Spielstand wird automatisch gesichert
                  </p>
                </div>
                <Switch
                  checked={settings.autosave}
                  onCheckedChange={(v) => updateSetting("autosave", v)}
                />
              </div>

              {settings.autosave && (
                <>
                  <Separator />
                  <div className="flex items-center justify-between">
                    <div>
                      <Label className="text-sm font-medium">Autosave-Intervall</Label>
                      <p className="text-xs text-muted-foreground mt-1">
                        Alle X Spieltage automatisch speichern
                      </p>
                    </div>
                    <Select
                      value={String(settings.autosaveInterval)}
                      onValueChange={(v) => updateSetting("autosaveInterval", Number(v) as 1 | 3 | 5)}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="1">Jeden Spieltag</SelectItem>
                        <SelectItem value="3">Alle 3 Spieltage</SelectItem>
                        <SelectItem value="5">Alle 5 Spieltage</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </CardContent>
          </Card>

          {/* Developer */}
          <Card className="bg-card border-border border-red-500/20">
            <CardHeader>
              <CardTitle className="text-lg text-red-400">Entwickler</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-sm font-medium">Entwicklermodus</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Zeigt zusätzliche Optionen wie Saisonvorbereitung überspringen
                  </p>
                </div>
                <Switch
                  checked={settings.devMode}
                  onCheckedChange={(v) => updateSetting("devMode", v)}
                />
              </div>
            </CardContent>
          </Card>

          {/* Reset */}
          <div className="flex justify-end">
            <Button
              variant="outline"
              onClick={resetSettings}
              className="gap-2 text-muted-foreground hover:text-destructive hover:border-destructive"
            >
              <RotateCcw className="w-4 h-4" />
              Einstellungen zurücksetzen
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
