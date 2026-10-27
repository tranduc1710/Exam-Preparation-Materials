export type OptionKey = 'a' | 'b' | 'c' | 'd';

export type LanguageMode = 'en' | 'vi' | 'bilingual';

export type KLevel = 'K1' | 'K2' | 'K3';

export interface Question {
  id: string;
  examId: number;
  examTitle: string;
  order: number;
  label: string;
  originalLabel: string;
  isSupplementary: boolean;
  isV4: boolean;
  kLevel?: KLevel;
  question: string;
  questionVi?: string;
  images: string[];
  imagesVi?: string[];
  options: Record<OptionKey, string>;
  optionsVi?: Record<OptionKey, string>;
  correctAnswer: OptionKey;
  explanation: string;
  explanationShort?: string;
  knowledge: string;
  chapter: number;
  chapterTitle: string;
}

export interface Exam {
  id: number;
  title: string;
  shortTitle: string;
  pdfFileName: string;
  pdfUrl: string;
  pdfViFileName?: string;
  pdfViUrl?: string;
  questionCount: number;
  regularCount: number;
  supplementaryCount: number;
  imageCount: number;
  questions: Question[];
}

export interface ChapterMeta {
  chapter: number;
  title: string;
  questionCount: number;
}

export interface ExamsDataset {
  metadata: {
    title: string;
    author: string;
    totalExams: number;
    totalQuestions: number;
    totalImages: number;
    totalViImages?: number;
    standardQuestionCount: number;
    passPercentage: number;
    passScoreOn40: number;
    durationsMinutes: number[];
    chapters: ChapterMeta[];
  };
  exams: Exam[];
}

export type QuizMode = 'exam' | 'practice';

export type QuestionSetMode = 'original' | 'standard40';

export interface QuizConfig {
  title: string;
  subtitle: string;
  mode: QuizMode;
  durationMinutes: number; // 60 | 75 | 90 | 0 (untimed)
  questions: Question[];
  sourceType: 'exam' | 'mock40' | 'fresher40' | 'chapter' | 'wrong' | 'bookmarked' | 'v4';
  examId?: number;
}

export interface AttemptRecord {
  id: string;
  title: string;
  subtitle: string;
  mode: QuizMode;
  sourceType: QuizConfig['sourceType'];
  examId?: number;
  timestamp: string;
  durationSeconds: number;
  timeLimitMinutes: number;
  totalQuestions: number;
  correctCount: number;
  answeredCount: number;
  scorePercentage: number;
  passed: boolean;
  requiredCorrect: number;
  userAnswers: Record<string, OptionKey>;
  flaggedIds: string[];
  questionIds: string[];
}
