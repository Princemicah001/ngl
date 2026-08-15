import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Camera, X, Trash2, ShieldCheck, Check } from 'lucide-react';

interface LandingViewProps {
  onGetStarted: (username: string, photoURL?: string) => Promise<void>;
  isLoading?: boolean;
}

export const LandingView: React.FC<LandingViewProps> = ({
  onGetStarted,
  isLoading = false
}) => {
  const [usernameInput, setUsernameInput] = useState('');
  const [photoURL, setPhotoURL] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [legalModal, setLegalModal] = useState<'terms' | 'privacy' | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 8 * 1024 * 1024) {
      alert("Image is too large (max 8MB).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        setPhotoURL(event.target.result as string);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    const handle = usernameInput.trim().toLowerCase().replace(/[@\s]/g, '') || `ngl_user${Math.floor(Math.random() * 9000 + 1000)}`;
    setIsSubmitting(true);
    try {
      await onGetStarted(handle, photoURL);
    } catch (err) {
      console.error('Failed to start:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-between items-center px-4 sm:px-6 py-6 bg-gradient-to-b from-[#f70a59] via-[#fa0f5c] to-[#ff6200] relative overflow-y-auto select-none text-white">
      
      {/* Background subtle ambient glows */}
      <div className="absolute -top-24 -left-24 w-72 h-72 bg-pink-400/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-orange-400/25 rounded-full blur-3xl pointer-events-none" />

      {/* Top Spacer / Status badge */}
      <div className="w-full max-w-sm flex justify-end">
        <div className="flex items-center gap-1.5 bg-black/20 backdrop-blur-md px-3 py-1 rounded-full text-[11px] font-bold text-white/90 border border-white/10">
          <span className="w-2 h-2 rounded-full bg-amber-300 animate-pulse" />
          <span className="font-extrabold uppercase tracking-wider text-amber-200">👑 Premium</span>
        </div>
      </div>

      {/* Center Setup Profile Card matching attached mockup */}
      <div className="w-full max-w-[340px] sm:max-w-[360px] flex flex-col items-center justify-center my-auto pt-2 pb-4">
        
        {/* The White Profile Setup Card */}
        <motion.div
          initial={{ scale: 0.95, opacity: 0, y: 15 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="w-full bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl overflow-hidden flex flex-col"
        >
          {/* Card Gradient Header: "setup your profile" */}
          <div className="bg-gradient-to-r from-[#fa0f5c] via-[#ff0055] to-[#ff5100] px-6 py-5 sm:py-6 text-center">
            <h1 className="text-white font-black text-2xl sm:text-[26px] leading-tight tracking-tight drop-shadow-sm">
              setup your profile
            </h1>
          </div>

          {/* Card Body */}
          <div className="p-6 sm:p-7 flex flex-col items-center bg-white text-slate-900">
            
            {/* Dashed Circular Avatar Picker */}
            <div className="flex flex-col items-center gap-2 mb-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className={`relative w-24 h-24 rounded-full border-2 border-dashed flex items-center justify-center cursor-pointer transition-all hover:scale-105 active:scale-95 overflow-hidden ${
                  photoURL ? 'border-transparent ring-2 ring-[#fa0f5c]' : 'border-slate-300 bg-slate-50/70 hover:bg-slate-100'
                }`}
                title="Click to add photo"
              >
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Profile"
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-slate-400">
                    <Camera className="w-7 h-7 text-slate-400 stroke-[1.75]" />
                  </div>
                )}

                {/* Hidden File Input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoUpload}
                  className="hidden"
                />
              </div>

              {/* Photo Label / Remove Button */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="text-xs sm:text-sm font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  {photoURL ? 'change photo' : 'add a photo'}
                </button>
                {photoURL && (
                  <button
                    type="button"
                    onClick={() => setPhotoURL('')}
                    className="text-xs font-bold text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                    title="Remove photo"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            {/* Input Form */}
            <form onSubmit={handleSubmitProfile} className="w-full flex flex-col gap-3">
              
              {/* Instagram Handle Input (Doubles as Display Identity) */}
              <div className="w-full flex flex-col gap-1 text-left">
                <label className="text-[11px] font-extrabold uppercase tracking-wider text-slate-400 pl-2">
                  Instagram Handle
                </label>
                <div className="w-full bg-[#f6f7fa] rounded-2xl px-4 py-3.5 flex items-center border border-slate-100 focus-within:border-slate-300 focus-within:bg-white transition-all">
                  <span className="text-slate-400 font-bold text-base mr-1">@</span>
                  <input
                    type="text"
                    value={usernameInput}
                    onChange={(e) => setUsernameInput(e.target.value.replace(/[@\s]/g, ''))}
                    placeholder="username"
                    maxLength={30}
                    autoFocus
                    className="w-full bg-transparent text-center font-bold text-slate-800 placeholder:text-slate-300 placeholder:font-medium outline-none text-base sm:text-lg -ml-3"
                  />
                </div>
              </div>
            </form>
          </div>
        </motion.div>

        {/* Big Black "get link!" Pill Button matching mockup */}
        <button
          id="get-link-btn"
          type="button"
          onClick={handleSubmitProfile}
          disabled={isSubmitting || isLoading}
          className="w-full mt-4 bg-black hover:bg-neutral-900 text-white font-black text-lg sm:text-xl py-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer tracking-tight"
        >
          {isSubmitting || isLoading ? (
            <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <span>get link!</span>
          )}
        </button>

        {/* Bottom NGL Logo & anonymous q&a matching mockup */}
        <div className="flex flex-col items-center justify-center mt-6 mb-2">
          <img
            src="https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png"
            alt="NGL"
            className="h-10 sm:h-12 w-auto object-contain drop-shadow-md"
          />
          <span className="text-white font-black text-xs sm:text-sm tracking-wide mt-1 drop-shadow-sm">
            anonymous q&a
          </span>
        </div>

      </div>

      {/* Footer Legal Links */}
      <div className="w-full max-w-xs text-center pb-2">
        <p className="text-[11px] leading-relaxed text-white/80 font-medium">
          By continuing, you agree to our{' '}
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="underline font-bold hover:text-white cursor-pointer"
          >
            Terms
          </button>{' '}
          and{' '}
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="underline font-bold hover:text-white cursor-pointer"
          >
            Privacy
          </button>
        </p>
      </div>

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
