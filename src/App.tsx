import { Routes, Route, Navigate } from "react-router-dom";
import { NavigationProgress } from "@/components/layout/NavigationProgress";
import { Toaster } from "@/components/ui/toaster";

// Pages
import HomePage from "@/app/page";
import NewGamePage from "@/app/new-game/page";
import LoadGamePage from "@/app/load-game/page";
import SettingsPage from "@/app/settings/page";

// Game pages
import GameLayout from "@/app/game/layout";
import DashboardPage from "@/app/game/dashboard/page";
import SquadPage from "@/app/game/squad/page";
import TacticsPage from "@/app/game/tactics/page";
import SchedulePage from "@/app/game/schedule/page";
import TablePage from "@/app/game/table/page";
import TransfersPage from "@/app/game/transfers/page";
import FinancesPage from "@/app/game/finances/page";
import TrainingPage from "@/app/game/training/page";
import YouthPage from "@/app/game/youth/page";
import StaffPage from "@/app/game/staff/page";
import StatsPage from "@/app/game/stats/page";
import ManagerPage from "@/app/game/manager/page";
import NewsPage from "@/app/game/news/page";
import CupPage from "@/app/game/cup/page";
import InternationalPage from "@/app/game/international/page";
import CardsPage from "@/app/game/cards/page";
import PreseasonPage from "@/app/game/preseason/page";

// Match
import MatchLayout from "@/app/game/match/layout";
import MatchPage from "@/app/game/match/[id]/page";

export default function App() {
  return (
    <>
      <NavigationProgress />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new-game" element={<NewGamePage />} />
        <Route path="/load-game" element={<LoadGamePage />} />
        <Route path="/settings" element={<SettingsPage />} />

        <Route path="/game" element={<GameLayout />}>
          <Route index element={<Navigate to="dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="squad" element={<SquadPage />} />
          <Route path="tactics" element={<TacticsPage />} />
          <Route path="schedule" element={<SchedulePage />} />
          <Route path="table" element={<TablePage />} />
          <Route path="transfers" element={<TransfersPage />} />
          <Route path="finances" element={<FinancesPage />} />
          <Route path="training" element={<TrainingPage />} />
          <Route path="youth" element={<YouthPage />} />
          <Route path="staff" element={<StaffPage />} />
          <Route path="stats" element={<StatsPage />} />
          <Route path="manager" element={<ManagerPage />} />
          <Route path="news" element={<NewsPage />} />
          <Route path="cup" element={<CupPage />} />
          <Route path="international" element={<InternationalPage />} />
          <Route path="cards" element={<CardsPage />} />
          <Route path="preseason" element={<PreseasonPage />} />
          <Route path="match" element={<MatchLayout />}>
            <Route path=":id" element={<MatchPage />} />
          </Route>
        </Route>
      </Routes>
      <Toaster />
    </>
  );
}
