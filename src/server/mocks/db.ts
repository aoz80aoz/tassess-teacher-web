import "server-only";
import type {
  ActivityType,
  AppNotification,
  Badge,
  CalendarEvent,
  CatalogCategory,
  Coupon,
  ContentPage,
  Exam,
  Faq,
  FaqCategory,
  LearningPattern,
  MindMap,
  Named,
  PortfolioPayload,
  Question,
  Session,
  SocialMedia,
  Teacher,
  Ticket,
  TicketReply,
  TransactionDetails,
  Unit,
  UsedCoupon,
} from "@/lib/api/types";

// The dummy backend's data. Shapes follow the real fixtures; content is
// invented. Kept on globalThis so it survives hot reloads in dev, and
// changes made on the site (new classroom, attendance…) stick until the
// server restarts.

export interface MockStudent {
  id: number;
  name: string;
  phone: string;
  parent_phone: string;
  identity_number: string;
  gender: "male" | "female";
  base: number;
  grade_id: number;
}

export interface MockGroup {
  id: number;
  name: string;
  subject_id: number;
  subject_category_id: number;
  created_at: string;
}

export interface MockSubject extends Named {
  subject_category_id: number;
  img: string | null;
}

export interface MockSkill {
  id: number;
  group_id: number;
  name: string;
  remedial_plan: string | null;
  status: "missing" | "improved";
  students: { student_id: number; wrong: number; correct: number; improved_at: string | null }[];
}

export interface MockElement {
  id: number;
  subject_id: number;
  name: string;
  max_degree: number;
  phases: (1 | 2)[];
}

export interface MockAttendance {
  is_present: number;
  is_late: number;
  present_at: string | null;
}

export interface MockDb {
  token: string | null;
  password: string;
  teacher: Teacher;
  categories: (Named & { classroom: Named; stage: Named })[];
  subscriptions: { id: number; subject_category_id: number; expiry_date: string }[];
  subjects: MockSubject[];
  groups: MockGroup[];
  students: MockStudent[];
  membership: Record<number, number[]>;
  sessions: Session[];
  units: Record<number, Unit[]>;
  questions: Question[];
  taseeseBank: Record<number, Omit<Question, "id" | "class_session_id" | "created_at">[]>;
  mindMaps: MindMap[];
  attendance: Record<number, Record<number, MockAttendance>>;
  activities: { session_id: number; student_id: number; type: string; is_positive: boolean; points: number }[];
  activityTypes: ActivityType[];
  exams: Exam[];
  examResults: Record<number, Record<number, string | null>>;
  elements: MockElement[];
  degrees: Record<string, number>;
  skills: MockSkill[];
  badges: Badge[];
  patterns: LearningPattern[];
  studentBadges: Record<number, number[]>;
  studentPatterns: Record<number, number[]>;
  notifications: AppNotification[];
  transactions: TransactionDetails[];
  coupons: Coupon[];
  usedCoupons: UsedCoupon[];
  tickets: Ticket[];
  replies: Record<number, TicketReply[]>;
  faqCategories: FaqCategory[];
  faqs: Faq[];
  pages: Record<string, ContentPage>;
  social: SocialMedia;
  stages: Named[];
  gradesByStage: Record<number, Named[]>;
  catalog: Record<number, CatalogCategory[]>;
  cart: { items: { subject_category_id: number; months: number }[]; coupon: Coupon | null };
  portfolio: PortfolioPayload | null;
  calendar: { hijri_year: number; terms: { start: string; end: string; weeks: number }[]; events: Record<string, CalendarEvent[]> };
  regions: Named[];
  nationalities: Named[];
  cities: Record<number, Named[]>;
  districts: Record<number, Named[]>;
  schools: Record<number, Named[]>;
  seq: number;
}

// ---------- helpers ----------

const pad = (n: number) => String(n).padStart(2, "0");

export function apiDateTime(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
}

export function apiDate(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** `2026-09-20 03:26 PM`: the shape of `created_at` in the API. */
export function apiStamp(d: Date): string {
  const h = d.getHours() % 12 || 12;
  return `${apiDate(d)} ${pad(h)}:${pad(d.getMinutes())} ${d.getHours() >= 12 ? "PM" : "AM"}`;
}

function dayAt(offsetDays: number, hour: number, minute = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  d.setHours(hour, minute, 0, 0);
  return d;
}

function minutesFromNow(m: number): Date {
  const d = new Date(Date.now() + m * 60_000);
  d.setSeconds(0, 0);
  return d;
}

/** Deterministic pseudo-random numbers, so the dummy data is stable. */
function rng(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1103515245 + 12345) % 2147483648;
    return s / 2147483648;
  };
}

// ---------- content ----------

const STUDENT_NAMES = [
  "ريم الحربي", "جود القحطاني", "لمى الشهري", "سارا الدوسري", "هيا العتيبي", "دانة الزهراني",
  "رهف المطيري", "غلا السبيعي", "شهد الغامدي", "نوف العنزي", "ليان الشمري", "أسيل المالكي",
  "جنى الرشيدي", "ملاك البقمي", "روان الجهني", "تالا العمري", "وعد الحارثي", "لين السهلي",
  "رغد القرني", "مها الزهراني", "بشرى الثبيتي", "يارا الخالدي", "حلا العسيري", "ميار الشهراني",
  "عهد اليامي", "سلمى الأحمدي", "ديما الفيفي", "أريج الحربي", "منار الدوسري", "لجين المطيري",
  "رزان الشمري", "نورة السبيعي", "غدير العتيبي", "شوق القحطاني", "رنا الغامدي", "آلاء البلوي",
  "فرح الزهراني", "جمانة الشهري", "لولوة الحربي", "مريم العنزي", "ضي المالكي", "هتان الجهني",
];

