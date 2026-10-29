import {
  AttemptRecord,
  LanguageMode,
  QuestionExposureStats,
  QuestionSetMode,
  QuizMode,
  UserProfile,
  UserProgressData,
} from '../types';

const DB_NAME = 'ISTQB_CTFL_DB';
const DB_VERSION = 1;
const STORE_PROFILES = 'profiles';
const STORE_PROGRESS = 'progress';

const ACTIVE_USER_KEY = 'istqb_ctfl_active_user_v1';
export const DEFAULT_USERNAME = 'Học viên 1';

// Legacy localStorage keys for automatic one-time migration
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

    request.onsuccess = () => {
      resolve(request.result);
    };

    request.onerror = () => {
      reject(request.error || new Error('Failed to open IndexedDB.'));
    };
  });

  return _dbPromise;
}

/**
 * Normalizes username input: trims spaces, falls back to default if empty
 */
export function sanitizeUsername(raw: string): string {
  const trimmed = (raw || '').trim().replace(/\s+/g, ' ');
  return trimmed.length > 0 ? trimmed : DEFAULT_USERNAME;
}

export function getActiveUsername(): string {
  try {
    const saved = localStorage.getItem(ACTIVE_USER_KEY);
    if (saved && saved.trim()) return sanitizeUsername(saved);
  } catch {
    // ignore
  }
  return DEFAULT_USERNAME;
}

export function setActiveUsername(username: string): void {
  const clean = sanitizeUsername(username);
  try {
    localStorage.setItem(ACTIVE_USER_KEY, clean);
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

/**
 * Initializes the database: ensures default user profile and migrates any legacy localStorage data.
 */
export async function initUserDB(): Promise<{
  activeUser: string;
  profiles: UserProfile[];
  currentProgress: UserProgressData;
}> {
  let activeUser = getActiveUsername();

  try {
    const db = await getDB();
    const profiles = await getAllProfilesFromDB(db);

    if (profiles.length === 0) {
      // First run: migrate legacy localStorage data to default profile
      const legacy = readLegacyLocalStorageData();
      const now = new Date().toISOString();
      const defaultProfile: UserProfile = {
        username: activeUser,
        displayName: activeUser,
        createdAt: now,
        lastActiveAt: now,
      };

      const defaultProgress: UserProgressData = {
        username: activeUser,
        attempts: legacy.attempts,
        bookmarks: legacy.bookmarks,
        wrongIds: legacy.wrongIds,
        exposureMap: legacy.exposureMap,
        updatedAt: now,
      };

      await saveProfileToDB(db, defaultProfile);
      await saveProgressToDB(db, defaultProgress);

      return {
        activeUser,
        profiles: [defaultProfile],
        currentProgress: defaultProgress,
      };
    }

    // Ensure activeUser exists in profiles, otherwise pick first profile
    const existing = profiles.find((p) => p.username.toLowerCase() === activeUser.toLowerCase());
    if (existing) {
      activeUser = existing.username;
      setActiveUsername(activeUser);
    } else {
      activeUser = profiles[0].username;
      setActiveUsername(activeUser);
    }

    const currentProgress = await getProgressFromDB(db, activeUser);
    return {
      activeUser,
      profiles,
      currentProgress,
    };
  } catch (err) {
    console.warn('IndexedDB unavailable, falling back to in-memory/localStorage profile mode:', err);
    // Fallback: localStorage-only mode
    const legacy = readLegacyLocalStorageData();
    const now = new Date().toISOString();
    const fallbackProfile: UserProfile = {
      username: activeUser,
      displayName: activeUser,
      createdAt: now,
      lastActiveAt: now,
    };
    const fallbackProgress: UserProgressData = {
      username: activeUser,
      attempts: legacy.attempts,
      bookmarks: legacy.bookmarks,
      wrongIds: legacy.wrongIds,
      exposureMap: legacy.exposureMap,
      updatedAt: now,
    };

    return {
      activeUser,
      profiles: [fallbackProfile],
      currentProgress: fallbackProgress,
    };
  }
}

// ================= IndexedDB Low-level Helpers =================

function getAllProfilesFromDB(db: IDBDatabase): Promise<UserProfile[]> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readonly');
    const store = tx.objectStore(STORE_PROFILES);
    const req = store.getAll();

    req.onsuccess = () => {
      const list: UserProfile[] = req.result || [];
      // Sort newest active first
      list.sort(
        (a, b) => new Date(b.lastActiveAt).getTime() - new Date(a.lastActiveAt).getTime()
      );
      resolve(list);
    };
    req.onerror = () => reject(req.error);
  });
}

function saveProfileToDB(db: IDBDatabase, profile: UserProfile): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROFILES, 'readwrite');
    const store = tx.objectStore(STORE_PROFILES);
    const req = store.put(profile);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function getProgressFromDB(db: IDBDatabase, username: string): Promise<UserProgressData> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, 'readonly');
    const store = tx.objectStore(STORE_PROGRESS);
    const req = store.get(username);

    req.onsuccess = () => {
      if (req.result) {
        resolve(req.result as UserProgressData);
      } else {
        // Return blank progress
        const blank: UserProgressData = {
          username,
          attempts: [],
          bookmarks: [],
          wrongIds: [],
          exposureMap: {},
          updatedAt: new Date().toISOString(),
        };
        resolve(blank);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

function saveProgressToDB(db: IDBDatabase, progress: UserProgressData): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_PROGRESS, 'readwrite');
    const store = tx.objectStore(STORE_PROGRESS);
    const req = store.put(progress);

    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
}

