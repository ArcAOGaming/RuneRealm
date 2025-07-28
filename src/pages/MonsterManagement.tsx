import React, { useEffect, useState, useRef, useCallback } from 'react';
import '../styles/MonsterManagement.css';
import { useNavigate } from 'react-router-dom';
import { useWallet } from '../hooks/useWallet';
import { purchaseAccess, TokenOption, adoptMonster, MonsterStats } from '../utils/aoHelpers';
import { createDataItemSigner } from '../config/aoConnection';
import { message } from '../utils/aoHelpers';
import { currentTheme } from '../constants/theme';
import PurchaseModal from '../components/PurchaseModal';
import StatAllocationModal from '../components/StatAllocationModal';
import Header from '../components/Header';
import Footer from '../components/Footer';
import Confetti from 'react-confetti';
import { MonsterCardDisplay } from '../components/MonsterCardDisplay';
import LootBoxUtil from '../components/LootBoxUtil';
import MonsterActivities from '../components/MonsterActivities';
import { useMonster } from '../contexts/MonsterContext';
import MonsterStatusWindow from '../components/MonsterStatusWindow';
import Modal from '../components/Modal';

export const MonsterManagement: React.FC = (): JSX.Element => {
  const navigate = useNavigate();
  // Include refreshTrigger for lootbox updates
  const { wallet, walletStatus, darkMode, connectWallet, setDarkMode, triggerRefresh } = useWallet();
  const { 
    monster: localMonster, 
    lootBoxes, 
    isLoadingLootBoxes,
    timeUpdateTrigger,
    getRarityName,
    formatTimeRemaining,
    calculateProgress,
    refreshMonsterAfterActivity
  } = useMonster();
  
  const [isPurchaseModalOpen, setIsPurchaseModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [isAdopting, setIsAdopting] = useState(false);
  const [isLevelingUp, setIsLevelingUp] = useState(false);
  const [showStatModal, setShowStatModal] = useState(false);
  const [showCardModal, setShowCardModal] = useState(false);
  const [currentEffect, setCurrentEffect] = useState<string | null>(null);
  const theme = currentTheme(darkMode);
  const [, setForceUpdate] = useState({});
  const effectTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const triggerEffect = (effect: string) => {
    setCurrentEffect(effect);
    
    // Clear any existing timeout
    if (effectTimeoutRef.current) {
      clearTimeout(effectTimeoutRef.current);
    }
    
    // Auto-clear the effect after 2 seconds (the duration of the effect animation)
    effectTimeoutRef.current = setTimeout(() => {
      setCurrentEffect(null);
    }, 2000);
  };

  // Force a re-render when time update trigger changes in the context
  useEffect(() => {
    if (localMonster && localMonster.status && localMonster.status.type !== 'Home') {
      // Just update the UI when the timer changes in the context
      setForceUpdate({});
      
      // Log the current progress
      if (localMonster.status.until_time) {
        const now = Date.now();
        const progress = calculateProgress(localMonster.status.since, localMonster.status.until_time);
        console.log(`[MonsterManagement] Progress update: ${Math.round(progress * 100)}%`);
        
        // If the activity just completed, log it
        if (now >= localMonster.status.until_time) {
          console.log('[MonsterManagement] Activity detected as complete');
        }
      }
    }
  }, [timeUpdateTrigger, localMonster]);

  const handleLevelUp = () => {
    if (!walletStatus?.monster || !wallet?.address) return;
    setShowStatModal(true);
  };

  const handleStatConfirm = async (stats: { attack: number; defense: number; speed: number; health: number }) => {
    try {
      if (!wallet) {
        await connectWallet();
        return;
      }
      
      setIsLevelingUp(true);
      console.log('Leveling up monster with stats:', stats);
      
      const signer = createDataItemSigner(wallet);
      await message({
        process: "j7NcraZUL6GZlgdPEoph12Q5rk_dydvQDecLNxYi8rI",
        tags: [
          { name: "Action", value: "LevelUp" },
          { name: "AttackPoints", value: stats.attack.toString() },
          { name: "DefensePoints", value: stats.defense.toString() },
          { name: "SpeedPoints", value: stats.speed.toString() },
          { name: "HealthPoints", value: stats.health.toString() }
        ],
        signer,
        data: ""
      }, () => {
        console.log('[MonsterManagement] Activity executed, refreshing soon...');
        // Trigger the regular refresh
        triggerRefresh();
        
        // Also schedule the forced monster refresh to get the updated monster state
        console.log('[MonsterManagement] Scheduling monster refresh after level up');
        refreshMonsterAfterActivity();
      });
    } catch (error) {
      console.error('[MonsterManagement] Error executing activity:', error);
    } finally {
      setIsLevelingUp(false);
    }
  };

  const handleAdoptMonster = async () => {
    if (isAdopting) return; // Prevent multiple clicks
    
    setIsAdopting(true);
    try {
      await adoptMonster(wallet, walletStatus || { isUnlocked: false, faction: '' });
      // Trigger regular refresh
      triggerRefresh();
      
      // Schedule monster refresh after adoption
      console.log('[MonsterManagement] Monster adoption initiated, scheduling refresh');
      refreshMonsterAfterActivity();
    } catch (error) {
      console.error('[MonsterManagement] Adoption error:', error);
    } finally {
      setIsAdopting(false);
    }
  };

  const handlePurchase = async (selectedToken: TokenOption) => {
    try {
      if (!wallet) {
        await connectWallet();
        return;
      }
      await purchaseAccess(wallet, selectedToken, () => {
        // Refresh data after a short delay
        setTimeout(() => triggerRefresh(), 2000);
      });
      setShowConfetti(true);
      setIsPurchaseModalOpen(false);
      setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
    } catch (error) {
      console.error('Purchase failed:', error);
      throw error;
    }
  };

  // Calculate required exp for next level using Fibonacci sequence starting at 5
  const getFibonacciExp = (level: number) => {
    if (level === 0) return 1;
    if (level === 1) return 2;
    
    let a = 1, b = 2;
    for (let i = 2; i <= level; i++) {
      const next = a + b;
      a = b;
      b = next;
    }
    return b;
  };

  // Memoized helper function to determine if a monster's activity is complete
  const isActivityComplete = useCallback((monster: MonsterStats | null): boolean => {
    if (!monster || monster.status.type === 'Home' || monster.status.type === 'Battle') return false;
    return monster.status.until_time && Date.now() > monster.status.until_time;
  }, []);

  const renderMonsterDashboard = React.useMemo(() => {
    if (!walletStatus?.monster) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
          <div className={`${theme.container} border ${theme.border} backdrop-blur-md rounded-3xl p-8 text-center max-w-md`}>
            <div className="text-6xl mb-4">🐱</div>
            <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Adopt Your First Monster</h2>
            <p className={`${theme.text} opacity-80 mb-6`}>
              Start your adventure by adopting a unique monster companion
            </p>
            <button
              onClick={handleAdoptMonster}
              disabled={isAdopting}
              className={`w-full px-6 py-3 rounded-2xl ${theme.buttonBg} ${theme.buttonHover} ${theme.text} font-semibold transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none`}
            >
              {isAdopting ? 'Adopting...' : 'Adopt Monster'}
            </button>
          </div>
        </div>
      );
    }

    // Use monster directly from context instead of walletStatus to ensure we have the latest state
    const monster = localMonster || walletStatus.monster;
    const activities = walletStatus.monster.activities;
    
    return (
      <div className="max-w-6xl mx-auto px-4 py-4">
        {/* Main Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-screen lg:h-[calc(100vh-2rem)]">
          {/* Left Column - Monster Status Window + Info */}
          <div className="space-y-4">
            {/* Monster Status Window */}
            <div className={`${theme.container} rounded-xl p-4 flex-grow`}>
              <MonsterStatusWindow 
                monster={monster}
                theme={theme}
                currentEffect={currentEffect}
                onEffectTrigger={triggerEffect}
                formatTimeRemaining={formatTimeRemaining}
                calculateProgress={calculateProgress}
                isActivityComplete={isActivityComplete}
              />
            </div>
            
            {/* Monster Header - moved below status window */}
            <div className={`${theme.container} rounded-xl p-3 flex items-center justify-between`}>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-blue-500 rounded-lg flex items-center justify-center text-sm">
                  👾
                </div>
                <div>
                  <h1 className={`text-lg font-bold ${theme.text}`}>
                    {monster.name || 'FireFox'}
                  </h1>
                  <p className={`text-xs ${theme.text} opacity-70`}>
                    {monster.status.type} Mode • Level {monster.level} • EXP: {monster.exp}/{getFibonacciExp(monster.level)}
                    {monster.status.type === 'Home' && monster.exp >= getFibonacciExp(monster.level) && (
                      <span className="ml-2 px-2 py-1 bg-yellow-500 text-yellow-900 rounded-full text-xs font-bold">
                        READY TO LEVEL UP!
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <div className="flex space-x-2">
                {monster.status.type === 'Home' && monster.exp >= getFibonacciExp(monster.level) && (
                  <button
                    onClick={handleLevelUp}
                    disabled={isLevelingUp}
                    className={`px-3 py-2 rounded-lg bg-yellow-500 hover:bg-yellow-600 text-yellow-900 font-semibold transition-all transform hover:scale-105 disabled:opacity-50 text-xs`}
                  >
                    {isLevelingUp ? 'Leveling...' : 'Level Up'}
                  </button>
                )}
                <button
                  onClick={() => setShowCardModal(true)}
                  className={`px-4 py-2 rounded-lg ${theme.buttonBg} ${theme.buttonHover} ${theme.text} font-medium transition-all hover:scale-105 text-xs`}
                >
                  View NFT Card
                </button>
              </div>
            </div>
          </div>

          {/* Right Column - Activities & Treasure Vault */}
          <div className="flex flex-col gap-4 h-full overflow-hidden">
            {/* Activities Section - Compact */}
            <div className="flex-1 min-h-0">
              <MonsterActivities 
                monster={monster}
                activities={activities}
                theme={theme}
                className="compact-mode"
                onEffectTrigger={triggerEffect}
              />
            </div>

            {/* Treasure Vault Section - Compact */}
            <div className="flex-1 min-h-0">
              <LootBoxUtil 
                className="compact-mode" 
                externalLootBoxes={lootBoxes} 
                loadDataIndependently={false} 
              />
            </div>
          </div>
        </div>
      </div>
    );
  }, [
    walletStatus?.monster,
    localMonster,
    theme,
    currentEffect,
    triggerEffect,
    formatTimeRemaining,
    calculateProgress,
    isActivityComplete,
    lootBoxes,
    isAdopting,
    isLevelingUp,
    handleAdoptMonster,
    handleLevelUp,
    showCardModal
  ]);

  return (
    <div className={`min-h-screen ${theme.bg}`}>
      <Header theme={theme} darkMode={darkMode} />
      
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={500}
          gravity={0.3}
        />
      )}

      {/* Monster NFT Card Modal */}
      {showCardModal && walletStatus?.monster && (
        <Modal
          onClose={() => setShowCardModal(false)}
          theme={theme}
        >
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className={`text-xl font-bold ${theme.text}`}>Monster NFT Card</h2>
              <button
                onClick={() => setShowCardModal(false)}
                className={`text-xl ${theme.text} hover:opacity-70`}
              >
                ×
              </button>
            </div>
            <MonsterCardDisplay 
              monster={localMonster || walletStatus.monster}
              expanded={true}
              className="w-full"
            />
          </div>
        </Modal>
      )}

      <StatAllocationModal
        isOpen={showStatModal}
        onClose={() => setShowStatModal(false)}
        onConfirm={handleStatConfirm}
        darkMode={darkMode}
      />
      
      <PurchaseModal
        isOpen={isPurchaseModalOpen}
        onClose={() => setIsPurchaseModalOpen(false)}
        onPurchase={handlePurchase}
        contractName="Eternal Pass"
      />

      <div className="container mx-auto px-4 py-8">
        {!walletStatus?.isUnlocked ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className={`${theme.container} border ${theme.border} backdrop-blur-md rounded-2xl p-8 text-center max-w-md`}>
              <div className="text-6xl mb-4">🔐</div>
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Unlock Access</h2>
              <p className={`${theme.text} opacity-80 mb-6`}>
                Purchase access to start managing your monsters
              </p>
              <button
                onClick={() => setIsPurchaseModalOpen(true)}
                className={`w-full px-6 py-3 rounded-xl ${theme.buttonBg} ${theme.buttonHover} ${theme.text} font-semibold transition-all transform hover:scale-105`}
              >
                Purchase Access
              </button>
            </div>
          </div>
        ) : !walletStatus?.faction ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] space-y-6">
            <div className={`${theme.container} border ${theme.border} backdrop-blur-md rounded-2xl p-8 text-center max-w-md`}>
              <div className="text-6xl mb-4">⚔️</div>
              <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Choose Your Faction</h2>
              <p className={`${theme.text} opacity-80 mb-6`}>
                Join a faction before you can manage monsters
              </p>
              <a
                href="/factions"
                className={`inline-block w-full px-6 py-3 rounded-xl ${theme.buttonBg} ${theme.buttonHover} ${theme.text} font-semibold transition-all transform hover:scale-105 text-center`}
              >
                Choose Faction
              </a>
            </div>
          </div>
        ) : (
          renderMonsterDashboard
        )}
      </div>
      
      <Footer darkMode={darkMode} />
    </div>
  );
};

export default MonsterManagement;
