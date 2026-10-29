#!/usr/bin/env python3
import os
import re
import glob
import json
import unicodedata
import pymupdf

CHAPTER_TITLES = {
    1: "Chương 1 – Nền tảng kiểm thử (Fundamentals of Testing)",
    2: "Chương 2 – Kiểm thử trong vòng đời phát triển (Testing Throughout the SDLC)",
    3: "Chương 3 – Kiểm thử tĩnh (Static Testing)",
    4: "Chương 4 – Kỹ thuật kiểm thử (Test Analysis and Design)",
    5: "Chương 5 – Quản lý hoạt động kiểm thử (Managing the Test Activities)",
    6: "Chương 6 – Công cụ hỗ trợ kiểm thử (Test Tools)"
}

def patch_fonts(doc):
    for page in doc:
        for f in page.get_fonts():
            xref = f[0]
            tu = doc.xref_get_key(xref, 'ToUnicode')[1]
            if tu != 'null':
                tu_id = int(tu.replace(' 0 R', ''))
                tu_data = doc.xref_stream(tu_id).decode('latin1')
                new_tu_data = tu_data.replace('<0052> <>', '<0052> <006f>')
                new_tu_data = new_tu_data.replace('<0a88> <1ecd>', '<0a88> <0323>')
                new_tu_data = new_tu_data.replace('<0a88> <1ee5>', '<0a88> <0323>')
                if new_tu_data != tu_data:
                    doc.update_stream(tu_id, new_tu_data.encode('latin1'))

def clean_spacing(s: str) -> str:
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'[ \t\r\f\v]+', ' ', s)
    s = re.sub(r'(\w+)-\n(\w+)', r'\1\2', s)
    lines = [line.strip() for line in s.split('\n')]
    cleaned_lines = [line for line in lines if line]
    return '\n'.join(cleaned_lines).strip()

def clean_single_line(s: str) -> str:
    s = unicodedata.normalize('NFC', s)
    s = re.sub(r'\s+', ' ', s)
    return s.strip()

def clean_stem_tables(raw_stem: str) -> str:
    text = raw_stem.strip()
    
    # Pattern 1: Decision table (R1\nR2\nR3)
    if re.search(r'R1\s*\n\s*R2', text, re.IGNORECASE):
        parts = re.split(r'R1\s*\n\s*R2', text, flags=re.IGNORECASE)
        prompt = parts[0].strip()
        note = ''
        note_match = re.search(r'(Đ\s*=\s*Đúng.*)', parts[1], re.DOTALL | re.IGNORECASE) or \
                     re.search(r'(Ký hiệu\s*[“\"].*)', parts[1], re.DOTALL | re.IGNORECASE)
        if note_match:
            note = re.sub(r'\s+', ' ', note_match.group(1).strip())
        return f"{prompt}\n\n(Ghi chú: {note})" if note else prompt

    # Pattern 2: State transition table (Trạng thái hiện tại\nSự kiện)
    if re.search(r'Trạng thái hiện tại\s*\n\s*Sự kiện', text, re.IGNORECASE):
        parts = re.split(r'Trạng thái hiện tại\s*\n\s*Sự kiện', text, flags=re.IGNORECASE)
        prompt = parts[0].strip()
        note = ''
        note_match = re.search(r'(Mọi tổ hợp trạng thái.*)', parts[1], re.DOTALL | re.IGNORECASE)
        if note_match:
            note = re.sub(r'\s+', ' ', note_match.group(1).strip())
        return f"{prompt}\n\n(Ghi chú: {note})" if note else prompt

    # Pattern 3: Test case priority table (Test case\nMô tả)
    if re.search(r'Test case\s*\n\s*Mô tả', text, re.IGNORECASE):
        parts = re.split(r'Test case\s*\n\s*Mô tả', text, flags=re.IGNORECASE)
        prompt = parts[0].strip()
        note = ''
        note_match = re.search(r'(1\s*=\s*ưu tiên cao nhất.*)', parts[1], re.DOTALL | re.IGNORECASE) or \
                     re.search(r'(Một test chỉ có thể chạy.*)', parts[1], re.DOTALL | re.IGNORECASE)
        if note_match:
            note = re.sub(r'\s+', ' ', note_match.group(1).strip())
        return f"{prompt}\n\n(Ghi chú: {note})" if note else prompt

    # Pattern 4: Risk matrix (Mã\nRủi ro sản phẩm)
    if re.search(r'Mã\s*\n\s*Rủi ro sản phẩm', text, re.IGNORECASE):
        parts = re.split(r'Mã\s*\n\s*Rủi ro sản phẩm', text, flags=re.IGNORECASE)
        prompt = parts[0].strip()
        return prompt

    return text

