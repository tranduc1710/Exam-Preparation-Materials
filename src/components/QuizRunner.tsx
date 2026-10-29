import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  Clock,
  Flag,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  XCircle,
  BookOpen,
  Send,
  Pause,
  Play,
  ZoomIn,
  X,
  AlertTriangle,
  Eye,
  Bookmark,
  ArrowLeft,
  Keyboard,
  Languages,
  Maximize,
  Minimize,
  Type,
  Ban,
  Layers,
} from 'lucide-react';
import { LanguageMode, OptionKey, Question, QuizConfig } from '../types';
import { CHAPTER_SHORT_NAMES, formatTime } from '../utils/quizHelper';
import { isContentBilingual, renderHighlightedText } from '../utils/textHelper';

interface QuizRunnerProps {
  config: QuizConfig;
  languageMode: LanguageMode;
  onChangeLanguageMode: (lang: LanguageMode) => void;
  bookmarks: string[];
  onToggleBookmark: (qId: string) => void;
  onFinish: (
    userAnswers: Record<string, OptionKey>,
    flaggedIds: string[],
    durationSeconds: number
  ) => void;
  onExit: () => void;
}

const OPTION_KEYS: OptionKey[] = ['a', 'b', 'c', 'd'];

export const QuizRunner: React.FC<QuizRunnerProps> = ({
  config,
  languageMode,
  onChangeLanguageMode,
  bookmarks,
  onToggleBookmark,
  onFinish,
  onExit,
}) => {
  const { questions, mode, durationMinutes, title, subtitle } = config;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [userAnswers, setUserAnswers] = useState<Record<string, OptionKey>>({});
  const [flaggedSet, setFlaggedSet] = useState<Set<string>>(new Set());
  const [revealedSet, setRevealedSet] = useState<Set<string>>(new Set());
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [zoomedImage, setZoomedImage] = useState<string | null>(null);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showExitModal, setShowExitModal] = useState(false);

  // Advanced UI upgrades state
  const [eliminatedMap, setEliminatedMap] = useState<Record<string, OptionKey[]>>({});
  const [textSize, setTextSize] = useState<'sm' | 'base' | 'lg'>('base');
  const [navFilter, setNavFilter] = useState<'all' | 'unanswered' | 'flagged'>('all');
  const [groupByChapter, setGroupByChapter] = useState<boolean>(true);
  const [autoRevealPractice, setAutoRevealPractice] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);

  const totalSecondsLimit = durationMinutes > 0 ? durationMinutes * 60 : 0;
  const remainingSeconds =
    totalSecondsLimit > 0 ? Math.max(0, totalSecondsLimit - elapsedSeconds) : 0;

  const currentQ: Question = questions[currentIndex];
  const isBookmarked = bookmarks.includes(currentQ.id);
  const isFlagged = flaggedSet.has(currentQ.id);
  const selectedAns = userAnswers[currentQ.id];
  const isRevealed =
    mode === 'practice' &&
    (Boolean(selectedAns && autoRevealPractice) || revealedSet.has(currentQ.id));

  const handleComplete = useCallback(() => {
    onFinish(userAnswers, Array.from(flaggedSet), elapsedSeconds);
  }, [onFinish, userAnswers, flaggedSet, elapsedSeconds]);

  // Fullscreen tracker
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  // Timer tick
  useEffect(() => {
    if (isPaused) return;
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => {
        const next = prev + 1;
        if (totalSecondsLimit > 0 && next >= totalSecondsLimit) {
          clearInterval(interval);
          setTimeout(() => {
            onFinish(userAnswers, Array.from(flaggedSet), totalSecondsLimit);
          }, 50);
        }
        return next;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [isPaused, totalSecondsLimit, onFinish, userAnswers, flaggedSet]);

  const handleSelectOption = useCallback(
    (opt: OptionKey) => {
      if (isPaused) return;
      // If selected option was marked eliminated, un-eliminate it
      setEliminatedMap((prev) => {
        const list = prev[currentQ.id] || [];
        if (list.includes(opt)) {
          return { ...prev, [currentQ.id]: list.filter((k) => k !== opt) };
        }
        return prev;
      });
      setUserAnswers((prev) => ({
        ...prev,
        [currentQ.id]: opt,
      }));
    },
    [currentQ.id, isPaused]
  );

  const toggleEliminate = (optKey: OptionKey, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setEliminatedMap((prev) => {
      const list = prev[currentQ.id] || [];
      const next = list.includes(optKey)
        ? list.filter((k) => k !== optKey)
        : [...list, optKey];
      return { ...prev, [currentQ.id]: next };
    });
  };

  const toggleFlag = useCallback((qId: string) => {
    setFlaggedSet((prev) => {
      const next = new Set(prev);
      if (next.has(qId)) next.delete(qId);
      else next.add(qId);
      return next;
    });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (showSubmitModal || showExitModal || zoomedImage) {
        if (e.key === 'Escape') {
          setZoomedImage(null);
          setShowSubmitModal(false);
          setShowExitModal(false);
        }
        return;
      }
      const key = e.key.toLowerCase();
      if (key === 'a' || key === '1') handleSelectOption('a');
      else if (key === 'b' || key === '2') handleSelectOption('b');
      else if (key === 'c' || key === '3') handleSelectOption('c');
      else if (key === 'd' || key === '4') handleSelectOption('d');
      else if (e.key === 'ArrowRight' && currentIndex < questions.length - 1) {
        setCurrentIndex((i) => i + 1);
      } else if (e.key === 'ArrowLeft' && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      } else if (key === 'f') {
        toggleFlag(currentQ.id);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    currentIndex,
    questions.length,
    currentQ.id,
    handleSelectOption,
    toggleFlag,
    showSubmitModal,
    showExitModal,
    zoomedImage,
  ]);

  const answeredCount = Object.keys(userAnswers).length;
  const unansweredCount = questions.length - answeredCount;
  const isLowTime = totalSecondsLimit > 0 && remainingSeconds <= 300;
  const requiredPassCount = Math.ceil(questions.length * 0.65);

  // Group questions by chapter for sidebar
  const groupedByChapter = useMemo(() => {
    const map: Record<number, number[]> = {};
    questions.forEach((q, idx) => {
      const ch = q.chapter || 1;
      if (!map[ch]) map[ch] = [];
      map[ch].push(idx);
    });
    return map;
  }, [questions]);

  // Check if current question has a distinct bilingual translation
  const isQStemBilingual =
    languageMode === 'bilingual' && isContentBilingual(currentQ.question, currentQ.questionVi);

  const renderPaletteButton = (idx: number) => {
    const q = questions[idx];
    const ans = userAnswers[q.id];
    const flagged = flaggedSet.has(q.id);
    const isCurrent = idx === currentIndex;

    let btnClass = 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300';

    if (mode === 'practice' && ans) {
      if (ans === q.correctAnswer) {
        btnClass = 'bg-emerald-600 text-white border-emerald-600 shadow-2xs';
      } else {
        btnClass = 'bg-rose-600 text-white border-rose-600 shadow-2xs';
      }
    } else if (ans) {
      btnClass = 'bg-indigo-600 text-white border-indigo-600 shadow-2xs';
    } else if (isCurrent) {
      btnClass = 'bg-indigo-50 text-indigo-700 border-indigo-400 font-extrabold';
    }

    return (
      <button
        key={q.id}
        type="button"
        onClick={() => setCurrentIndex(idx)}
        className={`relative h-9 rounded-lg border text-xs font-bold transition flex items-center justify-center cursor-pointer ${btnClass} ${
          isCurrent ? 'ring-2 ring-offset-2 ring-indigo-600 shadow-sm z-10 font-black' : ''
        }`}
      >
        {idx + 1}
        {flagged && (
          <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-amber-400 border-2 border-white shadow-2xs z-20" />
        )}
      </button>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Sticky Exam Bar */}
      <header className="sticky top-0 z-30 bg-white border-b border-slate-200 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setShowExitModal(true)}
              className="p-2 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer"
              title="Thoát bài làm"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-slate-900 truncate text-sm sm:text-base">
                  {title}
                </h1>
                <span
                  className={`hidden md:inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    mode === 'exam'
                      ? 'bg-rose-50 text-rose-700 border border-rose-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}
                >
                  {mode === 'exam' ? 'Thi thử chấm điểm' : 'Chế độ Luyện tập'}
                </span>
              </div>
              <p className="text-xs text-slate-500 truncate">
                {subtitle} • Đỗ: ≥ {requiredPassCount}/{questions.length} câu (65%)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Font Size Scaler */}
            <div className="hidden sm:flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600">
              <Type className="w-3.5 h-3.5 text-slate-400 ml-1.5 mr-1" />
              {(['sm', 'base', 'lg'] as const).map((sz) => (
                <button
                  key={sz}
                  type="button"
                  onClick={() => setTextSize(sz)}
                  title={`Cỡ chữ: ${sz === 'sm' ? 'Nhỏ' : sz === 'lg' ? 'Lớn' : 'Vừa'}`}
                  className={`px-2 py-1 rounded-lg transition cursor-pointer ${
                    textSize === sz ? 'bg-white text-indigo-700 shadow-2xs' : 'hover:text-slate-900'
                  }`}
                >
                  {sz === 'sm' ? 'A-' : sz === 'lg' ? 'A+' : 'A'}
                </button>
              ))}
            </div>

            {/* Language Switcher Pill */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
              <Languages className="w-3.5 h-3.5 text-slate-500 ml-1.5 mr-1 hidden sm:inline" />
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

            {/* Fullscreen Mode Toggle */}
            <button
              type="button"
              onClick={toggleFullscreen}
              title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình (Tập trung thi)'}
              className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 transition cursor-pointer hidden md:flex items-center justify-center border border-slate-200"
            >
              {isFullscreen ? <Minimize className="w-4 h-4" /> : <Maximize className="w-4 h-4" />}
            </button>

            {/* Timer Box */}
            <div
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-sm sm:text-base font-bold border transition-colors ${
                isLowTime
                  ? 'bg-rose-50 text-rose-700 border-rose-300 animate-pulse'
                  : 'bg-slate-100 text-slate-800 border-slate-200'
              }`}
            >
              <Clock className="w-4 h-4 shrink-0" />
              <span>
                {totalSecondsLimit > 0
                  ? formatTime(remainingSeconds)
                  : formatTime(elapsedSeconds)}
              </span>
              <button
                onClick={() => setIsPaused((p) => !p)}
                className="ml-0.5 p-1 rounded-md hover:bg-white/80 text-slate-600 hover:text-slate-900 transition cursor-pointer"
                title={isPaused ? 'Tiếp tục' : 'Tạm dừng'}
              >
                {isPaused ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Submit Button */}
            <button
              onClick={() => setShowSubmitModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 sm:px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm shadow-xs transition cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">Nộp bài</span>
            </button>
          </div>
        </div>

        {/* Thin Progress Bar */}
        <div className="w-full h-1 bg-slate-100">
          <div
            className="h-full bg-indigo-600 transition-all duration-300"
            style={{ width: `${(answeredCount / questions.length) * 100}%` }}
          />
        </div>
      </header>

      {/* Main Content Layout */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left/Center Question Area */}
        <div className="lg:col-span-8 xl:col-span-9 space-y-5">
          {isPaused ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto">
                <Pause className="w-8 h-8" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Bài làm đang tạm dừng</h2>
              <p className="text-slate-600 max-w-md mx-auto text-sm">
                Đồng hồ đã được tạm dừng. Nhấn nút bên dưới khi bạn sẵn sàng tiếp tục làm bài.
              </p>
              <button
                onClick={() => setIsPaused(false)}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition cursor-pointer"
              >
                <Play className="w-4 h-4" />
                Tiếp tục làm bài
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
              {/* Question Card Header */}
              <div className="px-5 sm:px-7 py-4 bg-slate-50/80 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center px-3 py-1 rounded-lg bg-indigo-600 text-white font-bold text-xs sm:text-sm">
                    Câu {currentIndex + 1} / {questions.length}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-200/80 text-slate-700 font-medium text-xs">
                    {currentQ.examTitle} • {currentQ.label}
                  </span>
                  <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-medium text-xs">
                    {CHAPTER_SHORT_NAMES[currentQ.chapter] || `Chương ${currentQ.chapter}`}
                  </span>
                  {currentQ.isV4 && (
                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 border border-violet-200 font-semibold text-xs">
                      CTFL v4.0
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => toggleFlag(currentQ.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isFlagged
                        ? 'bg-amber-50 text-amber-700 border-amber-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Phím tắt: F"
                  >
                    <Flag
                      className={`w-3.5 h-3.5 ${
                        isFlagged ? 'fill-amber-500 text-amber-500' : ''
                      }`}
                    />
                    <span>{isFlagged ? 'Đã gắn cờ' : 'Gắn cờ xem lại'}</span>
                  </button>

                  <button
                    onClick={() => onToggleBookmark(currentQ.id)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition cursor-pointer ${
                      isBookmarked
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-300'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                    title="Lưu vào kho câu hỏi cần nhớ"
                  >
                    <Bookmark
                      className={`w-3.5 h-3.5 ${
                        isBookmarked ? 'fill-indigo-600 text-indigo-600' : ''
                      }`}
                    />
                    <span className="hidden sm:inline">
                      {isBookmarked ? 'Đã lưu' : 'Lưu câu hỏi'}
                    </span>
                  </button>
                </div>
              </div>

              {/* Question Body */}
              <div className="p-5 sm:p-7 space-y-6">
                {/* Question Stem according to LanguageMode (Eliminating redundant duplicates!) */}
                <div className="space-y-3">
                  {/* Primary Question text (EN or VI) */}
                  <div
                    className={`text-slate-900 font-medium ${
                      textSize === 'sm'
                        ? 'text-sm sm:text-base leading-relaxed'
                        : textSize === 'lg'
                        ? 'text-lg sm:text-xl leading-relaxed'
                        : 'text-base sm:text-lg leading-relaxed'
                    } whitespace-pre-line`}
                  >
                    {renderHighlightedText(
                      languageMode === 'vi' && currentQ.questionVi
                        ? currentQ.questionVi
                        : currentQ.question
                    )}
                  </div>

                  {/* Secondary Translation Box (ONLY when bilingual AND Vietnamese is actually different from English) */}
                  {isQStemBilingual && (
                    <div
                      className={`text-indigo-950 bg-indigo-50/70 border-l-4 border-indigo-500 pl-4 py-2.5 rounded-r-xl ${
                        textSize === 'sm'
                          ? 'text-xs sm:text-sm leading-relaxed'
                          : textSize === 'lg'
                          ? 'text-base sm:text-lg leading-relaxed'
                          : 'text-sm sm:text-base leading-relaxed'
                      } font-medium whitespace-pre-line shadow-2xs`}
                    >
                      <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1">
                        <Languages className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Dịch nghĩa chuyên ngành ISTQB (Tiếng Việt):</span>
                      </div>
                      {renderHighlightedText(currentQ.questionVi || '')}
                    </div>
                  )}
                </div>

                {/* Question Figures / Diagrams */}
                {(currentQ.images.length > 0 || (currentQ.imagesVi && currentQ.imagesVi.length > 0)) && (
                  <div className="space-y-3">
                    {(languageMode === 'en' || languageMode === 'bilingual') &&
                      currentQ.images.map((imgSrc, idx) => (
                        <div
                          key={`en-${idx}`}
                          className="relative group bg-slate-50 border border-slate-200 rounded-xl p-3 flex flex-col items-center"
                        >
                          {languageMode === 'bilingual' && (
                            <span className="self-start text-[11px] font-bold uppercase text-slate-500 mb-1.5">
                              Hình gốc tiếng Anh (EN):
                            </span>
                          )}
                          <img
                            src={imgSrc}
                            alt={`Hình minh họa câu ${currentIndex + 1} (EN)`}
                            onClick={() => setZoomedImage(imgSrc)}
                            className="max-h-96 w-auto object-contain rounded-lg cursor-zoom-in mx-auto"
                          />
                          <button
                            onClick={() => setZoomedImage(imgSrc)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-indigo-600 font-medium cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            Nhấn vào hình để phóng to
                          </button>
                        </div>
                      ))}

                    {(languageMode === 'vi' || languageMode === 'bilingual') &&
                      (currentQ.imagesVi && currentQ.imagesVi.length > 0
                        ? currentQ.imagesVi
                        : languageMode === 'vi'
                        ? currentQ.images
                        : []
                      ).map((imgSrc, idx) => (
                        <div
                          key={`vi-${idx}`}
                          className="relative group bg-indigo-50/40 border border-indigo-200 rounded-xl p-3 flex flex-col items-center"
                        >
                          {languageMode === 'bilingual' && (
                            <span className="self-start text-[11px] font-bold uppercase text-indigo-700 mb-1.5">
                              Hình bản dịch tiếng Việt (VI):
                            </span>
                          )}
                          <img
                            src={imgSrc}
                            alt={`Hình minh họa câu ${currentIndex + 1} (VI)`}
                            onClick={() => setZoomedImage(imgSrc)}
                            className="max-h-96 w-auto object-contain rounded-lg cursor-zoom-in mx-auto"
                          />
                          <button
                            onClick={() => setZoomedImage(imgSrc)}
                            className="mt-2 inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium cursor-pointer"
                          >
                            <ZoomIn className="w-3.5 h-3.5" />
                            Nhấn vào hình để phóng to
                          </button>
                        </div>
                      ))}
                  </div>
                )}

                {/* Options List with Strikethrough / Elimination Tool */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-500 pb-0.5">
                    <span className="font-semibold text-slate-700">Chọn 1 đáp án đúng nhất:</span>
                    <span className="italic hidden sm:inline text-slate-400">
                      Mẹo: Nhấn nút 🚫 hoặc click chuột phải để gạch bỏ loại trừ đáp án sai
                    </span>
                  </div>

                  {OPTION_KEYS.map((optKey) => {
                    const optEn = currentQ.options[optKey];
                    const optVi = currentQ.optionsVi?.[optKey];
                    const isOptBilingual = isContentBilingual(optEn, optVi);
                    const isSelected = selectedAns === optKey;
                    const isCorrect = currentQ.correctAnswer === optKey;
                    const isEliminated = (eliminatedMap[currentQ.id] || []).includes(optKey);

                    let cardStyle =
                      'border-slate-200 bg-white hover:border-indigo-300 hover:bg-slate-50/70 text-slate-800';
                    let badgeStyle = 'bg-slate-100 text-slate-700 border-slate-200';

                    if (isRevealed) {
                      if (isCorrect) {
                        cardStyle =
                          'border-emerald-500 bg-emerald-50/70 text-emerald-950 ring-1 ring-emerald-500';
                        badgeStyle = 'bg-emerald-600 text-white border-emerald-600';
                      } else if (isSelected && !isCorrect) {
                        cardStyle =
                          'border-rose-400 bg-rose-50/70 text-rose-950 ring-1 ring-rose-400';
                        badgeStyle = 'bg-rose-600 text-white border-rose-600';
                      }
                    } else if (isSelected) {
                      cardStyle =
                        'border-indigo-600 bg-indigo-50/60 text-indigo-950 ring-1 ring-indigo-600';
                      badgeStyle = 'bg-indigo-600 text-white border-indigo-600';
                    } else if (isEliminated) {
                      cardStyle =
                        'border-slate-200 bg-slate-100/70 text-slate-400 opacity-50';
                      badgeStyle = 'bg-slate-200 text-slate-400 border-slate-300 line-through';
                    }

                    const mainText = languageMode === 'vi' && optVi ? optVi : optEn;

                    return (
                      <div
                        key={optKey}
                        onClick={() => handleSelectOption(optKey)}
                        onContextMenu={(e) => {
                          e.preventDefault();
                          toggleEliminate(optKey);
                        }}
                        className={`w-full text-left p-3.5 sm:p-4 rounded-xl border transition-all flex items-start gap-3.5 cursor-pointer group select-none ${cardStyle}`}
                      >
                        <span
                          className={`w-8 h-8 rounded-lg border font-bold text-sm uppercase flex items-center justify-center shrink-0 mt-0.5 transition-colors ${badgeStyle}`}
                        >
                          {optKey}
                        </span>

                        <div className="flex-1 space-y-1">
                          {/* Main option text */}
                          <div
                            className={`${
                              textSize === 'sm'
                                ? 'text-xs sm:text-sm'
                                : textSize === 'lg'
                                ? 'text-base sm:text-lg'
                                : 'text-sm sm:text-base'
                            } leading-relaxed whitespace-pre-line font-medium ${
                              isEliminated ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {mainText}
                          </div>

                          {/* Secondary Translation (ONLY when bilingual AND English != Vietnamese) */}
                          {languageMode === 'bilingual' && isOptBilingual && optVi && (
                            <div
                              className={`${
                                textSize === 'sm'
                                  ? 'text-[11px] sm:text-xs'
                                  : textSize === 'lg'
                                  ? 'text-sm sm:text-base'
                                  : 'text-xs sm:text-sm'
                              } text-indigo-900/80 italic leading-relaxed whitespace-pre-line ${
                                isEliminated ? 'line-through text-slate-400' : ''
                              }`}
                            >
                              {optVi}
                            </div>
                          )}
                        </div>

                        {/* Strikethrough / Elimination Action Button */}
                        <div className="flex items-center gap-1.5 shrink-0 mt-0.5">
                          <button
                            type="button"
                            onClick={(e) => toggleEliminate(optKey, e)}
                            title={
                              isEliminated
                                ? 'Khôi phục phương án này'
                                : 'Loại trừ phương án này (Gạch bỏ)'
                            }
                            className={`p-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                              isEliminated
                                ? 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                                : 'text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-40 group-hover:opacity-100'
                            }`}
                          >
                            <Ban className="w-4 h-4" />
                          </button>

                          {isRevealed && isCorrect && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                          )}
                          {isRevealed && isSelected && !isCorrect && (
                            <XCircle className="w-5 h-5 text-rose-600" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Practice Mode: Reveal Explanation Button or Explanation Box */}
                {mode === 'practice' && !isRevealed && (
                  <div className="pt-2">
                    <button
                      type="button"
                      onClick={() =>
                        setRevealedSet((prev) => new Set(prev).add(currentQ.id))
                      }
                      className="inline-flex items-center gap-2 text-xs font-semibold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-3.5 py-2 rounded-lg transition cursor-pointer"
                    >
                      <Eye className="w-4 h-4" />
                      Xem đáp án & giải thích chi tiết
                    </button>
                  </div>
                )}

                {isRevealed && (
                  <div className="mt-6 rounded-2xl border border-indigo-200 bg-indigo-50/50 p-5 space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        {selectedAns === currentQ.correctAnswer ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 font-bold text-xs">
                            <CheckCircle2 className="w-4 h-4" />
                            Chính xác! Đáp án đúng là {currentQ.correctAnswer.toUpperCase()}
                          </span>
                        ) : selectedAns ? (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-rose-100 text-rose-800 font-bold text-xs">
                            <XCircle className="w-4 h-4" />
                            Chưa đúng (Bạn chọn {selectedAns.toUpperCase()}) • Đáp án đúng:{' '}
                            {currentQ.correctAnswer.toUpperCase()}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-100 text-indigo-800 font-bold text-xs">
                            Đáp án đúng: {currentQ.correctAnswer.toUpperCase()}
                          </span>
                        )}
                      </div>
                    </div>

                    {currentQ.explanationShort && (
                      <div className="text-sm sm:text-base text-indigo-950 bg-white/80 border border-indigo-200/80 rounded-xl px-3.5 py-2.5 leading-relaxed whitespace-pre-line">
                        <span className="font-bold text-indigo-700">Tóm tắt nhanh: </span>
                        {currentQ.explanationShort}
                      </div>
                    )}

                    <div className="text-sm sm:text-base text-slate-800 leading-relaxed whitespace-pre-line">
                      <span className="font-bold text-indigo-950">Giải thích chi tiết: </span>
                      {currentQ.explanation}
                    </div>

                    {currentQ.knowledge && (
                      <div className="pt-2 border-t border-indigo-200/70 flex items-start gap-2 text-xs sm:text-sm text-indigo-900 font-medium">
                        <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                        <span>
                          <strong>Kiến thức Syllabus:</strong> {currentQ.knowledge}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Footer Navigation Buttons */}
              <div className="px-5 sm:px-7 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-4">
                <button
                  type="button"
                  disabled={currentIndex === 0}
                  onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 disabled:opacity-40 disabled:pointer-events-none text-slate-700 font-semibold text-sm transition cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                  <span>Câu trước</span>
                </button>

                <div className="hidden md:flex items-center gap-1.5 text-xs text-slate-400">
                  <Keyboard className="w-4 h-4" />
                  <span>Phím tắt: A/B/C/D hoặc 1-4 • ←/→ chuyển câu • F gắn cờ</span>
                </div>

                {currentIndex < questions.length - 1 ? (
                  <button
                    type="button"
                    onClick={() =>
                      setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                    }
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                  >
                    <span>Câu tiếp theo</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSubmitModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-sm shadow-xs transition cursor-pointer"
                  >
                    <Send className="w-4 h-4" />
                    <span>Hoàn thành & Nộp bài</span>
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Question Palette & Navigator */}
        <aside className="lg:col-span-4 xl:col-span-3 bg-white rounded-2xl border border-slate-200 p-5 shadow-xs sticky top-22 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 text-sm">Bảng câu hỏi</h2>
            <span className="text-xs font-semibold text-slate-600">
              Đã làm: {answeredCount}/{questions.length}
            </span>
          </div>

          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold border border-slate-200/80">
            <button
              type="button"
              onClick={() => setNavFilter('all')}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer text-[11px] sm:text-xs ${
                navFilter === 'all'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tất cả ({questions.length})
            </button>
            <button
              type="button"
              onClick={() => setNavFilter('unanswered')}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer text-[11px] sm:text-xs ${
                navFilter === 'unanswered'
                  ? 'bg-white text-indigo-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Chưa làm ({unansweredCount})
            </button>
            <button
              type="button"
              onClick={() => setNavFilter('flagged')}
              className={`flex-1 py-1 px-1.5 rounded-lg text-center transition cursor-pointer text-[11px] sm:text-xs ${
                navFilter === 'flagged'
                  ? 'bg-white text-amber-700 shadow-xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Gắn cờ ({flaggedSet.size})
            </button>
          </div>

          {/* Pass Target Progress Indicator */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-1.5 text-xs">
            <div className="flex items-center justify-between font-semibold">
              <span className="text-slate-600">Tiến độ thi:</span>
              <span className="text-slate-900 font-bold">{answeredCount}/{questions.length} câu</span>
            </div>
            <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
              <div
                className={`h-full transition-all duration-300 ${
                  answeredCount >= requiredPassCount ? 'bg-emerald-500' : 'bg-indigo-600'
                }`}
                style={{ width: `${(answeredCount / questions.length) * 100}%` }}
              />
            </div>
            <div className="text-[11px] text-slate-500 flex items-center justify-between">
              <span>Đạt chuẩn: ≥ {requiredPassCount} câu (65%)</span>
              {answeredCount >= requiredPassCount ? (
                <span className="text-emerald-700 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Đủ chỉ tiêu
                </span>
              ) : (
                <span className="text-indigo-600 font-semibold">
                  Cần thêm {requiredPassCount - answeredCount} câu
                </span>
              )}
            </div>
          </div>

          {/* Grouping by Chapter Toggle */}
          <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
            <span className="font-medium">Chế độ xem bảng:</span>
            <button
              type="button"
              onClick={() => setGroupByChapter((g) => !g)}
              className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-semibold cursor-pointer"
            >
              <Layers className="w-3.5 h-3.5" />
              <span>{groupByChapter ? 'Theo 6 chương' : 'Lưới liên tục'}</span>
            </button>
          </div>

          {/* Practice Auto-Reveal Toggle */}
          {mode === 'practice' && (
            <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-50/70 border border-indigo-200/60 text-xs">
              <span className="text-indigo-900 font-semibold flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-indigo-600" />
                <span>Tự hiện giải thích khi chọn:</span>
              </span>
              <button
                type="button"
                onClick={() => setAutoRevealPractice((v) => !v)}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  autoRevealPractice ? 'bg-indigo-600' : 'bg-slate-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs ring-0 transition duration-200 ease-in-out ${
                    autoRevealPractice ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          )}

          {/* Question Navigator Buttons */}
          <div className="max-h-96 overflow-y-auto p-1.5 space-y-3">
            {groupByChapter && navFilter === 'all' ? (
              Object.entries(groupedByChapter).map(([chNum, qIndices]) => (
                <div key={chNum} className="space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between pt-1 border-t border-slate-100 first:border-0 first:pt-0">
                    <span className="truncate">{CHAPTER_SHORT_NAMES[Number(chNum)] || `Chương ${chNum}`}</span>
                    <span className="text-slate-400 font-normal shrink-0">{qIndices.length} câu</span>
                  </div>
                  <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 p-1">
                    {qIndices.map((idx) => renderPaletteButton(idx))}
                  </div>
                </div>
              ))
            ) : (
              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2 p-1">
                {questions.map((q, idx) => {
                  const ans = userAnswers[q.id];
                  const flagged = flaggedSet.has(q.id);
                  if (navFilter === 'unanswered' && ans) return null;
                  if (navFilter === 'flagged' && !flagged) return null;
                  return renderPaletteButton(idx);
                })}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowSubmitModal(true)}
            className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            <span>Nộp bài & Chấm điểm</span>
          </button>
        </aside>
      </main>

      {/* Image Lightbox Modal */}
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
              alt="Phóng to sơ đồ câu hỏi"
              className="max-w-full h-auto mx-auto rounded-lg"
            />
          </div>
        </div>
      )}

      {/* Submit Confirmation Modal */}
      {showSubmitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-5 shadow-xl border border-slate-200">
            <div className="flex items-start gap-3.5">
              <div
                className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                  unansweredCount > 0
                    ? 'bg-amber-100 text-amber-600'
                    : 'bg-indigo-100 text-indigo-600'
                }`}
              >
                {unansweredCount > 0 ? (
                  <AlertTriangle className="w-6 h-6" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Xác nhận nộp bài?</h3>
                <p className="text-sm text-slate-600 mt-1">
                  Bạn đã trả lời{' '}
                  <strong className="text-slate-900">
                    {answeredCount}/{questions.length}
                  </strong>{' '}
                  câu hỏi.
                </p>
              </div>
            </div>

            {(unansweredCount > 0 || flaggedSet.size > 0) && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-3.5 text-xs sm:text-sm text-amber-900 space-y-1">
                {unansweredCount > 0 && (
                  <p>
                    • Còn <strong>{unansweredCount} câu hỏi</strong> chưa được chọn đáp án.
                  </p>
                )}
                {flaggedSet.size > 0 && (
                  <p>
                    • Có <strong>{flaggedSet.size} câu hỏi</strong> đang được gắn cờ xem lại.
                  </p>
                )}
              </div>
            )}

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowSubmitModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm cursor-pointer"
              >
                Làm tiếp
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowSubmitModal(false);
                  handleComplete();
                }}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-xs cursor-pointer"
              >
                Nộp bài ngay
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Exit Confirmation Modal */}
      {showExitModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-lg font-bold text-slate-900">Thoát khỏi bài thi?</h3>
            <p className="text-sm text-slate-600">
              Nếu thoát bây giờ mà chưa nộp bài, tiến trình làm bài hiện tại sẽ không được lưu vào lịch sử.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowExitModal(false)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-semibold text-sm cursor-pointer"
              >
                Ở lại làm tiếp
              </button>
              <button
                type="button"
                onClick={onExit}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-semibold text-sm cursor-pointer"
              >
                Thoát ra trang chủ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
