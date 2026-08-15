import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, User } from 'firebase/auth';
import {
  initializeFirestore,
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  writeBatch,
  onSnapshot,
  query,
  orderBy,
  Unsubscribe
} from 'firebase/firestore';
import { UserProfile, NglMessage } from '../types';

export const firebaseConfig = {
  apiKey: "AIzaSyCq68Teb657ZpZGN2ripSoQrDUCeOvua-k",
  authDomain: "ng-l-c11b5.firebaseapp.com",
  projectId: "ng-l-c11b5",
  storageBucket: "ng-l-c11b5.firebasestorage.app",
  messagingSenderId: "1097003039818",
  appId: "1:1097003039818:web:44ddc9e6b10b35ebad3ab3",
  measurementId: "G-MYC8J36XGV"
};

// Initialize Firebase safely
export const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const auth = getAuth(app);

// Use initializeFirestore with experimentalAutoDetectLongPolling & experimentalForceLongPolling
// to prevent [code=unavailable] WebChannel disconnects in sandboxed preview / iframe environments
function createFirestoreInstance() {
  try {
    return initializeFirestore(app, {
      experimentalAutoDetectLongPolling: true,
      experimentalForceLongPolling: true,
    });
  } catch (e) {
    return getFirestore(app);
  }
}

export const db = createFirestoreInstance();

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      isAnonymous: auth.currentUser?.isAnonymous
    },
    operationType,
    path
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  return new Error(JSON.stringify(errInfo));
}

/**
 * Ensures the client is authenticated anonymously
 */
export async function ensureAnonymousAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  try {
    const cred = await signInAnonymously(auth);
    return cred.user;
  } catch (err) {
    console.error('Failed to sign in anonymously:', err);
    throw err;
  }
}

import { generateRandomCode } from './templates';

// In-memory profile cache for sub-millisecond instant loads on repeat/direct queries
const profileMemoryCache = new Map<string, { profile: UserProfile; timestamp: number }>();
const CACHE_TTL_MS = 60 * 1000; // 1 minute local cache

/**
 * Fetch or create a user profile in Firestore
 */
export async function getOrCreateUserProfile(uid: string, initialUsername?: string): Promise<UserProfile> {
  const userRef = doc(db, 'users', uid);
  try {
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const data = snap.data() as UserProfile;
      // Ensure shortCode exists if it was created before
      if (!data.shortCode) {
        data.shortCode = generateRandomCode(6);
        await updateDoc(userRef, { shortCode: data.shortCode });
      }

      if (data.username) {
        try {
          const handleRef = doc(db, 'handles', data.username.toLowerCase());
          await setDoc(handleRef, { 
            uid, 
            username: data.username, 
            shortCode: data.shortCode,
            photoURL: data.photoURL || null,
            prompt: data.prompt || 'Send me an anonymous message'
          }, { merge: true });
          if (data.shortCode) {
            const codeRef = doc(db, 'handles', data.shortCode.toLowerCase());
            await setDoc(codeRef, { 
              uid, 
              username: data.username, 
              shortCode: data.shortCode,
              photoURL: data.photoURL || null,
              prompt: data.prompt || 'Send me an anonymous message'
            }, { merge: true });
          }
        } catch (e) {
          console.warn('Could not set handle mapping:', e);
        }
      }
      
      // Update memory cache
      profileMemoryCache.set(uid.toLowerCase(), { profile: data, timestamp: Date.now() });
      if (data.username) profileMemoryCache.set(data.username.toLowerCase(), { profile: data, timestamp: Date.now() });
      if (data.shortCode) profileMemoryCache.set(data.shortCode.toLowerCase(), { profile: data, timestamp: Date.now() });

      return data;
    } else {
      const shortCode = generateRandomCode(6);
      const username = initialUsername || `user_${shortCode}`;
      const defaultProfile: UserProfile = {
        id: uid,
        username,
        shortCode,
        prompt: 'Send me an anonymous message',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, defaultProfile);
      
      // Store handle and code mapping
      try {
        const handleRef = doc(db, 'handles', username.toLowerCase());
        await setDoc(handleRef, { 
          uid, 
          username, 
          shortCode,
          photoURL: null,
          prompt: 'Send me an anonymous message'
        }, { merge: true });
        const codeRef = doc(db, 'handles', shortCode.toLowerCase());
        await setDoc(codeRef, { 
          uid, 
          username, 
          shortCode,
          photoURL: null,
          prompt: 'Send me an anonymous message'
        }, { merge: true });
      } catch (e) {
        console.warn('Could not set handle mapping:', e);
      }
      
      profileMemoryCache.set(uid.toLowerCase(), { profile: defaultProfile, timestamp: Date.now() });
      profileMemoryCache.set(username.toLowerCase(), { profile: defaultProfile, timestamp: Date.now() });
      profileMemoryCache.set(shortCode.toLowerCase(), { profile: defaultProfile, timestamp: Date.now() });

      return defaultProfile;
    }
  } catch (error) {
    throw handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Update user profile globally and synchronize handles/codes registry instantly
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    const cleanUpdates = {
      ...updates,
      updatedAt: new Date().toISOString()
    };
    await updateDoc(userRef, cleanUpdates);

    // Fetch latest complete profile to update cache and handle entries
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const fullProfile = snap.data() as UserProfile;
      const uName = fullProfile.username;
      const sCode = fullProfile.shortCode;

      // Update in-memory cache
      profileMemoryCache.set(uid.toLowerCase(), { profile: fullProfile, timestamp: Date.now() });
      if (uName) profileMemoryCache.set(uName.toLowerCase(), { profile: fullProfile, timestamp: Date.now() });
      if (sCode) profileMemoryCache.set(sCode.toLowerCase(), { profile: fullProfile, timestamp: Date.now() });

      // Always sync handle & shortcode registry docs so lookup by handle or code has latest photoURL and prompt
      const handleData = {
        uid,
        username: uName,
        shortCode: sCode,
        photoURL: fullProfile.photoURL || null,
        prompt: fullProfile.prompt || 'Send me an anonymous message',
        updatedAt: fullProfile.updatedAt
      };

      try {
        if (uName) {
          const handleRef = doc(db, 'handles', uName.toLowerCase());
          await setDoc(handleRef, handleData, { merge: true });
        }
        if (sCode) {
          const codeRef = doc(db, 'handles', sCode.toLowerCase());
          await setDoc(codeRef, handleData, { merge: true });
        }
      } catch (e) {
        console.warn('Could not update handle mapping:', e);
      }
    }
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
  }
}

