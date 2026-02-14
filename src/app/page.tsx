"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Trophy, FolderOpen, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const menuItems = [
  {
    label: "Neues Spiel",
    href: "/new-game",
    icon: Trophy,
    description: "Starte eine neue Karriere als Fußballmanager",
  },
  {
    label: "Spiel Laden",
    href: "/load-game",
    icon: FolderOpen,
    description: "Lade einen gespeicherten Spielstand",
  },
  {
    label: "Optionen",
    href: "/settings",
    icon: Settings,
    description: "Spieleinstellungen anpassen",
  },
];

function StadiumSilhouette() {
  return (
    <svg
      className="absolute bottom-0 left-0 w-full h-[45%] opacity-[0.07]"
      viewBox="0 0 1440 400"
      preserveAspectRatio="xMidYMax slice"
      fill="none"
    >
      <path
        d="M0 400V250C0 250 100 180 200 200C300 220 350 150 500 160C650 170 700 120 800 100C900 80 950 140 1050 130C1150 120 1200 90 1300 110C1400 130 1440 160 1440 160V400H0Z"
        fill="currentColor"
        className="text-primary"
      />
      <rect x="100" y="180" width="60" height="220" rx="2" fill="currentColor" className="text-primary" opacity="0.5" />
      <rect x="200" y="160" width="80" height="240" rx="2" fill="currentColor" className="text-primary" opacity="0.4" />
      <rect x="350" y="130" width="100" height="270" rx="2" fill="currentColor" className="text-primary" opacity="0.5" />
      <rect x="500" y="140" width="120" height="260" rx="2" fill="currentColor" className="text-primary" opacity="0.6" />
      <rect x="680" y="100" width="140" height="300" rx="2" fill="currentColor" className="text-primary" opacity="0.7" />
      <rect x="870" y="110" width="100" height="290" rx="2" fill="currentColor" className="text-primary" opacity="0.5" />
      <rect x="1020" y="120" width="80" height="280" rx="2" fill="currentColor" className="text-primary" opacity="0.4" />
      <rect x="1150" y="100" width="60" height="300" rx="2" fill="currentColor" className="text-primary" opacity="0.3" />
      <rect x="1280" y="140" width="80" height="260" rx="2" fill="currentColor" className="text-primary" opacity="0.4" />
      {/* Floodlights */}
      <line x1="130" y1="180" x2="130" y2="120" stroke="currentColor" className="text-accent" strokeWidth="3" opacity="0.6" />
      <circle cx="130" cy="115" r="5" fill="currentColor" className="text-accent" opacity="0.8" />
      <line x1="750" y1="100" x2="750" y2="40" stroke="currentColor" className="text-accent" strokeWidth="3" opacity="0.6" />
      <circle cx="750" cy="35" r="5" fill="currentColor" className="text-accent" opacity="0.8" />
      <line x1="1310" y1="140" x2="1310" y2="80" stroke="currentColor" className="text-accent" strokeWidth="3" opacity="0.6" />
      <circle cx="1310" cy="75" r="5" fill="currentColor" className="text-accent" opacity="0.8" />
    </svg>
  );
}

export default function Home() {
  return (
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background to-[hsl(var(--pitch)/0.15)]" />

      {/* Stadium silhouette */}
      <StadiumSilhouette />

      {/* Subtle grid overlay */}
      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }}
      />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-12 px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="font-display text-7xl md:text-8xl font-bold tracking-tight">
            <span className="text-primary">LIGA</span>{" "}
            <span className="text-accent">PRO</span>
          </h1>
          <p className="text-muted-foreground text-lg md:text-xl mt-2 tracking-widest uppercase">
            Fußballmanager
          </p>
          <div className="mt-4 h-[2px] w-48 mx-auto bg-gradient-to-r from-transparent via-primary to-transparent" />
        </motion.div>

        {/* Menu buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
          className="flex flex-col gap-4 w-full max-w-md"
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.5 + index * 0.1 }}
            >
              <Link href={item.href}>
                <Button
                  variant="outline"
                  className="w-full h-16 text-lg justify-start gap-4 px-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-300 group"
                >
                  <item.icon className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">{item.label}</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      {item.description}
                    </span>
                  </div>
                </Button>
              </Link>
            </motion.div>
          ))}

          {/* Credits */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.8 }}
          >
            <Dialog>
              <DialogTrigger asChild>
                <Button
                  variant="outline"
                  className="w-full h-16 text-lg justify-start gap-4 px-6 border-border/50 bg-card/50 backdrop-blur-sm hover:bg-primary/10 hover:border-primary/50 hover:text-primary transition-all duration-300 group"
                >
                  <Info className="w-6 h-6 text-muted-foreground group-hover:text-primary transition-colors" />
                  <div className="flex flex-col items-start">
                    <span className="font-semibold">Credits</span>
                    <span className="text-xs text-muted-foreground font-normal">
                      Über dieses Spiel
                    </span>
                  </div>
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-card border-border">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl">
                    <span className="text-primary">LIGA</span>{" "}
                    <span className="text-accent">PRO</span>{" "}
                    <span className="text-foreground">Fußballmanager</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Ein vollständiger Fußballmanager mit realen Daten der
                    ersten drei deutschen Ligen.
                  </p>
                  <div>
                    <p className="font-semibold text-foreground mb-1">Features:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>56 reale Vereine mit vollständigen Kadern</li>
                      <li>Match-Engine mit 2D-Visualisierung</li>
                      <li>Transfermarkt mit KI-Verhandlungen</li>
                      <li>Taktik-System mit Drag & Drop</li>
                      <li>DFB-Pokal & Internationale Wettbewerbe</li>
                      <li>Jugendakademie & Spielerentwicklung</li>
                    </ul>
                  </div>
                  <p className="text-xs pt-2 border-t border-border">
                    Version 0.1.0 | Erstellt mit Next.js, React & TypeScript
                  </p>
                </div>
              </DialogContent>
            </Dialog>
          </motion.div>
        </motion.div>
      </div>

      {/* Version number */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2 }}
        className="absolute bottom-4 right-6 text-xs text-muted-foreground/50"
      >
        v0.1.0
      </motion.p>
    </div>
  );
}
