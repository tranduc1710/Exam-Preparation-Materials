import React from 'react';
import { Question } from '../types';
import { Code, Copy, Check, Bug } from 'lucide-react';

/**
 * Checks if the Vietnamese content is meaningfully different from the English text.
 * When questions are generated exclusively in Vietnamese (e.g., AI Mock Exams),
 * both en and vi fields contain identical Vietnamese text. In that case, bilingual
 * mode should NOT display the exact same text twice.
 */
export function isContentBilingual(en?: string, vi?: string): boolean {
  if (!vi || !en) return false;
  return en.trim().toLowerCase() !== vi.trim().toLowerCase();
}

/**
 * Auto-indents pseudo-code according to nesting level (IF ... THEN, ELSE, END IF).
 */
export function autoIndentCode(codeStr: string): string {
  const lines = codeStr.split('\n').map(l => l.trim()).filter(Boolean);
  let indent = 0;
  const result: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    // Dedent before line if line is ELSE or END IF or END WHILE or END FOR
    if (/^(ELSE|END IF|END WHILE|END FOR|END)\b/i.test(line)) {
      indent = Math.max(0, indent - 1);
    }

    const padded = '  '.repeat(indent) + line;
    result.push(padded);

    // Indent after line if line starts with IF ... THEN, or is ELSE, or starts with WHILE/FOR
    if (/^(IF\b.*THEN|ELSE|WHILE\b|FOR\b)/i.test(line)) {
      indent++;
    }
  }
  return result.join('\n');
}

/**
 * Formats a single code line with syntax coloring for keywords, functions, values, and operators.
 */
function formatCodeLine(line: string): React.ReactNode {
  if (!line.trim()) return <span>&nbsp;</span>;

  const leadingSpacesCount = line.search(/\S|$/);
  const leadingSpaces = line.slice(0, leadingSpacesCount);
  const content = line.slice(leadingSpacesCount);

  const tokenRegex =
    /(\b(?:IF|THEN|ELSE|END IF|WHILE|END WHILE|FOR|END FOR|DO)\b|\b(?:READ|PRINT|WRITE)\b|\b(?:turnOnFan|turnOnHeater|writeLog|logGuest|alert)\b|\b(?:TRUE|FALSE)\b|"[^"]*"|\b\d+\b|[><=*\-+:]+|[(),]|[\w]+|\s+)/g;

  const matches = content.match(tokenRegex) || [content];

  return (
    <span>
      {leadingSpaces && <span>{leadingSpaces}</span>}
      {matches.map((token, idx) => {
        if (/^(?:IF|THEN|ELSE|END IF|WHILE|END WHILE|FOR|END FOR|DO)$/.test(token)) {
          return (
            <span key={idx} className="text-purple-400 font-bold">
              {token}
            </span>
          );
        }
        if (/^(?:READ|PRINT|WRITE)$/.test(token)) {
          return (
            <span key={idx} className="text-amber-300 font-bold tracking-wide">
              {token}
            </span>
          );
        }
        if (/^(?:turnOnFan|turnOnHeater|writeLog|logGuest|alert)$/.test(token)) {
          return (
            <span key={idx} className="text-emerald-400 font-semibold">
              {token}
            </span>
          );
        }
        if (/^(?:TRUE|FALSE)$/.test(token)) {
          return (
            <span key={idx} className="text-rose-400 font-bold">
              {token}
            </span>
          );
        }
        if (/^"[^"]*"$/.test(token)) {
          return (
            <span key={idx} className="text-emerald-300 font-medium">
              {token}
            </span>
          );
        }
        if (/^\d+$/.test(token)) {
          return (
            <span key={idx} className="text-yellow-200 font-semibold">
              {token}
            </span>
          );
        }
        if (/^[><=*\-+:]+$/.test(token)) {
          return (
            <span key={idx} className="text-pink-400 font-bold px-0.5">
              {token}
            </span>
          );
        }
        if (/^[(),]$/.test(token)) {
          return (
            <span key={idx} className="text-slate-400">
              {token}
            </span>
          );
        }
        if (/^\w+$/.test(token)) {
          return (
            <span key={idx} className="text-sky-200">
              {token}
            </span>
          );
        }
        return <span key={idx}>{token}</span>;
      })}
    </span>
  );
}

/**
 * Beautiful framed container for code and pseudo-code blocks with line numbering & copy function.
 */
