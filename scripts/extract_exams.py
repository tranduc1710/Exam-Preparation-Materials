#!/usr/bin/env python3
import os
import re
import glob
import html
import json
import shutil
import unicodedata
import fitz

CHAPTER_TITLES = {
    1: "Chương 1 – Nền tảng kiểm thử (Fundamentals of Testing)",
    2: "Chương 2 – Kiểm thử trong vòng đời phát triển (Testing Throughout the SDLC)",
    3: "Chương 3 – Kiểm thử tĩnh (Static Testing)",
    4: "Chương 4 – Kỹ thuật kiểm thử (Test Analysis and Design)",
    5: "Chương 5 – Quản lý hoạt động kiểm thử (Managing the Test Activities)",
    6: "Chương 6 – Công cụ hỗ trợ kiểm thử (Test Tools)",
}

def clean_text(s: str) -> str:
    s = html.unescape(s)
    s = unicodedata.normalize("NFC", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s

def parse_vietnamese_pdf(vi_pdf_path: str, exam_num: int, img_vi_out_dir: str):
    doc = fitz.open(vi_pdf_path)
    questions_vi = []
    curr_q = None

    for pno, page in enumerate(doc):
        d = page.get_text("dict")
        blocks = [b for b in d["blocks"] if b["type"] == 0 and b["bbox"][1] < 795]
        blocks = sorted(blocks, key=lambda b: (round(b["bbox"][1], 1), round(b["bbox"][0], 1)))

        skip_bboxes = set()
        fig_crops = {}
        for idx, b in enumerate(blocks):
            txt = unicodedata.normalize(
                "NFC",
                " ".join("".join(s["text"] for s in l["spans"]) for l in b["lines"]).strip(),
            )
            m_head = re.match(r"^(Câu(?:\s+bổ\s+sung)?\s+\d+[b]?)\.\s*(.*)$", txt, re.S)
            if m_head:
                y_q_end = b["bbox"][3]
                for j in range(idx + 1, len(blocks)):
                    nb = blocks[j]
                    ntxt = unicodedata.normalize(
                        "NFC",
                        " ".join("".join(s["text"] for s in l["spans"]) for l in nb["lines"]).strip(),
                    )
                    if re.match(r"^a\)\s", ntxt):
                        y_a_start = nb["bbox"][1]
                        if (y_a_start - y_q_end) > 20:
                            for k in range(idx + 1, j):
                                skip_bboxes.add(k)
                            fig_crops[idx] = (pno, fitz.Rect(52, y_q_end + 3, 543, y_a_start - 3))
                        break

        for idx, b in enumerate(blocks):
            if idx in skip_bboxes:
                continue
            txt = unicodedata.normalize(
                "NFC",
                " ".join("".join(s["text"] for s in l["spans"]) for l in b["lines"]).strip(),
            )
            if not txt:
                continue
            if pno == 0 and curr_q is None and not re.match(r"^Câu\b", txt):
                continue
            if re.match(r"^PHẦN BỔ SUNG", txt, re.I):
                if curr_q:
                    questions_vi.append(curr_q)
                    curr_q = None
                continue
            if curr_q is None and not re.match(r"^Câu\b", txt):
                continue

            m_head = re.match(r"^(Câu(?:\s+bổ\s+sung)?\s+\d+[b]?)\.\s*(.*)$", txt, re.S)
            if m_head:
                if curr_q:
                    questions_vi.append(curr_q)
                curr_q = {
                    "label": m_head.group(1),
                    "stem": m_head.group(2).strip(),
                    "blocks": [],
                    "fig_crop": fig_crops.get(idx),
                }
            else:
                if curr_q is not None:
                    curr_q["blocks"].append(txt)

    if curr_q:
        questions_vi.append(curr_q)

    parsed_list = []
    for q_idx, rq in enumerate(questions_vi, 1):
        body = "\n".join(rq["blocks"])
        m = re.search(
            r"^a\)\s*(.*?)\nb\)\s*(.*?)\nc\)\s*(.*?)\nd\)\s*(.*?)\nĐáp án:\s*([a-dA-D])\s*(?:Giải thích:\s*(.*))?$",
            body,
            re.S,
        )
        if not m:
            raise ValueError(f"Failed to parse Vietnamese PDF Exam {exam_num} {rq['label']}")
        opt_a, opt_b, opt_c, opt_d, ans, short_expl = m.groups()

        images_vi = []
        if rq["fig_crop"]:
            crop_pno, crop_rect = rq["fig_crop"]
            pix = doc[crop_pno].get_pixmap(clip=crop_rect, dpi=200)
            vi_img_name = f"exam-{exam_num}-q-{q_idx}-vi.png"
            vi_img_path = os.path.join(img_vi_out_dir, vi_img_name)
            pix.save(vi_img_path)
            images_vi.append(f"/images/questions-vi/{vi_img_name}")

        parsed_list.append({
            "questionVi": clean_text(rq["stem"]),
            "optionsVi": {
                "a": clean_text(opt_a),
                "b": clean_text(opt_b),
                "c": clean_text(opt_c),
                "d": clean_text(opt_d),
            },
            "answerVi": ans.lower().strip(),
            "explanationShortVi": clean_text(short_expl or ""),
            "imagesVi": images_vi,
        })

    return parsed_list

def main():
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    pdf_dir = os.path.join(base_dir, "IETLS")
    img_out_dir = os.path.join(base_dir, "public", "images", "questions")
    img_vi_out_dir = os.path.join(base_dir, "public", "images", "questions-vi")
    pdf_out_dir = os.path.join(base_dir, "public", "pdfs")
    data_out_dir = os.path.join(base_dir, "src", "data")
    os.makedirs(img_out_dir, exist_ok=True)
    os.makedirs(img_vi_out_dir, exist_ok=True)
    os.makedirs(pdf_out_dir, exist_ok=True)
    os.makedirs(data_out_dir, exist_ok=True)

    en_pdf_files = sorted(
        [
            f for f in glob.glob(os.path.join(pdf_dir, "*.pdf"))
            if not os.path.basename(f).startswith("De")
        ],
        key=lambda x: int(re.search(r"(\d+)\.pdf$", unicodedata.normalize("NFC", x)).group(1))
    )

    exams = []
    all_questions = []
    total_images = 0
    total_vi_images = 0

    for exam_num, pdf_path in enumerate(en_pdf_files, 1):
        vi_pdf_path = os.path.join(pdf_dir, f"De{exam_num}_ISTQB_CTFL_tieng_Viet.pdf")
        if not os.path.exists(vi_pdf_path):
            raise FileNotFoundError(f"Missing Vietnamese PDF: {vi_pdf_path}")

        vi_parsed = parse_vietnamese_pdf(vi_pdf_path, exam_num, img_vi_out_dir)

        doc = fitz.open(pdf_path)
        stream = []
        for pno, page in enumerate(doc):
            d = page.get_text("dict")
            blocks = sorted(d["blocks"], key=lambda b: (round(b["bbox"][1], 1), round(b["bbox"][0], 1)))
            for b in blocks:
                if b["type"] == 0:
                    for l in b["lines"]:
                        txt = "".join(s["text"] for s in l["spans"]).strip()
                        txt = unicodedata.normalize("NFC", txt)
                        if txt:
                            stream.append(("text", pno, txt))
                elif b["type"] == 1:
                    stream.append(("img", pno, b))

        raw_questions = []
        curr_q = None
        in_supp_intro = False

        for kind, pno, val in stream:
            if kind == "text":
                if re.match(r"^(GIẢI CHI TIẾT|ĐỀ\s+\d+|Author:)", val, re.I):
                    continue
                if re.match(r"^PHẦN BỔ SUNG", val, re.I):
                    if curr_q:
                        raw_questions.append(curr_q)
                        curr_q = None
                    in_supp_intro = True
                    continue

                m_q = re.match(r"^(Câu(?:\s+bổ\s+sung)?\s+\d+)\b(.*)$", val)
                if m_q and (curr_q is None or any(l.startswith("Đáp án:") for l in curr_q["lines"])):
                    if curr_q:
                        raw_questions.append(curr_q)
                    in_supp_intro = False
                    curr_q = {
                        "label": m_q.group(1).strip(),
                        "is_supp": "bổ sung" in m_q.group(1).lower(),
                        "lines": [m_q.group(2).strip()] if m_q.group(2).strip() else [],
                        "imgs": []
                    }
                    continue

                if in_supp_intro and curr_q is None:
                    continue

                if curr_q is not None:
                    curr_q["lines"].append(val)
            elif kind == "img":
                if curr_q is not None:
                    curr_q["imgs"].append((pno, val))

        if curr_q:
            raw_questions.append(curr_q)

        assert len(raw_questions) == len(vi_parsed), (
            f"Count mismatch in Exam {exam_num}: EN={len(raw_questions)}, VI={len(vi_parsed)}"
        )

        exam_questions = []
        seen_labels = set()

        for q_idx, (rq, vq) in enumerate(zip(raw_questions, vi_parsed), 1):
            text = "\n".join(rq["lines"])
            m = re.search(
                r"^(.*?)\na\)\s*(.*?)\nb\)\s*(.*?)\nc\)\s*(.*?)\nd\)\s*(.*?)\nĐáp án:\s*([a-dA-D])\b\s*\nGiải thích:\s*(.*?)(?:\nKiến thức:\s*(.*))?$",
                text,
                re.S
            )
            if not m:
                raise ValueError(f"Failed to parse Exam {exam_num} {rq['label']}")

            stem, opt_a, opt_b, opt_c, opt_d, ans, expl, know = m.groups()
            know_clean = clean_text(know or "")
            ch_m = re.search(r"Chương\s*(\d+)", know_clean)
            chapter_num = int(ch_m.group(1)) if ch_m else 1
            is_v4 = rq["is_supp"] or ("v4.0" in know_clean.lower()) or ("v4.0" in stem.lower())

            label = rq["label"]
            if label in seen_labels and label == "Câu 23":
                display_label = "Câu 23b"
            else:
                display_label = label
            seen_labels.add(label)

            image_urls = []
            for img_i, (pno, img_block) in enumerate(rq["imgs"], 1):
                ext = img_block.get("ext", "png")
                img_filename = f"exam-{exam_num}-q-{q_idx}-{img_i}.{ext}"
                img_path = os.path.join(img_out_dir, img_filename)
                with open(img_path, "wb") as f_img:
                    f_img.write(img_block["image"])
                image_urls.append(f"/images/questions/{img_filename}")
                total_images += 1

            total_vi_images += len(vq["imagesVi"])

            q_id = f"e{exam_num}_q{q_idx}"
            q_obj = {
                "id": q_id,
                "examId": exam_num,
                "examTitle": f"Đề {exam_num}",
                "order": q_idx,
                "label": display_label,
                "originalLabel": label,
                "isSupplementary": rq["is_supp"],
                "isV4": is_v4,
                "question": clean_text(stem),
                "questionVi": vq["questionVi"],
                "images": image_urls,
                "imagesVi": vq["imagesVi"],
                "options": {
                    "a": clean_text(opt_a),
                    "b": clean_text(opt_b),
                    "c": clean_text(opt_c),
                    "d": clean_text(opt_d),
                },
                "optionsVi": vq["optionsVi"],
                "correctAnswer": ans.lower().strip(),
                "explanation": clean_text(expl),
                "explanationShort": vq["explanationShortVi"],
                "knowledge": know_clean,
                "chapter": chapter_num,
                "chapterTitle": CHAPTER_TITLES.get(chapter_num, f"Chương {chapter_num}"),
            }
            exam_questions.append(q_obj)
            all_questions.append(q_obj)

        pdf_dest = os.path.join(pdf_out_dir, f"de-{exam_num}.pdf")
        shutil.copy2(pdf_path, pdf_dest)

        pdf_vi_dest = os.path.join(pdf_out_dir, f"de-{exam_num}-vi.pdf")
        shutil.copy2(vi_pdf_path, pdf_vi_dest)

        exams.append({
            "id": exam_num,
            "title": f"Đề thi thử ISTQB CTFL – Đề {exam_num}",
            "shortTitle": f"Đề {exam_num}",
            "pdfFileName": unicodedata.normalize("NFC", os.path.basename(pdf_path)),
            "pdfUrl": f"/pdfs/de-{exam_num}.pdf",
            "pdfViFileName": os.path.basename(vi_pdf_path),
            "pdfViUrl": f"/pdfs/de-{exam_num}-vi.pdf",
            "questionCount": len(exam_questions),
            "regularCount": sum(1 for q in exam_questions if not q["isSupplementary"]),
            "supplementaryCount": sum(1 for q in exam_questions if q["isSupplementary"]),
            "imageCount": sum(len(q["images"]) for q in exam_questions),
            "questions": exam_questions,
        })

    payload = {
        "metadata": {
            "title": "Hệ thống Luyện thi ISTQB Foundation Level (CTFL v4.0)",
            "author": "Nhựt Võ (istqbbaodau.com)",
            "totalExams": len(exams),
            "totalQuestions": len(all_questions),
            "totalImages": total_images,
            "totalViImages": total_vi_images,
            "standardQuestionCount": 40,
            "passPercentage": 65,
            "passScoreOn40": 26,
            "durationsMinutes": [60, 75, 90],
            "chapters": [
                {
                    "chapter": ch_num,
                    "title": ch_title,
                    "questionCount": sum(1 for q in all_questions if q["chapter"] == ch_num),
                }
                for ch_num, ch_title in CHAPTER_TITLES.items()
            ],
        },
        "exams": exams,
    }

    out_file = os.path.join(data_out_dir, "examsData.json")
    with open(out_file, "w", encoding="utf-8") as f_out:
        json.dump(payload, f_out, ensure_ascii=False, indent=2)

    print(
        f"Successfully extracted {len(exams)} exams, {len(all_questions)} questions, "
        f"{total_images} EN images, {total_vi_images} VI images to {out_file}"
    )

    fmt_script = os.path.join(base_dir, "scripts", "format_questions.mjs")
    if os.path.exists(fmt_script):
        import subprocess
        subprocess.run(["node", fmt_script], check=False)

if __name__ == "__main__":
    main()

