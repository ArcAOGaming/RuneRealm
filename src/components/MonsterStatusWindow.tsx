import React, { useState, useEffect, useRef } from 'react';
import { MonsterStats } from '../utils/aoHelpers';
import MonsterSpriteView from './MonsterSpriteView';
import { Home, MapPin, PawPrint, Sun, Moon } from 'lucide-react';

type AnimationType = 'walkRight' | 'walkLeft' | 'walkUp' | 'walkDown' | 'attack1' | 'attack2' | 'idle' | 'sleep' | 'eat' | 'train' | 'play' | 'happy';
type WalkDirection = 'left' | 'right';

type Theme = {
  container: string;
  text: string;
  buttonBg: string;
  buttonHover: string;
  border: string;
};

interface MonsterStatusWindowProps {
  monster: MonsterStats;
  theme: Theme;
  currentEffect: string | null;
  onEffectTrigger: (effect: string) => void;
  formatTimeRemaining: (until: number) => string;
  calculateProgress: (since: number, until: number) => number;
  isActivityComplete: (monster: MonsterStats) => boolean;
}

const DEV_MODE = false; // Toggle this to enable/disable developer tools

const MonsterStatusWindow: React.FC<MonsterStatusWindowProps> = ({
  monster,
  theme,
  currentEffect,
  onEffectTrigger,
  formatTimeRemaining,
  calculateProgress,
  isActivityComplete,
}) => {
  const activityTimeUp = isActivityComplete(monster);
  const [isWalking, setIsWalking] = useState(false);
  const [position, setPosition] = useState(0);
  // Store normalized position (-10 to 10 scale) for consistent resizing
  const [normalizedPos, setNormalizedPos] = useState(0);
  const [walkDirection, setWalkDirection] = useState<WalkDirection>('right');
  const [currentAnimation, setCurrentAnimation] = useState<AnimationType>('idle');
  const [containerSize, setContainerSize] = useState({ width: 0, height: 0 });
  const [selectedBackground, setSelectedBackground] = useState<string>('home');
  const [backgroundPosition, setBackgroundPosition] = useState(0);
  const [isExitAnimation, setIsExitAnimation] = useState(false);
  const [isEntranceAnimation, setIsEntranceAnimation] = useState(false);
  const [isReturnAnimation, setIsReturnAnimation] = useState(false);
  const [hasCompletedEntrance, setHasCompletedEntrance] = useState(false);
  const [previousActivityType, setPreviousActivityType] = useState<string>('');
  
  // Set background based on monster status
  useEffect(() => {
    switch(monster.status.type.toLowerCase()) {
      case 'home':
        setSelectedBackground('home');
        break;
      case 'play':
        setSelectedBackground('forest');
        break;
      case 'exploring':
        setSelectedBackground('forest');
        break;
      case 'feed':
        setSelectedBackground('home');
        break;
      case 'mission':
        // Randomly choose between greenhouse and beach for missions
        setSelectedBackground(Math.random() > 0.5 ? 'greenhouse' : 'beach');
        break;
      default:
        setSelectedBackground('home');
    }
  }, [monster.status.type]);

  const idleTimerRef = useRef<number>();
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Constants for movement
  const WALK_SPEED = 2;
  const BACKGROUND_SCROLL_SPEED = 1;
  
  // Calculate derived values
  const monsterSize = containerSize.width * 0.25; // 1 unit (1/4 of 4 units)
  // Full walk distance from center to edge (for position display scaling)
  const fullWalkDistance = (containerSize.width - monsterSize) / 2;
  // Restricted walk distance (100% of full distance) to prevent clipping (could be less for some reasons)
  const walkDistance = fullWalkDistance * 1;
  
  // Update container size and maintain 4:2 aspect ratio
  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateSize = () => {
      if (!containerRef.current) return;
      
      const containerWidth = containerRef.current.offsetWidth;
      const containerHeight = containerWidth * 0.5; // 4:2 aspect ratio
      
      setContainerSize({
        width: containerWidth,
        height: containerHeight
      });
    };
    
    // Initial update
    updateSize();
    
    // Set up resize observer
    const resizeObserver = new ResizeObserver(updateSize);
    resizeObserver.observe(containerRef.current);
    
    return () => {
      resizeObserver.disconnect();
    };
  }, []);
  
  // Update pixel position when container size changes to maintain normalized position
  useEffect(() => {
    if (fullWalkDistance > 0) {
      // Convert normalized position back to pixels based on new container size
      setPosition(normalizedPos * fullWalkDistance / 10);
    }
  }, [containerSize, fullWalkDistance, normalizedPos]);
  
  const triggerEffect = (effect: string) => {
    onEffectTrigger(effect);
  };

  // Check if monster is in exploring or playing state
  const isExploringOrPlaying = monster.status.type.toLowerCase() === 'exploring' || 
                               monster.status.type.toLowerCase() === 'play';

  const isFeedActivity = monster.status.type.toLowerCase() === 'feed';

  // Track activity changes for transition animations
  useEffect(() => {
    const currentActivity = monster.status.type.toLowerCase();
    
    // When switching from home to play/exploring, trigger exit animation
    if ((currentActivity === 'play' || currentActivity === 'exploring') && 
        previousActivityType === 'home') {
      setIsExitAnimation(true);
      setIsReturnAnimation(false);
      setIsEntranceAnimation(false);
      setHasCompletedEntrance(false);
      setCurrentAnimation('walkRight');
    }
    // When switching from play/exploring to home, trigger return animation
    else if (currentActivity === 'home' && 
             (previousActivityType === 'play' || previousActivityType === 'exploring')) {
      setIsReturnAnimation(true);
      setIsExitAnimation(false);
      setIsEntranceAnimation(false);
      setHasCompletedEntrance(false);
      setCurrentAnimation('walkLeft');
    }
    // When already in play/exploring state, trigger entrance animation if not completed
    else if (isExploringOrPlaying && !hasCompletedEntrance && !isExitAnimation && !isReturnAnimation) {
      setIsEntranceAnimation(true);
      setPosition(-walkDistance);
      setNormalizedPos(-10);
      setCurrentAnimation('walkRight');
    }
    
    setPreviousActivityType(currentActivity);
  }, [monster.status.type, isExploringOrPlaying, walkDistance, hasCompletedEntrance, isExitAnimation, isReturnAnimation]);

  // Handle walking animation with exit/entrance/return/continuous scrolling
  useEffect(() => {
    if (isExitAnimation || isEntranceAnimation || isReturnAnimation || isExploringOrPlaying) {
      setIsWalking(true);
      if (isReturnAnimation) {
        setWalkDirection('left');
        setCurrentAnimation('walkLeft');
      } else {
        setWalkDirection('right');
        setCurrentAnimation('walkRight');
      }
    } else {
      // For other activities, use the original random walking logic
      if (!isWalking || walkDistance <= 0) {
        setCurrentAnimation('idle');
        return;
      }
    }

    const moveMonster = (timestamp: number) => {
      if (isExitAnimation) {
        // Exit animation: monster walks from center to right edge (in home background)
        setPosition(prevPos => {
          let newPos = prevPos + WALK_SPEED;
          
          // When monster reaches right edge, complete exit and immediately trigger entrance
          if (newPos >= walkDistance) {
            newPos = walkDistance;
            setIsExitAnimation(false);
            // Background changes to forest immediately, then start entrance animation
            setIsEntranceAnimation(true);
            setPosition(-walkDistance);
            setNormalizedPos(-10);
          }
          
          // Update normalized position
          if (fullWalkDistance > 0) {
            setNormalizedPos((newPos / fullWalkDistance) * 10);
          }

          return newPos;
        });
      } else if (isReturnAnimation) {
        // Return animation: monster walks from center to left edge (in forest background)  
        setPosition(prevPos => {
          let newPos = prevPos - WALK_SPEED;
          
          // When monster reaches left edge, complete return and enter home from left
          if (newPos <= -walkDistance) {
            newPos = -walkDistance;
            setIsReturnAnimation(false);
            // Background changes to home immediately, then enter from left
            setPosition(-walkDistance);
            setNormalizedPos(-10);
            setIsEntranceAnimation(true);
          }
          
          // Update normalized position
          if (fullWalkDistance > 0) {
            setNormalizedPos((newPos / fullWalkDistance) * 10);
          }

          return newPos;
        });
      } else if (isEntranceAnimation && !hasCompletedEntrance) {
        // Entrance animation: monster walks from left to center (in current background)
        setPosition(prevPos => {
          let newPos = prevPos + WALK_SPEED;
          
          // When monster reaches center, stop entrance animation
          if (newPos >= 0) {
            newPos = 0;
            setIsEntranceAnimation(false);
            // Only set completed entrance for exploring/playing activities
            if (isExploringOrPlaying) {
              setHasCompletedEntrance(true);
            } else {
              // For home activities, reset all states
              setHasCompletedEntrance(false);
              setPosition(0);
              setNormalizedPos(0);
              setBackgroundPosition(0);
            }
          }
          
          // Update normalized position
          if (fullWalkDistance > 0) {
            setNormalizedPos((newPos / fullWalkDistance) * 10);
          }

          return newPos;
        });
      }
      
      // Background scrolling for exploring/playing monsters (after entrance, no other animations)
      if (isExploringOrPlaying && hasCompletedEntrance && !isExitAnimation && !isEntranceAnimation && !isReturnAnimation) {
        setBackgroundPosition(prevPos => {
          let newPos = prevPos + BACKGROUND_SCROLL_SPEED;
          
          // Reset background position to create seamless loop
          if (newPos >= 100) {
            newPos = 0;
          }
          
          return newPos;
        });
      }
      
      // Original walking logic for other activities (home, etc.) - only when no transitions
      if (!isExitAnimation && !isEntranceAnimation && !isReturnAnimation && !isExploringOrPlaying) {
        setPosition(prevPos => {
          // Calculate movement based on direction
          const directionMultiplier = walkDirection === 'right' ? 1 : -1;
          let newPos = prevPos + (WALK_SPEED * directionMultiplier);
          
          // Handle direction change at restricted boundaries
          if (newPos >= walkDistance) {
            newPos = walkDistance - 0.1;
            setWalkDirection('left');
            setCurrentAnimation('walkLeft');
          } else if (newPos <= -walkDistance) {
            newPos = -walkDistance + 0.1;
            setWalkDirection('right');
            setCurrentAnimation('walkRight');
          } else {
            setCurrentAnimation(walkDirection === 'right' ? 'walkRight' : 'walkLeft');
          }
          
          // Update normalized position
          if (fullWalkDistance > 0) {
            setNormalizedPos((newPos / fullWalkDistance) * 10);
          }

          return newPos;
        });
      }

      animationRef.current = requestAnimationFrame(moveMonster);
    };

    animationRef.current = requestAnimationFrame(moveMonster);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isWalking, walkDistance, walkDirection, isExitAnimation, isEntranceAnimation, isReturnAnimation, isExploringOrPlaying, hasCompletedEntrance]);

  // Handle idle/walking state changes for non-special activities
  useEffect(() => {
    if (isExitAnimation || isEntranceAnimation || isReturnAnimation || isExploringOrPlaying) {
      // Don't change state for special animations
      return;
    }

    const decideState = () => {
      const shouldWalk = Math.random() < 0.3; // 30% chance to walk
      setIsWalking(shouldWalk);
      
      // Set a random time for the next state change (between 2-5 seconds)
      const nextStateChange = 2000 + Math.random() * 3000;
      
      idleTimerRef.current = window.setTimeout(() => {
        decideState();
      }, nextStateChange);
    };

    decideState();
    
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [isExitAnimation, isEntranceAnimation, isReturnAnimation, isExploringOrPlaying]);

  // Auto-trigger healing effect for feed activity
  useEffect(() => {
    if (isFeedActivity && !currentEffect) {
      // Randomly choose a healing effect for feed
      const healingEffects = ['Small Heal', 'Medium Heal', 'Large Heal'];
      const randomHeal = healingEffects[Math.floor(Math.random() * healingEffects.length)];
      onEffectTrigger(randomHeal);
    }
  }, [isFeedActivity, currentEffect, onEffectTrigger]);

  // Render effect buttons separately
  const renderEffectButtons = () => (
    <div className="flex flex-wrap justify-center gap-2 mt-2">
      {[
        { text: 'Small Heal', color: 'bg-green-500 hover:bg-green-600' },
        { text: 'Medium Heal', color: 'bg-blue-500 hover:bg-blue-600' },
        { text: 'Large Heal', color: 'bg-purple-500 hover:bg-purple-600' },
        { text: 'Full Heal', color: 'bg-pink-500 hover:bg-pink-600' },
        { text: 'Revive', color: 'bg-yellow-500 hover:bg-yellow-600' }
      ].map(({ text, color }) => (
        <button 
          key={text}
          onClick={() => onEffectTrigger(text)}
          className={`px-3 py-1.5 text-sm rounded transition-colors whitespace-nowrap text-white ${
            currentEffect ? 'bg-gray-400 cursor-not-allowed' : color
          }`}
          disabled={!!currentEffect}
        >
          {text}
        </button>
      ))}
    </div>
  );

  // Calculate position on -10 to 10 scale for display purposes
  const normalizedPosition = fullWalkDistance > 0 
    ? Math.round((position / fullWalkDistance) * 10 * 10) / 10
    : 0;

  const getAnimationStatus = () => {
    if (isExitAnimation) return 'Exiting Home';
    if (isReturnAnimation) return 'Returning Home';
    if (isEntranceAnimation) return 'Entering Area';
    if (hasCompletedEntrance && isExploringOrPlaying) return 'In Area';
    if (isFeedActivity) return 'Feeding';
    return 'Normal';
  };

  // Helper functions for the new design
  const getEnvironmentName = (status: string) => {
    switch(status.toLowerCase()) {
      case 'home': return 'Living Room';
      case 'play': return 'Forest Playground';
      case 'exploring': return 'Whispering Woods';
      case 'mission': return selectedBackground === 'greenhouse' ? 'Mystical Greenhouse' : 'Sunny Beach';
      default: return 'Cozy Den';
    }
  };

  const getEnvironmentDescription = (status: string) => {
    switch(status.toLowerCase()) {
      case 'home': return 'A warm and inviting space with a comfy couch.';
      case 'play': return 'Running around and having fun in nature.';
      case 'exploring': return 'Discovering new paths and hidden treasures.';
      case 'mission': return selectedBackground === 'greenhouse' ? 'A magical place filled with exotic plants.' : 'A peaceful shoreline with gentle waves.';
      default: return 'A peaceful resting place.';
    }
  };



  const getTimeOfDay = () => {
    const hour = new Date().getHours();
    return hour >= 6 && hour < 18 ? 'day' : 'night';
  };

  return (
    <div className="monster-status-container">
      {/* Header */}
      <div className="flex items-center gap-4 mb-6">
        <div className="p-3 bg-gradient-to-r from-orange-500 to-red-600 rounded-2xl shadow-lg">
          <PawPrint className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
            Monster Status
          </h1>
          <p className="text-slate-600 text-sm">Keep an eye on your companion</p>
        </div>
        {DEV_MODE && (
          <select 
            value={selectedBackground} 
            onChange={(e) => setSelectedBackground(e.target.value)}
            className="bg-gray-700 text-white text-sm rounded-md px-2 py-1 border border-gray-500 ml-auto"
          >
            <option value="home">Home</option>
            <option value="beach">Beach</option>
            <option value="forest">Forest</option>
            <option value="greenhouse">Greenhouse</option>
          </select>
        )}
      </div>

      {/* Status Card */}
      <div className="bg-white/80 backdrop-blur-sm border-2 border-white/50 shadow-xl hover:shadow-2xl transition-all duration-300 overflow-hidden rounded-xl">
        {/* Environment Display */}
        <div 
          ref={containerRef}
          className="relative w-full h-64 overflow-hidden"
          style={{
            backgroundImage: `url(${new URL(`../assets/window-backgrounds/${selectedBackground}.png`, import.meta.url).href})`,
            backgroundSize: 'cover',
            backgroundPosition: isExploringOrPlaying && hasCompletedEntrance 
              ? `${backgroundPosition}% center` 
              : 'center',
            transition: isExploringOrPlaying && hasCompletedEntrance ? 'none' : 'background-position 0.1s linear',
          }}
        >
          <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
          
          {/* Time of Day Badge */}
          <div className="absolute top-4 left-4 flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md z-20">
            {getTimeOfDay() === 'day' ? (
              <Sun className="w-4 h-4 text-yellow-500" />
            ) : (
              <Moon className="w-4 h-4 text-blue-500" />
            )}
            <span className="text-slate-700 font-medium text-sm">
              {getTimeOfDay() === 'day' ? 'Day' : 'Night'}
            </span>
          </div>

          {/* Location Badge */}
          <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md z-20">
            <MapPin className="w-4 h-4 text-slate-600" />
            <span className="text-slate-700 font-medium text-sm">{getEnvironmentName(monster.status.type)}</span>
          </div>

          {/* Activity Status Badge */}
          {(monster.status.type !== 'Home' && (monster.status.until_time || activityTimeUp)) && (
            <div className="absolute top-4 right-4 bg-white/70 backdrop-blur-sm px-4 py-2 rounded-full shadow-md z-20">
              <span className="text-slate-700 font-medium text-sm">
                {activityTimeUp ? 'Complete!' : formatTimeRemaining(monster.status.until_time)}
              </span>
            </div>
          )}

          {/* Monster Sprite */}
          {monsterSize > 0 && (
            <div 
              className="monster-container absolute left-1/2 flex flex-col items-center"
              style={{
                width: `${Math.min(monsterSize, 120)}px`,
                height: `${Math.min(monsterSize, 120)}px`,
                transform: `translateX(calc(-50% + ${position * 0.5}px))`,
                bottom: '0px',
                transition: 'transform 0.1s linear',
                zIndex: 10
              }}
            >
              {/* Position indicator - dev mode only */}
              {DEV_MODE && (
                <div className="absolute -top-6 bg-black bg-opacity-70 text-white text-xs px-2 py-0.5 rounded whitespace-nowrap">
                  Pos: {normalizedPosition.toFixed(1)} | {currentAnimation} | {getAnimationStatus()}
                </div>
              )}
              <MonsterSpriteView 
                sprite={monster.sprite || ''}
                currentAnimation={currentAnimation}
                behaviorMode={isWalking ? 'pacing' : 'static'}
                containerWidth={Math.min(monsterSize, 120)}
                containerHeight={Math.min(monsterSize, 120)}
                activityType={monster.status.type}
                effect={currentEffect as any}
                onEffectComplete={() => {}}
              />
            </div>
          )}
        </div>

        {/* Monster and Status Info */}
        <div className="p-6">
          <div className="text-center md:text-left">
            <div className="flex items-center justify-center md:justify-start gap-2 mb-2">
              <Home className="w-5 h-5 text-slate-600" />
              <h2 className="text-xl font-bold text-slate-800">Status: {monster.status.type}</h2>
            </div>
            <p className="text-slate-600 text-sm">{getEnvironmentDescription(monster.status.type)}</p>
            
            {/* Progress Bar for activities */}
            {monster.status.type !== 'Home' && monster.status.until_time && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-gradient-to-r from-orange-400 to-red-500 h-2 rounded-full transition-all duration-300"
                    style={{ 
                      width: `${Math.min(100, calculateProgress(monster.status.since, monster.status.until_time))}%` 
                    }}
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  {activityTimeUp ? 'Activity completed!' : `${formatTimeRemaining(monster.status.until_time)} remaining`}
                </p>
              </div>
            )}
          </div>
        </div>
      </div>



      {/* Effect Buttons - Only show in dev mode */}
      {DEV_MODE && (
        <div className="mt-4 pt-4 border-t border-gray-300">
          {renderEffectButtons()}
        </div>
      )}
    </div>
  );
};

export default MonsterStatusWindow;
