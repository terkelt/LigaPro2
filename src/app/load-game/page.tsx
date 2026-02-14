"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Trash2, Clock, Trophy, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { SaveGame, listSaves, deleteSave } from "@/lib/database";
import { useGameStore } from "@/store/game-store";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LoadGamePage() {
  const router = useRouter();
  const [saves, setSaves] = useState<SaveGame[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  useEffect(() => {
    loadSaves();
  }, []);

  async function loadSaves() {
    setLoading(true);
    const allSaves = await listSaves();
    setSaves(allSaves);
    setLoading(false);
  }

  async function handleDelete(id: number) {
    await deleteSave(id);
    setDeleteId(null);
    await loadSaves();
  }

  const loadGameState = useGameStore((s) => s.loadGameState);

  async function handleLoad(save: SaveGame) {
    if (!save.id) return;
    const success = await loadGameState(save.id);
    if (success) {
      router.push("/game/dashboard");
    }
  }

  function formatDate(date: Date | string) {
    return new Date(date).toLocaleDateString("de-DE", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-3xl mx-auto p-6">
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" size="icon" onClick={() => router.back()}>
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <h1 className="font-display text-3xl font-bold">Spiel Laden</h1>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : saves.length === 0 ? (
          <Card className="bg-card border-border">
            <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
              <Trophy className="w-12 h-12 mb-4 opacity-30" />
              <p className="text-lg font-medium">Keine Spielstände vorhanden</p>
              <p className="text-sm mt-1">
                Starte ein neues Spiel um deinen ersten Spielstand zu erstellen.
              </p>
              <Button
                className="mt-6"
                onClick={() => router.push("/new-game")}
              >
                Neues Spiel starten
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {saves.map((save) => (
              <Card
                key={save.id}
                className="bg-card border-border hover:border-primary/30 transition-colors cursor-pointer group"
                onClick={() => handleLoad(save)}
              >
                <CardContent className="flex items-center justify-between p-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
                        {save.name}
                      </h3>
                      {save.isAutosave && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded bg-accent/20 text-accent font-medium">
                          AUTO
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 mt-1 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Trophy className="w-3 h-3" />
                        {save.teamName}
                      </span>
                      <span>{save.leagueName}</span>
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        Saison {save.season}
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatDate(save.updatedAt)}
                      </span>
                    </div>
                  </div>

                  <Dialog
                    open={deleteId === save.id}
                    onOpenChange={(open) => !open && setDeleteId(null)}
                  >
                    <DialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-muted-foreground hover:text-destructive shrink-0"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId(save.id!);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </DialogTrigger>
                    <DialogContent
                      className="bg-card border-border"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <DialogHeader>
                        <DialogTitle>Spielstand löschen?</DialogTitle>
                      </DialogHeader>
                      <p className="text-sm text-muted-foreground">
                        Möchtest du den Spielstand &quot;{save.name}&quot; wirklich
                        löschen? Dies kann nicht rückgängig gemacht werden.
                      </p>
                      <DialogFooter>
                        <Button
                          variant="outline"
                          onClick={() => setDeleteId(null)}
                        >
                          Abbrechen
                        </Button>
                        <Button
                          variant="destructive"
                          onClick={() => handleDelete(save.id!)}
                        >
                          Löschen
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
