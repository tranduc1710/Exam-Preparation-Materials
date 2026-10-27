import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Bookmark,
  Eye,
  EyeOff,
  CheckCircle2,
  ZoomIn,
  X,
  Languages,
} from 'lucide-react';
import { KLevel, LanguageMode, OptionKey, Question } from '../types';
import { allQuestions, CHAPTER_SHORT_NAMES, examsDataset, K_LEVEL_INFO } from '../utils/quizHelper';

interface QuestionBankViewProps {
  languageMode: LanguageMode;
  onChangeLanguageMode: (lang: LanguageMode) => void;
  bookmarks: string[];
  wrongIds: string[];
  onToggleBookmark: (qId: string) => void;
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

export const QuestionBankView: React.FC<QuestionBankViewProps> = ({
  languageMode,
  onChangeLanguageMode,
  bookmarks,
  wrongIds,
  onToggleBookmark,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedExam, setSelectedExam] = useState<number | 'all'>('all');
  const [selectedChapter, setSelectedChapter] = useState<number | 'all'>('all');
  const [selectedKLevel, setSelectedKLevel] = useState<KLevel | 'all'>('all');
  const [specialFilter, setSpecialFilter] = useState<'all' | 'v4' | 'bookmarked' | 'wrong'>(
    'all'
  );
  const [showAllAnswers, setShowAllAnswers] = useState(true);
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const qLower = searchQuery.trim().toLowerCase();
    return allQuestions.filter((q) => {
      if (selectedExam !== 'all' && q.examId !== selectedExam) return false;
      if (selectedChapter !== 'all' && q.chapter !== selectedChapter) return false;
      if (selectedKLevel !== 'all' && q.kLevel !== selectedKLevel) return false;
      if (specialFilter === 'v4' && !q.isV4) return false;
      if (specialFilter === 'bookmarked' && !bookmarks.includes(q.id)) return false;
      if (specialFilter === 'wrong' && !wrongIds.includes(q.id)) return false;

      if (qLower) {
        const hay = `${q.question} ${q.questionVi || ''} ${q.options.a} ${q.options.b} ${
          q.options.c
        } ${q.options.d} ${q.optionsVi?.a || ''} ${q.optionsVi?.b || ''} ${
          q.optionsVi?.c || ''
        } ${q.optionsVi?.d || ''} ${q.explanation} ${q.knowledge}`.toLowerCase();
        if (!hay.includes(qLower)) return false;
      }
      return true;
    });
  }, [searchQuery, selectedExam, selectedChapter, selectedKLevel, specialFilter, bookmarks, wrongIds]);

  const toggleRevealOne = (id: string) => {
    setRevealedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <div className="space-y-6">
      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          {/* Search Input */}
          <div className="md:col-span-4 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm tiếng Anh hoặc tiếng Việt (VD: phân vùng, boundary, risk...)"
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Exam Select */}
          <div className="md:col-span-3">
            <select
              value={selectedExam}
              onChange={(e) =>
                setSelectedExam(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả 10 Đề ({allQuestions.length} câu)</option>
              {examsDataset.exams.map((ex) => (
                <option key={ex.id} value={ex.id}>
                  {ex.shortTitle} ({ex.questionCount} câu)
                </option>
              ))}
            </select>
          </div>

          {/* Chapter Select */}
          <div className="md:col-span-3">
            <select
              value={selectedChapter}
              onChange={(e) =>
                setSelectedChapter(e.target.value === 'all' ? 'all' : Number(e.target.value))
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả 6 Chương Syllabus</option>
              {examsDataset.metadata.chapters.map((ch) => (
                <option key={ch.chapter} value={ch.chapter}>
                  {CHAPTER_SHORT_NAMES[ch.chapter]} ({ch.questionCount} câu)
                </option>
              ))}
            </select>
          </div>

          {/* K-Level Select */}
          <div className="md:col-span-2">
            <select
              value={selectedKLevel}
              onChange={(e) =>
                setSelectedKLevel(e.target.value as KLevel | 'all')
              }
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">Tất cả K-Level</option>
              <option value="K1">K1 – Nhớ (70 câu)</option>
              <option value="K2">K2 – Hiểu (201 câu)</option>
              <option value="K3">K3 – Vận dụng (73 câu)</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100">
          <div className="flex flex-wrap items-center gap-2">
            {[
              { id: 'all', label: 'Tất cả' },
              { id: 'v4', label: 'Câu hỏi mới CTFL v4.0' },
              { id: 'bookmarked', label: `Đã lưu (${bookmarks.length})` },
              { id: 'wrong', label: `Câu từng làm sai (${wrongIds.length})` },
            ].map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setSpecialFilter(f.id as typeof specialFilter)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                  specialFilter === f.id
                    ? 'bg-indigo-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {f.label}
              </button>
            ))}
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

            <span className="text-xs font-semibold text-slate-500">
              Hiển thị: <strong className="text-slate-900">{filtered.length}</strong> câu
            </span>
            <button
              type="button"
              onClick={() => setShowAllAnswers((s) => !s)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              {showAllAnswers ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Ẩn đáp án
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Hiện đáp án
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Results List */}
      <div className="space-y-4">
        {filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-500">
            Không tìm thấy câu hỏi nào khớp với bộ lọc hiện tại.
          </div>
        ) : (
          filtered.map((q: Question) => {
            const isShown = showAllAnswers || revealedIds.has(q.id);
            const isBookmarked = bookmarks.includes(q.id);

            return (
              <div
                key={q.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden"
              >
                <div className="px-5 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2.5 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs">
                      {q.examTitle} • {q.label}
                    </span>
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium text-xs">
                      {CHAPTER_SHORT_NAMES[q.chapter]}
                    </span>
                    {q.kLevel && K_LEVEL_INFO[q.kLevel] && (
                      <span
                        className={`inline-flex items-center px-2.5 py-1 rounded-lg font-bold text-xs border ${K_LEVEL_INFO[q.kLevel].badgeBg} ${K_LEVEL_INFO[q.kLevel].badgeText} ${K_LEVEL_INFO[q.kLevel].badgeBorder}`}
                        title={K_LEVEL_INFO[q.kLevel].description}
                      >
                        {K_LEVEL_INFO[q.kLevel].shortName} • {K_LEVEL_INFO[q.kLevel].vietnameseName}
                      </span>
                    )}
                    {q.isV4 && (
                      <span className="px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-semibold text-xs">
                        CTFL v4.0
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {!showAllAnswers && (
                      <button
                        type="button"
                        onClick={() => toggleRevealOne(q.id)}
                        className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                      >
                        {isShown ? 'Ẩn giải thích' : 'Xem đáp án'}
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onToggleBookmark(q.id)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold border transition cursor-pointer ${
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
                      <span>{isBookmarked ? 'Đã lưu' : 'Lưu'}</span>
                    </button>
                  </div>
                </div>

                <div className="p-5 space-y-4">
                  <div className="space-y-2">
                    {(languageMode === 'en' || languageMode === 'bilingual') && (
                      <div className="text-slate-900 font-medium text-base leading-relaxed">
                        {q.question}
                      </div>
                    )}
                    {(languageMode === 'vi' || languageMode === 'bilingual') && q.questionVi && (
                      <div
                        className={
                          languageMode === 'bilingual'
                            ? 'text-indigo-950 bg-indigo-50/60 border-l-4 border-indigo-500 pl-3.5 py-2 rounded-r-xl text-sm sm:text-base font-medium leading-relaxed'
                            : 'text-slate-900 font-medium text-base leading-relaxed'
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
                              alt={`${q.label} (EN)`}
                              onClick={() => setZoomedImage(imgSrc)}
                              className="max-h-80 w-auto object-contain rounded-lg cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImage(imgSrc)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-indigo-600 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Phóng to
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
                              alt={`${q.label} (VI)`}
                              onClick={() => setZoomedImage(imgSrc)}
                              className="max-h-80 w-auto object-contain rounded-lg cursor-zoom-in"
                            />
                            <button
                              type="button"
                              onClick={() => setZoomedImage(imgSrc)}
                              className="mt-1.5 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 cursor-pointer"
                            >
                              <ZoomIn className="w-3.5 h-3.5" /> Phóng to
                            </button>
                          </div>
                        ))}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-2">
                    {OPTION_KEYS.map((optKey) => {
                      const isRight = q.correctAnswer === optKey;
                      const optEn = q.options[optKey];
                      const optVi = q.optionsVi?.[optKey];

                      return (
                        <div
                          key={optKey}
                          className={`p-3 rounded-xl border flex items-start gap-3 text-sm ${
                            isShown && isRight
                              ? 'border-emerald-500 bg-emerald-50/70 text-emerald-950 font-medium'
                              : 'border-slate-200 bg-white text-slate-700'
                          }`}
                        >
                          <span
                            className={`w-6 h-6 rounded-md border font-bold text-xs uppercase flex items-center justify-center shrink-0 mt-0.5 ${
                              isShown && isRight
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-100 text-slate-700 border-slate-200'
                            }`}
                          >
                            {optKey}
                          </span>
                          <div className="flex-1 space-y-1">
                            {(languageMode === 'en' || languageMode === 'bilingual') && (
                              <div className="leading-relaxed">{optEn}</div>
                            )}
                            {(languageMode === 'vi' || languageMode === 'bilingual') && optVi && (
                              <div
                                className={
                                  languageMode === 'bilingual'
                                    ? 'text-xs sm:text-sm text-indigo-900/85 italic leading-relaxed'
                                    : 'leading-relaxed'
                                }
                              >
                                {optVi}
                              </div>
                            )}
                          </div>
                          {isShown && isRight && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isShown && (
                    <div className="rounded-xl bg-indigo-50/60 border border-indigo-200 p-4 space-y-2 text-sm text-slate-800 leading-relaxed">
                      {q.explanationShort && (
                        <div className="bg-white/80 border border-indigo-200/80 rounded-lg px-3 py-2 text-indigo-950">
                          <strong className="text-indigo-700">Tóm tắt nhanh: </strong>
                          {q.explanationShort}
                        </div>
                      )}
                      <div>
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
                  )}
                </div>
              </div>
            );
          })
        )}
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
