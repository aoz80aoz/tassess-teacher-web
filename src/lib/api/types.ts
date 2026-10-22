// Response shapes of the backend, as recorded in the mobile app's real
// fixtures (test/fixtures/api/*.json). Only the fields the site reads.

export interface Envelope<T> {
  success: boolean;
  message: string | null;
  errors: Record<string, string[]> | null;
  data: T;
}

export interface Paginate {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
  next_page_url: string | null;
}

export interface Named {
  id: number;
  name: string;
}

// ---- Teacher ----
export interface Teacher {
  id: number;
  name: string;
  manager_name: string | null;
  phone: string;
  school_id: number | null;
  nationality_id: number | null;
  gender: "male" | "female";
  status: string;
  img: string | null;
  is_subscribed: boolean;
  created_at: string;
  school: (Named & { region_id: number; region: Named }) | null;
  nationality: Named | null;
}

export interface LoginResponse {
  token: string;
  teacher: Teacher;
}

// ---- Locations ----
export interface NationalitiesAndRegions {
  nationalities: Named[];
  regions: Named[];
}

// ---- Home ----
export interface SubjectCategory extends Named {
  img?: string | null;
  classroom?: Named | null;
  stage?: Named | null;
}

export interface Subscription {
  id: number;
  subject_category_id: number;
  expiry_date: string;
  is_valid: boolean;
  remaining_days: number;
  groups_count?: number;
  students_count?: number;
  subject_category: SubjectCategory;
}

export type SessionStatus = "pending" | "in_progress" | "completed";

export interface TodaySession {
  id: number;
  name: string;
  group_id: number;
  starts_at: string;
  is_prepared: number;
  status: SessionStatus;
  lesson_name?: string | null;
  group: Named & { subject_category_id: number; subject_category: Named };
}

export interface HomeAcademicCalendar {
  hijri_year: number;
  term: string;
  term_label: string;
  progress_percentage: number;
  current_week: number | null;
  total_weeks: number;
}

export interface HomeData {
  subscriptions: Subscription[];
  today_sessions: TodaySession[];
  banners: { id: number; img: string; order: number }[];
  unread_notifications_count: number;
  academic_calendar: HomeAcademicCalendar | null;
}

export interface CalendarTerm {
  start_date: string;
  end_date: string;
  progress_percentage: number;
  current_week: number | null;
  total_weeks: number;
  is_current: boolean;
}

export interface CalendarEvent {
  id: number;
  title: string;
  date: string;
  week_label: string;
  type_name: string;
  type_bg_color: string;
  type_text_color: string;
}

export interface AcademicCalendar {
  hijri_year: number;
  cards: Record<string, CalendarTerm>;
  events: Record<string, CalendarEvent[]>;
}

// ---- Subjects & classrooms ----
export interface CategorySubject extends Named {
  subject_category_id: number;
  img: string | null;
  groups_count: number;
}

export interface SubjectClassrooms {
  subject: Named & { subject_category_id: number; subject_category: Named };
  groups: { id: number; name: string; students_count: number; average_performance: number }[];
}

export interface Session {
  id: number;
  group_id: number;
  name: string;
  type: string;
  grouping_method: "kagan" | "random" | null;
  is_prepared: number;
  lesson_objectives: string | null;
  educational_outcome: string | null;
  preparation_text: string | null;
  duration_minutes: number;
  status: SessionStatus;
  unit_name: string | null;
  lesson_name: string | null;
  lesson_id: number | null;
  lesson_file: string | null;
  lesson_video: string | null;
  starts_at: string;
  started_at?: string | null;
  attendance_statistics?: { total: number; present: number; late: number; attendance: number };
}

export interface GroupStatistics {
  group: { id: number; name: string; total_students: number; total_sessions: number };
  homework_statistics: { total_homeworks: number; submitted_count: number; not_submitted_count: number; submission_rate: number };
  exam_statistics: {
    total_exams: number;
    average_performance: number;
    passed_count: number;
    failed_count: number;
    pass_rate: number;
    highest_score: number;
    lowest_score: number;
  };
  attendance_statistics: {
    total_records: number;
    present_count: number;
    absent_count: number;
    late_count: number;
    attendance_rate: number;
  };
  activity_statistics: {
    total_activities: number;
    positive_points: number;
    negative_points: number;
    net_points: number;
    positive_count: number;
    negative_count: number;
  };
  overall_performance: {
    average_performance: number;
    highest_performance: number;
    lowest_performance: number;
    students_above_80: number;
    students_below_60: number;
  };
  students_learning_patterns: {
    total_students_count: number;
    patterns: { id: number; name: string; count: number; percentage: number }[];
  };
}

