import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { CARD_GRADIENTS } from '../lib/constants';
import { X, Download, Copy, Check, Camera, Link2 } from 'lucide-react';
import html2canvas from 'html2canvas';

interface StoryShareModalProps {
  profile: UserProfile | null;
  onClose: () => void;
  appUrl: string;
}

export const StoryShareModal: React.FC<StoryShareModalProps> = ({
  profile,
  onClose,
  appUrl
}) => {
  const [selectedGradient, setSelectedGradient] = useState(CARD_GRADIENTS[0]);
  const [isExporting, setIsExporting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const identifier = profile?.username || profile?.shortCode || profile?.id || '';
  const shareableLink = `${window.location.origin}${window.location.pathname}?to=${identifier}`;

  const handleDownloadStory = async () => {
    if (!previewRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(previewRef.current, {
        scale: 3,
        useCORS: true,
        backgroundColor: null,
        logging: false
      });
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `ngl-story-card-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export story card:', err);
      alert('Failed to generate story card.');
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 overflow-y-auto animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm md:max-w-xl bg-slate-900 rounded-[32px] p-5 sm:p-6 flex flex-col md:flex-row md:items-center md:justify-center gap-5 text-white shadow-2xl relative">
        
        {/* Close Button Top Right */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Story Canvas Container */}
        <div className="w-full md:w-1/2 flex justify-center">
          <div
            ref={previewRef}
            className={`w-full max-w-[280px] aspect-[9/14] rounded-[28px] bg-gradient-to-b ${selectedGradient} p-5 flex flex-col items-center justify-between shadow-2xl relative overflow-hidden`}
          >
            {/* Top Logo */}
            <div className="flex flex-col items-center transform -rotate-2">
              <span className="ngl-logo-stroke text-3xl tracking-tighter">
                ngl
              </span>
              <span className="text-[10px] font-black text-white/90 uppercase tracking-widest drop-shadow-sm">
                anonymous q&a
              </span>
            </div>

            {/* Central Card Sticker */}
            <div className="w-full bg-white rounded-[22px] shadow-2xl text-slate-900 flex flex-col overflow-hidden transform rotate-1">
              
              {/* Gradient Top Banner */}
              <div className="bg-gradient-to-r from-[#fa0f5c] via-[#f70a59] to-[#fc6320] px-4 py-3.5 text-center">
                <h3 className="text-sm font-black text-white leading-tight">
                  {profile?.prompt || 'send me anonymous messages!'}
                </h3>
              </div>

              {/* White Body (Only avatar and @username) */}
              <div className="p-3.5 flex flex-col items-center text-center gap-2 bg-white">
                <div className="flex items-center gap-1.5">
                  <div className="w-5 h-5 rounded-full p-[1px] bg-gradient-to-tr from-[#fa0f5c] to-[#fc6320] overflow-hidden">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt={profile.username} className="w-full h-full rounded-full object-cover" />
                    ) : (
                      <div className="w-full h-full rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-[9px]">
                        {profile?.username?.charAt(0).toUpperCase() || 'U'}
                      </div>
                    )}
                  </div>
                  <span className="text-[11px] font-black text-slate-400">
                    @{profile?.username || 'user'}
                  </span>
                </div>

                {/* Tap sticker mock */}
                <div className="w-full bg-slate-100 rounded-full py-1.5 px-3 text-[10px] font-extrabold text-slate-700 flex items-center justify-center gap-1">
                  <Link2 className="w-3 h-3 text-[#fa0f5c]" />
                  <span>tap to answer anonymously</span>
                </div>
              </div>
            </div>

            {/* Spacer for aesthetic vertical balance */}
            <div className="h-4" />
          </div>
        </div>

        {/* Right side controls on wide screens */}
        <div className="w-full md:w-1/2 flex flex-col gap-4">
          {/* Gradient Picker */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Background Color
            </span>
            <div className="flex items-center gap-2 py-1 flex-wrap">
              {CARD_GRADIENTS.map((grad, i) => (
                <button
                  key={i}
                  onClick={() => setSelectedGradient(grad)}
                  className={`w-7 h-7 rounded-full bg-gradient-to-tr ${grad} transition-transform cursor-pointer ${
                    selectedGradient === grad
                      ? 'ring-2 ring-white scale-110 shadow-md'
                      : 'opacity-70 hover:opacity-100'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-2 mt-2">
            <button
              onClick={handleDownloadStory}
              disabled={isExporting}
              className="w-full bg-white text-black font-black py-3 rounded-2xl active:scale-95 shadow-md flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer hover:bg-slate-100"
            >
              {isExporting ? (
                <div className="w-3.5 h-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Camera className="w-3.5 h-3.5 text-[#fa0f5c]" />
                  <span>Save PNG</span>
                </>
              )}
            </button>

            <button
              onClick={handleCopy}
              className="w-full bg-white/10 hover:bg-white/20 text-white font-bold py-3 rounded-2xl active:scale-95 flex items-center justify-center gap-1.5 text-xs transition-all cursor-pointer"
            >
              {copiedLink ? (
                <>
                  <Check className="w-3.5 h-3.5 text-green-400" />
                  <span className="text-green-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
