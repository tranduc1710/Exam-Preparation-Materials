import React, { useState } from 'react';
import {
  GraduationCap,
  User,
  UserPlus,
  LogIn,
  ArrowRight,
  ShieldCheck,
  Server,
  Users,
  CheckCircle2,
  Trash2,
  Clock,
  Sparkles,
} from 'lucide-react';
import { UserProfile } from '../types';

interface LoginScreenProps {
  profiles: UserProfile[];
  onLogin: (username: string) => Promise<void>;
  onDeleteProfile: (username: string) => Promise<void>;
}

function formatRelativeTime(dateStr: string): string {
  try {
    const past = new Date(dateStr).getTime();
    const now = Date.now();
    const diffSecs = Math.floor((now - past) / 1000);

    if (diffSecs < 60) return 'Vừa mới đây';
    const diffMins = Math.floor(diffSecs / 60);
    if (diffMins < 60) return `${diffMins} phút trước`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours} giờ trước`;
    return new Date(dateStr).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return 'Gần đây';
  }
}

export const LoginScreen: React.FC<LoginScreenProps> = ({
  profiles,
  onLogin,
  onDeleteProfile,
}) => {
  const [inputName, setInputName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const onlineCount = profiles.filter((p) => p.isOnline).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = inputName.trim();
    if (!clean) {
      setErrorMsg('Vui lòng nhập tên tài khoản của bạn để vào học.');
      return;
    }
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onLogin(clean);
    } catch {
      setErrorMsg('Không thể đăng nhập vào cơ sở dữ liệu máy chủ. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectExisting = async (username: string) => {
    setErrorMsg(null);
    setIsLoading(true);
    try {
      await onLogin(username);
    } catch {
      setErrorMsg('Có lỗi khi đăng nhập tài khoản. Vui lòng thử lại.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (window.confirm(`Bạn có chắc muốn xóa tài khoản "${username}" và dữ liệu trên máy chủ?`)) {
      try {
        await onDeleteProfile(username);
      } catch {
        setErrorMsg('Lỗi khi xóa tài khoản.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 flex flex-col justify-between selection:bg-indigo-500 selection:text-white">
      {/* Top Bar */}
      <header className="border-b border-white/10 backdrop-blur-md bg-white/5 py-4 px-4 sm:px-8">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
              <GraduationCap className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-extrabold text-base sm:text-lg tracking-tight text-white flex items-center gap-2">
                <span>ISTQB CTFL v4.0</span>
                <span className="text-[11px] font-semibold uppercase px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-400/30">
                  Luyện Thi Chuẩn Quốc Tế
                </span>
              </h1>
              <p className="text-xs text-slate-400 hidden sm:block">
                Hệ thống 10 bộ đề thi – 344 câu hỏi có lời giải chi tiết song ngữ Anh - Việt
              </p>
            </div>
          </div>

          {/* Status Badges */}
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-emerald-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              <span className="font-semibold">
                {onlineCount > 0 ? `${onlineCount} học viên online` : 'Hệ thống trực tuyến'}
              </span>
            </div>
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800/80 border border-slate-700/80 text-slate-300">
              <Server className="w-3.5 h-3.5 text-indigo-400" />
              <span>Server DB (Docker SQLite)</span>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl w-full mx-auto px-4 py-8 sm:py-12 flex flex-col justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left Intro Column */}
          <div className="lg:col-span-6 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-400/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-4 h-4 text-indigo-400" />
              <span>Phiên bản mới nhất chuẩn Syllabus v4.0</span>
            </div>

            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
              Luyện thi thông minh, <br className="hidden sm:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-violet-300 to-pink-400">
                Đỗ chứng chỉ ngay
              </span>
            </h2>

            <p className="text-slate-300 text-sm sm:text-base leading-relaxed max-w-xl mx-auto lg:mx-0">
              Chào mừng bạn đến với hệ thống ôn luyện chứng chỉ kiểm thử phần mềm quốc tế ISTQB Certified Tester Foundation Level.
              Vui lòng đăng nhập bằng tên của bạn để hệ thống lưu trữ tiến độ học tập trên máy chủ.
            </p>

            {/* Feature Pills */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left pt-2">
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">Không cần mật khẩu</div>
                  <div className="text-[11px] text-slate-400">Tự động tạo hoặc vào đúng tên của bạn</div>
                </div>
              </div>
              <div className="p-3 rounded-2xl bg-white/5 border border-white/10 flex items-start gap-3">
                <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-xs text-white">Lưu trên Server Docker</div>
                  <div className="text-[11px] text-slate-400">Lịch sử bài thi & điểm số được bảo toàn</div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Login Box Column */}
          <div className="lg:col-span-6">
            <div className="bg-slate-900/90 border border-white/15 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl relative overflow-hidden">
              {/* Decorative Glow */}
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-white/10">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-600/30 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
                    <User className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Đăng Nhập Tài Khoản</h3>
                    <p className="text-xs text-slate-400">Bắt buộc đăng nhập để tiếp tục vào học</p>
                  </div>
                </div>

                {/* Form Input */}
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label
                      htmlFor="login-username"
                      className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2"
                    >
                      Tên của bạn / Tên tài khoản
                    </label>
                    <div className="relative">
                      <input
                        id="login-username"
                        type="text"
                        value={inputName}
                        onChange={(e) => {
                          setInputName(e.target.value);
                          if (errorMsg) setErrorMsg(null);
                        }}
                        placeholder="Nhập tên của bạn (vd: DucTC, LinhNguyen...)"
                        maxLength={35}
                        disabled={isLoading}
                        className="w-full px-4 py-3.5 pl-11 rounded-2xl bg-white/5 border border-white/15 focus:border-indigo-400 focus:bg-white/10 focus:outline-hidden text-white placeholder-slate-500 text-sm font-medium transition"
                        autoFocus
                      />
                      <UserPlus className="w-4 h-4 text-slate-400 absolute left-4 top-1/2 -translate-y-1/2" />
                    </div>
                  </div>

                  {errorMsg && (
                    <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs font-medium">
                      {errorMsg}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={isLoading || !inputName.trim()}
                    className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 disabled:opacity-50 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition flex items-center justify-center gap-2 cursor-pointer disabled:cursor-not-allowed"
                  >
                    {isLoading ? (
                      <span className="inline-block animate-pulse">Đang kết nối Database...</span>
                    ) : (
                      <>
                        <span>Vào phòng ôn thi</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>

                {/* Existing Accounts List */}
                {profiles.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-white/10">
                    <div className="flex items-center justify-between mb-3 text-xs">
                      <span className="font-semibold text-slate-400 uppercase tracking-wider">
                        Hoặc chọn tài khoản có sẵn ({profiles.length})
                      </span>
                      <span className="text-[11px] text-slate-500">Bấm để đăng nhập</span>
                    </div>

                    <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
                      {profiles.map((profile) => {
                        const relativeTime = formatRelativeTime(profile.lastActiveAt);

                        return (
                          <div
                            key={profile.username}
                            onClick={() => !isLoading && handleSelectExisting(profile.username)}
                            className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-indigo-400/40 transition cursor-pointer group"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-700 text-white font-bold text-xs flex items-center justify-center shrink-0">
                                {profile.displayName.slice(0, 1).toUpperCase()}
                              </div>
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white group-hover:text-indigo-300 transition truncate">
                                    {profile.displayName}
                                  </span>
                                  {profile.isOnline ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                                      Online
                                    </span>
                                  ) : (
                                    <span className="text-[10px] text-slate-500">Offline</span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-0.5">
                                  <Clock className="w-3 h-3" />
                                  <span>{profile.isOnline ? 'Đang hoạt động' : relativeTime}</span>
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                disabled={isLoading}
                                className="px-3 py-1.5 rounded-xl bg-indigo-600/40 hover:bg-indigo-600 border border-indigo-400/30 text-xs font-semibold text-indigo-100 group-hover:text-white transition flex items-center gap-1"
                              >
                                <LogIn className="w-3.5 h-3.5" />
                                <span>Vào</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => handleDelete(profile.username, e)}
                                title="Xóa tài khoản này khỏi DB"
                                className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition opacity-0 group-hover:opacity-100"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-4 px-4 text-center text-xs text-slate-500">
        <p>Hệ thống ôn thi ISTQB Foundation Level (CTFL v4.0) • Toàn bộ dữ liệu được lưu trữ tự động trên Server SQLite Docker</p>
      </footer>
    </div>
  );
};
