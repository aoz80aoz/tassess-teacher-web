// Every backend path, mirrored from the mobile app's ApiEndpoints
// (lib/core/network/api_endpoints.dart). Keep the two in sync.

export const Endpoints = {
  // Locations
  nationalitiesAndRegions: "/nationalitiesAndRegions",
  cities: "/cities",
  districts: "/districts",
  schools: "/schools",

  // Auth & profile
  login: "/teacher/loginByPhone",
  logout: "/teacher/logout",
  sendTeacherOtp: "/teacher/send/otp",
  verifyTeacherOtp: "/teacher/verify/otp",
  registerTeacher: "/teacher/register",
  forgotPassword: "/teacher/forgetPassword",
  getTeacherProfile: "/teacher/me",
  updateTeacherProfile: "/teacher/update/profile",
  changeTeacherPassword: "/teacher/update/password",
  deleteTeacherAccount: "/teacher/delete/account",

  // Cart & subscriptions
  cartStages: "/teacher/cart/stages",
  cartClassrooms: "/teacher/cart/classrooms",
  cartCategories: "/teacher/cart/categories",
  cartAddItem: "/teacher/cart/AddItem",
  cartView: "/teacher/cart/view/cart",
  cartRemoveItem: "/teacher/cart/remove/item",
  cartClear: "/teacher/cart/clear",
  cartApplyOrRemoveCoupon: "/teacher/cart/applyOrRemoveCoupon",
  cartPay: "/teacher/cart/pay",
  mySubscriptions: "/teacher/my/subscriptions",
  myCoupons: "/teacher/my/coupons",

  // Sessions
  classSessionShow: "/teacher/class_sessions/show",
  classSessionDelete: "/teacher/class_sessions/delete",
  classSessionUpdate: "/teacher/class_sessions/update",
  classSessionUpdateEducationalOutcome: "/teacher/class_sessions/update/educational/outcome",
  classSessionUpdateLessonObjectives: "/teacher/class_sessions/update/objectives",
  classSessionUpdatePreparation: "/teacher/class_sessions/update/preparation",
  classSessionCreate: "/teacher/class_sessions/create",
  classSessionUnitsAndLessons: "/teacher/class_sessions/units_and_lessons",
  classSessionQuestions: "/teacher/class_sessions/questions",
  classSessionQuestionsDelete: "/teacher/class_sessions/questions/delete",
  classSessionQuestionsCreate: "/teacher/class_sessions/questions/create",
  classSessionQuestionsUpdate: "/teacher/class_sessions/questions/update",
  classSessionQuestionsTaseese: "/teacher/class_sessions/questions/tasseese/questions",
  classSessionMarkAsPrepared: "/teacher/class_sessions/mark/as/prepared",
  classSessionMarkAsCompleted: "/teacher/class_sessions/mark/as/completed",
  classSessionStart: "/teacher/class_sessions/start",
  classSessionMindMaps: "/teacher/class_sessions/show/mindmap",
  classSessionMindMapDelete: "/teacher/class_sessions/delete/mindmap",
  classSessionMindMapUpload: "/teacher/class_sessions/upload/mindmap",
  classSessionAttendanceStudents: "/teacher/class_sessions/attendances/students",
  classSessionAttendanceAdd: "/teacher/class_sessions/attendances/add",
  classSessionActivityTypes: "/teacher/class_sessions/activities/types",
  classSessionActivityAdd: "/teacher/class_sessions/activities/add",
  classSessionActivityAddMultiple: "/teacher/class_sessions/activities/addMultiple",
  addStudentQuestions: "/teacher/class_sessions/activities/addStudentQuestions",
  classSessionDistributeStudents: "/teacher/class_sessions/distribute/students",
  getSessionStatistics: "/teacher/class_sessions/statistics",
  getStudentSessionReport: "/teacher/class_sessions/student/session/report",

  // Exams & homework
  groupExams: "/teacher/groups/exams",
  groupExamCreate: "/teacher/groups/exams/create",
  groupExamDelete: "/teacher/groups/exams/delete",
  createExamFromTasseese: "/teacher/groups/exams/create/from/tasseese",
  questionsByMultipleLessons: "/taseese/questions-by-multiple-lessons",
  studentExams: "/teacher/groups/exams/student",
  getExamResults: "/teacher/groups/exams/results/students",
  submitExamResults: "/teacher/groups/exams/results/submit",

  // Evaluation elements
  evaluationElementsSubject: "/teacher/evaluation-elements/subject",
  evaluationElementsGroup: "/teacher/evaluation-elements/group",
  evaluationElementsStore: "/teacher/evaluation-elements/store",
  evaluationElementsDelete: "/teacher/evaluation-elements/delete",
  evaluationElementsStudentGroups: "/teacher/evaluation-elements/student-groups",
  evaluationElementsAddStudentDegrees: "/teacher/evaluation-elements/add-student-degrees",
  evaluationElementsAddDegreeMultiple: "/teacher/evaluation-elements/add-degree-multiple",
  evaluationElementsExport: "/teacher/evaluation-elements/export",

  // Students
  studentBehaviours: "/teacher/students/student-behaviours",
  createStudent: "/teacher/students/create",
  getStudent: "/teacher/students/getStudent",
  taseeseStudentFullReport: "/teacher/students/taseese-full-report",
  getStudentsByClassroom: "/teacher/students/get/where/classroom",
  createStudentsFromExcel: "/teacher/students/CreateFromExcelFile",
  downloadDemoStudentsExcel: "/teacher/students/DownloadDemoExcelFile",
  teacherBadges: "/teacher/badges",
  teacherBadgesAssignMultipleStudents: "/teacher/badges/assign-multiple-students",
  teacherBadgesUpdateStudent: "/teacher/badges/update-student",
  teacherLearningPatterns: "/teacher/learning-patterns",
  teacherLearningPatternsUpdateStudent: "/teacher/learning-patterns/update-student-patterns",

  // Classrooms (groups) & subjects
  subjectsByCategory: "/teacher/subject_category/subjects",
  allGroups: "/teacher/groups",
  createGroup: "/teacher/groups/create",
  showGroup: "/teacher/groups/show",
  updateGroup: "/teacher/groups/update",
  deleteGroup: "/teacher/groups/delete",
  getGroupStudents: "/teacher/groups/students",
  deleteAllStudents: "/teacher/groups/delete/all/students",
  deleteStudent: "/teacher/groups/delete/student",
  addMultipleStudentsToGroup: "/teacher/groups/add/multiple/students",

  // Skills
  skillsGroup: "/teacher/skills/group",
  skillsGroupStudents: "/teacher/skills/group/students",
  skillsStudent: "/teacher/skills/student",
  skillsImprove: "/teacher/skills/improve",
  skillsDelete: "/teacher/skills/delete",

  // Home, reports, notifications
  home: "/teacher/home",
  academicCalendar: "/teacher/calendar/summary",
  myReports: "/teacher/my_reports",
  allNotifications: "/teacher/notifications",
  unreadNotifications: "/teacher/notifications/unread",
  markNotificationAsRead: "/teacher/notifications/mark/read",
  markAllNotificationsRead: "/teacher/notifications/mark/all/read",
  deleteAllNotifications: "/teacher/notifications/delete/all",
  deleteNotification: "/teacher/notifications/delete",

  // More
  faqCategories: "/teacher/faq/categories",
  faqsByCategory: "/teacher/faqs/by/category",
  helpCenter: "/teacher/support-tickets",
  helpCenterDetails: "/teacher/support-tickets/show",
  createHelpCenterReply: "/teacher/support-tickets/reply",
  createHelpCenter: "/teacher/support-tickets/create",
  helpCenterCategories: "/teacher/support-tickets/categories",
  transactions: "/teacher/my/transactions",
  transactionDetails: "/teacher/get/transaction",
  socialMedia: "/social_media",
  pageShow: "/show/page",
  appSettings: "/app-settings",

  // Portfolio
  uploadTeacherPortfolioFile: "/teacher/FilePortfolio/upload/file",
  uploadPortfolioJsonFile: "/teacher/FilePortfolio/upload/JsonFile",
  getPortfolioJsonFile: "/teacher/FilePortfolio/getJsonFile",
  exportPortfolioPdfFile: "/teacher/FilePortfolio/export/JsonFile",
  portfolioConstants: "/portfolio_constants",
  deletePortfolioFile: "/teacher/FilePortfolio/delete/file",
} as const;

export type Endpoint = (typeof Endpoints)[keyof typeof Endpoints];

/** Endpoints a signed-out visitor may call. Everything else needs a session. */
export const PUBLIC_ENDPOINTS: readonly string[] = [
  Endpoints.nationalitiesAndRegions,
  Endpoints.cities,
  Endpoints.districts,
  Endpoints.schools,
  Endpoints.login,
  Endpoints.sendTeacherOtp,
  Endpoints.verifyTeacherOtp,
  Endpoints.registerTeacher,
  Endpoints.forgotPassword,
  Endpoints.socialMedia,
  Endpoints.pageShow,
  Endpoints.appSettings,
  Endpoints.portfolioConstants,
];
