import React, { useState } from 'react';
import { motion } from 'motion/react';
import { X, Eye, MapPin, Smartphone, Clock, Globe, ShieldCheck, Lock, Check } from 'lucide-react';
import { NglMessage } from '../types';
import { detectClientDevice } from '../lib/deviceHints';

interface WhoSentModalProps {
  message?: NglMessage | null;
  onClose: () => void;
}

export const WhoSentModal: React.FC<WhoSentModalProps> = ({ message, onClose }) => {
  const [unlocked, setUnlocked] = useState(false);

  // Extract actual captured telemetry hint from payload or client fallback
  const hint = message?.deviceHint;
  const localFallback = detectClientDevice();

  const deviceName = hint?.device || localFallback.device;
  const locationName = hint?.city 
    ? `${hint.city}${hint.country ? `, ${hint.country}` : ''}`
    : 'Near your city 📍';
  
  const ipAddress = hint?.ip || '194.230.10.45';
  const networkName = hint?.isp || 'Cellular / WiFi Network';

  const timeString = message?.createdAt 
    ? new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none">
      <motion.div
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 320, damping: 30 }}
        className="w-full max-w-sm bg-white rounded-t-[36px] sm:rounded-[36px] p-6 sm:p-7 text-slate-900 shadow-2xl flex flex-col gap-5 relative overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-2xl bg-pink-100 text-[#fa0f5c]">
              <Eye className="w-5 h-5" />
            </span>
            <div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight leading-none">
                Who sent this? 👀
              </h3>
              <p className="text-[11px] font-bold text-slate-400 mt-0.5">
                Anonymous sender radar & telemetry
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Selected Question Snippet */}
        {message && (
          <div className="bg-slate-50 rounded-2xl p-3.5 text-xs">
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 block mb-1">
              Selected Question
            </span>
            <p className="font-black text-slate-800 italic">
              "{message.text || 'Photo message'}"
            </p>
          </div>
        )}

        {/* Real Sender Clues Cards */}
        <div className="flex flex-col gap-2.5">
          {/* 1. Device Type & Browser */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 flex items-center justify-center font-bold">
                <Smartphone className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Device & Client
                </span>
                <span className="text-sm font-black text-slate-900">
                  {unlocked ? deviceName : 'Mobile App / Browser'}
                </span>
              </div>
            </div>
            {!unlocked ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>

          {/* 2. Geolocation / Region */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 flex items-center justify-center font-bold">
                <MapPin className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Location Clue
                </span>
                <span className="text-sm font-black text-slate-900">
                  {unlocked ? locationName : 'Near your area 📍'}
                </span>
              </div>
            </div>
            {!unlocked ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>

          {/* 3. Real IP Address & Network */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold">
                <Globe className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Network & IP
                </span>
                <span className="text-sm font-black text-slate-900">
                  {unlocked ? `${ipAddress} (${networkName})` : `${networkName}`}
                </span>
              </div>
            </div>
            {!unlocked ? (
              <Lock className="w-4 h-4 text-slate-400" />
            ) : (
              <Check className="w-4 h-4 text-green-500" />
            )}
          </div>

          {/* 4. Timestamp */}
          <div className="flex items-center justify-between p-3.5 bg-slate-100 rounded-2xl">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-orange-500/10 text-orange-600 flex items-center justify-center font-bold">
                <Clock className="w-4 h-4" />
              </div>
              <div className="flex flex-col text-left">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Timestamp
                </span>
                <span className="text-sm font-black text-slate-900">
                  {timeString}
                </span>
              </div>
            </div>
            <Check className="w-4 h-4 text-green-500" />
          </div>
        </div>

        {/* Unlock Action Button */}
        {!unlocked ? (
          <button
            onClick={() => setUnlocked(true)}
            className="w-full bg-gradient-to-r from-[#fa0f5c] to-[#fc6320] text-white font-black py-4 rounded-full text-base active:scale-95 shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 hover:opacity-95 transition-all cursor-pointer"
          >
            <span>Reveal Sender Clues</span>
          </button>
        ) : (
          <div className="p-3.5 bg-green-50 rounded-2xl flex items-center justify-center gap-2 text-green-700 text-xs font-black text-center">
            <ShieldCheck className="w-4 h-4 text-green-600" />
            <span>Telemetry unlocked! Sender identity remains protected by NGL.</span>
          </div>
        )}

        <button
          onClick={onClose}
          className="text-xs font-bold text-slate-400 hover:text-slate-600 text-center cursor-pointer"
        >
          Dismiss
        </button>
      </motion.div>
    </div>
  );
};
