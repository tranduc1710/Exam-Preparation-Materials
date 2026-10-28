import React, { useState } from 'react';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  RotateCcw,
  Home,
  BookOpen,
  Bookmark,
  Flag,
  Filter,
  ZoomIn,
  X,
  Sparkles,
  Languages,
} from 'lucide-react';
import { AttemptRecord, LanguageMode, OptionKey, Question } from '../types';
import { CHAPTER_SHORT_NAMES, formatTime, questionById } from '../utils/quizHelper';

interface QuizResultProps {
  attempt: AttemptRecord;
  languageMode: LanguageMode;
  onChangeLanguageMode: (lang: LanguageMode) => void;
  bookmarks: string[];
  onToggleBookmark: (qId: string) => void;
  onRetryAll: () => void;
  onRetryWrong: (wrongQuestions: Question[]) => void;
  onBackHome: () => void;
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

type FilterMode = 'all' | 'wrong' | 'unanswered' | 'correct' | 'flagged';

export const QuizResult: React.FC<QuizResultProps> = ({
  attempt,
  languageMode,
  onChangeLanguageMode,
  bookmarks,
  onToggleBookmark,
  onRetryAll,
  onRetryWrong,
  onBackHome,
}) => {
  const [filter, setFilter] = useState<FilterMode>('all');
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const questions: Question[] = attempt.questionIds
    .map((id) => questionById[id])
    .filter(Boolean);

  const flaggedSet = new Set(attempt.flaggedIds);

  const wrongQuestions = questions.filter((q) => {
    const ans = attempt.userAnswers[q.id];
    return !ans || ans !== q.correctAnswer;
  });

  const strictWrongCount = questions.filter((q) => {
    const ans = attempt.userAnswers[q.id];
    return ans && ans !== q.correctAnswer;
  }).length;

  const unansweredCount = questions.filter((q) => !attempt.userAnswers[q.id]).length;

  // Chapter breakdown
  const chapterStats = [1, 2, 3, 4, 5, 6]
    .map((ch) => {
      const chQs = questions.filter((q) => q.chapter === ch);
      const chCorrect = chQs.filter(
        (q) => attempt.userAnswers[q.id] === q.correctAnswer
      ).length;
      return {
        chapter: ch,
        name: CHAPTER_SHORT_NAMES[ch],
        total: chQs.length,
        correct: chCorrect,
        pct: chQs.length > 0 ? Math.round((chCorrect / chQs.length) * 100) : 0,
      };
    })
    .filter((s) => s.total > 0);

  const filteredQuestions = questions.filter((q) => {
    const ans = attempt.userAnswers[q.id];
    if (filter === 'wrong') return ans && ans !== q.correctAnswer;
    if (filter === 'unanswered') return !ans;
    if (filter === 'correct') return ans === q.correctAnswer;
    if (filter === 'flagged') return flaggedSet.has(q.id);
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 sm:px-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Top Result Summary Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
          <div
            className={`px-6 sm:px-8 py-7 text-white flex flex-col md:flex-row md:items-center justify-between gap-6 ${
              attempt.passed
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600'
                : 'bg-gradient-to-r from-rose-600 to-orange-600'
            }`}
          >
            <div className="flex items-start sm:items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                {attempt.passed ? (
                  <Award className="w-9 h-9 text-white" />
                ) : (
                  <AlertCircle className="w-9 h-9 text-white" />
                )}
              </div>
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-0.5 rounded-full bg-white/20 text-xs font-bold uppercase tracking-wider mb-1.5">
                  {attempt.passed ? 'ĐẠT CHUẨN ISTQB (PASSED ≥ 65%)' : 'CHƯA ĐẠT (FAILED < 65%)'}
                </div>
                <h1 className="text-2xl sm:text-3xl font-extrabold">{attempt.title}</h1>
                <p className="text-white/85 text-sm mt-1">
                  Cần tối thiểu {attempt.requiredCorrect}/{attempt.totalQuestions} câu đúng (65%) để đỗ chứng chỉ ISTQB CTFL
                </p>
              </div>
            </div>

            <div className="bg-white/15 backdrop-blur-xs rounded-2xl px-6 py-4 text-center shrink-0 border border-white/20">
              <div className="text-3xl sm:text-4xl font-black">
                {attempt.correctCount} / {attempt.totalQuestions}
              </div>
              <div className="text-sm font-semibold text-white/90 mt-0.5">
                Đạt {attempt.scorePercentage}%
              </div>
            </div>
          </div>

          {/* Metrics Row */}
          <div className="p-6 sm:p-8 space-y-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200">
                <div className="text-xs font-semibold text-emerald-700 uppercase">Câu trả lời đúng</div>
                <div className="text-2xl font-bold text-emerald-900 mt-1">
                  {attempt.correctCount} câu
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200">
                <div className="text-xs font-semibold text-rose-700 uppercase">Câu trả lời sai</div>
                <div className="text-2xl font-bold text-rose-900 mt-1">
                  {strictWrongCount} câu
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200">
                <div className="text-xs font-semibold text-amber-700 uppercase">Chưa trả lời</div>
                <div className="text-2xl font-bold text-amber-900 mt-1">
                  {unansweredCount} câu
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200">
                <div className="text-xs font-semibold text-slate-600 uppercase flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" /> Thời gian làm
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
                  {formatTime(attempt.durationSeconds)}
                </div>
              </div>
            </div>

            {/* Chapter Performance Breakdown */}
            <div className="space-y-3">
              <h3 className="text-sm font-bold text-slate-800 uppercase tracking-wider">
                Phân tích kết quả theo Chương (Syllabus Chapters)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {chapterStats.map((st) => (
                  <div
                    key={st.chapter}
                    className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs font-semibold">
                      <span className="text-slate-800 truncate">{st.name}</span>
                      <span
                        className={
                          st.pct >= 65 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'
                        }
                      >
                        {st.correct}/{st.total} ({st.pct}%)
                      </span>
                    </div>
                    <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          st.pct >= 65 ? 'bg-emerald-500' : 'bg-rose-500'
                        }`}
                        style={{ width: `${st.pct}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
              <button
                type="button"
                onClick={onBackHome}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-sm transition cursor-pointer"
              >
                <Home className="w-4 h-4" />
                <span>Về danh sách đề</span>
              </button>

              <div className="flex flex-wrap items-center gap-3">
                {wrongQuestions.length > 0 && (
                  <button
                    type="button"
                    onClick={() => onRetryWrong(wrongQuestions)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Luyện lại {wrongQuestions.length} câu sai / chưa làm</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={onRetryAll}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Làm lại đề này</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Bar & Language Switcher for Detailed Review */}
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
            <Filter className="w-4 h-4 text-indigo-600" />
            <span>Xem chi tiết đáp án & giải thích:</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Language Switcher */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1" />
              {[
                { id: 'en', label: 'EN' },
                { id: 'vi', label: 'VI' },
                { id: 'bilingual', label: 'Song ngữ' },
              ].map((lang) => (
                <button
                  key={lang.id}
                  type="button"
                  onClick={() => onChangeLanguageMode(lang.id as LanguageMode)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-bold transition cursor-pointer ${
                    languageMode === lang.id
                      ? 'bg-indigo-600 text-white shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              {[
                { id: 'all', label: `Tất cả (${questions.length})` },
                { id: 'wrong', label: `Câu sai (${strictWrongCount})` },
                { id: 'unanswered', label: `Chưa làm (${unansweredCount})` },
                { id: 'correct', label: `Câu đúng (${attempt.correctCount})` },
                { id: 'flagged', label: `Gắn cờ (${flaggedSet.size})` },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFilter(tab.id as FilterMode)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer ${
                    filter === tab.id
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Questions Review List */}
        <div className="space-y-4">
          {filteredQuestions.map((q) => {
            const idx = questions.findIndex((item) => item.id === q.id);
            const userAns = attempt.userAnswers[q.id];
            const isCorrect = userAns === q.correctAnswer;
            const isFlagged = flaggedSet.has(q.id);
            const isBookmarked = bookmarks.includes(q.id);

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                {/* Header */}
                <div className="px-5 sm:px-6 py-3.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-white font-bold text-xs">
                      Câu {idx + 1}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-700 font-medium text-xs">
                      {q.examTitle} • {q.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium text-xs">
                      {CHAPTER_SHORT_NAMES[q.chapter]}
                    </span>
                    {isCorrect ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Đúng
                      </span>
                    ) : userAns ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-100 text-rose-800 font-bold text-xs">
                        <XCircle className="w-3.5 h-3.5" /> Sai (Chọn {userAns.toUpperCase()})
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-100 text-amber-800 font-bold text-xs">
                        Bỏ trống
                      </span>
                    )}
                    {isFlagged && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 border border-amber-300 text-xs font-semibold">
                        <Flag className="w-3 h-3 fill-amber-400 text-amber-500" /> Đã gắn cờ
                      </span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => onToggleBookmark(q.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isBookmarked
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isBookmarked ? 'fill-indigo-600 text-indigo-600' : ''
                      }`}
                    />
                    <span>{isBookmarked ? 'Đã lưu' : 'Lưu câu hỏi'}</span>
                  </button>
                </div>

                {/* Body */}
                <div className="p-5 sm:p-6 space-y-4">
                  <div className="space-y-2">
                    {(languageMode === 'en' || languageMode === 'bilingual') && (
                      <div className="text-slate-900 font-medium text-base leading-relaxed whitespace-pre-line">
                        {q.question}
                      </div>
                    )}
                    {(languageMode === 'vi' || languageMode === 'bilingual') && q.questionVi && (
                      <div
                        className={
                          languageMode === 'bilingual'
                            ? 'text-indigo-950 bg-indigo-50/60 border-l-4 border-indigo-500 pl-3.5 py-2 rounded-r-xl text-sm sm:text-base font-medium leading-relaxed whitespace-pre-line'
                            : 'text-slate-900 font-medium text-base leading-relaxed whitespace-pre-line'
                        }
                      >
                        {q.questionVi}
                      </div>
                    )}
                  </div>

                  {(q.images.length > 0 || (q.imagesVi && q.imagesVi.length > 0)) && (
                    <div className="space-y-2">
                      {(languageMode === 'en' || languageMode === 'bilingual') &&
                        q.images.map((imgSrc, i) => (
                          <div
                            key={`en-${i}`}
                            className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center"
                          >
                            {languageMode === 'bilingual' && (
                              <span className="self-start text-[11px] font-bold uppercase text-slate-500 mb-1">
                                Hình gốc tiếng Anh (EN):
                              </span>
                            )}
                            <img
                              src={imgSrc}
                              alt={`Hình câu ${idx + 1} (EN)`}
                              onClick={() => setZoomedImage(imgSrc)}
                              className="max-h-80 w-auto object-contain rounded-lg cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImage(imgSrc)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Phóng to hình
                            </button>
                          </div>
                        ))}

                      {(languageMode === 'vi' || languageMode === 'bilingual') &&
                        (q.imagesVi && q.imagesVi.length > 0
                          ? q.imagesVi
                          : languageMode === 'vi'
                          ? q.images
                          : []
                        ).map((imgSrc, i) => (
                          <div
                            key={`vi-${i}`}
                            className="bg-indigo-50/40 border border-indigo-200 rounded-xl p-3 flex flex-col items-center"
                          >
                            {languageMode === 'bilingual' && (
                              <span className="self-start text-[11px] font-bold uppercase text-indigo-700 mb-1">
                                Hình bản dịch tiếng Việt (VI):
                              </span>
                            )}
                            <img
                              src={imgSrc}
                              alt={`Hình câu ${idx + 1} (VI)`}
                              onClick={() => setZoomedImage(imgSrc)}
                              className="max-h-80 w-auto object-contain rounded-lg cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImage(imgSrc)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Phóng to hình
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  {/* Options */}
                  <div className="grid grid-cols-1 gap-2.5">
                    {OPTION_KEYS.map((optKey) => {
                      const isRight = q.correctAnswer === optKey;
                      const isUserPicked = userAns === optKey;
                      const optEn = q.options[optKey];
                      const optVi = q.optionsVi?.[optKey];

                      let rowClass = 'border-slate-200 bg-white text-slate-700';
                      let badgeClass = 'bg-slate-100 text-slate-700 border-slate-200';

                      if (isRight) {
                        rowClass =
                          'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium';
                        badgeClass = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isUserPicked && !isRight) {
                        rowClass = 'border-rose-400 bg-rose-50/70 text-rose-950';
                        badgeClass = 'bg-rose-600 text-white border-rose-600';
                      }

                      return (
                        <div
                          key={optKey}
                          className={`p-3.5 rounded-xl border flex items-start gap-3 text-sm sm:text-base ${rowClass}`}
                        >
                          <span
                            className={`w-7 h-7 rounded-lg border font-bold text-xs uppercase flex items-center justify-center shrink-0 mt-0.5 ${badgeClass}`}
                          >
                            {optKey}
                          </span>
                          <div className="flex-1 space-y-1">
                            {(languageMode === 'en' || languageMode === 'bilingual') && (
                              <div className="leading-relaxed whitespace-pre-line">{optEn}</div>
                            )}
                            {(languageMode === 'vi' || languageMode === 'bilingual') && optVi && (
                              <div
                                className={
                                  languageMode === 'bilingual'
                                    ? 'text-xs sm:text-sm text-indigo-900/85 italic leading-relaxed whitespace-pre-line'
                                    : 'leading-relaxed whitespace-pre-line'
                                }
                              >
                                {optVi}
                              </div>
                            )}
                          </div>
                          {isRight && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-700 shrink-0 mt-1">
                              <CheckCircle2 className="w-4 h-4" /> Đáp án đúng
                            </span>
                          )}
                          {isUserPicked && !isRight && (
                            <span className="inline-flex items-center gap-1 text-xs font-bold text-rose-700 shrink-0 mt-1">
                              <XCircle className="w-4 h-4" /> Bạn đã chọn
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Explanation */}
                  <div className="rounded-xl bg-indigo-50/60 border border-indigo-200 p-4 space-y-2 text-sm text-slate-800 leading-relaxed whitespace-pre-line">
                    {q.explanationShort && (
                      <div className="bg-white/80 border border-indigo-200/80 rounded-lg px-3 py-2 text-indigo-950 whitespace-pre-line">
                        <strong className="text-indigo-700">Tóm tắt nhanh: </strong>
                        {q.explanationShort}
                      </div>
                    )}
                    <div className="whitespace-pre-line">
                      <strong className="text-indigo-950">Giải thích chi tiết: </strong>
                      {q.explanation}
                    </div>
                    {q.knowledge && (
                      <div className="pt-2 border-t border-indigo-200/60 flex items-start gap-2 text-xs text-indigo-900 font-medium">
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Kiến thức:</strong> {q.knowledge}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Image Lightbox */}
      {zoomedImage && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setZoomedImage(null)}
        >
          <div
            className="relative bg-white rounded-2xl p-4 max-w-5xl max-h-[90vh] overflow-auto shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setZoomedImage(null)}
              className="absolute top-3 right-3 p-2 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={zoomedImage}
              alt="Phóng to sơ đồ"
              className="max-w-full h-auto mx-auto rounded-lg"
            />
          </div>
        </div>
      )}
    </div>
  );
};
