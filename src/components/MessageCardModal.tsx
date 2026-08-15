import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { NglMessage, UserProfile, MediaAttachment } from '../types';
import {
  X,
  AlertTriangle,
  Send,
  Camera,
  Check,
  CornerDownRight,
  Download,
  Trash2,
  Share2,
  ChevronLeft,
  ChevronRight,
  Palette,
  Instagram,
  Music,
  FileText,
  Video
} from 'lucide-react';
import html2canvas from 'html2canvas';
import { WhoSentModal } from './WhoSentModal';

interface MessageCardModalProps {
  message: NglMessage;
  profile: UserProfile | null;
  onClose: () => void;
  onDelete: (id: string) => Promise<void>;
  onReply: (id: string, replyText: string) => Promise<void>;
  onNext?: () => void;
  onPrev?: () => void;
  hasNext: boolean;
  hasPrev: boolean;
  currentIndex: number;
  totalMessages: number;
}

export const MessageCardModal: React.FC<MessageCardModalProps> = ({
  message,
  profile,
  onClose,
  onDelete,
  onReply,
  onNext,
  onPrev,
  hasNext,
  hasPrev,
  currentIndex,
  totalMessages
}) => {
  const [showWhoSent, setShowWhoSent] = useState(false);
  const [showReplySheet, setShowReplySheet] = useState(false);
  const [replyInput, setReplyInput] = useState(message.reply || '');
  const [isSavingReply, setIsSavingReply] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [reportState, setReportState] = useState<'idle' | 'confirm' | 'reported'>('idle');
  const cardRef = useRef<HTMLDivElement>(null);

  const handleSaveReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!replyInput.trim()) return;

    setIsSavingReply(true);
    try {
      await onReply(message.id, replyInput.trim());
      setShowReplySheet(false);
    } catch (err) {
      console.error('Failed to save reply:', err);
    } finally {
      setIsSavingReply(false);
    }
  };

  // Gather all attachments from legacy .file or new .files array
  const allAttachments: MediaAttachment[] = React.useMemo(() => {
    if (message.files && message.files.length > 0) {
      return message.files;
    }
    if (message.file) {
      return [message.file];
    }
    return [];
  }, [message.file, message.files]);

  const handleDownloadSingleAttachment = (attachment: MediaAttachment, e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    try {
      const link = document.createElement('a');
      link.href = attachment.dataURL;
      link.download = attachment.name || `ngl-media-${Date.now()}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to download media attachment:', err);
    }
  };

  const handleDownloadAllMedia = (e?: React.MouseEvent) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    allAttachments.forEach((att, idx) => {
      setTimeout(() => {
        handleDownloadSingleAttachment(att);
      }, idx * 250);
    });
  };

  // Download Story Card as clean PNG, and if media exists, also trigger download of the attached media separately
  const handleDownloadStory = async () => {
    if (!cardRef.current) return;
    setIsExporting(true);
    try {
      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        logging: false
      });
      const dataURL = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `ngl-message-${message.id || Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // If message has media attachments, download each media file separately
      if (allAttachments.length > 0) {
        allAttachments.forEach((att, idx) => {
          setTimeout(() => {
            handleDownloadSingleAttachment(att);
          }, 300 + idx * 250);
        });
      }
    } catch (err) {
      console.error('Failed to export message card as PNG:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleReport = async () => {
    setReportState('reported');
    setTimeout(async () => {
      await onDelete(message.id);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-gradient-to-b from-[#e60067] via-[#fa0f5c] to-[#ff6600] flex flex-col justify-between items-center p-4 sm:p-6 md:p-8 overflow-y-auto select-none">
      
      {/* Top Bar matching Screen 3: [⚠️ Warning]  (● Status Dot)  [✕ Close] */}
      <div className="w-full max-w-sm md:max-w-3xl flex items-center justify-between pt-2 pb-2 text-white">
        <button
          onClick={() => setReportState(reportState === 'idle' ? 'confirm' : 'idle')}
          className="p-2 rounded-full hover:bg-black/20 text-white/90 transition-colors"
          title="Report / Delete Question"
        >
          <AlertTriangle className="w-5 h-5" />
        </button>

        {/* Center Glowing Status Dot */}
        <div className="w-3.5 h-3.5 rounded-full bg-white shadow-md animate-pulse" />

        <button
          onClick={onClose}
          className="p-2 rounded-full hover:bg-black/20 text-white transition-colors"
          title="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Report confirmation banner */}
      {reportState === 'confirm' && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm md:max-w-md bg-white text-red-600 rounded-2xl p-3 mb-2 flex items-center justify-between text-xs font-bold shadow-lg"
        >
          <span>Report & delete this message?</span>
          <div className="flex items-center gap-1">
            <button
              onClick={handleReport}
              className="bg-red-600 text-white px-3 py-1 rounded-lg text-xs font-black hover:bg-red-700 cursor-pointer"
            >
              Report
            </button>
            <button
              onClick={() => setReportState('idle')}
              className="bg-slate-200 text-slate-700 px-2 py-1 rounded-lg text-xs font-bold cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </motion.div>
      )}

      {reportState === 'reported' && (
        <div className="w-full max-w-sm md:max-w-md bg-green-500 text-white rounded-2xl p-3 mb-2 text-center text-xs font-black shadow-lg">
          ✓ Message reported and removed.
        </div>
      )}

      {/* Main Content Area: Responsive landscape distribution on wider screens */}
      <div className="w-full max-w-sm md:max-w-3xl lg:max-w-4xl my-auto flex flex-col md:flex-row md:items-center md:justify-center md:gap-10 lg:gap-14 py-2">
        
        {/* Left (Landscape) / Main Card */}
        <div className="w-full md:w-1/2 max-w-sm mx-auto flex flex-col items-center">
          {/* Previous / Next Quick Controls */}
          <div className="w-full flex items-center justify-between px-2 pb-2 text-[11px] font-extrabold text-white/80">
            <button
              onClick={onPrev}
              disabled={!hasPrev}
              className="flex items-center gap-0.5 disabled:opacity-25 hover:text-white transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Prev</span>
            </button>
            <span>
              {currentIndex + 1} of {totalMessages}
            </span>
            <button
              onClick={onNext}
              disabled={!hasNext}
              className="flex items-center gap-0.5 disabled:opacity-25 hover:text-white transition-colors cursor-pointer"
            >
              <span>Next</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Exportable Story Card Container - Clean PNG export without media inside */}
          <div
            ref={cardRef}
            className="w-full rounded-[32px] sm:rounded-[36px] overflow-hidden bg-white shadow-2xl flex flex-col"
          >
            {/* Top Gradient Banner */}
            <div className="bg-gradient-to-r from-[#fa0f5c] via-[#f70a59] to-[#fc6320] px-6 py-6 sm:py-7 text-center flex flex-col items-center justify-center">
              <h2 className="text-white font-black text-xl sm:text-2xl leading-tight tracking-tight drop-shadow-xs max-w-[260px]">
                {message.promptTitle || profile?.prompt || "Send me an anonymous message"}
              </h2>
            </div>

            {/* Bottom Card Body (White) with Centered Anonymous Question and Reply */}
            <div className="px-6 py-8 sm:py-10 flex flex-col items-center justify-center text-center bg-white min-h-[140px]">
              <p className="text-slate-900 font-black text-xl sm:text-2xl leading-snug tracking-tight break-words max-w-[280px]">
                {message.text || "Anonymous"}
              </p>

              {/* Response preview if user has answered */}
              {message.reply && (
                <div className="w-full mt-4 bg-slate-100 rounded-2xl p-3.5 text-left flex flex-col gap-1">
                  <span className="text-[#fa0f5c] text-[10px] font-black uppercase tracking-wider flex items-center gap-1">
                    <CornerDownRight className="w-3 h-3" />
                    <span>@{profile?.username} replied:</span>
                  </span>
                  <p className="text-sm font-extrabold text-slate-800">
                    "{message.reply}"
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Attached Media Section (Rendered separately from the PNG Story Card) */}
          {allAttachments.length > 0 && (
            <div className="w-full mt-4 bg-black/25 backdrop-blur-md rounded-2xl p-3 sm:p-4 flex flex-col gap-2.5 text-white border border-white/20">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-black uppercase tracking-wider text-white/90">
                  Attached Media ({allAttachments.length})
                </span>
                {allAttachments.length > 1 && (
                  <button
                    type="button"
                    onClick={handleDownloadAllMedia}
                    className="text-xs font-black text-white hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <Download className="w-3 h-3" />
                    <span>Download All</span>
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {allAttachments.map((att, idx) => (
                  <div
                    key={att.id || idx}
                    className="bg-white/10 rounded-xl p-2 sm:p-2.5 flex items-center justify-between gap-3 border border-white/10"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      {att.type.startsWith('image/') ? (
                        <img
                          src={att.dataURL}
                          alt={att.name}
                          className="w-10 h-10 rounded-lg object-cover bg-black/40 shrink-0"
                        />
                      ) : att.type.startsWith('video/') ? (
                        <div className="w-10 h-10 rounded-lg bg-purple-500/30 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <Video className="w-5 h-5" />
                        </div>
                      ) : att.type.startsWith('audio/') ? (
                        <div className="w-10 h-10 rounded-lg bg-amber-500/30 text-amber-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <Music className="w-5 h-5" />
                        </div>
                      ) : (
                        <div className="w-10 h-10 rounded-lg bg-blue-500/30 text-blue-300 flex items-center justify-center font-bold text-xs shrink-0">
                          <FileText className="w-5 h-5" />
                        </div>
                      )}
                      
                      <div className="text-left min-w-0">
                        <p className="text-xs font-bold text-white truncate max-w-[140px] sm:max-w-[180px]">
                          {att.name}
                        </p>
                        <p className="text-[10px] text-white/70">
                          {(att.size / 1024).toFixed(0)} KB
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDownloadSingleAttachment(att, e)}
                      className="px-3 py-1.5 rounded-full bg-white text-slate-900 hover:bg-slate-100 font-extrabold text-xs flex items-center gap-1.5 transition-all active:scale-95 shadow-md cursor-pointer shrink-0"
                      title="Download media separately"
                    >
                      <Download className="w-3.5 h-3.5 text-[#fa0f5c]" />
                      <span>Download</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Decorative Tools */}
          <div className="flex items-center justify-center gap-4 mt-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-yellow-400 via-pink-500 to-cyan-400 p-[2px] shadow-md flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-full flex items-center justify-center">
                <Palette className="w-3.5 h-3.5 text-slate-700" />
              </div>
            </div>
            <div
              onClick={handleDownloadStory}
              className="w-8 h-8 rounded-full bg-white/30 backdrop-blur-md shadow-md flex items-center justify-center cursor-pointer hover:scale-105 transition-transform"
              title="Save as PNG"
            >
              <Camera className="w-4 h-4 text-white" />
            </div>
          </div>

          {/* Attribution Subtitle */}
          <p className="text-[11px] font-bold text-white/90 text-center mt-2 drop-shadow-sm">
            Sent with ❤️ from team NGL
          </p>
        </div>

        {/* Right (Landscape) / Action Buttons */}
        <div className="w-full md:w-1/2 max-w-sm mx-auto flex flex-col gap-3.5 pt-4 md:pt-0 z-10 my-auto">
          
          {/* Quick Message Info card in landscape */}
          <div className="hidden md:flex flex-col p-4 rounded-2xl bg-black/25 backdrop-blur-md text-white text-xs">
            <span className="font-extrabold text-white/70 uppercase text-[10px] tracking-wider mb-1">
              Message Insights
            </span>
            <p className="font-medium text-white/90">
              Received anonymously via your link. You can unlock hint clues or craft a reply to export to your Instagram story!
            </p>
          </div>

          {/* 1. Who sent this 👀 Button */}
          <button
            onClick={() => setShowWhoSent(true)}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-black text-base py-3.5 rounded-full shadow-lg active:scale-95 transition-all text-center flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <span>Who sent this 👀</span>
          </button>

          {/* 2. Solid Black "reply" Button with Instagram icon */}
          <button
            onClick={() => setShowReplySheet(true)}
            className="w-full bg-black hover:bg-slate-900 text-white font-black text-lg py-4 rounded-full shadow-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
          >
            <Instagram className="w-5 h-5" />
            <span>reply</span>
          </button>

          {/* 3. Save as PNG button */}
          <button
            onClick={handleDownloadStory}
            disabled={isExporting}
            className="w-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white font-black text-sm py-3.5 rounded-full active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md"
          >
            {isExporting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Saving PNG...</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                <span>Save as PNG</span>
              </>
            )}
          </button>
        </div>

      </div>

      {/* Who Sent This Clues Sheet / Modal */}
      {showWhoSent && (
        <WhoSentModal
          message={message}
          onClose={() => setShowWhoSent(false)}
        />
      )}

      {/* Reply Composer Sheet */}
      <AnimatePresence>
        {showReplySheet && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4">
            <motion.div
              initial={{ y: 200, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 200, opacity: 0 }}
              transition={{ type: 'spring', stiffness: 320, damping: 30 }}
              className="w-full max-w-md bg-white rounded-t-[32px] sm:rounded-[32px] p-6 text-slate-900 shadow-2xl flex flex-col gap-4 border border-white/60"
            >
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <h3 className="text-xl font-black text-slate-900 tracking-tight">
                    Reply & Share to Story
                  </h3>
                  <p className="text-xs text-slate-400 font-bold">
                    Type your answer to export to Instagram Story
                  </p>
                </div>
                <button
                  onClick={() => setShowReplySheet(false)}
                  className="p-1.5 rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Question preview */}
              <div className="p-3 bg-slate-100 rounded-2xl text-xs font-extrabold text-slate-700 italic">
                "{message.text}"
              </div>

              <form onSubmit={handleSaveReply} className="flex flex-col gap-3">
                <textarea
                  autoFocus
                  value={replyInput}
                  onChange={(e) => setReplyInput(e.target.value)}
                  placeholder="Type your reply..."
                  maxLength={240}
                  rows={3}
                  className="w-full bg-slate-100 rounded-2xl p-4 text-base font-extrabold text-slate-900 placeholder:text-slate-400 border-none outline-none focus:ring-2 focus:ring-[#fa0f5c] resize-none"
                />

                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={isSavingReply || !replyInput.trim()}
                    className="flex-1 bg-black hover:bg-slate-900 text-white font-black text-base py-3.5 rounded-2xl active:scale-95 transition-all flex items-center justify-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    {isSavingReply ? 'Saving...' : 'Save Reply'}
                  </button>

                  <button
                    type="button"
                    onClick={handleDownloadStory}
                    disabled={isExporting}
                    className="flex-1 bg-gradient-to-r from-[#fa0f5c] to-[#fc6320] text-white font-black text-base py-3.5 rounded-2xl active:scale-95 shadow-md hover:opacity-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    {isExporting ? (
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <Download className="w-4 h-4" />
                        <span>Save as PNG</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
};
