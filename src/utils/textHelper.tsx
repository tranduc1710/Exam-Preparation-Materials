import React from 'react';

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
 * Highlights ISTQB trap words, keywords, and critical constraints in question stems.
 */
export function renderHighlightedText(text: string): React.ReactNode {
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
