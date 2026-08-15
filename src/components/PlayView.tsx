import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserProfile } from '../types';
import { Link2, Dices, Check, Camera, Palette } from 'lucide-react';
import { NGL_60_TEMPLATES } from '../lib/templates';

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

  const handleRollPrompt = async () => {
    if (isRolling) return;
    setIsRolling(true);
    setDiceRotation(prev => prev + 360);

    const otherPrompts = NGL_60_TEMPLATES.filter(p => p !== profile?.prompt);
    const nextPrompt = otherPrompts[Math.floor(Math.random() * otherPrompts.length)] || NGL_60_TEMPLATES[0];

    try {
      await onUpdatePrompt(nextPrompt);
    } catch (err) {
      console.error('Failed to update prompt:', err);
    } finally {
      setTimeout(() => setIsRolling(false), 300);
    }
  };

  const usernameHandle = profile?.username?.toUpperCase() || 'USER';
  const displayPrompt = profile?.prompt || 'send me anonymous messages!';

  return (
    <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-2 sm:py-6 flex flex-col md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-16 flex-1 select-none">
      
      {/* Left Column (Wide) / Center Card (Mobile): Center Question Card */}
      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.2 }}
        className="w-full md:w-1/2 max-w-sm mx-auto relative my-auto py-2 flex flex-col items-center flex-shrink-0"
      >
        <div className="w-full bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden">
          
          {/* Top Gradient Header */}
          <div className="w-full bg-gradient-to-r from-[#fa0f5c] via-[#f70a59] to-[#fc6320] px-6 py-6 sm:py-7 flex items-center justify-between relative text-center">
            <h2 className="w-full text-white font-black text-xl sm:text-2xl leading-tight tracking-tight drop-shadow-sm px-4">
              {displayPrompt}
            </h2>
            
            {/* Quick Roll Dice Button */}
            <motion.button
              onClick={handleRollPrompt}
              animate={{ rotate: diceRotation }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
              title="Shuffle prompt question"
              className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white/20 hover:bg-white/30 active:scale-90 text-white flex items-center justify-center backdrop-blur-md transition-all shadow-sm cursor-pointer"
            >
              <Dices className={`w-5 h-5 text-white ${isRolling ? 'animate-spin' : ''}`} />
            </motion.button>
          </div>

          {/* Bottom Pure White Body with Question / Handle Content */}
          <div className="w-full bg-white px-6 py-8 sm:py-10 flex flex-col items-center justify-center text-center">
            
            {/* User Avatar + Handle (Only @username and photo) */}
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-full p-[2px] bg-gradient-to-tr from-[#fa0f5c] to-[#fc6320]">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                ) : (
                  <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-xs">
                    {profile?.username?.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
              </div>
              <span className="text-xs font-black text-slate-400 tracking-wider">
                @{profile?.username || 'user'}
              </span>
            </div>

            {/* Main Prompt typography */}
            <AnimatePresence mode="wait">
              <motion.p
                key={displayPrompt}
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                transition={{ duration: 0.15 }}
                className="text-slate-900 font-black text-2xl sm:text-[26px] leading-snug tracking-tight max-w-[280px]"
              >
                {displayPrompt}
              </motion.p>
            </AnimatePresence>

            <button
              onClick={handleRollPrompt}
              className="mt-4 text-[11px] font-bold text-slate-400 hover:text-slate-700 flex items-center gap-1 cursor-pointer transition-colors"
            >
              <Dices className="w-3.5 h-3.5" />
              <span>Tap dice to switch question</span>
            </button>
          </div>
        </div>

        {/* Decorative Tools & Attribution */}
        <div className="flex items-center justify-center gap-4 mt-4">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-cyan-400 p-[2px] shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={handleRollPrompt} title="Shuffle prompt question">
            <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
              <Palette className="w-3.5 h-3.5 text-slate-700" />
            </div>
          </div>
          <div className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition-transform" onClick={onOpenStoryShare} title="Create Instagram Story Sticker">
            <Camera className="w-4 h-4 text-white" />
          </div>
        </div>

        <p className="text-[11px] font-bold text-white/90 text-center mt-2.5 drop-shadow-sm">
          Sent with ❤️ from team NGL
        </p>
      </motion.div>

      {/* Right Column (Wide) / Bottom Steps (Mobile): Action Steps Section */}
      <div className="w-full md:w-1/2 max-w-sm mx-auto flex flex-col gap-3.5 pb-3 z-10 my-auto">
        
        {/* Step 1: Copy Link Box */}
        <div className="w-full bg-white/95 backdrop-blur-md rounded-[28px] sm:rounded-3xl p-5 flex flex-col items-center justify-center text-center shadow-lg">
          <span className="text-sm font-black text-slate-900 tracking-tight">
            Step 1: Copy your link
          </span>
          <span className="text-xs font-black text-slate-400 uppercase tracking-wider my-1.5 truncate max-w-[260px]">
            NGL.LINK/{usernameHandle}
          </span>
          
          <button
            onClick={onCopyLink}
            className={`w-full max-w-[220px] py-2.5 px-4 rounded-full text-xs font-black transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer mt-1 ${
              copied
                ? 'text-green-600 bg-green-50'
                : 'text-slate-900 bg-slate-100 hover:bg-pink-50 shadow-sm'
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Link2 className="w-3.5 h-3.5 text-[#fa0f5c]" />
                <span>copy link</span>
              </>
            )}
          </button>
        </div>

        {/* Step 2: Share on Story Button */}
        <div className="w-full flex flex-col items-center justify-center">
          <button
            onClick={onOpenStoryShare}
            className="w-full bg-black hover:bg-slate-900 text-white font-black text-base sm:text-lg py-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>Share on Story!</span>
          </button>
        </div>

      </div>
    </div>
  );
};
