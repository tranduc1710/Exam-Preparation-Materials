import {
  AttemptRecord,
  LanguageMode,
  QuestionExposureStats,
  QuestionSetMode,
  QuizMode,
  UserProfile,
  UserProgressData,
} from '../types';

const API_BASE = '/api';
const DB_NAME = 'ISTQB_CTFL_DB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_PROGRESS = 'progress';

const ACTIVE_USER_KEY = 'istqb_ctfl_active_user_v1';
export const DEFAULT_USERNAME = 'Học viên 1';

// Legacy localStorage keys for automatic one-time migration to server DB
const LEGACY_ATTEMPTS_KEY = 'istqb_ctfl_attempts_v1';
const LEGACY_BOOKMARKS_KEY = 'istqb_ctfl_bookmarks_v1';
const LEGACY_WRONG_IDS_KEY = 'istqb_ctfl_wrong_ids_v1';
const LEGACY_EXPOSURE_KEY = 'istqb_ctfl_question_exposure_v1';

let _dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== null;
}

export function getDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB is not supported in this browser.'));
  }

  if (_dbPromise) return _dbPromise;

  _dbPromise = new Promise((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      if (!db.objectStoreNames.contains(STORE_PROFILES)) {
        const profileStore = db.createObjectStore(STORE_PROFILES, { keyPath: 'username' });
        profileStore.createIndex('lastActiveAt', 'lastActiveAt', { unique: false });
      }

      if (!db.objectStoreNames.contains(STORE_PROGRESS)) {
        db.createObjectStore(STORE_PROGRESS, { keyPath: 'username' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Failed to open IndexedDB.'));
  });

  return _dbPromise;
}

/**
 * Normalizes username input: trims spaces
 */
export function sanitizeUsername(raw: string): string {
  return (raw || '').trim().replace(/\s+/g, ' ');
}

export function getActiveUsername(): string | null {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    if (saved && saved.trim()) return sanitizeUsername(saved);
  } catch {
    // ignore
  }
  return null;
}

export function setActiveUsername(username: string): void {
  const clean = sanitizeUsername(username);
  if (!clean) return;
  try {
    localStorage.setItem(ACTIVE_USER_KEY, clean);
  } catch {
    // ignore
  }
}

export function clearActiveUsername(): void {
  try {
    localStorage.removeItem(ACTIVE_USER_KEY);
  } catch {
    // ignore
  }
}

/**
 * Helper to read legacy data from localStorage if available
 */
function readLegacyLocalStorageData(): {
  attempts: AttemptRecord[];
  bookmarks: string[];
  wrongIds: string[];
  exposureMap: Record<string, number>;
} {
  try {
    const attemptsRaw = localStorage.getItem(LEGACY_ATTEMPTS_KEY);
    const bookmarksRaw = localStorage.getItem(LEGACY_BOOKMARKS_KEY);
    const wrongRaw = localStorage.getItem(LEGACY_WRONG_IDS_KEY);
    const exposureRaw = localStorage.getItem(LEGACY_EXPOSURE_KEY);

    return {
      attempts: attemptsRaw ? JSON.parse(attemptsRaw) : [],
      bookmarks: bookmarksRaw ? JSON.parse(bookmarksRaw) : [],
      wrongIds: wrongRaw ? JSON.parse(wrongRaw) : [],
      exposureMap: exposureRaw ? JSON.parse(exposureRaw) : {},
    };
  } catch {
    return { attempts: [], bookmarks: [], wrongIds: [], exposureMap: {} };
  }
}

// ================= Local Fallback Cache Helpers =================

async function cacheProfileLocally(profile: UserProfile): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    tx.objectStore(STORE_PROFILES).put(profile);
  } catch {
    // ignore
  }
}

async function cacheProgressLocally(progress: UserProgressData): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction(STORE_PROGRESS, 'readwrite');
    tx.objectStore(STORE_PROGRESS).put(progress);
  } catch {
    // ignore
  }
}

async function getLocalProfiles(): Promise<UserProfile[]> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROFILES, 'readonly');
      const req = tx.objectStore(STORE_PROFILES).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => resolve([]);
    });
  } catch {
    return [];
  }
}

async function getLocalProgress(username: string): Promise<UserProgressData | null> {
  try {
    const db = await getDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_PROGRESS, 'readonly');
      const req = tx.objectStore(STORE_PROGRESS).get(username);
      req.onsuccess = () => resolve((req.result as UserProgressData) || null);
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

async function removeLocalProfile(username: string): Promise<void> {
  try {
    const db = await getDB();
    const tx = db.transaction([STORE_PROFILES, STORE_PROGRESS], 'readwrite');
    tx.objectStore(STORE_PROFILES).delete(username);
    tx.objectStore(STORE_PROGRESS).delete(username);
  } catch {
    // ignore
  }
}

// ================= Debounced Server Progress Saving =================
let _saveTimeout: any = null;
let _pendingProgressToSave: UserProgressData | null = null;

async function flushPendingProgressSave(): Promise<void> {
  if (!_pendingProgressToSave) return;
  const progress = _pendingProgressToSave;
  _pendingProgressToSave = null;

  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(progress.username)}/progress`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(progress),
    });
    if (!res.ok) {
      console.warn(`[ServerDB] PUT progress returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[ServerDB] Failed to persist progress to server SQLite DB:', err);
  }
}

