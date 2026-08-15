import React, { useState, useEffect, useRef } from 'react';
import { User } from 'firebase/auth';
import {
  ensureAnonymousAuth,
  getOrCreateUserProfile,
  getUserProfile,
  updateUserProfile,
  subscribeToUserProfile,
  sendAnonymousMessage,
  subscribeToInbox,
  markMessageRead,
  replyToMessage,
  deleteMessage,
  deleteUserProfileCompletely,
  auth
} from './lib/firebase';
import { UserProfile, NglMessage, MediaAttachment } from './types';
import { Navbar } from './components/Navbar';
import { PlayView } from './components/PlayView';
import { InboxView } from './components/InboxView';
import { SenderView } from './components/SenderView';
import { LandingView } from './components/LandingView';
import { MessageCardModal } from './components/MessageCardModal';
import { ProfileModal } from './components/ProfileModal';
import { StoryShareModal } from './components/StoryShareModal';
import { SwitchAccountModal } from './components/SwitchAccountModal';
import { generateRandomCode } from './lib/templates';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetParam = urlParams.get('to') || urlParams.get('u');

  // Instant synchronous startup state (0ms delay)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('ngl_has_onboarded') === 'true';
  });

  const [myProfile, setMyProfile] = useState<UserProfile>(() => {
    const savedHandle = localStorage.getItem('ngl_username') || '';
    const savedCode = localStorage.getItem('ngl_shortcode') || '';
    const savedPhoto = localStorage.getItem('ngl_photo_url') || undefined;
    const savedNotifs = localStorage.getItem('ngl_notifications_enabled');
    const savedPrompt = localStorage.getItem('ngl_user_prompt') || 'send me anonymous messages!';
    return {
      id: localStorage.getItem('ngl_uid') || 'local_user',
      username: savedHandle,
      shortCode: savedCode,
      photoURL: savedPhoto,
      notificationsEnabled: savedNotifs !== null ? savedNotifs === 'true' : true,
      prompt: savedPrompt,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });

  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(() => {
    if (!targetParam) return null;
    const cleanHandle = targetParam.trim().replace(/^@/, '');
    return {
      id: targetParam,
      username: cleanHandle,
      shortCode: cleanHandle.length <= 8 ? cleanHandle : cleanHandle.substring(0, 6),
      prompt: 'send me anonymous messages!'
    };
  });

  const [messages, setMessages] = useState<NglMessage[]>([]);
  const [currentView, setCurrentView] = useState<'play' | 'inbox' | 'sender'>(() => {
    return targetParam ? 'sender' : 'play';
  });
  const [selectedMessage, setSelectedMessage] = useState<NglMessage | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [isSwitchAccountModalOpen, setIsSwitchAccountModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const prevMessagesCountRef = useRef<number | null>(null);
  const myProfileRef = useRef(myProfile);
  useEffect(() => {
    myProfileRef.current = myProfile;
  }, [myProfile]);

  const isViewingOther = Boolean(
    targetParam &&
    myProfile &&
    targetParam.toLowerCase() !== myProfile.id?.toLowerCase() &&
    targetParam.toLowerCase() !== myProfile.username?.toLowerCase() &&
    targetParam.toLowerCase() !== myProfile.shortCode?.toLowerCase()
  );

  // Sub-0.5s Fast Recipient Profile Fetch & Real-Time Sync
  useEffect(() => {
    let unsubscribeRecipientProfile: (() => void) | null = null;

    if (targetParam) {
      // 1. Immediately fetch the real profile for this code or handle (< 0.2s)
      getUserProfile(targetParam).then((target) => {
        if (target) {
          setRecipientProfile(target);
          setCurrentView('sender');

          // 2. Set up real-time listener on the recipient so photo/prompt changes sync live instantly
          if (target.id) {
            unsubscribeRecipientProfile = subscribeToUserProfile(target.id, (liveProfile) => {
              setRecipientProfile(liveProfile);
            });
          }
        }
      }).catch((e) => {
        console.warn('Fast target fetch failed:', e);
      });
    }

    return () => {
      if (unsubscribeRecipientProfile) unsubscribeRecipientProfile();
    };
  }, [targetParam]);

  // Background non-blocking Firebase synchronization for auth and inbox
  useEffect(() => {
    let unsubscribeInbox: (() => void) | null = null;
    let unsubscribeMyProfile: (() => void) | null = null;

    async function syncFirebase() {
      // DO NOT auto-sign in anonymously and DO NOT auto-create a profile if user hasn't onboarded and is not visiting a link
      if (!hasOnboarded && !targetParam) {
        return;
      }

      try {
        const user = await ensureAnonymousAuth();
        setCurrentUser(user);
        localStorage.setItem('ngl_uid', user.uid);

        // Fetch or create profile for current user if onboarded
        if (hasOnboarded) {
          const storedHandle = localStorage.getItem('ngl_username') || myProfile.username;
          if (storedHandle) {
            const profile = await getOrCreateUserProfile(user.uid, storedHandle);
            setMyProfile(profile);

            if (profile.username) localStorage.setItem('ngl_username', profile.username);
            if (profile.shortCode) localStorage.setItem('ngl_shortcode', profile.shortCode);
            if (profile.photoURL) localStorage.setItem('ngl_photo_url', profile.photoURL);

            // Subscribe to live updates on own profile to keep photo/prompt synced
            unsubscribeMyProfile = subscribeToUserProfile(user.uid, (liveProfile) => {
              setMyProfile(liveProfile);
              if (liveProfile.photoURL) localStorage.setItem('ngl_photo_url', liveProfile.photoURL);
            });

            // Real-time inbox subscription
            unsubscribeInbox = subscribeToInbox(user.uid, (newMessages) => {
              if (prevMessagesCountRef.current !== null && newMessages.length > prevMessagesCountRef.current) {
                const latestMsg = newMessages[0];
                const notifsActive = myProfileRef.current?.notificationsEnabled !== false && localStorage.getItem('ngl_notifications_enabled') !== 'false';
                
                if (notifsActive && 'Notification' in window && Notification.permission === 'granted') {
                  try {
                    const notif = new Notification('New Anonymous Message! 💌', {
                      body: latestMsg?.text ? (latestMsg.text.length > 50 ? `${latestMsg.text.substring(0, 50)}...` : latestMsg.text) : 'You received a new secret message on NGL',
                      icon: 'https://framerusercontent.com/images/I5OG1V7seR2tatnsaXFQ2fIQpHA.png',
                      tag: 'ngl-new-message'
                    });
                    notif.onclick = () => {
                      window.focus();
                      setCurrentView('inbox');
                    };
                  } catch (e) {
                    console.warn('Could not show browser notification:', e);
                  }
                }
              }
              prevMessagesCountRef.current = newMessages.length;
              setMessages(newMessages);
            });
          }
        }

        // If visiting someone else's link via ?to=
        if (targetParam && (!user || (targetParam !== user.uid && targetParam.toLowerCase() !== myProfile.username?.toLowerCase() && targetParam.toLowerCase() !== myProfile.shortCode?.toLowerCase()))) {
          const target = await getUserProfile(targetParam);
          if (target) {
            setRecipientProfile(target);
            setCurrentView('sender');
          }
        }
      } catch (err) {
        console.warn('Background sync note:', err);
      }
    }

    syncFirebase();

    return () => {
      if (unsubscribeInbox) unsubscribeInbox();
      if (unsubscribeMyProfile) unsubscribeMyProfile();
    };
  }, [targetParam, hasOnboarded]);

  // Helper to persist account into local multi-account storage
  const saveAccountToList = (username: string, photoURL?: string) => {
    try {
      const raw = localStorage.getItem('ngl_saved_accounts');
      let accounts: Array<{ username: string; photoURL?: string; lastActive: number }> = raw ? JSON.parse(raw) : [];
      accounts = accounts.filter(a => a.username.toLowerCase() !== username.toLowerCase());
      accounts.unshift({
        username,
        photoURL,
        lastActive: Date.now()
      });
      localStorage.setItem('ngl_saved_accounts', JSON.stringify(accounts.slice(0, 10)));
    } catch (e) {
      console.warn('Could not update saved accounts:', e);
    }
  };

  // Handle Get Started from Landing View
  const handleGetStarted = async (username: string, photoURL?: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[@\s]/g, '') || `user_${generateRandomCode(4)}`;
    localStorage.setItem('ngl_username', cleanUsername);
    localStorage.setItem('ngl_has_onboarded', 'true');
    if (photoURL) localStorage.setItem('ngl_photo_url', photoURL);

    saveAccountToList(cleanUsername, photoURL);

    setHasOnboarded(true);
    setMyProfile(prev => ({
      ...prev,
      username: cleanUsername,
      photoURL: photoURL || prev.photoURL
    }));
    setCurrentView('play');

    try {
      let user = currentUser;
      if (!user) {
        user = await ensureAnonymousAuth();
        setCurrentUser(user);
      }
      const updated = await getOrCreateUserProfile(user.uid, cleanUsername);
      const updates: Partial<UserProfile> = { username: cleanUsername };
      if (photoURL) updates.photoURL = photoURL;
      
      await updateUserProfile(user.uid, updates);
      updated.username = cleanUsername;
      if (photoURL) updated.photoURL = photoURL;

      setMyProfile(updated);
      setRecipientProfile(updated);
    } catch (err) {
      console.warn('Profile sync in background:', err);
    }
  };

  // Handle Switch to Another Account
  const handleSwitchAccount = async (targetUsername: string, targetPhoto?: string) => {
    const cleanUsername = targetUsername.trim().toLowerCase().replace(/[@\s]/g, '');
    if (!cleanUsername) return;

    localStorage.setItem('ngl_username', cleanUsername);
    localStorage.setItem('ngl_has_onboarded', 'true');
    if (targetPhoto) {
      localStorage.setItem('ngl_photo_url', targetPhoto);
    } else {
      localStorage.removeItem('ngl_photo_url');
    }

    saveAccountToList(cleanUsername, targetPhoto);

    setHasOnboarded(true);
    setMyProfile(prev => ({
      ...prev,
      username: cleanUsername,
      photoURL: targetPhoto || undefined
    }));
    setCurrentView('play');

    try {
      const fetched = await getUserProfile(cleanUsername);
      if (fetched) {
        setMyProfile(fetched);
        setRecipientProfile(fetched);
        if (fetched.photoURL) {
          localStorage.setItem('ngl_photo_url', fetched.photoURL);
        }
      } else {
        let user = currentUser;
        if (!user) {
          user = await ensureAnonymousAuth();
          setCurrentUser(user);
        }
        const created = await getOrCreateUserProfile(user.uid, cleanUsername);
        setMyProfile(created);
        setRecipientProfile(created);
      }
    } catch (err) {
      console.warn('Error during account switch:', err);
    }
  };

  // Handle Complete Sign Out / Reset Account on this device
  const handleSignOut = async () => {
    try {
      await auth.signOut();
    } catch (e) {
      console.warn('Sign out error:', e);
    }
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Storage clear error:', e);
    }
    setCurrentUser(null);
    setHasOnboarded(false);
    setMessages([]);
    setMyProfile({
      id: 'local_user',
      username: '',
      shortCode: '',
      prompt: 'send me anonymous messages!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    setRecipientProfile(null);
    setSelectedMessage(null);
    setIsProfileModalOpen(false);
    setIsSwitchAccountModalOpen(false);
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Handle Permanent Account Deletion & Complete Cache Wipe (Fresh as new)
  const handleDeleteAccount = async () => {
    const uidToDelete = currentUser?.uid || (myProfile?.id !== 'local_user' ? myProfile?.id : null);
    if (uidToDelete) {
      try {
        await deleteUserProfileCompletely(
          uidToDelete,
          myProfile?.username,
          myProfile?.shortCode
        );
      } catch (e) {
        console.warn('Error deleting user profile from database:', e);
      }
    }

    // Completely clear all browser client caches and storage
    try {
      localStorage.clear();
      sessionStorage.clear();
      if (typeof window !== 'undefined' && 'caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map((name) => caches.delete(name)));
      }
    } catch (e) {
      console.warn('Error wiping client caches:', e);
    }

    // Reset React state to fresh uninitialized state
    const freshProfile: UserProfile = {
      id: 'local_user',
      username: '',
      shortCode: '',
      prompt: 'send me anonymous messages!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    setMyProfile(freshProfile);
    setRecipientProfile(null);
    setMessages([]);
    setSelectedMessage(null);
    setCurrentUser(null);
    setHasOnboarded(false);
    setCurrentView('play');
    setIsProfileModalOpen(false);
    setIsSwitchAccountModalOpen(false);

    // Reset URL to clean root without query params
    window.history.replaceState({}, '', window.location.pathname);
  };

  // Handle Copy NGL link
  const handleCopyLink = () => {
    const identifier = myProfile?.username || myProfile?.shortCode || myProfile?.id || 'me';
    const shareableLink = `${window.location.origin}${window.location.pathname}?to=${identifier}`;
    navigator.clipboard.writeText(shareableLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  // Handle Update Prompt from Play view
  const handleUpdatePrompt = async (newPrompt: string) => {
    localStorage.setItem('ngl_user_prompt', newPrompt);
    setMyProfile(prev => ({ ...prev, prompt: newPrompt }));
    if (currentUser?.uid) {
      try {
        await updateUserProfile(currentUser.uid, { prompt: newPrompt });
      } catch (err) {
        console.warn('Could not sync prompt:', err);
      }
    }
  };

  // Handle Send Message with multiple media attachments support
  const handleSendMessage = async (
    text: string,
    file: MediaAttachment | null,
    deviceHint?: any,
    files?: MediaAttachment[]
  ) => {
    const target = recipientProfile || myProfile;
    if (!target) throw new Error('No recipient found');

    const allFiles = files && files.length > 0 ? files : (file ? [file] : []);
    const primaryFile = allFiles.length > 0 ? allFiles[0] : null;

    await sendAnonymousMessage(target.id, {
      recipientId: target.id,
      senderUid: currentUser?.uid,
      text,
      promptTitle: target.prompt || 'Send me an anonymous message',
      file: primaryFile,
      files: allFiles,
      read: false,
      createdAt: Date.now(),
      deviceHint: deviceHint || undefined
    });
  };

  // Handle Open Message from Chat List
  const handleSelectMessage = async (msg: NglMessage) => {
    setSelectedMessage(msg);
    if (!msg.read && myProfile?.id) {
      try {
        await markMessageRead(myProfile.id, msg.id);
      } catch (e) {
        console.warn('Could not mark read:', e);
      }
    }
  };

  // Handle Reply to Message
  const handleReplyMessage = async (messageId: string, replyText: string) => {
    if (!myProfile?.id) return;
    await replyToMessage(myProfile.id, messageId, replyText);
    setSelectedMessage((prev) => (prev && prev.id === messageId ? { ...prev, reply: replyText, repliedAt: new Date().toISOString() } : prev));
  };

  // Handle Delete Message
  const handleDeleteMessage = async (messageId: string) => {
    if (!myProfile?.id) return;
    await deleteMessage(myProfile.id, messageId);
    setSelectedMessage(null);
  };

  // Handle Profile Update
  const handleSaveProfile = async (updates: Partial<UserProfile>) => {
    setMyProfile((prev) => ({ ...prev, ...updates }));
    if (updates.username) {
      localStorage.setItem('ngl_username', updates.username);
    }
    if (updates.photoURL !== undefined) {
      if (updates.photoURL) {
        localStorage.setItem('ngl_photo_url', updates.photoURL);
      } else {
        localStorage.removeItem('ngl_photo_url');
      }
    }
    if (updates.notificationsEnabled !== undefined) {
      localStorage.setItem('ngl_notifications_enabled', String(updates.notificationsEnabled));
    }

    try {
      let uid = currentUser?.uid || (myProfile?.id !== 'local_user' ? myProfile?.id : null);
      if (!uid) {
        const user = await ensureAnonymousAuth();
        setCurrentUser(user);
        uid = user.uid;
        localStorage.setItem('ngl_uid', uid);
      }
      if (uid) {
        await updateUserProfile(uid, updates);
      }
    } catch (e) {
      console.warn('Error persisting profile update to Firestore:', e);
    }
  };

  // Switch from other user's view back to own profile
  const handleSwitchToMyProfile = () => {
    window.history.pushState({}, '', window.location.pathname);
    if (myProfile) {
      setRecipientProfile(myProfile);
      setCurrentView('play');
    }
  };

  const unreadCount = messages.filter((m) => !m.read).length;
  const currentMsgIndex = selectedMessage ? messages.findIndex((m) => m.id === selectedMessage.id) : -1;
  const hasNext = currentMsgIndex > -1 && currentMsgIndex < messages.length - 1;
  const hasPrev = currentMsgIndex > 0;

  const handleNextMessage = () => {
    if (hasNext) {
      const nextMsg = messages[currentMsgIndex + 1];
      handleSelectMessage(nextMsg);
    }
  };

  const handlePrevMessage = () => {
    if (hasPrev) {
      const prevMsg = messages[currentMsgIndex - 1];
      handleSelectMessage(prevMsg);
    }
  };

  // If visiting directly without params and hasn't onboarded yet, show fast Landing
  if (!targetParam && !hasOnboarded) {
    return (
      <LandingView
        onGetStarted={handleGetStarted}
        isLoading={false}
      />
    );
  }

  return (
    <div className={`min-h-screen w-full flex flex-col items-center relative overflow-x-hidden ${
      currentView === 'sender'
        ? 'bg-gradient-to-b from-[#e60067] via-[#fa0f5c] to-[#ff6600] text-slate-900 selection:bg-white selection:text-[#fa0f5c]'
        : 'bg-[#fafafc] text-slate-900 selection:bg-[#fa0f5c] selection:text-white'
    }`}>
      
      {/* Top Navigation Bar with gradient backdrop */}
      <Navbar
        currentView={currentView}
        setCurrentView={setCurrentView}
        profile={myProfile}
        unreadCount={unreadCount}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        isViewingOther={Boolean(isViewingOther)}
        onSwitchToMyProfile={handleSwitchToMyProfile}
      />

      {/* Main App Container */}
      <main className="w-full flex-1 flex flex-col items-center justify-start z-10 py-2 sm:py-4">
        {currentView === 'sender' ? (
          <SenderView
            recipientProfile={recipientProfile || myProfile}
            onSendMessage={handleSendMessage}
            isOwnLink={!isViewingOther}
            onOpenMyInbox={() => setCurrentView('inbox')}
            onGetOwnLink={() => {
              window.history.pushState({}, '', window.location.pathname);
              setHasOnboarded(false);
            }}
            appUrl={window.location.origin}
          />
        ) : currentView === 'play' ? (
          <PlayView
            profile={myProfile}
            onCopyLink={handleCopyLink}
            copied={copiedLink}
            onOpenStoryShare={() => setIsStoryModalOpen(true)}
            onUpdatePrompt={handleUpdatePrompt}
            appUrl={window.location.origin}
          />
        ) : (
          <InboxView
            profile={myProfile}
            messages={messages}
            unreadCount={unreadCount}
            onSelectMessage={handleSelectMessage}
            onOpenProfile={() => setIsProfileModalOpen(true)}
            onOpenStoryShare={() => setIsStoryModalOpen(true)}
            onCopyLink={handleCopyLink}
            copied={copiedLink}
            appUrl={window.location.origin}
          />
        )}
      </main>

      {/* Message Card Detail Modal */}
      {selectedMessage && (
        <MessageCardModal
          message={selectedMessage}
          profile={myProfile}
          onClose={() => setSelectedMessage(null)}
          onDelete={handleDeleteMessage}
          onReply={handleReplyMessage}
          onNext={handleNextMessage}
          onPrev={handlePrevMessage}
          hasNext={hasNext}
          hasPrev={hasPrev}
          currentIndex={currentMsgIndex}
          totalMessages={messages.length}
        />
      )}

      {/* Profile Settings Modal */}
      {isProfileModalOpen && (
        <ProfileModal
          profile={myProfile}
          onClose={() => setIsProfileModalOpen(false)}
          onSave={handleSaveProfile}
          onResetAccount={handleSignOut}
          onDeleteAccount={handleDeleteAccount}
          onOpenSwitchAccount={() => setIsSwitchAccountModalOpen(true)}
        />
      )}

      {/* Switch Account Modal */}
      {isSwitchAccountModalOpen && (
        <SwitchAccountModal
          currentProfile={myProfile}
          onClose={() => setIsSwitchAccountModalOpen(false)}
          onSwitchAccount={handleSwitchAccount}
          onSignOut={handleSignOut}
        />
      )}

      {/* Instagram Story Share Modal */}
      {isStoryModalOpen && (
        <StoryShareModal
          profile={myProfile}
          onClose={() => setIsStoryModalOpen(false)}
          appUrl={window.location.origin}
        />
      )}
    </div>
  );
}
