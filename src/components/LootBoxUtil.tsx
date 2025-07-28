import React, { useEffect, useState } from 'react';
import { useWallet } from '../hooks/useWallet';
import { useTokens } from '../contexts/TokenContext';
import { getLootBoxes, openLootBoxWithRarity, LootBoxResponse } from '../utils/aoHelpers';
import { currentTheme } from '../constants/theme';
import { SupportedAssetId, Gateway } from '../constants/Constants';
import Confetti from 'react-confetti';
import { Package2, Diamond, Star, Crown, Sparkles, Zap, Gift, X } from 'lucide-react';
import '../styles/LootBoxUtil.css';

interface LootBoxProps {
  className?: string;
  // Add optional prop to allow parent components to provide lootbox data directly
  externalLootBoxes?: LootBox[];
  // Flag to control whether this component should load data independently
  loadDataIndependently?: boolean;
}

// Type to represent a loot box with rarity/level
interface LootBox {
  rarity: number;
  displayName: string;
}

const LootBoxUtil: React.FC<LootBoxProps> = ({ 
  className = '', 
  externalLootBoxes, 
  loadDataIndependently = true 
}) => {
  const { wallet, darkMode, triggerRefresh, refreshTrigger } = useWallet();
  const { tokenBalances } = useTokens();
  const [lootBoxes, setLootBoxes] = useState<LootBox[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpening, setIsOpening] = useState(false);
  const [openResult, setOpenResult] = useState<LootBoxResponse | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);
  const [assets, setAssets] = useState<{[key: string]: {name: string, ticker: string, logo?: string}}>({});
  const [isShaking, setIsShaking] = useState(false);
  const [isExploding, setIsExploding] = useState(false);
  const [selectedRarity, setSelectedRarity] = useState<number | null>(null);
  const [isFadingOut, setIsFadingOut] = useState(false);
  
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

  // Rarity configurations matching the beautiful design
  const rarityConfigs = {
    1: {
      name: 'Common',
      icon: Package2,
      gradient: 'from-emerald-400 to-green-500',
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200',
      shadowColor: 'shadow-emerald-200/50',
      glowColor: 'group-hover:shadow-emerald-400/30',
      textColor: 'text-emerald-700',
      badgeColor: 'bg-emerald-500',
      stars: 1
    },
    2: {
      name: 'Uncommon',
      icon: Diamond,
      gradient: 'from-blue-400 to-cyan-500',
      bgGradient: 'from-blue-50 to-cyan-50',
      borderColor: 'border-blue-200',
      shadowColor: 'shadow-blue-200/50',
      glowColor: 'group-hover:shadow-blue-400/30',
      textColor: 'text-blue-700',
      badgeColor: 'bg-blue-500',
      stars: 2
    },
    3: {
      name: 'Rare',
      icon: Sparkles,
      gradient: 'from-purple-400 to-indigo-500',
      bgGradient: 'from-purple-50 to-indigo-50',
      borderColor: 'border-purple-200',
      shadowColor: 'shadow-purple-200/50',
      glowColor: 'group-hover:shadow-purple-400/30',
      textColor: 'text-purple-700',
      badgeColor: 'bg-purple-500',
      stars: 3
    },
    4: {
      name: 'Epic',
      icon: Crown,
      gradient: 'from-violet-400 to-purple-600',
      bgGradient: 'from-violet-50 to-purple-50',
      borderColor: 'border-violet-200',
      shadowColor: 'shadow-violet-200/50',
      glowColor: 'group-hover:shadow-violet-400/30',
      textColor: 'text-violet-700',
      badgeColor: 'bg-violet-500',
      stars: 4
    },
    5: {
      name: 'Legendary',
      icon: Star,
      gradient: 'from-amber-400 to-orange-500',
      bgGradient: 'from-amber-50 to-orange-50',
      borderColor: 'border-amber-200',
      shadowColor: 'shadow-amber-200/50',
      glowColor: 'group-hover:shadow-amber-400/30',
      textColor: 'text-amber-700',
      badgeColor: 'bg-amber-500',
      stars: 5
    }
  };
  
  // Process lootbox data from response
  const processLootBoxData = (responseResult: any): LootBox[] => {
    const boxes: LootBox[] = [];
    
    // Check if response.result is an array of arrays
    if (Array.isArray(responseResult) && responseResult.length > 0) {
      // Process each loot box entry
      responseResult.forEach((box: any) => {
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
    
    return boxes;
  };

  // Set lootboxes when external data is provided
  useEffect(() => {
    if (externalLootBoxes) {
      setLootBoxes(externalLootBoxes);
      setIsLoading(false); // Ensure loading state is turned off
    }
  }, [externalLootBoxes]);
  
  // Load loot boxes when wallet or refresh trigger changes, but only if loadDataIndependently is true
  useEffect(() => {
    // Skip loading if component is configured to not load independently or if external data is provided
    if (!loadDataIndependently || externalLootBoxes) return;
    
    const loadLootBoxes = async () => {
      if (!wallet?.address) return;
      
      setIsLoading(true);
      try {
        console.log('[LootBoxUtil] Loading lootbox data independently');
        const response = await getLootBoxes(wallet.address);
        
        if (response?.result) {
          const boxes = processLootBoxData(response.result);
          console.log('[LootBoxUtil] Processed loot boxes:', boxes);
          
          // If we're not currently opening a box, update the boxes state
          if (!isOpening) {
            setLootBoxes(boxes);
          } else {
            console.log('[LootBoxUtil] Not updating loot boxes during opening animation');
          }
        } else {
          console.warn('[LootBoxUtil] No loot box data in response');
          // Only set empty boxes if we're not in the middle of opening a box
          if (!isOpening) {
            setLootBoxes([]);
          }
        }
      } catch (error) {
        console.error('[LootBoxUtil] Error loading loot boxes:', error);
        // Only update if not currently opening
        if (!isOpening) {
          setLootBoxes([]);
        }
      } finally {
        setIsLoading(false);
      }
    };
    
    loadLootBoxes();
  }, [wallet?.address, refreshTrigger, loadDataIndependently, externalLootBoxes, isOpening]);
  
  // Map assets for token name mapping
  useEffect(() => {
    if (!wallet?.address || !tokenBalances) return;
    
    const assetMap: {[key: string]: {name: string, ticker: string, logo?: string}} = {};
    
    // Convert tokenBalances object to asset map
    Object.keys(tokenBalances).forEach((processId) => {
      const asset = tokenBalances[processId as SupportedAssetId];
      if (asset) {
        assetMap[processId] = {
          name: asset.info.name,
          ticker: asset.info.ticker,
          logo: asset.info.logo
        };
      }
    });
    
    setAssets(assetMap);
  }, [wallet?.address, tokenBalances]);
  

  


  // Handle opening a loot box
  const handleOpenLootBox = async (rarity: number) => {
    if (!wallet?.address || isOpening || lootBoxes.filter(box => box.rarity === rarity).length === 0) return;
    
    setIsOpening(true);
    setOpenResult(null);
    setSelectedRarity(rarity);
    
    try {
      // Start shaking animation with increasing intensity
      setIsShaking(true);
      
      // Get the results from server, passing the rarity parameter
      console.log('[LootBoxUtil] Sending request to open loot box with rarity:', rarity);
      
      // IMPORTANT: Don't pass triggerRefresh here as we want to control when refresh happens
      const result = await openLootBoxWithRarity(wallet, rarity);
      
      console.log('[LootBoxUtil] Received loot box result:', result);
      
      if (result && result.result) {
        console.log('[LootBoxUtil] Loot received:', JSON.stringify(result.result));
      } else {
        console.warn('[LootBoxUtil] No loot data in result');
      }
      
      // Once we have the result from chain, stop shaking and start the explosion
      setIsShaking(false);
      setIsExploding(true);
      
      // Small pause before confetti
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Show confetti with the result
      setShowConfetti(true);
      
      if (result) {
        // Store the structured result
        setOpenResult(result);
        
        // Manually update local state to reduce the loot box count
        setLootBoxes(prevBoxes => {
          const updatedBoxes = [...prevBoxes];
          // Find the box with matching rarity and remove one instance
          const boxIndex = updatedBoxes.findIndex(box => box.rarity === rarity);
          if (boxIndex >= 0) {
            // Remove one instance of this box
            updatedBoxes.splice(boxIndex, 1);
          }
          return updatedBoxes;
        });
        
        // Keep showing the result for 10 seconds
        // Don't trigger any refreshes during this time
        console.log('[LootBoxUtil] Displaying loot for 10 seconds before resetting UI');
        setTimeout(() => {
          // Start fade-out animation
          setIsFadingOut(true);
          
          // Hide confetti
          setShowConfetti(false);
          
          // After the fade animation completes (1 second), reset the entire UI
          setTimeout(() => {
            console.log('[LootBoxUtil] Resetting UI without refreshing data');
            setSelectedRarity(null);
            setIsExploding(false);
            setIsFadingOut(false);
            setOpenResult(null); // Now clear the result after fade-out
            // No refresh trigger - we don't want to refresh at the end
          }, 1000);
        }, 10000); // Show result for full 10 seconds
      } else {
        // If no result, reset everything after 2 seconds
        setTimeout(() => {
          setShowConfetti(false);
          setSelectedRarity(null);
          setIsExploding(false);
          // Don't refresh here - it may clear the boxes
        }, 2000);
      }
    } catch (error) {
      console.error('[LootBoxUtil] Error opening loot box:', error);
      setIsShaking(false);
      setIsExploding(false);
      setSelectedRarity(null);
      setShowConfetti(false);
    } finally {
      setIsOpening(false);
    }
  };
  
  // Helper to get the token name or ID if name not available
  const getTokenName = (tokenId: string): string => {
    if (assets[tokenId]) {
      return assets[tokenId].name || assets[tokenId].ticker || tokenId.substring(0, 8);
    }
    
    // Berry name mappings if not found in assets
    const berryNames: {[key: string]: string} = {
      "30cPTQXrHN76YZ3bLfNAePIEYDb5Xo1XnbQ-xmLMOM0": "Fire Berry",
      "twFZ4HTvL_0XAIOMPizxs_S3YH5J5yGvJ8zKiMReWF0": "Water Berry",
      "2NoNsZNyHMWOzTqeQUJW9Xvcga3iTonocFIsgkWIiPM": "Rock Berry",
      "XJjSdWaorbQ2q0YkaQSmylmuADWH1fh2PvgfdLmXlzA": "Air Berry",
    };
    
    return berryNames[tokenId] || tokenId.substring(0, 8) + "...";
  };
  
  // Helper function to get berry color based on token ID
  const getBerryColor = (tokenId: string): string => {
    const berryColors: {[key: string]: string} = {
      "30cPTQXrHN76YZ3bLfNAePIEYDb5Xo1XnbQ-xmLMOM0": "bg-red-700 text-red-100 border-red-500",
      "twFZ4HTvL_0XAIOMPizxs_S3YH5J5yGvJ8zKiMReWF0": "bg-blue-700 text-blue-100 border-blue-500",
      "2NoNsZNyHMWOzTqeQUJW9Xvcga3iTonocFIsgkWIiPM": "bg-stone-700 text-stone-100 border-stone-500",
      "XJjSdWaorbQ2q0YkaQSmylmuADWH1fh2PvgfdLmXlzA": "bg-sky-700 text-sky-100 border-sky-500",
    };
    
    return berryColors[tokenId] || "bg-gray-700 text-gray-100 border-gray-500";
  };
  
  // Get Berry Emoji
  const getBerryEmoji = (tokenId: string): string => {
    const berryEmojis: {[key: string]: string} = {
      "30cPTQXrHN76YZ3bLfNAePIEYDb5Xo1XnbQ-xmLMOM0": "🔥",
      "twFZ4HTvL_0XAIOMPizxs_S3YH5J5yGvJ8zKiMReWF0": "💧",
      "2NoNsZNyHMWOzTqeQUJW9Xvcga3iTonocFIsgkWIiPM": "🪨",
      "XJjSdWaorbQ2q0YkaQSmylmuADWH1fh2PvgfdLmXlzA": "💨",
    };
    
    return berryEmojis[tokenId] || "🌟";
  };

  // Get reward gradient based on token type
  const getRewardGradient = (tokenId: string): string => {
    const gradients: {[key: string]: string} = {
      "30cPTQXrHN76YZ3bLfNAePIEYDb5Xo1XnbQ-xmLMOM0": "from-red-500 to-red-700", // Fire Berry
      "twFZ4HTvL_0XAIOMPizxs_S3YH5J5yGvJ8zKiMReWF0": "from-blue-500 to-blue-700", // Water Berry  
      "2NoNsZNyHMWOzTqeQUJW9Xvcga3iTonocFIsgkWIiPM": "from-gray-600 to-gray-800", // Rock Berry
      "XJjSdWaorbQ2q0YkaQSmylmuADWH1fh2PvgfdLmXlzA": "from-sky-500 to-blue-600", // Air Berry
    };
    
    return gradients[tokenId] || "from-purple-500 to-indigo-600";
  };

  // Get token logo or fallback to emoji
  const getTokenIcon = (tokenId: string) => {
    const tokenInfo = tokenBalances[tokenId as SupportedAssetId];
    
    if (tokenInfo?.info?.logo) {
      return (
        <img 
          src={`${Gateway}${tokenInfo.info.logo}`}
          alt={tokenInfo.info.name || 'Token'}
          className="w-8 h-8 rounded-full"
        />
      );
    }
    
    // Fallback to emoji
    return <div className="text-3xl">{getBerryEmoji(tokenId)}</div>;
  };


  
  // Group lootboxes by rarity
  const groupedLootboxes = lootBoxes.reduce<{[key: number]: number}>((acc, box) => {
    acc[box.rarity] = (acc[box.rarity] || 0) + 1;
    return acc;
  }, {});
  

  
  // Calculate total boxes for stats
  const totalBoxes = Object.values(groupedLootboxes).reduce((sum, count) => sum + count, 0);
  const commonBoxes = groupedLootboxes[1] || 0;
  const uncommonBoxes = groupedLootboxes[2] || 0;
  const rareAndAbove = (groupedLootboxes[3] || 0) + (groupedLootboxes[4] || 0) + (groupedLootboxes[5] || 0);

  const isCompact = className?.includes('compact-mode');

  return (
    <div className={`treasure-vault-container relative bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 ${isCompact ? 'p-3 rounded-2xl h-full flex flex-col' : 'p-6 rounded-3xl'} ${className}`}>
      {showConfetti && (
        <div className="confetti-wrapper fixed inset-0 z-50 pointer-events-none">
          <Confetti 
            recycle={false} 
            numberOfPieces={500}
            gravity={0.3}
            initialVelocityY={30}
            initialVelocityX={{min: -15, max: 15}}
            width={window.innerWidth}
            height={window.innerHeight}
            tweenDuration={100}
            colors={['#FFD700', '#FFA500', '#FF4500', '#ff0000', '#00ff00', '#0000ff', '#800080']}
          />
        </div>
      )}
      
      <div className={isCompact ? 'h-full flex flex-col' : 'max-w-4xl mx-auto'}>
        {/* Header */}
        <div className={`flex items-center gap-3 ${isCompact ? 'mb-4' : 'mb-8'}`}>
          <div className="relative">
            <div className={`${isCompact ? 'p-1.5' : 'p-3'} bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl shadow-lg`}>
              <Diamond className={`${isCompact ? 'w-4 h-4' : 'w-8 h-8'} text-white`} />
            </div>
            {!isCompact && <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-pulse" />}
          </div>
          <div>
            <h1 className={`${isCompact ? 'text-xl' : 'text-4xl'} font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent`}>
              Treasure Vault
            </h1>
            {!isCompact && <p className="text-slate-600 mt-1">Discover amazing rewards in your collection</p>}
          </div>
        </div>
        
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-slate-600">Loading treasures...</p>
          </div>
        ) : lootBoxes.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-slate-600 text-lg">Your vault is empty. Complete activities to earn treasure!</p>
          </div>
        ) : (
          <>
            {/* Treasure Boxes Grid */}
            <div className={`grid grid-cols-1 md:grid-cols-2 ${isCompact ? 'lg:grid-cols-3 gap-2 mb-3 flex-1 p-4' : 'lg:grid-cols-3 gap-6 mb-8 p-6'}`}>
              {[1, 2, 3, 4, 5].map(rarity => {
                const config = rarityConfigs[rarity];
                const count = groupedLootboxes[rarity] || 0;
                const IconComponent = config.icon;
                const isSelected = selectedRarity === rarity && isOpening;
                
                return (
                  <div
                    key={rarity}
                    className={`group relative bg-gradient-to-br ${config.bgGradient} ${config.borderColor} border-2 hover:border-opacity-60 transition-all duration-300 cursor-pointer hover:scale-[1.02] ${config.shadowColor} hover:shadow-xl ${config.glowColor} rounded-xl ${
                      count === 0 ? 'opacity-50 cursor-not-allowed' : ''
                    } ${isSelected ? 'scale-[1.05] ring-4 ring-blue-400/50 shadow-2xl' : ''}`}
                    onClick={() => count > 0 && !isOpening && handleOpenLootBox(rarity)}
                  >
                    {/* Count Badge - Completely outside the card */}
                    <div className="absolute -top-2 -right-2 z-30 transform translate-x-1 -translate-y-1">
                      <div className={`${config.badgeColor} text-white font-bold ${isCompact ? 'text-xs px-2.5 py-1 min-w-[28px] h-7' : 'text-sm px-3 py-1.5 min-w-[32px] h-8'} rounded-full shadow-2xl border-2 border-white flex items-center justify-center ${count === 0 ? 'opacity-50' : ''}`}>
                        {count}
                      </div>
                    </div>

                    <div className={`${isCompact ? 'p-3' : 'p-6'} text-center relative overflow-hidden`}>
                      {/* Background Decoration */}
                      <div className="absolute inset-0 opacity-5">
                        <div className={`absolute top-2 right-2 ${isCompact ? 'w-8 h-8' : 'w-16 h-16'} rounded-full bg-current`} />
                        <div className={`absolute bottom-2 left-2 ${isCompact ? 'w-6 h-6' : 'w-12 h-12'} rounded-full bg-current`} />
                      </div>

                      {/* Icon Container with Enhanced Animations */}
                      <div className={`relative ${isCompact ? 'mb-2' : 'mb-4'}`}>
                        <div
                          className={`${isCompact ? 'w-12 h-12' : 'w-20 h-20'} mx-auto rounded-2xl bg-gradient-to-r ${config.gradient} ${isCompact ? 'p-2' : 'p-4'} shadow-lg group-hover:shadow-xl transition-all duration-300 group-hover:scale-110 ${
                            isSelected && isShaking ? 'animate-bounce' : ''
                          } ${isSelected && isExploding ? 'animate-ping scale-125' : ''}`}
                        >
                          <IconComponent className="w-full h-full text-white" />
                        </div>

                        {/* Enhanced Sparkle Effects */}
                        <div className={`absolute -top-1 -right-1 transition-opacity duration-300 ${
                          isSelected || !count ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <Zap className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-400 animate-pulse`} />
                        </div>
                        <div className={`absolute -bottom-1 -left-1 transition-opacity duration-300 delay-100 ${
                          isSelected || !count ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                        }`}>
                          <Sparkles className={`${isCompact ? 'w-3 h-3' : 'w-4 h-4'} text-yellow-400 animate-pulse`} />
                        </div>
                      </div>

                      {/* Title */}
                      <h3 className={`${isCompact ? 'text-sm' : 'text-xl'} font-bold ${config.textColor} ${isCompact ? 'mb-1' : 'mb-2'}`}>{config.name}</h3>

                      {/* Rarity Indicator */}
                      <div className={`flex justify-center ${isCompact ? 'mb-2' : 'mb-4'}`}>
                        {Array.from({ length: config.stars }, (_, i) => (
                          <Star key={i} className={`${isCompact ? 'w-2 h-2' : 'w-4 h-4'} ${config.textColor} fill-current`} />
                        ))}
                      </div>

                      {/* Open Button */}
                      <button
                        className={`w-full ${config.borderColor} ${config.textColor} hover:bg-white/50 transition-all duration-200 group-hover:shadow-md border border-current rounded-lg ${isCompact ? 'py-1 px-2 text-xs' : 'py-2 px-4'} font-medium ${
                          count === 0 || isOpening ? 'opacity-50 cursor-not-allowed' : ''
                        } ${isSelected ? 'animate-pulse bg-white/30' : ''}`}
                        disabled={count === 0 || isOpening}
                      >
                        {isSelected ? 'Opening...' : 'Open Box'}
                      </button>

                      {/* Hover Glow Effect */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-r ${config.gradient} opacity-0 group-hover:opacity-5 transition-opacity duration-300 rounded-lg`}
                      />
                    </div>
                  </div>
                );
              })}
            </div>



            {/* Stats Summary - Hidden in compact mode */}
            {!isCompact && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-slate-800">{totalBoxes}</div>
                  <div className="text-sm text-slate-600">Total Boxes</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{commonBoxes}</div>
                  <div className="text-sm text-slate-600">Common</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{uncommonBoxes}</div>
                  <div className="text-sm text-slate-600">Uncommon</div>
                </div>
                <div className="bg-white/60 backdrop-blur-sm rounded-xl p-4 text-center">
                  <div className="text-2xl font-bold text-amber-600">{rareAndAbove}</div>
                  <div className="text-sm text-slate-600">Rare+</div>
                </div>
              </div>
                        )}

            {/* Instructions - Always show in compact mode */}
            <div className={`text-center ${isCompact ? 'mt-2' : 'mb-4'}`}>
              <div className={`inline-flex items-center gap-2 bg-white/60 backdrop-blur-sm rounded-full ${isCompact ? 'px-3 py-1.5' : 'px-6 py-3'} shadow-lg`}>
                <Package2 className={`${isCompact ? 'w-3 h-3' : 'w-5 h-5'} text-slate-600`} />
                <p className={`text-slate-600 font-medium ${isCompact ? 'text-xs' : 'text-sm'}`}>
                  Click on a treasure box to open it and discover amazing rewards!
                </p>
              </div>
            </div>

            {/* Enhanced Rewards section - Now as Popup Modal */}
            {openResult && openResult.result && (
              <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <div className={`bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden transition-all duration-300 ${isFadingOut ? 'opacity-0 scale-95' : 'opacity-100 scale-100'} animate-in zoom-in-95`}>
                  {/* Header */}
                  <div className="bg-gradient-to-r from-purple-600 to-pink-600 p-6 text-white relative overflow-hidden">
                    <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fillRule=evenodd%3E%3Cg fill=%23ffffff fillOpacity=0.1%3E%3Ccircle cx=30 cy=30 r=4/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')] opacity-20"></div>
                    <div className="relative flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-white/20 rounded-xl">
                          <Gift className="w-8 h-8" />
                        </div>
                        <div>
                          <h2 className="text-3xl font-bold">Rewards Received!</h2>
                          <p className="text-purple-100 mt-1">Congratulations on your amazing loot!</p>
                        </div>
                      </div>
                      <button
                        onClick={() => {
                          setIsFadingOut(true);
                          setTimeout(() => {
                            setIsFadingOut(false);
                            setOpenResult(null);
                            setIsExploding(false);
                            setSelectedRarity(null);
                          }, 300);
                        }}
                        className="p-2 hover:bg-white/20 rounded-xl transition-colors duration-200"
                      >
                        <X className="w-6 h-6" />
                      </button>
                    </div>
                  </div>

                  {/* Rewards Grid */}
                  <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                      {Array.isArray(openResult.result) && openResult.result.length > 0 ? (
                        openResult.result.map((item, index) => (
                          <div
                            key={index}
                            className={`relative overflow-hidden rounded-2xl bg-gradient-to-r ${getRewardGradient(item.token)} p-4 text-white shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] animate-in slide-in-from-bottom-4`}
                            style={{ animationDelay: `${index * 100}ms` }}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                {getTokenIcon(item.token)}
                                <div>
                                  <h3 className="font-bold text-lg">{getTokenName(item.token)}</h3>
                                  <p className="text-white/80 text-sm">Collected</p>
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-2xl font-bold">x{item.quantity}</div>
                              </div>
                            </div>

                            {/* Shine effect */}
                            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent -skew-x-12 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
                          </div>
                        ))
                      ) : (
                        <div className="col-span-full text-center py-8">
                          <p className="text-slate-600 text-xl">No rewards received. Try again!</p>
                        </div>
                      )}
                    </div>

                    {/* Footer Message */}
                    {Array.isArray(openResult.result) && openResult.result.length > 0 && (
                      <div className="text-center">
                        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-100 to-emerald-100 text-green-800 px-6 py-3 rounded-full font-medium">
                          <span className="text-xl">✨</span> Items added to your inventory!
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default LootBoxUtil;
