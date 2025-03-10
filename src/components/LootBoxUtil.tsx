import React, { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { getLootBoxes, openLootBox, LootBoxResponse } from '../utils/aoHelpers';
import { currentTheme } from '../constants/theme';
import Confetti from 'react-confetti';

interface LootBoxProps {
  className?: string;
}

// Type to represent a loot box with rarity/level
interface LootBox {
  rarity: number;
  displayName: string;
}

const LootBoxUtil: React.FC<LootBoxProps> = ({ className = '' }) => {
  const { wallet, darkMode, triggerRefresh, refreshTrigger } = useWallet();
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openResult, setOpenResult] = useState<string | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  
  const theme = currentTheme(darkMode);
  
  // Map loot box rarity level to display name
  const getRarityName = (rarity: number): string => {
    switch(rarity) {
      case 1: return 'Common';
      case 2: return 'Uncommon';
      case 3: return 'Rare';
      case 4: return 'Epic';
      case 5: return 'Legendary';
      default: return `Level ${rarity}`;
    }
  };
  
  // Load loot boxes when wallet or refresh trigger changes
  useEffect(() => {
    const loadLootBoxes = async () => {
      if (!wallet?.address) return;
      
      setIsLoading(true);
      try {
        const response = await getLootBoxes(wallet.address);
        console.log('Loot box response:', response);
        
        if (response?.result) {
          // Handle the nested array format from the Lua code
          // The response is expected to be an array of arrays
          const boxes: LootBox[] = [];
          
          // Check if response.result is an array of arrays
          if (Array.isArray(response.result) && response.result.length > 0) {
            // Process each loot box entry
            response.result.forEach((box: any) => {
              if (Array.isArray(box)) {
                // Each entry in the array is a separate loot box
                box.forEach((rarityLevel: number) => {
                  boxes.push({
                    rarity: rarityLevel,
                    displayName: getRarityName(rarityLevel)
                  });
                });
              } else if (typeof box === 'number') {
                // Single number represents rarity directly
                boxes.push({
                  rarity: box,
                  displayName: getRarityName(box)
                });
              }
            });
          }
          
          setLootBoxes(boxes);
          console.log('Processed loot boxes:', boxes);
        } else {
          setLootBoxes([]);
        }
      } catch (error) {
        console.error('Error loading loot boxes:', error);
        setLootBoxes([]);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLootBoxes();
  }, [wallet?.address, refreshTrigger]);
  
  // Get color class based on rarity
  const getRarityColorClass = (rarity: number): string => {
    switch (rarity) {
      case 1: // Common
        return 'bg-gray-200 text-gray-800';
      case 2: // Uncommon
        return 'bg-green-200 text-green-800';
      case 3: // Rare
        return 'bg-blue-200 text-blue-800';
      case 4: // Epic
        return 'bg-purple-200 text-purple-800';
      case 5: // Legendary
        return 'bg-yellow-200 text-yellow-800';
      default:
        return 'bg-gray-200 text-gray-800';
    }
  };
  
  // Handle opening a loot box
  const handleOpenLootBox = async () => {
    if (!wallet?.address || isOpening || lootBoxes.length === 0) return;
    
    setIsOpening(true);
    setOpenResult(null);
    
    try {
      // Get the first available loot box rarity to show in the opening message
      const lootBoxToOpen = lootBoxes[0];
      const rarityName = lootBoxToOpen ? lootBoxToOpen.displayName : '';
      
      // Show opening message with the rarity
      setOpenResult(`Opening ${rarityName} Loot Box...`);
      
      const result = await openLootBox(wallet, triggerRefresh);
      
      if (result) {
        // Show confetti animation
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 5000);
        
        // Format and display result
        let resultText = '';
        if (typeof result.result === 'string') {
          resultText = result.result;
        } else if (Array.isArray(result.result)) {
          resultText = JSON.stringify(result.result, null, 2);
        } else {
          resultText = JSON.stringify(result.result);
        }
            
        setOpenResult(resultText);
        
        // Refresh loot boxes after a short delay to allow animation to complete
        setTimeout(() => {
          triggerRefresh();
        }, 1000);
      }
    } catch (error) {
      console.error('Error opening loot box:', error);
      setOpenResult('Error opening loot box');
    } finally {
      setIsOpening(false);
    }
  };
  
  return (
    <div className={`loot-box-container ${theme.container} border ${theme.border} backdrop-blur-md p-6 ${className}`}>
      {showConfetti && <Confetti recycle={false} numberOfPieces={200} />}
      
      <h2 className={`text-2xl font-bold ${theme.text} mb-4`}>Loot Boxes</h2>
      
      {isLoading ? (
        <p className={`${theme.text}`}>Loading loot boxes...</p>
      ) : lootBoxes.length === 0 ? (
        <p className={`${theme.text}`}>You don't have any loot boxes yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="loot-box-list grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
            {lootBoxes.map((box, index) => (
              <div 
                key={index}
                className={`loot-box-item p-3 rounded-lg ${getRarityColorClass(box.rarity)} flex items-center justify-between transition-transform hover:scale-105 cursor-pointer`}
                title={`Open ${box.displayName} Loot Box`}
                onClick={() => !isOpening && handleOpenLootBox()}
              >
                <span className="font-medium">{box.displayName} Box</span>
                <div className="loot-box-icon">📦</div>
              </div>
            ))}
          </div>
          
          <button
            onClick={handleOpenLootBox}
            disabled={isOpening || lootBoxes.length === 0}
            className={`open-button w-full py-3 ${theme.buttonBg} ${theme.buttonHover} ${theme.text} rounded-lg ${
              isOpening || lootBoxes.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {isOpening ? 'Opening...' : 'Open Loot Box'}
          </button>
          
          {openResult && (
            <div className={`result-container mt-4 p-4 rounded-lg ${theme.container} border ${theme.border}`}>
              <h3 className={`text-lg font-bold ${theme.text} mb-2`}>Loot Box Result</h3>
              <div className={`${theme.text} whitespace-pre-wrap break-words`}>
                {openResult}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LootBoxUtil;
