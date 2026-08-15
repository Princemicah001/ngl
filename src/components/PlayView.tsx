import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { Link2, Dices, Check, PlusCircle, Sparkles, Download } from 'lucide-react';
import { NGL_60_TEMPLATES } from '../lib/templates';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PlayViewProps {
  profile: UserProfile | null;
  onCopyLink: () => void;
  copied: boolean;
  onOpenStoryShare: () => void;
  onUpdatePrompt: (newPrompt: string) => Promise<void>;
  appUrl: string;
}

export const PlayView: React.FC<PlayViewProps> = ({
  profile,
  onCopyLink,
  copied,
  onOpenStoryShare,
  onUpdatePrompt,
  appUrl
}) => {
  const [isRolling, setIsRolling] = useState(false);
  const [diceRotation, setDiceRotation] = useState(0);
  const { isInstalled, isIOS, installPWA } = usePWAInstall();

  const handleRollPrompt = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setDiceRotation((prev) => prev + 360);

    const otherPrompts = NGL_60_TEMPLATES.filter((p) => p !== profile?.prompt);
    const nextPrompt = otherPrompts[Math.floor(Math.random() * otherPrompts.length)] || NGL_60_TEMPLATES[0];

    try {
      await onUpdatePrompt(nextPrompt);
    } catch (err) {
      console.error('Failed to update prompt:', err);
    } finally {
      setTimeout(() => setIsRolling(false), 300);
    }
  };

  const usernameHandle = profile?.username?.toUpperCase() || 'F_LAHOZ';
  const displayPrompt = profile?.prompt || 'send me anonymous messages!';

  return (
    <div className="w-full max-w-sm sm:max-w-md mx-auto px-4 py-2 flex flex-col items-center select-none">
      
      {/* 1. Main Anonymous Question Card matching Screen 3 */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full relative rounded-[32px] sm:rounded-[36px] bg-gradient-to-b from-[#f70a59] via-[#fa0f5c] to-[#ff581f] p-6 sm:p-8 flex flex-col items-center justify-center text-center shadow-xl overflow-hidden text-white"
      >
        {/* Dice Shuffle Button in Corner */}
        <motion.button
          onClick={handleRollPrompt}
          animate={{ rotate: diceRotation }}
          transition={{ type: 'spring', stiffness: 260, damping: 20 }}
          title="Shuffle prompt"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all cursor-pointer z-10"
        >
          <Dices className={`w-4 h-4 ${isRolling ? 'animate-spin' : ''}`} />
        </motion.button>

        {/* User Circular Avatar with Thick White Ring */}
        <div className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full ring-4 ring-white/95 shadow-lg overflow-hidden bg-slate-900 flex items-center justify-center mb-4 z-10">
          {profile?.photoURL ? (
            <img
              src={profile.photoURL}
              alt={profile.username}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-2xl">
              {profile?.username?.charAt(0).toUpperCase() || 'U'}
            </div>
          )}
        </div>

        {/* Question Text in Bold White Font */}
        <AnimatePresence mode="wait">
          <motion.h2
            key={displayPrompt}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="text-white font-black text-2xl sm:text-[26px] leading-tight tracking-tight max-w-[260px] drop-shadow-sm z-10"
          >
            {displayPrompt}
          </motion.h2>
        </AnimatePresence>
      </motion.div>

      {/* 2. Section Heading matching Screen 3: "Get anonymous messages!" */}
      <h3 className="text-[#f70a59] font-black text-xl sm:text-2xl text-center my-4 tracking-tight">
        Get anonymous messages!
      </h3>

      {/* 3. Steps Container */}
      <div className="w-full flex flex-col gap-3">
        
        {/* Step 1: Copy your link */}
        <div className="w-full bg-[#fdf2f4] rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center border border-pink-100/60 shadow-sm">
          <span className="text-black font-black text-base sm:text-lg">
            Step 1: Copy your link
          </span>
          <span className="text-slate-400 font-bold text-xs sm:text-sm tracking-wider uppercase my-1 truncate max-w-[260px]">
            NGL.LINK/{usernameHandle}
          </span>
          
          <button
            onClick={onCopyLink}
            className={`w-full max-w-[200px] py-2.5 px-6 rounded-full border-2 border-[#fa0f5c] text-sm font-black transition-all flex items-center justify-center gap-1.5 active:scale-95 cursor-pointer mt-1 ${
              copied
                ? 'bg-[#fa0f5c] text-white'
                : 'bg-white hover:bg-pink-50 text-[#fa0f5c]'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-4 h-4" />
                <span>copy link</span>
              </>
            )}
          </button>
        </div>

        {/* Step 2 : Share link on your Instagram Story */}
        <div className="w-full bg-[#fdf2f4] rounded-[24px] p-4 sm:p-5 flex flex-col items-center justify-center text-center border border-pink-100/60 shadow-sm">
          <span className="text-black font-black text-base sm:text-lg mb-3">
            Step 2 : Share link on your Instagram Story
          </span>
          
          <button
            onClick={onOpenStoryShare}
            className="w-full py-4 px-6 rounded-full bg-[#fa0f5c] hover:bg-[#e00a50] text-white font-black text-lg sm:text-xl shadow-lg shadow-pink-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <PlusCircle className="w-5 h-5" />
            <span>Share!</span>
          </button>
        </div>

      </div>
    </div>
  );
};
