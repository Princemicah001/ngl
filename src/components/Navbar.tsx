import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Eye, Settings, X, Activity, Flame, Users } from 'lucide-react';

interface NavbarProps {
  currentView: 'play' | 'inbox' | 'sender';
  setCurrentView: (view: 'play' | 'inbox' | 'sender') => void;
  profile: UserProfile | null;
  unreadCount: number;
  onOpenProfile: () => void;
  isViewingOther: boolean;
  onSwitchToMyProfile: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  setCurrentView,
  profile,
  unreadCount,
  onOpenProfile,
  isViewingOther,
  onSwitchToMyProfile
}) => {
  const [showLiveStats, setShowLiveStats] = useState(false);

  if (currentView === 'sender' || isViewingOther) {
    return null;
  }

  return (
    <>
      <header className="w-full max-w-md md:max-w-3xl lg:max-w-5xl mx-auto px-5 pt-3 pb-2 flex items-center justify-between z-30 sticky top-0 bg-transparent select-none">
        {/* Left Spacer to keep center tabs balanced */}
        <div className="w-10 h-10" />

        {/* Center Tabs: PLAY | INBOX */}
        <div className="flex items-center gap-6 bg-black/25 backdrop-blur-lg px-6 py-2 rounded-full shadow-lg">
          <button
            onClick={() => setCurrentView('play')}
            className={`text-base sm:text-lg tracking-tight font-black transition-all cursor-pointer ${
              currentView === 'play'
                ? 'text-white scale-105 drop-shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            PLAY
          </button>

          <button
            onClick={() => setCurrentView('inbox')}
            className={`relative text-base sm:text-lg tracking-tight font-black transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'inbox'
                ? 'text-white scale-105 drop-shadow-md'
                : 'text-white/60 hover:text-white'
            }`}
          >
            <span>INBOX</span>
            {unreadCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-white ring-2 ring-[#fa0f5c] animate-pulse" />
            )}
          </button>
        </div>

        {/* Top Right: Settings Gear */}
        <button
          onClick={onOpenProfile}
          className="w-10 h-10 rounded-full bg-black/20 hover:bg-black/30 backdrop-blur-md flex items-center justify-center text-white transition-all cursor-pointer active:scale-95"
          title="Account & Profile Settings"
        >
          <Settings className="w-5 h-5" />
        </button>
      </header>

      {/* Live Stats Modal */}
      {showLiveStats && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
                <h3 className="text-lg font-black text-slate-900">
                  Live Link Radar
                </h3>
              </div>
              <button
                onClick={() => setShowLiveStats(false)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-slate-50 rounded-2xl p-3.5 text-center border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Story Clicks
                </span>
                <span className="text-2xl font-black text-slate-900 block mt-0.5">
                  142
                </span>
              </div>
              <div className="bg-slate-50 rounded-2xl p-3.5 text-center border border-slate-100">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                  Active Now
                </span>
                <span className="text-2xl font-black text-cyan-600 block mt-0.5">
                  7
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 font-medium text-center">
              Your link <strong className="text-slate-800">ngl.link/{profile?.username}</strong> is live and receiving responses.
            </p>

            <button
              onClick={() => setShowLiveStats(false)}
              className="w-full bg-black text-white font-black text-xs py-3.5 rounded-2xl active:scale-95"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