/**
 * Fast sub-second Get User Profile by UID, Username, or ShortCode with parallel lookups
 */
export async function getUserProfile(uidOrHandle: string): Promise<UserProfile | null> {
  if (!uidOrHandle) return null;
  const cleanKey = uidOrHandle.trim().toLowerCase().replace('@', '');

  // 1. Check in-memory fast cache first (<1ms response)
  const cached = profileMemoryCache.get(cleanKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.profile;
  }

  try {
    // 2. Parallel fetch direct UID doc and handles/code mapping simultaneously for maximum speed (<150ms)
    const userRef = doc(db, 'users', uidOrHandle);
    const handleRef = doc(db, 'handles', cleanKey);

    const [userSnap, handleSnap] = await Promise.all([
      getDoc(userRef).catch(() => null),
      getDoc(handleRef).catch(() => null)
    ]);

    if (userSnap && userSnap.exists()) {
      const profile = userSnap.data() as UserProfile;
      profileMemoryCache.set(cleanKey, { profile, timestamp: Date.now() });
      profileMemoryCache.set(profile.id.toLowerCase(), { profile, timestamp: Date.now() });
      if (profile.username) profileMemoryCache.set(profile.username.toLowerCase(), { profile, timestamp: Date.now() });
      if (profile.shortCode) profileMemoryCache.set(profile.shortCode.toLowerCase(), { profile, timestamp: Date.now() });
      return profile;
    }

    if (handleSnap && handleSnap.exists()) {
      const handleData = handleSnap.data() as { uid?: string; username?: string; shortCode?: string; photoURL?: string; prompt?: string };
      if (handleData.uid) {
        const linkedUserRef = doc(db, 'users', handleData.uid);
        const linkedUserSnap = await getDoc(linkedUserRef).catch(() => null);
        if (linkedUserSnap && linkedUserSnap.exists()) {
          const profile = linkedUserSnap.data() as UserProfile;
          profileMemoryCache.set(cleanKey, { profile, timestamp: Date.now() });
          profileMemoryCache.set(profile.id.toLowerCase(), { profile, timestamp: Date.now() });
          if (profile.username) profileMemoryCache.set(profile.username.toLowerCase(), { profile, timestamp: Date.now() });
          if (profile.shortCode) profileMemoryCache.set(profile.shortCode.toLowerCase(), { profile, timestamp: Date.now() });
          return profile;
        }

        // If user doc is unreachable, construct from handle doc
        const fallbackProfile: UserProfile = {
          id: handleData.uid,
          username: handleData.username || cleanKey,
          shortCode: handleData.shortCode || cleanKey,
          photoURL: handleData.photoURL || undefined,
          prompt: handleData.prompt || 'Send me an anonymous message'
        };
        return fallbackProfile;
      }
    }

    return null;
  } catch (error) {
    console.warn(`Profile for ${uidOrHandle} not found or inaccessible:`, error);
    return null;
  }
}

/**
 * Real-time listener for any user profile updates (photoURL, prompt, handle changes)
 */
export function subscribeToUserProfile(
  userId: string,
  onUpdate: (profile: UserProfile) => void,
  onError?: (error: Error) => void
): () => void {
  const userRef = doc(db, 'users', userId);
  return onSnapshot(
    userRef,
    (snap) => {
      if (snap.exists()) {
        const profile = snap.data() as UserProfile;
        profileMemoryCache.set(userId.toLowerCase(), { profile, timestamp: Date.now() });
        if (profile.username) profileMemoryCache.set(profile.username.toLowerCase(), { profile, timestamp: Date.now() });
        if (profile.shortCode) profileMemoryCache.set(profile.shortCode.toLowerCase(), { profile, timestamp: Date.now() });
        onUpdate(profile);
      }
    },
    (error) => {
      console.warn(`Profile subscription for ${userId} failed:`, error);
      if (onError) onError(error);
    }
  );
}

