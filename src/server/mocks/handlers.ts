import "server-only";
import { Endpoints as E } from "@/lib/api/endpoints";
import type {
  AttendanceStudent,
  Exam,
  GroupStatistics,
  Question,
  RankedStudent,
  Session,
  StudentEvaluation,
} from "@/lib/api/types";
import { apiDate, apiDateTime, apiStamp, db, nextId, type MockDb, type MockStudent } from "./db";

// The dummy backend. One handler per endpoint, returning the envelope's
// `data`. Throw MockError for a failure the way the real API answers.

export class MockError extends Error {
  constructor(
    message: string,
    readonly status = 422,
    readonly errors: Record<string, string[]> | null = null,
  ) {
    super(message);
  }
}

export type MockBody = Record<string, unknown>;
type Handler = (body: MockBody, ctx: { files: Record<string, File> }) => unknown;

// ---------- input helpers ----------

const num = (v: unknown): number => {
  const n = Number(v);
  if (!Number.isFinite(n)) throw new MockError("قيمة غير صالحة");
  return n;
};
const str = (v: unknown): string => (v === undefined || v === null ? "" : String(v));
const ids = (v: unknown): number[] => (Array.isArray(v) ? v.map(num) : v === undefined || v === "" ? [] : String(v).split(",").map(num));
const bool = (v: unknown): boolean => v === true || v === 1 || v === "1" || v === "true";
const required = (body: MockBody, ...keys: string[]) => {
  const missing = keys.filter((k) => body[k] === undefined || body[k] === null || body[k] === "");
  if (missing.length) {
    throw new MockError(`حقل ${missing[0]} مطلوب.`, 422, Object.fromEntries(missing.map((k) => [k, [`حقل ${k} مطلوب.`]])));
  }
};

const paginate = <T>(list: T[], page: number, perPage = 10) => {
  const last = Math.max(1, Math.ceil(list.length / perPage));
  const current = Math.min(Math.max(1, page || 1), last);
  return {
    items: list.slice((current - 1) * perPage, current * perPage),
    paginate: {
      current_page: current,
      last_page: last,
      per_page: perPage,
      total: list.length,
      next_page_url: current < last ? `?page=${current + 1}` : null,
    },
  };
};

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const round1 = (n: number) => Math.round(n * 10) / 10;

// ---------- lookups ----------

const group = (d: MockDb, id: number) => {
  const g = d.groups.find((x) => x.id === id);
  if (!g) throw new MockError("الفصل غير موجود", 404);
  return g;
};
const session = (d: MockDb, id: number) => {
  const s = d.sessions.find((x) => x.id === id);
  if (!s) throw new MockError("الحصة غير موجودة", 404);
  return s;
};
const student = (d: MockDb, id: number) => {
  const s = d.students.find((x) => x.id === id);
  if (!s) throw new MockError("الطالب غير موجود", 404);
  return s;
};
const groupStudents = (d: MockDb, groupId: number) => (d.membership[groupId] ?? []).map((id) => student(d, id));

// ---------- derived numbers ----------

function examPercents(d: MockDb, groupId: number, studentId: number, category: Exam["category"]): number[] {
  return d.exams
    .filter((e) => e.group_id === groupId && e.category === category)
    .map((e) => ({ e, m: d.examResults[e.id]?.[studentId] }))
    .filter(({ m }) => m !== null && m !== undefined)
    .map(({ e, m }) => (Number(m) / Number(e.total_marks)) * 100);
}

function attendanceRate(d: MockDb, groupId: number, studentId: number): number {
  const records = d.sessions
    .filter((s) => s.group_id === groupId && d.attendance[s.id]?.[studentId])
    .map((s) => d.attendance[s.id][studentId]);
  return records.length ? (records.filter((r) => r.is_present).length / records.length) * 100 : 100;
}

function performance(d: MockDb, groupId: number, st: MockStudent): number {
  const exams = examPercents(d, groupId, st.id, "exam");
  const hw = examPercents(d, groupId, st.id, "homework");
  const parts = [st.base, exams.length ? avg(exams) : st.base, hw.length ? avg(hw) : st.base, attendanceRate(d, groupId, st.id)];
  return round1(avg(parts));
}

function groupStatistics(d: MockDb, groupId: number): GroupStatistics {
  const g = group(d, groupId);
  const members = groupStudents(d, groupId);
  const sessions = d.sessions.filter((s) => s.group_id === groupId);
  const records = sessions.flatMap((s) => Object.entries(d.attendance[s.id] ?? {}).filter(([id]) => d.membership[groupId].includes(Number(id))).map(([, r]) => r));
  const present = records.filter((r) => r.is_present).length;
  const late = records.filter((r) => r.is_late).length;
  const exams = d.exams.filter((e) => e.group_id === groupId && e.category === "exam");
  const examMarks = exams.flatMap((e) =>
    members.map((m) => d.examResults[e.id]?.[m.id]).filter((m): m is string => m !== null && m !== undefined).map((m) => (Number(m) / Number(e.total_marks)) * 100),
  );
  const homeworks = d.exams.filter((e) => e.group_id === groupId && e.category === "homework");
  const hwPossible = homeworks.length * members.length;
  const hwSubmitted = homeworks.reduce((sum, e) => sum + members.filter((m) => d.examResults[e.id]?.[m.id] != null).length, 0);
  const acts = d.activities.filter((a) => sessions.some((s) => s.id === a.session_id));
  const positives = acts.filter((a) => a.is_positive);
  const negatives = acts.filter((a) => !a.is_positive);
  const perf = members.map((m) => performance(d, groupId, m));
  const patternCounts = d.patterns.map((p) => ({
    id: p.id,
    name: p.name,
    count: members.filter((m) => d.studentPatterns[m.id]?.includes(p.id)).length,
  }));
  const withPattern = members.filter((m) => (d.studentPatterns[m.id] ?? []).length > 0).length;
  return {
    group: { id: g.id, name: g.name, total_students: members.length, total_sessions: sessions.length },
    homework_statistics: {
      total_homeworks: homeworks.length,
      submitted_count: hwSubmitted,
      not_submitted_count: hwPossible - hwSubmitted,
      submission_rate: hwPossible ? round1((hwSubmitted / hwPossible) * 100) : 0,
    },
    exam_statistics: {
      total_exams: exams.length,
      average_performance: round1(avg(examMarks)),
      passed_count: examMarks.filter((m) => m >= 50).length,
      failed_count: examMarks.filter((m) => m < 50).length,
      pass_rate: examMarks.length ? round1((examMarks.filter((m) => m >= 50).length / examMarks.length) * 100) : 0,
      highest_score: Math.round(Math.max(0, ...examMarks)),
      lowest_score: examMarks.length ? Math.round(Math.min(...examMarks)) : 0,
    },
    attendance_statistics: {
      total_records: records.length,
      present_count: present,
      absent_count: records.length - present,
      late_count: late,
      attendance_rate: records.length ? round1((present / records.length) * 100) : 0,
    },
    activity_statistics: {
      total_activities: acts.length,
      positive_points: positives.length,
      negative_points: negatives.length,
      net_points: positives.length - negatives.length,
      positive_count: positives.length,
      negative_count: negatives.length,
    },
    overall_performance: {
      average_performance: round1(avg(perf)),
      highest_performance: round1(Math.max(0, ...perf)),
      lowest_performance: perf.length ? round1(Math.min(...perf)) : 0,
      students_above_80: perf.filter((p) => p >= 80).length,
      students_below_60: perf.filter((p) => p < 60).length,
    },
    students_learning_patterns: {
      total_students_count: withPattern,
      patterns: patternCounts.map((p) => ({ ...p, percentage: withPattern ? round1((p.count / withPattern) * 100) : 0 })),
    },
  };
}

function sessionWithStats(d: MockDb, s: Session): Session {
  const records = Object.values(d.attendance[s.id] ?? {});
  return {
    ...s,
    attendance_statistics: {
      total: d.membership[s.group_id]?.length ?? 0,
      present: records.filter((r) => r.is_present).length,
      late: records.filter((r) => r.is_late).length,
      attendance: records.length ? 1 : 0,
    },
  };
}