const UNITS_BY_SUBJECT: Record<number, { name: string; lessons: string[] }[]> = {
  5: [
    { name: "الأعداد النسبية", lessons: ["الأعداد النسبية", "مقارنة الأعداد النسبية وترتيبها", "الكسور العشرية"] },
    { name: "القوى والجذور", lessons: ["القوى والأسس", "الصيغة العلمية", "الجذور التربيعية"] },
    { name: "المعادلات الخطية", lessons: ["حل معادلات بخطوة واحدة", "حل معادلات بخطوتين", "المتباينات"] },
  ],
  9: [
    { name: "المادة وخصائصها", lessons: ["حالات المادة", "الخصائص الفيزيائية والكيميائية", "المخاليط والمحاليل"] },
    { name: "الطاقة", lessons: ["أشكال الطاقة", "تحولات الطاقة", "الحرارة"] },
  ],
  12: [
    { name: "أساسيات الحاسب", lessons: ["مكونات الحاسب", "نظام التشغيل", "إدارة الملفات"] },
    { name: "البرمجة بالبلوكات", lessons: ["المتغيرات", "الشروط", "التكرار"] },
  ],
};

const QUESTION_BANK: { text: string; options: string[]; correct: number }[] = [
  { text: "أي الكسور العشرية التالية هو الأكبر؟", options: ["0.45", "0.5", "0.405", "0.054"], correct: 1 },
  { text: "رتّب تصاعدياً: 1.2 ، 1.02 ، 1.22", options: ["1.02، 1.2، 1.22", "1.2، 1.02، 1.22", "1.22، 1.2، 1.02", "1.02، 1.22، 1.2"], correct: 0 },
  { text: "ما القيمة المنزلية للرقم 6 في العدد 3.064؟", options: ["أجزاء من عشرة", "أجزاء من مئة", "أجزاء من ألف", "آحاد"], correct: 1 },
  { text: "الكسر 3/4 يساوي:", options: ["0.34", "0.75", "0.43", "0.70"], correct: 1 },
  { text: "ناتج 2.5 + 1.25 هو:", options: ["3.30", "3.75", "3.50", "4.00"], correct: 1 },
  { text: "أي مما يلي عدد نسبي؟", options: ["√2", "π", "0.5", "√3"], correct: 2 },
  { text: "قيمة 2³ تساوي:", options: ["6", "8", "9", "5"], correct: 1 },
  { text: "الجذر التربيعي للعدد 49 هو:", options: ["6", "7", "8", "9"], correct: 1 },
];

function lessonText(lesson: string) {
  return {
    objectives: `- أن تتعرف الطالبة على ${lesson}.\n- أن تطبّق الطالبة مفهوم ${lesson} في مسائل حياتية.\n- أن تحل الطالبة تمارين متنوعة على ${lesson}.`,
    outcomes: `تمكّن الطالبة من فهم ${lesson} واستخدامه في حل المشكلات.`,
    teaching_steps: `1. تمهيد بموقف من الحياة اليومية.\n2. شرح ${lesson} بأمثلة متدرجة.\n3. نشاط جماعي بمجموعات كيجين.\n4. تقويم ختامي بمسابقة قصيرة.`,
  };
}

// ---------- seed ----------

