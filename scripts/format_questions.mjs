import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const baseDir = path.dirname(__dirname);

const examsDataPath = path.join(baseDir, 'src', 'data', 'examsData.json');
const translationsViPath = path.join(baseDir, 'src', 'data', 'translationsVi.json');

const examsData = JSON.parse(fs.readFileSync(examsDataPath, 'utf8'));
const translationsVi = JSON.parse(fs.readFileSync(translationsViPath, 'utf8'));

/**
 * Cleanly formatted questions with proper newlines for list items, statements,
 * Roman numerals (I, II, III, IV), lettered items (A, B, C, D), and test case items.
 */
export const formattedQuestions = {
  // Exam 1 Câu 31
  e1_q30: {
    en: `As a test manager you are responsible for testing the following requirements:
• R1 – Process anomalies
• R2 – Synchronization
• R3 – Approval
• R4 – Problem solving
• R5 – Financial data
• R6 – Diagram data
• R7 – Changes to the user profile

Which one of the following options structures the test execution schedule according to the requirement dependencies?`
  },

  // Exam 3 Câu 14
  e3_q14: {
    vi: `Xét các loại lỗi mà một mức kiểm thử (test level) có thể tập trung vào:
(1) Lỗi trong các module hoặc đối tượng có thể kiểm thử riêng;
(2) Không tập trung vào việc tìm lỗi;
(3) Lỗi trong giao diện và tương tác;
(4) Lỗi trong toàn bộ đối tượng kiểm thử.

Lựa chọn nào ghép đúng các mức kiểm thử với các trọng tâm trên?`,
    en: `Consider the following types of defects that a test level might focus on:
(a) defects in separately testable modules or objects;
(b) not focused on identifying defects;
(c) defects in interfaces and interactions;
(d) defects in the whole test object.

Which of the following correctly matches the test levels from the Foundation syllabus with the defect-focus options given above?`
  },

  // Exam 3 Câu 24
  e3_q24: {
    vi: `Xét danh sách các kết quả không mong muốn có thể xảy ra trong một dự án phát triển ứng dụng di động:
(A) Tổng số hiển thị sai trên màn hình;
(B) Tiêu chí chấp nhận bị thay đổi trong lúc kiểm thử chấp nhận (acceptance testing);
(C) Người dùng thấy bàn phím ảo quá khó dùng với ứng dụng;
(D) Hệ thống phản hồi quá chậm khi người dùng nhập chuỗi tìm kiếm;
(E) Kiểm thử viên không được phép báo cáo kết quả kiểm thử trong các buổi họp standup hằng ngày.

Lựa chọn nào phân loại đúng các kết quả này thành rủi ro dự án (project risk) và rủi ro sản phẩm (product risk)?`,
    en: `Consider the following list of undesirable outcomes that could occur on a mobile app development effort:
(A) incorrect totals on screens;
(B) a change to the acceptance criteria during acceptance testing;
(C) users find the soft keyboard too hard to use with the app;
(D) the system responds too slowly to user input during search-string entry;
(E) testers are not allowed to report test results in the daily standup meetings.

Which of the following properly classifies these outcomes as project and product risks?`
  },

  // Exam 5 Câu 12
  e5_q9: {
    vi: `Một công ty phần mềm dùng mô hình chữ V (V-model) làm vòng đời phát triển. Lựa chọn nào chứa vai trò của KIỂM THỬ VIÊN (tester) trong công ty này?`,
    en: `A software company adopts the V-model as their development lifecycle. Which of the following contains roles of a TESTER in this company?`,
    options: {
      a: 'Review test plans and set up test environments',
      b: 'Introduce suitable metrics to measure the testing progress',
      c: 'Coordinate the test strategy with the project managers',
      d: 'Decide what should be automated, to what degree, and how'
    },
    optionsVi: {
      a: 'Rà soát kế hoạch kiểm thử (test plan) và thiết lập môi trường kiểm thử',
      b: 'Đưa ra số đo phù hợp để đo tiến độ kiểm thử',
      c: 'Điều phối chiến lược kiểm thử (test strategy) với quản lý dự án',
      d: 'Quyết định cái gì cần tự động hóa, ở mức nào và bằng cách nào'
    }
  },

  // Exam 5 Câu 13
  e5_q10: {
    vi: `Lỗi nào sau đây KHÔNG THỂ tìm thấy bằng kỹ thuật kiểm thử dựa trên cấu trúc (hộp trắng – white-box)?`,
    en: `Which of the following errors CANNOT be found with structure-based (white-box) testing techniques?`,
    options: {
      a: 'Memory is leaking',
      b: 'Data structures that are used before initialization',
      c: 'Features that are only partially implemented',
      d: 'Division by zero'
    },
    optionsVi: {
      a: 'Rò rỉ bộ nhớ',
      b: 'Cấu trúc dữ liệu được dùng trước khi khởi tạo',
      c: 'Tính năng chỉ được hiện thực một phần',
      d: 'Chia cho 0'
    }
  },

  // Exam 5 Câu 30
  e5_q22: {
    vi: `Phát biểu nào về rà soát có hướng dẫn (walkthrough) là KHÔNG đúng?`,
    en: `Which of the statements about walkthroughs is NOT true?`,
    options: {
      a: 'Pre-meeting preparation, documentation and distribution of results are optional for a walkthrough',
      b: 'A walkthrough is led by a moderator and requires pre-meeting preparation and post-meeting follow-up',
      c: 'A walkthrough may take the form of scenarios, dry runs and peer-group participation',
      d: 'The purpose of a walkthrough is to establish a common understanding of a document and to find possible defects in it'
    },
    optionsVi: {
      a: 'Chuẩn bị trước cuộc họp, lập tài liệu và phân phối kết quả là tùy chọn với rà soát có hướng dẫn',
      b: 'Rà soát có hướng dẫn do điều phối viên (moderator) dẫn dắt, đòi hỏi chuẩn bị trước cuộc họp và theo dõi sau cuộc họp',
      c: 'Rà soát có hướng dẫn có thể ở dạng kịch bản, chạy thử “khan” (dry run) và có sự tham gia của nhóm đồng nghiệp',
      d: 'Mục đích của rà soát có hướng dẫn là tạo hiểu biết chung về tài liệu và tìm các lỗi có thể có trong đó'
    }
  },

  // Exam 5 Câu 32
  e5_q24: {
    vi: `Bảng quyết định (decision table) dưới đây thể hiện cách tính giá của một câu lạc bộ golf cho phí sân (green fee) và thuê xe điện (buggy/cart). Kết quả mong đợi của hai test case sau là gì?
• TC1 – Paul không phải hội viên đầy đủ, có thẻ khách hàng thân thiết (Loyalty Card), muốn chơi 18 lỗ và thuê xe.
• TC2 – Cheryl không phải hội viên đầy đủ, không có thẻ khách hàng thân thiết, muốn chơi 9 lỗ và thuê xe.`,
    en: `The decision table in the figure reflects a golf club's pricing structure for green fees and buggy/cart hire. What is the expected result for each of the following two test cases?
• TC1 – Paul is not a full member, is a Loyalty Card holder, and requests to play 18 holes with a buggy/cart.
• TC2 – Cheryl is not a full member, does not have a Loyalty Card, and requests to play 9 holes with a buggy/cart.`
  },

  // Exam 6 Câu 1 (User screenshot)
  e6_q1: {
    vi: `Những chi tiết nào sau đây nhiều khả năng có trong một báo cáo sự cố (incident report)?
I. Định danh hạng mục kiểm thử (test item – configuration item) và môi trường;
II. Đặc điểm quy trình phát triển như độ ổn định của tổ chức và quy trình kiểm thử đang dùng;
III. Một lần rà soát (review) cơ sở kiểm thử (test basis) như yêu cầu, thiết kế, giao diện;
IV. Phạm vi hoặc mức độ tác động đến lợi ích của các bên liên quan.`,
    en: `Which of the following details would most likely be included in an incident report?
I. Identification of the test item (configuration item) and environment;
II. Development process characteristics such as organization stability and the test process used;
III. A review of the test basis, such as requirements, design, interfaces;
IV. Scope or degree of the impact on the stakeholders' interests.`
  },

  // Exam 6 Câu 15
  e6_q6: {
    vi: `Cho các loại kiểm thử:
a. Kiểm thử hồi quy – regression testing
b. Kiểm thử xác nhận – confirmation testing

Và các tình huống kiểm thử:
1. Kiểm thử để bảo đảm phiên bản hệ điều hành mới không gây tác dụng phụ ngoài ý muốn lên hệ thống;
2. Kiểm thử do áp dụng một bản vá bảo mật;
3. Kiểm thử do áp dụng phiên bản mới của hệ quản trị cơ sở dữ liệu;
4. Kiểm thử để bảo đảm bản sửa của hệ thống tính lương thực sự hoạt động.

Lựa chọn nào ghép đúng?`,
    en: `Given the following types of testing:
a. Regression testing
b. Confirmation testing

And the following testing scenarios:
1. Testing to ensure that a new version of the operating system does not have any unintended side-effects on the system;
2. Testing due to the application of a security patch;
3. Testing due to the application of a new version of the database management system;
4. Testing to ensure that the fix to the payroll system truly works.

Which of the following correctly matches them?`
  },

  // Exam 6 Câu 37
  e6_q24: {
    en: `Given the review process main activities:
a. Planning
b. Initiate review
c. Issue communication and analysis
d. Fixing and reporting

And the specific review activities:
1. Creating defect reports
2. Estimating effort
3. Recording the updated status of defects
4. Selecting the people to participate
5. Distributing the work product and other material
6. Evaluating the review findings

Which of the following BEST matches the main activities with the specific activities? (See the figure.)`
  },

  // Exam 6 Câu 40
  e6_q25: {
    en: `Given the review types:
a. Pair review
b. Walkthrough
c. Technical review
d. Inspection

And the review characteristics:
1. Formal
2. Informal
3. Purposes include evaluating the quality of the work product under review and generating new ideas, e.g. brainstorming solutions
4. Purposes include improving the software product and training the review participants

Which of the following BEST matches the review type with the review characteristic? (See the figure.)`
  },

  // Exam 7 Câu 2
  e7_q2: {
    vi: `Cho sơ đồ chuyển đổi trạng thái (state transition diagram) dưới đây. Ghép các test case sau với chuỗi trạng thái tương ứng:
(i) X-Z-V-W;
(ii) W-Y-U-U.`,
    en: `Given the state transition diagram in the figure (states S1–S4; transitions: X: S1→S2, Z: S2→S3, V: S3→S4, Y: S2→S4, W: S4→S2, U: S4→S4), match the test cases below with the relevant set of state transitions:
(i) X-Z-V-W;
(ii) W-Y-U-U.`
  },

  // Exam 7 Câu 6
  e7_q6: {
    en: `Which of the following BEST matches the descriptions with the different categories of test techniques? (See the figure)
1. Test cases are based on the test basis, which may include the requirements, use cases and user stories;
2. Test cases are based on the test basis, which may include the software architecture or code;
3. Test cases can show deviations from the requirements;
4. These test techniques are applicable to both functional and non-functional testing;
5. Tests are based on the knowledge of developers, users and other stakeholders.`
  },

  // Exam 7 Câu 11
  e7_q9: {
    vi: `Cho bảng quyết định (decision table) nâng hạng vé máy bay dưới đây. Kết quả mong đợi cho các test case sau là gì?
• P) Khách hạng Gold đi hạng Economy;
• Q) Khách hạng Silver đi hạng Business.`,
    en: `Given the airline upgrade decision table in the figure (Rule 1: Gold + Business → free upgrade to First, discounted N/A; Rule 2: Gold + Economy → free upgrade to Business, discounted upgrade to First; Rule 3: Silver + Business → no free upgrade, discounted upgrade to First; Rule 4: Silver + Economy → free upgrade to Business, discounted none), what is the expected result for each of the following test cases?
• P) Gold frequent flyer, travelling in Economy class;
• Q) Silver frequent flyer, travelling in Business class.`
  },

  // Exam 7 Câu 15
  e7_q13: {
    en: `Which of the following types of defect are typically found in reviews rather than in dynamic testing? (See the figure)
a. deviations from standards;
b. defects in interface implementation;
c. poor maintainability of code;
d. poor performance of the system;
e. defects in requirements.`
  },

  // Exam 7 Câu 19
  e7_q16: {
    en: `Which of the following are characteristic of regression testing? (See the figure)
i. regression testing is run ONLY once;
ii. regression testing is used after fixes have been made;
iii. regression testing is often automated;
iv. regression tests need not be maintained.`
  },

  // Exam 7 Câu 33
  e7_q26: {
    vi: `Bảng quyết định (decision table) dưới đây thể hiện cơ chế thanh toán chi phí nhiên liệu của một công ty. Những test case nào HỢP LỆ?
• TC1: nhân viên không lái ô tô cũng không lái xe máy xin thanh toán nhiên liệu — mong đợi: không được thanh toán.
• TC2: nhân viên lái ô tô diesel 1700cc xin thanh toán — mong đợi: được thanh toán mức C.
• TC3: nhân viên đi xe máy xin thanh toán — mong đợi: được thanh toán mức A.`,
    en: `The decision table in the figure shows a company's fuel expenses structure (Rule 1: neither car nor motorcycle driver → cannot claim; Rule 2: car + diesel + engine < 1600cc → band A; Rule 3: car + diesel + engine > 1600cc → band B; Rule 4: car + petrol + engine < 1600cc → band C; Rule 5: car + petrol + engine > 1600cc → band D; Rule 6: motorcycle → band A). Which of the following test cases based on the decision table are VALID?
• TC1: an employee who is neither a car nor a motorcycle driver attempts to claim fuel expenses — expected: claim not allowed.
• TC2: an employee who drives a 1700cc diesel car attempts to claim — expected: claim accepted at band C.
• TC3: an employee who rides a motorcycle attempts to claim — expected: claim accepted at band A.`
  },

  // Exam 7 Câu 34
  e7_q27: {
    en: `Which of the following are structure-based techniques? (See the figure)
a. decision table testing;
b. boundary value analysis;
c. multiple condition coverage;
d. use case testing;
e. decision testing.`
  },

  // Exam 7 Câu 35
  e7_q28: {
    en: `Which of the following are tasks of a TESTER? (See the figure)
i. interaction with the test tool vendor to identify the best ways to leverage the test tool on the project;
ii. prepare and acquire test data;
iii. implement tests on all test levels, execute and log the tests;
iv. create the test specifications.`
  },

  // Exam 7 Câu 36
  e7_q29: {
    en: `Which of the following are benefits of an independent test team, and which are drawbacks? (See the figure)
a. independent testers can find different defects;
b. developers may put less emphasis on quality;
c. independent testers can be seen as the reason for delayed projects;
d. independent testers can verify assumptions made during the specification of a system.`
  },

  // Exam 7 Câu 37
  e7_q30: {
    en: `Which of the following statements about a formal review or inspection are true? (See the figure)
i. led by a trained moderator, not the author;
ii. no pre-meeting preparations;
iii. formal follow- up process;
iv. the main objective is to find defects.`
  },

  // Exam 8 Câu 3
  e8_q3: {
    vi: `Những phát biểu nào nhấn mạnh đúng quan điểm của lập trình viên và kiểm thử viên về tâm lý học kiểm thử?
(I) Nếu lập trình viên mắc lỗi thiết kế nền tảng (ví dụ hiểu sai khái niệm), RẤT có khả năng họ sẽ không tìm ra lỗi đó bằng chính các test case của mình;
(II) Kiểm thử viên có thể quan sát đối tượng kiểm thử (test object) mà không định kiến — đó không phải sản phẩm của họ, và giả định, hiểu lầm của lập trình viên nhìn chung không giống của kiểm thử viên;
(III) Kiểm thử viên độc lập phải tìm hiểu về đối tượng kiểm thử để tạo test case, trong khi lập trình viên đã hiểu rõ nó, giúp tiết kiệm thời gian — vì vậy nên giao hoạt động kiểm thử cho lập trình viên;
(IV) Điểm yếu của test case do lập trình viên làm là họ thường lạc quan về phần mềm của mình; rủi ro là các test case hợp lý bị bỏ quên vì lập trình viên quan tâm phát triển hơn kiểm thử.`,
    en: `Which of the following statements correctly emphasize the viewpoints of a developer and a tester with respect to testing psychology?
(I) If a developer implements a fundamental design error (e.g., a conceptual misunderstanding), it is HIGHLY probable that he/she will not find it using their own tests;
(II) The tester can observe the object under test without prejudice — it is not their own product, and the assumptions and misunderstandings of the developer are, in general, not the same as those of the tester;
(III) An independent tester must acquire knowledge about the object under test in order to create test cases, whereas the developer already has good knowledge of it, which saves time — hence it is advisable to assign the test activities to the developer;
(IV) The weakness of tests done by the developer is that developers tend to be optimistic about their own software; the risk is that reasonable test cases are forgotten because the developer is more interested in development than in testing.`
  },

  // Exam 8 Câu 4
  e8_q4: {
    vi: `Những điều nào sau đây áp dụng cho kiểm thử hệ thống (system testing)?
(a) Có thể đáp ứng yêu cầu pháp lý;
(b) Có thể dùng đặc tả hệ thống làm cơ sở kiểm thử (test basis);
(c) Thường thuộc trách nhiệm của người dùng nghiệp vụ;
(d) Mục tiêu chính là tạo niềm tin;
(e) Nên tập trung vào giao tiếp giữa các hệ thống.`,
    en: `Which of the following apply to system testing?
(a) It may satisfy legal requirements;
(b) It can use system specifications as a test basis;
(c) It is often the responsibility of business users;
(d) Its main goal is to establish confidence;
(e) It should focus on the communication between systems.`
  },

  // Exam 8 Câu 5
  e8_q5: {
    vi: `Những điều nào sau đây là tác nhân kích hoạt kiểm thử bảo trì (maintenance testing)?
(a) Di chuyển (migration) hệ thống từ nền tảng này sang nền tảng khác;
(b) Ngừng sử dụng (retirement) một hệ thống;
(c) Chuẩn bị cho một cuộc kiểm toán (audit) hệ thống;
(d) Sửa đổi hệ thống;
(e) Phát triển một hệ thống hoàn toàn mới.`,
    en: `Which of the following are triggers for maintenance testing?
(a) System migration from one platform to another;
(b) Retirement of a system;
(c) Preparation for an audit of the system;
(d) Modifications to the system;
(e) Development of a whole new system.`
  },

  // Exam 8 Câu 8
  e8_q8: {
    vi: `Bạn đang rà soát (review) các test case của đồng nghiệp dựa trên tài liệu cơ sở kiểm thử (test basis) dưới đây.

Các test case gồm:
• TC1. Thành công – ‘User Name’ và ‘Password’ hợp lệ; hiển thị ‘Customer Menu’.
• TC2. Sự cố – trường ‘User Name’ để trống; hiển thị lỗi 12.
• TC3. Sự cố – ‘User Id’ nhập vào không tồn tại trong cơ sở dữ liệu; hiển thị lỗi 23.
• TC4. Sự cố – ‘Password’ không khớp mật khẩu của người dùng trong cơ sở dữ liệu; hiển thị lỗi 24.

Bạn dùng checklist sau:
• C1 – phải có một test case cho trường hợp thành công;
• C2 – phải có một test case cho mỗi đường lỗi;
• C3 – mỗi test case phải dùng thuật ngữ nhất quán với tài liệu cơ sở kiểm thử (tên trường, số hiệu lỗi…).

Ghi một lỗi riêng cho mỗi test case bị thiếu (C1, C2) và cho mỗi test case không đạt C3. Bạn nên ghi bao nhiêu lỗi?`,
    en: `You are performing a review of your colleague's test cases based on the test basis document shown in the figure (a User Login screen with 'User Name' and 'Password' fields, and a validation table: V1 – User Name mandatory, error 12; V2 – User Name must already exist on the database, error 23; V3 – Password mandatory, error 13; V4 – Password must match the user's password on the database, error 24).

The test cases are:
• TC1. Success – valid 'User Name' and 'Password'; 'Customer Menu' displayed.
• TC2. Failure – 'User Name' field blank; error 12 displayed.
• TC3. Failure – 'User Id' entered does not exist on the database; error 23 displayed.
• TC4. Failure – 'Password' does not match the user's password on the database; error 24 displayed.

You are guided by this checklist:
• C1 – there must be one test case to cover success;
• C2 – there must be one test case for each error path;
• C3 – each test case must use terminology consistent with the test basis document (field names, error numbering, etc.).

Record a separate defect for each missing test case (C1, C2) and for each test case that does not meet C3. How many defects should you record?`
  },

  // Exam 8 Câu 10
  e8_q10: {
    vi: `Một hệ thống tưới vườn cho phép người dùng nhập hai giá trị:
(1) Tần suất — số lần hệ thống tự bật mỗi ngày, tối thiểu 1 lần, tối đa 5 lần;
(2) Thời lượng — thời gian hoạt động mỗi lần bật, tính theo PHÚT NGUYÊN, từ 1 đến 60.

Áp dụng phân tích giá trị biên (boundary value analysis) 2 điểm, lựa chọn nào là tập giá trị biên hợp lệ và không hợp lệ đúng?`,
    en: `A garden irrigation system allows the user to specify two inputs:
(1) Frequency — the number of times the system should be switched on automatically per day, minimum once, maximum 5 times;
(2) Duration — the duration of operation in WHOLE minutes each time it is switched on, ranging from 1 to 60.

Applying 2-value boundary value analysis, which of the following options is the correct test set of valid and invalid boundary values?`
  },

  // Exam 8 Câu 12
  e8_q12: {
    vi: `Có các test case sau để kiểm thử những thay đổi đối với các chức năng liên quan đến độc giả trong một Hệ thống quản lý thư viện:
• 1 – Thêm độc giả mới;
• 2 – Cập nhật thông tin độc giả;
• 3 – Xóa độc giả;
• 4 – Cho độc giả mượn sách;
• 5 – Độc giả trả sách;
• 6 – Đặt trước sách cho độc giả;
• 7 – Gửi thông báo “sách đặt trước đã sẵn sàng” cho độc giả.

Chuỗi kiểm thử nào thể hiện một use case khả dĩ? (Mỗi chuỗi bắt đầu bằng ca 1.)`,
    en: `The following test cases are available for testing changes made to the functions associated with borrowers in a Library Management System:
• 1 – Add a new borrower;
• 2 – Update a borrower's data;
• 3 – Remove a borrower;
• 4 – Loan a book to a borrower;
• 5 – Return a book from a borrower;
• 6 – Reserve a book for a borrower;
• 7 – Send a "reservation ready" message to a borrower.

Which of the following test sequences represents a possible use case? (Each sequence starts with test 1.)`
  },

  // Exam 8 Câu bổ sung 4
  e8_q18: {
    vi: `Một đánh giá rủi ro cho ra các rủi ro sản phẩm (product risk) sau:
• R1 — khả năng xảy ra: cao, tác động: thấp;
• R2 — khả năng: cao, tác động: cao;
• R3 — khả năng: thấp, tác động: thấp;
• R4 — khả năng: thấp, tác động: cao.

Theo chiến lược kiểm thử dựa vào rủi ro (risk-based testing), vùng rủi ro nào nên được kiểm thử ĐẦU TIÊN và kỹ lưỡng nhất?`,
    en: `A risk assessment produced the following product risks:
• R1 — likelihood: high, impact: low;
• R2 — likelihood: high, impact: high;
• R3 — likelihood: low, impact: low;
• R4 — likelihood: low, impact: high.

Following a risk-based testing strategy, which risk area should be tested FIRST and most thoroughly?`
  },

  // Exam 9 Câu 5
  e9_q5: {
    vi: `Báo cáo sự cố (incident report) sau được tạo ra trong kiểm thử hệ thống (system test) một ứng dụng web:
“Phát hiện lỗi: 15.8.2010, bởi Joe Smith.
Mức kiểm thử: kiểm thử hệ thống.
Test case: Area 5 / TC 98.
Phiên bản build: 2011-16.2.
Mô tả: sau khi điền đủ các trường bắt buộc ở màn hình 1, tôi bấm ENTER để sang màn hình 2. Không có gì xảy ra — hệ thống hoàn toàn không phản hồi.”

Bạn đề xuất cải thiện QUAN TRỌNG NHẤT nào cho báo cáo này?`,
    en: `The following incident report was generated during system test of a web application:
“Defect detected: 15.8.2010, by Joe Smith.
Test level: system test.
Test case: Area 5 / TC 98.
Build version: 2011-16.2.
Description: after filling out all required fields on screen 1, I click ENTER to continue to screen 2. Nothing happens — no system response at all.”

What would you suggest as the MOST IMPORTANT improvement to this report?`
  },

  // Exam 9 Câu 11
  e9_q11: {
    en: `You must compile a test execution schedule. The system has these logical dependencies: an ADMIN user must create/amend/delete a STANDARD user, and a standard user is necessary to perform all other actions. The test plan requires: re-tests (previously failed tests) must be performed first, followed by the highest-priority tests; and tests should be scheduled so that they create the test data needed by subsequent tests.

The test cases are shown in the figure:
(a) log in as standard user and create a customer account — priority 2, previously failed;
(b) order one item — priority 3, passed;
(c) create an invoice for an order — priority 1, previously failed;
(d) order two items or more — priority 3, previously failed;
(e) log in as admin user and create a standard user — priority 2, passed.

Which schedule meets the test plan requirements and the logical dependencies?`
  },

  // Exam 9 Câu bổ sung 3
  e9_q17: {
    vi: `Một nhóm Agile dùng mô hình BỐN GÓC PHẦN TƯ KIỂM THỬ (testing quadrants) để trao đổi về các test case của mình. Phân loại hai hoạt động sau:
(1) Kiểm thử đơn vị và kiểm thử tích hợp thành phần tự động, hỗ trợ nhóm và hướng công nghệ;
(2) Kiểm thử tính khả dụng (usability testing) và các phiên kiểm thử khám phá (exploratory testing) phản biện sản phẩm từ góc nhìn nghiệp vụ/người dùng.

Phân loại nào đúng?`,
    en: `An Agile team uses the TESTING QUADRANTS model to communicate about its tests. Classify the following two activities:
(1) automated unit and component integration tests that support the team and are technology-facing;
(2) usability testing and exploratory testing sessions that critique the product from the business/user perspective.

Which classification is correct?`
  },

  // Exam 9 Câu bổ sung 8
  e9_q22: {
    vi: `Phân loại bốn hoạt động sau là đảm bảo chất lượng (quality assurance – QA) hay kiểm soát chất lượng (quality control – QC) theo CTFL v4.0:
(1) Định nghĩa và kiểm toán (audit) quy trình phát triển của tổ chức;
(2) Thực thi kiểm thử hệ thống trên một bản ứng viên phát hành (release candidate);
(3) Phân tích số đo quy trình để phòng ngừa lỗi trong tương lai;
(4) Rà soát một tài liệu thiết kế để phát hiện lỗi trong đó.`,
    en: `Classify the following four activities as quality assurance (QA) or quality control (QC), according to CTFL v4.0:
(1) defining and auditing the organization's development process;
(2) executing system tests on a release candidate;
(3) analyzing process metrics to prevent future defects;
(4) reviewing a design document to detect defects in it.`
  },

  // Exam 10 Câu 38
  e10_q38: {
    vi: `Phân loại bốn hoạt động sau là đảm bảo chất lượng (quality assurance – QA) hay kiểm soát chất lượng (quality control – QC) theo CTFL v4.0:
(1) Định nghĩa và kiểm toán (audit) quy trình phát triển của tổ chức;
(2) Thực thi kiểm thử hệ thống (system test) trên một bản ứng viên phát hành (release candidate);
(3) Phân tích số đo quy trình để phòng ngừa lỗi trong tương lai;
(4) Rà soát (review) một tài liệu thiết kế để phát hiện lỗi trong đó.`,
    en: `Classify the following four activities as quality assurance (QA) or quality control (QC), according to CTFL v4.0:
(1) defining and auditing the organization's development process;
(2) executing system tests on a release candidate;
(3) analyzing process metrics to prevent future defects;
(4) reviewing a design document to detect defects in it.`
  }
};

export function applyFormatting() {
  let updatedCount = 0;
  for (const exam of examsData.exams) {
    for (const q of exam.questions) {
      const patch = formattedQuestions[q.id];
      if (patch) {
        if (patch.vi) {
          q.questionVi = patch.vi;
          if (translationsVi[q.id]) {
            translationsVi[q.id].questionVi = patch.vi;
          }
        }
        if (patch.en) {
          q.question = patch.en;
        }
        if (patch.options) {
          q.options = { ...q.options, ...patch.options };
        }
        if (patch.optionsVi) {
          q.optionsVi = { ...q.optionsVi, ...patch.optionsVi };
          if (translationsVi[q.id]) {
            translationsVi[q.id].optionsVi = {
              ...(translationsVi[q.id].optionsVi || {}),
              ...patch.optionsVi,
            };
          }
        }
        updatedCount++;
      }
    }
  }

  fs.writeFileSync(examsDataPath, JSON.stringify(examsData, null, 2), 'utf8');
  fs.writeFileSync(translationsViPath, JSON.stringify(translationsVi, null, 2), 'utf8');
  console.log(`Successfully formatted ${updatedCount} questions in examsData.json and translationsVi.json`);
}

// If executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  applyFormatting();
}
