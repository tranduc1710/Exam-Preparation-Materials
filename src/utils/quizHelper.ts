import { AttemptRecord, Exam, ExamsDataset, KLevel, Question } from '../types';
import rawData from '../data/examsData.json';

export const examsDataset = rawData as unknown as ExamsDataset;

export const allQuestions: Question[] = examsDataset.exams.flatMap((e) => e.questions);

export const questionById: Record<string, Question> = Object.fromEntries(
  allQuestions.map((q) => [q.id, q])
);

const ATTEMPTS_KEY = 'istqb_ctfl_attempts_v1';
const BOOKMARKS_KEY = 'istqb_ctfl_bookmarks_v1';
const WRONG_IDS_KEY = 'istqb_ctfl_wrong_ids_v1';

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

export const K_LEVEL_INFO: Record<
  KLevel,
  {
    label: string;
    shortName: string;
    vietnameseName: string;
    description: string;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
  }
> = {
  K1: {
    label: 'K1 – Nhớ (Remember)',
    shortName: 'K1',
    vietnameseName: 'Ghi nhớ lý thuyết',
    description: 'Nhớ định nghĩa, thuật ngữ, khái niệm cơ bản và nhận diện nội dung',
    badgeBg: 'bg-amber-50',
    badgeText: 'text-amber-800',
    badgeBorder: 'border-amber-200',
  },
  K2: {
    label: 'K2 – Hiểu (Understand)',
    shortName: 'K2',
    vietnameseName: 'Hiểu & phân tích',
    description: 'Giải thích, so sánh, phân biệt và lựa chọn cách hiểu đúng trong tình huống',
    badgeBg: 'bg-blue-50',
    badgeText: 'text-blue-800',
    badgeBorder: 'border-blue-200',
  },
  K3: {
    label: 'K3 – Áp dụng (Apply)',
    shortName: 'K3',
    vietnameseName: 'Kỹ năng vận dụng',
    description: 'Tính toán, áp dụng kỹ thuật kiểm thử (EP, BVA, Decision Table, State Transition, Coverage)',
    badgeBg: 'bg-emerald-50',
    badgeText: 'text-emerald-800',
    badgeBorder: 'border-emerald-200',
  },
};

// Official CTFL v4.0 Mock (K1=8, K2=24, K3=8 across 6 chapters)
export const OFFICIAL_K_DISTRIBUTION: Record<number, Record<KLevel, number>> = {
  1: { K1: 2, K2: 6, K3: 0 },
  2: { K1: 2, K2: 4, K3: 0 },
  3: { K1: 1, K2: 3, K3: 0 },
  4: { K1: 0, K2: 3, K3: 8 },
  5: { K1: 2, K2: 7, K3: 0 },
  6: { K1: 1, K2: 1, K3: 0 },
};

// Fresher Assessment Mock (K1=8, K2=23, K3=9 - focused on assessing Fresher/Junior skills)
export const FRESHER_K_DISTRIBUTION: Record<number, Record<KLevel, number>> = {
  1: { K1: 2, K2: 6, K3: 0 },
  2: { K1: 2, K2: 4, K3: 0 },
  3: { K1: 1, K2: 3, K3: 0 },
  4: { K1: 0, K2: 3, K3: 8 },
  5: { K1: 2, K2: 6, K3: 1 },
  6: { K1: 1, K2: 1, K3: 0 },
};

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function buildExamQuestionSet(
  exam: Exam,
  setMode: 'original' | 'standard40',
  shuffle: boolean
): Question[] {
  let result: Question[] = [...exam.questions];

  if (setMode === 'standard40') {
    if (result.length > 40) {
      // Keep all regular questions first, then slice up to 40
      result = result.slice(0, 40);
    } else if (result.length < 40) {
      const existingIds = new Set(result.map((q) => q.id));
      const chCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0 };
      result.forEach((q) => {
        chCounts[q.chapter] = (chCounts[q.chapter] || 0) + 1;
      });

      // Calculate chapter deficits against official weights
      const deficits: Record<number, number> = {};
      for (const [chStr, target] of Object.entries(ISTQB_CHAPTER_WEIGHTS)) {
        const ch = Number(chStr);
        deficits[ch] = Math.max(0, target - (chCounts[ch] || 0));
      }

      // Fill from chapters with highest deficits first
      const sortedChs = Object.keys(deficits)
        .map(Number)
        .sort((a, b) => deficits[b] - deficits[a]);

      for (const ch of sortedChs) {
        if (result.length >= 40) break;
        const need = deficits[ch];
        if (need > 0) {
          const candidates = shuffleArray(
            allQuestions.filter((q) => q.chapter === ch && !existingIds.has(q.id))
          );
          const take = candidates.slice(0, Math.min(need, 40 - result.length));
          take.forEach((q) => {
            existingIds.add(q.id);
            result.push(q);
          });
        }
      }

      // If still under 40 due to local pool exhaustion, fill with remaining pool
      if (result.length < 40) {
        const remaining = shuffleArray(allQuestions.filter((q) => !existingIds.has(q.id)));
        result.push(...remaining.slice(0, 40 - result.length));
      }
    }
  }

  return shuffle ? shuffleArray(result) : result;
}

export function generateMockByMatrix(
  distribution: Record<number, Record<KLevel, number>>
): Question[] {
  const selected: Question[] = [];
  for (const [chStr, kObj] of Object.entries(distribution)) {
    const ch = Number(chStr);
    for (const [kStr, needed] of Object.entries(kObj)) {
      if (needed <= 0) continue;
      const k = kStr as KLevel;
      const chPool = shuffleArray(
        allQuestions.filter((q) => q.chapter === ch && q.kLevel === k)
      );
      if (chPool.length >= needed) {
        selected.push(...chPool.slice(0, needed));
      } else {
        // Fallback: take all available of this kLevel, then fill from same chapter
        selected.push(...chPool);
        const diff = needed - chPool.length;
        const fallbackPool = shuffleArray(
          allQuestions.filter(
            (q) => q.chapter === ch && !selected.some((s) => s.id === q.id)
          )
        );
        selected.push(...fallbackPool.slice(0, diff));
      }
    }
  }
  return shuffleArray(selected);
}

export function generateOfficialMock40(): Question[] {
  return generateMockByMatrix(OFFICIAL_K_DISTRIBUTION);
}

export function generateFresherMock40(): Question[] {
  return generateMockByMatrix(FRESHER_K_DISTRIBUTION);
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

