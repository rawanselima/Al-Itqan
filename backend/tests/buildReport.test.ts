import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildReport, SYMBOLS } from '../src/utils/buildReport';
import { renderReportText } from '../src/utils/renderReportText';

describe('buildReport & renderReportText - 16 Test Cases', () => {
  const dummyCircle = {
    _id: 'circle1',
    name: 'حلقة ربع البقرة',
    teacherName: 'سماح أبو الخير',
    days: [0, 2], // الأحد والثلاثاء
  };

  const student1 = {
    _id: 'st1',
    name: 'هيام إبراهيم خليل',
  };

  // 1. شهر بيبدأ جمعة وفيه 6 أسابيع: أول أسبوع يتشال والترقيم يبدأ من 1
  it('Case 1: Month starting on Friday (e.g. March 2024) drops empty first week and re-numbers from 1', () => {
    // 2024-03-01 is Friday (day 5)
    const res = buildReport({
      from: '2024-03-01',
      to: '2024-03-31',
      circle: dummyCircle,
      students: [student1],
      today: '2024-03-31',
    });

    assert.strictEqual(res.empty, false);
    // الجمعة وحدها ليس فيها أيام واجب، فالأسبوع الأول سقط وبدأ الترقيم من الأسبوع التالي
    assert.ok(res.weeksCount > 0);
    assert.strictEqual(res.students[0].weeks[0].weekIndex, 1);
    assert.strictEqual(res.students[0].weeks[0].weekIcon, '1️⃣');
    // أول أسبوع فعلي يبدأ بالسبت 2024-03-02
    assert.strictEqual(res.students[0].weeks[0].startDate, '2024-03-02');
  });

  // 2. شهر 5 أسابيع كاملة
  it('Case 2: Month with 5 active weeks produces exactly 5 weeks', () => {
    // نوفمبر 2026: يبدأ الأحد 1/11 وينتهي الإثنين 30/11 (5 أسابيع تقويمية)
    const res = buildReport({
      from: '2026-11-01',
      to: '2026-11-30',
      circle: dummyCircle,
      students: [student1],
      today: '2026-11-30',
    });

    assert.strictEqual(res.weeksCount, 5);
    assert.strictEqual(res.students[0].weeks.length, 5);
    assert.strictEqual(res.students[0].weeks[4].weekIndex, 5);
    assert.strictEqual(res.students[0].weeks[4].weekIcon, '5️⃣');
  });

  // 3. أسبوع أول فيه 3 أيام واجب بس: يطلع 3 خانات
  it('Case 3: First week with 3 homework days only produces 3 symbols', () => {
    // أكتوبر 2024: يبدأ الثلاثاء 2024-10-01 (الثلاثاء، الأربعاء، الخميس = 3 أيام واجب)
    const homework = [
      { studentId: 'st1', circleId: 'circle1', date: '2024-10-01', status: 'done' as const },
      { studentId: 'st1', circleId: 'circle1', date: '2024-10-02', status: 'done' as const },
      { studentId: 'st1', circleId: 'circle1', date: '2024-10-03', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2024-10-01',
      to: '2024-10-03',
      circle: dummyCircle,
      students: [student1],
      homework,
      today: '2024-10-03',
    });

    const week1 = res.students[0].weeks[0];
    assert.strictEqual(week1.symbols, `${SYMBOLS.done}${SYMBOLS.done}${SYMBOLS.done}`);
  });

  // 4. الإجازات لا تؤثر على الواجبات ولا تظهر في التقرير الشهري إطلاقاً
  it('Case 4: Holidays do not affect homework symbols and do not appear in report', () => {
    // أسبوع يبدأ السبت 2026-11-07 إلى الخميس 2026-11-12
    // إجازة من الإثنين 2026-11-09 إلى الأربعاء 2026-11-11
    const holidays = [
      { circleId: null, from: '2026-11-09', to: '2026-11-11', reason: 'عطلة رسمية' },
    ];

    const homework = [
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-07', status: 'done' as const },
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-08', status: 'done' as const },
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-09', status: 'done' as const },
      // 10, 11 لم يُسجّل لهم واجب -> يظهر ❗
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-12', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [student1],
      homework,
      holidays,
      today: '2026-11-12',
    });

    const week = res.students[0].weeks[0];
    // الإجازات لا تحول أيام الواجب إلى ➖ ولا تظهر في الرموز المستخدمة
    const expected = `${SYMBOLS.done}${SYMBOLS.done}${SYMBOLS.done}${SYMBOLS.notDone}${SYMBOLS.notDone}${SYMBOLS.done}`;
    assert.strictEqual(week.symbols, expected);
    assert.strictEqual(res.usedSymbols.has(SYMBOLS.holiday), false);
    assert.strictEqual(res.warnings.length, 0);
  });

  // 5. أسبوع به إجازة كاملة يظل محسوباً في الواجبات بدون إسقاط أو فجوات
  it('Case 5: Week during holiday still preserves homework weeks without showing holiday symbols', () => {
    const holidays = [
      { circleId: null, from: '2026-11-14', to: '2026-11-19', reason: 'إجازة أسبوع كامل' },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-26',
      circle: dummyCircle,
      students: [student1],
      holidays,
      today: '2026-11-26',
    });

    // تبقى جميع الأسابيع الـ 3 موجودة للواجبات بدون إظهار الإجازة
    assert.strictEqual(res.weeksCount, 3);
    assert.strictEqual(res.students[0].weeks[0].weekIndex, 1);
    assert.strictEqual(res.students[0].weeks[1].weekIndex, 2);
    assert.strictEqual(res.students[0].weeks[2].weekIndex, 3);
    assert.strictEqual(res.usedSymbols.has(SYMBOLS.holiday), false);
  });

  // 6. يوم حلقة وقع في إجازة: مش موجود في رموز الحضور
  it('Case 6: Session date falling on a holiday is excluded from attendance symbols', () => {
    const sessions = [
      {
        circleId: 'circle1',
        date: '2026-11-08', // الأحد (عادي)
        records: [{ studentId: 'st1', status: 'present' as const }],
      },
      {
        circleId: 'circle1',
        date: '2026-11-10', // الثلاثاء (وقع في إجازة)
        records: [{ studentId: 'st1', status: 'absent' as const }],
      },
    ];

    const holidays = [
      { circleId: 'circle1', from: '2026-11-10', to: '2026-11-10', reason: 'عطلة خاصة' },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [student1],
      sessions,
      holidays,
      today: '2026-11-12',
    });

    // يجب أن يظهر فقط حضور جلسة 2026-11-08 (⭐) وتُستبعد جلسة 2026-11-10
    assert.strictEqual(res.students[0].attendanceSymbols, SYMBOLS.present);
  });

  // 7. إجازة لحلقة معينة مش بتأثر على حلقة تانية
  it('Case 7: Holiday for Circle A does not affect Circle B', () => {
    const circleB = { _id: 'circle2', name: 'حلقة أخرى' };
    const holidays = [
      { circleId: 'circle1', from: '2026-11-08', to: '2026-11-08', reason: 'خاصة بحلقة 1' },
    ];

    const resB = buildReport({
      from: '2026-11-07',
      to: '2026-11-08',
      circle: circleB,
      students: [student1],
      holidays,
      today: '2026-11-08',
    });

    // بالنسبة لـ circleB يوم 2026-11-08 ليس إجازة
    // بما أنه لم يُسجّل له واجب، سيظهر ❗ (notDone) وليس ➖
    assert.strictEqual(resB.students[0].weeks[0].symbols, `${SYMBOLS.notDone}${SYMBOLS.notDone}`);
  });

  // 8. طالبة انضمت في نص الشهر: الأيام قبل joinedAt مش موجودة
  it('Case 8: Student who joined mid-month does not have slots for days before joinedAt', () => {
    const studentLate = {
      _id: 'st_late',
      name: 'فاطمة محمد',
      joinedAt: '2026-11-10', // انضمت الثلاثاء
    };

    const homework = [
      { studentId: 'st_late', circleId: 'circle1', date: '2026-11-10', status: 'done' as const },
      { studentId: 'st_late', circleId: 'circle1', date: '2026-11-11', status: 'done' as const },
      { studentId: 'st_late', circleId: 'circle1', date: '2026-11-12', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [studentLate],
      homework,
      today: '2026-11-12',
    });

    // الأيام 7 و 8 و 9 قبل انضمامها لا تظهر، تظهر فقط 10 و 11 و 12 (3 رموز فقط)
    assert.strictEqual(res.students[0].weeks[0].symbols, `${SYMBOLS.done}${SYMBOLS.done}${SYMBOLS.done}`);
  });

  // 9. طالبة leftAt في نص الشهر: الأيام بعده مش موجودة
  it('Case 9: Student who left mid-month does not have slots for days after leftAt', () => {
    const studentLeft = {
      _id: 'st_left',
      name: 'مريم أحمد',
      joinedAt: '2026-11-01',
      leftAt: '2026-11-08', // غادرت الأحد
    };

    const homework = [
      { studentId: 'st_left', circleId: 'circle1', date: '2026-11-07', status: 'done' as const },
      { studentId: 'st_left', circleId: 'circle1', date: '2026-11-08', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [studentLeft],
      homework,
      today: '2026-11-12',
    });

    // تظهر فقط يومين (7 و 8 نوفمبر) وباقي الأسبوع لا يظهر
    assert.strictEqual(res.students[0].weeks[0].symbols, `${SYMBOLS.done}${SYMBOLS.done}`);
  });

  // 10. مفيش HomeworkRecord ليوم عدّى في أسبوع منتهٍ: يعتبر لم يتم وتوضع علامة ❗
  it('Case 10: Missing homework record for a past day shows ❗ and treats as not done', () => {
    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-07', // يوم واحد
      circle: dummyCircle,
      students: [student1],
      homework: [], // مفيش سجل
      today: '2026-11-08',
    });

    assert.strictEqual(res.students[0].weeks[0].symbols, SYMBOLS.notDone);
  });

  // 11. جلسة ملهاش record لطالبة: تعتبر غياب 🛑
  it('Case 11: Missing attendance record for a student in a session shows 🛑', () => {
    const sessions = [
      {
        circleId: 'circle1',
        date: '2026-11-08',
        records: [], // مفيش سجل للطالبة
      },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-08',
      circle: dummyCircle,
      students: [student1],
      sessions,
      today: '2026-11-09',
    });

    assert.strictEqual(res.students[0].attendanceSymbols, SYMBOLS.absent);
  });

  // 12. أسبوع لم ينتهِ بعد (week.endDate > today): تترك خانة الرموز فارغة
  it('Case 12: Ongoing week not yet finished leaves symbols empty', () => {
    // الأسبوع من السبت 2026-11-07 إلى الخميس 2026-11-12
    // اليوم هو الأحد 2026-11-08 (الأسبوع لم ينتهِ بعد)
    const homework = [
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-07', status: 'done' as const },
      { studentId: 'st1', circleId: 'circle1', date: '2026-11-08', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [student1],
      homework,
      today: '2026-11-08',
    });

    // الأسبوع لم ينتهِ بعد -> تترك خانة الرموز فارغة والأوسمة null
    assert.strictEqual(res.students[0].weeks[0].symbols, '');
    assert.strictEqual(res.students[0].weeks[0].award, null);
  });

  // 13. جلسة تعويض في يوم مش من أيام الحلقة: بتظهر
  it('Case 13: Compensation session on non-circle day is included chronologically', () => {
    // حلقة أيامها الأحد والثلاثاء، لكن عُقدت جلسة تعويض يوم الأربعاء 2026-11-11
    const sessions = [
      {
        circleId: 'circle1',
        date: '2026-11-08', // الأحد
        records: [{ studentId: 'st1', status: 'present' as const }],
      },
      {
        circleId: 'circle1',
        date: '2026-11-11', // الأربعاء (تعويض)
        records: [{ studentId: 'st1', status: 'present' as const }],
      },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-12',
      circle: dummyCircle,
      students: [student1],
      sessions,
      today: '2026-11-12',
    });

    // يظهر الحضور للجلسة العادية وجلسة التعويض
    assert.strictEqual(res.students[0].attendanceSymbols, `${SYMBOLS.present}${SYMBOLS.present}`);
  });

  // 14. وسام 🏆 و 🏅: حالات (كله done، واحد ناقص، واحد ▫️، معتذرة)
  it('Case 14: Award logic: 🏅 (all done + all attended), 🏆 (all done + excused), null (incomplete/missing)', () => {
    const students = [
      { _id: 's_full', name: 'كاملة الحضور والواجب' },
      { _id: 's_excused', name: 'كاملة الواجب لكن معتذرة' },
      { _id: 's_missing_hw', name: 'ناقصة واجب' },
      { _id: 's_unrecorded', name: 'لم يسجل لها واجب' },
    ];

    const dates = ['2026-11-07', '2026-11-08']; // السبت والأحد

    const homework: any[] = [];
    // s_full: كله done
    dates.forEach((d) => homework.push({ studentId: 's_full', circleId: 'circle1', date: d, status: 'done' }));
    // s_excused: كله done
    dates.forEach((d) => homework.push({ studentId: 's_excused', circleId: 'circle1', date: d, status: 'done' }));
    // s_missing_hw: يوم done ويوم notDone
    homework.push({ studentId: 's_missing_hw', circleId: 'circle1', date: dates[0], status: 'done' });
    homework.push({ studentId: 's_missing_hw', circleId: 'circle1', date: dates[1], status: 'notDone' });
    // s_unrecorded: يوم done ويوم بدون سجل
    homework.push({ studentId: 's_unrecorded', circleId: 'circle1', date: dates[0], status: 'done' });

    const sessions = [
      {
        circleId: 'circle1',
        date: '2026-11-08',
        records: [
          { studentId: 's_full', status: 'present' as const },
          { studentId: 's_excused', status: 'excused' as const }, // معتذرة
          { studentId: 's_missing_hw', status: 'present' as const },
          { studentId: 's_unrecorded', status: 'present' as const },
        ],
      },
    ];

    const res = buildReport({
      from: '2026-11-07',
      to: '2026-11-08',
      circle: dummyCircle,
      students,
      homework,
      sessions,
      today: '2026-11-08',
    });

    const sFullWeek = res.students.find((s) => s.studentId === 's_full')!.weeks[0];
    const sExcusedWeek = res.students.find((s) => s.studentId === 's_excused')!.weeks[0];
    const sMissingHwWeek = res.students.find((s) => s.studentId === 's_missing_hw')!.weeks[0];
    const sUnrecordedWeek = res.students.find((s) => s.studentId === 's_unrecorded')!.weeks[0];

    assert.strictEqual(sFullWeek.award, SYMBOLS.awardFull); // 🏅
    assert.strictEqual(sExcusedWeek.award, SYMBOLS.awardHomework); // 🏆
    assert.strictEqual(sMissingHwWeek.award, null);
    assert.strictEqual(sUnrecordedWeek.award, null);
  });

  // 15. حلقة بدون طالبات: empty: true
  it('Case 15: Circle with no students returns empty: true', () => {
    const res = buildReport({
      from: '2026-11-01',
      to: '2026-11-30',
      circle: dummyCircle,
      students: [],
    });

    assert.strictEqual(res.empty, true);
    assert.strictEqual(res.students.length, 0);

    const rendered = renderReportText(res);
    assert.ok(rendered.includes('لا توجد طالبات'));
  });

  // 16. شهر فبراير (28 و29 يوم)
  it('Case 16: February handles both leap (29 days) and non-leap (28 days) years', () => {
    // سنة كبيسة 2024 (29 يوم)
    const res2024 = buildReport({
      from: '2024-02-01',
      to: '2024-02-29',
      circle: dummyCircle,
      students: [student1],
      today: '2024-02-29',
    });
    assert.strictEqual(res2024.empty, false);
    assert.ok(res2024.weeksCount >= 4);

    // سنة عادية 2025 (28 يوم)
    const res2025 = buildReport({
      from: '2025-02-01',
      to: '2025-02-28',
      circle: dummyCircle,
      students: [student1],
      today: '2025-02-28',
    });
    assert.strictEqual(res2025.empty, false);
    assert.ok(res2025.weeksCount >= 4);
  });

  // فحص renderReportText وتنسيق رسالة الواتساب وتصفية الـ Legend
  it('renderReportText formats WhatsApp message correctly and filters unused symbols from legend', () => {
    const studentWithWarning = {
      _id: 'st_warn',
      name: 'عائشة علي',
      warningForRemoval: true,
    };

    const homework = [
      { studentId: 'st_warn', circleId: 'circle1', date: '2026-11-07', status: 'done' as const },
    ];

    const res = buildReport({
      from: '2026-11-01',
      to: '2026-11-30',
      circle: dummyCircle,
      students: [studentWithWarning],
      homework,
      today: '2026-11-07',
    });

    const rendered = renderReportText(res, {
      supervisorName: 'امل طاهر',
    });

    // التحقق من اسم الحلقة والمشرفة
    assert.ok(rendered.includes('*حلقة حلقة ربع البقرة*'));
    assert.ok(rendered.includes('*المشرفه امل طاهر*'));
    // التحقق من علامة التحذير بالحذف ⚠️ عند اسم الطالبة
    assert.ok(rendered.includes(`*اسم الطالبه :عائشة علي* ${SYMBOLS.warning}`));
    // التحقق من أن الـ legend تحتوي على ⚠️ لأنها مستخدمة
    assert.ok(rendered.includes('⚠️ تحذير بالحذف'));
    // التحقق من أن الـ legend لا تحتوي على 🛑 لأن لا توجد طالبة غائبة
    assert.ok(!rendered.includes('🛑 لم تحضر الحصه'));
  });
});
