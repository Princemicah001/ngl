import React, { useState } from 'react';
import { UserProfile } from '../types';
import { Settings, Crown, X, Sparkles, Download, Smartphone, Share } from 'lucide-react';
import { WhoSentModal } from './WhoSentModal';
import { usePWAInstall } from '../hooks/usePWAInstall';

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
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();

  if (currentView === 'sender' || isViewingOther) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIOSInstallGuide(true);
    } else {
      const success = await installPWA();
      if (!success && !isInstallable) {
        alert("To install NGL: Tap your browser's menu (⋮ or Share) and select 'Install app' or 'Add to Home screen'.");
      }
    }
  };

  return (
    <>
      <header className="w-full max-w-md md:max-w-3xl lg:max-w-4xl mx-auto px-5 pt-3 pb-2 flex items-center justify-between z-30 sticky top-0 bg-transparent select-none">
        {/* Top Left: Clean Gradient Install Button (or placeholder when installed) */}
        <div className="flex items-center">
          {!isInstalled ? (
            <button
              onClick={handleInstallClick}
              className="flex items-center gap-1.5 bg-gradient-to-r from-[#fa0f5c] to-[#fc6320] text-white px-3 py-1.5 rounded-full text-xs font-black shadow-md hover:opacity-95 active:scale-95 transition-all cursor-pointer border border-white/20"
              title="Install NGL App"
            >
              <Download className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Install</span>
            </button>
          ) : (
            <div className="w-10 sm:w-16 h-10 flex items-center" />
          )}
        </div>

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

      {/* iOS Install Instructions Modal */}
      {showIOSInstallGuide && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-xs bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-[#fa0f5c] to-[#fc6320] text-white flex items-center justify-center mb-3 shadow-md">
              <Smartphone className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-black text-slate-900">
              Install on iPhone / iPad
            </h3>
            <div className="text-xs text-slate-600 font-medium mt-3 mb-5 text-left flex flex-col gap-2.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100">
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center shrink-0">1</span>
                <span>Tap the <strong className="text-slate-900">Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5" /> in Safari</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center shrink-0">2</span>
                <span>Scroll down and tap <strong className="text-slate-900">Add to Home Screen</strong></span>
              </p>
              <p className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-800 font-black text-[10px] flex items-center justify-center shrink-0">3</span>
                <span>Tap <strong className="text-slate-900">Add</strong> in top right corner</span>
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowIOSInstallGuide(false)}
              className="w-full py-3 rounded-full bg-black hover:bg-slate-900 text-white font-black text-xs transition-colors cursor-pointer"
            >
              Got It!
            </button>
          </div>
        </div>
      )}

      {/* PRO Membership Modal */}
      {showProModal && (
        <WhoSentModal
          onClose={() => setShowProModal(false)}
        />
      )}
    </>
  );
};