/**
 * Send an anonymous message to recipient's inbox via Firestore
 */
export async function sendAnonymousMessage(
  recipientId: string,
  messageData: Omit<NglMessage, 'id'>
): Promise<string> {
  // Ensure the sender has an active Firebase anonymous session to satisfy rules
  await ensureAnonymousAuth();

  const messagesCol = collection(db, 'users', recipientId, 'messages');
  try {
    const payload = {
      ...messageData,
      recipientId,
      read: false,
      createdAt: messageData.createdAt || Date.now()
    };
    const docRef = await addDoc(messagesCol, payload);
    console.log(`🚀 [NGL Firestore Write]: Successfully delivered anonymous message!`, {
      docPath: `users/${recipientId}/messages/${docRef.id}`,
      ipAddress: payload.deviceHint?.ip || 'N/A',
      timestamp: payload.createdAt,
      timeString: new Date(payload.createdAt).toLocaleString(),
      deviceType: payload.deviceHint?.device || 'Unknown',
      os: payload.deviceHint?.os,
      browser: payload.deviceHint?.browser
    });
    return docRef.id;
  } catch (error) {
    throw handleFirestoreError(error, OperationType.CREATE, `users/${recipientId}/messages`);
  }
}

/**
 * Real-time listener for user's inbox messages
 */
export function subscribeToInbox(
  userId: string,
  onUpdate: (messages: NglMessage[]) => void,
  onError?: (error: Error) => void
): Unsubscribe {
  const messagesCol = collection(db, 'users', userId, 'messages');
  const q = query(messagesCol, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const messages: NglMessage[] = snapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...(docSnap.data() as Omit<NglMessage, 'id'>)
      }));
      onUpdate(messages);
    },
    (error) => {
      const err = handleFirestoreError(error, OperationType.LIST, `users/${userId}/messages`);
      if (onError) onError(err);
    }
  );
}

/**
 * Mark a message as read
 */
export async function markMessageRead(userId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'users', userId, 'messages', messageId);
  try {
    await updateDoc(msgRef, { read: true });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/messages/${messageId}`);
  }
}

/**
 * Reply to an anonymous message
 */
export async function replyToMessage(userId: string, messageId: string, replyText: string): Promise<void> {
  const msgRef = doc(db, 'users', userId, 'messages', messageId);
  try {
    await updateDoc(msgRef, {
      reply: replyText,
      repliedAt: new Date().toISOString(),
      read: true
    });
  } catch (error) {
    throw handleFirestoreError(error, OperationType.UPDATE, `users/${userId}/messages/${messageId}`);
  }
}

/**
 * Delete a message from inbox
 */
export async function deleteMessage(userId: string, messageId: string): Promise<void> {
  const msgRef = doc(db, 'users', userId, 'messages', messageId);
  try {
    await deleteDoc(msgRef);
  } catch (error) {
    throw handleFirestoreError(error, OperationType.DELETE, `users/${userId}/messages/${messageId}`);
  }
}

/**
 * Completely delete a user profile, erase all inbox messages, purge handle registries, and wipe all local caches
 */
export async function deleteUserProfileCompletely(
  userId: string,
  username?: string,
  shortCode?: string
): Promise<void> {
  // 1. Clear in-memory profile caches immediately
  profileMemoryCache.clear();

  // 2. Fetch and delete all messages in subcollection
  try {
    const messagesCol = collection(db, 'users', userId, 'messages');
    const msgSnap = await getDocs(messagesCol);
    const deletePromises = msgSnap.docs.map((docSnap) => deleteDoc(docSnap.ref).catch(() => null));
    await Promise.all(deletePromises);
  } catch (e) {
    console.warn('Error deleting message documents during profile deletion:', e);
  }

  // 3. Delete handles and shortcode index documents
  try {
    if (username) {
      const handleRef = doc(db, 'handles', username.toLowerCase());
      await deleteDoc(handleRef).catch(() => null);
    }
  } catch (e) {
    console.warn('Error deleting handle document:', e);
  }

  try {
    if (shortCode) {
      const codeRef = doc(db, 'handles', shortCode.toLowerCase());
      await deleteDoc(codeRef).catch(() => null);
    }
  } catch (e) {
    console.warn('Error deleting shortcode document:', e);
  }

  // 4. Delete main user profile document
  try {
    const userRef = doc(db, 'users', userId);
    await deleteDoc(userRef).catch(() => null);
  } catch (e) {
    console.warn('Error deleting user document:', e);
  }

  // 5. Sign out / purge Auth state
  try {
    await auth.signOut();
  } catch (e) {
    console.warn('Error signing out during profile deletion:', e);
  }

  // 6. Completely wipe localStorage & sessionStorage to leave it fresh as new
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {
    console.warn('Error clearing storage:', e);
  }
}