function subscriptionOf(d: MockDb, sub: MockDb["subscriptions"][number]) {
  const category = d.categories.find((c) => c.id === sub.subject_category_id);
  const expiry = new Date(`${sub.expiry_date}T23:59:59`);
  const remaining = Math.max(0, Math.ceil((expiry.getTime() - Date.now()) / 86_400_000));
  const groups = d.groups.filter((g) => g.subject_category_id === sub.subject_category_id);
  return {
    id: sub.id,
    subject_category_id: sub.subject_category_id,
    expiry_date: sub.expiry_date,
    is_valid: remaining > 0,
    remaining_days: remaining,
    groups_count: groups.length,
    students_count: groups.reduce((n, g) => n + (d.membership[g.id]?.length ?? 0), 0),
    subject_category: category ?? { id: sub.subject_category_id, name: "" },
  };
}

function cartView(d: MockDb) {
  const all = Object.values(d.catalog).flat();
  const items = d.cart.items.map((item, i) => {
    const cat = all.find((c) => c.id === item.subject_category_id) ?? d.categories.find((c) => c.id === item.subject_category_id);
    const plan = all.flatMap((c) => c.plans).find((p) => p.subject_category_id === item.subject_category_id && p.months === item.months);
    return { id: i + 1, subject_category_id: item.subject_category_id, item_name: cat?.name ?? "", item_price: plan?.price ?? "0.00", months: item.months };
  });
  const price = items.reduce((s, i) => s + Number(i.item_price), 0);
  const coupon = d.cart.coupon;
  const discount = coupon ? (coupon.type === "percentage" ? (price * Number(coupon.value)) / 100 : Math.min(price, Number(coupon.value))) : 0;
  const before = price - discount;
  const tax = Math.round(before * 15) / 100;
  return {
    cart: items.length
      ? {
          id: 3,
          coupon_code: coupon?.code ?? null,
          coupon_name: coupon?.name ?? null,
          price,
          discount_amount: Math.round(discount * 100) / 100,
          amount_before_tax: Math.round(before * 100) / 100,
          tax_rate: 15,
          tax_value: tax,
          total_price: Math.round((before + tax) * 100) / 100,
          discount_percentage: coupon?.type === "percentage" ? `${Math.round(Number(coupon.value))}%` : "0%",
          items,
        }
      : null,
    available_coupons: d.coupons,
  };
}

function ranked(d: MockDb, groupId: number, type: string): RankedStudent[] {
  const members = groupStudents(d, groupId);
  const sessions = d.sessions.filter((s) => s.group_id === groupId);
  const rows = members.map((m) => {
    if (type === "activity") {
      const acts = d.activities.filter((a) => a.student_id === m.id && sessions.some((s) => s.id === a.session_id));
      const pos = acts.filter((a) => a.is_positive).length;
      const neg = acts.length - pos;
      return { id: m.id, name: m.name, total_activities: acts.length, positive_points: pos, negative_points: neg, net_points: pos - neg, sort: pos - neg };
    }
    if (type === "homework") {
      const hw = examPercents(d, groupId, m.id, "homework");
      const total = d.exams.filter((e) => e.group_id === groupId && e.category === "homework").length;
      return { id: m.id, name: m.name, phone: m.phone, average_performance: round1(avg(hw)), passed_count: hw.filter((x) => x >= 50).length, failed_count: total - hw.filter((x) => x >= 50).length, sort: avg(hw) };
    }
    if (type === "attendance") {
      const rate = attendanceRate(d, groupId, m.id);
      const present = sessions.filter((s) => d.attendance[s.id]?.[m.id]?.is_present).length;
      const total = sessions.filter((s) => d.attendance[s.id]?.[m.id]).length;
      return { id: m.id, name: m.name, phone: m.phone, attendance_rate: round1(rate), present_count: present, total_sessions: total, sort: rate };
    }
    const p = performance(d, groupId, m);
    return { id: m.id, name: m.name, phone: m.phone, performance_rate: p, sort: p };
  });
  return rows
    .sort((a, b) => b.sort - a.sort)
    .map(({ sort, ...row }, i) => {
      void sort;
      return { rank: i + 1, ...row } as RankedStudent;
    });
}

function studentEvaluation(d: MockDb, groupId: number, studentId: number): StudentEvaluation {
  const g = group(d, groupId);
  const phase = (p: 1 | 2) =>
    d.elements
      .filter((e) => e.subject_id === g.subject_id && e.phases.includes(p))
      .map((e) => ({ id: e.id, subject_id: e.subject_id, name: e.name, max_degree: e.max_degree, degree: d.degrees[`${groupId}:${studentId}:${e.id}:${p}`] ?? null }));
  return { group_id: groupId, phase_1: phase(1), phase_2: phase(2) };
}

const elementsByPhase = (d: MockDb, subjectId: number) => {
  const pick = (p: 1 | 2) =>
    d.elements.filter((e) => e.subject_id === subjectId && e.phases.includes(p)).map((e) => ({ id: e.id, subject_id: e.subject_id, name: e.name, max_degree: e.max_degree }));
  return { phase_1: pick(1), phase_2: pick(2) };
};

function parseQuestion(body: MockBody, sessionId: number, existing?: Question): Question {
  const type = str(body.question_type) === "true_false" ? "true_false" : "multiple_choice";
  const raw = Array.isArray(body.options) ? body.options : [];
  const options =
    type === "true_false"
      ? [
          { id: 1, type: "text" as const, content: "صح" },
          { id: 2, type: "text" as const, content: "خطأ" },
        ]
      : raw.map((o, i) => ({ id: i + 1, type: "text" as const, content: str((o as MockBody).content ?? o) }));
  if (!str(body.question_text).trim()) throw new MockError("نص السؤال مطلوب");
  if (options.length < 2) throw new MockError("أضف خيارين على الأقل");
  return {
    id: existing?.id ?? nextId(),
    class_session_id: sessionId,
    source: existing?.source ?? "manual",
    question_text: str(body.question_text),
    question_image: existing?.question_image ?? null,
    question_type: type,
    options,
    correct_answer: num(body.correct_answer),
    explanation: str(body.explanation) || null,
    points: Number(body.points ?? 1).toFixed(2),
    degree: body.degree !== undefined && body.degree !== "" ? num(body.degree) : null,
    difficulty_level: existing?.difficulty_level ?? null,
    is_rtl: 1,
    created_at: existing?.created_at ?? apiStamp(new Date()),
  };
}

// ---------- handlers ----------

