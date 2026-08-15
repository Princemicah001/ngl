import React, { useState } from 'react';
import { UserProfile } from '../types';
import { X, UserPlus, LogOut, Check, ArrowRight, Shield } from 'lucide-react';

interface SavedAccount {
  username: string;
  photoURL?: string;
  lastActive: number;
}

interface SwitchAccountModalProps {
  currentProfile: UserProfile | null;
  onClose: () => void;
  onSwitchAccount: (username: string, photoURL?: string) => Promise<void>;
  onSignOut: () => void;
}

export const SwitchAccountModal: React.FC<SwitchAccountModalProps> = ({
  currentProfile,
  onClose,
  onSwitchAccount,
  onSignOut
}) => {
  const [newUsername, setNewUsername] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load saved accounts list from localStorage
  const [savedAccounts, setSavedAccounts] = useState<SavedAccount[]>(() => {
    try {
      const raw = localStorage.getItem('ngl_saved_accounts');
      if (raw) {
        return JSON.parse(raw);
      }
    } catch (e) {
      console.warn('Failed to parse saved accounts:', e);
    }
    // Fallback: seed current profile if exists
    if (currentProfile?.username) {
      return [{
        username: currentProfile.username,
        photoURL: currentProfile.photoURL,
        lastActive: Date.now()
      }];
    }
    return [];
  });

  const handleSelectAccount = async (acc: SavedAccount) => {
    if (acc.username === currentProfile?.username) {
      onClose();
      return;
    }
    setIsLoading(true);
    try {
      await onSwitchAccount(acc.username, acc.photoURL);
      onClose();
    } catch (e) {
      console.error('Failed to switch account:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNewAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = newUsername.trim().toLowerCase().replace(/[@\s]/g, '');
    if (!clean) return;

    setIsLoading(true);
    try {
      await onSwitchAccount(clean);
      onClose();
    } catch (e) {
      console.error('Failed to add and switch account:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveAccount = (e: React.MouseEvent, usernameToRemove: string) => {
    e.stopPropagation();
    const updated = savedAccounts.filter(a => a.username !== usernameToRemove);
    setSavedAccounts(updated);
    localStorage.setItem('ngl_saved_accounts', JSON.stringify(updated));
    if (currentProfile?.username === usernameToRemove) {
      onSignOut();
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-end sm:items-center justify-center p-0 sm:p-4 select-none animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white rounded-t-[36px] sm:rounded-[36px] p-6 text-slate-900 shadow-2xl flex flex-col gap-5 border border-white/50">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Switch Account
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Existing Accounts List */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto">
          {savedAccounts.map((acc) => {
            const isCurrent = acc.username === currentProfile?.username;
            return (
              <div
                key={acc.username}
                onClick={() => handleSelectAccount(acc)}
                className={`w-full p-3 rounded-2xl flex items-center justify-between transition-all cursor-pointer border ${
                  isCurrent
                    ? 'bg-pink-50/60 border-[#fa0f5c]/30 shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-100'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-11 h-11 rounded-full overflow-hidden bg-gradient-to-tr from-[#fa0f5c] to-[#ff6200] p-0.5 shrink-0">
                    <div className="w-full h-full rounded-full bg-slate-100 flex items-center justify-center overflow-hidden">
                      {acc.photoURL ? (
                        <img
                          src={acc.photoURL}
                          alt={acc.username}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="font-black text-slate-800 text-sm">
                          {acc.username.charAt(0).toUpperCase()}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col text-left min-w-0">
                    <span className="font-black text-sm text-slate-900 truncate">
                      @{acc.username}
                    </span>
                    <span className="text-[10px] font-bold text-slate-400">
                      {isCurrent ? 'Active Now' : 'Tap to switch'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isCurrent && (
                    <span className="p-1 rounded-full bg-[#fa0f5c] text-white">
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  )}
                  {savedAccounts.length > 1 && (
                    <button
                      type="button"
                      onClick={(e) => handleRemoveAccount(e, acc.username)}
                      className="p-1.5 text-slate-400 hover:text-red-500 rounded-lg hover:bg-white transition-colors"
                      title="Remove from device"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Add Another Account Toggle/Form */}
        {showAddForm ? (
          <form onSubmit={handleAddNewAccount} className="flex flex-col gap-3 pt-2 border-t border-slate-100">
            <label className="text-xs font-black text-slate-700 uppercase tracking-wider text-left">
              Log in to another account
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-3.5 text-slate-400 font-black text-sm">@</span>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value.replace(/[@\s]/g, ''))}
                placeholder="instagram_handle"
                autoFocus
                maxLength={30}
                className="w-full bg-slate-100 rounded-2xl pl-8 pr-4 py-3 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-[#fa0f5c]"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-100 text-slate-600 font-bold text-xs hover:bg-slate-200 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isLoading || !newUsername.trim()}
                className="flex-1 py-3 rounded-xl bg-black text-white font-black text-xs hover:bg-neutral-800 disabled:opacity-50 flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Switch</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        ) : (
          <button
            type="button"
            onClick={() => setShowAddForm(true)}
            className="w-full py-3.5 px-4 rounded-2xl border-2 border-dashed border-slate-200 hover:border-slate-300 text-slate-700 font-bold text-xs flex items-center justify-center gap-2 transition-all hover:bg-slate-50 cursor-pointer"
          >
            <UserPlus className="w-4 h-4 text-[#fa0f5c]" />
            <span>Add / Log in with another Handle</span>
          </button>
        )}

        {/* Sign Out Action Button */}
        <div className="pt-2 border-t border-slate-100 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => {
              onSignOut();
              onClose();
            }}
            className="w-full py-3 rounded-2xl bg-red-50 hover:bg-red-100 text-red-600 font-black text-xs flex items-center justify-center gap-2 transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of this Device</span>
          </button>
        </div>

      </div>
    </div>
  );
};
