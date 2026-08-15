import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Settings, Crown, X, Sparkles } from 'lucide-react';
import { WhoSentModal } from './WhoSentModal';

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
  const [showProModal, setShowProModal] = useState(false);

  if (currentView === 'sender' || isViewingOther) {
    return null;
  }

  return (
    <>
      <header className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto px-5 pt-3 pb-2 flex items-center justify-between z-30 sticky top-0 bg-transparent select-none">
        {/* Left Spacer */}
        <div className="w-10 sm:w-16 h-10 flex items-center" />

        {/* Center Tabs: PLAY | INBOX matching Screen 3 */}
        <div className="flex items-center gap-6 sm:gap-8">
          <button
            onClick={() => setCurrentView('play')}
            className={`text-base sm:text-lg font-black tracking-tight transition-all cursor-pointer ${
              currentView === 'play'
                ? 'text-slate-900 drop-shadow-sm scale-105'
                : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            PLAY
          </button>

          <button
            onClick={() => setCurrentView('inbox')}
            className={`relative text-base sm:text-lg font-black tracking-tight transition-all cursor-pointer flex items-center gap-1.5 ${
              currentView === 'inbox'
                ? 'text-slate-900 drop-shadow-sm scale-105'
                : 'text-slate-300 hover:text-slate-500'
            }`}
          >
            <span>INBOX</span>
            {unreadCount > 0 && (
              <span className="w-2.5 h-2.5 rounded-full bg-[#fa0f5c] ring-2 ring-white" />
            )}
          </button>
        </div>

        {/* Top Right: Authentic PRO Badge & Settings Gear */}
        <div className="flex items-center gap-2">
          {/* Authentic PRO Badge (Top Right, No Pulse) */}
          <button
            onClick={() => setShowProModal(true)}
            className="flex items-center gap-1 bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-slate-950 px-2.5 py-1 rounded-full text-[11px] font-black shadow-sm hover:opacity-90 active:scale-95 transition-all cursor-pointer border border-amber-300/40"
            title="NGL Pro Membership"
          >
            <Crown className="w-3.5 h-3.5 fill-slate-950 text-slate-950" />
            <span className="tracking-wider">PRO</span>
          </button>

          {/* Settings Gear Button */}
          <button
            onClick={onOpenProfile}
            className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-all cursor-pointer active:scale-95 shadow-sm"
            title="Profile & Account Settings"
          >
            <Settings className="w-4 h-4 text-slate-600 stroke-[2.25]" />
          </button>
        </div>
      </header>

      {/* PRO Membership Modal */}
      {showProModal && (
        <WhoSentModal
          onClose={() => setShowProModal(false)}
        />
      )}
    </>
  );
};
