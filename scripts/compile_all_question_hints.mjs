import fs from 'fs';
import path from 'path';

function cleanSentence(text) {
  let s = (text || '').trim();
  s = s.replace(/[\s;:,]+$/, '');
  if (!s.endsWith('.') && !s.endsWith('!') && !s.endsWith('?')) {
    s += '.';
  }
  return s;
}

/**
 * Curated question-specific hints for official questions
 */
export function deriveOfficialHint(q) {
  if (q.explanationShort && q.explanationShort.trim().length > 5) {
    let text = q.explanationShort.trim();
    text = text.replace(/^(đáp án đúng là:?|chọn:?|phương án đúng là:?)\s*/i, '');
    text = text.replace(/\n+/g, ' ').trim();
    return `💡 Gợi ý: ${cleanSentence(text)}`;
  }

  if (q.explanation) {
    let chunk = q.explanation.split(/các phương án (còn lại|khác)|các lựa chọn khác/i)[0].trim();
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)[^:]*:\s*/i, '');
    chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)\.?\s*/i, '');
    chunk = chunk.replace(/\n+/g, ' ').trim();
    const sentences = chunk.split(/(?<=[.!?])\s+/).filter(Boolean);
    let res = sentences.slice(0, 2).join(' ').trim();
    return `💡 Gợi ý: ${cleanSentence(res)}`;
  }

  return '💡 Gợi ý: Nắm vững định nghĩa chuẩn ISTQB CTFL v4.0 và phân tích kỹ câu hỏi để loại bỏ phương án bẫy.';
}

/**
 * Curated question-specific hints for AI questions
 */
