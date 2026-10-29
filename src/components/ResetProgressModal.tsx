import React, { useState } from 'react';
import { RotateCcw, AlertTriangle, X, CheckSquare, Square, History, XCircle, Shuffle, Bookmark } from 'lucide-react';

interface ResetProgressModalProps {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  attemptsCount: number;
  wrongCount: number;
  bookmarksCount: number;
  onConfirmReset: (keepBookmarks: boolean) => Promise<void>;
}

export const ResetProgressModal: React.FC<ResetProgressModalProps> = ({
  isOpen,
  onClose,
  username,
  attemptsCount,
  wrongCount,
  bookmarksCount,
  onConfirmReset,
}) => {
  const [keepBookmarks, setKeepBookmarks] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleConfirm = async () => {
    setIsSubmitting(true);
    try {
      await onConfirmReset(keepBookmarks);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div
        className="bg-white rounded-3xl shadow-2xl max-w-md w-full overflow-hidden border border-slate-100 flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-rose-600 to-amber-600 text-white relative">
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
              <RotateCcw className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold">Đặt Lại Tiến Độ Bài Học</h2>
              <p className="text-xs text-rose-100 mt-0.5">
                Khởi động lại toàn bộ quá trình học & thi thử
              </p>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5">
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs sm:text-sm space-y-1">
            <div className="flex items-center gap-2 font-bold text-amber-800">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Tài khoản: {username}</span>
            </div>
            <p className="text-amber-800/90 leading-relaxed">
              Hành động này sẽ xóa dữ liệu học tập hiện tại của tài khoản này để bạn bắt đầu lại từ đầu.
            </p>
          </div>

          <div className="space-y-2.5">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">
              Các mục sẽ được đặt lại về 0:
            </p>
            <div className="space-y-2 text-xs sm:text-sm text-slate-700">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <History className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Lịch sử thi thử: <strong>{attemptsCount} lượt thi</strong> (sẽ xóa)
                </span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>
                  Danh sách câu làm sai: <strong>{wrongCount} câu</strong> (sẽ xóa)
                </span>
              </div>
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                <Shuffle className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Vòng quay đề 40 câu ngẫu nhiên: <strong>về Vòng 1</strong> (0/344 câu)
                </span>
              </div>
            </div>
          </div>

          {/* Keep Bookmarks Checkbox Option */}
          <div
            onClick={() => setKeepBookmarks(!keepBookmarks)}
            className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 hover:bg-slate-50 cursor-pointer select-none transition"
          >
            {keepBookmarks ? (
              <CheckSquare className="w-5 h-5 text-indigo-600 shrink-0" />
            ) : (
              <Square className="w-5 h-5 text-slate-400 shrink-0" />
            )}
            <div className="text-xs sm:text-sm">
              <span className="font-semibold text-slate-800">
                Giữ lại các câu đã lưu ({bookmarksCount} câu)
              </span>
              <p className="text-xs text-slate-500">
                Không xóa danh sách câu hỏi bạn đã đánh dấu bookmark.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 font-semibold text-xs sm:text-sm text-slate-700 transition cursor-pointer"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white font-bold text-xs sm:text-sm shadow-xs transition cursor-pointer"
          >
            <RotateCcw className={`w-4 h-4 ${isSubmitting ? 'animate-spin' : ''}`} />
            <span>{isSubmitting ? 'Đang đặt lại…' : 'Xác nhận đặt lại'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