function seed(): MockDb {
  const rand = rng(7);
  let seq = 1000;
  const next = () => ++seq;

  const teacher: Teacher = {
    id: 538,
    name: "نورة العتيبي",
    manager_name: "هند السالم",
    phone: "+966501234567",
    school_id: 2,
    nationality_id: 1,
    gender: "female",
    status: "active",
    img: null,
    is_subscribed: true,
    created_at: apiStamp(dayAt(-60, 10)),
    school: { id: 2, name: "المتوسطة العاشرة بالرياض", region_id: 1, region: { id: 1, name: "منطقة الرياض" } },
    nationality: { id: 1, name: "السعودية" },
  };

  const stages: Named[] = [
    { id: 1, name: "المرحلة الابتدائية" },
    { id: 2, name: "المرحلة المتوسطة" },
    { id: 3, name: "المرحلة الثانوية" },
  ];
  const gradesByStage: Record<number, Named[]> = {
    1: [1, 2, 3, 4, 5, 6].map((n) => ({ id: n, name: `الصف ${["الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"][n - 1]} الابتدائي` })),
    2: [
      { id: 7, name: "الصف الأول المتوسط" },
      { id: 8, name: "الصف الثاني المتوسط" },
      { id: 9, name: "الصف الثالث المتوسط" },
    ],
    3: [
      { id: 10, name: "الصف الأول الثانوي" },
      { id: 11, name: "الصف الثاني الثانوي" },
      { id: 12, name: "الصف الثالث الثانوي" },
    ],
  };
  const gradeName = (id: number) => Object.values(gradesByStage).flat().find((g) => g.id === id)!;

  const categories: MockDb["categories"] = [
    { id: 2, name: "الرياضيات", classroom: gradeName(9), stage: stages[1] },
    { id: 5, name: "العلوم", classroom: gradeName(8), stage: stages[1] },
    { id: 7, name: "المهارات الرقمية", classroom: gradeName(7), stage: stages[1] },
  ];

  const subscriptions = [
    { id: 16, subject_category_id: 2, expiry_date: apiDate(dayAt(42, 0)) },
    { id: 17, subject_category_id: 5, expiry_date: apiDate(dayAt(85, 0)) },
    { id: 18, subject_category_id: 7, expiry_date: apiDate(dayAt(20, 0)) },
  ];

  const subjects: MockSubject[] = [
    { id: 5, name: "رياضيات الصف الثالث المتوسط - الفصل الأول", subject_category_id: 2, img: null },
    { id: 6, name: "رياضيات الصف الثالث المتوسط - الفصل الثاني", subject_category_id: 2, img: null },
    { id: 9, name: "علوم الصف الثاني المتوسط", subject_category_id: 5, img: null },
    { id: 12, name: "المهارات الرقمية للصف الأول المتوسط", subject_category_id: 7, img: null },
  ];

  const groups: MockGroup[] = [
    { id: 29, name: "الثالث المتوسط (أ)", subject_id: 5, subject_category_id: 2, created_at: apiStamp(dayAt(-50, 9)) },
    { id: 30, name: "الثالث المتوسط (ب)", subject_id: 5, subject_category_id: 2, created_at: apiStamp(dayAt(-50, 9)) },
    { id: 31, name: "الثالث المتوسط (ج)", subject_id: 5, subject_category_id: 2, created_at: apiStamp(dayAt(-49, 9)) },
    { id: 40, name: "الثاني المتوسط (أ)", subject_id: 9, subject_category_id: 5, created_at: apiStamp(dayAt(-45, 9)) },
    { id: 41, name: "الثاني المتوسط (ب)", subject_id: 9, subject_category_id: 5, created_at: apiStamp(dayAt(-45, 9)) },
    { id: 50, name: "الأول المتوسط (أ)", subject_id: 12, subject_category_id: 7, created_at: apiStamp(dayAt(-40, 9)) },
  ];

  // Students: each group gets its own girls, plus a pool not yet in any
  // classroom (for "add from the app's database").
  const students: MockStudent[] = [];
  const membership: Record<number, number[]> = {};
  const gradeOfGroup: Record<number, number> = { 29: 9, 30: 9, 31: 9, 40: 8, 41: 8, 50: 7 };
  const sizes: Record<number, number> = { 29: 12, 30: 10, 31: 10, 40: 9, 41: 8, 50: 8 };
  let nameIndex = 0;
  let studentId = 100;
  const makeStudent = (grade: number): MockStudent => {
    const name = STUDENT_NAMES[nameIndex % STUDENT_NAMES.length];
    nameIndex++;
    studentId++;
    return {
      id: studentId,
      name,
      phone: `+9665${String(10000000 + studentId * 7919).slice(-8)}`,
      parent_phone: `+9665${String(20000000 + studentId * 104729).slice(-8)}`,
      identity_number: String(1100000000 + studentId * 37),
      gender: "female",
      base: Math.round(45 + rand() * 50),
      grade_id: grade,
    };
  };
  for (const group of groups) {
    membership[group.id] = [];
    for (let i = 0; i < sizes[group.id]; i++) {
      const s = makeStudent(gradeOfGroup[group.id]);
      students.push(s);
      membership[group.id].push(s.id);
    }
  }
  for (const grade of [9, 9, 9, 9, 8, 8, 7]) students.push(makeStudent(grade));

  // Units & lessons per subject.
  const units: Record<number, Unit[]> = {};
  let unitId = 20;
  let lessonId = 80;
  for (const [subjectId, list] of Object.entries(UNITS_BY_SUBJECT)) {
    units[Number(subjectId)] = list.map((u) => {
      const uid = ++unitId;
      return {
        id: uid,
        name: u.name,
        lessons: u.lessons.map((l) => ({ id: ++lessonId, name: l, unit_id: uid, ...lessonText(l) })),
      };
    });
  }
  units[6] = units[5];

  // Taseese bank: 5 questions per lesson.
  const taseeseBank: MockDb["taseeseBank"] = {};
  for (const unitList of Object.values(units)) {
    for (const unit of unitList) {
      for (const lesson of unit.lessons) {
        taseeseBank[lesson.id] = Array.from({ length: 5 }, (_, i) => {
          const q = QUESTION_BANK[(lesson.id + i) % QUESTION_BANK.length];
          return {
            source: "taseese" as const,
            question_text: q.text,
            question_image: null,
            question_type: "multiple_choice" as const,
            options: q.options.map((content, k) => ({ id: k + 1, type: "text" as const, content })),
            correct_answer: q.correct + 1,
            explanation: null,
            points: "1.00",
            degree: 1,
            difficulty_level: ["easy", "medium", "hard"][i % 3],
            is_rtl: 1,
          };
        });
      }
    }
  }

  // Sessions. Group 29 has the full story: four finished, one running
  // soon today, one tomorrow.
  const sessions: Session[] = [];
  const subjectOf = (groupId: number) => groups.find((g) => g.id === groupId)!.subject_id;
  const addSession = (groupId: number, n: number, when: Date, status: Session["status"], prepared: boolean, lessonIdx: number) => {
    const allLessons = units[subjectOf(groupId)].flatMap((u) => u.lessons.map((l) => ({ ...l, unit: u.name })));
    const lesson = allLessons[lessonIdx % allLessons.length];
    const s: Session = {
      id: next(),
      group_id: groupId,
      name: `حصة ${n}`,
      type: n % 4 === 0 ? "مراجعة" : "درس جديد",
      grouping_method: n % 2 === 0 ? "random" : "kagan",
      is_prepared: prepared ? 1 : 0,
      lesson_objectives: prepared ? lesson.objectives : null,
      educational_outcome: prepared ? lesson.outcomes : null,
      preparation_text: prepared ? lesson.teaching_steps : null,
      duration_minutes: 45,
      status,
      unit_name: lesson.unit,
      lesson_name: lesson.name,
      lesson_id: lesson.id,
      lesson_file: null,
      lesson_video: null,
      starts_at: apiDateTime(when),
      started_at: status === "pending" ? null : apiDateTime(when),
    };
    sessions.push(s);
    return s;
  };
  addSession(29, 1, dayAt(-14, 9, 30), "completed", true, 0);
  addSession(29, 2, dayAt(-10, 9, 30), "completed", true, 1);
  addSession(29, 3, dayAt(-7, 9, 30), "completed", true, 2);
  addSession(29, 4, dayAt(-3, 9, 30), "completed", true, 3);
  addSession(29, 5, minutesFromNow(25), "pending", true, 2);
  addSession(29, 6, dayAt(1, 9, 30), "pending", false, 4);
  addSession(30, 1, dayAt(-9, 11, 0), "completed", true, 0);
  addSession(30, 2, dayAt(-2, 11, 0), "completed", true, 1);
  addSession(30, 3, minutesFromNow(-120), "completed", true, 2);
  addSession(31, 1, dayAt(-8, 12, 30), "completed", true, 0);
  addSession(31, 2, minutesFromNow(150), "pending", false, 1);
  addSession(40, 1, dayAt(-6, 8, 0), "completed", true, 0);
  addSession(40, 2, dayAt(2, 8, 0), "pending", false, 1);
  addSession(41, 1, dayAt(-5, 10, 0), "completed", true, 0);
  addSession(50, 1, dayAt(-4, 13, 0), "completed", true, 0);
  addSession(50, 2, dayAt(3, 13, 0), "pending", false, 1);

  // Questions & mind maps for the prepared sessions of group 29.
  const questions: Question[] = [];
  const mindMaps: MindMap[] = [];
  for (const s of sessions.filter((x) => x.group_id === 29 && x.is_prepared)) {
    const bank = taseeseBank[s.lesson_id!] ?? [];
    bank.slice(0, 3).forEach((q) => questions.push({ ...q, id: next(), class_session_id: s.id, created_at: apiStamp(dayAt(-15, 20)) }));
    const manual = QUESTION_BANK[(s.id + 5) % QUESTION_BANK.length];
    questions.push({
      id: next(),
      class_session_id: s.id,
      source: "manual",
      question_text: manual.text,
      question_image: null,
      question_type: "multiple_choice",
      options: manual.options.map((content, k) => ({ id: k + 1, type: "text", content })),
      correct_answer: manual.correct + 1,
      explanation: "راجعي القيمة المنزلية لكل رقم.",
      points: "2.00",
      degree: 2,
      difficulty_level: "medium",
      is_rtl: 1,
      created_at: apiStamp(dayAt(-15, 21)),
    });
    questions.push({
      id: next(),
      class_session_id: s.id,
      source: "manual",
      question_text: "الكسر 0.70 يساوي الكسر 0.7",
      question_image: null,
      question_type: "true_false",
      options: [
        { id: 1, type: "text", content: "صح" },
        { id: 2, type: "text", content: "خطأ" },
      ],
      correct_answer: 1,
      explanation: null,
      points: "1.00",
      degree: 1,
      difficulty_level: "easy",
      is_rtl: 1,
      created_at: apiStamp(dayAt(-15, 21)),
    });
    mindMaps.push({ id: next(), class_session_id: s.id, file_name: `خريطة ${s.lesson_name}`, file_path: "/mock-files/mind-map.pdf", created_at: apiStamp(dayAt(-15, 22)) });
  }

  // Attendance for every finished session.
  const attendance: MockDb["attendance"] = {};
  for (const s of sessions.filter((x) => x.status === "completed")) {
    attendance[s.id] = {};
    const start = new Date(s.starts_at.replace(" ", "T"));
    for (const id of membership[s.group_id]) {
      const r = rand();
      const late = r > 0.86 && r <= 0.93;
      const present = r <= 0.93;
      attendance[s.id][id] = {
        is_present: present ? 1 : 0,
        is_late: late ? 1 : 0,
        present_at: present ? apiDateTime(new Date(start.getTime() + (late ? 12 : 0) * 60_000)) : null,
      };
    }
  }

  const activityTypes: ActivityType[] = [
    { type: "مشاركة فعّالة", is_positive: true, icon: null },
    { type: "حل الواجب كاملاً", is_positive: true, icon: null },
    { type: "تعاون مع الزميلات", is_positive: true, icon: null },
    { type: "إجابة متميزة", is_positive: true, icon: null },
    { type: "مؤدبة", is_positive: true, icon: null },
    { type: "نظام وترتيب", is_positive: true, icon: null },
    { type: "تأخر عن الحصة", is_positive: false, icon: null },
    { type: "عدم إحضار الكتاب", is_positive: false, icon: null },
    { type: "عدم حل الواجب", is_positive: false, icon: null },
    { type: "حديث جانبي", is_positive: false, icon: null },
  ];
  const activities: MockDb["activities"] = [];
  for (const s of sessions.filter((x) => x.status === "completed")) {
    for (const id of membership[s.group_id]) {
      const r = rand();
      if (r < 0.55) {
        const t = activityTypes[Math.floor(rand() * 6)];
        activities.push({ session_id: s.id, student_id: id, type: t.type, is_positive: true, points: 1 });
      } else if (r > 0.88) {
        const t = activityTypes[6 + Math.floor(rand() * 4)];
        activities.push({ session_id: s.id, student_id: id, type: t.type, is_positive: false, points: 1 });
      }
    }
  }

  // Exams and homework with results.
  const exams: Exam[] = [];
  const examResults: MockDb["examResults"] = {};
  const addExam = (groupId: number, title: string, category: Exam["category"], type: Exam["type"], total: number, deadline: Date, sessionId: number | null, graded: number) => {
    const e: Exam = {
      id: next(),
      group_id: groupId,
      class_session_id: sessionId,
      type,
      category,
      title,
      description: null,
      total_marks: total.toFixed(2),
      passing_marks: (total / 2).toFixed(2),
      deadline: apiDateTime(deadline),
      file_path: type === "file" ? "/mock-files/exam.pdf" : null,
      created_at: apiStamp(new Date(deadline.getTime() - 5 * 86_400_000)),
      web_url: type === "taseese" ? "https://app.taseese.org/exam/demo" : null,
    };
    exams.push(e);
    examResults[e.id] = {};
    for (const id of membership[groupId]) {
      const student = students.find((s) => s.id === id)!;
      if (rand() < graded) {
        const pct = Math.max(0.1, Math.min(1, (student.base + (rand() - 0.5) * 30) / 100));
        examResults[e.id][id] = (Math.round(pct * total * 2) / 2).toFixed(2);
      } else {
        examResults[e.id][id] = null;
      }
    }
    return e;
  };
  const g29 = sessions.filter((s) => s.group_id === 29);
  addExam(29, "اختبار تشخيصي", "exam", "file", 20, dayAt(-20, 23, 59), null, 1);
  addExam(29, "اختبار قصير: الأعداد النسبية", "exam", "taseese", 10, dayAt(-9, 23, 59), null, 0.95);
  addExam(29, "اختبار القوى والأسس", "exam", "taseese", 20, dayAt(-2, 23, 59), null, 0.9);
  addExam(29, "اختبار الوحدة الأولى", "exam", "file", 20, dayAt(4, 23, 59), null, 0.65);
  addExam(29, "واجب الأعداد النسبية", "homework", "taseese", 10, dayAt(-12, 23, 59), g29[0].id, 0.9);
  addExam(29, "واجب مقارنة الأعداد", "homework", "file", 10, dayAt(-8, 23, 59), g29[1].id, 0.85);
  addExam(29, "واجب الكسور العشرية", "homework", "taseese", 10, dayAt(2, 23, 59), g29[2].id, 0.5);
  addExam(30, "اختبار تشخيصي", "exam", "file", 20, dayAt(-18, 23, 59), null, 1);
  addExam(30, "اختبار قصير: الأعداد النسبية", "exam", "taseese", 10, dayAt(-6, 23, 59), null, 0.9);
  addExam(31, "اختبار تشخيصي", "exam", "file", 20, dayAt(-17, 23, 59), null, 0.8);
  addExam(40, "اختبار حالات المادة", "exam", "taseese", 15, dayAt(-3, 23, 59), null, 0.9);
  addExam(50, "اختبار مكونات الحاسب", "exam", "file", 10, dayAt(-2, 23, 59), null, 0.85);

  // Evaluation elements per subject (shared by all its classrooms).
  const elements: MockElement[] = [];
  const degrees: Record<string, number> = {};
  for (const subjectId of [5, 9, 12]) {
    for (const [name, max, phases] of [
      ["المشاركة الصفية", 10, [1, 2]],
      ["الواجبات", 10, [1, 2]],
      ["المشروع", 15, [1]],
      ["الاختبار القصير", 15, [1, 2]],
      ["ملف الأعمال", 10, [2]],
    ] as [string, number, (1 | 2)[]][]) {
      elements.push({ id: next(), subject_id: subjectId, name, max_degree: max, phases });
    }
  }
  for (const group of groups) {
    for (const el of elements.filter((e) => e.subject_id === group.subject_id && e.phases.includes(1))) {
      for (const id of membership[group.id]) {
        if (rand() < 0.7) {
          const base = students.find((s) => s.id === id)!.base;
          degrees[`${group.id}:${id}:${el.id}:1`] = Math.round((base / 100) * el.max_degree);
        }
      }
    }
  }

  // Skills (from Taseese results) for group 29 and 30.
  const skills: MockSkill[] = [];
  const skillNames: [string, string | null][] = [
    ["مقارنة الكسور العشرية وترتيبها", "1. نشاط بخط الأعداد لتمثيل الكسور العشرية.\n2. تمارين مقارنة بالقيمة المنزلية في مجموعات كيجين.\n3. اختبار قصير من بنك تأسيس لقياس التحسن."],
    ["جمع الأعداد النسبية وطرحها", "1. مراجعة توحيد المقامات بنماذج مرئية.\n2. أوراق عمل متدرجة.\n3. تقويم فردي قصير."],
    ["تبسيط العبارات الأسية", "1. بطاقات قوانين الأسس.\n2. لعبة تحدٍ بين المجموعات."],
    ["حل معادلات بخطوة واحدة", null],
    ["تحويل الكسر إلى نسبة مئوية", "1. أمثلة من التخفيضات والأسعار.\n2. تمارين ذهنية سريعة."],
    ["تقدير ناتج الضرب", null],
  ];
  for (const groupId of [29, 30]) {
    skillNames.forEach(([name, plan], i) => {
      const ids = membership[groupId];
      const wrongCount = Math.max(2, Math.round(ids.length * (0.5 - i * 0.06)));
      skills.push({
        id: next(),
        group_id: groupId,
        name,
        remedial_plan: plan,
        status: i === 5 ? "improved" : "missing",
        students: ids.map((sid, k) => ({
          student_id: sid,
          wrong: k < wrongCount ? 2 : 0,
          correct: k < wrongCount ? 1 : 3,
          improved_at: i === 5 && k < wrongCount ? apiStamp(dayAt(-2, 10)) : null,
        })),
      });
    });
  }

  const badges: Badge[] = [
    { id: 1, name: "المتميزة", img: null },
    { id: 2, name: "المبادِرة", img: null },
    { id: 3, name: "المنظّمة", img: null },
    { id: 4, name: "المتعاونة", img: null },
    { id: 5, name: "القارئة", img: null },
    { id: 6, name: "المبدعة", img: null },
  ];
  const patterns: LearningPattern[] = [
    { id: 1, name: "بصري", img: null, description: "تتعلم بالصور والمخططات والألوان." },
    { id: 2, name: "سمعي", img: null, description: "تتعلم بالاستماع والنقاش والشرح الشفهي." },
    { id: 3, name: "حركي", img: null, description: "تتعلم بالتجربة والحركة والأنشطة العملية." },
    { id: 4, name: "قرائي/كتابي", img: null, description: "تتعلم بالقراءة والكتابة والتلخيص." },
  ];
  const studentBadges: Record<number, number[]> = {};
  const studentPatterns: Record<number, number[]> = {};
  for (const s of students) {
    studentBadges[s.id] = badges.filter(() => rand() < 0.25).map((b) => b.id);
    studentPatterns[s.id] = rand() < 0.8 ? [patterns[Math.floor(rand() * 4)].id] : [];
  }

  const notifications: AppNotification[] = [
    ["تم تجديد اشتراكك بنجاح", "تم تفعيل باقة الرياضيات للمرحلة المتوسطة. يمكنك الآن إضافة فصول جديدة وإنشاء اختبارات من بنك تأسيس.", 0, true],
    ["تحديث جديد في بنك أسئلة تأسيس", "أُضيفت أسئلة جديدة لوحدة الكسور العشرية، متاحة الآن عند الاستيراد في تحضير الحصة.", 1, true],
    ["تذكير: بداية الأسبوع القادم", "يبدأ أسبوع دراسي جديد يوم الأحد. راجعي خطة حصصك القادمة.", 2, true],
    ["رد جديد على تذكرتك", "تم الرد على تذكرة الدعم بخصوص تصدير ملف الإنجاز.", 4, false],
    ["كوبون خصم متاح", "لديك كوبون خصم جديد صالح حتى نهاية الشهر، استخدميه عند إتمام الدفع.", 6, false],
    ["سلة مشترياتك بانتظارك", "لديك تخصصات في السلة، أكملي الدفع لتفعيلها.", 8, false],
    ["اكتمل تصحيح الاختبار", "اكتمل تصحيح اختبار القوى والأسس في الثالث المتوسط (أ).", 10, false],
    ["نصيحة: ملف الإنجاز", "أضيفي تقارير فصولك كشواهد مباشرة من صفحة التقارير.", 12, false],
    ["مرحباً بك في حصتي", "ابدئي بإضافة فصولك وطلابك، ثم حضّري أول حصة.", 30, false],
  ].map(([title, body, daysAgo, unread], i) => ({
    id: 300 - i,
    title: title as string,
    body: body as string,
    image: null,
    created_at: apiStamp(dayAt(-(daysAgo as number), 9 + i)),
    read_at: unread ? null : apiStamp(dayAt(-(daysAgo as number), 12)),
  }));

  const transactions: TransactionDetails[] = [
    { months: 6, items: [["الرياضيات", "229.00", 6]], daysAgo: 3, gateway: "moyasar", coupon: null },
    { months: 3, items: [["العلوم", "119.00", 3]], daysAgo: 40, gateway: "tamara", coupon: "BACK2SCHOOL" },
    { months: 1, items: [["المهارات الرقمية", "39.00", 1]], daysAgo: 70, gateway: "moyasar", coupon: null },
  ].map((t, i) => {
    const amount = t.items.reduce((sum, [, price]) => sum + Number(price), 0);
    const discount = t.coupon ? amount * 0.1 : 0;
    const before = amount - discount;
    const tax = before * 0.15;
    return {
      id: 20 - i,
      transaction_id: `ec2bcb17-b55a-48ad-973${i}-a1c0d9e2f${i}`,
      gateway: t.gateway,
      coupon: t.coupon,
      coupon_discount: discount.toFixed(2),
      amount: before.toFixed(2),
      tax_rate: 15,
      tax_value: tax.toFixed(2),
      total_amount_with_tax: (before + tax).toFixed(2),
      teacher_name: teacher.name,
      teacher_phone: teacher.phone,
      created_at: apiStamp(dayAt(-t.daysAgo, 16)),
      discount_percentage: t.coupon ? "10%" : "0%",
      items: t.items.map(([name, price, months], k) => ({ id: k + 1, item_name: name as string, item_price: price as string, months: months as number })),
    };
  });

  const coupons: Coupon[] = [
    { id: 5, code: "TEACH10", name: "خصم المعلمين", type: "percentage", value: "10.00", starts_at: apiDate(dayAt(-5, 0)), expires_at: apiDate(dayAt(20, 0)) },
    { id: 6, code: "HESSATI25", name: "خصم حصتي", type: "fixed", value: "25.00", starts_at: apiDate(dayAt(-1, 0)), expires_at: apiDate(dayAt(9, 0)) },
  ];
  const usedCoupons: UsedCoupon[] = [
    { id: 3, coupon_id: 9, code: "BACK2SCHOOL", name: "خصم بداية العام", discount_amount: "11.90", used_at: apiStamp(dayAt(-40, 16)) },
  ];

  const tickets: Ticket[] = [
    { id: 3, ticket_number: "TKT-6AAFD1D24749F", category: "ملف الإنجاز", subject: "تصدير ملف الإنجاز لا يشمل كل المجلدات", message: "عند تصدير ملف الإنجاز تظهر بعض المجلدات فقط.", priority: "medium", status: "in_progress", created_at: apiStamp(dayAt(-4, 11)) },
    { id: 2, ticket_number: "TKT-6AAFD1C4BFEE3", category: "الاشتراكات", subject: "استفسار عن تجديد الاشتراك", message: "هل يتجدد الاشتراك تلقائياً؟", priority: "low", status: "closed", created_at: apiStamp(dayAt(-20, 10)) },
  ];
  const replies: Record<number, TicketReply[]> = {
    3: [
      { id: 1, sender_type: "teacher", message: "عند تصدير ملف الإنجاز تظهر بعض المجلدات فقط.", attachment: null, created_at: apiStamp(dayAt(-4, 11)) },
      { id: 2, sender_type: "admin", message: "شكراً لتواصلك، نعمل على المشكلة وسنبلغك فور حلها.", attachment: null, created_at: apiStamp(dayAt(-3, 9)) },
    ],
    2: [
      { id: 3, sender_type: "teacher", message: "هل يتجدد الاشتراك تلقائياً؟", attachment: null, created_at: apiStamp(dayAt(-20, 10)) },
      { id: 4, sender_type: "admin", message: "لا، يمكنك التجديد يدوياً من صفحة الاشتراكات قبل انتهاء المدة.", attachment: null, created_at: apiStamp(dayAt(-19, 13)) },
    ],
  };

  const faqCategories: FaqCategory[] = [
    { id: 1, name: "الحساب", faqs_count: 2 },
    { id: 2, name: "الاشتراكات", faqs_count: 2 },
    { id: 3, name: "الحصص", faqs_count: 2 },
    { id: 4, name: "ملف الإنجاز", faqs_count: 1 },
  ];
  const faqs: Faq[] = [
    { id: 1, faq_category_id: 1, question: "كيف أغيّر رقم جوالي؟", answer: "من الملف الشخصي، عدّلي رقم الجوال وأكّديه برمز التحقق." },
    { id: 2, faq_category_id: 1, question: "نسيت كلمة المرور، ماذا أفعل؟", answer: "من صفحة تسجيل الدخول اختاري \"نسيت كلمة المرور\" وسنرسل لك كلمة مرور جديدة." },
    { id: 3, faq_category_id: 2, question: "هل يتجدد الاشتراك تلقائياً؟", answer: "لا، يمكنك التجديد من صفحة الاشتراكات في أي وقت." },
    { id: 4, faq_category_id: 2, question: "ما طرق الدفع المتاحة؟", answer: "مدى وفيزا وماستركارد وApple Pay، والتقسيط عبر تمارا." },
    { id: 5, faq_category_id: 3, question: "متى يمكنني تسجيل الحضور؟", answer: "بعد بدء الحصة أو عند تشغيلها من صفحة الحصة." },
    { id: 6, faq_category_id: 3, question: "كيف أستورد أسئلة من تأسيس؟", answer: "من تحضير الحصة، تبويب الأسئلة، اختاري \"استيراد من تأسيس\"." },
    { id: 7, faq_category_id: 4, question: "هل يُحفظ ملف الإنجاز على السحابة؟", answer: "نعم، ويمكنك استعادته على أي جهاز بعد تسجيل الدخول." },
  ];

  const pages: Record<string, ContentPage> = {
    "terms-and-conditions": {
      title: "الشروط والأحكام",
      content:
        "مرحباً بك في حصتي. باستخدامك للمنصة فإنك توافق على هذه الشروط.\n\n1. الحساب: أنت مسؤول عن سرية بيانات دخولك وعن كل ما يتم من خلال حسابك.\n\n2. الاشتراكات: يُفعَّل الاشتراك بعد إتمام الدفع، ويستمر للمدة المختارة.\n\n3. المحتوى: تبقى بيانات طلابك ومحتوى تحضيرك ملكاً لك، ونستخدمها فقط لتقديم الخدمة.\n\n4. الاستخدام المقبول: يُمنع استخدام المنصة لأي غرض مخالف للأنظمة.\n\n[النص النهائي يُرسَل من لوحة التحكم]",
    },
    "privacy-policy": {
      title: "سياسة الخصوصية",
      content:
        "نحترم خصوصيتك وخصوصية طلابك.\n\n1. البيانات التي نجمعها: بيانات حسابك، وبيانات الفصول والطلاب التي تضيفها.\n\n2. استخدام البيانات: لتقديم الخدمة وتحسينها فقط، ولا نبيع بياناتك.\n\n3. ملفات تعريف الارتباط: نستخدمها لتحليل الزيارات بعد موافقتك.\n\n4. حقوقك: يمكنك حذف حسابك وبياناتك في أي وقت من الإعدادات.\n\n[النص النهائي يُرسَل من لوحة التحكم]",
    },
    "about-us": { title: "من نحن", content: "حصتي منصة للمعلمين تجمع التحضير والتدريس والتقييم وملف الإنجاز في مكان واحد." },
  };

  const social: SocialMedia = {
    name: "حصتي",
    email: "support@example.com",
    whatsapp: "+966500000000",
    twitter: "https://x.com/",
    instagram: "https://instagram.com/",
    snapchat: "https://snapchat.com/",
    tiktok: null,
    youtube: null,
    linkedIn: null,
  };

  // Catalog: every middle-school grade sells the same three specialties.
  const catalog: Record<number, CatalogCategory[]> = {};
  const catalogNames = [
    [2, "الرياضيات"],
    [5, "العلوم"],
    [7, "المهارات الرقمية"],
    [11, "لغتي الخالدة"],
    [12, "اللغة الإنجليزية"],
    [13, "الدراسات الاجتماعية"],
  ] as const;
  for (const grade of Object.values(gradesByStage).flat()) {
    catalog[grade.id] = catalogNames.map(([id, name]) => ({
      id: id + grade.id * 100,
      name,
      img: null,
      plans: [
        { subject_category_id: id + grade.id * 100, months: 1, price: "39.00", name: "الخطة الشهرية" },
        { subject_category_id: id + grade.id * 100, months: 3, price: "119.00", name: "خطة الفصل" },
        { subject_category_id: id + grade.id * 100, months: 6, price: "229.00", name: "خطة الفصلين" },
      ],
    }));
  }
  // The teacher's own specialties keep their real ids in the catalog.
  catalog[9][0].id = 2;
  catalog[9][0].plans.forEach((p) => (p.subject_category_id = 2));
  catalog[8][1].id = 5;
  catalog[8][1].plans.forEach((p) => (p.subject_category_id = 5));
  catalog[7][2].id = 7;
  catalog[7][2].plans.forEach((p) => (p.subject_category_id = 7));

  const regions: Named[] = [
    { id: 1, name: "منطقة الرياض" },
    { id: 2, name: "منطقة مكة المكرمة" },
    { id: 3, name: "المنطقة الشرقية" },
  ];

  return {
    token: null,
    password: "123456",
    teacher,
    categories,
    subscriptions,
    subjects,
    groups,
    students,
    membership,
    sessions,
    units,
    questions,
    taseeseBank,
    mindMaps,
    attendance,
    activities,
    activityTypes,
    exams,
    examResults,
    elements,
    degrees,
    skills,
    badges,
    patterns,
    studentBadges,
    studentPatterns,
    notifications,
    transactions,
    coupons,
    usedCoupons,
    tickets,
    replies,
    faqCategories,
    faqs,
    pages,
    social,
    stages,
    gradesByStage,
    catalog,
    cart: { items: [{ subject_category_id: 11 + 900, months: 3 }], coupon: null },
    portfolio: null,
    calendar: {
      hijri_year: 1448,
      terms: [
        { start: apiDate(dayAt(-120, 0)), end: apiDate(dayAt(-60, 0)), weeks: 9 },
        { start: apiDate(dayAt(-49, 0)), end: apiDate(dayAt(77, 0)), weeks: 18 },
        { start: apiDate(dayAt(90, 0)), end: apiDate(dayAt(170, 0)), weeks: 12 },
      ],
      events: {
        term_1: [{ id: 1, title: "بداية العام الدراسي", date: apiDate(dayAt(-120, 0)), week_label: "الأول", type_name: "بداية دراسة", type_bg_color: "#E0F2FE", type_text_color: "#075985" }],
        term_2: [
          { id: 2, title: "اليوم الوطني", date: apiDate(dayAt(-28, 0)), week_label: "الثالث", type_name: "إجازة رسمية", type_bg_color: "#DCFCE7", type_text_color: "#14532D" },
          { id: 3, title: "اختبارات منتصف الفصل", date: apiDate(dayAt(9, 0)), week_label: "الثامن", type_name: "اختبارات", type_bg_color: "#FEF3C7", type_text_color: "#78350F" },
          { id: 4, title: "إجازة نهاية الأسبوع المطولة", date: apiDate(dayAt(30, 0)), week_label: "الحادي عشر", type_name: "إجازة", type_bg_color: "#DCFCE7", type_text_color: "#14532D" },
        ],
        term_3: [],
      },
    },
    regions,
    nationalities: [
      { id: 1, name: "السعودية" },
      { id: 8, name: "مصر" },
      { id: 9, name: "الأردن" },
    ],
    cities: { 1: [{ id: 1, name: "الرياض" }, { id: 2, name: "الخرج" }], 2: [{ id: 3, name: "جدة" }, { id: 4, name: "مكة المكرمة" }], 3: [{ id: 5, name: "الدمام" }, { id: 6, name: "الخبر" }] },
    districts: { 1: [{ id: 1, name: "حي العليا" }, { id: 2, name: "حي النرجس" }], 2: [{ id: 3, name: "حي الخالدية" }], 3: [{ id: 4, name: "حي الروضة" }], 4: [{ id: 5, name: "حي العزيزية" }], 5: [{ id: 6, name: "حي الفيصلية" }], 6: [{ id: 7, name: "حي الراكة" }] },
    schools: { 1: [{ id: 2, name: "المتوسطة العاشرة بالرياض" }, { id: 3, name: "المتوسطة الرابعة والعشرون" }], 2: [{ id: 4, name: "المتوسطة الثلاثون" }], 3: [{ id: 5, name: "متوسطة الخالدية" }], 4: [{ id: 6, name: "المتوسطة الأولى بمكة" }], 5: [{ id: 7, name: "متوسطة العزيزية" }], 6: [{ id: 8, name: "متوسطة الفيصلية" }], 7: [{ id: 9, name: "متوسطة الراكة" }] },
    seq,
  };
}

const globalForDb = globalThis as unknown as { __ttMockDb?: MockDb };

export function db(): MockDb {
  globalForDb.__ttMockDb ??= seed();
  return globalForDb.__ttMockDb;
}

export function nextId(): number {
  return ++db().seq;
}