const handlers: Record<string, Handler> = {
  // Locations
  [E.nationalitiesAndRegions]: () => ({ nationalities: db().nationalities, regions: db().regions }),
  [E.cities]: (b) => db().cities[num(b.region_id)] ?? [],
  [E.districts]: (b) => db().districts[num(b.city_id)] ?? [],
  [E.schools]: (b) => db().schools[num(b.district_id)] ?? [],

  // Auth
  [E.login]: (b) => {
    required(b, "phone", "password");
    if (str(b.password).length < 6) throw new MockError("رقم الجوال أو كلمة المرور غير صحيحة", 401);
    const d = db();
    d.token = `mock-${Date.now()}`;
    return { token: d.token, teacher: { ...d.teacher, phone: str(b.phone) || d.teacher.phone } };
  },
  [E.logout]: () => {
    db().token = null;
    return null;
  },
  [E.sendTeacherOtp]: (b) => {
    required(b, "phone");
    return { attempts: 1 };
  },
  [E.verifyTeacherOtp]: (b) => {
    required(b, "phone", "code");
    if (str(b.code) !== "1234") throw new MockError("رمز التحقق غير صحيح");
    return null;
  },
  [E.registerTeacher]: (b) => {
    required(b, "name", "phone", "password", "gender", "nationality_id");
    const d = db();
    d.token = `mock-${Date.now()}`;
    d.teacher = { ...d.teacher, name: str(b.name), phone: str(b.phone), gender: str(b.gender) === "male" ? "male" : "female" };
    return { token: d.token, teacher: d.teacher };
  },
  [E.forgotPassword]: (b) => {
    required(b, "phone");
    return null;
  },
  [E.getTeacherProfile]: () => db().teacher,
  [E.updateTeacherProfile]: (b) => {
    const d = db();
    if (b.name !== undefined) d.teacher.name = str(b.name);
    if (b.manager_name !== undefined) d.teacher.manager_name = str(b.manager_name) || null;
    return d.teacher;
  },
  [E.changeTeacherPassword]: (b) => {
    required(b, "current_password", "new_password");
    const d = db();
    if (str(b.current_password) !== d.password && str(b.current_password).length < 6) throw new MockError("كلمة المرور الحالية غير صحيحة");
    d.password = str(b.new_password);
    return null;
  },
  [E.deleteTeacherAccount]: (b) => {
    required(b, "password");
    return null;
  },

  // Home
  [E.home]: () => {
    const d = db();
    const today = apiDate(new Date());
    const todaySessions = d.sessions
      .filter((s) => s.starts_at.startsWith(today))
      .sort((a, b) => a.starts_at.localeCompare(b.starts_at))
      .map((s) => {
        const g = group(d, s.group_id);
        const cat = d.categories.find((c) => c.id === g.subject_category_id)!;
        return {
          id: s.id,
          name: s.name,
          group_id: s.group_id,
          starts_at: s.starts_at,
          is_prepared: s.is_prepared,
          status: s.status,
          lesson_name: s.lesson_name,
          group: { id: g.id, name: g.name, subject_category_id: g.subject_category_id, subject_category: { id: cat.id, name: cat.name } },
        };
      });
    const term = d.calendar.terms[1];
    const start = new Date(`${term.start}T00:00:00`).getTime();
    const end = new Date(`${term.end}T00:00:00`).getTime();
    const progress = Math.max(0, Math.min(100, ((Date.now() - start) / (end - start)) * 100));
    return {
      subscriptions: d.subscriptions.map((s) => subscriptionOf(d, s)),
      today_sessions: todaySessions,
      banners: [],
      unread_notifications_count: d.notifications.filter((n) => !n.read_at).length,
      academic_calendar: {
        hijri_year: d.calendar.hijri_year,
        term: "ثاني",
        term_label: "الفصل الدراسي الثاني",
        progress_percentage: round1(progress),
        current_week: Math.max(1, Math.ceil(((Date.now() - start) / (end - start)) * term.weeks)),
        total_weeks: term.weeks,
      },
    };
  },
  [E.academicCalendar]: () => {
    const d = db();
    const cards: Record<string, unknown> = {};
    d.calendar.terms.forEach((t, i) => {
      const start = new Date(`${t.start}T00:00:00`).getTime();
      const end = new Date(`${t.end}T00:00:00`).getTime();
      const now = Date.now();
      const progress = Math.max(0, Math.min(100, ((now - start) / (end - start)) * 100));
      const current = now >= start && now <= end;
      cards[`term_${i + 1}`] = {
        start_date: t.start,
        end_date: t.end,
        progress_percentage: round1(progress),
        current_week: current ? Math.max(1, Math.ceil((progress / 100) * t.weeks)) : null,
        total_weeks: t.weeks,
        is_current: current,
      };
    });
    return { hijri_year: d.calendar.hijri_year, cards, upcoming_event: null, events: d.calendar.events };
  },

  // Subscriptions & catalog
  [E.mySubscriptions]: () => {
    const d = db();
    const subs = d.subscriptions.map((s) => {
      const base = subscriptionOf(d, s);
      const cat = d.categories.find((c) => c.id === s.subject_category_id)!;
      return { ...base, subject_category: { id: cat.id, name: cat.name, img: null, classroom: cat.classroom, stage: cat.stage } };
    });
    return { subscriptions: subs, paginate: { current_page: 1, last_page: 1, per_page: 100, total: subs.length, next_page_url: null } };
  },
  [E.cartStages]: () => db().stages,
  [E.cartClassrooms]: (b) => db().gradesByStage[num(b.stage_id)] ?? [],
  [E.cartCategories]: (b) => db().catalog[num(b.classroom_id)] ?? [],
  [E.cartView]: () => cartView(db()),
  [E.cartAddItem]: (b) => {
    required(b, "subject_category_id", "months");
    const d = db();
    const id = num(b.subject_category_id);
    d.cart.items = d.cart.items.filter((i) => i.subject_category_id !== id);
    d.cart.items.push({ subject_category_id: id, months: num(b.months) });
    return cartView(d);
  },
  [E.cartRemoveItem]: (b) => {
    const d = db();
    d.cart.items = d.cart.items.filter((i) => i.subject_category_id !== num(b.subject_category_id));
    if (!d.cart.items.length) d.cart.coupon = null;
    return cartView(d);
  },
  [E.cartClear]: () => {
    const d = db();
    d.cart = { items: [], coupon: null };
    return cartView(d);
  },
  [E.cartApplyOrRemoveCoupon]: (b) => {
    const d = db();
    const code = str(b.coupon_code).trim().toUpperCase();
    if (!code) {
      d.cart.coupon = null;
      return cartView(d);
    }
    const coupon = d.coupons.find((c) => c.code === code);
    if (!coupon) throw new MockError("كود الخصم غير صالح");
    d.cart.coupon = coupon;
    return cartView(d);
  },
  [E.cartPay]: (b) => {
    required(b, "gateway");
    const d = db();
    const view = cartView(d);
    if (!view.cart) throw new MockError("السلة فارغة");
    // Mock: the payment "succeeds" at once, so the result page can show it.
    const all = Object.values(d.catalog).flat();
    for (const item of d.cart.items) {
      const cat = all.find((c) => c.id === item.subject_category_id);
      const existing = d.subscriptions.find((s) => s.subject_category_id === item.subject_category_id);
      const from = existing ? new Date(`${existing.expiry_date}T00:00:00`) : new Date();
      from.setMonth(from.getMonth() + item.months);
      if (existing) existing.expiry_date = apiDate(from);
      else {
        d.subscriptions.push({ id: nextId(), subject_category_id: item.subject_category_id, expiry_date: apiDate(from) });
        if (cat && !d.categories.some((c) => c.id === cat.id)) {
          const grade = Object.entries(d.catalog).find(([, list]) => list.some((c) => c.id === cat.id))?.[0];
          const gradeNamed = Object.values(d.gradesByStage).flat().find((g) => g.id === Number(grade)) ?? { id: 0, name: "" };
          const stageId = Object.entries(d.gradesByStage).find(([, list]) => list.some((g) => g.id === gradeNamed.id))?.[0];
          d.categories.push({ id: cat.id, name: cat.name, classroom: gradeNamed, stage: d.stages.find((s) => s.id === Number(stageId)) ?? d.stages[0] });
        }
      }
    }
    d.transactions.unshift({
      id: nextId(),
      transaction_id: crypto.randomUUID(),
      gateway: str(b.gateway),
      coupon: d.cart.coupon?.code ?? null,
      coupon_discount: view.cart.discount_amount.toFixed(2),
      amount: view.cart.amount_before_tax.toFixed(2),
      tax_rate: 15,
      tax_value: view.cart.tax_value.toFixed(2),
      total_amount_with_tax: view.cart.total_price.toFixed(2),
      teacher_name: d.teacher.name,
      teacher_phone: d.teacher.phone,
      created_at: apiStamp(new Date()),
      discount_percentage: view.cart.discount_percentage,
      items: view.cart.items.map((i) => ({ id: i.id, item_name: i.item_name, item_price: i.item_price, months: i.months })),
    });
    d.cart = { items: [], coupon: null };
    return { payment_url: "/app/subscriptions/result?status=paid" };
  },
  [E.myCoupons]: () => ({ active: db().coupons, used: db().usedCoupons }),

  // Subjects & classrooms
  [E.subjectsByCategory]: (b) => {
    const d = db();
    return d.subjects
      .filter((s) => s.subject_category_id === num(b.subject_category_id))
      .map((s) => ({ ...s, groups_count: d.groups.filter((g) => g.subject_id === s.id).length }));
  },
  [E.allGroups]: (b) => {
    const d = db();
    const subject = d.subjects.find((s) => s.id === num(b.subject_id));
    if (!subject) throw new MockError("المادة غير موجودة", 404);
    const cat = d.categories.find((c) => c.id === subject.subject_category_id)!;
    return {
      subject: { id: subject.id, name: subject.name, subject_category_id: subject.subject_category_id, subject_category: { id: cat.id, name: cat.name } },
      groups: d.groups
        .filter((g) => g.subject_id === subject.id)
        .map((g) => ({ id: g.id, name: g.name, students_count: d.membership[g.id]?.length ?? 0, average_performance: groupStatistics(d, g.id).overall_performance.average_performance })),
    };
  },
  [E.createGroup]: (b) => {
    required(b, "name", "subject_id");
    const d = db();
    const subject = d.subjects.find((s) => s.id === num(b.subject_id));
    if (!subject) throw new MockError("المادة غير موجودة", 404);
    const g = { id: nextId(), name: str(b.name).trim(), subject_id: subject.id, subject_category_id: subject.subject_category_id, created_at: apiStamp(new Date()) };
    d.groups.push(g);
    d.membership[g.id] = [];
    return g;
  },
  [E.showGroup]: (b) => {
    const d = db();
    const g = group(d, num(b.group_id));
    return {
      id: g.id,
      name: g.name,
      subject_id: g.subject_id,
      subject_category_id: g.subject_category_id,
      statistics: groupStatistics(d, g.id),
      class_sessions: d.sessions.filter((s) => s.group_id === g.id).sort((a, b) => b.starts_at.localeCompare(a.starts_at)),
    };
  },
  [E.updateGroup]: (b) => {
    required(b, "group_id", "name");
    const g = group(db(), num(b.group_id));
    g.name = str(b.name).trim();
    return g;
  },
  [E.deleteGroup]: (b) => {
    const d = db();
    const id = num(b.group_id);
    group(d, id);
    d.groups = d.groups.filter((g) => g.id !== id);
    d.sessions = d.sessions.filter((s) => s.group_id !== id);
    delete d.membership[id];
    return null;
  },
  [E.getGroupStudents]: (b) => {
    const d = db();
    // Like the real API: every type returns all students, best first, with
    // that type's own fields.
    return ranked(d, num(b.group_id), str(b.type) || "performance");
  },
  [E.createStudent]: (b) => {
    required(b, "name", "phone", "group_id");
    const d = db();
    const g = group(d, num(b.group_id));
    const s: MockStudent = {
      id: nextId(),
      name: str(b.name),
      phone: str(b.phone),
      parent_phone: str(b.parent_phone),
      identity_number: str(b.identity_number),
      gender: str(b.gender) === "male" ? "male" : "female",
      base: 70,
      grade_id: d.categories.find((c) => c.id === g.subject_category_id)?.classroom.id ?? 0,
    };
    d.students.push(s);
    d.membership[g.id].push(s.id);
    d.studentBadges[s.id] = [];
    d.studentPatterns[s.id] = [];
    return s;
  },
  [E.deleteStudent]: (b) => {
    const d = db();
    const groupId = num(b.group_id);
    d.membership[groupId] = (d.membership[groupId] ?? []).filter((id) => id !== num(b.student_id));
    return null;
  },
  [E.deleteAllStudents]: (b) => {
    db().membership[num(b.group_id)] = [];
    return null;
  },
  [E.getStudentsByClassroom]: (b) => {
    required(b, "group_id");
    const d = db();
    const g = group(d, num(b.group_id));
    const grade = d.categories.find((c) => c.id === g.subject_category_id)?.classroom.id;
    const search = str(b.search).trim();
    const pool = d.students.filter(
      (s) => s.grade_id === grade && !d.membership[g.id].includes(s.id) && (!search || s.name.includes(search) || s.phone.includes(search)),
    );
    const page = paginate(pool, num(b.page ?? 1));
    return { students: page.items.map((s) => ({ id: s.id, name: s.name, phone: s.phone })), paginate: page.paginate };
  },
  [E.addMultipleStudentsToGroup]: (b) => {
    const d = db();
    const groupId = num(b.group_id);
    for (const id of ids(b.students_ids)) if (!d.membership[groupId].includes(id)) d.membership[groupId].push(id);
    return null;
  },
  [E.createStudentsFromExcel]: (b) => {
    required(b, "group_id");
    const d = db();
    const groupId = num(b.group_id);
    for (let i = 0; i < 3; i++) {
      const s: MockStudent = { id: nextId(), name: `طالبة من الملف ${i + 1}`, phone: `+96655${String(Date.now() + i).slice(-7)}`, parent_phone: "", identity_number: "", gender: "female", base: 65, grade_id: 0 };
      d.students.push(s);
      d.membership[groupId].push(s.id);
      d.studentBadges[s.id] = [];
      d.studentPatterns[s.id] = [];
    }
    return null;
  },

  // Students
  [E.getStudent]: (b) => {
    const d = db();
    const groupId = num(b.group_id);
    const s = student(d, num(b.student_id));
    const g = group(d, groupId);
    const exams = examPercents(d, groupId, s.id, "exam");
    const hw = examPercents(d, groupId, s.id, "homework");
    const acts = d.activities.filter((a) => a.student_id === s.id);
    return {
      group_id: g.id,
      group_name: g.name,
      student: {
        id: s.id,
        name: s.name,
        phone: s.phone,
        parent_phone: s.parent_phone,
        identity_number: s.identity_number,
        gender: s.gender,
        badges: d.badges.filter((x) => d.studentBadges[s.id]?.includes(x.id)),
        learning_patterns: d.patterns.filter((x) => d.studentPatterns[s.id]?.includes(x.id)).map((p, i) => ({ ...p, is_main: i === 0 })),
      },
      overall_score: performance(d, groupId, s),
      attendance_rate: round1(attendanceRate(d, groupId, s.id)),
      engagement_rate: Math.min(100, acts.filter((a) => a.is_positive).length * 20),
      homework_average_grade: round1(avg(hw)),
      exam_average_grade: { grade: round1(avg(exams)), max_grade: 100 },
      has_taseese_report: s.id % 3 !== 0,
    };
  },
  [E.taseeseStudentFullReport]: (b) => {
    const d = db();
    const s = d.students.find((x) => x.phone === str(b.student_phone));
    if (!s) throw new MockError("لا يوجد تقرير تأسيس لهذا الطالب", 404);
    return {
      subject_name: d.subjects.find((x) => x.id === num(b.subject_id))?.name ?? "",
      average_skills: Math.round(s.base * 0.9),
      total_questions: 120,
      correct_answers: Math.round(120 * (s.base / 100)),
      average_solve_seconds: 48,
      months: ["محرم", "صفر", "ربيع الأول", "ربيع الآخر"].map((month, i) => ({ month, percentage: Math.min(100, Math.round(s.base - 12 + i * 5)) })),
      weak: d.skills.filter((k) => k.group_id === 29).slice(0, 3).map((k, i) => ({ name: k.name, percentage: 30 + i * 10 })),
    };
  },
  [E.studentBehaviours]: (b) => {
    const d = db();
    const sid = num(b.student_id);
    const groupId = num(b.group_id);
    const acts = d.activities.filter((a) => a.student_id === sid && d.sessions.some((s) => s.id === a.session_id && s.group_id === groupId));
    const counts = new Map<string, { type: string; is_positive: boolean; icon: null; points: number }>();
    for (const a of acts) {
      const c = counts.get(a.type) ?? { type: a.type, is_positive: a.is_positive, icon: null, points: 0 };
      c.points += a.points;
      counts.set(a.type, c);
    }
    return { behaviours: [...counts.values()], positive_count: acts.filter((a) => a.is_positive).length, negative_count: acts.filter((a) => !a.is_positive).length };
  },
  [E.teacherBadges]: () => db().badges,
  [E.teacherLearningPatterns]: () => db().patterns,
  [E.teacherBadgesUpdateStudent]: (b) => {
    db().studentBadges[num(b.student_id)] = ids(b.badge_ids);
    return null;
  },
  [E.teacherLearningPatternsUpdateStudent]: (b) => {
    db().studentPatterns[num(b.student_id)] = ids(b.patterns);
    return null;
  },
  [E.teacherBadgesAssignMultipleStudents]: (b) => {
    const d = db();
    const badge = num(b.badge_id);
    for (const id of ids(b.student_ids)) d.studentBadges[id] = [...new Set([...(d.studentBadges[id] ?? []), badge])];
    return null;
  },
  [E.studentExams]: (b) => {
    const d = db();
    const sid = num(b.student_id);
    const category = str(b.category) || undefined;
    const list = d.exams
      .filter((e) => e.group_id === num(b.group_id) && (!category || e.category === category))
      .map((e) => {
        const mark = d.examResults[e.id]?.[sid];
        return { ...e, result: mark != null ? { group_exam_id: e.id, student_marks: mark, is_passed: Number(mark) >= Number(e.passing_marks) } : null };
      });
    return { exams: list, paginate: { current_page: 1, last_page: 1, per_page: list.length, total: list.length, next_page_url: null } };
  },

  // Sessions
  [E.classSessionShow]: (b) => {
    const d = db();
    return sessionWithStats(d, session(d, num(b.session_id)));
  },
  [E.classSessionUnitsAndLessons]: (b) => {
    const d = db();
    return d.units[group(d, num(b.group_id)).subject_id] ?? [];
  },
  [E.classSessionCreate]: (b) => {
    required(b, "group_id", "name", "starts_at", "duration_minutes", "type");
    const d = db();
    const start = new Date(str(b.starts_at).replace(" ", "T"));
    if (start.getTime() < Date.now()) throw new MockError("يجب أن يكون موعد الحصة بعد الوقت الحالي");
    const s: Session = {
      id: nextId(),
      group_id: num(b.group_id),
      name: str(b.name),
      type: str(b.type),
      grouping_method: str(b.grouping_method) === "random" ? "random" : "kagan",
      is_prepared: 0,
      lesson_objectives: str(b.lesson_objectives) || null,
      educational_outcome: str(b.educational_outcome) || null,
      preparation_text: str(b.preparation_text) || null,
      duration_minutes: num(b.duration_minutes),
      status: "pending",
      unit_name: str(b.unit_name) || null,
      lesson_name: str(b.lesson_name) || null,
      lesson_id: b.lesson_id ? num(b.lesson_id) : null,
      lesson_file: null,
      lesson_video: null,
      starts_at: str(b.starts_at),
      started_at: null,
    };
    d.sessions.push(s);
    return s;
  },
  [E.classSessionUpdate]: (b) => {
    required(b, "session_id");
    const d = db();
    const s = session(d, num(b.session_id));
    if (b.starts_at && new Date(str(b.starts_at).replace(" ", "T")).getTime() < Date.now()) throw new MockError("يجب أن يكون موعد الحصة بعد الوقت الحالي");
    for (const key of ["name", "type", "grouping_method", "unit_name", "lesson_name", "starts_at", "lesson_objectives", "educational_outcome", "preparation_text"] as const) {
      if (b[key] !== undefined) (s as unknown as Record<string, unknown>)[key] = str(b[key]);
    }
    if (b.duration_minutes !== undefined) s.duration_minutes = num(b.duration_minutes);
    if (b.lesson_id !== undefined) s.lesson_id = b.lesson_id ? num(b.lesson_id) : null;
    return s;
  },
  [E.classSessionDelete]: (b) => {
    const d = db();
    d.sessions = d.sessions.filter((s) => s.id !== num(b.session_id));
    return null;
  },
  [E.classSessionUpdateLessonObjectives]: (b) => {
    const s = session(db(), num(b.session_id));
    s.lesson_objectives = str(b.lesson_objectives);
    return null;
  },
  [E.classSessionUpdateEducationalOutcome]: (b) => {
    const s = session(db(), num(b.session_id));
    s.educational_outcome = str(b.educational_outcome);
    return null;
  },
  [E.classSessionUpdatePreparation]: (b) => {
    const s = session(db(), num(b.session_id));
    s.preparation_text = str(b.preparation_text);
    return null;
  },
  [E.classSessionMarkAsPrepared]: (b) => {
    session(db(), num(b.session_id)).is_prepared = 1;
    return null;
  },
  [E.classSessionStart]: (b) => {
    const s = session(db(), num(b.session_id));
    if (s.status === "pending") {
      s.status = "in_progress";
      s.started_at = apiDateTime(new Date());
    }
    return s;
  },
  [E.classSessionMarkAsCompleted]: (b) => {
    session(db(), num(b.session_id)).status = "completed";
    return null;
  },
  [E.classSessionQuestions]: (b) => db().questions.filter((q) => q.class_session_id === num(b.session_id)),
  [E.classSessionQuestionsCreate]: (b) => {
    required(b, "session_id");
    const d = db();
    const q = parseQuestion(b, num(b.session_id));
    d.questions.push(q);
    return q;
  },
  [E.classSessionQuestionsUpdate]: (b) => {
    required(b, "question_id");
    const d = db();
    const index = d.questions.findIndex((q) => q.id === num(b.question_id));
    if (index < 0) throw new MockError("السؤال غير موجود", 404);
    const updated = parseQuestion(b, d.questions[index].class_session_id, d.questions[index]);
    d.questions[index] = updated;
    return updated;
  },
  [E.classSessionQuestionsDelete]: (b) => {
    const d = db();
    const remove = ids(b.questions_ids);
    d.questions = d.questions.filter((q) => !remove.includes(q.id));
    return null;
  },
  [E.classSessionQuestionsTaseese]: (b) => {
    const d = db();
    const s = session(d, num(b.session_id));
    const bank = d.taseeseBank[s.lesson_id ?? -1] ?? [];
    const existing = new Set(d.questions.filter((q) => q.class_session_id === s.id).map((q) => q.question_text));
    const added = bank.filter((q) => !existing.has(q.question_text)).map((q) => ({ ...q, id: nextId(), class_session_id: s.id, created_at: apiStamp(new Date()) }));
    d.questions.push(...added);
    return added;
  },
  [E.classSessionMindMaps]: (b) => db().mindMaps.filter((m) => m.class_session_id === num(b.session_id)),
  [E.classSessionMindMapUpload]: (b, ctx) => {
    required(b, "session_id");
    const d = db();
    const m = { id: nextId(), class_session_id: num(b.session_id), file_name: str(b.file_name) || ctx.files.file?.name || "خريطة ذهنية", file_path: "/mock-files/mind-map.pdf", created_at: apiStamp(new Date()) };
    d.mindMaps.push(m);
    return m;
  },
  [E.classSessionMindMapDelete]: (b) => {
    const d = db();
    d.mindMaps = d.mindMaps.filter((m) => m.id !== num(b.mind_map_id));
    return null;
  },
  [E.classSessionAttendanceStudents]: (b) => {
    const d = db();
    const s = session(d, num(b.session_id));
    const records = d.attendance[s.id] ?? {};
    const students: AttendanceStudent[] = groupStudents(d, s.group_id).map((st) => {
      const r = records[st.id];
      return {
        student_id: st.id,
        student_name: st.name,
        is_present: r ? r.is_present : 0,
        is_late: r ? r.is_late : 0,
        present_at: r?.present_at ?? null,
        performance_rate: performance(d, s.group_id, st),
      };
    });
    return {
      statistics: { total: students.length, present: students.filter((x) => x.is_present).length, late: students.filter((x) => x.is_late).length, attendance: Object.keys(records).length ? 1 : 0 },
      students,
    };
  },
  [E.classSessionAttendanceAdd]: (b) => {
    required(b, "session_id");
    const d = db();
    const s = session(d, num(b.session_id));
    if (s.status === "pending" && new Date(s.starts_at.replace(" ", "T")).getTime() > Date.now()) throw new MockError("لا يمكن تسجيل الحضور قبل بدء الحصة");
    const list = Array.isArray(b.students) ? (b.students as MockBody[]) : [];
    d.attendance[s.id] = {};
    for (const row of list) {
      const present = bool(row.is_present);
      d.attendance[s.id][num(row.student_id)] = {
        is_present: present ? 1 : 0,
        is_late: bool(row.is_late) ? 1 : 0,
        present_at: present ? str(row.present_at) || apiDateTime(new Date()) : null,
      };
    }
    return null;
  },
  [E.classSessionActivityTypes]: () => db().activityTypes,
  [E.classSessionActivityAdd]: (b) => {
    required(b, "session_id", "student_id", "type");
    db().activities.push({ session_id: num(b.session_id), student_id: num(b.student_id), type: str(b.type), is_positive: bool(b.is_positive), points: 1 });
    return null;
  },
  [E.classSessionActivityAddMultiple]: (b) => {
    required(b, "session_id", "type");
    const d = db();
    for (const id of ids(b.students_ids)) d.activities.push({ session_id: num(b.session_id), student_id: id, type: str(b.type), is_positive: bool(b.is_positive), points: 1 });
    return null;
  },
  [E.addStudentQuestions]: (b) => {
    required(b, "session_id", "student_id");
    const d = db();
    const pos = num(b.positive_points ?? 0);
    const neg = num(b.negative_points ?? 0);
    if (pos + neg === 0) throw new MockError("لا توجد نقاط لحفظها", 400);
    for (let i = 0; i < pos; i++) d.activities.push({ session_id: num(b.session_id), student_id: num(b.student_id), type: "إجابة صحيحة في المسابقة", is_positive: true, points: 1 });
    for (let i = 0; i < neg; i++) d.activities.push({ session_id: num(b.session_id), student_id: num(b.student_id), type: "إجابة خاطئة في المسابقة", is_positive: false, points: 1 });
    return null;
  },
  [E.classSessionDistributeStudents]: (b) => {
    const d = db();
    const s = session(d, num(b.session_id));
    const size = Math.max(2, num(b.group_size ?? 4));
    const present = groupStudents(d, s.group_id).map((st) => ({ id: st.id, name: st.name, phone: st.phone, performance_rate: performance(d, s.group_id, st) }));
    // Kagan: snake order by performance so every group mixes levels.
    const sorted = [...present].sort((a, b2) => b2.performance_rate - a.performance_rate);
    const count = Math.max(1, Math.ceil(sorted.length / size));
    const buckets: (typeof present)[] = Array.from({ length: count }, () => []);
    sorted.forEach((st, i) => {
      const round = Math.floor(i / count);
      const index = round % 2 === 0 ? i % count : count - 1 - (i % count);
      buckets[index].push(st);
    });
    const groups = buckets.map((members, i) => ({ group_number: i + 1, members, average_performance: round1(avg(members.map((m) => m.performance_rate))) }));
    return {
      statistics: { total_groups: groups.length, total_students: present.length, group_size: size, overall_average: round1(avg(present.map((p) => p.performance_rate))) },
      groups,
    };
  },
  [E.getSessionStatistics]: (b) => {
    const d = db();
    const s = session(d, num(b.session_id));
    const records = Object.values(d.attendance[s.id] ?? {});
    const total = d.membership[s.group_id]?.length ?? 0;
    const present = records.filter((r) => r.is_present).length;
    const acts = d.activities.filter((a) => a.session_id === s.id);
    const pos = acts.filter((a) => a.is_positive).length;
    const hw = d.exams.filter((e) => e.class_session_id === s.id);
    const hwRate = hw.length ? avg(hw.map((e) => (Object.values(d.examResults[e.id] ?? {}).filter((m) => m != null).length / Math.max(1, total)) * 100)) : 0;
    const attendanceRateValue = total ? (present / total) * 100 : 0;
    const engagement = total ? (new Set(acts.filter((a) => a.is_positive).map((a) => a.student_id)).size / total) * 100 : 0;
    const overall = round1(avg([attendanceRateValue, hwRate || attendanceRateValue, engagement]));
    return {
      homework_statistics: { submission_rate: round1(hwRate) },
      attendance_statistics: { total_students: total, present_count: present, absent_count: total - present, late_count: records.filter((r) => r.is_late).length, attendance_rate: round1(attendanceRateValue) },
      activity_statistics: { positive_count: pos, negative_count: acts.length - pos, net_points: pos - (acts.length - pos), engagement_rate: round1(engagement) },
      overall_performance: { overall_score: overall, session_quality: overall >= 80 ? "ممتاز" : overall >= 60 ? "جيد" : "ضعيف" },
    };
  },
  [E.getStudentSessionReport]: (b) => {
    const d = db();
    const s = session(d, num(b.session_id));
    const sid = num(b.student_id);
    const r = d.attendance[s.id]?.[sid];
    const acts = d.activities.filter((a) => a.session_id === s.id && a.student_id === sid);
    const pos = acts.filter((a) => a.is_positive).length;
    const hw = d.exams.filter((e) => e.class_session_id === s.id);
    const marks = hw.map((e) => ({ e, m: d.examResults[e.id]?.[sid] })).filter(({ m }) => m != null);
    return {
      attendance: { is_present: r ? r.is_present : null, is_late: r?.is_late ?? 0, present_at: r?.present_at ?? null },
      activity: { positive_count: pos, negative_count: acts.length - pos, positive_points: pos, negative_points: acts.length - pos, net_points: pos * 2 - acts.length },
      homework: { total_count: hw.length, passed_count: marks.filter(({ e, m }) => Number(m) >= Number(e.passing_marks)).length, average_grade: round1(avg(marks.map(({ e, m }) => (Number(m) / Number(e.total_marks)) * 100))) },
    };
  },

  // Exams
  [E.groupExams]: (b) => {
    const d = db();
    const sessionId = b.session_id !== undefined && b.session_id !== "" ? num(b.session_id) : null;
    return d.exams
      .filter((e) => e.group_id === num(b.group_id) && (sessionId === null || e.class_session_id === sessionId))
      .sort((a, b2) => b2.created_at.localeCompare(a.created_at));
  },
  [E.groupExamCreate]: (b, ctx) => {
    required(b, "group_id", "title", "deadline", "total_marks", "category");
    const d = db();
    if (new Date(str(b.deadline).replace(" ", "T")).getTime() < Date.now()) throw new MockError("يجب أن يكون الموعد بعد الوقت الحالي");
    const total = num(b.total_marks);
    const e: Exam = {
      id: nextId(),
      group_id: num(b.group_id),
      class_session_id: b.session_id ? num(b.session_id) : null,
      type: "file",
      category: str(b.category) === "homework" ? "homework" : "exam",
      title: str(b.title),
      description: str(b.description) || null,
      total_marks: total.toFixed(2),
      passing_marks: (total / 2).toFixed(2),
      deadline: str(b.deadline),
      file_path: ctx.files.file ? "/mock-files/exam.pdf" : null,
      created_at: apiStamp(new Date()),
      web_url: null,
    };
    d.exams.push(e);
    d.examResults[e.id] = Object.fromEntries((d.membership[e.group_id] ?? []).map((id) => [id, null]));
    return e;
  },
  [E.createExamFromTasseese]: (b) => {
    required(b, "group_id", "title", "deadline", "questions_ids");
    const d = db();
    const count = ids(b.questions_ids).length;
    const e: Exam = {
      id: nextId(),
      group_id: num(b.group_id),
      class_session_id: b.session_id ? num(b.session_id) : null,
      type: "taseese",
      category: str(b.category) === "homework" ? "homework" : "exam",
      title: str(b.title),
      description: str(b.description) || null,
      total_marks: count.toFixed(2),
      passing_marks: (count / 2).toFixed(2),
      deadline: str(b.deadline),
      file_path: null,
      created_at: apiStamp(new Date()),
      web_url: "https://app.taseese.org/exam/demo",
    };
    d.exams.push(e);
    d.examResults[e.id] = Object.fromEntries((d.membership[e.group_id] ?? []).map((id) => [id, null]));
    return e;
  },
  [E.questionsByMultipleLessons]: (b) => {
    const d = db();
    const lessons = ids(b.lessons_ids);
    const all = lessons.flatMap((l) => (d.taseeseBank[l] ?? []).map((q, i) => ({ ...q, id: l * 100 + i, class_session_id: 0, created_at: "" })));
    return all.slice(0, Math.max(1, num(b.count_questions ?? all.length)));
  },
  [E.groupExamDelete]: (b) => {
    const d = db();
    d.exams = d.exams.filter((e) => e.id !== num(b.exam_id));
    return null;
  },
  [E.getExamResults]: (b) => {
    const d = db();
    const e = d.exams.find((x) => x.id === num(b.exam_id));
    if (!e) throw new MockError("الاختبار غير موجود", 404);
    const results = d.examResults[e.id] ?? {};
    const students = groupStudents(d, e.group_id).map((s) => {
      const m = results[s.id] ?? null;
      return {
        student_id: s.id,
        student_name: s.name,
        student_marks: m,
        exam_marks: e.total_marks,
        is_passed: m === null ? null : Number(m) >= Number(e.passing_marks),
        is_submitted: m !== null,
      };
    });
    const submitted = students.filter((s) => s.is_submitted);
    return {
      statistics: {
        total_students: students.length,
        submitted_count: submitted.length,
        not_submitted_count: students.length - submitted.length,
        pass_rate: submitted.length ? round1((submitted.filter((s) => s.is_passed).length / submitted.length) * 100) : 0,
        average_marks: round1(avg(submitted.map((s) => Number(s.student_marks)))),
      },
      students,
    };
  },
  [E.submitExamResults]: (b) => {
    required(b, "exam_id");
    const d = db();
    const e = d.exams.find((x) => x.id === num(b.exam_id));
    if (!e) throw new MockError("الاختبار غير موجود", 404);
    const rows = Array.isArray(b.results) ? (b.results as MockBody[]) : [];
    if (!rows.length) throw new MockError("results مطلوب");
    for (const row of rows) {
      const mark = num(row.student_mark);
      if (mark < 0 || mark > Number(e.total_marks)) throw new MockError(`الدرجة يجب أن تكون بين 0 و${Number(e.total_marks)}`);
      d.examResults[e.id][num(row.student_id)] = mark.toFixed(2);
    }
    return null;
  },

  // Evaluation elements
  [E.evaluationElementsSubject]: (b) => elementsByPhase(db(), num(b.subject_id)),
  [E.evaluationElementsGroup]: (b) => {
    const d = db();
    return elementsByPhase(d, group(d, num(b.group_id)).subject_id);
  },
  [E.evaluationElementsStore]: (b) => {
    required(b, "subject_id", "name", "max_degree");
    const max = num(b.max_degree);
    if (max < 1 || max > 200 || !Number.isInteger(max)) throw new MockError("الدرجة القصوى بين 1 و200");
    const phase = b.phase ? num(b.phase) : null;
    const el = { id: nextId(), subject_id: num(b.subject_id), name: str(b.name).trim(), max_degree: max, phases: (phase ? [phase] : [1, 2]) as (1 | 2)[] };
    db().elements.push(el);
    return el;
  },
  [E.evaluationElementsDelete]: (b) => {
    const d = db();
    d.elements = d.elements.filter((e) => e.id !== num(b.evaluation_element_id));
    return null;
  },
  [E.evaluationElementsStudentGroups]: (b) => studentEvaluation(db(), num(b.group_id), num(b.student_id)),
  [E.evaluationElementsAddStudentDegrees]: (b) => {
    required(b, "group_id", "student_id", "phase");
    const d = db();
    const rows = Array.isArray(b.degrees) ? (b.degrees as MockBody[]) : [];
    for (const row of rows) {
      const el = d.elements.find((e) => e.id === num(row.evaluation_element_id));
      if (!el) continue;
      const v = num(row.degree);
      if (v < 0 || v > el.max_degree) throw new MockError(`الدرجة يجب أن تكون بين 0 و${el.max_degree}`);
      d.degrees[`${num(b.group_id)}:${num(b.student_id)}:${el.id}:${num(b.phase)}`] = v;
    }
    return null;
  },
  [E.evaluationElementsAddDegreeMultiple]: (b) => {
    required(b, "group_id", "evaluation_element_id", "degree", "phase");
    const d = db();
    for (const id of ids(b.students_ids)) d.degrees[`${num(b.group_id)}:${id}:${num(b.evaluation_element_id)}:${num(b.phase)}`] = num(b.degree);
    return null;
  },

  // Skills
  [E.skillsGroup]: (b) => {
    const d = db();
    const status = str(b.status) || "missing";
    return d.skills
      .filter((k) => k.group_id === num(b.group_id) && k.status === status)
      .map((k) => {
        const wrong = k.students.filter((s) => s.wrong > 0).length;
        const answered = k.students.length;
        return { id: k.id, name: k.name, remedial_plan: k.remedial_plan, students_answered: answered, students_wrong: wrong, students_correct: answered - wrong, wrong_percentage: answered ? Math.round((wrong / answered) * 100) : 0 };
      });
  },
  [E.skillsGroupStudents]: (b) => {
    const d = db();
    const k = d.skills.find((x) => x.id === num(b.skill_id));
    if (!k) return [];
    return k.students.filter((s) => s.wrong > 0).map((s) => ({ student_id: s.student_id, name: student(d, s.student_id).name, improved_at: s.improved_at }));
  },
  [E.skillsImprove]: (b) => {
    const d = db();
    const groupId = num(b.group_id);
    const targets = b.skill_ids ? ids(b.skill_ids) : d.skills.filter((k) => k.group_id === groupId && k.status === "missing").map((k) => k.id);
    for (const k of d.skills.filter((x) => targets.includes(x.id))) {
      k.status = "improved";
      k.students.forEach((s) => (s.improved_at = s.wrong > 0 ? apiStamp(new Date()) : null));
    }
    return null;
  },
  [E.skillsDelete]: (b) => {
    const d = db();
    const targets = ids(b.skill_ids);
    d.skills = d.skills.filter((k) => !targets.includes(k.id));
    return null;
  },

  // Reports
  [E.myReports]: (b) => {
    const d = db();
    const categoryId = num(b.category_id);
    const groups = d.groups.filter((g) => g.subject_category_id === categoryId);
    const stats = groups.map((g) => groupStatistics(d, g.id));
    const perfs = stats.map((s) => s.overall_performance.average_performance);
    const sessions = d.sessions.filter((s) => groups.some((g) => g.id === s.group_id));
    return {
      subscriptions_count: d.subscriptions.length,
      total_groups_count: groups.length,
      students_count_in_all_groups: stats.reduce((n, s) => n + s.group.total_students, 0),
      overall_statistics: {
        average_performance: round1(avg(perfs)),
        highest_performance: round1(Math.max(0, ...perfs)),
        lowest_performance: perfs.length ? round1(Math.min(...perfs)) : 0,
        total_students_above_80: stats.reduce((n, s) => n + s.overall_performance.students_above_80, 0),
        total_students_below_60: stats.reduce((n, s) => n + s.overall_performance.students_below_60, 0),
      },
      groups: stats,
      sessions: {
        total_count: sessions.length,
        completed_count: sessions.filter((s) => s.status === "completed").length,
        pending_count: sessions.filter((s) => s.status !== "completed").length,
        prepared_count: sessions.filter((s) => s.is_prepared).length,
        not_prepared_count: sessions.filter((s) => !s.is_prepared).length,
        average_duration_minutes: Math.round(avg(sessions.map((s) => s.duration_minutes))),
      },
    };
  },

  // Notifications
  [E.allNotifications]: (b) => {
    const d = db();
    const page = paginate(d.notifications, num(b.page ?? 1));
    return { notifications: page.items, paginate: page.paginate, unread_notifications_count: d.notifications.filter((n) => !n.read_at).length };
  },
  [E.unreadNotifications]: (b) => {
    const d = db();
    const page = paginate(d.notifications.filter((n) => !n.read_at), num(b.page ?? 1));
    return { notifications: page.items, paginate: page.paginate, unread_notifications_count: d.notifications.filter((n) => !n.read_at).length };
  },
  [E.markNotificationAsRead]: (b) => {
    const d = db();
    const n = d.notifications.find((x) => x.id === num(b.notification_id));
    if (n && !n.read_at) n.read_at = apiStamp(new Date());
    return { unread_notifications_count: d.notifications.filter((x) => !x.read_at).length };
  },
  [E.markAllNotificationsRead]: () => {
    const d = db();
    d.notifications.forEach((n) => (n.read_at ??= apiStamp(new Date())));
    return { unread_notifications_count: 0 };
  },
  [E.deleteNotification]: (b) => {
    const d = db();
    d.notifications = d.notifications.filter((n) => n.id !== num(b.notification_id));
    return { unread_notifications_count: d.notifications.filter((x) => !x.read_at).length };
  },
  [E.deleteAllNotifications]: () => {
    db().notifications = [];
    return { unread_notifications_count: 0 };
  },

  // More
  [E.transactions]: (b) => {
    const page = paginate(db().transactions, num(b.page ?? 1));
    return {
      transactions: page.items.map((t) => ({ id: t.id, total_amount_with_tax: t.total_amount_with_tax, created_at: t.created_at, discount_percentage: t.discount_percentage })),
      paginate: page.paginate,
    };
  },
  [E.transactionDetails]: (b) => {
    const t = db().transactions.find((x) => x.id === num(b.transaction_id));
    if (!t) throw new MockError("المعاملة غير موجودة", 404);
    return t;
  },
  [E.faqCategories]: () => db().faqCategories,
  [E.faqsByCategory]: (b) => db().faqs.filter((f) => f.faq_category_id === num(b.category_id)),
  [E.helpCenter]: (b) => {
    const page = paginate(db().tickets, num(b.page ?? 1));
    return { tickets: page.items, paginate: page.paginate };
  },
  [E.helpCenterCategories]: () => ["مشاكل تقنية", "الاشتراكات", "ملف الإنجاز", "اقتراحات"],
  [E.helpCenterDetails]: (b) => {
    const d = db();
    const t = d.tickets.find((x) => x.id === num(b.ticket_id));
    if (!t) throw new MockError("التذكرة غير موجودة", 404);
    const replies = d.replies[t.id] ?? [];
    return { ticket: t, replies, paginate: { current_page: 1, last_page: 1, per_page: replies.length, total: replies.length, next_page_url: null } };
  },
  [E.createHelpCenter]: (b) => {
    required(b, "category", "subject", "message");
    const d = db();
    const t = {
      id: nextId(),
      ticket_number: `TKT-${Date.now().toString(16).toUpperCase()}`,
      category: str(b.category),
      subject: str(b.subject),
      message: str(b.message),
      priority: "medium",
      status: "pending" as const,
      created_at: apiStamp(new Date()),
    };
    d.tickets.unshift(t);
    d.replies[t.id] = [{ id: nextId(), sender_type: "teacher", message: t.message, attachment: null, created_at: t.created_at }];
    return t;
  },
  [E.createHelpCenterReply]: (b) => {
    required(b, "ticket_id", "message");
    const d = db();
    const reply = { id: nextId(), sender_type: "teacher" as const, message: str(b.message), attachment: null, created_at: apiStamp(new Date()) };
    (d.replies[num(b.ticket_id)] ??= []).push(reply);
    return reply;
  },
  [E.socialMedia]: () => db().social,
  [E.pageShow]: (b) => {
    const page = db().pages[str(b.slug)];
    if (!page) throw new MockError("الصفحة غير موجودة", 404);
    return page;
  },
  [E.appSettings]: () => ({ ttl_cache_minutes: 15, quiz_seconds_per_question: 60 }),

  // Portfolio
  [E.getPortfolioJsonFile]: () => ({ file_portfolio: db().portfolio ? "mock://portfolio" : null }),
  [E.uploadPortfolioJsonFile]: () => null,
  [E.portfolioConstants]: () => ({
    grouped_constants: {
      teaching_strategy: ["التدريس المباشر", "التعلم التعاوني", "حل المشكلات", "التعلم باللعب"].map((content, i) => ({ id: i + 1, section: "teaching_strategy", content })),
      educational_tools: ["الكتاب", "السبورة الذكية", "أوراق العمل", "الوسائل المحسوسة"].map((content, i) => ({ id: i + 10, section: "educational_tools", content })),
      participation_average: ["عالية (80%-100%)", "متوسطة (50%-79%)", "منخفضة (أقل من 50%)"].map((content, i) => ({ id: i + 20, section: "participation_average", content })),
    },
    sections: { teaching_strategy: "استراتيجيات التدريس", educational_tools: "الأدوات والوسائل التعليمية", participation_average: "متوسط المشاركة والتفاعل" },
  }),
};

