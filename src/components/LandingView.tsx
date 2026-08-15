import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Crown, X, Download, Smartphone, Share } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface LandingViewProps {
  onGetStarted: (username: string, photoURL?: string) => Promise<void>;
  isLoading?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGetStarted,
  isLoading = false
}) => {
  const [step, setStep] = useState<1 | 2>(1);
  const [usernameInput, setUsernameInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const [showIOSInstallGuide, setShowIOSInstallGuide] = useState(false);
  const { isInstallable, isInstalled, isIOS, installPWA } = usePWAInstall();

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

  const handleDone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const handle = usernameInput.trim().toLowerCase().replace(/[@\s]/g, '') || `user_${Math.floor(Math.random() * 9000 + 1000)}`;
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
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-5 sm:px-6 py-6 bg-gradient-to-b from-[#f70a59] via-[#fa0f5c] to-[#ff6200] relative overflow-hidden select-none text-white">
      
      {/* Subtle Ambient Radial Glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-orange-400/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar: Install Button on Top Left & PRO Badge on Top Right */}
      <header className="w-full max-w-md mx-auto flex items-center justify-between z-20">
        {!isInstalled ? (
          <button
            onClick={handleInstallClick}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-xs font-black shadow-md border border-white/25 active:scale-95 transition-all cursor-pointer"
            title="Install NGL App"
          >
            <Download className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Install</span>
          </button>
        ) : (
          <div className="w-10 h-6" />
        )}

        <div className="flex items-center gap-1.5 bg-black/25 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/20 shadow-md">
          <Crown className="w-3.5 h-3.5 text-amber-400 fill-amber-400" />
          <span className="text-[11px] font-black tracking-wider uppercase text-white">PRO</span>
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

      {/* Main Content: Step 1 (Get Questions) OR Step 2 (Enter Instagram Handle) */}
      <div className="w-full max-w-sm mx-auto flex-1 flex flex-col items-center justify-center z-10 py-4 my-auto">
        <AnimatePresence mode="wait">
          {step === 1 ? (
            /* ============================================================ */
            /* SCREEN 1: GET STARTED / GET QUESTIONS                        */
            /* ============================================================ */
            <motion.div
              key="step1"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center justify-center text-center my-auto"
            >
              {/* Giant Bubbly 3D NGL Logo */}
              <div className="my-6">
                <img
                  src="https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png"
                  className="h-14 mb-1 drop-shadow-md mx-auto object-contain"
                  alt="NGL Logo"
                />
              </div>

              {/* Tagline matching reference photo */}
              <p className="text-white font-extrabold text-xl sm:text-2xl leading-snug tracking-tight px-4 max-w-[280px] drop-shadow-sm mb-12">
                Get anonymous messages on Instagram!
              </p>

              {/* White Pill Action Button: "Get Questions!" */}
              <button
                id="get-questions-btn"
                type="button"
                onClick={() => setStep(2)}
                className="w-full max-w-xs bg-white hover:bg-slate-50 text-slate-900 font-black text-lg py-4 px-8 rounded-full shadow-2xl active:scale-95 transition-all cursor-pointer tracking-tight"
              >
                Get Questions!
              </button>
            </motion.div>
          ) : (
            /* ============================================================ */
            /* SCREEN 2: WHAT'S YOUR INSTAGRAM HANDLE?                      */
            /* ============================================================ */
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.2 }}
              className="w-full flex flex-col items-center justify-center text-center my-auto"
            >
              {/* Top NGL Bubbly Logo */}
              <div className="mb-8">
                <img
                  src="https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png"
                  className="h-14 mb-1 drop-shadow-md mx-auto object-contain"
                  alt="NGL Logo"
                />
              </div>

              {/* Question Heading */}
              <h3 className="text-white font-black text-2xl sm:text-[26px] leading-tight tracking-tight px-2">
                What's your Instagram handle?
              </h3>

              {/* Example Subtitle */}
              <p className="text-white/80 font-bold text-xs sm:text-sm mt-1.5 mb-6">
                Ex: @champagnepapi
              </p>

              {/* Handle Input Form */}
              <form onSubmit={handleDone} className="w-full max-w-xs flex flex-col items-center gap-4">
                <div className="w-full bg-white/25 backdrop-blur-md rounded-full px-6 py-3.5 flex items-center justify-center border border-white/30 focus-within:bg-white/35 transition-all shadow-inner">
                  <span className="text-white/70 font-bold text-lg mr-1">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.replace(/[@\s]/g, ''))}
                    placeholder="your_handle"
                    maxLength={30}
                    autoFocus
                    className="w-full bg-transparent text-center font-bold text-white placeholder-white/50 text-lg sm:text-xl outline-none"
                  />
                </div>

                {/* White Pill "Done!" Button */}
                <button
                  id="done-handle-btn"
                  type="submit"
                  disabled={isSubmitting || isLoading}
                  className="w-full bg-white hover:bg-slate-50 text-slate-900 font-black text-lg py-4 px-8 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center cursor-pointer tracking-tight mt-1"
                >
                  {isSubmitting || isLoading ? (
                    <div className="w-6 h-6 border-3 border-slate-900 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Done!</span>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Footer Legal Terms & Privacy Notice */}
      <footer className="w-full max-w-xs text-center z-10 pb-2">
        <p className="text-[11px] leading-relaxed text-white/80 font-medium">
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
      </footer>

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
                className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 cursor-pointer"
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
                  <p>1. Messages sent through NGL are anonymous and stored securely with end-to-end privacy.</p>
                  <p>2. We do not sell your personal data or reveal sender identities to inbox recipients.</p>
                  <p>3. You can clear your messages or delete your profile at any time in the settings.</p>
                </>
              )}
            </div>
            <button
              onClick={() => setLegalModal(null)}
              className="mt-2 bg-black text-white font-black text-xs py-3 rounded-xl hover:bg-slate-800 cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
