#!/usr/bin/env python3
import os
import re
import json
import glob
import unicodedata
import pymupdf

base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
pdf_dir = os.path.join(base_dir, 'public', 'pdfs', 'ai')
img_pub_dir = os.path.join(base_dir, 'public', 'images', 'ai')
img_dist_dir = os.path.join(base_dir, 'dist', 'images', 'ai')

os.makedirs(img_pub_dir, exist_ok=True)
os.makedirs(img_dist_dir, exist_ok=True)

pdf_files = sorted(glob.glob(os.path.join(pdf_dir, '*.pdf')))
print(f"Found {len(pdf_files)} AI PDF files.")

# Load aiExamsData.json
data_path = os.path.join(base_dir, 'public', 'data', 'aiExamsData.json')
with open(data_path, 'r', encoding='utf-8') as f:
    dataset = json.load(f)

def clean_stem(raw_stem):
    text = raw_stem.strip()
    
    # Pattern 1: Decision table (R1\nR2\nR3)
    if re.search(r'R1\s*\n\s*R2', text, re.IGNORECASE):
        parts = re.split(r'R1\s*\n\s*R2', text, flags=re.IGNORECASE)
        prompt = parts[0].strip()
        note = ''
        note_match = re.search(r'(Đ\s*=\s*Đúng.*)', parts[1], re.DOTALL | re.IGNORECASE) or \
                     re.search(r'(Ký hiệu\s*[“\"].*)', parts[1], re.DOTALL | re.IGNORECASE)
        if note_match:
            note = note_match.group(1).strip()
            # Clean newlines inside note
            note = re.sub(r'\s+', ' ', note)
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

table_crops = {}

for exam_idx, pdf_path in enumerate(pdf_files, 1):
    doc = pymupdf.open(pdf_path)
    # Find PHẦN 2 boundary
    p2_page = 12
    for p_num in range(len(doc)):
        if 'PHẦN 2' in doc[p_num].get_text():
            p2_page = p_num
            break
            
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
                filename = f"ai{exam_idx}_q{q_num}.png"
                pub_file = os.path.join(img_pub_dir, filename)
                dist_file = os.path.join(img_dist_dir, filename)
                pix.save(pub_file)
                pix.save(dist_file)
                
                table_crops[(exam_idx, q_num)] = f"/images/ai/{filename}"
                print(f"✓ Cropped Exam {exam_idx} Q{q_num} -> {filename} ({pix.width}x{pix.height})")

print(f"\nTotal tables cropped: {len(table_crops)}")

# Update aiExamsData.json questions
updated_q_count = 0
for exam_idx, exam in enumerate(dataset['exams'], 1):
    for q in exam['questions']:
        q_num = q['order']
        key = (exam_idx, q_num)
        if key in table_crops:
            img_url = table_crops[key]
            q['images'] = [img_url]
            q['imagesVi'] = []
            # Clean stem
            clean_q = clean_stem(q['questionVi'])
            q['question'] = clean_q
            q['questionVi'] = clean_q
            updated_q_count += 1
            print(f"Updated dataset for Exam {exam_idx} Q{q_num}: attached {img_url}")

# Save public
with open(data_path, 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

# Save dist
dist_data_path = os.path.join(base_dir, 'dist', 'data', 'aiExamsData.json')
with open(dist_data_path, 'w', encoding='utf-8') as f:
    json.dump(dataset, f, ensure_ascii=False, indent=2)

print(f"\n✅ Successfully updated {updated_q_count} questions with clean stems and high-res table images!")
