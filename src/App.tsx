import React, { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Clock,
  Award,
  Play,
  Sparkles,
  History,
  Bookmark,
  AlertTriangle,
  FileText,
  Shuffle,
  CheckCircle2,
  XCircle,
  Layers,
  Search,
  Trash2,
  Eye,
  GraduationCap,
  Languages,
  BookMarked,
  RotateCcw,
  User,
  X,
  LogOut,
} from 'lucide-react';
import {
  AttemptRecord,
  Exam,
  ExamCategory,
  ExamCollectionTab,
  LanguageMode,
  OptionKey,
  Question,
  QuestionExposureStats,
  QuestionSetMode,
  QuizConfig,
  QuizMode,
  UserProfile,
  UserProgressData,
} from './types';
import {
  buildExamQuestionSet,
  clearAttempts,
  formatTime,
  generateOfficialMock40,
  getAllQuestions,
  getAiDataset,
  getExamsByCategory,
  getExamsDataset,
  getExposureStats,
  getOfficialDataset,
  getQuestionById,
  initDataset,
  ISTQB_CHAPTER_WEIGHTS,
  loadAttempts,
  loadBookmarks,
  loadQuestionExposureMap,
  loadWrongIds,
  recordQuestionsExposure,
  resetQuestionsExposure,
  saveAttempt,
  saveBookmarks,
  setActiveUserProgress,
  shuffleArray,
  updateWrongIdsAfterQuiz,
} from './utils/quizHelper';
import {
  initUserDB,
  getAllProfiles,
  loginOrCreateUser,
  loadUserProgress,
  saveUserProgress,
  resetUserLearningProgress,
  deleteUserProfile,
  getActiveUsername,
  setActiveUsername,
  sendHeartbeat,
  logoutUser,
  getOnlineCount,
} from './utils/db';
import { UserAccountModal } from './components/UserAccountModal';
import { ResetProgressModal } from './components/ResetProgressModal';
import { LoginScreen } from './components/LoginScreen';
import type { ExamsDataset } from './types';

// Heavy views are code-split: their code loads only when first opened.
const QuizRunner = lazy(() =>
  import('./components/QuizRunner').then((m) => ({ default: m.QuizRunner }))
);
const QuizResult = lazy(() =>
  import('./components/QuizResult').then((m) => ({ default: m.QuizResult }))
);
const QuestionBankView = lazy(() =>
  import('./components/QuestionBankView').then((m) => ({ default: m.QuestionBankView }))
);
const GlossaryView = lazy(() =>
  import('./components/GlossaryView').then((m) => ({ default: m.GlossaryView }))
);

const ViewLoading: React.FC = () => (
  <div className="flex items-center justify-center py-16 text-slate-500 text-sm font-medium">
    Đang tải…
  </div>
);

type ActiveTab =
  | 'official'
  | 'ai'
  | 'chapters-official'
  | 'chapters-ai'
  | 'chapters'
  | 'bank'
  | 'glossary'
  | 'history';

