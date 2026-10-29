import {
  AttemptRecord,
  Exam,
  ExamsDataset,
  Question,
  QuestionExposureStats,
  UserProgressData,
} from '../types';
import { saveUserProgress } from './db';

// Dataset is NOT bundled into the JS anymore: App fetches it at runtime from
// /data/examsData.json (public/data/examsData.json) and calls initDataset()
// before rendering any data-dependent UI. Keeping it out of the bundle keeps
// the initial JS small and lets the web server gzip + cache the JSON on its own.
let _examsDataset: ExamsDataset | null = null;
let _allQuestions: Question[] = [];
let _questionById: Record<string, Question> = {};

let _activeUserProgress: UserProgressData | null = null;

export function setActiveUserProgress(progress: UserProgressData | null): void {
  _activeUserProgress = progress;
  if (progress) {
    try {
      localStorage.setItem(QUESTION_EXPOSURE_KEY, JSON.stringify(progress.exposureMap || {}));
      localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(progress.attempts || []));
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(progress.bookmarks || []));
      localStorage.setItem(WRONG_IDS_KEY, JSON.stringify(progress.wrongIds || []));
    } catch {
      // ignore
    }
  }
}

export function getActiveUserProgress(): UserProgressData | null {
  return _activeUserProgress;
}

export function initDataset(data: ExamsDataset): void {
  _examsDataset = data;
  _allQuestions = data.exams.flatMap((e) => e.questions);
  _questionById = Object.fromEntries(_allQuestions.map((q) => [q.id, q]));
}

export function getExamsDataset(): ExamsDataset {
  if (!_examsDataset) {
    throw new Error('Exams dataset has not been loaded yet (initDataset not called).');
  }
  return _examsDataset;
}

export function getAllQuestions(): Question[] {
  return _allQuestions;
}

export function getQuestionById(id: string): Question {
  return _questionById[id];
}

const ATTEMPTS_KEY = 'istqb_ctfl_attempts_v1';
const BOOKMARKS_KEY = 'istqb_ctfl_bookmarks_v1';
const WRONG_IDS_KEY = 'istqb_ctfl_wrong_ids_v1';
const QUESTION_EXPOSURE_KEY = 'istqb_ctfl_question_exposure_v1';

// Official ISTQB CTFL 40-question distribution across 6 chapters
export const ISTQB_CHAPTER_WEIGHTS: Record<number, number> = {
  1: 8,
  2: 6,
  3: 4,
  4: 11,
  5: 9,
  6: 2,
};

