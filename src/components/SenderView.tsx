import React, { useState, useEffect, useRef } from 'react';
import { UserProfile, MediaAttachment } from '../types';
import { NGL_60_TEMPLATES } from '../lib/templates';
import { captureRealDeviceHints } from '../lib/deviceHints';
import { Paperclip, X, Send, CheckCircle2, ArrowRight, Music, Video, FileText, Image as ImageIcon } from 'lucide-react';
import confetti from 'canvas-confetti';

interface SenderViewProps {
  recipientProfile: UserProfile;
  onSendMessage: (text: string, file: MediaAttachment | null, deviceHint?: any, files?: MediaAttachment[]) => Promise<void>;
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
  const [selectedFiles, setSelectedFiles] = useState<MediaAttachment[]>([]);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingFiles, setIsProcessingFiles] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Helper to compress an image client-side to ensure fast transmission and fit Firestore limits
  const compressImage = (file: File): Promise<MediaAttachment> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      const reader = new FileReader();
      reader.onload = (event) => {
        img.onload = () => {
          try {
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

            // Compress to JPEG at 0.76 quality (~60-180KB per image)
            const compressedDataURL = canvas.toDataURL('image/jpeg', 0.76);
            resolve({
              id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
              name: file.name,
              type: 'image/jpeg',
              size: Math.round((compressedDataURL.length * 3) / 4),
              dataURL: compressedDataURL
            });
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = () => reject(new Error(`Failed to load image: ${file.name}`));
        img.src = event.target?.result as string;
      };
      reader.onerror = () => reject(new Error(`Could not read file: ${file.name}`));
      reader.readAsDataURL(file);
    });
  };

  // Helper to read other media (audio, video, PDF, documents)
  const processGenericFile = (file: File): Promise<MediaAttachment> => {
    return new Promise((resolve, reject) => {
      // Check file size: Firestore has a 1MB payload ceiling
      if (file.size > 850 * 1024) {
        reject(new Error(`"${file.name}" is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Non-image files must be under 850KB.`));
        return;
      }
      const reader = new FileReader();
      reader.onload = (event) => {
        resolve({
          id: `${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
          name: file.name,
          type: file.type || 'application/octet-stream',
          size: file.size,
          dataURL: event.target?.result as string
        });
      };
      reader.onerror = () => reject(new Error(`Could not read file "${file.name}"`));
      reader.readAsDataURL(file);
    });
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawFiles: File[] = e.target.files ? Array.from(e.target.files) : [];
    if (rawFiles.length === 0) return;

    setUploadError(null);
    setIsProcessingFiles(true);

    const newAttachments: MediaAttachment[] = [];
    const errors: string[] = [];

    for (const file of rawFiles) {
      try {
        if (file.type.startsWith('image/')) {
          if (file.size > 30 * 1024 * 1024) {
            errors.push(`"${file.name}" exceeds 30MB maximum limit.`);
            continue;
          }
          const attachment = await compressImage(file);
          newAttachments.push(attachment);
        } else {
          const attachment = await processGenericFile(file);
          newAttachments.push(attachment);
        }
      } catch (err: any) {
        errors.push(err.message || `Failed to process ${file.name}`);
      }
    }

    if (errors.length > 0) {
      setUploadError(errors.join(' • '));
    }

    if (newAttachments.length > 0) {
      setSelectedFiles((prev) => [...prev, ...newAttachments]);
    }

    setIsProcessingFiles(false);
    // Reset file input so user can attach more of the same files if needed
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveFile = (fileIdOrIndex: string | number) => {
    setSelectedFiles((prev) =>
      prev.filter((f, idx) => (f.id ? f.id !== fileIdOrIndex : idx !== fileIdOrIndex))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim() && selectedFiles.length === 0) {
      return;
    }

    setIsSubmitting(true);
    setUploadError(null);

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
        approxLocation: `${deviceHint.city || 'Unknown City'}, ${deviceHint.country || 'Unknown Country'}`,
        attachedFilesCount: selectedFiles.length
      });

      const primaryFile = selectedFiles.length > 0 ? selectedFiles[0] : null;
      await onSendMessage(message.trim(), primaryFile, deviceHint, selectedFiles);
      setIsSuccess(true);
      
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 }
      });

      setMessage('');
      setSelectedFiles([]);
    } catch (err: any) {
      console.error('Error sending message:', err);
      setUploadError('Failed to send anonymous message. If your attachments are large, try attaching fewer files.');
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
              <div className="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-white font-black text-xl sm:text-2xl">
                {recipientProfile.username ? recipientProfile.username.charAt(0).toUpperCase() : 'U'}
              </div>
            )}
          </div>

          {/* Recipient Handle & Prompt */}
          <div className="flex-1 min-w-0 text-left">
            <p className="text-white text-sm sm:text-base font-bold tracking-tight truncate">
              @{recipientProfile.username || 'username'}
            </p>
            <h2 className="text-white font-black text-lg sm:text-xl leading-snug tracking-tight">
              {recipientProfile.prompt || "Send me an anonymous message"}
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

            {/* Loading Indicator when compressing files */}
            {isProcessingFiles && (
              <div className="flex items-center gap-2 text-xs font-bold text-[#fa0f5c] animate-pulse py-1">
                <div className="w-3.5 h-3.5 border-2 border-[#fa0f5c] border-t-transparent rounded-full animate-spin" />
                <span>Processing media files...</span>
              </div>
            )}

            {/* Error Message for invalid or oversized attachments */}
            {uploadError && (
              <div className="w-full bg-red-50 border border-red-100 rounded-xl p-2.5 text-[11px] font-bold text-red-600 flex items-start gap-1.5 animate-in fade-in">
                <span className="shrink-0">⚠️</span>
                <span>{uploadError}</span>
              </div>
            )}

            {/* Multi-Media Attachments Grid/List Preview */}
            {selectedFiles.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-2 max-h-44 overflow-y-auto pr-1">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[10px] font-black uppercase text-slate-400">
                    Attached Files ({selectedFiles.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => setSelectedFiles([])}
                    className="text-[10px] font-bold text-red-500 hover:underline cursor-pointer"
                  >
                    Clear All
                  </button>
                </div>
                
                <div className="grid grid-cols-1 gap-1.5">
                  {selectedFiles.map((fileItem, idx) => (
                    <div
                      key={fileItem.id || idx}
                      className="relative rounded-2xl overflow-hidden bg-white/95 p-2 flex items-center gap-3 shadow-xs border border-slate-100"
                    >
                      {fileItem.type.startsWith('image/') ? (
                        <img
                          src={fileItem.dataURL}
                          alt={fileItem.name}
                          className="w-10 h-10 rounded-xl object-cover shrink-0"
                        />
                      ) : fileItem.type.startsWith('video/') ? (
                        <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                      ) : fileItem.type.startsWith('audio/') ? (
                        <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <Music className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-xs font-bold text-slate-800 truncate">
                          {fileItem.name}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium">
                          {(fileItem.size / 1024).toFixed(0)} KB
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleRemoveFile(fileItem.id || idx)}
                        className="p-1.5 rounded-full bg-slate-100 hover:bg-red-100 hover:text-red-600 transition-colors cursor-pointer shrink-0"
                        title="Remove attachment"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Bottom Card Controls: Exact Attach Pill Button supporting multiple files */}
          <div className="flex items-center justify-between pt-1 px-1">
            <span className="text-[11px] font-bold text-slate-400">
              {selectedFiles.length > 0 ? `${selectedFiles.length} file(s) attached` : 'Attach images, audio & files'}
            </span>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 text-xs sm:text-sm font-extrabold text-black bg-[#dce2ec] hover:bg-[#cfd7e3] px-4 py-2 rounded-full transition-all active:scale-95 shadow-xs cursor-pointer"
            >
              <Paperclip className="w-4 h-4 stroke-[2.5] text-black" />
              <span>{selectedFiles.length > 0 ? 'Add More' : 'Attach'}</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
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
          if (message.trim() || selectedFiles.length > 0) {
            handleSubmit(e);
          } else if (onGetOwnLink) {
            onGetOwnLink();
          } else if (textareaRef.current) {
            textareaRef.current.focus();
          }
        }}
        disabled={isSubmitting || isProcessingFiles}
        className="w-full mt-4 bg-black hover:bg-neutral-900 text-white font-black text-lg sm:text-xl py-4 rounded-full shadow-2xl active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer tracking-tight disabled:opacity-50"
      >
        {isSubmitting ? (
          <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
        ) : (
          <span>{message.trim() || selectedFiles.length > 0 ? 'Send!' : 'get link!'}</span>
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