export interface ClassroomDetails {
  id: number;
  name: string;
  subject_id: number;
  subject_category_id: number;
  statistics: GroupStatistics;
  class_sessions: Session[];
}

export interface Unit extends Named {
  lessons: (Named & { unit_id: number; objectives: string; outcomes: string; teaching_steps: string })[];
}

// ---- Students ----
export interface ClassroomStudent {
  id: number;
  name: string;
  phone: string;
  parent_phone?: string | null;
  performance_rate: number;
}

export type RankingType = "performance" | "activity" | "homework" | "attendance";

export interface RankedStudent {
  rank: number;
  id: number;
  name: string;
  phone?: string;
  [field: string]: string | number | undefined;
}

export interface Badge extends Named {
  img: string | null;
}

export interface LearningPattern extends Named {
  img: string | null;
  description?: string;
  is_main?: boolean;
}

export interface StudentDetails {
  group_id: number;
  group_name: string;
  student: {
    id: number;
    name: string;
    phone: string;
    parent_phone: string | null;
    identity_number: string | null;
    gender: "male" | "female";
    badges: Badge[];
    learning_patterns: LearningPattern[];
  };
  overall_score: number;
  attendance_rate: number;
  engagement_rate: number;
  homework_average_grade: number;
  exam_average_grade: { grade: number; max_grade: number };
  has_taseese_report: boolean;
}

export interface ActivityType {
  type: string;
  is_positive: boolean;
  icon: string | null;
}

export interface StudentBehaviours {
  behaviours: (ActivityType & { points: number })[];
  positive_count: number;
  negative_count: number;
}

export interface TaseeseReport {
  subject_name: string;
  average_skills: number;
  total_questions: number;
  correct_answers: number;
  average_solve_seconds: number;
  months: { month: string; percentage: number }[];
  weak: { name: string; percentage: number }[];
}

// ---- Exams ----
export type AssessmentCategory = "exam" | "homework";

export interface Exam {
  id: number;
  group_id: number;
  class_session_id: number | null;
  type: "file" | "taseese";
  category: AssessmentCategory;
  title: string;
  description: string | null;
  total_marks: string;
  passing_marks: string;
  deadline: string;
  file_path: string | null;
  created_at: string;
  web_url: string | null;
}

export interface ExamResults {
  statistics: { total_students: number; submitted_count: number; not_submitted_count: number; pass_rate: number; average_marks: number };
  students: {
    student_id: number;
    student_name: string;
    student_marks: string | null;
    exam_marks: string;
    is_passed: boolean | null;
    is_submitted: boolean;
  }[];
}

export interface StudentExam extends Exam {
  result: { group_exam_id: number; student_marks: string | null; is_passed: boolean } | null;
}

// ---- Session content ----
export interface QuestionOption {
  id: number;
  type: "text" | "image";
  content: string;
}

export interface Question {
  id: number;
  class_session_id: number;
  source: "manual" | "taseese";
  question_text: string;
  question_image: string | null;
  question_type: "multiple_choice" | "true_false";
  options: QuestionOption[];
  correct_answer: number;
  explanation: string | null;
  points: string;
  degree?: number | null;
  difficulty_level: string | null;
  is_rtl: number;
  created_at: string;
}

export interface MindMap {
  id: number;
  class_session_id: number;
  file_name: string;
  file_path: string;
  created_at: string;
}

export interface AttendanceStudent {
  student_id: number;
  student_name: string;
  is_present: number;
  is_late: number;
  present_at: string | null;
  performance_rate: number;
}

export interface AttendanceData {
  statistics: { total: number; present: number; late: number; attendance: number };
  students: AttendanceStudent[];
}

export interface DistributionResult {
  statistics: { total_groups: number; total_students: number; group_size: number; overall_average: number };
  groups: { group_number: number; average_performance: number; members: ClassroomStudent[] }[];
}

export interface SessionStatistics {
  homework_statistics: { submission_rate: number };
  attendance_statistics: { total_students: number; present_count: number; absent_count: number; late_count: number; attendance_rate: number };
  activity_statistics: { positive_count: number; negative_count: number; net_points: number; engagement_rate: number };
  overall_performance: { overall_score: number; session_quality: string };
}

export interface StudentSessionReport {
  attendance: { is_present: number | null; is_late: number; present_at: string | null };
  activity: { positive_count: number; negative_count: number; positive_points: number; negative_points: number; net_points: number };
  homework: { total_count: number; passed_count: number; average_grade: number };
}

// ---- Evaluation elements ----
export interface EvaluationElement {
  id: number;
  subject_id: number;
  name: string;
  max_degree: number;
}