def extract_all():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_dir = os.path.join(base_dir, 'public', 'pdfs', 'ai')
    img_pub_dir = os.path.join(base_dir, 'public', 'images', 'ai')
    img_dist_dir = os.path.join(base_dir, 'dist', 'images', 'ai')
    os.makedirs(img_pub_dir, exist_ok=True)
    os.makedirs(img_dist_dir, exist_ok=True)
    
    files = sorted(glob.glob(os.path.join(pdf_dir, '*.pdf')))
    print(f"Found {len(files)} AI PDF files.")
    
    exams = []
    chapter_counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0, 6: 0}
    total_images_count = 0
    
    for exam_idx, file_path in enumerate(files, 1):
        filename = os.path.basename(file_path)
        doc = pymupdf.open(file_path)
        patch_fonts(doc)
        
        # 1. Identify and crop tables from Part 1
        p2_page = 12
        for p_num in range(len(doc)):
            if 'PHẦN 2' in doc[p_num].get_text():
                p2_page = p_num
                break
                
        table_crops = {}
        for p_num in range(p2_page):
            page = doc[p_num]
            tabs = page.find_tables()
            for t in tabs:
                bbox = t.bbox
                blocks = page.get_text('blocks')
                candidates = []
                for b in blocks:
                    m = re.search(r'Câu\s+(\d+)', b[4])
                    if m and b[3] <= bbox[1] + 15:
                        candidates.append((int(m.group(1)), b[3]))
                q_num = None
                if candidates:
                    candidates.sort(key=lambda x: x[1])
                    q_num = candidates[-1][0]
                elif p_num > 0:
                    prev_blocks = doc[p_num-1].get_text('blocks')
                    prev_cands = []
                    for b in prev_blocks:
                        m = re.search(r'Câu\s+(\d+)', b[4])
                        if m:
                            prev_cands.append((int(m.group(1)), b[3]))
                    if prev_cands:
                        prev_cands.sort(key=lambda x: x[1])
                        q_num = prev_cands[-1][0]
                        
                if q_num:
                    clip_rect = pymupdf.Rect(
                        max(0, bbox[0] - 1),
                        max(0, bbox[1] - 1),
                        min(page.rect.width, bbox[2] + 1),
                        min(page.rect.height, bbox[3] + 1)
                    )
                    pix = page.get_pixmap(clip=clip_rect, dpi=250)
                    img_filename = f"ai{exam_idx}_q{q_num}.png"
                    pix.save(os.path.join(img_pub_dir, img_filename))
                    pix.save(os.path.join(img_dist_dir, img_filename))
                    table_crops[q_num] = f"/images/ai/{img_filename}"
        
        # 2. Extract full text of Part 2
        full_text = '\n'.join(unicodedata.normalize('NFC', page.get_text()) for page in doc)
        p2_idx = full_text.find('PHẦN 2')
        p2_text = full_text[p2_idx:] if p2_idx != -1 else full_text
        
        matches = list(re.finditer(r'(?:^|\n)Câu\s+(\d+)\b', p2_text))
        print(f"[{exam_idx}/10] Parsing {filename} ({len(matches)} questions, {len(table_crops)} tables)...")
        
        questions = []
        exam_id = 100 + exam_idx
        exam_title = f"Đề luyện thi ISTQB CTFL v4.0 (AI Mock) – Đề Số {exam_idx}"
        short_title = f"AI Đề {exam_idx}"
        exam_img_count = 0
        
        for i, m in enumerate(matches):
            q_num = int(m.group(1))
            start = m.end()
            end = matches[i+1].start() if i+1 < len(matches) else len(p2_text)
            block = p2_text[start:end].strip()
            
            # Answer
            ans_m = re.search(r'Đáp án:\s*([a-dA-D])', block)
            if not ans_m:
                raise ValueError(f"Exam {exam_idx} Q{q_num}: missing answer!")
            correct_ans = ans_m.group(1).lower()
            
            # Explanation
            exp_m = re.search(r'Giải thích:\s*(.*?)(?=\nKiến thức:|\Z)', block, re.DOTALL)
            raw_exp = exp_m.group(1).strip() if exp_m else ''
            explanation = clean_spacing(raw_exp)
            
            # Knowledge
            know_m = re.search(r'Kiến thức:\s*(.*?)(?=\nCâu|\Z)', block, re.DOTALL)
            raw_know = know_m.group(1).strip() if know_m else ''
            knowledge = clean_single_line(raw_know)
            
            # Chapter
            ch_m = re.search(r'Chương\s*(\d+)', knowledge)
            chapter = int(ch_m.group(1)) if ch_m else 1
            if chapter not in chapter_counts:
                chapter = 1
            chapter_counts[chapter] += 1
            chapter_title = CHAPTER_TITLES.get(chapter, f"Chương {chapter}")
            
            # Stem and options
            q_and_opts = block[:ans_m.start()].strip()
            opt_splits = list(re.finditer(r'(?:^|\n)([a-d])[\)\.]\s*', q_and_opts))
            if len(opt_splits) != 4:
                raise ValueError(f"Exam {exam_idx} Q{q_num}: expected 4 options, found {len(opt_splits)}")
            
            raw_stem = q_and_opts[:opt_splits[0].start()].strip()
            stem = clean_spacing(raw_stem)
            
            # Check if this question has an extracted table image
            q_images = []
            if q_num in table_crops:
                q_images = [table_crops[q_num]]
                exam_img_count += 1
                total_images_count += 1
                stem = clean_stem_tables(stem)
            
            options = {}
            for oi in range(4):
                key = opt_splits[oi].group(1).lower()
                opt_start = opt_splits[oi].end()
                opt_end = opt_splits[oi+1].start() if oi+1 < 4 else len(q_and_opts)
                raw_opt = q_and_opts[opt_start:opt_end].strip()
                options[key] = clean_single_line(raw_opt)
            
            q_id = f"ai{exam_idx}_q{q_num}"
            q_obj = {
                "id": q_id,
                "examId": exam_id,
                "examTitle": short_title,
                "order": q_num,
                "label": f"Câu {q_num}",
                "originalLabel": f"Câu {q_num}",
                "isSupplementary": False,
                "isV4": True,
                "question": stem,
                "questionVi": stem,
                "images": q_images,
                "imagesVi": [],
                "options": options,
                "optionsVi": options,
                "correctAnswer": correct_ans,
                "explanation": explanation,
                "knowledge": knowledge,
                "chapter": chapter,
                "chapterTitle": chapter_title
            }
            questions.append(q_obj)
        
        exam_obj = {
            "id": exam_id,
            "title": exam_title,
            "shortTitle": short_title,
            "pdfFileName": filename,
            "pdfUrl": f"/pdfs/ai/{filename}",
            "pdfViFileName": filename,
            "pdfViUrl": f"/pdfs/ai/{filename}",
            "questionCount": len(questions),
            "regularCount": len(questions),
            "supplementaryCount": 0,
            "imageCount": exam_img_count,
            "category": "ai",
            "questions": questions
        }
        exams.append(exam_obj)
    
    chapters_meta = [
        {"chapter": ch, "title": CHAPTER_TITLES[ch], "questionCount": chapter_counts[ch]}
        for ch in range(1, 7)
    ]
    
    total_q = sum(len(e["questions"]) for e in exams)
    dataset = {
        "metadata": {
            "title": "Bộ đề Luyện thi ISTQB Foundation Level (CTFL v4.0.1) – AI Mock Exams 2026",
            "author": "AI Mock Exam Generator (CTFL v4.0.1 Standard)",
            "category": "ai",
            "totalExams": len(exams),
            "totalQuestions": total_q,
            "totalImages": total_images_count,
            "totalViImages": 0,
            "standardQuestionCount": 40,
            "passPercentage": 65,
            "passScoreOn40": 26,
            "durationsMinutes": [60, 75, 90],
            "chapters": chapters_meta
        },
        "exams": exams
    }
    
    out_path = os.path.join(base_dir, 'public', 'data', 'aiExamsData.json')
    dist_out_path = os.path.join(base_dir, 'dist', 'data', 'aiExamsData.json')
    
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    with open(out_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    with open(dist_out_path, 'w', encoding='utf-8') as f:
        json.dump(dataset, f, ensure_ascii=False, indent=2)
    
    print(f"\nSuccessfully generated {out_path} and synced to dist with {len(exams)} exams, {total_q} questions, {total_images_count} table images!")
    print("Chapter breakdown:", chapter_counts)

if __name__ == '__main__':
    extract_all()
