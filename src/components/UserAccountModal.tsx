import React, { useState } from 'react';
import { User, UserPlus, Check, Trash2, X, GraduationCap, Clock, Award } from 'lucide-react';
import { UserProfile } from '../types';

interface UserAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeUsername: string;
  profiles: UserProfile[];
  onSelectUser: (username: string) => Promise<void>;
  onCreateOrLogin: (username: string) => Promise<void>;
  onDeleteProfile: (username: string) => Promise<void>;
}

export const UserAccountModal: React.FC<UserAccountModalProps> = ({
  isOpen,
  onClose,
  activeUsername,
  profiles,
  onSelectUser,
  onCreateOrLogin,
  onDeleteProfile,
}) => {
  const [inputName, setInputName] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = inputName.trim();
    if (!trimmed) {
      setErrorMsg('Vui lòng nhập tên tài khoản.');
      return;
    }
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      await onCreateOrLogin(trimmed);
      setInputName('');
      onClose();
    } catch {
      setErrorMsg('Có lỗi xảy ra khi lưu tài khoản.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelect = async (username: string) => {
    if (username === activeUsername) {
      onClose();
      return;
    }
    setIsSubmitting(true);
    try {
      await onSelectUser(username);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (username: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (
      window.confirm(
        `Bạn có chắc chắn muốn xóa tài khoản "${username}" và toàn bộ lịch sử học tập của tài khoản này không?`
      )
    ) {
      setIsSubmitting(true);
      try {
        await onDeleteProfile(username);
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="p-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white relative">
          <button
            type="button"
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white transition cursor-pointer"
            aria-label="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center shadow-inner">
              <User className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Tài Khoản Học Tập</h2>
              <p className="text-xs text-indigo-100 mt-0.5">
                Nhập tên để lưu riêng biệt lịch sử & tiến độ (Không cần mật khẩu)
              </p>
            </div>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          {/* Input Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            <label htmlFor="user-name-input" className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
              Tạo hoặc đăng nhập tài khoản
            </label>
            <div className="flex gap-2">
              <input
                id="user-name-input"
                type="text"
                value={inputName}
                onChange={(e) => {
                  setInputName(e.target.value);
                  if (errorMsg) setErrorMsg(null);
                }}
                placeholder="Nhập tên của bạn (vd: DucTC, Tester01...)"
                maxLength={30}
                className="flex-1 px-4 py-3 rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm font-medium placeholder-slate-400"
                autoFocus
              />
              <button
                type="submit"
                disabled={isSubmitting || !inputName.trim()}
                className="inline-flex items-center gap-1.5 px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 text-white disabled:text-slate-400 font-semibold text-sm transition shadow-xs cursor-pointer disabled:cursor-not-allowed"
              >
                <UserPlus className="w-4 h-4" />
                <span>Vào học</span>
              </button>
            </div>
            {errorMsg && <p className="text-xs text-rose-600 font-medium">{errorMsg}</p>}
          </form>

          {/* Existing Accounts List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
              <span>Danh sách tài khoản trên máy này ({profiles.length})</span>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {profiles.map((profile) => {
                const isActive = profile.username.toLowerCase() === activeUsername.toLowerCase();
                return (
                  <div
                    key={profile.username}
                    onClick={() => handleSelect(profile.username)}
                    className={`p-3.5 rounded-2xl border transition flex items-center justify-between gap-3 cursor-pointer ${
                      isActive
                        ? 'border-indigo-500 bg-indigo-50/70 ring-1 ring-indigo-500/50'
                        : 'border-slate-200 hover:border-indigo-200 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                          isActive
                            ? 'bg-indigo-600 text-white'
                            : 'bg-slate-100 text-slate-700 border border-slate-200'
                        }`}
                      >
                        {profile.displayName.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-slate-900 text-sm truncate">
                            {profile.displayName}
                          </span>
                          {isActive && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-bold">
                              <Check className="w-3 h-3" /> Đang học
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          <span>
                            Hoạt động: {new Date(profile.lastActiveAt).toLocaleDateString('vi-VN')}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0">
                      {!isActive && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleSelect(profile.username);
                          }}
                          className="px-3 py-1.5 rounded-lg bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-300 text-xs font-semibold text-slate-700 hover:text-indigo-700 transition cursor-pointer"
                        >
                          Chọn
                        </button>
                      )}
                      {profiles.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => handleDelete(profile.username, e)}
                          className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                          title={`Xóa tài khoản ${profile.displayName}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <span>Dữ liệu được lưu an toàn trong IndexedDB của trình duyệt.</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-slate-700 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
