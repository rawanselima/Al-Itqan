/**
 * buildReport.ts
 * دالة نقية (Pure function) مسؤولة عن حساب وبناء تقرير الحضور والواجبات.
 * لا تحتوي على أي استعلامات لقاعدة البيانات أو دوال خارجية معتمدة على الـ I/O.
 * تعتمد حصرياً على دوال التاريخ بصيغة UTC لتجنب أي مشاكل مع التوقيت المحلي أو التوقيت الصيفي.
 */

export const SYMBOLS = {
  done: '✅',
  notDone: '❗',
  partial: '☑️',
  present: '⭐',
  absent: '🛑',
  excused: '🤚🏻',
  holiday: '➖',
  notRecorded: '▫️',
  awardHomework: '🏆',
  awardFull: '🏅',
  warning: '⚠️',
} as const;

export const WEEK_NUMBER_ICONS = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣'];

export interface StudentInput {
  _id: string;
  name: string;
  phone?: string;
  joinedAt?: string; // YYYY-MM-DD
  leftAt?: string | null; // YYYY-MM-DD
  warningForRemoval?: boolean;
}

export interface AttendanceRecordInput {
  studentId: string;
  status: 'present' | 'absent' | 'excused';
  hasRecited?: boolean;
}

export interface AttendanceSessionInput {
  _id?: string;
  circleId: string;
  date: string; // YYYY-MM-DD
  isHoliday?: boolean;
  records?: AttendanceRecordInput[];
}

export interface HomeworkRecordInput {
  _id?: string;
  studentId: string;
  circleId: string;
  date: string; // YYYY-MM-DD
  status: 'done' | 'notDone' | 'partial';
}

export interface HolidayInput {
  _id?: string;
  circleId?: string | null;
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  reason?: string;
}

export interface CircleInput {
  _id: string;
  name: string;
  teacherName?: string;
  days?: number[]; // [0..6] حيث 0 الأحد و 6 السبت
  time?: string;
}

export interface BuildReportInput {
  from: string; // YYYY-MM-DD
  to: string; // YYYY-MM-DD
  circle: CircleInput;
  students: StudentInput[];
  sessions?: AttendanceSessionInput[];
  homework?: HomeworkRecordInput[];
  holidays?: HolidayInput[];
  today?: string; // YYYY-MM-DD
}

export interface ReportWarning {
  studentName: string;
  date: string;
  type: 'homework' | 'attendance';
}

export interface StudentWeekResult {
  weekIndex: number;
  weekIcon: string;
  startDate: string;
  endDate: string;
  symbols: string;
  award: '🏆' | '🏅' | null;
}

export interface StudentReportResult {
  studentId: string;
  name: string;
  warningForRemoval: boolean;
  attendanceSymbols: string;
  weeks: StudentWeekResult[];
}

export interface BuiltReportResult {
  empty: boolean;
  circle: CircleInput;
  from: string;
  to: string;
  weeksCount: number;
  students: StudentReportResult[];
  warnings: ReportWarning[];
  usedSymbols: Set<string>;
}

// =================== دوال مساعدة للتواريخ بـ UTC ===================

/**
 * تحويل نص YYYY-MM-DD إلى Date في توقيت UTC
 */
export function parseUTCDate(dateStr: string): Date {
  return new Date(`${dateStr}T00:00:00Z`);
}

/**
 * استخراج نص YYYY-MM-DD من Date بـ UTC
 */
export function formatUTCDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * إضافة عدد أيام إلى تاريخ بـ UTC
 */
export function addUTCDays(date: Date, days: number): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() + days));
}

/**
 * فحص ما إذا كان التاريخ يقع ضمن إجازة رسمية خاصة بالحلقة أو عامة
 */
export function isHolidayDate(dateStr: string, circleId: string, holidays: HolidayInput[] = []): boolean {
  return holidays.some((h) => {
    const isMatchingCircle = !h.circleId || String(h.circleId) === String(circleId);
    return isMatchingCircle && dateStr >= h.from && dateStr <= h.to;
  });
}