export function deriveAIHint(q) {
  const qVi = (q.questionVi || q.question || '').toLowerCase().replace(/\s+/g, ' ');
  const rawExpl = (q.explanation || '').trim();
  const explNorm = rawExpl.toLowerCase().replace(/\s+/g, ' ');

  // 1. Handcrafted expert hints for tricky negative/DevOps/static testing questions
  if (q.id === 'ai1_q9' || q.id === 'ai8_q10') {
    return '💡 Gợi ý: Đề bài hỏi điểm KHÔNG PHẢI là lợi ích của DevOps. Việc phải đưa vào và bảo trì công cụ CI/CD là chi phí và thách thức kỹ thuật, không phải lợi ích đạt được.';
  }
  if (q.id === 'ai2_q10') {
    return '💡 Gợi ý: Cảnh giác với từ mang tính tuyệt đối "loại bỏ hoàn toàn". DevOps tự động hóa nhiều kiểm thử hồi quy nhưng không thể loại bỏ kiểm thử thủ công (như kiểm thử khám phá hay UAT).';
  }
  if (q.id === 'ai3_q9') {
    return '💡 Gợi ý: Đòi hỏi thêm nguồn lực và khó thiết lập/duy trì là một thách thức/rủi ro khi áp dụng DevOps, không phải là lợi ích.';
  }
  if (q.id === 'ai1_q25' || q.id === 'ai2_q24') {
    return '💡 Gợi ý: Độ bao phủ nhánh (Branch Coverage) bắt buộc phải đo lường CẢ HAI kết quả: nhánh Đúng (True) VÀ nhánh Sai (False) của mọi điểm quyết định trong mã nguồn.';
  }
  if (q.id === 'ai4_q24') {
    return '💡 Gợi ý: "Các câu lệnh có thể thực thi" là đối tượng bao phủ của kiểm thử câu lệnh (Statement Testing). Đối tượng của kiểm thử nhánh là các nhánh điều khiển True/False.';
  }
  if (q.id === 'ai1_q34' || q.id === 'ai9_q34') {
    return '💡 Gợi ý: Tháp kiểm thử (Test Pyramid) có đỉnh là UI/End-to-End test: chạy chậm nhất và chi phí bảo trì đắt nhất; tầng đáy (Unit test) mới là nhanh nhất và chi phí thấp nhất.';
  }
  if (q.id === 'ai2_q15') {
    return '💡 Gợi ý: Kiểm thử tĩnh (Static Testing) áp dụng cho MỌI sản phẩm công việc (tài liệu yêu cầu, thiết kế kiến trúc, user story, test plan...), không chỉ riêng mã nguồn.';
  }
  if (q.id === 'ai5_q15') {
    return '💡 Gợi ý: Kiểm thử tĩnh và kiểm thử động BỔ TRỢ lẫn nhau, không thay thế nhau. Kiểm thử tĩnh tìm khiếm khuyết trong tài liệu/code, kiểm thử động tìm lỗi khi mã chạy thực tế.';
  }
  if (q.id === 'ai8_q15') {
    return '💡 Gợi ý: Định nghĩa cốt lõi: Kiểm thử tĩnh KHÔNG THỰC THI (chạy) mã nguồn; chỉ có kiểm thử động mới chạy phần mềm để tìm sự cố (failures).';
  }
  if (q.id === 'ai10_q16') {
    return '💡 Gợi ý: Kiểm thử tĩnh giúp phát hiện lỗi sớm (Shift-Left), giúp TIẾT KIỆM chi phí sửa lỗi cho toàn bộ dự án, chứ không làm tăng tổng chi phí.';
  }
  if (q.id === 'ai2_q25' || q.id === 'ai10_q25') {
    return '💡 Gợi ý: Kiểm thử hộp trắng (White-box testing) có thể áp dụng ở MỌI cấp độ kiểm thử (thành phần, tích hợp, hệ thống...), không giới hạn ở kiểm thử thành phần.';
  }
  if (q.id === 'ai3_q27') {
    return '💡 Gợi ý: Mô hình 3C của Ron Jeffries cho User Story gồm: Card (thẻ), Conversation (trao đổi/thảo luận), và Confirmation (tiêu chí nghiệm thu/xác nhận). Không có "Code".';
  }
  if (q.id === 'ai4_q27') {
    return '💡 Gợi ý: Tiêu chí chấp nhận (Acceptance Criteria) viết bằng ngôn ngữ tự nhiên (hoặc Given/When/Then của BDD) để mọi bên cùng hiểu, KHÔNG BẮT BUỘC phải là mã nguồn tự động.';
  }
  if (q.id === 'ai5_q27') {
    return '💡 Gợi ý: Theo phương pháp Test-First / Shift-Left, tiêu chí chấp nhận PHẢI được xác định TRƯỚC HOẶC TRONG KHI phân tích user story, không phải sau khi đã code xong.';
  }
  if (q.id === 'ai8_q6') {
    return '💡 Gợi ý: Cách tiếp cận toàn đội ngũ (Whole-Team Approach) chia sẻ trách nhiệm chất lượng cho cả nhóm, nhưng VẪN RẤT CẦN các tester có kỹ năng chuyên sâu để định hướng và thiết kế test.';
  }
  if (q.id === 'ai10_q6') {
    return '💡 Gợi ý: Triết lý Whole-Team Approach: Chất lượng là trách nhiệm CHUNG của cả nhóm (Dev, Tester, PO, BA), không phải là trách nhiệm của riêng cá nhân tester.';
  }
  if (q.id === 'ai4_q16') {
    return '💡 Gợi ý: Giá trị đặc biệt của kiểm thử tĩnh: phát hiện các khiếm khuyết trong code/tài liệu ngay cả khi mã không chạy được (như biến chưa khai báo, mã không thể đạt tới - unreachable code).';
  }
  if (q.id === 'ai6_q16') {
    return '💡 Gợi ý: Kiểm thử tĩnh đáp ứng trực tiếp nguyên tắc kiểm thử sớm (Shift-Left), giúp phát hiện và ngăn ngừa lỗi ngay từ khâu đặc tả yêu cầu và thiết kế kiến trúc.';
  }
  if (q.id === 'ai6_q24') {
    return '💡 Gợi ý: Khái niệm cốt lõi: Hạng mục bao phủ (coverage item) của kiểm thử câu lệnh là các câu lệnh có thể thực thi (executable statements).';
  }
  if (q.id === 'ai10_q24') {
    return '💡 Gợi ý: Khái niệm cốt lõi: Hạng mục bao phủ (coverage item) của kiểm thử nhánh là các nhánh — tức sự chuyển giao điều khiển giữa hai nút trong đồ thị luồng điều khiển.';
  }
  if (q.id === 'ai5_q25') {
    return '💡 Gợi ý: Công thức độ bao phủ nhánh = (Số nhánh đã thực thi ÷ Tổng số nhánh) × 100%.';
  }
  if (q.id === 'ai7_q25') {
    return '💡 Gợi ý: Phân loại nhánh: Một nhánh có thể là có điều kiện (kết quả True/False của lệnh if, switch-case) hoặc không điều kiện (kết thúc khối lệnh nhảy đến điểm tiếp theo).';
  }
  if (q.id === 'ai6_q25') {
    return '💡 Gợi ý: Lợi ích lớn của kiểm thử hộp trắng: cung cấp thước đo độ bao phủ định lượng khách quan và chỉ ra các vùng mã nguồn chưa được test case nào chạm tới.';
  }
  if (q.id === 'ai8_q25') {
    return '💡 Gợi ý: Kỹ thuật hộp trắng cũng có thể áp dụng tĩnh bằng cách rà soát luồng điều khiển hoặc dry run (chạy thử khô trên giấy) mã nguồn.';
  }
  if (q.id === 'ai4_q25') {
    return '💡 Gợi ý: Trong kiểm thử câu lệnh, lỗi chỉ bộc lộ khi câu lệnh chứa lỗi được thực thi dưới điều kiện kích hoạt sự cố cụ thể.';
  }
  if (q.id === 'ai8_q24' || q.id === 'ai9_q25' || q.id === 'ai3_q25' || q.id === 'ai6_q25') {
    return '💡 Gợi ý: 100% bao phủ câu lệnh có thể bỏ sót kết quả quyết định (ví dụ nhánh Sai của lệnh if thiếu mệnh đề else). 100% bao phủ nhánh mới bảo đảm 100% câu lệnh.';
  }

  // 2. Matching questions
  if (rawExpl.startsWith('Ghép đúng:')) {
    let matchPart = rawExpl.split(/các phương án (khác|còn lại)/i)[0].trim();
    return `💡 Gợi ý: Ghép nối chuẩn xác: ${cleanSentence(matchPart.replace(/Ghép đúng:\s*/i, ''))}`;
  }

  // 3. Formula & Calculation
  if (rawExpl.includes('Công thức ước lượng ba điểm:') || rawExpl.includes('E = (a + 4m + b) / 6')) {
    return '💡 Gợi ý: Áp dụng công thức ước lượng ba điểm: E = (a + 4m + b) / 6, với a = lạc quan, m = khả dĩ nhất, b = bi quan.';
  }

  // 4. Priority & Dependency Scheduling
  if (rawExpl.includes('Cách làm: tại mỗi bước') && rawExpl.includes('phụ thuộc')) {
    let steps = rawExpl.split(/các phương án khác/i)[0].trim();
    return `💡 Gợi ý: ${cleanSentence(steps)}`;
  }

  // 5. Pattern-based pedagogical hints when raw explanation is too brief
  if (qVi.includes('mục tiêu kiểm thử')) {
    return '💡 Gợi ý: Mục tiêu kiểm thử gồm: đánh giá sản phẩm, xác minh yêu cầu, thẩm định kỳ vọng người dùng, tìm lỗi để giảm rủi ro vận hành (lưu ý: kiểm thử KHÔNG sửa lỗi - sửa lỗi là của Developer).';
  }
  if ((qVi.includes('lợi ích của tự động hóa') || qVi.includes('lợi ích của công cụ')) && qVi.includes('không phải')) {
    return '💡 Gợi ý: Tìm phương án nói về rủi ro/chi phí: chi phí bảo trì script, kỳ vọng phi thực tế, hoặc phụ thuộc nhà cung cấp là RỦI RO của công cụ, không phải lợi ích.';
  }
  if (qVi.includes('lợi ích của tự động hóa') || qVi.includes('lợi ích của công cụ')) {
    return '💡 Gợi ý: Lợi ích cốt lõi của công cụ/tự động hóa: giảm tác vụ lặp lại nhàm chán, tăng tính nhất quán/khả năng lặp lại và đo lường khách quan.';
  }
  if (qVi.includes('kỹ năng') && qVi.includes('tester')) {
    return '💡 Gợi ý: Tester chuyên nghiệp cần: tư duy phân tích & phản biện, chú ý chi tiết, kỹ năng giao tiếp tốt và tinh thần hợp tác toàn đội ngũ.';
  }
  if (qVi.includes('yếu tố thành công') && qVi.includes('rà soát')) {
    return '💡 Gợi ý: Yếu tố thành công của rà soát: mục tiêu rõ ràng, phân định vai trò cụ thể, chuẩn bị kỹ lưỡng, văn hóa cởi mở và cung cấp phản hồi tích cực để sửa lỗi.';
  }
  if ((qVi.includes('độ bao phủ câu lệnh') || qVi.includes('độ bao phủ nhánh')) && qVi.includes('phát biểu đúng')) {
    return '💡 Gợi ý: 100% bao phủ nhánh BẢO ĐẢM 100% bao phủ câu lệnh. Ngược lại, 100% câu lệnh có thể KHÔNG phủ hết nhánh (ví dụ lệnh if thiếu nhánh else).';
  }
  if (qVi.includes('user story') && qVi.includes('tiêu chí chấp nhận') && qVi.includes('phát biểu đúng')) {
    return '💡 Gợi ý: Tiêu chí chấp nhận (Acceptance Criteria) xác định phạm vi user story, tạo đồng thuận giữa các bên (PO, Dev, Tester) và làm cơ sở thiết kế test case nghiệm thu.';
  }
  if (qVi.includes('kế hoạch kiểm thử') && qVi.includes('không phải')) {
    return '💡 Gợi ý: Kế hoạch kiểm thử (Test Plan) định hướng cấp cao (phạm vi, rủi ro, lịch trình, nguồn lực, tiêu chí vào/ra); không chứa test case chi tiết hay kết quả thực thi.';
  }
  if (qVi.includes('độc lập trong kiểm thử') && qVi.includes('không phải')) {
    return '💡 Gợi ý: Hạn chế của tính độc lập: tester có thể bị cô lập khỏi nhóm phát triển, thiếu thông tin sâu về ngữ cảnh sản phẩm hoặc khiến lập trình viên ỷ lại.';
  }
  if (qVi.includes('lợi ích của tính độc lập')) {
    return '💡 Gợi ý: Lợi ích lớn nhất của kiểm thử độc lập là góc nhìn khách quan, không bị thiên kiến của tác giả và phát hiện các loại khiếm khuyết khác biệt.';
  }
  if (qVi.includes('lợi ích của devops')) {
    return '💡 Gợi ý: DevOps mang lại: phản hồi nhanh chóng về chất lượng mã qua CI/CD, tự động hóa hồi quy liên tục và môi trường build/test ổn định.';
  }

  // 6. General clean extraction from raw explanation
  let chunk = rawExpl.split(/các phương án (còn lại|khác)|các lựa chọn khác/i)[0].trim();
  chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)[^:]*:\s*/i, '');
  chunk = chunk.replace(/^(đáp án|phương án)\s*\([a-d]\)\.?\s*/i, '');
  chunk = chunk.replace(/^với bva 3 giá trị,?\s*/i, 'Với BVA 3 giá trị: ');
  chunk = chunk.replace(/\n+/g, ' ').trim();

  // Pick first 1-2 sentences
  const sentences = chunk.split(/(?<=[.!?])\s+/).filter(Boolean);
  let res = sentences.slice(0, 2).join(' ').trim();
  if (res.length > 180 && sentences.length > 0) {
    res = sentences[0].trim();
  }
  return `💡 Gợi ý: ${cleanSentence(res)}`;
}

export function compileDataset(filePath, isAI = false) {
  console.log(`Compiling hints for: ${filePath}`);
  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  let updatedCount = 0;
  for (const exam of data.exams) {
    for (const q of exam.questions) {
      const hint = isAI ? deriveAIHint(q) : deriveOfficialHint(q);
      q.hint = hint;
      q.mnemonic = hint;
      updatedCount++;
    }
  }

  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  console.log(`✓ Processed ${updatedCount} questions in ${path.basename(filePath)}`);

  // Also sync to dist if dist exists
  const distPath = filePath.replace('/public/', '/dist/');
  if (fs.existsSync(path.dirname(distPath))) {
    fs.writeFileSync(distPath, JSON.stringify(data, null, 2), 'utf8');
    console.log(`✓ Synchronized ${updatedCount} questions to ${distPath}`);
  }
}

const examsPath = path.resolve('public/data/examsData.json');
const aiExamsPath = path.resolve('public/data/aiExamsData.json');

compileDataset(examsPath, false);
compileDataset(aiExamsPath, true);
console.log('✅ Finished compiling dedicated hints for all 744 questions!');
