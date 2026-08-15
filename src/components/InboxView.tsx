import React, { useState } from 'react';
import { UserProfile, NglMessage } from '../types';
import { ChevronRight, Copy, Check, MessageSquare, Eye, Camera, CornerDownRight, Instagram, Download, Music, FileText } from 'lucide-react';
import { WhoSentModal } from './WhoSentModal';

interface InboxViewProps {
  profile: UserProfile | null;
  messages: NglMessage[];
  unreadCount: number;
  onSelectMessage: (message: NglMessage) => void;
  onOpenProfile: () => void;
  onOpenStoryShare: () => void;
  onCopyLink: () => void;
  copied: boolean;
  appUrl: string;
}

export const InboxView: React.FC<InboxViewProps> = ({
  profile,
  messages,
  unreadCount,
  onSelectMessage,
  onOpenProfile,
  onOpenStoryShare,
  onCopyLink,
  copied,
  appUrl
}) => {
  const [showWhoSentAll, setShowWhoSentAll] = useState(false);
  const [hoveredMessage, setHoveredMessage] = useState<NglMessage | null>(null);

  const activeSpotlightMessage = hoveredMessage || messages[0] || null;

  const formatRelativeTime = (timestamp: number) => {
    if (!timestamp) return 'recently';
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours === 1) return '1h ago';
    if (hours < 24) return `${hours}h ago`;
    if (days === 1) return '1d ago';
    if (days < 7) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  return (
    <div className="w-full max-w-md md:max-w-4xl lg:max-w-5xl mx-auto px-4 sm:px-6 md:px-8 py-2 flex flex-col md:flex-row md:items-start md:justify-center md:gap-8 flex-1 select-none relative min-h-[calc(100vh-100px)]">
      
      {/* Left Column: Messages List Card */}
      <div className="w-full md:w-1/2 flex flex-col justify-between">
        <div className="w-full flex flex-col divide-y divide-slate-100/90 bg-white rounded-[32px] sm:rounded-[36px] overflow-hidden shadow-2xl">
          
          {/* Header bar on wider screens */}
          <div className="px-6 py-4 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-black text-slate-900">Your Inbox</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-[#fa0f5c] text-white text-[10px] font-black">
                  {unreadCount} new
                </span>
              )}
            </div>
            <span className="text-xs font-bold text-slate-400">
              {messages.length} {messages.length === 1 ? 'message' : 'messages'}
            </span>
          </div>

          {messages.length === 0 ? (
            <div className="py-16 px-6 text-center flex flex-col items-center justify-center gap-3">
              <div className="w-16 h-16 rounded-full bg-pink-50 flex items-center justify-center text-3xl shadow-inner">
                💌
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Inbox is empty
              </h3>
              <p className="text-xs text-slate-400 font-semibold max-w-xs leading-relaxed">
                Share your custom link on Instagram stories or Snapchat to receive anonymous questions!
              </p>
              <button
                onClick={onCopyLink}
                className="mt-3 bg-black hover:bg-slate-900 text-white font-black text-xs py-3 px-6 rounded-full active:scale-95 shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                {copied ? <Check className="w-4 h-4 text-green-400" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Link Copied!' : 'Copy Link'}</span>
              </button>
            </div>
          ) : (
            <div className="max-h-[520px] overflow-y-auto divide-y divide-slate-100">
              {messages.map((msg) => {
                const isUnread = !msg.read;
                const isSpotlight = activeSpotlightMessage?.id === msg.id;

                return (
                  <div
                    key={msg.id}
                    onClick={() => onSelectMessage(msg)}
                    onMouseEnter={() => setHoveredMessage(msg)}
                    className={`group flex items-center justify-between p-4 sm:p-4.5 hover:bg-pink-50/50 active:bg-pink-100/50 transition-colors cursor-pointer ${
                      isSpotlight ? 'bg-pink-50/30' : ''
                    }`}
                  >
                    {/* Left: Envelope with Pink Heart Badge */}
                    <div className="flex items-center gap-3.5 min-w-0 pr-2">
                      <div className="relative w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition-transform shadow-xs">
                        <span>💌</span>
                        {isUnread && (
                          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-[#fa0f5c] ring-2 ring-white" />
                        )}
                      </div>

                      {/* Middle: Question Text and Timestamp */}
                      <div className="flex flex-col min-w-0 text-left">
                        <p className="text-slate-900 font-extrabold text-sm sm:text-base leading-snug truncate">
                          {msg.text || ((msg.files && msg.files.length > 0) || msg.file ? `📷 ${msg.files?.length || 1} Media File(s) Attached` : "Anonymous Question")}
                        </p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs font-semibold text-slate-400">
                            {formatRelativeTime(msg.createdAt)}
                          </span>
                          {msg.reply && (
                            <span className="text-[10px] font-bold text-green-600 bg-green-50 px-1.5 py-0.2 rounded-md">
                              Replied
                            </span>
                          )}
                          {((msg.files && msg.files.length > 0) || msg.file) && (
                            <span className="text-[10px] font-bold text-[#fa0f5c] bg-pink-50 px-1.5 py-0.2 rounded-md">
                              📎 {msg.files?.length || 1} file(s)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Chevron */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-slate-600 transition-colors" />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Floating Bottom Button for Mobile */}
        {messages.length > 0 && (
          <div className="mt-4 md:hidden w-full flex justify-center pb-6">
            <button
              onClick={() => setShowWhoSentAll(true)}
              className="w-full max-w-xs bg-black hover:bg-slate-900 text-white font-black text-base sm:text-lg py-4 px-6 rounded-full shadow-2xl active:scale-95 transition-all text-center flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>Who sent these?</span>
            </button>
          </div>
        )}
      </div>

      {/* Right Column for Wide/Landscape Screens: Interactive Spotlight Preview */}
      <div className="hidden md:flex md:w-1/2 flex-col gap-4 sticky top-20">
        {activeSpotlightMessage && (
          <div className="w-full max-w-sm mx-auto flex flex-col items-center">
            
            {/* Dual-Tone Card Preview */}
            <div className="w-full bg-white rounded-[32px] shadow-2xl overflow-hidden">
              <div className="bg-gradient-to-r from-[#fa0f5c] via-[#f70a59] to-[#fc6320] px-6 py-5 text-center">
                <h3 className="text-white font-black text-lg leading-tight tracking-tight">
                  {activeSpotlightMessage.promptTitle || profile?.prompt || "send me anonymous messages!"}
                </h3>
              </div>
              <div className="p-6 bg-white flex flex-col items-center justify-center text-center min-h-[140px]">
                <p className="text-slate-900 font-black text-xl leading-snug">
                  "{activeSpotlightMessage.text || (activeSpotlightMessage.file ? '📷 Media Attached' : 'Anonymous Message')}"
                </p>

                {/* Media preview if attached */}
                {activeSpotlightMessage.file && (
                  <div className="w-full mt-3 rounded-2xl overflow-hidden relative group/spotlight">
                    {activeSpotlightMessage.file.type.startsWith('image/') ? (
                      <div className="relative rounded-2xl overflow-hidden bg-slate-100 flex items-center justify-center">
                        <img
                          src={activeSpotlightMessage.file.dataURL}
                          alt={activeSpotlightMessage.file.name}
                          className="w-full max-h-48 object-contain rounded-2xl"
                        />
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover/spotlight:opacity-100 transition-opacity flex items-center justify-center gap-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              if (!activeSpotlightMessage.file) return;
                              const link = document.createElement('a');
                              link.href = activeSpotlightMessage.file.dataURL;
                              link.download = activeSpotlightMessage.file.name || 'ngl-attachment';
                              document.body.appendChild(link);
                              link.click();
                              document.body.removeChild(link);
                            }}
                            className="px-3.5 py-1.5 bg-white text-slate-900 rounded-full font-black text-xs shadow-lg flex items-center gap-1.5 hover:scale-105 active:scale-95 transition-all cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5 text-[#fa0f5c]" />
                            <span>Download</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="w-full bg-slate-100 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-700 truncate">
                          {activeSpotlightMessage.file.type.startsWith('audio/') ? (
                            <Music className="w-4 h-4 text-[#fa0f5c]" />
                          ) : (
                            <FileText className="w-4 h-4 text-[#fa0f5c]" />
                          )}
                          <span className="truncate">{activeSpotlightMessage.file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (!activeSpotlightMessage.file) return;
                            const link = document.createElement('a');
                            link.href = activeSpotlightMessage.file.dataURL;
                            link.download = activeSpotlightMessage.file.name || 'ngl-attachment';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                          }}
                          className="p-1.5 bg-white rounded-lg text-slate-700 hover:text-black shadow-xs cursor-pointer"
                          title="Download attachment"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {activeSpotlightMessage.reply && (
                  <div className="w-full mt-3 p-3 bg-slate-50 rounded-xl text-left text-xs font-bold text-slate-700">
                    <span className="text-[#fa0f5c] text-[10px] uppercase font-black block mb-0.5">
                      Your response:
                    </span>
                    {activeSpotlightMessage.reply}
                  </div>
                )}
              </div>
            </div>

            {/* Quick Actions in Landscape */}
            <div className="w-full flex flex-col gap-2.5 mt-4">
              <button
                onClick={() => onSelectMessage(activeSpotlightMessage)}
                className="w-full bg-black hover:bg-slate-900 text-white font-black text-base py-3.5 rounded-full shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Instagram className="w-4 h-4" />
                <span>Open & Reply</span>
              </button>

              <button
                onClick={() => setShowWhoSentAll(true)}
                className="w-full bg-white/25 hover:bg-white/35 backdrop-blur-md text-white font-black text-sm py-3 rounded-full shadow-sm active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Eye className="w-4 h-4 text-cyan-300" />
                <span>Who sent this? 👀</span>
              </button>
            </div>

          </div>
        )}
      </div>

      {/* Who Sent These Modal */}
      {showWhoSentAll && (
        <WhoSentModal
          message={activeSpotlightMessage || messages[0] || null}
          onClose={() => setShowWhoSentAll(false)}
        />
      )}
    </div>
  );
};