// Auto-flush on tab hide/close
if (typeof window !== 'undefined') {
  window.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingProgressSave();
    }
  });
  window.addEventListener('beforeunload', () => {
    flushPendingProgressSave();
  });
}

// ================= Public High-Level API (Server DB + Local Resilience) =================

/**
 * Sends a periodic heartbeat to server to maintain 'Online' status.
 * Returns the latest onlineCount if successful.
 */
export async function sendHeartbeat(username: string): Promise<number | null> {
  if (!username) return null;
  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(username)}/heartbeat`, {
      method: 'POST',
    });
    if (res.ok) {
      const data = await res.json();
      return typeof data.onlineCount === 'number' ? data.onlineCount : null;
    }
  } catch {
    // ignore
  }
  return null;
}

/**
 * Gets the current count of active online users without loading full profiles
 */
export async function getOnlineCount(): Promise<number> {
  try {
    const res = await fetch(`${API_BASE}/online-count`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      return typeof data.onlineCount === 'number' ? data.onlineCount : 1;
    }
  } catch {
    // ignore
  }
  return 1;
}

/**
 * Logs out user: informs server to mark offline immediately and clears local session
 */
export async function logoutUser(username: string): Promise<void> {
  const clean = sanitizeUsername(username);
  if (clean) {
    try {
      await fetch(`${API_BASE}/users/${encodeURIComponent(clean)}/logout`, {
        method: 'POST',
      });
    } catch {
      // ignore
    }
  }
  clearActiveUsername();
}

/**
 * Initializes database connection with the Server.
 * Requires user to log in if no active session is found in localStorage.
 */
export async function initUserDB(): Promise<{
  activeUser: string | null;
  profiles: UserProfile[];
  currentProgress: UserProgressData | null;
}> {
  let activeUser = getActiveUsername();

  try {
    // 1. Fetch profiles list from server
    const res = await fetch(`${API_BASE}/profiles`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const profiles: UserProfile[] = await res.json();

    for (const p of profiles) {
      cacheProfileLocally(p).catch(() => {});
    }

    if (!activeUser) {
      // Must log in first: do not auto-login
      return {
        activeUser: null,
        profiles,
        currentProgress: null,
      };
    }

    // Verify activeUser exists in profiles
    const existing = profiles.find((p) => p.username.toLowerCase() === activeUser!.toLowerCase());
    if (existing) {
      activeUser = existing.username;
      setActiveUsername(activeUser);

      // Send initial heartbeat to mark online
      sendHeartbeat(activeUser).catch(() => {});

      // Fetch user progress from server
      const currentProgress = await loadUserProgress(activeUser);
      cacheProgressLocally(currentProgress).catch(() => {});

      return {
        activeUser,
        profiles,
        currentProgress,
      };
    } else {
      // Stored user does not exist in server DB anymore
      clearActiveUsername();
      return {
        activeUser: null,
        profiles,
        currentProgress: null,
      };
    }
  } catch (serverErr) {
    console.warn('[ServerDB] Cannot reach server DB, using local cache fallback:', serverErr);

    // Offline / Local fallback mode
    const localProfiles = await getLocalProfiles();
    if (!activeUser) {
      return {
        activeUser: null,
        profiles: localProfiles,
        currentProgress: null,
      };
    }

    const matched = localProfiles.find(
      (p) => p.username.toLowerCase() === activeUser!.toLowerCase()
    );
    if (matched) {
      activeUser = matched.username;
      setActiveUsername(activeUser);
      const cachedProgress = await getLocalProgress(activeUser);
      return {
        activeUser,
        profiles: localProfiles,
        currentProgress: cachedProgress,
      };
    }

    clearActiveUsername();
    return {
      activeUser: null,
      profiles: localProfiles,
      currentProgress: null,
    };
  }
}

/**
 * Gets all user profiles stored in DB
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  try {
    const res = await fetch(`${API_BASE}/profiles`, { cache: 'no-store' });
    if (res.ok) {
      const list: UserProfile[] = await res.json();
      return list;
    }
  } catch (err) {
    console.warn('[ServerDB] getAllProfiles fallback to local:', err);
  }

  return await getLocalProfiles();
}

/**
 * Logs in or creates a profile by raw username (no password needed).
 * If user exists on server, updates lastActiveAt and loads their progress.
 * If user does not exist, server creates profile and fresh progress in SQLite.
 */
export async function loginOrCreateUser(rawUsername: string): Promise<{
  profile: UserProfile;
  progress: UserProgressData;
  isNew: boolean;
}> {
  const cleanUsername = sanitizeUsername(rawUsername);
  if (!cleanUsername) {
    throw new Error('Vui lòng nhập tên tài khoản.');
  }

  try {
    const res = await fetch(`${API_BASE}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: cleanUsername }),
    });

    if (res.ok) {
      const data: { profile: UserProfile; progress: UserProgressData; isNew: boolean } =
        await res.json();
      setActiveUsername(data.profile.username);
      await cacheProfileLocally(data.profile);
      await cacheProgressLocally(data.progress);
      sendHeartbeat(data.profile.username).catch(() => {});
      return data;
    }
  } catch (err) {
    console.warn('[ServerDB] loginOrCreateUser server unreachable, falling back locally:', err);
  }

  // Local fallback
  setActiveUsername(cleanUsername);
  const now = new Date().toISOString();
  const existingProgress = await getLocalProgress(cleanUsername);

  const profile: UserProfile = {
    username: cleanUsername,
    displayName: cleanUsername,
    createdAt: now,
    lastActiveAt: now,
    isOnline: true,
  };
  const progress: UserProgressData = existingProgress || {
    username: cleanUsername,
    attempts: [],
    bookmarks: [],
    wrongIds: [],
    exposureMap: {},
    updatedAt: now,
  };

  await cacheProfileLocally(profile);
  await cacheProgressLocally(progress);

  return { profile, progress, isNew: !existingProgress };
}

