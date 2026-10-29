import React, { lazy, Suspense, useEffect, useState } from 'react';
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
  getExamsDataset,
  getExposureStats,
  getQuestionById,
  initDataset,
  ISTQB_CHAPTER_WEIGHTS,
  loadAttempts,
  loadBookmarks,
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

type ActiveTab = 'exams' | 'chapters' | 'bank' | 'glossary' | 'history';

const LANG_STORAGE_KEY = 'istqb_ctfl_lang_v1';

export function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('exams');

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
  const [exposureStats, setExposureStats] = useState<QuestionExposureStats>(() =>
    getExposureStats()
  );

  // Exam dataset is fetched at runtime from /data/examsData.json (public/data),
  // it is no longer inlined into the JS bundle (see utils/quizHelper.ts).
  const [dataReady, setDataReady] = useState(false);
  const [dataError, setDataError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch('/data/examsData.json')
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data: ExamsDataset) => {
        if (cancelled) return;
        initDataset(data);
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
          setExposureStats(getExposureStats(currentProgress.exposureMap || {}));

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
    setExposureStats(getExposureStats(progress.exposureMap || {}));

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
    setExposureStats(getExposureStats(res.progress.exposureMap || {}));

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
    setExposureStats(getExposureStats({}));
    if (!keepBookmarks) {
      setBookmarks([]);
    }
    setToastMessage(
      `Đã đặt lại toàn bộ tiến độ bài học của tài khoản "${activeUsername}" thành công!`
    );
  };

  const handleResetExposure = () => {
    if (
      window.confirm(
        'Đặt lại vòng quay ngẫu nhiên? Tất cả 344 câu hỏi sẽ bắt đầu lại từ Vòng 1 với tần suất đồng đều nhau.'
      )
    ) {
      resetQuestionsExposure();
      setExposureStats(getExposureStats());
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
    setExposureStats(getExposureStats());
    setViewingAttempt(null);
    setActiveQuiz({
      title: exam.title,
      subtitle:
        questionSetMode === 'standard40'
          ? `Chuẩn ISTQB 40 câu (${exam.questionCount} câu gốc)`
          : `Nguyên bản theo file PDF (${exam.questionCount} câu)`,
      mode: modeToUse,
      durationMinutes: modeToUse === 'exam' ? durationMinutes : durationMinutes,
      questions: qs,
      sourceType: 'exam',
      examId: exam.id,
    });
  };

  const startRandomMock40 = (forcedMode?: QuizMode) => {
    const modeToUse = forcedMode || quizMode;
    const qs = generateOfficialMock40(true);
    const updatedStats = getExposureStats();
    setExposureStats(updatedStats);
    setViewingAttempt(null);
    setActiveQuiz({
      title: 'Đề thi thử ISTQB CTFL Ngẫu Nhiên (Chuẩn 40 câu)',
      subtitle: `Phân bổ chuẩn 6 chương (Fair Shuffle-Bag • Vòng ${updatedStats.currentRound})`,
      mode: modeToUse,
      durationMinutes,
      questions: qs,
      sourceType: 'mock40',
    });
  };

  const startChapterPractice = (chapterNum: number, forcedMode: QuizMode = 'practice') => {
    const pool = getAllQuestions().filter((q) => q.chapter === chapterNum);
    const qs = shuffleQuestions ? shuffleArray(pool) : pool;
    recordQuestionsExposure(qs.map((q) => q.id));
    setExposureStats(getExposureStats());
    const chMeta = getExamsDataset().metadata.chapters.find((c) => c.chapter === chapterNum);
    setViewingAttempt(null);
    setActiveQuiz({
      title: chMeta ? chMeta.title : `Chương ${chapterNum}`,
      subtitle: `Trọn bộ ${qs.length} câu hỏi thuộc Chương ${chapterNum}`,
      mode: forcedMode,
      durationMinutes: forcedMode === 'exam' ? durationMinutes : 0,
      questions: qs,
      sourceType: 'chapter',
    });
  };

  const startV4Practice = (forcedMode: QuizMode = 'practice') => {
    const pool = getAllQuestions().filter((q) => q.isV4);
    const qs = shuffleQuestions ? shuffleArray(pool) : pool;
    recordQuestionsExposure(qs.map((q) => q.id));
    setExposureStats(getExposureStats());
    setViewingAttempt(null);
    setActiveQuiz({
      title: 'Bộ câu hỏi tình huống mới CTFL v4.0',
      subtitle: `${qs.length} câu hỏi cập nhật theo Syllabus ISTQB CTFL v4.0`,
      mode: forcedMode,
      durationMinutes: forcedMode === 'exam' ? durationMinutes : 0,
      questions: qs,
      sourceType: 'v4',
    });
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
                Trích xuất nguyên bản từ 10 bộ đề PDF (344 câu hỏi trắc nghiệm, 66 sơ đồ/bảng minh họa,
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
                { id: 'exams', label: '10 Bộ Đề Thi Thử', icon: FileText },
                {
                  id: 'chapters',
                  label: 'Luyện Theo Chương & Câu Sai',
                  icon: Layers,
                },
                {
                  id: 'bank',
                  label: `Tra Cứu Kho ${getAllQuestions().length} Câu Hỏi`,
                  icon: Search,
                },
                {
                  id: 'glossary',
                  label: 'Từ Điển Thuật Ngữ ISTQB',
                  icon: BookMarked,
                },
                {
                  id: 'history',
                  label: `Lịch Sử Làm Bài (${attempts.length})`,
                  icon: History,
                },
              ].map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setActiveTab(tab.id as ActiveTab)}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl font-semibold text-sm transition cursor-pointer ${
                      active
                        ? 'bg-white text-slate-900 shadow-sm'
                        : 'bg-white/10 text-slate-200 hover:bg-white/20'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{tab.label}</span>
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
        {/* Configuration Panel (Shown on Exams & Chapters tabs) */}
        {(activeTab === 'exams' || activeTab === 'chapters') && (
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

        {/* TAB 1: 10 EXAMS + RANDOM MOCK 40 */}
        {activeTab === 'exams' && (
          <div className="space-y-8">
            {/* Random Official 40-Question Generator Banner */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-6 text-white shadow-sm flex flex-col gap-5">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-2 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-xs font-bold">
                      <Sparkles className="w-3.5 h-3.5" /> Đề thi mô phỏng chuẩn cấu trúc ISTQB
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-400/25 border border-emerald-300/40 text-emerald-100 text-xs font-semibold">
                      <CheckCircle2 className="w-3 h-3 text-emerald-300" /> Thuật toán Fair Shuffle-Bag (Đều 100%)
                    </span>
                  </div>
                  <h3 className="text-xl font-extrabold">
                    Sinh Đề Thi Thử 40 Câu Ngẫu Nhiên Theo Tỷ Lệ Chương Chuẩn
                  </h3>
                  <p className="text-indigo-100 text-xs sm:text-sm max-w-2xl leading-relaxed">
                    Tự động rút 40 câu hỏi từ ngân hàng 344 câu theo đúng phân bổ đề thi thật của ISTQB:
                    Chương 1 (8 câu), Chương 2 (6 câu), Chương 3 (4 câu), Chương 4 (11 câu), Chương 5 (9 câu), Chương 6 (2 câu).
                    Cơ chế <strong>xoay tua đều 100%</strong> bảo đảm mọi câu hỏi đều được xuất hiện như nhau, tuyệt đối không bị bỏ sót câu nào.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 shrink-0">
                  <button
                    type="button"
                    onClick={() => startRandomMock40('exam')}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-indigo-700 hover:bg-indigo-50 font-bold text-sm shadow-xs transition cursor-pointer"
                  >
                    <Play className="w-4 h-4 fill-indigo-700" />
                    <span>Thi thử 40 câu ({durationMinutes || '∞'} phút)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => startRandomMock40('practice')}
                    className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-indigo-500/40 hover:bg-indigo-500/60 border border-white/25 text-white font-semibold text-sm transition cursor-pointer"
                  >
                    <BookOpen className="w-4 h-4" />
                    <span>Luyện tập 40 câu</span>
                  </button>
                </div>
              </div>

              {/* Fair Randomness Progress & Round Indicator */}
              <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs">
                <div className="flex-1 w-full max-w-xl space-y-1.5">
                  <div className="flex items-center justify-between text-indigo-100 font-medium">
                    <span>
                      Độ phủ câu hỏi: <strong>{exposureStats.coveredCount}/{exposureStats.totalQuestions} câu</strong> ({exposureStats.coveragePercentage}%)
                    </span>
                    <span className="font-semibold text-white">
                      Vòng quay {exposureStats.currentRound} ({exposureStats.minSeen} - {exposureStats.maxSeen} lần xuất hiện)
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-black/25 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-emerald-400 transition-all duration-500"
                      style={{ width: `${Math.max(3, exposureStats.coveragePercentage)}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 text-indigo-200 shrink-0">
                  <button
                    type="button"
                    onClick={handleResetExposure}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition text-xs font-medium cursor-pointer"
                    title="Đặt lại thống kê xuất hiện của các câu hỏi về 0 để bắt đầu chu kỳ quay mới"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Đặt lại vòng quay</span>
                  </button>
                </div>
              </div>
            </div>

            {/* 10 Exam Cards Grid */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-900">
                  Danh sách 10 Đề Thi Thử ISTQB CTFL (Từ bộ file PDF)
                </h2>
                <span className="text-xs text-slate-500">
                  Đã hoàn thành {passedAttemptsCount} lượt thi đạt chuẩn (≥ 65%)
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {getExamsDataset().exams.map((exam) => {
                  const examAttempts = attempts.filter((a) => a.examId === exam.id);
                  const bestAttempt =
                    examAttempts.length > 0
                      ? examAttempts.reduce((best, curr) =>
                          curr.scorePercentage > best.scorePercentage ? curr : best
                        )
                      : null;

                  const displayQuestionCount =
                    questionSetMode === 'standard40' ? 40 : exam.questionCount;

                  return (
                    <div
                      key={exam.id}
                      className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:shadow-md hover:border-indigo-200 transition flex flex-col justify-between overflow-hidden"
                    >
                      <div className="p-5 space-y-4">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-md bg-indigo-50 text-indigo-700 font-bold text-xs">
                              {exam.shortTitle}
                            </span>
                            <h3 className="text-base font-bold text-slate-900 mt-1.5">
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
                          <span className="px-2.5 py-1 rounded-lg bg-slate-100">
                            Gốc PDF: {exam.regularCount} câu
                            {exam.supplementaryCount > 0
                              ? ` + ${exam.supplementaryCount} câu v4.0`
                              : ''}
                          </span>
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
                            className="flex-1 inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
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
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PRACTICE BY CHAPTER, CTFL v4.0, WRONG ANSWERS & BOOKMARKS */}
        {activeTab === 'chapters' && (
          <div className="space-y-8">
            {/* Special Personal Review Decks */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Wrong Questions Deck */}
              <div className="bg-white rounded-2xl border border-rose-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-rose-50 text-rose-700 font-bold text-xs">
                    <AlertTriangle className="w-3.5 h-3.5" /> Kho câu làm sai cần khắc phục
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Ôn Lại Các Câu Đã Trả Lời Sai ({wrongQuestionsPool.length} câu)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Hệ thống tự động lưu các câu bạn làm sai qua các lần thi. Khi bạn trả lời đúng lại, câu hỏi sẽ được gỡ khỏi danh sách này.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={wrongQuestionsPool.length === 0}
                  onClick={() =>
                    startCustomList(
                      wrongQuestionsPool,
                      'Luyện Tập Các Câu Từng Làm Sai',
                      `${wrongQuestionsPool.length} câu hỏi cần ôn kỹ`,
                      'wrong',
                      'practice'
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition cursor-pointer"
                >
                  {wrongQuestionsPool.length > 0
                    ? `Luyện lại ${wrongQuestionsPool.length} câu sai ngay`
                    : 'Chưa có câu làm sai nào'}
                </button>
              </div>

              {/* Bookmarked Questions Deck */}
              <div className="bg-white rounded-2xl border border-indigo-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 text-indigo-700 font-bold text-xs">
                    <Bookmark className="w-3.5 h-3.5" /> Câu hỏi đã lưu / đánh dấu
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Kho Câu Hỏi Đã Lưu ({bookmarkedQuestions.length} câu)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tập hợp các câu hỏi hay hoặc khó mà bạn đã bấm nút "Lưu câu hỏi" trong quá trình làm đề hoặc tra cứu.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={bookmarkedQuestions.length === 0}
                  onClick={() =>
                    startCustomList(
                      bookmarkedQuestions,
                      'Ôn Tập Các Câu Hỏi Đã Lưu',
                      `${bookmarkedQuestions.length} câu hỏi đã đánh dấu`,
                      'bookmarked',
                      'practice'
                    )
                  }
                  className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 disabled:pointer-events-none text-white font-semibold text-sm transition cursor-pointer"
                >
                  {bookmarkedQuestions.length > 0
                    ? `Ôn tập ${bookmarkedQuestions.length} câu đã lưu`
                    : 'Chưa có câu hỏi nào được lưu'}
                </button>
              </div>

              {/* CTFL v4.0 New Topics Deck */}
              <div className="bg-white rounded-2xl border border-violet-200 p-5 shadow-xs flex flex-col justify-between space-y-4">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-violet-50 text-violet-700 font-bold text-xs">
                    <Sparkles className="w-3.5 h-3.5" /> Chuyên đề mới CTFL v4.0
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">
                    Câu Hỏi Theo Nội Dung Mới CTFL v4.0 ({v4QuestionsCount} câu)
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Tổng hợp toàn bộ câu hỏi tình huống mới của Syllabus v4.0: Shift-left, Whole-team, ATDD/BDD, Test Pyramid, Testing Quadrants, Planning Poker, DevOps/CI...
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => startV4Practice('practice')}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
                  >
                    Luyện tập v4.0
                  </button>
                  <button
                    type="button"
                    onClick={() => startV4Practice('exam')}
                    className="py-2.5 px-3 rounded-xl border border-violet-300 text-violet-700 hover:bg-violet-50 font-semibold text-xs sm:text-sm transition cursor-pointer"
                  >
                    Thi tính giờ
                  </button>
                </div>
              </div>
            </div>

            {/* 6 Syllabus Chapters */}
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-slate-900">
                Luyện Tập Theo Từng Chương Chuẩn ISTQB Syllabus (Chương 1 → Chương 6)
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {getExamsDataset().metadata.chapters.map((ch) => (
                  <div
                    key={ch.chapter}
                    className="bg-white rounded-2xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between space-y-4"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-lg bg-sky-50 text-sky-700 border border-sky-200 font-bold text-xs">
                          Chương {ch.chapter}
                        </span>
                        <span className="text-xs text-slate-500 font-medium">
                          Tỷ trọng đề thi thật: {ISTQB_CHAPTER_WEIGHTS[ch.chapter]} / 40 câu
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 leading-snug">
                        {ch.title}
                      </h3>
                      <p className="text-xs text-slate-500">
                        Tổng số câu trong kho:{' '}
                        <strong className="text-slate-800">{ch.questionCount} câu hỏi</strong>
                      </p>
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => startChapterPractice(ch.chapter, 'practice')}
                        className="flex-1 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm transition cursor-pointer"
                      >
                        Luyện tập ({ch.questionCount} câu)
                      </button>
                      <button
                        type="button"
                        onClick={() => startChapterPractice(ch.chapter, 'exam')}
                        className="py-2 px-3 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold text-xs sm:text-sm transition cursor-pointer"
                      >
                        Kiểm tra
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
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
