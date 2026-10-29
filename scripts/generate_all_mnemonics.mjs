import fs from 'fs';
import path from 'path';

/**
 * Derives a sharp, 100% question-tailored mnemonic / key memory tip
 * directly from the question's specific explanation and syllabus topic.
 */
export function deriveSpecificMnemonic(q) {
  // Case 1: Official exams that have curated `explanationShort`
  if (q.explanationShort && q.explanationShort.trim().length > 10) {
    let text = q.explanationShort.trim();
    text = text.replace(/^(đáp án đúng là:?|chọn:?|phương án đúng là:?)\s*/i, '');
    text = text.replace(/\n+/g, ' ').trim();
    if (!text.endsWith('.')) text += '.';
    return `💡 Mẹo nhớ: ${text}`;
  }

  // Case 2: Questions with detailed `explanation` (e.g. AI-generated exams)
  if (q.explanation) {
    // Extract first core reasoning chunk before distractor discussion
    let chunk = q.explanation.split(/các phương án (còn lại|khác)|các lựa chọn khác/i)[0].trim();
    // Clean up typical introductory answer boilerplate
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)[^:]*:\s*/i, '');
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)\.?\s*/i, '');
    chunk = chunk.replace(/^ghép đúng:\s*/i, '');
    chunk = chunk.replace(/\n+/g, ' ').trim();

    // Take the first 1-2 sentences
    const sentences = chunk.split(/(?<=[.!?])\s+/).filter(Boolean);
    let result = sentences.slice(0, 2).join(' ').trim();
    if (result.length > 170 && sentences.length > 0) {
      result = sentences[0].trim();
    }
    if (!result.endsWith('.')) result += '.';
    return `💡 Mẹo nhớ: ${result}`;
  }

  return '💡 Mẹo nhớ: Nắm vững định nghĩa chuẩn ISTQB CTFL v4.0 và phân tích kỹ câu hỏi để loại bỏ các phương án bẫy.';
}

export function processFile(filePath) {
  console.log(`Processing file: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let updatedCount = 0;
  for (const exam of data.exams) {
    for (const q of exam.questions) {
      q.mnemonic = deriveSpecificMnemonic(q);
      updatedCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Updated ${updatedCount} questions with question-tailored mnemonics in ${path.basename(filePath)}`);
}

const examsPath = path.resolve('public/data/examsData.json');
const aiExamsPath = path.resolve('public/data/aiExamsData.json');

processFile(examsPath);
processFile(aiExamsPath);
console.log('Finished updating all datasets with question-specific mnemonics!');