const LANG_STORAGE_KEY = 'istqb_ctfl_lang_v1';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('official');

  // Global quiz settings
  const [quizMode, setQuizMode] = useState<QuizMode>('exam');
  const [durationMinutes, setDurationMinutes] = useState<number>(60);
  const [questionSetMode, setQuestionSetMode] = useState<QuestionSetMode>('standard40');
  const [shuffleQuestions, setShuffleQuestions] = useState<boolean>(false);
  const [languageMode, setLanguageModeState] = useState<LanguageMode>(() => {
    try {
      const saved = localStorage.getItem(LANG_STORAGE_KEY);
      if (saved === 'en' || saved === 'vi' || saved === 'bilingual') return saved;
    } catch {
      // ignore
    }
    return 'bilingual';
  });

  // Active user & profile state
  const [activeUsername, setActiveUsernameState] = useState<string | null>(() => getActiveUsername());
  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [onlineCount, setOnlineCount] = useState<number>(1);
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);
  const [isResetModalOpen, setIsResetModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!toastMessage) return;
    const timer = setTimeout(() => setToastMessage(null), 3500);
    return () => clearTimeout(timer);
  }, [toastMessage]);

  const setLanguageMode = (lang: LanguageMode) => {
    setLanguageModeState(lang);
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch {
      // ignore
    }
  };

  // Active running quiz or viewing result
  const [activeQuiz, setActiveQuiz] = useState<QuizConfig | null>(null);
  const [viewingAttempt, setViewingAttempt] = useState<AttemptRecord | null>(null);

  // Persistent state
  const [attempts, setAttempts] = useState<AttemptRecord[]>(() => loadAttempts());
  const [bookmarks, setBookmarks] = useState<string[]>(() => loadBookmarks());
  const [wrongIds, setWrongIds] = useState<string[]>(() => loadWrongIds());
  const [exposureMap, setExposureMap] = useState<Record<string, number>>(() =>
    loadQuestionExposureMap()
  );

  // Separate exposure stats for each collection (Official: 344 questions, AI: 400 questions)
  const officialExposureStats = useMemo(
    () => getExposureStats('official', exposureMap),
    [exposureMap]
  );
  const aiExposureStats = useMemo(
    () => getExposureStats('ai', exposureMap),
    [exposureMap]
  );

  // Chapter collection tab ('official' vs 'ai' - strictly separate, no mixing!)
  const [chapterCollection, setChapterCollection] = useState<ExamCategory>('official');

  // Exam datasets are fetched at runtime from /data/examsData.json & /data/aiExamsData.json (public/data),
  // they are no longer inlined into the JS bundle (see utils/quizHelper.ts).
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      fetch(`/data/examsData.json?v=4.0&t=${Date.now()}`).then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<ExamsDataset>;
      }),
      fetch(`/data/aiExamsData.json?v=4.0&t=${Date.now()}`)
        .then((res) => {
          if (!res.ok) return null;
          return res.json() as Promise<ExamsDataset>;
        })
        .catch((err) => {
          console.warn('AI dataset fetch failed, proceeding with official dataset', err);
          return null;
        }),
    ])
      .then(([officialData, aiData]) => {
        if (cancelled) return;
        initDataset(officialData, aiData);
        return initUserDB();
      })
      .then((userDbResult) => {
        if (cancelled || !userDbResult) return;
        const { activeUser, profiles: dbProfiles, currentProgress } = userDbResult;
        setActiveUsernameState(activeUser);
        setProfiles(dbProfiles);
        setOnlineCount(dbProfiles.filter((p) => p.isOnline).length || 1);

        if (activeUser && currentProgress) {
          // Bind active user context to helper
          setActiveUserProgress(currentProgress);

          // Sync local states
          setAttempts(currentProgress.attempts || []);
          setBookmarks(currentProgress.bookmarks || []);
          setWrongIds(currentProgress.wrongIds || []);
          setExposureMap(currentProgress.exposureMap || {});

          if (currentProgress.settings) {
            if (currentProgress.settings.quizMode) setQuizMode(currentProgress.settings.quizMode);
            if (currentProgress.settings.durationMinutes !== undefined)
              setDurationMinutes(currentProgress.settings.durationMinutes);
            if (currentProgress.settings.questionSetMode)
              setQuestionSetMode(currentProgress.settings.questionSetMode);
            if (currentProgress.settings.shuffleQuestions !== undefined)
              setShuffleQuestions(currentProgress.settings.shuffleQuestions);
            if (currentProgress.settings.languageMode)
              setLanguageModeState(currentProgress.settings.languageMode);
          }
        } else {
          setActiveUserProgress(null);
        }

        setDataReady(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error('Failed to load exams dataset or user DB', err);
        setDataError(
          'Không tải được dữ liệu đề thi. Vui lòng kiểm tra kết nối rồi tải lại trang.'
        );
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Real-time Lightweight Heartbeat (No heavy profiles poll, zero lag)
  useEffect(() => {
    if (!activeUsername) return;

    const doHeartbeat = () => {
      sendHeartbeat(activeUsername)
        .then((count) => {
          if (typeof count === 'number' && count > 0) {
            setOnlineCount(count);
          }
        })
        .catch(() => {});
    };

    doHeartbeat();

    const hbInterval = setInterval(doHeartbeat, 30000);

    const onVisible = () => {
      if (document.visibilityState === 'visible') {
        doHeartbeat();
      }
    };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      clearInterval(hbInterval);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, [activeUsername]);

  const openUserModal = async () => {
    try {
      const allP = await getAllProfiles();
      setProfiles(allP);
    } catch {
      // ignore
    }
    setIsUserModalOpen(true);
  };

  const handleSelectUser = async (username: string) => {
    const progress = await loadUserProgress(username);
    setActiveUserProgress(progress);
    setActiveUsername(username);
    setActiveUsernameState(username);
    sendHeartbeat(username).catch(() => {});

    setAttempts(progress.attempts || []);
    setBookmarks(progress.bookmarks || []);
    setWrongIds(progress.wrongIds || []);
    setExposureMap(progress.exposureMap || {});

    if (progress.settings) {
      if (progress.settings.quizMode) setQuizMode(progress.settings.quizMode);
      if (progress.settings.durationMinutes !== undefined)
        setDurationMinutes(progress.settings.durationMinutes);
      if (progress.settings.questionSetMode)
        setQuestionSetMode(progress.settings.questionSetMode);
      if (progress.settings.shuffleQuestions !== undefined)
        setShuffleQuestions(progress.settings.shuffleQuestions);
      if (progress.settings.languageMode) setLanguageModeState(progress.settings.languageMode);
    }

    const allP = await getAllProfiles();
    setProfiles(allP);
    setToastMessage(`Đã chuyển sang tài khoản "${username}".`);
  };

  const handleCreateOrLogin = async (rawName: string) => {
    const res = await loginOrCreateUser(rawName);
    setActiveUserProgress(res.progress);
    setActiveUsername(res.profile.username);
    setActiveUsernameState(res.profile.username);
    sendHeartbeat(res.profile.username).catch(() => {});

    setAttempts(res.progress.attempts || []);
    setBookmarks(res.progress.bookmarks || []);
    setWrongIds(res.progress.wrongIds || []);
    setExposureMap(res.progress.exposureMap || {});

    const allP = await getAllProfiles();
    setProfiles(allP);
    setToastMessage(
      res.isNew
        ? `Đã tạo tài khoản "${res.profile.displayName}" mới thành công!`
        : `Chào mừng trở lại, ${res.profile.displayName}!`
    );
  };

  const handleLogout = async () => {
    if (activeUsername) {
      await logoutUser(activeUsername);
    }
    setActiveUsernameState(null);
    setActiveQuiz(null);
    setViewingAttempt(null);
    setActiveUserProgress(null);
    const allP = await getAllProfiles();
    setProfiles(allP);
    setToastMessage('Bạn đã đăng xuất khỏi hệ thống.');
  };

  const handleDeleteProfile = async (username: string) => {
    const res = await deleteUserProfile(username);
    setProfiles(res.remaining);
    if (!res.nextActiveUser) {
      setActiveUsernameState(null);
      setActiveUserProgress(null);
      setActiveQuiz(null);
      setViewingAttempt(null);
      setToastMessage(`Đã xóa tài khoản "${username}". Vui lòng đăng nhập để tiếp tục.`);
    } else if (activeUsername && res.nextActiveUser.toLowerCase() !== activeUsername.toLowerCase()) {
      await handleSelectUser(res.nextActiveUser);
      setToastMessage(`Đã xóa tài khoản "${username}".`);
    } else {
      setToastMessage(`Đã xóa tài khoản "${username}".`);
    }
  };

  const handleConfirmResetProgress = async (keepBookmarks: boolean) => {
    if (!activeUsername) return;
    const updated = await resetUserLearningProgress(activeUsername, keepBookmarks);
    setActiveUserProgress(updated);

    setAttempts([]);
    setWrongIds([]);
    setExposureMap({});
    if (!keepBookmarks) {
      setBookmarks([]);
    }
    setToastMessage(
      `Đã đặt lại toàn bộ tiến độ bài học của tài khoản "${activeUsername}" thành công!`
    );
  };

  const handleResetExposure = (category: ExamCategory) => {
    const catLabel =
      category === 'ai' ? 'Bộ Đề do AI Tạo (400 câu)' : 'Bộ Đề Chuẩn Quốc Tế (344 câu)';
    if (
      window.confirm(
        `Đặt lại vòng quay ngẫu nhiên cho ${catLabel}? Tất cả câu hỏi của bộ đề này sẽ bắt đầu lại từ Vòng 1 với tần suất đồng đều nhau.`
      )
    ) {
      resetQuestionsExposure(category);
      setExposureMap(loadQuestionExposureMap());
    }
  };

  const handleToggleBookmark = (qId: string) => {
    setBookmarks((prev) => {
      const exists = prev.includes(qId);
      const next = exists ? prev.filter((id) => id !== qId) : [...prev, qId];
      saveBookmarks(next);
      return next;
    });
  };

  const startExam = (exam: Exam, forcedMode?: QuizMode) => {
    const modeToUse = forcedMode || quizMode;
    const qs = buildExamQuestionSet(exam, questionSetMode, shuffleQuestions);
    recordQuestionsExposure(qs.map((q) => q.id));
    setExposureMap(loadQuestionExposureMap());
    setViewingAttempt(null);
    setActiveQuiz({
      title: exam.title,
      subtitle:
        exam.category === 'ai'
          ? `Bộ Đề do AI Tạo • Chuẩn 40 câu v4.0.1 (${exam.questionCount} câu)`
          : questionSetMode === 'standard40'
          ? `Bộ Đề Chuẩn Quốc Tế • Chuẩn 40 câu (${exam.questionCount} câu gốc)`
          : `Bộ Đề Chuẩn Quốc Tế • Nguyên bản PDF (${exam.questionCount} câu)`,
      mode: modeToUse,
      durationMinutes: modeToUse === 'exam' ? durationMinutes : durationMinutes,
      questions: qs,
      sourceType: 'exam',
      examId: exam.id,
    });
  };

  const startRandomMock40 = (category: ExamCategory, forcedMode?: QuizMode) => {
    const modeToUse = forcedMode || quizMode;
    const qs = generateOfficialMock40(category, true);
    setExposureMap(loadQuestionExposureMap());
    setViewingAttempt(null);
    const catTitle =
      category === 'ai'
        ? 'Bộ Đề do AI Tạo (400 câu)'
        : 'Bộ Đề Chuẩn Quốc Tế (344 câu)';
    const stats = category === 'ai' ? aiExposureStats : officialExposureStats;
    setActiveQuiz({
      title: `Đề thi thử ISTQB CTFL Ngẫu Nhiên (${catTitle})`,
      subtitle: `Phân bổ chuẩn 6 chương (Fair Shuffle-Bag • Vòng ${stats.currentRound} • 100% câu từ ${catTitle})`,
      mode: modeToUse,
      durationMinutes,
      questions: qs,
      sourceType: 'mock40',
    });
  };

  const startChapterPractice = (
    chapterNum: number,
    forcedMode: QuizMode = 'practice',
    category: ExamCategory = chapterCollection
  ) => {
    const pool = getAllQuestions(category).filter((q) => q.chapter === chapterNum);
    const qs = shuffleQuestions ? shuffleArray(pool) : pool;
    recordQuestionsExposure(qs.map((q) => q.id));
    setExposureMap(loadQuestionExposureMap());
    const chMeta = getExamsDataset().metadata.chapters.find((c) => c.chapter === chapterNum);
    setViewingAttempt(null);
    const catLabel = category === 'ai' ? ' (Bộ Đề do AI Tạo)' : ' (Bộ Đề Chuẩn Quốc Tế)';
    setActiveQuiz({
      title: `${chMeta ? chMeta.title : `Chương ${chapterNum}`}${catLabel}`,
      subtitle: `Trọn bộ ${qs.length} câu hỏi thuộc Chương ${chapterNum} (${catLabel.trim()} • 100% không trộn đề)`,
      mode: forcedMode,
      durationMinutes: forcedMode === 'exam' ? durationMinutes : 0,
      questions: qs,
      sourceType: 'chapter',
    });
  };

  const startV4Practice = (
    forcedMode: QuizMode = 'practice',
    category: ExamCategory = chapterCollection
  ) => {
    const pool = getAllQuestions(category).filter((q) => q.isV4);
    const qs = shuffleQuestions ? shuffleArray(pool) : pool;
    recordQuestionsExposure(qs.map((q) => q.id));
    setExposureMap(loadQuestionExposureMap());
    setViewingAttempt(null);
    const catLabel = category === 'ai' ? ' (Bộ Đề do AI Tạo)' : ' (Bộ Đề Chuẩn QT)';
    setActiveQuiz({
      title: `Bộ câu hỏi tình huống mới CTFL v4.0${catLabel}`,
      subtitle: `${qs.length} câu hỏi cập nhật theo Syllabus ISTQB CTFL v4.0 (${catLabel.trim()} • 100% không trộn đề)`,
      mode: forcedMode,
      durationMinutes: forcedMode === 'exam' ? durationMinutes : 0,
      questions: qs,
      sourceType: 'v4',
    });
  };

  const renderExamGrid = (category: ExamCategory) => {
    const exams = getExamsByCategory(category);
    const isAi = category === 'ai';

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {exams.map((exam) => {
          const examAttempts = attempts.filter((a) => a.examId === exam.id);
          const bestAttempt =
            examAttempts.length > 0
              ? examAttempts.reduce((best, curr) =>
                  curr.scorePercentage > best.scorePercentage ? curr : best
                )
              : null;

          const displayQuestionCount =
            questionSetMode === 'standard40' || isAi ? 40 : exam.questionCount;

          return (
            <div
              key={exam.id}
              className={`bg-white rounded-2xl border shadow-xs hover:shadow-md transition flex flex-col justify-between overflow-hidden ${
                isAi
                  ? 'border-emerald-200/80 hover:border-emerald-400'
                  : 'border-slate-200 hover:border-indigo-200'
              }`}
            >
              <div className="p-5 space-y-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    {isAi ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-700 font-bold text-xs border border-emerald-200">
                        <Sparkles className="w-3 h-3 text-emerald-600" />
                        {exam.shortTitle}
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                        {exam.shortTitle}
                      </span>
                    )}
                    <h3 className="text-base font-bold text-slate-900 mt-1.5 leading-snug">
                      {exam.title}
                    </h3>
                  </div>

                  {bestAttempt && (
                    <span
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold shrink-0 ${
                        bestAttempt.passed
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-rose-50 text-rose-700 border border-rose-200'
                      }`}
                    >
                      {bestAttempt.passed ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : (
                        <XCircle className="w-3.5 h-3.5" />
                      )}
                      Cao nhất: {bestAttempt.scorePercentage}%
                    </span>
                  )}
                </div>

                <div className="flex flex-wrap gap-2 text-xs text-slate-600">
                  <span className="px-2.5 py-1 rounded-lg bg-slate-100 font-medium">
                    Số câu thi: <strong>{displayQuestionCount} câu</strong>
                  </span>
                  {isAi ? (
                    <span className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 font-medium">
                      Chuẩn 40 câu v4.0.1
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-lg bg-slate-100">
                      Gốc PDF: {exam.regularCount} câu
                      {exam.supplementaryCount > 0 ? ` + ${exam.supplementaryCount} câu v4.0` : ''}
                    </span>
                  )}
                  {exam.imageCount > 0 && (
                    <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700">
                      {exam.imageCount} sơ đồ/bảng
                    </span>
                  )}
                </div>
              </div>

              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <button
                    type="button"
                    onClick={() => startExam(exam, 'exam')}
                    className={`flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-white font-semibold text-xs sm:text-sm transition cursor-pointer ${
                      isAi
                        ? 'bg-emerald-600 hover:bg-emerald-700'
                        : 'bg-indigo-600 hover:bg-indigo-700'
                    }`}
                  >
                    <Play className="w-3.5 h-3.5 fill-white" />
                    <span>Thi thử</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startExam(exam, 'practice')}
                    className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-600 text-emerald-700 hover:bg-emerald-50 font-semibold text-xs sm:text-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-3.5 h-3.5" />
                    <span>Luyện tập</span>
                  </button>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {isAi ? (
                    <a
                      href={exam.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      title={`Mở PDF đề thi: ${exam.pdfFileName}`}
                      className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold text-xs transition"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF Đề</span>
                    </a>
                  ) : (
                    <>
                      {exam.pdfViUrl && (
                        <a
                          href={exam.pdfViUrl}
                          target="_blank"
                          rel="noreferrer"
                          title={`Mở PDF bản dịch tiếng Việt: ${exam.pdfViFileName}`}
                          className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100 text-indigo-700 font-bold text-xs transition"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>PDF VI</span>
                        </a>
                      )}
                      <a
                        href={exam.pdfUrl}
                        target="_blank"
                        rel="noreferrer"
                        title={`Mở PDF gốc: ${exam.pdfFileName}`}
                        className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 font-semibold text-xs transition"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>PDF EN</span>
                      </a>
                    </>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  const startCustomList = (
    list: Question[],
    title: string,
    subtitle: string,
    sourceType: QuizConfig['sourceType'],
    forcedMode: QuizMode = 'practice'
  ) => {
    if (list.length === 0) return;
    setViewingAttempt(null);
    setActiveQuiz({
      title,
      subtitle,
      mode: forcedMode,
      durationMinutes: forcedMode === 'exam' ? durationMinutes : 0,
      questions: shuffleQuestions ? shuffleArray(list) : list,
      sourceType,
    });
  };

  const renderChapterPracticeView = (category: ExamCategory) => {
    const isAi = category === 'ai';
    const totalQuestions = isAi ? getAllQuestions('ai').length : getAllQuestions('official').length;
    const catTitle = isAi ? 'Bộ Đề do AI Tạo' : 'Bộ Đề Chuẩn Quốc Tế';
    const catShort = isAi ? 'Đề AI' : 'Đề Quốc Tế';
    const wrongScoped = wrongQuestionsPool.filter((q) => q.category === category);
    const bookmarkedScoped = bookmarkedQuestions.filter((q) => q.category === category);
    const v4Scoped = getAllQuestions(category).filter((q) => q.isV4);

    return (
      <div className="space-y-8">
        {/* Track Header & Switcher Banner */}
        <div
          className={`rounded-2xl border p-5 sm:p-6 shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-5 ${
            isAi
              ? 'bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50 border-emerald-200'
              : 'bg-gradient-to-r from-indigo-50 via-sky-50 to-blue-50 border-indigo-200'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                  isAi ? 'bg-emerald-600 text-white' : 'bg-indigo-600 text-white'
                }`}
              >
                {isAi ? <Sparkles className="w-3.5 h-3.5" /> : <Award className="w-3.5 h-3.5" />}
                <span>Phân hệ: {catTitle}</span>
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  isAi ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                }`}
              >
                <CheckCircle2 className="w-3 h-3" /> 100% {catShort} ({totalQuestions} câu)
              </span>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-slate-900 text-white text-[11px] font-bold">
                Tách riêng biệt • Tuyệt đối không trộn đề
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
              Luyện Tập Theo Chương – {catTitle} ({totalQuestions} câu)
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-2xl leading-relaxed">
              {isAi
                ? 'Toàn bộ 400 câu hỏi thi thử thế hệ mới do AI biên soạn bám sát cấu trúc đề thi thật ISTQB CTFL v4.0.1 (chuẩn 40 câu/đề có bảng, sơ đồ và kỹ thuật kiểm thử chi tiết). Tuyệt đối không lẫn câu hỏi từ đề chuẩn Quốc tế.'
                : 'Toàn bộ 344 câu hỏi được trích xuất từ 10 bộ đề thi chuẩn Quốc tế (Sample Exam A, B, C... của ISTQB & các tổ chức khảo thí), phân loại chuẩn theo 6 chương Syllabus CTFL v4.0. Tuyệt đối không lẫn câu hỏi từ đề AI.'}
            </p>
          </div>

          {/* Quick Segmented Switcher */}
          <div className="bg-white/90 backdrop-blur-xs p-1.5 rounded-2xl flex items-center gap-1.5 border border-slate-200 shadow-xs shrink-0">
            <button
              type="button"
              onClick={() => {
                setActiveTab('chapters-official');
                setChapterCollection('official');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 ${
                !isAi
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Award className="w-4 h-4" />
              <span>Chương: Đề Quốc Tế ({getAllQuestions('official').length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('chapters-ai');
                setChapterCollection('ai');
              }}
              className={`px-3.5 py-2 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer flex items-center gap-2 ${
                isAi
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Chương: Đề do AI ({getAllQuestions('ai').length})</span>
            </button>
          </div>
        </div>

        {/* Special Personal Review Decks for this collection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Wrong Questions Deck */}
          <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs">
                <AlertTriangle className="w-3.5 h-3.5" /> Kho câu làm sai ({catShort})
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Ôn Lại Câu Đã Trả Lời Sai ({wrongPoolScoped.length} câu)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tập hợp các câu bạn làm sai thuộc <strong>{catTitle}</strong>. Khi bạn trả lời đúng lại trong các lần thi/luyện, câu hỏi sẽ được gỡ khỏi danh sách này.
              </p>
            </div>
            <button
              type="button"
              disabled={wrongPoolScoped.length === 0}
              onClick={() =>
                startCustomList(
                  wrongPoolScoped,
                  `Luyện Lại Câu Từng Làm Sai – ${catTitle}`,
                  `${wrongPoolScoped.length} câu hỏi cần khắc phục (${catShort})`,
                  'wrong',
                  'practice'
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition cursor-pointer"
            >
              {wrongPoolScoped.length > 0
                ? `Luyện lại ${wrongPoolScoped.length} câu sai (${catShort})`
                : `Chưa có câu sai nào trong ${catShort}`}
            </button>
          </div>

          {/* Bookmarked Questions Deck */}
          <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                <Bookmark className="w-3.5 h-3.5" /> Câu đã lưu ({catShort})
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Kho Câu Hỏi Đã Lưu ({bookmarkedScoped.length} câu)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Tập hợp các câu hỏi hay hoặc khó trong <strong>{catTitle}</strong> mà bạn đã bấm nút "Lưu câu hỏi" khi làm đề hoặc tra cứu.
              </p>
            </div>
            <button
              type="button"
              disabled={bookmarkedScoped.length === 0}
              onClick={() =>
                startCustomList(
                  bookmarkedScoped,
                  `Ôn Tập Câu Hỏi Đã Lưu – ${catTitle}`,
                  `${bookmarkedScoped.length} câu hỏi đã đánh dấu (${catShort})`,
                  'bookmarked',
                  'practice'
                )
              }
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition cursor-pointer"
            >
              {bookmarkedScoped.length > 0
                ? `Ôn tập ${bookmarkedScoped.length} câu đã lưu (${catShort})`
                : `Chưa có câu nào được lưu trong ${catShort}`}
            </button>
          </div>

          {/* CTFL v4.0 New Topics Deck */}
          <div className="bg-white rounded-2xl border border-violet-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-bold text-xs">
                <Sparkles className="w-3.5 h-3.5" /> Chuyên đề mới CTFL v4.0 ({catShort})
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                Câu Hỏi Mới CTFL v4.0 ({v4Scoped.length} câu)
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {isAi
                  ? 'Trọn bộ 400 câu hỏi thi thử thế hệ mới do AI biên soạn bám sát toàn diện chuẩn Syllabus v4.0.1.'
                  : 'Tổng hợp 26 câu hỏi tình huống mới cập nhật theo Syllabus v4.0 trong bộ 10 đề thi chuẩn Quốc tế.'}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => startV4Practice('practice', category)}
                className="flex-1 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                Luyện tập ({v4Scoped.length} câu)
              </button>
              <button
                type="button"
                onClick={() => startV4Practice('exam', category)}
                className="py-2.5 px-3 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50 font-semibold text-xs sm:text-sm transition cursor-pointer"
              >
                Thi tính giờ
              </button>
            </div>
          </div>
        </div>

        {/* 6 Syllabus Chapters */}
        <div className="space-y-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-5 h-5 text-indigo-600" />
              <span>Luyện Tập Từng Chương – {catTitle} (Chương 1 → Chương 6)</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Chọn chương để luyện tập không giới hạn thời gian (kèm giải thích chi tiết & mẹo ghi nhớ) hoặc kiểm tra tính giờ:
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {getExamsDataset().metadata.chapters.map((ch) => {
              const chPool = getAllQuestions(category).filter((q) => q.chapter === ch.chapter);
              return (
                <div
                  key={ch.chapter}
                  className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-indigo-300 transition"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs">
                        Chương {ch.chapter}
                      </span>
                      <span className="text-xs text-slate-500 font-medium">
                        Tỷ trọng thi: {ISTQB_CHAPTER_WEIGHTS[ch.chapter]} / 40 câu
                      </span>
                    </div>
                    <h3 className="text-base font-bold text-slate-900 leading-snug">
                      {ch.title}
                    </h3>
                    <div className="flex items-center justify-between text-xs pt-1">
                      <span
                        className={`inline-flex items-center gap-1 font-semibold ${
                          isAi ? 'text-emerald-700' : 'text-indigo-700'
                        }`}
                      >
                        {isAi ? '🤖 Đề do AI Tạo' : '🏛️ Đề Chuẩn QT'}
                      </span>
                      <span className="font-bold text-slate-800 text-sm">
                        {chPool.length} câu hỏi
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => startChapterPractice(ch.chapter, 'practice', category)}
                      className={`flex-1 py-2 px-3 rounded-xl text-white font-semibold text-xs sm:text-sm transition cursor-pointer ${
                        isAi
                          ? 'bg-emerald-600 hover:bg-emerald-700'
                          : 'bg-indigo-600 hover:bg-indigo-700'
                      }`}
                    >
                      Luyện tập ({chPool.length} câu)
                    </button>
                    <button
                      type="button"
                      onClick={() => startChapterPractice(ch.chapter, 'exam', category)}
                      className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
                    >
                      Kiểm tra
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

  const handleFinishQuiz = (
    userAnswers: Record<string, OptionKey>,
    flaggedIds: string[],
    durationSeconds: number
  ) => {
    if (!activeQuiz) return;
    const { questions, title, subtitle, mode, sourceType, examId } = activeQuiz;
    const totalQuestions = questions.length;
    let correctCount = 0;
    let answeredCount = 0;

    for (const q of questions) {
      const ans = userAnswers[q.id];
      if (ans) {
        answeredCount++;
        if (ans === q.correctAnswer) {
          correctCount++;
        }
      }
    }

    const scorePercentage =
      totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;
    const requiredCorrect = Math.ceil(totalQuestions * 0.65);
    const passed = correctCount >= requiredCorrect;

    const record: AttemptRecord = {
      id: `att_${Date.now()}`,
      title,
      subtitle,
      mode,
      sourceType,
      examId,
      timestamp: new Date().toISOString(),
      durationSeconds,
      timeLimitMinutes: activeQuiz.durationMinutes,
      totalQuestions,
      correctCount,
      answeredCount,
      scorePercentage,
      passed,
      requiredCorrect,
      userAnswers,
      flaggedIds,
      questionIds: questions.map((q) => q.id),
    };

    const updatedAttempts = saveAttempt(record);
    setAttempts(updatedAttempts);

    const updatedWrongIds = updateWrongIdsAfterQuiz(questions, userAnswers);
    setWrongIds(updatedWrongIds);

    setActiveQuiz(null);
    setViewingAttempt(record);
  };

  // Loading / error gate for the runtime-fetched dataset
  if (!dataReady) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <GraduationCap className="w-10 h-10 text-indigo-600 mx-auto" />
          {dataError ? (
            <>
              <p className="text-slate-800 font-semibold max-w-md">{dataError}</p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="px-4 py-2 rounded-xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition cursor-pointer"
              >
                Tải lại trang
              </button>
            </>
          ) : (
            <p className="text-slate-500 font-medium">Đang tải dữ liệu đề thi…</p>
          )}
        </div>
      </div>
    );
  }

  // Mandatory Login Gate: Force user to log in before viewing or taking quizzes
  if (!activeUsername) {
    return (
      <LoginScreen
        profiles={profiles}
        onLogin={handleCreateOrLogin}
        onDeleteProfile={handleDeleteProfile}
      />
    );
  }

  // Active Quiz View
  if (activeQuiz) {
    return (
      <Suspense fallback={<ViewLoading />}>
        <QuizRunner
        config={activeQuiz}
        languageMode={languageMode}
        onChangeLanguageMode={setLanguageMode}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
        onFinish={handleFinishQuiz}
          onExit={() => setActiveQuiz(null)}
        />
      </Suspense>
    );
  }

  // Result Review View
  if (viewingAttempt) {
    const retryQuestions = viewingAttempt.questionIds
      .map((id) => getQuestionById(id))
      .filter(Boolean);

    return (
      <Suspense fallback={<ViewLoading />}>
        <QuizResult
          attempt={viewingAttempt}
        languageMode={languageMode}
        onChangeLanguageMode={setLanguageMode}
        bookmarks={bookmarks}
        onToggleBookmark={handleToggleBookmark}
        onRetryAll={() => {
          setActiveQuiz({
            title: viewingAttempt.title,
            subtitle: viewingAttempt.subtitle,
            mode: viewingAttempt.mode,
            durationMinutes: viewingAttempt.timeLimitMinutes,
            questions: shuffleQuestions ? shuffleArray(retryQuestions) : retryQuestions,
            sourceType: viewingAttempt.sourceType,
            examId: viewingAttempt.examId,
          });
          setViewingAttempt(null);
        }}
        onRetryWrong={(wrongQs) => {
          setActiveQuiz({
            title: `Ôn lại câu sai – ${viewingAttempt.title}`,
            subtitle: `${wrongQs.length} câu làm sai hoặc bỏ trống`,
            mode: 'practice',
            durationMinutes: 0,
            questions: wrongQs,
            sourceType: 'wrong',
          });
          setViewingAttempt(null);
        }}
          onBackHome={() => setViewingAttempt(null)}
        />
      </Suspense>
    );
  }

  const v4QuestionsCount = getAllQuestions().filter((q) => q.isV4).length;
  const bookmarkedQuestions = bookmarks.map((id) => getQuestionById(id)).filter(Boolean);
  const wrongQuestionsPool = wrongIds.map((id) => getQuestionById(id)).filter(Boolean);
  const passedAttemptsCount = attempts.filter((a) => a.passed).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Hero Header */}
      <header className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white border-b border-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
          {/* Top Bar: User Account & Reset Lesson Action */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-white/10">
            <div className="flex items-center gap-2.5 flex-wrap">
              <button
                type="button"
                onClick={openUserModal}
                className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-medium text-xs sm:text-sm transition cursor-pointer shadow-xs group"
                title="Quản lý tài khoản học tập (Đang online)"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500 group-hover:bg-indigo-400 text-white flex items-center justify-center font-bold text-[11px] shrink-0">
                  {activeUsername ? activeUsername.slice(0, 2).toUpperCase() : 'U'}
                </div>
                <span>
                  Tài khoản: <strong className="text-white font-bold">{activeUsername}</strong>
                </span>
                <span className="inline-flex items-center gap-1 text-[10px] bg-emerald-500/25 text-emerald-200 border border-emerald-400/30 px-1.5 py-0.5 rounded-md font-bold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Online
                </span>
                <span className="text-[10px] bg-white/20 text-indigo-100 px-1.5 py-0.5 rounded-md font-semibold">
                  Đổi
                </span>
              </button>

              <button
                type="button"
                onClick={openUserModal}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-400/30 text-emerald-200 text-xs font-semibold transition cursor-pointer"
                title="Xem danh sách học viên đang online"
              >
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>{onlineCount} online</span>
              </button>

              <button
                type="button"
                onClick={handleLogout}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-white/10 hover:bg-rose-500/20 border border-white/15 hover:border-rose-400/30 text-slate-300 hover:text-rose-200 text-xs font-medium transition cursor-pointer"
                title="Đăng xuất khỏi tài khoản này"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Đăng xuất</span>
              </button>

              <button
                type="button"
                onClick={() => setIsResetModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-100 hover:text-white font-medium text-xs transition cursor-pointer"
                title="Đặt lại bài học: Xóa kết quả làm bài, câu sai và reset vòng quay câu hỏi của tài khoản này"
              >
                <RotateCcw className="w-3.5 h-3.5 text-rose-300" />
                <span>Reset bài học</span>
              </button>
            </div>

            <div className="text-[11px] text-indigo-200 hidden md:flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
              <span>Dữ liệu lưu tự động trên Server Database (Docker SQLite)</span>
            </div>
          </div>

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-indigo-200 text-xs font-semibold">
                <GraduationCap className="w-4 h-4" />
                <span>ISTQB Foundation Level (CTFL v4.0) • Song Ngữ Anh – Việt Chuẩn Thuật Ngữ</span>
              </div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold tracking-tight">
                Hệ Thống Luyện Đề Thi Thử ISTQB CTFL
              </h1>
              <p className="text-slate-300 text-sm sm:text-base max-w-2xl">
                Tổng hợp 20 bộ đề thi thử ISTQB CTFL v4.0 (344 câu chuẩn Quốc tế + 400 câu AI Mock v4.0.1, trọn bộ 744 câu trắc nghiệm chất lượng cao,
                hỗ trợ chuyển đổi Tiếng Anh / Tiếng Việt / Song ngữ theo chuẩn thuật ngữ ISTQB).
              </p>
            </div>

            {/* Quick Exam Rules Banner */}
            <div className="bg-white/10 backdrop-blur-xs border border-white/15 rounded-2xl p-4 sm:p-5 grid grid-cols-3 gap-4 shrink-0">
              <div>
                <div className="text-xs text-indigo-200 font-medium">Thời gian thi</div>
                <div className="text-lg sm:text-xl font-extrabold mt-0.5">60 / 75 / 90p</div>
                <div className="text-[11px] text-slate-300">Online & Offline</div>
              </div>
              <div className="border-x border-white/15 px-4">
                <div className="text-xs text-indigo-200 font-medium">Điểm đỗ chuẩn</div>
                <div className="text-lg sm:text-xl font-extrabold text-emerald-400 mt-0.5">
                  ≥ 26/40 câu
                </div>
                <div className="text-[11px] text-slate-300">Tối thiểu 65%</div>
              </div>
              <div>
                <div className="text-xs text-indigo-200 font-medium">Ngôn ngữ</div>
                <div className="text-lg sm:text-xl font-extrabold mt-0.5">EN / VI</div>
                <div className="text-[11px] text-slate-300">Song ngữ ISTQB</div>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {[
                {
                  id: 'official',
                  label: '10 Đề Chuẩn Quốc Tế',
                  countBadge: '344 câu',
                  icon: FileText,
                },
                {
                  id: 'ai',
                  label: '10 Đề do AI Tạo',
                  countBadge: '400 câu',
                  isNew: true,
                  icon: Sparkles,
                },
                {
                  id: 'chapters-official',
                  label: 'Chương: Đề Quốc Tế',
                  countBadge: '344 câu',
                  icon: Layers,
                },
                {
                  id: 'chapters-ai',
                  label: 'Chương: Đề do AI',
                  countBadge: '400 câu',
                  isNew: true,
                  icon: Layers,
                },
                {
                  id: 'bank',
                  label: `Tra Cứu Ngân Hàng (${getAllQuestions().length} câu)`,
                  icon: Search,
                },
                {
                  id: 'glossary',
                  label: 'Từ Điển Thuật Ngữ',
                  icon: BookMarked,
                },
                {
                  id: 'history',
                  label: `Lịch Sử Làm Bài (${attempts.length})`,
                  icon: History,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active =
                  activeTab === tab.id ||
                  (tab.id === 'chapters-official' &&
                    activeTab === 'chapters' &&
                    chapterCollection === 'official') ||
                  (tab.id === 'chapters-ai' &&
                    activeTab === 'chapters' &&
                    chapterCollection === 'ai');
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => {
                      if (tab.id === 'chapters-official') {
                        setActiveTab('chapters-official');
                        setChapterCollection('official');
                      } else if (tab.id === 'chapters-ai') {
                        setActiveTab('chapters-ai');
                        setChapterCollection('ai');
                      } else {
                        setActiveTab(tab.id as ActiveTab);
                      }
                    }}
                    className={`inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 sm:py-2.5 rounded-xl font-semibold text-xs sm:text-sm transition cursor-pointer relative ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        tab.id === 'ai' || tab.id === 'chapters-ai'
                          ? active
                            ? 'text-emerald-600'
                            : 'text-emerald-300'
                          : tab.id === 'official' || tab.id === 'chapters-official'
                          ? active
                            ? 'text-indigo-600'
                            : 'text-indigo-300'
                          : ''
                      }`}
                    />
                    <span>{tab.label}</span>
                    {tab.countBadge && (
                      <span
                        className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold ${
                          active
                            ? tab.id === 'ai' || tab.id === 'chapters-ai'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-indigo-100 text-indigo-800'
                            : tab.id === 'ai' || tab.id === 'chapters-ai'
                            ? 'bg-emerald-500/30 text-emerald-200'
                            : 'bg-white/15 text-slate-200'
                        }`}
                      >
                        {tab.countBadge}
                      </span>
                    )}
                    {tab.isNew && (
                      <span className="w-2 h-2 rounded-full bg-emerald-400 absolute -top-0.5 -right-0.5 animate-pulse" />
                    )}
                  </button>
                );
              })}
            </div>

            {/* Quick Header Language Switcher */}
            <div className="flex items-center bg-white/10 border border-white/15 p-1 rounded-xl">
              <Languages className="w-4 h-4 text-indigo-200 ml-2 mr-1.5" />
              {[
                { id: 'en', label: 'Tiếng Anh (EN)' },
                { id: 'vi', label: 'Tiếng Việt (VI)' },
                { id: 'bilingual', label: 'Song ngữ (EN+VI)' },
              ].map((l) => (
                <button
                  key={l.id}
                  type="button"
                  onClick={() => setLanguageMode(l.id as LanguageMode)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    languageMode === l.id
                      ? 'bg-indigo-500 text-white shadow-xs'
                      : 'text-slate-200 hover:text-white'
                  }`}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </nav>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 space-y-8">
        {/* Configuration Panel (Shown on Official, AI & Chapters tabs) */}
        {(activeTab === 'official' ||
          activeTab === 'ai' ||
          activeTab === 'chapters' ||
          activeTab === 'chapters-official' ||
          activeTab === 'chapters-ai') && (
          <section className="bg-white rounded-2xl border border-slate-200 p-5 sm:p-6 shadow-xs space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <Clock className="w-5 h-5 text-indigo-600" />
                <span>Cấu hình chế độ làm bài, Thời gian & Ngôn ngữ hiển thị câu hỏi</span>
              </h2>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsResetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs transition cursor-pointer"
                  title="Đặt lại bài học: Xóa lịch sử thi, câu làm sai và reset vòng quay câu hỏi của tài khoản hiện tại"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-rose-600" />
                  <span>Reset bài học</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {/* 1. Mode Selection */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  1. Chế độ làm bài
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setQuizMode('exam')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      quizMode === 'exam'
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Thi thử tính giờ
                  </button>
                  <button
                    type="button"
                    onClick={() => setQuizMode('practice')}
                    className={`px-3 py-2.5 rounded-xl border text-xs font-bold transition cursor-pointer ${
                      quizMode === 'practice'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    Luyện tập (Xem giải)
                  </button>
                </div>
              </div>

              {/* 2. Language Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  2. Ngôn ngữ câu hỏi
                </label>
                <select
                  value={languageMode}
                  onChange={(e) => setLanguageMode(e.target.value as LanguageMode)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-indigo-200 bg-indigo-50/50 text-indigo-950 text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="bilingual">Song ngữ Anh – Việt (Khuyên dùng)</option>
                  <option value="vi">Tiếng Việt (Dịch chuẩn ISTQB)</option>
                  <option value="en">Tiếng Anh gốc (Chuẩn thi quốc tế)</option>
                </select>
              </div>

              {/* 3. Duration Selection (60 / 75 / 90 / 0 mins) */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  3. Thời gian làm bài
                </label>
                <select
                  value={durationMinutes}
                  onChange={(e) => setDurationMinutes(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value={60}>60 phút – Chuẩn Online (Pearson VUE / iSQI)</option>
                  <option value={75}>75 phút – Online Non-native (+15p tiếng Anh)</option>
                  <option value={90}>90 phút – Thi Offline tại trung tâm VN</option>
                  <option value={0}>Không giới hạn thời gian</option>
                </select>
              </div>

              {/* 4. Question Count Mode */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  4. Số câu mỗi đề
                </label>
                <select
                  value={questionSetMode}
                  onChange={(e) => setQuestionSetMode(e.target.value as QuestionSetMode)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="standard40">Chuẩn 40 câu / đề (Đỗ ≥ 26/40 câu)</option>
                  <option value="original">Nguyên bản theo từng file PDF (Đỗ ≥ 65%)</option>
                </select>
              </div>

              {/* 5. Shuffle Toggle */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase">
                  5. Thứ tự câu hỏi
                </label>
                <button
                  type="button"
                  onClick={() => setShuffleQuestions((s) => !s)}
                  className={`w-full px-3.5 py-2.5 rounded-xl border text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition cursor-pointer ${
                    shuffleQuestions
                      ? 'bg-violet-50 text-violet-800 border-violet-300'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  <Shuffle className="w-4 h-4" />
                  <span>{shuffleQuestions ? 'Trộn ngẫu nhiên' : 'Giữ nguyên thứ tự'}</span>
                </button>
              </div>
            </div>
          </section>
        )}

        {/* TAB 1: 10 ĐỀ CHUẨN QUỐC TẾ (344 CÂU) */}
        {activeTab === 'official' && (
          <div className="space-y-8">
            {/* Random Official 40-Question Generator Banner */}
            <div className="bg-gradient-to-r from-indigo-700 via-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-sm flex flex-col gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      <GraduationCap className="w-3.5 h-3.5" /> 10 Đề Thi Chuẩn Quốc Tế ISTQB
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-100 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Thuật toán Fair Shuffle-Bag (Đều 100%)
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-indigo-900/60 text-indigo-200 text-xs font-semibold border border-indigo-400/30">
                      Chỉ rút từ 344 câu đề chuẩn
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold">
                    Thi Thử 40 Câu Ngẫu Nhiên – 100% Câu Hỏi Chuẩn Quốc Tế
                  </h3>
                  <p className="text-indigo-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    Tự động rút 40 câu hỏi từ ngân hàng <strong>344 câu gốc chuẩn Quốc tế</strong> theo đúng phân bổ 6 chương ISTQB CTFL v4.0:
                    Chương 1 (8 câu), Chương 2 (6 câu), Chương 3 (4 câu), Chương 4 (11 câu), Chương 5 (9 câu), Chương 6 (2 câu).
                    Cơ chế <strong>xoay tua đều 100%</strong> đảm bảo bạn ôn trọn vẹn toàn bộ 344 câu đề chuẩn mà không bị sót câu nào.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startRandomMock40('official', 'exam')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-xs transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-indigo-700" />
                    <span>Thi thử 40 câu ({durationMinutes || '∞'} phút)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startRandomMock40('official', 'practice')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/25 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Luyện tập 40 câu</span>
                  </button>
                </div>
              </div>

              {/* Fair Randomness Progress & Round Indicator for Official */}
              <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex-1 w-full max-w-xl space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-100 font-medium">
                    <span>
                      Độ phủ câu hỏi đề chuẩn: <strong>{officialExposureStats.coveredCount}/{officialExposureStats.totalQuestions} câu</strong> ({officialExposureStats.coveragePercentage}%)
                    </span>
                    <span className="font-semibold text-white">
                      Vòng quay {officialExposureStats.currentRound} ({officialExposureStats.minSeen} - {officialExposureStats.maxSeen} lần xuất hiện)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.max(3, officialExposureStats.coveragePercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-indigo-200 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResetExposure('official')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-medium cursor-pointer"
                    title="Đặt lại thống kê xuất hiện của 344 câu hỏi đề chuẩn về 0 để bắt đầu chu kỳ quay mới"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại vòng quay đề chuẩn</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 10 Official Exam Cards Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    <span>Danh Sách 10 Bộ Đề Thi Chuẩn Quốc Tế (Đề 1 → Đề 10)</span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Trích xuất nguyên bản từ bộ 10 đề thi PDF chuẩn Quốc tế (344 câu hỏi có bản dịch EN/VI song ngữ)
                  </p>
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  Đã hoàn thành {passedAttemptsCount} lượt thi đạt chuẩn (≥ 65%)
                </span>
              </div>

              {renderExamGrid('official')}
            </div>
          </div>
        )}

        {/* TAB 2: 10 ĐỀ DO AI TẠO (400 CÂU) */}
        {activeTab === 'ai' && (
          <div className="space-y-8">
            {/* Random AI 40-Question Generator Banner */}
            <div className="bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-700 rounded-2xl p-6 text-white shadow-sm flex flex-col gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5 text-yellow-300" /> 10 Đề do AI Tạo (Mock CTFL v4.0.1)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/20 text-emerald-100 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Thuật toán Fair Shuffle-Bag (Đều 100%)
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full bg-teal-950/60 text-teal-200 text-xs font-semibold border border-teal-400/30">
                      Chỉ rút từ 400 câu đề AI
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold">
                    Thi Thử 40 Câu Ngẫu Nhiên – 100% Câu Hỏi Mới Do AI Tạo
                  </h3>
                  <p className="text-teal-50 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    Tự động rút 40 câu hỏi từ ngân hàng <strong>400 câu do AI biên soạn mới</strong> theo đúng phân bổ 6 chương ISTQB CTFL v4.0:
                    Chương 1 (8 câu), Chương 2 (6 câu), Chương 3 (4 câu), Chương 4 (11 câu), Chương 5 (9 câu), Chương 6 (2 câu).
                    Tách riêng hoàn toàn, <strong>tuyệt đối không trộn lẫn với bộ đề chuẩn Quốc tế</strong>.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startRandomMock40('ai', 'exam')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-teal-800 hover:bg-teal-50 font-bold text-sm shadow-xs transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-teal-800" />
                    <span>Thi thử 40 câu AI ({durationMinutes || '∞'} phút)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startRandomMock40('ai', 'practice')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-teal-500/40 hover:bg-teal-500/60 border border-white/25 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Luyện tập 40 câu AI</span>
                  </button>
                </div>
              </div>

              {/* Fair Randomness Progress & Round Indicator for AI */}
              <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex-1 w-full max-w-xl space-y-1.5">
                  <div className="flex items-center justify-between text-teal-100 font-medium">
                    <span>
                      Độ phủ câu hỏi đề AI: <strong>{aiExposureStats.coveredCount}/{aiExposureStats.totalQuestions} câu</strong> ({aiExposureStats.coveragePercentage}%)
                    </span>
                    <span className="font-semibold text-white">
                      Vòng quay {aiExposureStats.currentRound} ({aiExposureStats.minSeen} - {aiExposureStats.maxSeen} lần xuất hiện)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-yellow-300 transition-all duration-500"
                      style={{ width: `${Math.max(3, aiExposureStats.coveragePercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-teal-100 shrink-0">
                  <button
                    type="button"
                    onClick={() => handleResetExposure('ai')}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-medium cursor-pointer"
                    title="Đặt lại thống kê xuất hiện của 400 câu hỏi đề AI về 0 để bắt đầu chu kỳ quay mới"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại vòng quay đề AI</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 10 AI Exam Cards Grid */}
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-emerald-600" />
                    <span>Danh Sách 10 Bộ Đề Thi Thử Do AI Tạo (AI Đề 1 → AI Đề 10)</span>
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                      MỚI
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    10 bộ đề thi thử độc lập biên soạn chuẩn theo đề cương ISTQB CTFL v4.0.1 (40 câu/đề, kèm file PDF đầy đủ)
                  </p>
                </div>
              </div>

              {renderExamGrid('ai')}
            </div>
          </div>
        )}

        {/* TAB 3 & 4: PRACTICE BY CHAPTER (STRICTLY SPLIT: OFFICIAL & AI) */}
        {(activeTab === 'chapters-official' ||
          activeTab === 'chapters-ai' ||
          activeTab === 'chapters') &&
          renderChapterPracticeView(
            activeTab === 'chapters-ai'
              ? 'ai'
              : activeTab === 'chapters-official'
              ? 'official'
              : chapterCollection
          )}

        {/* TAB 3: QUESTION BANK SEARCH */}
        {activeTab === 'bank' && (
          <Suspense fallback={<ViewLoading />}>
            <QuestionBankView
              languageMode={languageMode}
              onChangeLanguageMode={setLanguageMode}
              bookmarks={bookmarks}
              wrongIds={wrongIds}
              onToggleBookmark={handleToggleBookmark}
            />
          </Suspense>
        )}

        {/* TAB 4: ISTQB GLOSSARY */}
        {activeTab === 'glossary' && (
          <Suspense fallback={<ViewLoading />}>
            <GlossaryView />
          </Suspense>
        )}

        {/* TAB 5: ATTEMPT HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">
                  Lịch Sử Làm Bài ({attempts.length} lượt)
                </h2>
                <p className="text-xs text-slate-500">
                  Dữ liệu được lưu tự động trên trình duyệt của bạn. Nhấn vào từng lượt để xem lại chi tiết câu trả lời & giải thích.
                </p>
              </div>
              {attempts.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('Bạn có chắc muốn xóa toàn bộ lịch sử làm bài?')) {
                      clearAttempts();
                      setAttempts([]);
                    }
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-rose-200 text-rose-600 hover:bg-rose-50 text-xs font-semibold transition cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Xóa lịch sử</span>
                </button>
              )}
            </div>

            {attempts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
                <Award className="w-10 h-10 text-slate-300 mx-auto" />
                <div className="text-base font-bold text-slate-800">
                  Chưa có lịch sử làm bài nào
                </div>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Hãy chọn một đề thi ở tab "10 Bộ Đề Thi Thử" để bắt đầu làm bài và theo dõi tiến độ của bạn.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {attempts.map((att) => (
                  <div
                    key={att.id}
                    className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-indigo-200 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            att.passed
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {att.passed ? (
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5" />
                          )}
                          {att.passed ? 'ĐẠT (PASSED)' : 'CHƯA ĐẠT'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                          {att.mode === 'exam' ? 'Thi thử tính giờ' : 'Luyện tập'}
                        </span>
                        {att.examId && att.examId >= 101 ? (
                          <span className="px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 text-xs font-semibold">
                            🤖 Đề AI
                          </span>
                        ) : att.examId ? (
                          <span className="px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 text-xs font-semibold">
                            🏛️ Đề Gốc
                          </span>
                        ) : null}
                        <span className="text-xs text-slate-400">
                          {new Date(att.timestamp).toLocaleString('vi-VN')}
                        </span>
                      </div>
                      <h3 className="font-bold text-slate-900 text-base">{att.title}</h3>
                      <p className="text-xs text-slate-500">
                        {att.subtitle} • Thời gian hoàn thành: {formatTime(att.durationSeconds)}
                      </p>
                    </div>

                    <div className="flex items-center gap-4 shrink-0">
                      <div className="text-right">
                        <div className="text-xl font-black text-slate-900">
                          {att.correctCount}/{att.totalQuestions}{' '}
                          <span
                            className={`text-sm font-bold ${
                              att.passed ? 'text-emerald-600' : 'text-rose-600'
                            }`}
                          >
                            ({att.scorePercentage}%)
                          </span>
                        </div>
                        <div className="text-xs text-slate-500">
                          Yêu cầu đỗ: ≥ {att.requiredCorrect} câu
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => setViewingAttempt(att)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Xem lại</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-700 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-xs sm:text-sm font-semibold">{toastMessage}</span>
          <button
            type="button"
            onClick={() => setToastMessage(null)}
            className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* User Account Switcher / Passwordless Login Modal */}
      <UserAccountModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        activeUsername={activeUsername || ''}
        profiles={profiles}
        onSelectUser={handleSelectUser}
        onCreateOrLogin={handleCreateOrLogin}
        onDeleteProfile={handleDeleteProfile}
        onLogout={handleLogout}
      />

      {/* Reset Lesson Progress Modal */}
      <ResetProgressModal
        isOpen={isResetModalOpen}
        onClose={() => setIsResetModalOpen(false)}
        username={activeUsername || ''}
        attemptsCount={attempts.length}
        wrongCount={wrongIds.length}
        bookmarksCount={bookmarks.length}
        onConfirmReset={handleConfirmResetProgress}
      />
    </div>
  );
}

export default App;