export const CHAPTER_SHORT_NAMES: Record<number, string> = {
  1: 'Ch.1: Nền tảng kiểm thử',
  2: 'Ch.2: Kiểm thử trong SDLC',
  3: 'Ch.3: Kiểm thử tĩnh',
  4: 'Ch.4: Phân tích & Thiết kế',
  5: 'Ch.5: Quản lý kiểm thử',
  6: 'Ch.6: Công cụ kiểm thử',
};

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function loadQuestionExposureMap(): Record<string, number> {
  if (_activeUserProgress?.exposureMap) {
    return _activeUserProgress.exposureMap;
  }
  try {
    const raw = localStorage.getItem(QUESTION_EXPOSURE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveQuestionExposureMap(map: Record<string, number>): void {
  if (_activeUserProgress) {
    _activeUserProgress.exposureMap = map;
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.setItem(QUESTION_EXPOSURE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

export function recordQuestionsExposure(qIds: string[]): void {
  if (!qIds || qIds.length === 0) return;
  const current = { ...loadQuestionExposureMap() };
  for (const id of qIds) {
    current[id] = (current[id] || 0) + 1;
  }
  saveQuestionExposureMap(current);
}

export function resetQuestionsExposure(): void {
  if (_activeUserProgress) {
    _activeUserProgress.exposureMap = {};
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.removeItem(QUESTION_EXPOSURE_KEY);
  } catch {
    // ignore
  }
}

export function getExposureStats(customMap?: Record<string, number>): QuestionExposureStats {
  const map = customMap || loadQuestionExposureMap();
  const totalQuestions = _allQuestions.length;
  const counts = _allQuestions.map((q) => map[q.id] || 0);

  const minSeen = counts.length > 0 ? Math.min(...counts) : 0;
  const maxSeen = counts.length > 0 ? Math.max(...counts) : 0;
  const currentRound = minSeen + 1;

  const coveredCount = counts.filter((c) => c > 0).length;
  const coveragePercentage =
    totalQuestions > 0 ? Math.round((coveredCount / totalQuestions) * 100) : 0;

  return {
    totalQuestions,
    coveredCount,
    coveragePercentage,
    minSeen,
    maxSeen,
    currentRound,
  };
}

/**
 * Fair Random Selection (Shuffle-Bag / Starvation-Free Algorithm):
 * Đảm bảo 100% tất cả các câu hỏi trong ngân hàng đều được rút ngẫu nhiên với tần suất bằng nhau.
 * - Các câu hỏi chưa từng xuất hiện hoặc có số lần xuất hiện ít nhất sẽ được ưu tiên bốc trước.
 * - Các câu cùng số lần xuất hiện được xáo trộn ngẫu nhiên (Fisher-Yates).
 * - Triệt tiêu hoàn toàn trường hợp câu thì xuất hiện nhiều lần, câu thì mãi không được bốc tới.
 */
export function fairSelectQuestions<T extends Question>(
  candidates: T[],
  count: number
): T[] {
  if (candidates.length <= count) {
    return shuffleArray(candidates);
  }

  const exposureMap = loadQuestionExposureMap();

  const tagged = candidates.map((q) => ({
    question: q,
    seen: exposureMap[q.id] || 0,
    rand: Math.random(),
  }));

  tagged.sort((a, b) => {
    if (a.seen !== b.seen) return a.seen - b.seen;
    return a.rand - b.rand;
  });

  const selected = tagged.slice(0, count).map((t) => t.question);
  return shuffleArray(selected);
}

export function buildExamQuestionSet(
  exam: Exam,
  setMode: 'original' | 'standard40',
  shuffle: boolean
): Question[] {
  let result: Question[] = [...exam.questions];

  if (setMode === 'standard40') {
    if (result.length > 40) {
      // Keep all regular questions first, then supplementary up to 40
      result = result.slice(0, 40);
    } else if (result.length < 40) {
      const needed = 40 - result.length;
      const existingIds = new Set(result.map((q) => q.id));
      const pool = _allQuestions.filter((q) => !existingIds.has(q.id));
      const additional = fairSelectQuestions(pool, needed);
      result = [...result, ...additional];
    }
  }

  return shuffle ? shuffleArray(result) : result;
}

export function generateOfficialMock40(autoRecord: boolean = true): Question[] {
  const selected: Question[] = [];
  for (const [chStr, count] of Object.entries(ISTQB_CHAPTER_WEIGHTS)) {
    const ch = Number(chStr);
    const chPool = _allQuestions.filter((q) => q.chapter === ch);
    const chSelected = fairSelectQuestions(chPool, count);
    selected.push(...chSelected);
  }
  const result = shuffleArray(selected);
  if (autoRecord) {
    recordQuestionsExposure(result.map((q) => q.id));
  }
  return result;
}


export function loadAttempts(): AttemptRecord[] {
  if (_activeUserProgress?.attempts) {
    return _activeUserProgress.attempts;
  }
  try {
    const raw = localStorage.getItem(ATTEMPTS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAttempt(attempt: AttemptRecord): AttemptRecord[] {
  const current = loadAttempts();
  const next = [attempt, ...current].slice(0, 100);
  if (_activeUserProgress) {
    _activeUserProgress.attempts = next;
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function clearAttempts(): void {
  if (_activeUserProgress) {
    _activeUserProgress.attempts = [];
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.removeItem(ATTEMPTS_KEY);
  } catch {
    // ignore
  }
}

export function loadBookmarks(): string[] {
  if (_activeUserProgress?.bookmarks) {
    return _activeUserProgress.bookmarks;
  }
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(ids: string[]): void {
  const unique = Array.from(new Set(ids));
  if (_activeUserProgress) {
    _activeUserProgress.bookmarks = unique;
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(unique));
  } catch {
    // ignore
  }
}

export function loadWrongIds(): string[] {
  if (_activeUserProgress?.wrongIds) {
    return _activeUserProgress.wrongIds;
  }
  try {
    const raw = localStorage.getItem(WRONG_IDS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function updateWrongIdsAfterQuiz(
  questions: Question[],
  userAnswers: Record<string, string>
): string[] {
  const currentSet = new Set(loadWrongIds());
  for (const q of questions) {
    const ans = userAnswers[q.id];
    if (ans && ans !== q.correctAnswer) {
      currentSet.add(q.id);
    } else if (ans && ans === q.correctAnswer) {
      // Remove from wrong list if answered right!
      currentSet.delete(q.id);
    }
  }
  const next = Array.from(currentSet);
  if (_activeUserProgress) {
    _activeUserProgress.wrongIds = next;
    saveUserProgress(_activeUserProgress).catch(console.error);
  }
  try {
    localStorage.setItem(WRONG_IDS_KEY, JSON.stringify(next));
  } catch {
    // ignore
  }
  return next;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

