import {
  AttemptRecord,
  Exam,
  ExamsDataset,
  Question,
  QuestionExposureStats,
} from '../types';
import rawData from '../data/examsData.json';

export const examsDataset = rawData as unknown as ExamsDataset;

export const allQuestions: Question[] = examsDataset.exams.flatMap((e) => e.questions);

export const questionById: Record<string, Question> = Object.fromEntries(
  allQuestions.map((q) => [q.id, q])
);

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
  try {
    const raw = localStorage.getItem(QUESTION_EXPOSURE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveQuestionExposureMap(map: Record<string, number>): void {
  localStorage.setItem(QUESTION_EXPOSURE_KEY, JSON.stringify(map));
}

export function recordQuestionsExposure(qIds: string[]): void {
  if (!qIds || qIds.length === 0) return;
  const current = loadQuestionExposureMap();
  for (const id of qIds) {
    current[id] = (current[id] || 0) + 1;
  }
  saveQuestionExposureMap(current);
}

export function resetQuestionsExposure(): void {
  localStorage.removeItem(QUESTION_EXPOSURE_KEY);
}

export function getExposureStats(): QuestionExposureStats {
  const map = loadQuestionExposureMap();
  const totalQuestions = allQuestions.length;
  const counts = allQuestions.map((q) => map[q.id] || 0);

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
      const pool = allQuestions.filter((q) => !existingIds.has(q.id));
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
    const chPool = allQuestions.filter((q) => q.chapter === ch);
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
  localStorage.setItem(ATTEMPTS_KEY, JSON.stringify(next));
  return next;
}

export function clearAttempts(): void {
  localStorage.removeItem(ATTEMPTS_KEY);
}

export function loadBookmarks(): string[] {
  try {
    const raw = localStorage.getItem(BOOKMARKS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveBookmarks(ids: string[]): void {
  localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(Array.from(new Set(ids))));
}

export function loadWrongIds(): string[] {
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
  localStorage.setItem(WRONG_IDS_KEY, JSON.stringify(next));
  return next;
}

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

