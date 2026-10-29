import React from 'react';
import { Question } from '../types';

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
  if (q.mnemonic && q.mnemonic.trim()) {
    return q.mnemonic.trim();
  }

  // Priority 1: Official exams with curated `explanationShort`
  if (q.explanationShort && q.explanationShort.trim().length > 10) {
    let text = q.explanationShort.trim();
    text = text.replace(/^(đáp án đúng là:?|chọn:?|phương án đúng là:?)\s*/i, '');
    text = text.replace(/\n+/g, ' ').trim();
    if (!text.endsWith('.')) text += '.';
    return `💡 Mẹo nhớ: ${text}`;
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