/** Paths that return a file instead of an envelope. */
export const FILE_ENDPOINTS: Record<string, { name: string; type: string; body: (body: MockBody) => string }> = {
  [E.evaluationElementsExport]: {
    name: "grades.csv",
    type: "text/csv; charset=utf-8",
    body: (b) => {
      const d = db();
      const groupId = num(b.group_id);
      const g = group(d, groupId);
      const phases = b.phase ? [num(b.phase) as 1 | 2] : [1, 2];
      const els = d.elements.filter((e) => e.subject_id === g.subject_id);
      const wanted = ids(b.students_ids);
      const header = ["الطالب", ...phases.flatMap((p) => els.filter((e) => e.phases.includes(p as 1 | 2)).map((e) => `${e.name} (ف${p})`))];
      const rows = groupStudents(d, groupId)
        .filter((s) => !wanted.length || wanted.includes(s.id))
        .map((s) => [s.name, ...phases.flatMap((p) => els.filter((e) => e.phases.includes(p as 1 | 2)).map((e) => String(d.degrees[`${groupId}:${s.id}:${e.id}:${p}`] ?? "")))]);
      return "﻿" + [header, ...rows].map((r) => r.map((c) => `"${c.replace(/"/g, '""')}"`).join(",")).join("\n");
    },
  },
  // A one-page placeholder PDF: the real one is rendered by the backend.
  [E.exportPortfolioPdfFile]: {
    name: "portfolio.pdf",
    type: "application/pdf",
    body: () => {
      const text = "BT /F1 18 Tf 72 720 Td (Hessati portfolio - demo PDF) Tj ET";
      const objects = [
        "<< /Type /Catalog /Pages 2 0 R >>",
        "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>",
        `<< /Length ${text.length} >>\nstream\n${text}\nendstream`,
        "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      ];
      let pdf = "%PDF-1.4\n";
      const offsets: number[] = [];
      objects.forEach((o, i) => {
        offsets.push(pdf.length);
        pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
      });
      const xref = pdf.length;
      pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}`;
      pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
      return pdf;
    },
  },
  [E.downloadDemoStudentsExcel]: {
    name: "students-template.csv",
    type: "text/csv; charset=utf-8",
    body: () => "﻿" + ["name,phone,parent_phone,identity_number", "اسم الطالبة,05XXXXXXXX,05XXXXXXXX,11XXXXXXXX"].join("\n"),
  },
};

export function getPortfolio() {
  return db().portfolio;
}

export function setPortfolio(payload: MockDb["portfolio"]) {
  db().portfolio = payload;
}

export function isMockAuthorized(token: string | undefined): boolean {
  const d = db();
  // After a server restart the in-memory token is lost; accept any mock
  // token so the visitor isn't logged out on every reload in dev.
  return Boolean(token && (token === d.token || token.startsWith("mock-")));
}

export function runMock(path: string, body: MockBody, files: Record<string, File>): unknown {
  const handler = handlers[path];
  if (!handler) throw new MockError(`لا يوجد رد تجريبي لـ ${path}`, 404);
  return handler(body, { files });
}
