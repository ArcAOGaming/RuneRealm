import React from 'react';
import { Gateway } from '../constants/Constants';
import { MonsterStats } from '../utils/aoHelpers';
import { MonsterCardDisplay } from './MonsterCardDisplay';

interface ProfileCardProps {
  profile: {
    ProfileImage?: string;
    UserName?: string;
    DisplayName?: string;
    Description?: string;
  };
  address: string;
  onClick?: () => void;
  assets?: Array<{
    Id: string;
    Quantity: string;
    Type?: string;
  }>;
  monster?: MonsterStats | null;
}

export const ProfileCard: React.FC<ProfileCardProps> = ({ profile, address, onClick, assets, monster }) => {
  const shortenAddress = (addr: string) => {
    if (addr.length < 8) return addr;
    return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
  };

  return (
    <div className="bg-gray-800 rounded-lg overflow-hidden hover:bg-gray-700 transition-colors w-full">
      <div className="p-4">
        {/* Profile Header - Clickable */}
        <div 
          className="flex items-center mb-3 cursor-pointer"
          onClick={onClick}
        >
          <div className="w-12 h-12 mr-4 flex-shrink-0">
            {profile?.ProfileImage ? (
              <img
                src={`${Gateway}${profile.ProfileImage}`}
                alt={profile.DisplayName || 'Profile'}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  const target = e.target as HTMLImageElement;
                  // Only update if not already using fallback
                  if (!target.src.includes('data:image')) {
                    target.src = 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI0OCIgaGVpZ2h0PSI0OCIgdmlld0JveD0iMCAwIDQ4IDQ4IiBmaWxsPSJub25lIj48Y2lyY2xlIGN4PSIyNCIgY3k9IjI0IiByPSIyNCIgZmlsbD0iIzY0NzQ4QiIvPjxwYXRoIGQ9Ik0yNCAyNkMyOC40MTgzIDI2IDMyIDIyLjQxODMgMzIgMThDMzIgMTMuNTgxNyAyOC40MTgzIDEwIDI0IDEwQzE5LjU4MTcgMTAgMTYgMTMuNTgxNyAxNiAxOEMxNiAyMi40MTgzIDE5LjU4MTcgMjYgMjQgMjZaIiBmaWxsPSIjOTRBM0I4Ii8+PHBhdGggZD0iTTM4IDM4QzM4IDMxLjM3MjYgMzEuNzMxOSAyNiAyNCAyNkMxNi4yNjgxIDI2IDEwIDMxLjM3MjYgMTAgMzhIMzhaIiBmaWxsPSIjOTRBM0I4Ii8+PC9zdmc+';
                    target.onerror = null; // Prevent further error handling
                  }
                }}
              />
            ) : (
              <div className="w-full h-full rounded-full bg-gray-600 flex items-center justify-center">
                <span className="text-white text-sm">
                  {(profile?.DisplayName || profile?.UserName || 'User').charAt(0)}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-white font-medium truncate">
              {profile?.DisplayName || profile?.UserName || 'Anonymous User'}
            </h3>
            <p className="text-gray-400 text-sm font-mono">{shortenAddress(address)}</p>
          </div>
          {/* {assets && assets.length > 0 && (
            <div className="ml-4 text-gray-400 text-sm">
              <span>{assets.length} Assets</span>
            </div>
          )} */}
        </div>

        {/* Monster Section */}
        {monster ? (
          <div className="space-y-4">
            {/* Monster Card Display */}
            <div className="w-full max-w-[240px] mx-auto" onClick={(e) => e.stopPropagation()}>
              <MonsterCardDisplay monster={monster} />
            </div>

            {/* Monster Stats - Commented out for now, but keep for debugging
            <div className="mt-3 border-t border-gray-700 pt-3">
              <div className="text-sm text-gray-300">
                <div className="max-h-96 overflow-y-auto text-xs font-mono select-text">
                  <pre 
                    className="whitespace-pre-wrap break-words cursor-text" 
                    onClick={(e) => e.stopPropagation()}
                  >
                    {JSON.stringify(monster, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
            */}
          </div>
        ) : (
          <div className="text-gray-500 text-center mt-3 border-t border-gray-700 pt-3">
            No Monster
          </div>
        )}
      </div>
    </div>
  );
};
