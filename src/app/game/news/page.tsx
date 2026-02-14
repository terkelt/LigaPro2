"use client";

import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Newspaper, AlertCircle, Info, Trophy } from "lucide-react";
import { useNews } from "@/store/selectors";

const iconMap = {
  high: AlertCircle,
  medium: Trophy,
  low: Info,
};

export default function NewsPage() {
  const allNews = useNews();
  const news = useMemo(() => [...allNews].reverse(), [allNews]);

  return (
    <div className="space-y-4">
      <h1 className="font-display text-2xl font-bold">Neuigkeiten</h1>

      {news.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 text-muted-foreground">
            <Newspaper className="w-12 h-12 mb-4 opacity-30" />
            <p className="text-lg font-medium">Keine Neuigkeiten</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {news.map((item) => {
            const Icon = iconMap[item.importance] ?? Info;
            return (
              <Card key={item.id} className={`bg-card border-border ${!item.isRead ? "border-l-2 border-l-primary" : ""}`}>
                <CardContent className="flex items-start gap-3 p-4">
                  <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${
                    item.importance === "high" ? "text-accent" :
                    item.importance === "medium" ? "text-primary" : "text-muted-foreground"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm">{item.title}</h3>
                      <span className="text-[10px] text-muted-foreground shrink-0">{item.date}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{item.content}</p>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