/**
 * معرف السبت الذي يبدأ منه الأسبوع (Week Anchor)
 * الأسبوع يبدأ السبت (getUTCDay() === 6).
 */
export function getSaturdayOfWeek(date: Date): Date {
  const day = date.getUTCDay();
  // لو السبت -> 0. لو الأحد (0) -> -1. لو الإثنين (1) -> -2 ... لو الجمعة (5) -> -6
  const diff = day === 6 ? 0 : -(day + 1);
  return addUTCDays(date, diff);
}

// =================== الدالة الأساسية buildReport ===================

export function buildReport({
  from,
  to,
  circle,
  students,
  sessions = [],
  homework = [],
  holidays = [],
  today = formatUTCDate(new Date()),
}: BuildReportInput): BuiltReportResult {
  // 1. إذا كانت الحلقة لا تحتوي على طالبات
  if (!students || students.length === 0) {
    return {
      empty: true,
      circle,
      from,
      to,
      weeksCount: 0,
      students: [],
      warnings: [],
      usedSymbols: new Set<string>(),
    };
  }

  const warnings: ReportWarning[] = [];
  const usedSymbols = new Set<string>();

  // 2. خرائط بحث سريعة (Maps) لتجنب الحلقات التكرارية O(n^2)
  const homeworkMap = new Map<string, 'done' | 'notDone' | 'partial'>();
  for (const hw of homework) {
    homeworkMap.set(`${hw.studentId}_${hw.date}`, hw.status);
  }

  // 3. بناء التقويم يوم بيوم من from إلى to
  // وتجميع أيام الواجب (السبت..الخميس، باستثناء الجمعة) في أسابيع
  interface DayInfo {
    dateStr: string;
    dayOfWeek: number;
    isHoliday: boolean;
  }

  interface RawWeek {
    satKey: string;
    days: DayInfo[];
  }

  const rawWeeksMap = new Map<string, DayInfo[]>();
  const weekKeysOrder: string[] = [];

  let cur = parseUTCDate(from);
  const end = parseUTCDate(to);

  while (cur <= end) {
    const dateStr = formatUTCDate(cur);
    const dayOfWeek = cur.getUTCDay();

    // يوم الجمعة (5) مستبعد نهائياً من الواجب
    if (dayOfWeek !== 5) {
      const sat = getSaturdayOfWeek(cur);
      const satKey = formatUTCDate(sat);

      if (!rawWeeksMap.has(satKey)) {
        rawWeeksMap.set(satKey, []);
        weekKeysOrder.push(satKey);
      }

      // الإجازات تطبق على جلسات الحلقة فقط ولا تؤثر على أيام الواجب في التقرير
      rawWeeksMap.get(satKey)!.push({
        dateStr,
        dayOfWeek,
        isHoliday: false,
      });
    }

    cur = addUTCDays(cur, 1);
  }

  // 4. تصفية الأسابيع:
  // كل أسبوع يحتوي على يوم واجب واحد على الأقل (السبت..الخميس) يدخل في الترقيم
  interface FilteredWeek {
    index: number;
    icon: string;
    satKey: string;
    days: DayInfo[];
    startDate: string;
    endDate: string;
  }

  const activeWeeks: FilteredWeek[] = [];
  let weekCounter = 0;

  for (const satKey of weekKeysOrder) {
    const days = rawWeeksMap.get(satKey) || [];
    if (days.length > 0) {
      weekCounter++;
      activeWeeks.push({
        index: weekCounter,
        icon: WEEK_NUMBER_ICONS[weekCounter - 1] || `${weekCounter}️⃣`,
        satKey,
        days,
        startDate: days[0].dateStr,
        endDate: days[days.length - 1].dateStr,
      });
    }
  }

  // 5. تصفية وترتيب جلسات الحضور للحلقة
  // - تقع بين from و to
  // - ليست في يوم إجازة رسمية
  // - مرتبة تصاعدياً حسب التاريخ
  const validSessions = sessions
    .filter((s) => {
      if (String(s.circleId) !== String(circle._id)) return false;
      if (s.date < from || s.date > to) return false;
      if (s.isHoliday) return false;
      if (isHolidayDate(s.date, circle._id, holidays)) return false;
      return true;
    })
    .sort((a, b) => a.date.localeCompare(b.date));

  // 6. بناء بيانات كل طالبة
  const studentsResults: StudentReportResult[] = students.map((st) => {
    // تاريخ الانضمام والمغادرة
    let studentJoinedAt = st.joinedAt || '0000-00-00';
    // إذا كان تاريخ الانضمام محدد ولكن توجد سجلات أقدم منه في قاعدة البيانات، نعتمد أقدم سجل
    if (st.joinedAt) {
      for (const session of validSessions) {
        if (session.records?.some((r) => String(r.studentId) === String(st._id))) {
          if (session.date < studentJoinedAt) {
            studentJoinedAt = session.date;
          }
        }
      }
      for (const [key] of homeworkMap.entries()) {
        if (key.startsWith(`${st._id}_`)) {
          const d = key.split('_')[1];
          if (d < studentJoinedAt) {
            studentJoinedAt = d;
          }
        }
      }
    }
    const studentLeftAt = st.leftAt || null;

    // علامة التحذير بالحذف
    if (st.warningForRemoval) {
      usedSymbols.add(SYMBOLS.warning);
    }

    // أ) حساب رموز الحضور
    // تظهر فقط جلسات الحلقات الواقعة ضمن الأسابيع التي انتهت بالفعل (week.endDate <= today)
    const completedWeeks = activeWeeks.filter((w) => w.endDate <= today);
    let attendanceSymbols = '';

    for (const session of validSessions) {
      // فحص هل تقع الجلسة في أسبوع منتهٍ بالفعل
      const isSessionInCompletedWeek = completedWeeks.some((w) => {
        // يشمل أيام الأسبوع والجمعة التي تليه (إن عُقدت فيها جلسة)
        const nextDayAfterEnd = formatUTCDate(addUTCDays(parseUTCDate(w.endDate), 1));
        return session.date >= w.startDate && session.date <= nextDayAfterEnd;
      });

      if (!isSessionInCompletedWeek) {
        // الجلسة تقع في أسبوع لم ينتهِ بعد -> لا تُعرض في التقرير
        continue;
      }

      const rec = session.records?.find((r) => String(r.studentId) === String(st._id));

      // إذا كانت الجلسة قبل انضمام الطالبة ولا يوجد سجل حضور لها، لا تُحسب
      if (!rec && session.date < studentJoinedAt) continue;
      if (!rec && studentLeftAt && session.date > studentLeftAt) continue;

      if (rec) {
        if (rec.status === 'present') {
          attendanceSymbols += SYMBOLS.present;
          usedSymbols.add(SYMBOLS.present);
        } else if (rec.status === 'absent') {
          attendanceSymbols += SYMBOLS.absent;
          usedSymbols.add(SYMBOLS.absent);
        } else if (rec.status === 'excused') {
          attendanceSymbols += SYMBOLS.excused;
          usedSymbols.add(SYMBOLS.excused);
        }
      } else {
        // جلسة ماضية للطالبة في أسبوع منتهٍ لم يُسجل لها حضور -> غياب 🛑
        attendanceSymbols += SYMBOLS.absent;
        usedSymbols.add(SYMBOLS.absent);
      }
    }

    // ب) حساب البطاقة اليومية لكل أسبوع
    const studentWeeks: StudentWeekResult[] = activeWeeks.map((week) => {
      let weekSymbols = '';
      let evaluatedDaysCount = 0;
      let allDone = true;
      let award: '🏆' | '🏅' | null = null;

      // إذا لم ينتهِ الأسبوع بعد (تاريخ نهاية الأسبوع في المستقبل بالنسبة لـ today)
      // يترك سطر الأسبوع فارغاً (يظهر رقم الأسبوع فقط دون رموز أو أوسمة)
      if (week.endDate > today) {
        return {
          weekIndex: week.index,
          weekIcon: week.icon,
          startDate: week.startDate,
          endDate: week.endDate,
          symbols: '',
          award: null,
        };
      }

      // الأسبوع انتهى بالفعل: نقيم جميع أيامه
      for (const day of week.days) {
        const hasHomeworkRecord = homeworkMap.has(`${st._id}_${day.dateStr}`);

        // فحص انضمام الطالبة: إذا لم يكن هناك سجل مدخل وكان اليوم قبل الانضمام أو بعد المغادرة
        if (!hasHomeworkRecord && (day.dateStr < studentJoinedAt || (studentLeftAt && day.dateStr > studentLeftAt))) {
          // لم تكن مسجلة في هذا اليوم
          continue;
        }

        // يوم مطلوب فيه واجب في الأسبوع المنتهي (الإجازات لا تؤثر على الواجب ولا تظهر كرمز)
        evaluatedDaysCount++;
        const status = homeworkMap.get(`${st._id}_${day.dateStr}`);

        if (status === 'done') {
          weekSymbols += SYMBOLS.done;
          usedSymbols.add(SYMBOLS.done);
        } else if (status === 'partial') {
          weekSymbols += SYMBOLS.partial;
          usedSymbols.add(SYMBOLS.partial);
          allDone = false;
        } else {
          // الواجب الذي لم يُعلّم عليه يعتبر لم يتم ونضع !
          weekSymbols += SYMBOLS.notDone;
          usedSymbols.add(SYMBOLS.notDone);
          allDone = false;
        }
      }

      // ج) حساب الأوسمة (Award 🏅 أو 🏆) للأسبوع المنتهي
      // شرط الحصول على وسام:
      // أن يكون هناك على الأقل يوم واجب مقيّم، وجميع الأيام المقيّمة تمت بنجاح (allDone === true)
      if (evaluatedDaysCount > 0 && allDone) {
        // فحص الحضور خلال هذا الأسبوع (من بداية أيام هذا الأسبوع حتى نهايته)
        const weekSessions = validSessions.filter(
          (s) =>
            s.date >= week.startDate &&
            s.date <= week.endDate &&
            s.date >= studentJoinedAt &&
            (!studentLeftAt || s.date <= studentLeftAt)
        );

        let hasAbsenceOrExcuse = false;
        let presentSessionsCount = 0;

        for (const ws of weekSessions) {
          const rec = ws.records?.find((r) => String(r.studentId) === String(st._id));
          if (!rec || rec.status !== 'present') {
            hasAbsenceOrExcuse = true;
          } else {
            presentSessionsCount++;
          }
        }

        // لو عُقدت جلسات وحضرت الطالبة كل جلسات الأسبوع بنجاح (⭐) -> 🏅 (اتمتت المهام والحضور)
        if (weekSessions.length > 0 && !hasAbsenceOrExcuse && presentSessionsCount === weekSessions.length) {
          award = SYMBOLS.awardFull;
          usedSymbols.add(SYMBOLS.awardFull);
        } else {
          // أتمت عمل مهام الواجب كاملة (ولكن اعتذرت أو غابت أو لم تعقد جلسات في هذا الأسبوع) -> 🏆 (اتمتت عمل المهام)
          award = SYMBOLS.awardHomework;
          usedSymbols.add(SYMBOLS.awardHomework);
        }
      }

      return {
        weekIndex: week.index,
        weekIcon: week.icon,
        startDate: week.startDate,
        endDate: week.endDate,
        symbols: weekSymbols,
        award,
      };
    });

    return {
      studentId: st._id,
      name: st.name,
      warningForRemoval: Boolean(st.warningForRemoval),
      attendanceSymbols,
      weeks: studentWeeks,
    };
  });

  return {
    empty: false,
    circle,
    from,
    to,
    weeksCount: activeWeeks.length,
    students: studentsResults,
    warnings,
    usedSymbols,
  };
}
