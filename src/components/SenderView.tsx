import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MediaAttachment } from '../types';
import { NGL_60_TEMPLATES } from '../lib/templates';
import { captureRealDeviceHints } from '../lib/deviceHints';
import { Paperclip, X, Send, CheckCircle2, ArrowRight, Music, Video, FileText, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SenderViewProps {
  recipientProfile: UserProfile;
  onSendMessage: (text: string, file: MediaAttachment | null, deviceHint?: any) => Promise<void>;
  isOwnLink?: boolean;
  onOpenMyInbox?: () => void;
  onGetOwnLink?: () => void;
  appUrl: string;
}

export const SenderView: React.FC<SenderViewProps> = ({
  recipientProfile,
  onSendMessage,
  isOwnLink = false,
  onOpenMyInbox,
  onGetOwnLink,
  appUrl
}) => {
  const [message, setMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<MediaAttachment | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Random placeholder suggestion
  const [placeholderIndex, setPlaceholderIndex] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setPlaceholderIndex((prev) => (prev + 1) % NGL_60_TEMPLATES.length);
    }, 4000);
    return () => clearInterval(timer);
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check size limit: images get compressed; other raw media/docs must fit within Firestore 1MB doc limit
    if (file.type.startsWith('image/')) {
      if (file.size > 25 * 1024 * 1024) {
        alert("Image is too large (max 25MB).");
        return;
      }
      // Compress and resize image so it comfortably fits within Firestore 1MB document limit (<350KB base64)
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (event) => {
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          const maxDimension = 1080;

          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          // Compress to JPEG at 0.78 quality (~80-250KB)
          const compressedDataURL = canvas.toDataURL('image/jpeg', 0.78);
          setSelectedFile({
            name: file.name,
            type: 'image/jpeg',
            size: Math.round((compressedDataURL.length * 3) / 4),
            dataURL: compressedDataURL
          });
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    } else {
      // Audio, Video, PDF, Docs, and other files
      if (file.size > 800 * 1024) {
        alert("Attached audio, video, or file must be under 800KB for direct instant delivery.");
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedFile({
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataURL: event.target?.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && !selectedFile) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Capture actual device telemetry & IP hints
      const deviceHint = await captureRealDeviceHints();

      // Log IP address, time, and device type explicitly on response
      console.log('📬 [NGL Anonymous Response Telemetry Logged]:', {
        ipAddress: deviceHint.ip,
        timestamp: deviceHint.timestamp,
        timeFormatted: new Date(deviceHint.timestamp).toLocaleString(),
        deviceType: deviceHint.device,
        os: deviceHint.os,
        browser: deviceHint.browser,
        screen: deviceHint.screen,
        approxLocation: `${deviceHint.city || 'Unknown City'}, ${deviceHint.country || 'Unknown Country'}`
      });

      await onSendMessage(message.trim(), selectedFile, deviceHint);
      setIsSuccess(true);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setMessage('');
      setSelectedFile(null);
    } catch (err) {
      console.error('Error sending message:', err);
      alert('Failed to send anonymous message. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="w-full max-w-sm mx-auto px-4 py-8 flex flex-col items-center animate-in fade-in zoom-in-95 duration-200 select-none">
        <div className="w-full bg-white rounded-[32px] sm:rounded-[36px] p-8 text-center shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 bg-gradient-to-tr from-[#fa0f5c] to-[#fc6320] rounded-full flex items-center justify-center text-white text-3xl mb-4 shadow-lg shadow-pink-500/30">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <h2 className="text-2xl font-black text-slate-900 mb-1 lowercase tracking-tight">
            sent anonymously!
          </h2>
          <p className="text-slate-500 text-sm font-medium mb-6">
            @{recipientProfile.username} received your message.
          </p>

          <div className="flex flex-col gap-3 w-full">
            <button
              onClick={() => setIsSuccess(false)}
              className="w-full bg-black text-white font-black py-4 rounded-full text-base active:scale-95 shadow-md hover:bg-slate-900 transition-all cursor-pointer"
            >
              Send Another
            </button>

            {isOwnLink && onOpenMyInbox ? (
              <button
                onClick={onOpenMyInbox}
                className="w-full bg-gradient-to-r from-[#fa0f5c] to-[#fc6320] text-white font-black py-4 rounded-full text-base active:scale-95 shadow-lg shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Check My Inbox</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={onGetOwnLink}
                className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3.5 rounded-full text-xs active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Get your own NGL link</span>
              </button>
            )}
          </div>
        </div>

        <p className="text-[11px] font-bold text-white/90 text-center mt-4 drop-shadow-sm">
          Sent with ❤️ from team NGL
        </p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-[350px] sm:max-w-[370px] mx-auto px-4 py-3 sm:py-6 flex flex-col items-center justify-center flex-1 select-none">
      
      {/* Exact NGL Response Card matching attached mockup */}
      <form
        onSubmit={handleSubmit}
        className="w-full bg-white rounded-[32px] sm:rounded-[36px] shadow-2xl flex flex-col overflow-hidden"
      >
        {/* Card Top Gradient Banner */}
        <div className="bg-gradient-to-r from-[#fa0f5c] via-[#ff0055] to-[#ff5100] px-5 py-5 sm:px-6 sm:py-6 flex items-center gap-3.5 relative">
          {/* Circular Avatar with White Border */}
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full p-[2px] bg-white overflow-hidden flex-shrink-0 shadow-md">
            {recipientProfile.photoURL ? (
              <img
                src={recipientProfile.photoURL}
                alt={recipientProfile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              <img
                src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80"
                alt={recipientProfile.username}
                className="w-full h-full rounded-full object-cover"
              />
            )}
          </div>

          {/* Recipient Handle & Prompt */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm sm:text-base font-bold tracking-tight truncate">
              @{recipientProfile.username || 'username'}
            </p>
            <h2 className="text-white font-black text-lg sm:text-xl leading-snug tracking-tight">
              {recipientProfile.prompt || "send me an anonymous message"}
            </h2>
          </div>
        </div>

        {/* Card White Body: Light Gray Inner Input & Attach Button */}
        <div className="p-4 sm:p-5 flex flex-col gap-3 bg-white">
          {/* Inner Light Gray Textarea Area */}
          <div className="bg-[#f4f5f8] rounded-[22px] p-3.5 sm:p-4 flex flex-col justify-between min-h-[150px] relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Waiting for messages..."
              maxLength={500}
              rows={4}
              className="w-full text-base font-bold text-slate-800 placeholder:text-[#a0abbd] placeholder:font-medium bg-transparent border-0 focus:border-0 outline-none focus:outline-none focus:ring-0 shadow-none resize-none p-1 transition-all leading-relaxed"
            />

            {/* Media Attachment Preview inside gray container if chosen */}
            {selectedFile && (
              <div className="relative mt-2 rounded-2xl overflow-hidden bg-white/90 p-2 flex items-center gap-3 shadow-xs">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={selectedFile.dataURL}
                    alt="attachment"
                    className="w-10 h-10 rounded-xl object-cover"
                  />
                ) : selectedFile.type.startsWith('video/') ? (
                  <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs">
                    <Video className="w-5 h-5" />
                  </div>
                ) : selectedFile.type.startsWith('audio/') ? (
                  <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs">
                    <Music className="w-5 h-5" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                    <FileText className="w-5 h-5" />
                  </div>
                )}
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {selectedFile.name}
                  </p>
                  <p className="text-[10px] text-slate-400 font-medium">
                    {(selectedFile.size / 1024).toFixed(0)} KB
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedFile(null)}
                  className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Bottom Card Controls: Exact Attach Pill Button */}
          <div className="flex items-center justify-end pt-1">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-black bg-[#dce2ec] hover:bg-[#cfd7e3] px-4 py-2 rounded-full transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Paperclip className="w-4 h-4 stroke-[2.5] text-black" />
              <span>{selectedFile ? 'Change' : 'Attach'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="*/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </form>

      {/* Big Black Action Pill Button */}
      <button
        type="button"
        onClick={(e) => {
          if (message.trim() || selectedFile) {
            handleSubmit(e);
          } else if (onGetOwnLink) {
            onGetOwnLink();
          } else if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }}
        disabled={isSubmitting}
        className="w-full mt-4 bg-black hover:bg-neutral-900 text-white font-black text-lg sm:text-xl py-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer tracking-tight"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>{message.trim() || selectedFile ? 'Send!' : 'get link!'}</span>
        )}
      </button>

      {/* Character Count below black button */}
      <p className="text-white/80 font-bold text-xs sm:text-sm tracking-wider text-center mt-2.5 mb-6">
        {message.length}/500
      </p>

      {/* Bottom NGL Branding matching mockup */}
      <div className="flex flex-col items-center justify-center mt-1 mb-4">
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
  );
};
