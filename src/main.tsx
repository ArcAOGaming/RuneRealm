import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  useLocation,
} from "react-router-dom";
import SpriteCustomizer from "./pages/SpriteCustomizer";
import PurchaseInfo from "./pages/PurchaseInfo";
import { MonsterManagement } from "./pages/MonsterManagement";
import { WalletProvider } from "./contexts/WalletContext";
import { TokenProvider } from "./contexts/TokenContext";
import { BattleProvider } from "./contexts/BattleContext";
import { useWallet } from "./hooks/useWallet";
import { WalletStatus } from "./utils/interefaces";
import "./index.css";
import { FactionPage } from "./pages/FactionPage";
import { FactionDetailPage } from "./pages/FactionDetailPage";
import { handleReferralLink } from "./utils/aoHelpers";
import { BotBattlePage } from "./pages/battle/BotBattlePage";
import { RankedBattlePage } from "./pages/battle/RankedBattlePage";
import { ActiveBattlePage } from "./pages/ActiveBattlePage";
import Inventory from "./components/Inventory";
import { MonsterProvider } from "./contexts/MonsterContext";
import DebugView from "./pages/admin/DebugView";
import StartPage from "./pages/StartPage";
//import BattlePage from "./pages/battle/BattlePage";
import Admin from "./pages/admin/Admin";
import BattlePage from "./pages/battle/index";

interface AppContentProps {
  wallet?: { address: string };
  walletStatus?: WalletStatus;
}

const AppContent = () => {
  const { wallet, walletStatus } = useWallet() as {
    wallet?: { address: string };
    walletStatus?: WalletStatus;
  };

  useEffect(() => {
    // Handle referral link parameters when the app loads
    handleReferralLink();
  }, []);

  useEffect(() => {
    // Set initial rotation preference
    const rotateScreen = localStorage.getItem("rotateScreen") !== "false";
    document.body.setAttribute("data-rotate", rotateScreen.toString());

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "rotateScreen") {
        const newRotateScreen = e.newValue !== "false";
        document.body.setAttribute("data-rotate", newRotateScreen.toString());
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const location = useLocation();
  const showInventory = ["/start", "/", "/monsters", "/reality"].includes(
    location.pathname
  );

  return (
    <div className="app-container">
      {wallet?.address && walletStatus?.isUnlocked && showInventory && (
        <Inventory />
      )}
      <Routes>
        <Route path="/" element={<PurchaseInfo />} />
        <Route path="/play" element={<StartPage />} />
        <Route path="/customize" element={<SpriteCustomizer />} />
        <Route path="/factions" element={<FactionPage />} />
        <Route path="/factions/:factionId" element={<FactionDetailPage />} />
        <Route path="/monsters" element={<MonsterManagement />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/battle" element={<BattlePage />} />
        <Route path="/battle/bot" element={<BotBattlePage />} />
        <Route path="/battle/ranked" element={<RankedBattlePage />} />
        <Route path="/battle/active" element={<ActiveBattlePage />} />
        <Route path="/debug" element={<DebugView />} />
        <Route
          path="/reality/*"
          element={
            <iframe
              src="/reality/index.html"
              style={{ width: "100%", height: "100vh", border: "none" }}
              title="Reality"
            />
          }
        />
        <Route
          path="/world/*"
          element={
            <iframe
              src="/reality/index.html"
              style={{ width: "100%", height: "100vh", border: "none" }}
              title="Reality"
            />
          }
        />
      </Routes>
    </div>
  );
};

const App = () => (
  <Router>
    <WalletProvider>
      <TokenProvider>
        <MonsterProvider>
          <BattleProvider>
            <AppContent />
          </BattleProvider>
        </MonsterProvider>
      </TokenProvider>
    </WalletProvider>
  </Router>
);

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
