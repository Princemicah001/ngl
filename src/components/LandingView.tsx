import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowRight, X, ShieldCheck, Check } from 'lucide-react';

interface LandingViewProps {
  onGetStarted: (username: string) => Promise<void>;
  isLoading?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGetStarted,
  isLoading = false
}) => {
  const [showUsernameStep, setShowUsernameStep] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);

  const handleStartClick = () => {
    setShowUsernameStep(true);
  };

  const handleSubmitUsername = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = usernameInput.trim().toLowerCase().replace(/[@\s]/g, '') || `ngl_user${Math.floor(Math.random() * 9000 + 1000)}`;
    setIsSubmitting(true);
    try {
      await onGetStarted(handle);
    } catch (err) {
      console.error('Failed to start:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-6 pt-16 pb-8 bg-gradient-to-b from-[#f70a59] via-[#fa0f5c] to-[#ff6200] relative overflow-hidden select-none text-white">
      
      {/* Background subtle ambient glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-orange-400/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Spacer */}
      <div className="w-full flex justify-end">
        {/* Optional subtle status indicator */}
        <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white/90 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
          <span>v2.0 Live</span>
        </div>
      </div>

      {/* Center Hero Section */}
      <div className="w-full max-w-sm flex flex-col items-center justify-center text-center my-auto">
        {/* Official NGL Logo with subtle float animation */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0, rotate: -6 }}
          animate={{ scale: 1, opacity: 1, rotate: -2 }}
          transition={{
            type: "spring",
            stiffness: 260,
            damping: 20
          }}
          className="relative mb-6 cursor-pointer transform hover:scale-105 transition-transform"
        >
          <img
            src="https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png"
            alt="NGL Logo"
            className="w-48 sm:w-56 h-auto object-contain drop-shadow-2xl mx-auto"
          />
        </motion.div>

        {/* Hero Slogan */}
        <motion.h1
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.4 }}
          className="text-2xl sm:text-[28px] font-black leading-tight text-white drop-shadow-md tracking-tight max-w-[280px]"
        >
          Get anonymous messages on Instagram!
        </motion.h1>
      </div>

      {/* Bottom Action Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.4 }}
        className="w-full max-w-xs flex flex-col items-center gap-4 z-10"
      >
        {/* Get Started! Pill Button */}
        <button
          id="get-started-btn"
          onClick={handleStartClick}
          disabled={isLoading}
          className="w-full bg-white text-black font-black text-lg sm:text-xl py-4 px-6 rounded-full shadow-2xl hover:bg-slate-50 active:scale-95 transition-all duration-150 flex items-center justify-center tracking-tight cursor-pointer"
        >
          {isLoading ? (
            <div className="w-6 h-6 border-3 border-black border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>Get Started!</span>
          )}
        </button>

        {/* Legal Disclaimer */}
        <p className="text-[11px] leading-relaxed text-white/90 text-center font-medium px-2">
          By continuing, you agree to our{' '}
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="underline font-bold hover:text-white cursor-pointer"
          >
            Terms of Use
          </button>{' '}
          and have read and agreed to our{' '}
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="underline font-bold hover:text-white cursor-pointer"
          >
            Privacy Policy
          </button>
        </p>
      </motion.div>

      {/* Username Setup Modal (Opens upon clicking Get Started) */}
      <AnimatePresence>
        {showUsernameStep && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 text-slate-900 shadow-2xl flex flex-col gap-5 border border-white/50"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="ngl-logo-stroke text-3xl">ngl</span>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-wider">
                    Step 1 of 1
                  </span>
                </div>
                <button
                  onClick={() => setShowUsernameStep(false)}
                  className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-col gap-1 text-left">
                <h3 className="text-2xl font-black text-slate-900 tracking-tight">
                  What's your handle?
                </h3>
                <p className="text-slate-500 text-xs font-semibold">
                  This will be used to create your custom NGL link for Instagram stories.
                </p>
              </div>

              {/* Handle Form */}
              <form onSubmit={handleSubmitUsername} className="flex flex-col gap-4">
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-slate-400 font-black text-lg">
                    @
                  </span>
                  <input
                    type="text"
                    autoFocus
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value)}
                    placeholder="your_instagram_handle"
                    maxLength={30}
                    className="w-full bg-slate-100 rounded-2xl pl-10 pr-4 py-4 text-base font-extrabold text-slate-900 placeholder:text-slate-400 placeholder:font-medium outline-none focus:ring-2 focus:ring-[#f70a59]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-gradient-to-r from-[#f70a59] to-[#ff6200] text-white font-black text-base py-4 rounded-2xl active:scale-95 shadow-lg shadow-pink-500/25 hover:opacity-95 transition-all flex items-center justify-center gap-2"
                >
                  {isSubmitting ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Continue to Inbox</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Safety badge */}
              <div className="flex items-center justify-center gap-1.5 text-slate-400 text-xs font-bold pt-1">
                <ShieldCheck className="w-4 h-4 text-green-500" />
                <span>Anonymous questions are filtered for safety</span>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Legal terms & privacy popup modal */}
      {legalModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col gap-3 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black capitalize text-slate-900">
                {legalModal === 'terms' ? 'Terms of Use' : 'Privacy Policy'}
              </h3>
              <button
                onClick={() => setLegalModal(null)}
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="text-xs text-slate-600 space-y-2 leading-relaxed text-left">
              {legalModal === 'terms' ? (
                <>
                  <p>1. NGL is designed to foster fun, authentic, and respectful anonymous Q&A interactions.</p>
                  <p>2. Harassment, hate speech, bullying, or illegal content will result in moderation and account deletion.</p>
                  <p>3. You are responsible for any links shared on third-party platforms such as Instagram and Snapchat.</p>
                </>
              ) : (
                <>
                  <p>1. Messages sent through NGL are anonymous and stored securely using Firebase encryption.</p>
                  <p>2. We do not sell your personal data or reveal sender identities to inbox recipients.</p>
                  <p>3. You can clear your messages or delete your profile handle at any time in the settings.</p>
                </>
              )}
            </div>
            <button
              onClick={() => setLegalModal(null)}
              className="mt-2 bg-black text-white font-black text-xs py-3 rounded-xl hover:bg-slate-800"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
