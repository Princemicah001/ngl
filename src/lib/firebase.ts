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
          await setDoc(handleRef, { uid, username: data.username, shortCode: data.shortCode }, { merge: true });
          if (data.shortCode) {
            const codeRef = doc(db, 'handles', data.shortCode.toLowerCase());
            await setDoc(codeRef, { uid, username: data.username, shortCode: data.shortCode }, { merge: true });
          }
        } catch (e) {
          console.warn('Could not set handle mapping:', e);
        }
      }
      return data;
    } else {
      const shortCode = generateRandomCode(6);
      const username = initialUsername || `user_${shortCode}`;
      const defaultProfile: UserProfile = {
        id: uid,
        username,
        shortCode,
        prompt: 'send me anonymous messages!',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      await setDoc(userRef, defaultProfile);
      
      // Store handle and code mapping
      try {
        const handleRef = doc(db, 'handles', username.toLowerCase());
        await setDoc(handleRef, { uid, username, shortCode }, { merge: true });
        const codeRef = doc(db, 'handles', shortCode.toLowerCase());
        await setDoc(codeRef, { uid, username, shortCode }, { merge: true });
      } catch (e) {
        console.warn('Could not set handle mapping:', e);
      }
      
      return defaultProfile;
    }
  } catch (error) {
    throw handleFirestoreError(error, OperationType.GET, `users/${uid}`);
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(uid: string, updates: Partial<UserProfile>): Promise<void> {
  const userRef = doc(db, 'users', uid);
  try {
    await updateDoc(userRef, {
      ...updates,
      updatedAt: new Date().toISOString()
    });
    if (updates.username || updates.shortCode) {
      try {
        if (updates.username) {
          const handleRef = doc(db, 'handles', updates.username.toLowerCase());
          await setDoc(handleRef, { uid, username: updates.username, shortCode: updates.shortCode }, { merge: true });
        }
        if (updates.shortCode) {
          const codeRef = doc(db, 'handles', updates.shortCode.toLowerCase());
          await setDoc(codeRef, { uid, username: updates.username, shortCode: updates.shortCode }, { merge: true });
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
 * Get user profile by UID or Instagram Handle
 */
export async function getUserProfile(uidOrHandle: string): Promise<UserProfile | null> {
  const cleanKey = uidOrHandle.trim().toLowerCase().replace('@', '');
  try {
    // 1. Try direct UID doc fetch
    const userRef = doc(db, 'users', uidOrHandle);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      return snap.data() as UserProfile;
    }

    // 2. Try handles registry doc
    const handleRef = doc(db, 'handles', cleanKey);
    const handleSnap = await getDoc(handleRef);
    if (handleSnap.exists()) {
      const { uid } = handleSnap.data() as { uid: string };
      if (uid) {
        const linkedUserRef = doc(db, 'users', uid);
        const linkedUserSnap = await getDoc(linkedUserRef);
        if (linkedUserSnap.exists()) {
          return linkedUserSnap.data() as UserProfile;
        }
      }
    }
    return null;
  } catch (error) {
    console.warn(`Profile for ${uidOrHandle} not found or inaccessible:`, error);
    return null;
  }
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