export interface EvaluationElementsByPhase {
  phase_1: EvaluationElement[];
  phase_2: EvaluationElement[];
}

export interface StudentEvaluation {
  group_id: number;
  phase_1: (EvaluationElement & { degree: number | null })[];
  phase_2: (EvaluationElement & { degree: number | null })[];
}

// ---- Skills ----
export type SkillStatus = "missing" | "improved";

export interface Skill {
  id: number;
  name: string;
  remedial_plan: string | null;
  students_answered: number;
  students_wrong: number;
  students_correct: number;
  wrong_percentage: number;
}

export interface SkillStudent {
  student_id: number;
  name: string;
  improved_at: string | null;
}

// ---- Reports ----
export interface MyReports {
  subscriptions_count: number;
  total_groups_count: number;
  students_count_in_all_groups: number;
  overall_statistics: { average_performance: number; highest_performance: number; lowest_performance: number; total_students_above_80: number; total_students_below_60: number };
  groups: GroupStatistics[];
  sessions: { total_count: number; completed_count: number; pending_count: number; prepared_count: number; not_prepared_count: number; average_duration_minutes: number };
}

// ---- Notifications ----
export interface AppNotification {
  id: number;
  title: string;
  body: string;
  image: string | null;
  created_at: string;
  read_at: string | null;
}

export interface NotificationsPage {
  notifications: AppNotification[];
  paginate: Paginate;
  unread_notifications_count?: number;
}

// ---- Cart & payments ----
export interface CatalogPlan {
  subject_category_id: number;
  months: number;
  price: string;
  name: string;
}

export interface CatalogCategory extends Named {
  img: string | null;
  plans: CatalogPlan[];
}

export interface Coupon {
  id: number;
  code: string;
  name: string;
  type: "percentage" | "fixed";
  value: string;
  starts_at: string;
  expires_at: string;
}

export interface UsedCoupon {
  id: number;
  coupon_id: number;
  code: string;
  name: string;
  discount_amount: string;
  used_at: string;
}

export interface CartItem {
  id: number;
  subject_category_id: number;
  item_name: string;
  item_price: string;
  months: number;
}

export interface Cart {
  id: number;
  coupon_code: string | null;
  coupon_name: string | null;
  price: number;
  discount_amount: number;
  amount_before_tax: number;
  tax_rate: number;
  tax_value: number;
  total_price: number;
  discount_percentage: string;
  items: CartItem[];
}

export interface CartView {
  cart: Cart | null;
  available_coupons: Coupon[];
}

export interface TransactionSummary {
  id: number;
  total_amount_with_tax: string;
  created_at: string;
  discount_percentage: string;
}

export interface TransactionDetails extends TransactionSummary {
  transaction_id: string;
  gateway: string;
  coupon: string | null;
  coupon_discount: string;
  amount: string;
  tax_rate: number;
  tax_value: string;
  teacher_name: string;
  teacher_phone: string;
  items: { id: number; item_name: string; item_price: string; months: number }[];
}

// ---- Support & content ----
export type TicketStatus = "pending" | "in_progress" | "closed";

export interface Ticket {
  id: number;
  ticket_number: string;
  category: string;
  subject: string;
  message: string;
  priority: string;
  status: TicketStatus;
  created_at: string;
}

export interface TicketReply {
  id: number;
  sender_type: "teacher" | "admin";
  message: string;
  attachment: string | null;
  created_at: string;
}

export interface FaqCategory extends Named {
  faqs_count: number;
}

export interface Faq {
  id: number;
  faq_category_id: number;
  question: string;
  answer: string;
}

export interface ContentPage {
  title: string;
  content: string;
}

export interface SocialMedia {
  name: string;
  email: string | null;
  whatsapp: string | null;
  twitter: string | null;
  instagram: string | null;
  snapchat: string | null;
  tiktok: string | null;
  youtube: string | null;
  linkedIn: string | null;
}

// ---- Portfolio (the achievement JSON file, same format as the app) ----
export interface PortfolioItem {
  type: "text" | "image" | "video" | "pdf";
  title: string;
  content?: string;
  url?: string;
  note_date?: string;
}

export interface PortfolioFolder {
  id: string;
  name: string;
  subFolders: PortfolioFolder[];
  items?: PortfolioItem[];
}

export interface PortfolioPayload {
  teacher_id: string;
  achievement: {
    title: string;
    folders: PortfolioFolder[];
    daily_report_data: Record<string, string>;
  };
}

export interface PortfolioConstants {
  grouped_constants: Record<string, { id: number; section: string; content: string }[]>;
  sections: Record<string, string>;
}
