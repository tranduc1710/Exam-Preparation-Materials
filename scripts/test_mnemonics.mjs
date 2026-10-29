import fs from 'fs';

// Comprehensive pattern matching and synthesis for ISTQB CTFL v4.0 mnemonics
export function generateMnemonic(q) {
  const text = `${q.knowledge || ''} ${q.question || ''} ${q.questionVi || ''} ${q.explanation || ''} ${q.explanationShort || ''}`.toLowerCase();
  const optText = q.optionsVi ? Object.values(q.optionsVi).join(' ') : Object.values(q.options).join(' ');
  const fullText = (text + ' ' + optText).toLowerCase();

  // 1. Chapter 1: 7 Testing Principles
  if (fullText.includes('vắng mặt') || fullText.includes('sự hiện diện') || fullText.includes('presence of defects') || fullText.includes('không còn lỗi') || fullText.includes('hết lỗi') || fullText.includes('1.3.1') && fullText.includes('nguyên tắc')) {
    if (fullText.includes('presence') || fullText.includes('sự hiện diện') || fullText.includes('hoàn toàn không còn lỗi') || fullText.includes('vắng mặt của lỗi')) {
      return 'Kiểm thử chỉ chứng minh CÓ lỗi (presence), KHÔNG THỂ chứng minh HẾT lỗi (absence). Thấy khẳng định "phần mềm 100% không còn lỗi" ➔ Chắc chắn SAI.';
    }
  }
  if (fullText.includes('kiệt quệ') || fullText.includes('exhaustive testing') || fullText.includes('mọi kịch bản') || fullText.includes('mọi trường hợp')) {
    return 'Kiểm thử kiệt quệ (Exhaustive testing) là BẤT KHẢ THI. Luôn phải dựa trên phân tích rủi ro và mức độ ưu tiên để phân bổ nguồn lực hợp lý.';
  }
  if (fullText.includes('càng sớm') || fullText.includes('early testing') || fullText.includes('shift-left') || fullText.includes('shift left')) {
    return 'Kiểm thử càng sớm càng tốt (Early testing / Shift-Left): Bắt đầu ngay từ khâu phân tích yêu cầu; tìm và sửa lỗi càng sớm thì chi phí càng rẻ.';
  }
  if (fullText.includes('tập trung') || fullText.includes('defect cluster') || fullText.includes('cụm lỗi') || fullText.includes('pareto')) {
    return 'Lỗi có xu hướng tập trung (Defect clustering / Nguyên lý 80/20): Phần lớn số lỗi thường chỉ nằm ở một số ít module phức tạp hoặc hay thay đổi.';
  }
  if (fullText.includes('thuốc trừ sâu') || fullText.includes('pesticide paradox')) {
    return 'Nghịch lý thuốc trừ sâu (Pesticide paradox): Lặp lại mãi một bộ test case thì sâu bọ "nhờn thuốc", không tìm thêm được lỗi mới. BẮT BUỘC phải định kỳ cập nhật test case.';
  }
  if (fullText.includes('ngữ cảnh') || fullText.includes('context dependent') || fullText.includes('phụ thuộc ngữ cảnh')) {
    return 'Kiểm thử phụ thuộc ngữ cảnh (Context dependent): Không có một cách test chung cho mọi hệ thống; app y tế/hàng không cần kiểm thử nghiêm ngặt hơn app tin tức/game.';
  }
  if (fullText.includes('ngộ nhận') || fullText.includes('absence-of-errors') || fullText.includes('không có lỗi')) {
    return 'Ngộ nhận về việc không có lỗi (Absence-of-errors fallacy): Sửa hết 100% bug theo đặc tả nhưng sản phẩm không đúng nhu cầu thực tế của người dùng thì hệ thống VẪN THẤT BẠI.';
  }

  // 2. Error, Defect, Failure
  if (fullText.includes('error') && fullText.includes('defect') && fullText.includes('failure') || fullText.includes('khiếm khuyết') && fullText.includes('thất bại')) {
    return 'Nhớ chuỗi nhân quả: Con người phạm LỖI (Error/Mistake) ➔ Tạo ra KHIẾM KHUYẾT trong code/tài liệu (Defect/Bug) ➔ Gây ra THẤT BẠI/SỰ CỐ khi chạy phần mềm (Failure).';
  }
  if (fullText.includes('root cause') || fullText.includes('nguyên nhân gốc')) {
    return 'Nguyên nhân gốc rễ (Root Cause) là yếu tố sâu xa dẫn đến lỗi; xử lý triệt để nguyên nhân gốc rễ giúp ngăn ngừa lỗi tương tự tái diễn.';
  }

  // 3. Testing vs Debugging
  if (fullText.includes('debugging') || fullText.includes('gỡ lỗi')) {
    return 'Testing = Tìm ra sự cố/lỗi (do Tester thực hiện). Debugging = Định vị nguyên nhân trong mã nguồn và sửa chữa mã (do Developer thực hiện).';
  }

  // 4. Verification vs Validation
  if (fullText.includes('verification') && fullText.includes('validation') || fullText.includes('xác minh') && fullText.includes('thẩm định')) {
    return 'Verification (Xác minh) = "Làm sản phẩm CÓ ĐÚNG CÁCH không?" (so với đặc tả). Validation (Thẩm định) = "Làm CÓ ĐÚNG SẢN PHẨM không?" (so với nhu cầu người dùng).';
  }

  // 5. Confirmation testing vs Regression testing
  if (fullText.includes('confirmation testing') || fullText.includes('re-testing') || fullText.includes('regression testing') || fullText.includes('hồi quy') || fullText.includes('kiểm thử xác nhận')) {
    if (fullText.includes('confirmation') || fullText.includes('xác nhận') || fullText.includes('re-test')) {
      return 'Confirmation testing (Re-testing) = Test lại ĐÚNG con bug vừa được sửa xem đã hết chưa. Không nhầm lẫn với Regression testing (test kiểm tra vùng xung quanh).';
    }
    return 'Regression testing (Kiểm thử hồi quy) = Test lại các vùng liên quan để đảm bảo việc sửa lỗi hoặc cập nhật mới KHÔNG LÀM HỎNG các tính năng đang chạy ổn định.';
  }

  // 6. Review Types (Chapter 3)
  if (fullText.includes('inspection') || fullText.includes('thanh tra')) {
    return 'Inspection: Loại review chính thức & nghiêm ngặt nhất; BẮT BUỘC có Người điều phối (Moderator/Facilitator), dùng checklist, đo đạc metrics và có tiêu chí vào/ra (entry/exit criteria).';
  }
  if (fullText.includes('walkthrough') || fullText.includes('duyệt tài liệu')) {
    return 'Walkthrough: Do chính TÁC GIẢ (Author) chủ trì và dẫn dắt buổi họp; mục tiêu chính là học hỏi, giải thích bối cảnh và thu thập góp ý.';
  }
  if (fullText.includes('technical review') || fullText.includes('rà soát kỹ thuật')) {
    return 'Technical Review: Do các chuyên gia/đồng nghiệp kỹ thuật (Peers) thực hiện; tập trung vào tính đúng đắn kỹ thuật, giải pháp kiến trúc và tính khả thi.';
  }
  if (fullText.includes('informal review') || fullText.includes('rà soát không chính thức')) {
    return 'Informal review: Không có quy trình chính thức, không cần ghi chép biên bản chính thức, chi phí thấp và thường do 2 người (pair) thực hiện.';
  }

  // 7. Review Roles
  if (fullText.includes('moderator') || fullText.includes('facilitator') || fullText.includes('người điều phối')) {
    return 'Moderator (Facilitator) là "trọng tài" của buổi review: Đảm bảo tuân thủ quy trình, hòa giải bất đồng và giữ cuộc họp đúng trọng tâm mục tiêu.';
  }
  if (fullText.includes('scribe') || fullText.includes('recorder') || fullText.includes('thư ký')) {
    return 'Scribe (Recorder) là người ghi chép: Ghi nhận đầy đủ danh sách các lỗi, câu hỏi và điểm chưa rõ được nêu ra trong cuộc họp review.';
  }

  // 8. Test Levels (Chapter 2)
  if (fullText.includes('component testing') || fullText.includes('unit testing') || fullText.includes('kiểm thử thành phần')) {
    return 'Component/Unit Testing: Kiểm tra các đơn vị mã nguồn nhỏ nhất (hàm, class, module) một cách cô lập; thường do Developer thực hiện với mock/stub.';
  }
  if (fullText.includes('integration testing') || fullText.includes('kiểm thử tích hợp')) {
    return 'Integration Testing: Kiểm tra sự tương tác và giao diện (API, Interface, luồng truyền dữ liệu) giữa các component hoặc giữa các hệ thống với nhau.';
  }
  if (fullText.includes('system testing') || fullText.includes('kiểm thử hệ thống')) {
    return 'System Testing: Kiểm tra toàn bộ hệ thống hoàn chỉnh tích hợp theo các yêu cầu đầu cuối (End-to-End); bao gồm cả chức năng và phi chức năng trên môi trường sát thực tế.';
  }
  if (fullText.includes('acceptance testing') || fullText.includes('nghiệm thu')) {
    return 'Acceptance Testing (UAT): Do khách hàng/người dùng thực hiện để nghiệm thu và xây dựng niềm tin trước khi đưa hệ thống vào vận hành chính thức.';
  }

  // 9. Black-box Techniques (Chapter 4)
  if (fullText.includes('equivalence partitioning') || fullText.includes('phân vùng tương đương')) {
    return 'Phân vùng tương đương (EP): Chia miền dữ liệu thành các phân vùng; chọn 1 giá trị đại diện cho mỗi vùng. 1 giá trị pass thì cả vùng pass, 1 giá trị fail thì cả vùng fail.';
  }
  if (fullText.includes('boundary value') || fullText.includes('giá trị biên') || fullText.includes('bva')) {
    if (fullText.includes('3-value') || fullText.includes('3 giá trị')) {
      return 'BVA 3 giá trị: Với mỗi ranh giới, lấy đúng 3 điểm: Giá trị biên, Giá trị sát trong biên, và Giá trị sát ngoài biên.';
    }
    return 'BVA 2 giá trị: Với mỗi ranh giới, chỉ lấy 2 điểm: Giá trị ngay tại biên và Giá trị sát ngoài biên. Lỗi phần mềm rất hay nằm ở ranh giới biên!';
  }
  if (fullText.includes('decision table') || fullText.includes('bảng quyết định')) {
    return 'Bảng quyết định (Decision Table): Rất hiệu quả cho các quy tắc nghiệp vụ phức tạp với nhiều điều kiện kết hợp. Công thức số cột tối đa của bảng đầy đủ = 2^N (với N là số điều kiện Đúng/Sai).';
  }
  if (fullText.includes('state transition') || fullText.includes('chuyển trạng thái') || fullText.includes('sơ đồ trạng thái')) {
    return 'Chuyển trạng thái (State Transition): Phù hợp cho hệ thống có lưu trạng thái (ATM, giỏ hàng, đăng nhập). Độ phủ 0-switch = từng bước chuyển đơn; 1-switch = chuỗi 2 bước chuyển liên tiếp.';
  }

  // 10. White-box Techniques (Chapter 4)
  if (fullText.includes('statement coverage') || fullText.includes('độ phủ câu lệnh') || fullText.includes('câu lệnh')) {
    if (fullText.includes('branch') || fullText.includes('nhánh') || fullText.includes('decision')) {
      return 'Quy tắc vàng White-box: Đạt 100% Branch Coverage LUÔN LUÔN đảm bảo 100% Statement Coverage. Chiều ngược lại KHÔNG đúng (100% Statement chưa chắc đạt 100% Branch).';
    }
    return 'Statement Coverage = (Số câu lệnh đã thực thi / Tổng số câu lệnh) × 100%. Không đảm bảo bao phủ được tất cả các nhánh rẽ điều kiện.';
  }
  if (fullText.includes('branch coverage') || fullText.includes('decision testing') || fullText.includes('độ phủ nhánh')) {
    return 'Branch Coverage đo lường tất cả các nhánh rẽ (True/False) của mọi điểm quyết định trong code. Luôn mạnh hơn và bao trùm Statement Coverage.';
  }

  // 11. Experience-based (Chapter 4)
  if (fullText.includes('error guessing') || fullText.includes('đoán lỗi')) {
    return 'Error Guessing (Đoán lỗi): Dựa trên trực giác, kinh nghiệm thực chiến của tester và danh sách các lỗi điển hình thường gặp trong quá khứ.';
  }
  if (fullText.includes('exploratory testing') || fullText.includes('kiểm thử khám phá')) {
    return 'Exploratory Testing: Thiết kế test và thực thi test diễn ra ĐỒNG THỜI; sử dụng Test Charter (mục tiêu buổi test) và thực hiện trong khung thời gian cố định (Time-boxed).';
  }
  if (fullText.includes('checklist') || fullText.includes('danh sách kiểm tra')) {
    return 'Checklist-based Testing: Kiểm thử viên thực hiện test dựa trên một danh sách kiểm tra (checklist) gồm các mục, quy tắc hoặc bài học kinh nghiệm được tổng hợp trước.';
  }

  // 12. Test Management (Chapter 5)
  if (fullText.includes('entry criteria') || fullText.includes('exit criteria') || fullText.includes('tiêu chí vào') || fullText.includes('tiêu chí ra')) {
    return 'Entry Criteria = Tiêu chuẩn để BẮT ĐẦU test (ví dụ: môi trường đã sẵn sàng). Exit Criteria = Tiêu chí để KẾT THÚC test / cho phép phát hành (ví dụ: 100% critical bug đã fix).';
  }
  if (fullText.includes('rủi ro') || fullText.includes('risk')) {
    if (fullText.includes('project risk') || fullText.includes('rủi ro dự án')) {
      return 'Rủi ro dự án (Project Risk) liên quan đến tiến độ, nhân sự, ngân sách. Rủi ro sản phẩm (Product Risk) liên quan đến chất lượng, tính đúng đắn và độ tin cậy của phần mềm.';
    }
    return 'Công thức tính Mức độ rủi ro: Risk Level = Khả năng xảy ra (Likelihood) × Mức độ tác động (Impact). Luôn ưu tiên kiểm thử các hạng mục có rủi ro cao nhất trước.';
  }
  if (fullText.includes('estimation') || fullText.includes('ước lượng') || fullText.includes('planning poker') || fullText.includes('wideband delphi')) {
    if (fullText.includes('metrics') || fullText.includes('dựa trên số đo')) {
      return 'Ước lượng dựa trên số liệu (Metrics-based): Dùng dữ liệu đo đạc lịch sử của các dự án tương tự trước đây để tính toán thời gian và chi phí.';
    }
    return 'Ước lượng dựa trên chuyên gia (Expert-based): Dựa trên kinh nghiệm của các chuyên gia hoặc kỹ thuật đồng thuận nhóm như Planning Poker / Wideband Delphi.';
  }
  if (fullText.includes('defect report') || fullText.includes('báo cáo lỗi')) {
    return 'Defect Report chuẩn phải có: Tiêu đề súc tích, các bước tái hiện (Steps to Reproduce), Kết quả thực tế (Actual), Kết quả mong đợi (Expected), và Mức độ nghiêm trọng (Severity).';
  }
  if (fullText.includes('independence') || fullText.includes('tính độc lập')) {
    return 'Thang đo tính độc lập tăng dần: Tác giả tự test ➔ Đồng nghiệp cùng nhóm ➔ Tester độc lập trong nhóm dự án ➔ Đội kiểm thử độc lập chuyên trách ➔ Đơn vị kiểm thử độc lập bên thứ ba (Outsource).';
  }

  // 13. Test Tools (Chapter 6)
  if (fullText.includes('pilot project') || fullText.includes('dự án thử nghiệm') || fullText.includes('thí điểm')) {
    return 'Khi áp dụng công cụ mới, BẮT BUỘC bắt đầu bằng Dự án thử nghiệm (Pilot Project) để hiểu sâu công cụ, đánh giá mức độ phù hợp và ước lượng chi phí thực tế.';
  }
  if (fullText.includes('công cụ') || fullText.includes('tool')) {
    if (fullText.includes('lợi ích') || fullText.includes('benefit') || fullText.includes('rủi ro') || fullText.includes('risk')) {
      return 'Lợi ích của công cụ: Giảm công sức lặp lại, tăng tính nhất quán và đo lường khách quan. Rủi ro: Kỳ vọng phi thực tế và chi phí bảo trì script cao.';
    }
  }

  // 14. Agile & DevOps & CI/CD
  if (fullText.includes('continuous integration') || fullText.includes('ci/cd') || fullText.includes('tích hợp liên tục')) {
    return 'CI/CD tự động build và chạy regression test ngay khi code mới được commit; giúp phát hiện lỗi tích hợp tức thì và phản hồi siêu nhanh cho lập trình viên.';
  }
  if (fullText.includes('user story') || fullText.includes('acceptance criteria') || fullText.includes('tiêu chí chấp nhận')) {
    return 'User Story: Định nghĩa giá trị người dùng cần (As a... I want... So that...). Acceptance Criteria: Ranh giới cụ thể để xác định story đã hoàn thành và đạt chất lượng hay chưa.';
  }
  if (fullText.includes('atdd') || fullText.includes('tdd') || fullText.includes('bdd')) {
    return 'ATDD/TDD/BDD đều áp dụng nguyên lý Test-First: Viết kịch bản kiểm thử TRƯỚC KHI viết mã nguồn; thúc đẩy sự cộng tác chặt chẽ giữa Khách hàng, Tester và Developer.';
  }

  // 15. Fallback: Distill from explanationShort or key sentence in explanation
  if (q.explanationShort && q.explanationShort.length > 10 && q.explanationShort.length < 150) {
    let cleanShort = q.explanationShort.replace(/^(đáp án đúng là|chọn|đáp án đúng:)\s*/i, '').trim();
    if (!cleanShort.endsWith('.')) cleanShort += '.';
    return `Trọng tâm cốt lõi: ${cleanShort}`;
  }

  if (q.explanation) {
    // Extract first clear sentence of explanation
    const firstSentence = q.explanation.split(/[.\n]/)[0].trim();
    if (firstSentence.length > 20 && firstSentence.length < 140) {
      return `Điểm mấu chốt: ${firstSentence}.`;
    }
  }

  return 'Nắm vững định nghĩa chuẩn ISTQB CTFL v4.0 và liên hệ với mục tiêu kiểm thử trong vòng đời phần mềm để loại bỏ các phương án bẫy.';
}