/**
 * Loads user progress by username from server SQLite DB
 */
export async function loadUserProgress(username: string): Promise<UserProgressData> {
  const clean = sanitizeUsername(username);

  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(clean)}/progress`, {
      cache: 'no-store',
    });
    if (res.ok) {
      const data: UserProgressData = await res.json();
      await cacheProgressLocally(data);
      return data;
    }
  } catch (err) {
    console.warn('[ServerDB] loadUserProgress fallback to local cache:', err);
  }

  const local = await getLocalProgress(clean);
  if (local) return local;

  const legacy = readLegacyLocalStorageData();
  return {
    username: clean,
    attempts: legacy.attempts,
    bookmarks: legacy.bookmarks,
    wrongIds: legacy.wrongIds,
    exposureMap: legacy.exposureMap,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Saves entire user progress to server SQLite DB.
 * Uses 300ms debounce to avoid high-frequency network requests while instantly caching locally.
 */
export async function saveUserProgress(progress: UserProgressData): Promise<void> {
  progress.updatedAt = new Date().toISOString();

  // Queue server SQLite persist & local cache with 800ms debounce
  _pendingProgressToSave = progress;
  if (_saveTimeout) clearTimeout(_saveTimeout);

  _saveTimeout = setTimeout(() => {
    flushPendingProgressSave();
    cacheProgressLocally(progress).catch(() => {});
  }, 800);
}

/**
 * Resets learning progress for a specific user:
 * Clears attempts, wrong questions, and fair question exposure map.
 * Preserves or clears bookmarks according to keepBookmarks.
 * Saved directly to Server SQLite DB.
 */
export async function resetUserLearningProgress(
  username: string,
  keepBookmarks: boolean = false
): Promise<UserProgressData> {
  const clean = sanitizeUsername(username);

  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(clean)}/reset`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ keepBookmarks }),
    });

    if (res.ok) {
      const updated: UserProgressData = await res.json();
      await cacheProgressLocally(updated);
      return updated;
    }
  } catch (err) {
    console.warn('[ServerDB] resetUserLearningProgress fallback to local update:', err);
  }

  // Fallback update
  const current = await loadUserProgress(clean);
  const updatedProgress: UserProgressData = {
    ...current,
    username: clean,
    attempts: [],
    wrongIds: [],
    exposureMap: {},
    bookmarks: keepBookmarks ? current.bookmarks : [],
    updatedAt: new Date().toISOString(),
  };

  await cacheProgressLocally(updatedProgress);
  await saveUserProgress(updatedProgress);
  return updatedProgress;
}

/**
 * Deletes a user profile and all their progress data from server SQLite DB.
 */
export async function deleteUserProfile(
  username: string
): Promise<{ remaining: UserProfile[]; nextActiveUser: string | null }> {
  const clean = sanitizeUsername(username);
  const currentActive = getActiveUsername();

  try {
    const res = await fetch(`${API_BASE}/users/${encodeURIComponent(clean)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      console.warn(`[ServerDB] DELETE user returned ${res.status}`);
    }
  } catch (err) {
    console.warn('[ServerDB] deleteUserProfile network error:', err);
  }

  await removeLocalProfile(clean);

  const remaining = await getAllProfiles();
  let nextActive = currentActive;

  if (currentActive && currentActive.toLowerCase() === clean.toLowerCase()) {
    nextActive = null;
    clearActiveUsername();
  }

  return { remaining, nextActiveUser: nextActive };
}