export function CodeBlockFrame({
  code,
  title = 'Đoạn mã giả (Pseudo-code)',
  language = 'ISTQB CTFL v4.0'
}: {
  code: string;
  title?: string;
  language?: string;
}) {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(code).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }).catch(() => {});
    }
  };

  const indentedCode = autoIndentCode(code);
  const lines = indentedCode.split('\n');

  return (
    <div className="my-3.5 rounded-xl border border-slate-700/80 bg-slate-900 shadow-md overflow-hidden text-left font-mono select-text not-italic whitespace-normal">
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-3.5 py-2 bg-slate-800/90 border-b border-slate-700/80 select-none">
        <div className="flex items-center gap-2">
          {/* macOS window control dots */}
          <div className="flex items-center gap-1.5 mr-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500/80 inline-block"></span>
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/80 inline-block"></span>
          </div>
          <Code className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold text-slate-200 tracking-wide">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-medium text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded border border-slate-600/50">
            {language}
          </span>
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 text-[11px] font-medium text-slate-300 hover:text-white bg-slate-700/60 hover:bg-slate-700 px-2 py-0.5 rounded transition-colors cursor-pointer"
            title="Sao chép mã"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-400" />
                <span className="text-emerald-400 font-semibold">Đã chép</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3 text-slate-400" />
                <span>Sao chép</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Code body with line numbering */}
      <div className="p-3 sm:p-4 overflow-x-auto text-xs sm:text-sm leading-relaxed bg-slate-950/70 font-mono">
        <table className="w-full border-collapse">
          <tbody>
            {lines.map((line, idx) => (
              <tr key={idx} className="hover:bg-slate-800/30 transition-colors">
                <td className="pr-3.5 py-0.5 text-right text-slate-500 select-none font-mono text-[11px] sm:text-xs w-7 sm:w-8 border-r border-slate-800">
                  {idx + 1}
                </td>
                <td className="pl-3.5 py-0.5 text-slate-100 whitespace-pre font-mono">
                  {formatCodeLine(line)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/**
 * Beautiful framed card for Defect / Bug reports in questions.
 */
export function DefectReportFrame({ rawText }: { rawText: string }) {
  const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
  const fields = lines.map(line => {
    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) return { key: '', value: line };
    return {
      key: line.slice(0, colonIdx).trim(),
      value: line.slice(colonIdx + 1).trim()
    };
  });

  return (
    <div className="my-3.5 rounded-xl border border-rose-300 bg-rose-50/40 shadow-sm overflow-hidden text-left select-text whitespace-normal">
      <div className="flex items-center justify-between px-3.5 py-2 bg-gradient-to-r from-rose-100 via-rose-50 to-amber-50 border-b border-rose-200 select-none">
        <div className="flex items-center gap-2">
          <Bug className="w-4 h-4 text-rose-600" />
          <span className="text-xs font-bold text-rose-950 uppercase tracking-wider">
            Báo cáo khiếm khuyết (Defect Report)
          </span>
        </div>
        <span className="text-[11px] font-semibold text-rose-700 bg-white/80 px-2 py-0.5 rounded-full border border-rose-200">
          Vòng đời quản lý lỗi
        </span>
      </div>
      <div className="p-3.5 space-y-2 text-xs sm:text-sm">
        {fields.map((f, i) => (
          <div key={i} className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-2">
            <span className="font-bold text-slate-700 sm:w-44 shrink-0">
              {f.key ? `${f.key}:` : ''}
            </span>
            <span
              className={`font-medium ${
                f.key.includes('Mã')
                  ? 'font-mono font-bold text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded border border-indigo-200 inline-block w-fit'
                  : f.key.includes('nghiêm trọng')
                  ? 'font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded inline-block w-fit'
                  : f.key.includes('Trạng thái')
                  ? 'font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300 inline-block w-fit'
                  : 'text-slate-900'
              }`}
            >
              {f.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function isBugReportLine(line: string): boolean {
  const t = line.trim();
  return /^(Mã|Tiêu đề|Phiên bản|Các bước|Mô tả|Kết quả thực tế|Kết quả mong đợi|Mức độ nghiêm trọng|Trạng thái|Ưu tiên):\s*/i.test(t);
}

function isCodeLine(line: string): boolean {
  const t = line.trim();
  if (!t) return false;
  return (
    /^(READ|WRITE|PRINT|IF\b|ELSE\b|END IF\b|WHILE\b|END WHILE\b|FOR\b|END FOR\b|DO\b)/i.test(t) ||
    /^(price|total|count|sum|res|result|status|check)\s*=/i.test(t) ||
    /^[a-zA-Z0-9_]+\s*\([^)]*\)\s*$/i.test(t) ||
    /^(turnOnFan|turnOnHeater|writeLog|logGuest|alert)\b/i.test(t)
  );
}

interface QuestionBlock {
  type: 'text' | 'code' | 'bug';
  content: string;
}

/**
 * Splits raw question text into regular text paragraphs and code/defect blocks.
 */
function parseQuestionBlocks(text: string): QuestionBlock[] {
  if (!text) return [];

  // Check for markdown code fences ```
  if (text.includes('```')) {
    const parts = text.split(/(```[\s\S]*?```)/g);
    const result: QuestionBlock[] = [];
    for (const part of parts) {
      if (part.startsWith('```') && part.endsWith('```')) {
        const inner = part.slice(3, -3).replace(/^[a-zA-Z0-9_-]*\n/, '');
        result.push({ type: 'code', content: inner.trim() });
      } else if (part.trim()) {
        result.push({ type: 'text', content: part.trim() });
      }
    }
    return result;
  }

  const lines = text.split('\n');
  const blocks: QuestionBlock[] = [];
  let currentLines: string[] = [];
  let currentType: 'text' | 'code' | 'bug' = 'text';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const isCode = isCodeLine(line);
    const isBug = isBugReportLine(line);

    if (currentType === 'text') {
      if (isCode) {
        let count = 0;
        for (let j = i; j < lines.length; j++) {
          if (isCodeLine(lines[j])) count++;
          else break;
        }
        if (count >= 2) {
          if (currentLines.length > 0) {
            const trimmed = currentLines.join('\n').replace(/\n+$/, '');
            if (trimmed) blocks.push({ type: 'text', content: trimmed });
            currentLines = [];
          }
          currentType = 'code';
        }
      } else if (isBug) {
        let count = 0;
        for (let j = i; j < lines.length; j++) {
          if (isBugReportLine(lines[j])) count++;
          else break;
        }
        if (count >= 3) {
          if (currentLines.length > 0) {
            const trimmed = currentLines.join('\n').replace(/\n+$/, '');
            if (trimmed) blocks.push({ type: 'text', content: trimmed });
            currentLines = [];
          }
          currentType = 'bug';
        }
      }
    } else if (currentType === 'code') {
      if (!isCode && line.trim() !== '') {
        const trimmed = currentLines.join('\n').trim();
        if (trimmed) blocks.push({ type: 'code', content: trimmed });
        currentLines = [];
        currentType = 'text';
      }
    } else if (currentType === 'bug') {
      if (!isBug && line.trim() !== '') {
        const trimmed = currentLines.join('\n').trim();
        if (trimmed) blocks.push({ type: 'bug', content: trimmed });
        currentLines = [];
        currentType = 'text';
      }
    }

    currentLines.push(line);
  }

  if (currentLines.length > 0) {
    const trimmed = currentLines.join('\n').trim();
    if (trimmed) blocks.push({ type: currentType, content: trimmed });
  }

  return blocks;
}

/**
 * Highlights ISTQB trap words, keywords, and critical constraints in question text.
 */
function renderTextKeywords(text: string): React.ReactNode {
  if (!text) return null;
  const parts = text.split(
    /(\b(?:RÕ NHẤT|KHÔNG ĐÚNG|ĐÚNG NHẤT|NGOẠI TRỪ|KHÔNG PHẢI|CHÍNH|ĐẦU TIÊN|TỐI THIỂU|TỐI ĐA|QUAN TRỌNG NHẤT|ƯU TIÊN NHẤT|MOST|LEAST|NOT|BEST|EXCEPT|MAIN|PRIMARY|FIRST|ALWAYS|NEVER|TRUE|FALSE)\b)/g
  );
  if (parts.length === 1) return text;
  return parts.map((part, i) => {
    if (
      /^(?:RÕ NHẤT|KHÔNG ĐÚNG|ĐÚNG NHẤT|NGOẠI TRỪ|KHÔNG PHẢI|CHÍNH|ĐẦU TIÊN|TỐI THIỂU|TỐI ĐA|QUAN TRỌNG NHẤT|ƯU TIÊN NHẤT|MOST|LEAST|NOT|BEST|EXCEPT|MAIN|PRIMARY|FIRST|ALWAYS|NEVER|TRUE|FALSE)$/.test(
        part
      )
    ) {
      return (
        <span
          key={i}
          className="font-extrabold text-amber-950 bg-amber-200/90 px-1.5 py-0.5 rounded-md border border-amber-300 shadow-2xs tracking-wide underline decoration-amber-500 decoration-2 underline-offset-2"
        >
          {part}
        </span>
      );
    }
    return part;
  });
}

/**
 * High-level question stem renderer that parses code blocks, bug reports, and keywords.
 */
export function renderHighlightedText(text: string): React.ReactNode {
  if (!text) return null;

  const blocks = parseQuestionBlocks(text);

  if (blocks.length === 0) return null;
  if (blocks.length === 1 && blocks[0].type === 'text') {
    return renderTextKeywords(blocks[0].content);
  }

  return (
    <>
      {blocks.map((block, idx) => {
        if (block.type === 'code') {
          return <CodeBlockFrame key={idx} code={block.content} />;
        }
        if (block.type === 'bug') {
          return <DefectReportFrame key={idx} rawText={block.content} />;
        }
        return (
          <React.Fragment key={idx}>
            {renderTextKeywords(block.content)}
          </React.Fragment>
        );
      })}
    </>
  );
}

/**
 * Authoritative Syllabus rules to guarantee every question has a high-value mnemonic,
 * even if client browser had an older cached JSON file.
 */
const SYLLABUS_RULES: Array<{
  pattern: RegExp;
  mnemonic?: string;
  custom?: (fullText: string) => string;
}> = [
  // CHƯƠNG 1
  {
    pattern: /(1\.1\.1|mục tiêu kiểm thử|test objective)/i,
    mnemonic: '💡 Mẹo nhớ: Mục tiêu kiểm thử gồm: Đánh giá sản phẩm, kích hoạt khiếm khuyết để tìm lỗi, cung cấp thông tin chất lượng cho các bên liên quan và giảm thiểu rủi ro vận hành.'
  },
  {
    pattern: /(1\.1\.2|testing and debugging|gỡ lỗi)/i,
    mnemonic: '💡 Mẹo nhớ: Phân biệt Testing vs Debugging: Testing = Tìm ra sự cố/khiếm khuyết (Tester làm). Debugging = Định vị nguyên nhân trong mã nguồn và sửa code (Developer làm).'
  },
  {
    pattern: /(1\.2\.1|tại sao kiểm thử là cần thiết|why is testing necessary)/i,
    mnemonic: '💡 Mẹo nhớ: Kiểm thử giúp phát hiện lỗi sớm, giảm thiểu rủi ro sự cố khi vận hành, tiết kiệm chi phí sửa chữa và đảm bảo tuân thủ các quy chuẩn/hợp đồng.'
  },
  {
    pattern: /(1\.2\.2|\bqa\b.*qc|quality assurance|đảm bảo chất lượng)/i,
    mnemonic: '💡 Mẹo nhớ: QA vs QC: QA định hướng vào QUY TRÌNH (phòng ngừa khiếm khuyết phát sinh). QC & Testing định hướng vào SẢN PHẨM (kiểm tra và phát hiện lỗi trực tiếp).'
  },
  {
    pattern: /(1\.2\.3|error.*defect.*failure|sai sót.*khiếm khuyết.*thất bại)/i,
    mnemonic: '💡 Mẹo nhớ chuỗi nhân quả chuẩn ISTQB: Con người phạm SAI SÓT (Error) ➔ Tạo ra KHIẾM KHUYẾT trong code/tài liệu (Defect/Bug) ➔ Gây ra SỰ CỐ/THẤT BẠI khi hệ thống chạy (Failure).'
  },
  {
    pattern: /(1\.2\.4|root cause|nguyên nhân gốc)/i,
    mnemonic: '💡 Mẹo nhớ: Nguyên nhân gốc rễ (Root Cause) là yếu tố cốt lõi dẫn đến sai sót của con người; xác định và loại bỏ nó giúp ngăn ngừa lỗi tương tự tái diễn trong tương lai.'
  },
  {
    pattern: /(1\.3\.1|nguyên tắc.*kiểm thử|testing principle)/i,
    custom: (fullText) => {
      if (fullText.includes('vắng mặt') || fullText.includes('hiện diện') || fullText.includes('presence') || fullText.includes('hoàn toàn không còn lỗi')) {
        return '💡 Mẹo nhớ Nguyên tắc 1: Kiểm thử chỉ chứng minh CÓ lỗi (presence), KHÔNG THỂ chứng minh HẾT lỗi (absence). Thấy khẳng định "phần mềm 100% bug-free" ➔ Khẳng định SAI.';
      }
      if (fullText.includes('kiệt quệ') || fullText.includes('exhaustive') || fullText.includes('mọi trường hợp') || fullText.includes('mọi kịch bản')) {
        return '💡 Mẹo nhớ Nguyên tắc 2: Kiểm thử kiệt quệ là BẤT KHẢ THI. Luôn phải dựa trên phân tích rủi ro và mức độ ưu tiên để quyết định phạm vi kiểm thử hợp lý.';
      }
      if (fullText.includes('sớm') || fullText.includes('early') || fullText.includes('shift-left') || fullText.includes('shift left')) {
        return '💡 Mẹo nhớ Nguyên tắc 3: Kiểm thử càng sớm càng tốt (Early testing / Shift-left): Bắt đầu ngay từ khâu phân tích yêu cầu để phát hiện lỗi sớm khi chi phí sửa còn rẻ nhất.';
      }
      if (fullText.includes('tập trung') || fullText.includes('cluster') || fullText.includes('cụm lỗi') || fullText.includes('pareto')) {
        return '💡 Mẹo nhớ Nguyên tắc 4: Lỗi có xu hướng tập trung (Defect clustering / Pareto 80-20): Phần lớn lỗi thường chỉ nằm ở một số ít module phức tạp hoặc hay thay đổi.';
      }
      if (fullText.includes('thuốc trừ sâu') || fullText.includes('pesticide')) {
        return '💡 Mẹo nhớ Nguyên tắc 5: Nghịch lý thuốc trừ sâu (Pesticide paradox): Lặp đi lặp lại cùng một bộ test case thì sâu bọ "nhờn thuốc". BẮT BUỘC phải định kỳ cập nhật test case.';
      }
      if (fullText.includes('ngữ cảnh') || fullText.includes('context')) {
        return '💡 Mẹo nhớ Nguyên tắc 6: Kiểm thử phụ thuộc ngữ cảnh: Không có công thức test chung cho mọi hệ thống; app ngân hàng/y tế đòi hỏi quy trình khắt khe hơn game hay trang tin tức.';
      }
      if (fullText.includes('ngộ nhận') || fullText.includes('absence-of-errors') || fullText.includes('không có lỗi')) {
        return '💡 Mẹo nhớ Nguyên tắc 7: Ngộ nhận về việc không có lỗi (Absence-of-errors fallacy): Sửa hết 100% bug theo đặc tả nhưng sản phẩm không đúng nhu cầu người dùng thì hệ thống VẪN THẤT BẠI.';
      }
      return '💡 Mẹo nhớ 7 nguyên tắc: Hiện diện của lỗi, Kiểm thử kiệt quệ bất khả thi, Kiểm thử sớm, Cụm lỗi, Nghịch lý thuốc trừ sâu, Phụ thuộc ngữ cảnh, Ngộ nhận không có lỗi.';
    }
  },
  {
    pattern: /(1\.4\.1|\bhoạt động kiểm thử\b|\bquy trình kiểm thử\b|test activities|test process)/i,
    mnemonic: '💡 Mẹo nhớ các hoạt động kiểm thử: Kế hoạch (Plan) ➔ Giám sát & Kiểm soát (Monitor & Control) ➔ Phân tích (Analyze - Test What) ➔ Thiết kế (Design - Test How) ➔ Hiện thực (Implement) ➔ Thực thi (Execute) ➔ Hoàn tất (Complete).'
  },
  {
    pattern: /(1\.4\.2|cơ sở kiểm thử|test basis)/i,
    mnemonic: '💡 Mẹo nhớ: Cơ sở kiểm thử (Test Basis) là toàn bộ tài liệu dùng để phân tích yêu cầu và thiết kế test case (User story, tài liệu đặc tả, sơ đồ kiến trúc, quy chuẩn).'
  },
  {
    pattern: /(1\.4\.3|sản phẩm kiểm thử|testware)/i,
    mnemonic: '💡 Mẹo nhớ Testware từng giai đoạn: Kế hoạch ➔ Test Plan; Phân tích ➔ Test Conditions; Thiết kế ➔ Test Cases; Hiện thực ➔ Test Procedures/Scripts; Thực thi ➔ Test Logs/Defect Reports; Hoàn tất ➔ Test Completion Report.'
  },
  {
    pattern: /(1\.4\.4|truy xuất nguồn gốc|traceability)/i,
    mnemonic: '💡 Mẹo nhớ: Truy xuất nguồn gốc 2 chiều (Bidirectional Traceability) giúp xác định độ bao phủ yêu cầu, đánh giá tác động khi yêu cầu thay đổi và hỗ trợ kiểm toán chất lượng.'
  },
  {
    pattern: /(1\.4\.5|1\.5\.1|vai trò.*kiểm thử|test manager|tester.*nhiệm vụ)/i,
    mnemonic: '💡 Mẹo nhớ phân định vai trò: Test Management tập trung vào lập kế hoạch, giám sát tiến độ, quản lý rủi ro và tài nguyên; Tester tập trung vào phân tích, thiết kế và thực thi test case.'
  },
  {
    pattern: /(1\.5\.2|whole team|toàn đội ngũ)/i,
    mnemonic: '💡 Mẹo nhớ: Cách tiếp cận toàn đội ngũ (Whole Team Approach): Chất lượng là trách nhiệm chung của cả team (Dev, Tester, PO, BA), không phải là trách nhiệm riêng của cá nhân tester.'
  },
  {
    pattern: /(1\.5\.3|tính độc lập|independence of testing)/i,
    mnemonic: '💡 Mẹo nhớ thang đo tính độc lập tăng dần: Tác giả tự test ➔ Đồng nghiệp cùng nhóm ➔ Tester độc lập trong nhóm ➔ Đội kiểm thử độc lập chuyên trách ➔ Đơn vị kiểm thử độc lập bên thứ 3 (Outsource).'
  },

  // CHƯƠNG 2
  {
    pattern: /(2\.1\.1|mô hình phát triển|sdlc)/i,
    mnemonic: '💡 Mẹo nhớ: Mô hình tuần tự (Waterfall, V-model) phù hợp khi yêu cầu rõ ràng, ít thay đổi; Mô hình lặp/tăng trưởng (Agile, Scrum) phù hợp khi yêu cầu biến động và cần bàn giao sản phẩm sớm.'
  },
  {
    pattern: /(2\.1\.3|test-first|\btdd\b|\batdd\b|\bbdd\b)/i,
    mnemonic: '💡 Mẹo nhớ: Tiếp cận Test-First (TDD/ATDD/BDD): Viết kịch bản kiểm thử TRƯỚC KHI lập trình mã nguồn, giúp làm rõ đặc tả yêu cầu và ngăn ngừa lỗi ngay từ đầu.'
  },
  {
    pattern: /(2\.1\.4|devops|ci\/cd|tích hợp liên tục)/i,
    mnemonic: '💡 Mẹo nhớ: DevOps & CI/CD: Tự động hóa kiểm thử hồi quy ngay khi code mới được tích hợp; giúp phản hồi nhanh chóng về chất lượng và rút ngắn thời gian phát hành.'
  },
  {
    pattern: /(2\.1\.5|shift-left|dịch chuyển sang trái)/i,
    mnemonic: '💡 Mẹo nhớ: Shift-Left: Đưa các hoạt động kiểm thử (review, phân tích yêu cầu) về giai đoạn sớm nhất của vòng đời dự án; càng phát hiện sớm thì chi phí khắc phục càng rẻ.'
  },
  {
    pattern: /(2\.1\.6|hồi cứu|retrospective)/i,
    mnemonic: '💡 Mẹo nhớ: Hồi cứu (Retrospective): Buổi họp cuối mỗi sprint/vòng lặp để đúc kết bài học kinh nghiệm, xác định điểm làm tốt và điểm cần cải tiến cho các sprint tiếp theo.'
  },
  {
    pattern: /(2\.2\.1|cấp độ kiểm thử|test level)/i,
    custom: (fullText) => {
      if (fullText.includes('component') || fullText.includes('thành phần') || fullText.includes('unit')) {
        return '💡 Mẹo nhớ Component/Unit Testing: Kiểm thử các đơn vị code nhỏ nhất (hàm, class, module) một cách cô lập; do Developer thực hiện với sự hỗ trợ của mock/stub.';
      }
      if (fullText.includes('integration') || fullText.includes('tích hợp')) {
        return '💡 Mẹo nhớ Integration Testing: Kiểm tra giao diện và luồng truyền dữ liệu giữa các component (Component Integration) hoặc giữa các hệ sinh thái/hệ thống với nhau (System Integration).';
      }
      if (fullText.includes('system') || fullText.includes('hệ thống')) {
        return '💡 Mẹo nhớ System Testing: Kiểm tra toàn bộ hệ thống hoàn chỉnh tích hợp theo các yêu cầu đầu cuối (End-to-End); bao gồm cả chức năng và phi chức năng trên môi trường thực tế.';
      }
      if (fullText.includes('acceptance') || fullText.includes('nghiệm thu') || fullText.includes('uat')) {
        return '💡 Mẹo nhớ Acceptance Testing (UAT): Do khách hàng/người dùng thực hiện để nghiệm thu và xây dựng niềm tin trước khi đưa hệ thống vào vận hành chính thức.';
      }
      return '💡 Mẹo nhớ 4 cấp độ kiểm thử: Component (Unit - cô lập) ➔ Integration (Giao diện giữa các module) ➔ System (Toàn bộ hệ thống End-to-End) ➔ Acceptance (Người dùng nghiệm thu).';
    }
  },
  {
    pattern: /(2\.2\.2|loại kiểm thử|test type)/i,
    custom: (fullText) => {
      if (fullText.includes('functional') || fullText.includes('chức năng')) {
        return '💡 Mẹo nhớ: Kiểm thử chức năng (Functional Testing): Đánh giá hệ thống "LÀM CÁI GÌ" (What the system does) - tính đúng đắn, tương thích và phù hợp nghiệp vụ.';
      }
      if (fullText.includes('non-functional') || fullText.includes('phi chức năng')) {
        return '💡 Mẹo nhớ: Kiểm thử phi chức năng (Non-functional): Đánh giá hệ thống "HOẠT ĐỘNG TỐT NHƯ THẾ NÀO" (How well it works) - Hiệu năng, tải, bảo mật, độ tin cậy, tính khả dụng.';
      }
      if (fullText.includes('confirmation') || fullText.includes('xác nhận') || fullText.includes('re-test')) {
        return '💡 Mẹo nhớ: Confirmation Testing (Re-testing): Test lại ĐÚNG con bug vừa được sửa để xác nhận đã fix thành công hay chưa.';
      }
      if (fullText.includes('regression') || fullText.includes('hồi quy')) {
        return '💡 Mẹo nhớ: Regression Testing: Chạy lại các test case ở các vùng xung quanh để đảm bảo việc sửa code mới KHÔNG làm hỏng các tính năng cũ đang chạy tốt.';
      }
      return '💡 Mẹo nhớ 4 nhóm loại kiểm thử: Chức năng (Làm gì), Phi chức năng (Tốt thế nào), Hộp trắng (Cấu trúc code), và Kiểm thử liên quan đến thay đổi (Confirmation vs Regression).';
    }
  },
  {
    pattern: /(2\.3\.1|bảo trì|maintenance testing|impact analysis|phân tích tác động)/i,
    mnemonic: '💡 Mẹo nhớ: Kiểm thử bảo trì thực hiện khi hệ thống đang vận hành có chỉnh sửa, nâng cấp, chuyển đổi nền tảng (migration) hoặc ngừng sử dụng; LUÔN cần làm Phân tích tác động (Impact Analysis).'
  },

  // CHƯƠNG 3
  {
    pattern: /(3\.1\.1|3\.1\.2|3\.1\.3|kiểm thử tĩnh|static testing|peer review)/i,
    mnemonic: '💡 Mẹo nhớ: Kiểm thử tĩnh (Static Testing): Đánh giá tài liệu/code mà KHÔNG CHẠY mã nguồn; công cụ phân tích tĩnh kiểm tra quy tắc cú pháp/kỹ thuật, còn con người (peer review) đánh giá được cả logic nghiệp vụ, thiết kế và khả năng bảo trì.'
  },
  {
    pattern: /(3\.2\.1|quy trình rà soát|review process)/i,
    mnemonic: '💡 Mẹo nhớ 5 bước rà soát chuẩn: Lập kế hoạch ➔ Khởi động ➔ Rà soát cá nhân (chuẩn bị) ➔ Họp trao đổi vấn đề ➔ Sửa lỗi và báo cáo kết quả.'
  },
  {
    pattern: /(3\.2\.2|vai trò.*rà soát|review roles)/i,
    mnemonic: '💡 Mẹo nhớ vai trò trong review: Author (tác giả sửa bài); Moderator/Facilitator (điều hành, hòa giải); Review Leader (chịu trách nhiệm tổng thể); Reviewer (tìm lỗi); Scribe (ghi biên bản).'
  },
  {
    pattern: /(3\.2\.3|loại rà soát|review types|inspection|walkthrough|technical review)/i,
    custom: (fullText) => {
      if (fullText.includes('inspection') || fullText.includes('thanh tra')) {
        return '💡 Mẹo nhớ Inspection: Loại review chính thức & khắt khe nhất; BẮT BUỘC có Moderator điều phối, dùng checklist, đo đạc số liệu (metrics) và có tiêu chí vào/ra (entry/exit criteria).';
      }
      if (fullText.includes('walkthrough')) {
        return '💡 Mẹo nhớ Walkthrough: Do chính TÁC GIẢ (Author) chủ trì và dẫn dắt buổi họp; mục tiêu chính là giải thích, học hỏi và thu thập phản hồi từ người tham dự.';
      }
      if (fullText.includes('technical review') || fullText.includes('rà soát kỹ thuật')) {
        return '💡 Mẹo nhớ Technical Review: Do đồng nghiệp/chuyên gia kỹ thuật (Peers) thực hiện; tập trung vào tính đúng đắn kỹ thuật, giải pháp kiến trúc và tính khả thi.';
      }
      if (fullText.includes('informal')) {
        return '💡 Mẹo nhớ Informal Review: Không có quy trình chính thức, không cần ghi biên bản chính thức, chi phí thấp và thường thực hiện theo cặp (pair).';
      }
      return '💡 Mẹo nhớ 4 loại review theo độ chính thức tăng dần: Informal ➔ Walkthrough (Author chủ trì) ➔ Technical Review (Peers kỹ thuật) ➔ Inspection (Moderator, Checklist, Metrics).';
    }
  },
  {
    pattern: /(3\.2\.4|kỹ thuật rà soát|perspective-based|dựa trên góc nhìn)/i,
    mnemonic: '💡 Mẹo nhớ: Kỹ thuật rà soát dựa trên góc nhìn (Perspective-based reading) là hiệu quả nhất: Mỗi reviewer đóng vai một bên liên quan (User, Tester, Security, Maintainer) để rà soát tài liệu.'
  },

  // CHƯƠNG 4
  {
    pattern: /(4\.2\.1|phân vùng tương đương|equivalence partitioning|\bep\b)/i,
    mnemonic: '💡 Mẹo nhớ Phân vùng tương đương (EP): Chia miền dữ liệu thành các phân vùng; chọn 1 giá trị đại diện cho mỗi vùng. 1 giá trị pass thì cả vùng pass, 1 giá trị fail thì cả vùng fail.'
  },
  {
    pattern: /(4\.2\.2|giá trị biên|boundary value|\bbva\b)/i,
    custom: (fullText) => {
      if (fullText.includes('3-value') || fullText.includes('3 giá trị')) {
        return '💡 Mẹo nhớ BVA 3 giá trị: Với mỗi ranh giới, lấy đúng 3 điểm: Giá trị biên, Giá trị sát trong biên, và Giá trị sát ngoài biên.';
      }
      return '💡 Mẹo nhớ BVA 2 giá trị: Với mỗi ranh giới, chỉ lấy 2 điểm: Giá trị ngay tại biên và Giá trị sát ngoài biên. Lỗi phần mềm rất hay nằm ở ranh giới biên!';
    }
  },
  {
    pattern: /(4\.2\.3|bảng quyết định|decision table)/i,
    mnemonic: '💡 Mẹo nhớ Bảng quyết định (Decision Table): Rất hiệu quả cho các quy tắc nghiệp vụ phức tạp với nhiều điều kiện kết hợp. Công thức số cột tối đa của bảng đầy đủ = 2^N (với N là số điều kiện Đúng/Sai).'
  },
  {
    pattern: /(4\.2\.4|chuyển đổi trạng thái|state transition)/i,
    mnemonic: '💡 Mẹo nhớ Chuyển trạng thái (State Transition): Phù hợp cho hệ thống có lưu trạng thái (ATM, giỏ hàng, đăng nhập). Độ phủ 0-switch = từng bước chuyển đơn; 1-switch = chuỗi 2 bước chuyển liên tiếp.'
  },
  {
    pattern: /(4\.3\.1|4\.3\.2|4\.3\.3|câu lệnh|nhánh|statement coverage|branch coverage)/i,
    custom: (fullText) => {
      if (fullText.includes('branch') && fullText.includes('statement')) {
        return '💡 Quy tắc vàng White-box: Đạt 100% Branch Coverage LUÔN LUÔN đảm bảo 100% Statement Coverage. Chiều ngược lại KHÔNG đúng (100% Statement chưa chắc đạt 100% Branch).';
      }
      if (fullText.includes('branch') || fullText.includes('decision')) {
        return '💡 Mẹo nhớ: Branch Coverage đo lường tất cả các nhánh rẽ (True/False) của mọi điểm quyết định trong code; giúp phát hiện các nhánh rẽ bị bỏ quên.';
      }
      return '💡 Mẹo nhớ: Statement Coverage = (Số câu lệnh đã chạy / Tổng số câu lệnh) × 100%. Không đảm bảo bao phủ được hết các điều kiện rẽ nhánh.';
    }
  },
  {
    pattern: /(4\.4\.1|đoán lỗi|error guessing)/i,
    mnemonic: '💡 Mẹo nhớ: Error Guessing (Đoán lỗi): Dựa trên trực giác, kinh nghiệm thực chiến của tester và danh sách các lỗi điển hình thường gặp trong quá khứ.'
  },
  {
    pattern: /(4\.4\.2|khám phá|exploratory testing)/i,
    mnemonic: '💡 Mẹo nhớ: Exploratory Testing: Thiết kế test và thực thi test diễn ra ĐỒNG THỜI; sử dụng Test Charter (mục tiêu buổi test) và thực hiện trong khung thời gian cố định (Time-boxed).'
  },
  {
    pattern: /(4\.4\.3|danh sách kiểm tra|checklist-based)/i,
    mnemonic: '💡 Mẹo nhớ: Checklist-based Testing: Kiểm thử viên thực hiện test dựa trên một danh sách kiểm tra (checklist) gồm các mục, quy tắc hoặc bài học kinh nghiệm được tổng hợp trước.'
  },
  {
    pattern: /(4\.5\.1|4\.5\.2|4\.5\.3|user story|acceptance criteria|cộng tác)/i,
    mnemonic: '💡 Mẹo nhớ: User Story chuẩn 3C: Card (tóm tắt yêu cầu), Conversation (thảo luận chi tiết), Confirmation (tiêu chí nghiệm thu Acceptance Criteria rõ ràng).'
  },

  // CHƯƠNG 5
  {
    pattern: /(5\.1\.1|kế hoạch kiểm thử|test plan)/i,
    mnemonic: '💡 Mẹo nhớ: Kế hoạch kiểm thử (Test Plan) định nghĩa: Phạm vi (Scope), Mục tiêu, Rủi ro, Nguồn lực, Lịch trình, Chiến lược kiểm thử và Tiêu chí vào/ra (Entry/Exit Criteria).'
  },
  {
    pattern: /(5\.1\.3|tiêu chí bắt đầu.*tiêu chí kết thúc|entry.*exit criteria)/i,
    mnemonic: '💡 Mẹo nhớ: Entry Criteria = Tiêu chí để BẮT ĐẦU một giai đoạn kiểm thử. Exit Criteria = Tiêu chí để KẾT THÚC kiểm thử và quyết định sản phẩm đã sẵn sàng phát hành hay chưa.'
  },
  {
    pattern: /(5\.1\.6|kim tự tháp|test pyramid)/i,
    mnemonic: '💡 Mẹo nhớ: Kim tự tháp kiểm thử (Test Pyramid): Đáy rộng nhiều Unit test (chạy nhanh, chi phí rẻ); Tầng giữa là Integration test; Đỉnh hẹp ít UI/End-to-End test (chạy chậm, chi phí bảo trì cao).'
  },
  {
    pattern: /(5\.1\.7|góc phần tư|testing quadrants)/i,
    mnemonic: '💡 Mẹo nhớ: 4 góc phần tư kiểm thử (Testing Quadrants): Q1 (Unit/Component - Hỗ trợ team); Q2 (Chức năng/User story - Hướng nghiệp vụ); Q3 (UAT/Exploratory - Đánh giá sản phẩm); Q4 (Hiệu năng/Bảo mật - Công nghệ).'
  },
  {
    pattern: /(5\.2\.1|5\.2\.2|rủi ro|risk-based|product risk|project risk)/i,
    custom: (fullText) => {
      if (fullText.includes('project risk') || fullText.includes('rủi ro dự án')) {
        return '💡 Mẹo nhớ phân biệt: Rủi ro dự án (Project Risk) liên quan đến lịch trình, nhân sự, ngân sách; Rủi ro sản phẩm (Product Risk) liên quan đến lỗi phần mềm và sự cố chất lượng.';
      }
      return '💡 Mẹo nhớ: Công thức mức độ rủi ro: Risk Level = Khả năng xảy ra (Likelihood) × Tác động thiệt hại (Impact). Luôn ưu tiên kiểm thử các phần có rủi ro cao nhất trước.';
    }
  },
  {
    pattern: /(5\.3\.1|số đo.*kiểm thử|metrics.*testing)/i,
    mnemonic: '💡 Mẹo nhớ: Số đo kiểm thử (Test Metrics) phản ánh tiến độ thực thi (% test case đã chạy, Pass/Fail), mật độ lỗi (defect density) và độ bao phủ yêu cầu để hỗ trợ ra quyết định.'
  },
  {
    pattern: /(5\.3\.2|báo cáo.*kiểm thử|test report)/i,
    mnemonic: '💡 Mẹo nhớ: Báo cáo tiến độ (Test Progress Report) gửi định kỳ trong lúc test; Báo cáo hoàn tất (Test Completion Report) lập ở mốc kết thúc để tổng kết và đánh giá tiêu chí dừng test.'
  },
  {
    pattern: /(5\.3\.3|quản lý cấu hình|configuration management)/i,
    mnemonic: '💡 Mẹo nhớ: Quản lý cấu hình (Configuration Management) đảm bảo kiểm soát phiên bản toàn vẹn của mã nguồn, tài liệu yêu cầu, dữ liệu test và test script; đảm bảo tính tái lập kết quả test.'
  },
  {
    pattern: /(5\.4\.1|5\.6|quản lý khiếm khuyết|defect management|defect report)/i,
    mnemonic: '💡 Mẹo nhớ: Báo cáo lỗi (Defect Report) chuẩn gồm: Tiêu đề rõ ràng, các bước tái hiện (Steps to Reproduce), Kết quả thực tế (Actual), Kết quả mong đợi (Expected) và Mức độ nghiêm trọng (Severity).'
  },
  {
    pattern: /(5\.5\.1|5\.2\.6|ước lượng|estimation|planning poker|wideband delphi)/i,
    custom: (fullText) => {
      if (fullText.includes('metrics') || fullText.includes('dựa trên số đo')) {
        return '💡 Mẹo nhớ: Ước lượng dựa trên số liệu (Metrics-based): Dùng dữ liệu đo đạc lịch sử của các dự án tương tự trước đây để tính toán thời gian và nguồn lực.';
      }
      return '💡 Mẹo nhớ: Ước lượng dựa trên chuyên gia (Expert-based): Dựa trên kinh nghiệm của các chuyên gia hoặc kỹ thuật đồng thuận nhóm như Planning Poker / Wideband Delphi.';
    }
  },

  // CHƯƠNG 6
  {
    pattern: /(6\.1\.1|phân loại công cụ|tool classification)/i,
    mnemonic: '💡 Mẹo nhớ: Phân loại công cụ kiểm thử: Công cụ quản lý (Test Management), Công cụ kiểm thử tĩnh (Static Analysis), Công cụ thiết kế test, Công cụ thực thi test (Automation), và Công cụ đo hiệu năng/tải.'
  },
  {
    pattern: /(6\.1\.2|lợi ích.*rủi ro.*công cụ|benefits.*risks.*tool)/i,
    mnemonic: '💡 Mẹo nhớ: Lợi ích của công cụ: Giảm công việc lặp lại, tăng tính nhất quán và đo đạc khách quan. Rủi ro: Kỳ vọng phi thực tế, chi phí bảo trì script cao và phụ thuộc công cụ.'
  },
  {
    pattern: /(6\.1\.3|pilot project|dự án thử nghiệm)/i,
    mnemonic: '💡 Mẹo nhớ: Khi đưa công cụ mới vào tổ chức, LUÔN LUÔN bắt đầu bằng Dự án thử nghiệm (Pilot Project) để hiểu sâu công cụ, đánh giá mức độ phù hợp và xác định quy chuẩn sử dụng.'
  }
];

/**
 * Returns a high-value mnemonic for any question with 100% guarantee.
 */
export function getQuestionMnemonic(q?: Question | null): string {
  if (!q) return '';
  if (q.hint && q.hint.trim()) {
    return q.hint.trim();
  }
  if (q.mnemonic && q.mnemonic.trim()) {
    return q.mnemonic.trim();
  }

  // Priority 1: Official exams with curated `explanationShort`
  if (q.explanationShort && q.explanationShort.trim().length > 10) {
    let text = q.explanationShort.trim();
    text = text.replace(/^(đáp án đúng là:?|chọn:?|phương án đúng là:?)\s*/i, '');
    text = text.replace(/\n+/g, ' ').trim();
    if (!text.endsWith('.')) text += '.';
    return `💡 Gợi ý: ${text}`;
  }

  // Priority 2: Questions with detailed `explanation`
  if (q.explanation) {
    let chunk = q.explanation.split(/các phương án (còn lại|khác)|các lựa chọn khác/i)[0].trim();
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)[^:]*:\s*/i, '');
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)\.?\s*/i, '');
    chunk = chunk.replace(/^ghép đúng:\s*/i, '');
    chunk = chunk.replace(/\n+/g, ' ').trim();

    const sentences = chunk.split(/(?<=[.!?])\s+/).filter(Boolean);
    let result = sentences.slice(0, 2).join(' ').trim();
    if (result.length > 170 && sentences.length > 0) {
      result = sentences[0].trim();
    }
    if (!result.endsWith('.')) result += '.';
    return `💡 Mẹo nhớ: ${result}`;
  }

  const knowledge = (q.knowledge || '').toLowerCase();
  const question = (q.questionVi || q.question || '').toLowerCase();
  const fullText = `${knowledge} ${question}`;

  // Priority 3: Match strictly against syllabus knowledge rules
  if (knowledge) {
    for (const rule of SYLLABUS_RULES) {
      if (rule.pattern.test(knowledge)) {
        if (rule.custom) return rule.custom(fullText);
        return rule.mnemonic || '';
      }
    }
  }

  return '💡 Mẹo nhớ: Nắm vững định nghĩa chuẩn ISTQB CTFL v4.0 và phân tích kỹ câu hỏi để loại bỏ các phương án bẫy.';
}