function deleteProfileFromDB(db: IDBDatabase, username: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_PROFILES, STORE_PROGRESS], 'readwrite');
    tx.objectStore(STORE_PROFILES).delete(username);
    tx.objectStore(STORE_PROGRESS).delete(username);

    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

// ================= High-Level Public API =================

/**
 * Gets all user profiles stored in DB
 */
export async function getAllProfiles(): Promise<UserProfile[]> {
  try {
    const db = await getDB();
    return await getAllProfilesFromDB(db);
  } catch {
    return [
      {
        username: getActiveUsername(),
        displayName: getActiveUsername(),
        createdAt: new Date().toISOString(),
        lastActiveAt: new Date().toISOString(),
      },
    ];
  }
}

/**
 * Logs in or creates a profile by raw username (no password needed).
 * If user exists, updates lastActiveAt and loads their progress.
 * If user does not exist, creates profile and fresh progress.
 */
export async function loginOrCreateUser(rawUsername: string): Promise<{
  profile: UserProfile;
  progress: UserProgressData;
  isNew: boolean;
}> {
  const cleanUsername = sanitizeUsername(rawUsername);
  const now = new Date().toISOString();

  try {
    const db = await getDB();
    const profiles = await getAllProfilesFromDB(db);
    const existing = profiles.find(
      (p) => p.username.toLowerCase() === cleanUsername.toLowerCase()
    );

    if (existing) {
      existing.lastActiveAt = now;
      await saveProfileToDB(db, existing);
      setActiveUsername(existing.username);
      const progress = await getProgressFromDB(db, existing.username);

      return { profile: existing, progress, isNew: false };
    }

    // Create new profile
    const newProfile: UserProfile = {
      username: cleanUsername,
      displayName: cleanUsername,
      createdAt: now,
      lastActiveAt: now,
    };
    const newProgress: UserProgressData = {
      username: cleanUsername,
      attempts: [],
      bookmarks: [],
      wrongIds: [],
      exposureMap: {},
      updatedAt: now,
    };

    await saveProfileToDB(db, newProfile);
    await saveProgressToDB(db, newProgress);
    setActiveUsername(cleanUsername);

    return { profile: newProfile, progress: newProgress, isNew: true };
  } catch (err) {
    console.warn('Error in loginOrCreateUser:', err);
    setActiveUsername(cleanUsername);
    const fallbackProfile: UserProfile = {
      username: cleanUsername,
      displayName: cleanUsername,
      createdAt: now,
      lastActiveAt: now,
    };
    const fallbackProgress: UserProgressData = {
      username: cleanUsername,
      attempts: [],
      bookmarks: [],
      wrongIds: [],
      exposureMap: {},
      updatedAt: now,
    };
    return { profile: fallbackProfile, progress: fallbackProgress, isNew: true };
  }
}

/**
 * Loads user progress by username
 */
export async function loadUserProgress(username: string): Promise<UserProgressData> {
  const clean = sanitizeUsername(username);
  try {
    const db = await getDB();
    return await getProgressFromDB(db, clean);
  } catch {
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
}

/**
 * Saves entire user progress to DB
 */
export async function saveUserProgress(progress: UserProgressData): Promise<void> {
  progress.updatedAt = new Date().toISOString();
  try {
    const db = await getDB();
    await saveProgressToDB(db, progress);
  } catch (err) {
    console.warn('Could not save user progress to IndexedDB:', err);
  }
}

/**
 * Resets learning progress for a specific user:
 * Clears attempts, wrong questions, and fair question exposure map.
 * Optionally preserves or clears bookmarks.
 */
export async function resetUserLearningProgress(
  username: string,
  keepBookmarks: boolean = false
): Promise<UserProgressData> {
  const clean = sanitizeUsername(username);
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

  await saveUserProgress(updatedProgress);
  return updatedProgress;
}

/**
 * Deletes a user profile and all their progress data.
 */
export async function deleteUserProfile(
  username: string
): Promise<{ remaining: UserProfile[]; nextActiveUser: string }> {
  const clean = sanitizeUsername(username);
  const currentActive = getActiveUsername();

  try {
    const db = await getDB();
    await deleteProfileFromDB(db, clean);
    let remaining = await getAllProfilesFromDB(db);

    if (remaining.length === 0) {
      // Re-create default
      const res = await loginOrCreateUser(DEFAULT_USERNAME);
      remaining = [res.profile];
      setActiveUsername(DEFAULT_USERNAME);
      return { remaining, nextActiveUser: DEFAULT_USERNAME };
    }

    let nextActive = currentActive;
    if (currentActive.toLowerCase() === clean.toLowerCase()) {
      nextActive = remaining[0].username;
      setActiveUsername(nextActive);
    }

    return { remaining, nextActiveUser: nextActive };
  } catch (err) {
    console.warn('Failed to delete user profile from IndexedDB:', err);
    return { remaining: [], nextActiveUser: DEFAULT_USERNAME };
  }
}
