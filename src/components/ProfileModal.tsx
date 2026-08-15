import React, { useState, useRef } from 'react';
import { UserProfile } from '../types';
import { X, Camera, Check, Trash2, Bell, BellOff } from 'lucide-react';

interface ProfileModalProps {
  profile: UserProfile | null;
  onClose: () => void;
  onSave: (updates: Partial<UserProfile>) => Promise<void>;
  onResetAccount?: () => void;
  onDeleteAccount?: () => Promise<void>;
  onOpenSwitchAccount?: () => void;
}

export const ProfileModal: React.FC<ProfileModalProps> = ({
  profile,
  onClose,
  onSave,
  onResetAccount,
  onDeleteAccount,
  onOpenSwitchAccount
}) => {
  const [username, setUsername] = useState(profile?.username || '');
  const [photoURL, setPhotoURL] = useState(profile?.photoURL || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState<boolean>(() => {
    if (typeof profile?.notificationsEnabled === 'boolean') {
      return profile.notificationsEnabled;
    }
    const saved = localStorage.getItem('ngl_notifications_enabled');
    return saved !== null ? saved === 'true' : true;
  });
  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleToggleNotifications = async () => {
    const nextState = !notificationsEnabled;
    if (nextState && 'Notification' in window) {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        if (permission !== 'granted') {
          setNotificationsEnabled(false);
          localStorage.setItem('ngl_notifications_enabled', 'false');
          return;
        }
      } else if (Notification.permission === 'denied') {
        alert('Notifications are blocked by your browser settings. Please enable them in your browser URL bar or settings.');
        return;
      }
    }
    setNotificationsEnabled(nextState);
    localStorage.setItem('ngl_notifications_enabled', String(nextState));
  };

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim()) return;

    setIsSaving(true);
    try {
      localStorage.setItem('ngl_notifications_enabled', String(notificationsEnabled));
      await onSave({
        username: username.trim().toLowerCase().replace(/[@\s]/g, ''),
        photoURL,
        notificationsEnabled
      });
      onClose();
    } catch (err) {
      console.error('Failed to update profile:', err);
      alert('Failed to save profile changes.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200 select-none">
      <div className="w-full max-w-sm bg-white rounded-[36px] p-7 shadow-2xl flex flex-col gap-5 relative max-h-[90vh] overflow-y-auto">
        
        {/* Header */}
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            Edit Profile
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {/* Bold Fluffy Avatar Circle Picker */}
          <div className="flex flex-col items-center justify-center gap-2.5">
            <div
              onClick={() => fileInputRef.current?.click()}
              className="relative w-22 h-22 rounded-full cursor-pointer group p-1 bg-gradient-to-tr from-[#fa0f5c] via-[#f70a59] to-[#fc6320] shadow-xl hover:scale-105 transition-all"
              title="Tap to choose photo"
            >
              <div className="w-full h-full rounded-full overflow-hidden bg-slate-100 flex items-center justify-center relative">
                {photoURL ? (
                  <img
                    src={photoURL}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-slate-900 flex items-center justify-center text-white font-black text-2xl">
                    {username.charAt(0).toUpperCase() || 'U'}
                  </div>
                )}
                
                {/* Camera Overlay on Hover/Tap */}
                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                  <Camera className="w-6 h-6" />
                </div>
              </div>

              {/* Plump Camera Badge Button */}
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-full bg-black text-white flex items-center justify-center shadow-lg border-2 border-white">
                <Camera className="w-3.5 h-3.5" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs font-black text-[#fa0f5c] hover:underline cursor-pointer"
              >
                Upload Photo
              </button>

              {photoURL && (
                <button
                  type="button"
                  onClick={() => setPhotoURL('')}
                  className="text-xs font-bold text-slate-400 hover:text-red-500 flex items-center gap-1 cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Remove</span>
                </button>
              )}
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handlePhotoUpload}
              className="hidden"
            />
          </div>

          {/* Username Handle Input */}
          <div className="flex flex-col gap-1.5 text-left">
            <label className="text-xs font-black text-slate-700 tracking-wide uppercase">
              Username
            </label>
            <div className="relative flex items-center">
              <span className="absolute left-4 text-slate-400 font-black text-base">
                @
              </span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="your_handle"
                maxLength={28}
                required
                className="w-full bg-slate-100 rounded-2xl pl-9 pr-4 py-3 text-base font-extrabold text-slate-900 border-none outline-none focus:ring-2 focus:ring-[#fa0f5c] transition-all"
              />
            </div>
          </div>

          {/* Browser Push Notifications Toggle */}
          <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl ${notificationsEnabled ? 'bg-pink-100 text-[#fa0f5c]' : 'bg-slate-200 text-slate-500'}`}>
                {notificationsEnabled ? <Bell className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
              </div>
              <div className="flex flex-col text-left">
                <span className="text-xs font-black text-slate-900">Push Notifications</span>
                <span className="text-[10px] font-bold text-slate-400">
                  {notificationsEnabled ? 'Notify for new messages' : 'Muted on this device'}
                </span>
              </div>
            </div>

            {/* iOS/Modern style Switch Toggle */}
            <button
              type="button"
              role="switch"
              aria-checked={notificationsEnabled}
              onClick={handleToggleNotifications}
              className={`w-12 h-6 rounded-full transition-colors relative p-0.5 cursor-pointer ${
                notificationsEnabled ? 'bg-[#fa0f5c]' : 'bg-slate-300'
              }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Button: Bold Black Pill */}
          <button
            type="submit"
            disabled={isSaving || !username.trim()}
            className="w-full bg-black hover:bg-slate-900 text-white font-black text-base py-3.5 rounded-full active:scale-95 shadow-xl disabled:opacity-50 transition-all flex items-center justify-center gap-2 mt-1 cursor-pointer"
          >
            {isSaving ? (
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save Changes</span>
              </>
            )}
          </button>

          {/* Account Management: Switch, Sign Out & Delete */}
          <div className="flex flex-col gap-2 pt-2 border-t border-slate-100">
            {onOpenSwitchAccount && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenSwitchAccount();
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-black text-xs transition-colors cursor-pointer text-center"
              >
                Switch Account
              </button>
            )}

            <div className="flex items-center justify-between px-1 pt-1">
              {onResetAccount && (
                <button
                  type="button"
                  onClick={() => {
                    if (confirm("Are you sure you want to sign out of this account on this device?")) {
                      onResetAccount();
                      onClose();
                    }
                  }}
                  className="text-xs font-bold text-slate-500 hover:text-slate-800 transition-colors cursor-pointer"
                >
                  Sign Out
                </button>
              )}

              {onDeleteAccount && (
                <button
                  type="button"
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-xs font-extrabold text-red-500 hover:text-red-700 flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Profile</span>
                </button>
              )}
            </div>
          </div>
        </form>

        {/* Clean Confirm Delete Profile Popup Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="w-full max-w-xs bg-white rounded-3xl p-6 text-slate-900 shadow-2xl flex flex-col items-center text-center animate-in zoom-in-95 duration-150">
              <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-3">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                Confirm Delete Profile
              </h3>
              <p className="text-xs text-slate-500 font-medium mt-1 mb-5">
                Are you sure you want to delete your profile?
              </p>

              <div className="w-full flex gap-2.5">
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={() => setShowDeleteConfirm(false)}
                  className="flex-1 py-3 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-black text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isDeleting}
                  onClick={async () => {
                    if (!onDeleteAccount) return;
                    setIsDeleting(true);
                    try {
                      await onDeleteAccount();
                      onClose();
                    } catch (err) {
                      console.error('Delete account failed:', err);
                      alert('Could not delete account. Please try again.');
                    } finally {
                      setIsDeleting(false);
                    }
                  }}
                  className="flex-1 py-3 rounded-full bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-red-500/25 disabled:opacity-50 transition-colors cursor-pointer"
                >
                  {isDeleting ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>Yes, Delete</span>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
