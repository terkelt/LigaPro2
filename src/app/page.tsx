import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Trophy, FolderOpen, Settings, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import { APP_VERSION } from "@/lib/version";
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
    <div className="relative min-h-screen flex flex-col items-center justify-center overflow-hidden stadium-bg">

      {/* Ambient glow */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[400px] rounded-full bg-primary/4 blur-[120px] pointer-events-none" />

      {/* Stadium silhouette */}
      <StadiumSilhouette />

      {/* Main content */}
      <div className="relative z-10 flex flex-col items-center gap-10 px-4">
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="text-center"
        >
          <h1 className="font-display text-7xl md:text-9xl font-black tracking-tight leading-none">
            <span className="text-primary drop-shadow-[0_0_30px_hsl(var(--primary)/0.3)]">LIGA</span>
            <span className="text-accent drop-shadow-[0_0_30px_hsl(var(--accent)/0.3)] ml-3 md:ml-5">PRO</span>
          </h1>
          <p className="text-muted-foreground/70 text-sm md:text-base mt-3 tracking-[0.4em] uppercase font-light">
            Fußballmanager
          </p>
          <div className="mt-4 h-px w-40 mx-auto bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </motion.div>

        {/* Menu buttons */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.25, ease: "easeOut" }}
          className="flex flex-col gap-2.5 w-full max-w-sm"
        >
          {menuItems.map((item, index) => (
            <motion.div
              key={item.href}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.4, delay: 0.4 + index * 0.08 }}
            >
              <Link to={item.href}>
                <div className="group relative flex items-center gap-4 px-5 py-3.5 rounded-xl border border-border/30 bg-card/30 backdrop-blur-md hover:bg-primary/8 hover:border-primary/30 transition-all duration-300 cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center transition-colors shrink-0">
                    <item.icon className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">{item.label}</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">{item.description}</p>
                  </div>
                  <div className="w-1 h-6 rounded-full bg-primary/0 group-hover:bg-primary/40 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}

          {/* Credits */}
          <motion.div
            initial={{ opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.4, delay: 0.64 }}
          >
            <Dialog>
              <DialogTrigger asChild>
                <div className="group relative flex items-center gap-4 px-5 py-3.5 rounded-xl border border-border/30 bg-card/30 backdrop-blur-md hover:bg-primary/8 hover:border-primary/30 transition-all duration-300 cursor-pointer">
                  <div className="w-10 h-10 rounded-lg bg-primary/8 group-hover:bg-primary/15 flex items-center justify-center transition-colors shrink-0">
                    <Info className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold group-hover:text-primary transition-colors">Credits</p>
                    <p className="text-[11px] text-muted-foreground/70 mt-0.5">Über dieses Spiel</p>
                  </div>
                  <div className="w-1 h-6 rounded-full bg-primary/0 group-hover:bg-primary/40 transition-all" />
                </div>
              </DialogTrigger>
              <DialogContent className="bg-card/95 backdrop-blur-xl border-border/50 rounded-2xl">
                <DialogHeader>
                  <DialogTitle className="font-display text-2xl tracking-tight">
                    <span className="text-primary">LIGA</span>{" "}
                    <span className="text-accent">PRO</span>{" "}
                    <span className="text-foreground/80">Fußballmanager</span>
                  </DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm text-muted-foreground">
                  <p>
                    Ein vollständiger Fußballmanager mit realen Daten der
                    ersten drei deutschen Ligen.
                  </p>
                  <div>
                    <p className="font-semibold text-foreground mb-1.5 text-xs uppercase tracking-wider">Features</p>
                    <ul className="space-y-1.5 text-[13px]">
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> 56 reale Vereine mit vollständigen Kadern</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> Match-Engine mit 2D-Visualisierung</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> Transfermarkt mit KI-Verhandlungen</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> Taktik-System mit Drag & Drop</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> Nationale Pokale & Internationale Wettbewerbe</li>
                      <li className="flex items-center gap-2"><span className="w-1 h-1 rounded-full bg-primary shrink-0" /> Jugendakademie & Spielerentwicklung</li>
                    </ul>
                  </div>
                  <p className="text-[11px] pt-3 border-t border-border/40 font-mono text-muted-foreground/60">
                    v{APP_VERSION} &middot; React &middot; TypeScript &middot; Tauri
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
        transition={{ delay: 1.0 }}
        className="absolute bottom-3 right-5 text-[10px] font-mono text-muted-foreground/30"
      >
        v{APP_VERSION}
      </motion.p>
    </div>
  );
}
