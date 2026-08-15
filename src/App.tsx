import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  ensureAnonymousAuth,
  getOrCreateUserProfile,
  getUserProfile,
  updateUserProfile,
  sendAnonymousMessage,
  subscribeToInbox,
  markMessageRead,
  replyToMessage,
  deleteMessage
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
import { generateRandomCode } from './lib/templates';

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const targetParam = urlParams.get('to') || urlParams.get('u');

  // Instant synchronous startup state (0ms delay)
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [myProfile, setMyProfile] = useState<UserProfile>(() => {
    const savedHandle = localStorage.getItem('ngl_username') || `user_${generateRandomCode(4)}`;
    const savedCode = localStorage.getItem('ngl_shortcode') || generateRandomCode(6);
    return {
      id: localStorage.getItem('ngl_uid') || 'local_user',
      username: savedHandle,
      shortCode: savedCode,
      prompt: 'send me anonymous messages!',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  });
  const [recipientProfile, setRecipientProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<NglMessage[]>([]);
  const [currentView, setCurrentView] = useState<'play' | 'inbox' | 'sender'>(() => {
    return targetParam ? 'sender' : 'play';
  });
  const [selectedMessage, setSelectedMessage] = useState<NglMessage | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isStoryModalOpen, setIsStoryModalOpen] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [hasOnboarded, setHasOnboarded] = useState<boolean>(() => {
    return localStorage.getItem('ngl_has_onboarded') === 'true' || Boolean(localStorage.getItem('ngl_username'));
  });

  const isViewingOther = Boolean(
    targetParam &&
    myProfile &&
    targetParam.toLowerCase() !== myProfile.id?.toLowerCase() &&
    targetParam.toLowerCase() !== myProfile.username?.toLowerCase() &&
    targetParam.toLowerCase() !== myProfile.shortCode?.toLowerCase()
  );

  // Background non-blocking Firebase synchronization
  useEffect(() => {
    let unsubscribeInbox: (() => void) | null = null;

    async function syncFirebase() {
      try {
        const user = await ensureAnonymousAuth();
        setCurrentUser(user);
        localStorage.setItem('ngl_uid', user.uid);

        // Fetch or create profile for current user
        const storedHandle = localStorage.getItem('ngl_username') || myProfile.username;
        const profile = await getOrCreateUserProfile(user.uid, storedHandle);
        setMyProfile(profile);

        if (profile.username) localStorage.setItem('ngl_username', profile.username);
        if (profile.shortCode) localStorage.setItem('ngl_shortcode', profile.shortCode);

        // If visiting someone else's link via ?to=
        if (targetParam && targetParam !== user.uid && targetParam.toLowerCase() !== profile.username?.toLowerCase() && targetParam.toLowerCase() !== profile.shortCode?.toLowerCase()) {
          const target = await getUserProfile(targetParam);
          if (target) {
            setRecipientProfile(target);
            setCurrentView('sender');
          } else {
            const fallbackHandle = targetParam.replace(/[@\s]/g, '');
            setRecipientProfile({
              id: targetParam,
              username: fallbackHandle,
              shortCode: fallbackHandle.substring(0, 6),
              prompt: 'send me anonymous messages!'
            });
            setCurrentView('sender');
          }
        } else {
          setRecipientProfile(profile);
          // Real-time inbox subscription
          unsubscribeInbox = subscribeToInbox(user.uid, (newMessages) => {
            setMessages(newMessages);
          });
        }
      } catch (err) {
        console.warn('Background sync note:', err);
      }
    }

    syncFirebase();

    return () => {
      if (unsubscribeInbox) unsubscribeInbox();
    };
  }, [targetParam]);

  // Handle Get Started from Landing View
  const handleGetStarted = async (username: string) => {
    const cleanUsername = username.trim().toLowerCase().replace(/[@\s]/g, '') || `user_${generateRandomCode(4)}`;
    localStorage.setItem('ngl_username', cleanUsername);
    localStorage.setItem('ngl_has_onboarded', 'true');
    setHasOnboarded(true);
    setMyProfile(prev => ({ ...prev, username: cleanUsername }));
    setCurrentView('play');

    try {
      let user = currentUser;
      if (!user) {
        user = await ensureAnonymousAuth();
        setCurrentUser(user);
      }
      const updated = await getOrCreateUserProfile(user.uid, cleanUsername);
      if (updated.username !== cleanUsername) {
        await updateUserProfile(user.uid, { username: cleanUsername });
        updated.username = cleanUsername;
      }
      setMyProfile(updated);
      setRecipientProfile(updated);
    } catch (err) {
      console.warn('Profile sync in background:', err);
    }
  };

  // Handle Reset / Sign Out
  const handleResetAccount = () => {
    localStorage.removeItem('ngl_has_onboarded');
    setHasOnboarded(false);
    window.history.pushState({}, '', window.location.pathname);
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
    setMyProfile(prev => ({ ...prev, prompt: newPrompt }));
    if (currentUser?.uid) {
      try {
        await updateUserProfile(currentUser.uid, { prompt: newPrompt });
      } catch (err) {
        console.warn('Could not sync prompt:', err);
      }
    }
  };

  // Handle Send Message
  const handleSendMessage = async (text: string, file: MediaAttachment | null, deviceHint?: any) => {
    const target = recipientProfile || myProfile;
    if (!target) throw new Error('No recipient found');

    await sendAnonymousMessage(target.id, {
      recipientId: target.id,
      senderUid: currentUser?.uid,
      text,
      promptTitle: target.prompt || 'send me anonymous messages!',
      file: file || null,
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
    if (myProfile?.id && currentUser?.uid) {
      await updateUserProfile(currentUser.uid, updates);
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
    <div className="min-h-screen w-full bg-gradient-to-b from-[#e60067] via-[#fa0f5c] to-[#ff6600] text-slate-900 flex flex-col items-center relative overflow-x-hidden selection:bg-white selection:text-[#fa0f5c]">
      
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
          onResetAccount={handleResetAccount}
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
