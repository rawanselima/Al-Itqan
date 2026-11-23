import { Router, Request, Response } from 'express';
import { z } from 'zod';
import Student from '../models/Student';
import AttendanceSession from '../models/AttendanceSession';
import HomeworkRecord from '../models/HomeworkRecord';
import Circle from '../models/Circle';
import Holiday from '../models/Holiday';
import Settings from '../models/Settings';
import { buildReport } from '../utils/buildReport';
import { renderReportText } from '../utils/renderReportText';

const router = Router();

// مخطط التحقق من معلمات التقرير باستخدام Zod
const homeworkReportQuerySchema = z.object({
  circleId: z.string().min(1, 'معرف الحلقة مطلوب'),
  from: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة تاريخ البداية يجب أن تكون YYYY-MM-DD')
    .optional(),
  to: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'صيغة تاريخ النهاية يجب أن تكون YYYY-MM-DD')
    .optional(),
});

// GET /api/reports/homework
// نقطة النهاية لتوليد تقرير الواجبات والحضور (أسبوعي أو شهري)
router.get('/homework', async (req: Request, res: Response) => {
  try {
    // 1. التحقق من المدخلات باستخدام Zod
    const parseResult = homeworkReportQuerySchema.safeParse(req.query);
    if (!parseResult.success) {
      return res.status(400).json({
        error: parseResult.error.issues?.[0]?.message || 'بيانات الاستعلام غير صالحة',
      });
    }

    const { circleId } = parseResult.data;
    let { from, to } = parseResult.data;

    // 2. إذا لم يتم تمرير from و to، يتم الافتراض على الشهر الحالي بالكامل
    if (!from || !to) {
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth(); // 0-indexed
      from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
    }

    if (from > to) {
      return res.status(400).json({ error: 'تاريخ البداية (from) لا يمكن أن يكون بعد تاريخ النهاية (to)' });
    }

    // 3. استعلام بيانات الحلقة
    const circle = await Circle.findById(circleId).lean();
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة المطلوبة غير موجودة' });
    }

    // 4. استعلامات موازية (Single query per collection)
    // نجلب فقط ما نحتاجه للفترة المحددة لتوفير الموارد
    const [students, sessions, homework, holidays, settings] = await Promise.all([
      Student.find({ circleId, isActive: true }).sort({ name: 1 }).lean(),
      AttendanceSession.find({
        circleId,
        date: { $gte: from, $lte: to },
      }).lean(),
      HomeworkRecord.find({
        circleId,
        date: { $gte: from, $lte: to },
      }).lean(),
      Holiday.find({
        $or: [{ circleId: null }, { circleId }],
      }).lean(),
      Settings.findOne().lean(),
    ]);

    // 5. استدعاء الدالة النقية buildReport
    const report = buildReport({
      from,
      to,
      circle: {
        _id: String(circle._id),
        name: circle.name,
        teacherName: circle.teacherName || circle.notes || 'معلمة الحلقة',
        days: circle.days as number[],
        time: circle.time,
      },
      students: students.map((s: any) => ({
        _id: String(s._id),
        name: s.name,
        joinedAt: s.joinedAt,
        leftAt: s.leftAt,
        warningForRemoval: Boolean(s.warningForRemoval),
      })),
      sessions: sessions.map((sess: any) => ({
        _id: String(sess._id),
        circleId: String(sess.circleId),
        date: sess.date,
        isHoliday: sess.isHoliday,
        records: (sess.records || []).map((r: any) => ({
          studentId: String(r.studentId),
          status: r.status,
          hasRecited: r.hasRecited,
        })),
      })),
      homework: homework.map((hw: any) => ({
        _id: String(hw._id),
        studentId: String(hw.studentId),
        circleId: String(hw.circleId),
        date: hw.date,
        status: hw.status,
      })),
      holidays: holidays.map((h: any) => ({
        _id: String(h._id),
        circleId: h.circleId ? String(h.circleId) : null,
        from: h.from,
        to: h.to,
        reason: h.reason,
      })),
      today: new Date().toISOString().slice(0, 10),
    });

    // 6. استدعاء الدالة النقية renderReportText لتوليد نص الواتساب الجاهز
    const text = renderReportText(report, {
      supervisorName: settings?.supervisorName || 'امل طاهر',
      introText: settings?.introText,
      outroText: settings?.outroText,
    });

    // 7. إرجاع النتيجة
    res.json({
      report: {
        ...report,
        usedSymbols: Array.from(report.usedSymbols), // تحويل Set إلى Array لتتوافق مع JSON
      },
      warnings: report.warnings,
      text,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'حدث خطأ في الخادم أثناء توليد التقرير' });
  }
});

// Helper to get formatted date string YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET monthly report for a circle
// Returns summary per student divided into 4-5 weeks:
// - Attendance breakdown per week (present, absent, excused)
// - Homework breakdown per week (days completed out of 6 Saturday..Thursday)
router.get('/monthly', async (req: Request, res: Response) => {
  try {
    const { circleId, year, month } = req.query;
    if (!circleId || !year || !month) {
      return res.status(400).json({ error: 'circleId و year و month حقول مطلوبة' });
    }

    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10); // 1-indexed (1 = January)

    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    const students = await Student.find({ circleId, isActive: true }).sort({ name: 1 });

    // Calculate dates of the month
    const firstDay = new Date(y, m - 1, 1);
    const lastDay = new Date(y, m, 0);

    const startMonthStr = formatDate(firstDay);
    const endMonthStr = formatDate(lastDay);

    // Fetch all attendance sessions in the month
    const attendanceSessions = await AttendanceSession.find({
      circleId,
      date: { $gte: startMonthStr, $lte: endMonthStr },
    });

    // Fetch all homework records in the month
    const homeworkRecords = await HomeworkRecord.find({
      circleId,
      date: { $gte: startMonthStr, $lte: endMonthStr },
    });

    // تقسيم الشهر إلى أسابيع تقويمية فعلية تبدأ من السبت وتستبعد الجمعة، ومحصورة بدقة داخل الشهر
    // الأيام التي تقع خارج الشهر (مثل 31 أكتوبر في بداية نوفمبر) لا تظهر نهائياً
    const rawWeeksMap = new Map<string, Array<{ dateStr: string; dayOfWeek: number }>>();
    const satKeysOrder: string[] = [];

    let curDate = new Date(Date.UTC(y, m - 1, 1));
    const endDateObj = new Date(Date.UTC(y, m, 0));

    while (curDate <= endDateObj) {
      const dayOfWeek = curDate.getUTCDay();
      // استبعاد الجمعة (5)
      if (dayOfWeek !== 5) {
        // حساب السبت الخاص بهذا الأسبوع
        const diff = dayOfWeek === 6 ? 0 : -(dayOfWeek + 1);
        const satDate = new Date(Date.UTC(curDate.getUTCFullYear(), curDate.getUTCMonth(), curDate.getUTCDate() + diff));
        const satKey = satDate.toISOString().slice(0, 10);
        const dateStr = curDate.toISOString().slice(0, 10);

        if (!rawWeeksMap.has(satKey)) {
          rawWeeksMap.set(satKey, []);
          satKeysOrder.push(satKey);
        }
        rawWeeksMap.get(satKey)!.push({ dateStr, dayOfWeek });
      }
      curDate = new Date(Date.UTC(curDate.getUTCFullYear(), curDate.getUTCMonth(), curDate.getUTCDate() + 1));
    }

    const weeks: Array<{
      weekNumber: number;
      name: string;
      startDate: string;
      endDate: string;
      days: string[];
    }> = [];

    let wCounter = 0;
    for (const satKey of satKeysOrder) {
      const daysInWeek = rawWeeksMap.get(satKey) || [];
      if (daysInWeek.length > 0) {
        wCounter++;
        weeks.push({
          weekNumber: wCounter,
          name: `الأسبوع ${wCounter === 1 ? 'الأول' : wCounter === 2 ? 'الثاني' : wCounter === 3 ? 'الثالث' : wCounter === 4 ? 'الرابع' : wCounter === 5 ? 'الخامس' : 'السادس'}`,
          startDate: daysInWeek[0].dateStr,
          endDate: daysInWeek[daysInWeek.length - 1].dateStr,
          days: daysInWeek.map((d) => d.dateStr),
        });
      }
    }

    const todayStr = formatDate(new Date());

    // Build per-student report
    const studentReports = students.map((st) => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalExcused = 0;
      let totalRecited = 0;
      let totalHomeworkDays = 0;

      // Extract attendance history across all sessions in the month
      const attendanceHistory = attendanceSessions
        .filter((session) => !session.isHoliday)
        .map((session) => {
          const rec = session.records.find((r) => String(r.studentId) === String(st._id));
          return {
            date: session.date,
            status: rec ? rec.status : 'unrecorded',
          };
        });

      const weeklyDetails: any[] = [];

      const weeklyStats = weeks.map((week) => {
        // Attendance in this week
        let weekPresent = 0;
        let weekAbsent = 0;
        let weekExcused = 0;
        let weekRecited = 0;

        attendanceSessions.forEach((session) => {
          if (session.date >= week.startDate && session.date <= week.endDate && !session.isHoliday) {
            const rec = session.records.find((r) => String(r.studentId) === String(st._id));
            if (rec) {
              if (rec.status === 'present') {
                weekPresent++;
                if (rec.hasRecited) weekRecited++;
              } else if (rec.status === 'absent') {
                weekAbsent++;
              } else if (rec.status === 'excused') {
                weekExcused++;
              }
            }
          }
        });

        // أيام الواجب المحصورة بدقة داخل هذا الشهر (باستثناء الجمعة وأيام الشهور الأخرى)
        const weekDays: Array<{ date: string; completed: boolean | null }> = [];
        for (const dateStr of week.days) {
          if (dateStr > todayStr) {
            weekDays.push({ date: dateStr, completed: null });
          } else {
            const hw = homeworkRecords.find(
              (h) => String(h.studentId) === String(st._id) && h.date === dateStr
            );
            const isCompleted = hw ? (hw.status === 'done' || (hw as any).completed === true) : false;
            weekDays.push({ date: dateStr, completed: isCompleted });
          }
        }

        const pastDays = weekDays.filter((d) => d.completed !== null);
        const completedDays = pastDays.filter((d) => d.completed === true).length;

        let badge: 'medal' | 'trophy' | null = null;
        if (pastDays.length > 0 && completedDays === pastDays.length) {
          if (weekAbsent === 0 && weekExcused === 0 && weekPresent > 0) {
            badge = 'medal'; // 🏅 اتمتت المهام والحضور
          } else {
            badge = 'trophy'; // 🏆 اتمتت عمل المهام
          }
        }

        weeklyDetails.push({
          weekNumber: week.weekNumber,
          weekName: week.name,
          startDate: week.startDate,
          endDate: week.endDate,
          days: weekDays,
          completedDays,
          badge,
        });

        const weekHwRecords = homeworkRecords.filter(
          (hw) =>
            String(hw.studentId) === String(st._id) &&
            hw.date >= week.startDate &&
            hw.date <= week.endDate &&
            (hw.status === 'done' || (hw as any).completed === true)
        );
        const weekHomeworkDays = weekHwRecords.length;

        totalPresent += weekPresent;
        totalAbsent += weekAbsent;
        totalExcused += weekExcused;
        totalRecited += weekRecited;
        totalHomeworkDays += weekHomeworkDays;

        return {
          weekNumber: week.weekNumber,
          weekName: week.name,
          startDate: week.startDate,
          endDate: week.endDate,
          present: weekPresent,
          absent: weekAbsent,
          excused: weekExcused,
          recited: weekRecited,
          homeworkDays: weekHomeworkDays,
        };
      });

      return {
        studentId: st._id,
        name: st.name,
        phone: st.phone,
        attendanceHistory,
        weeklyDetails,
        weeklyStats,
        totals: {
          present: totalPresent,
          absent: totalAbsent,
          excused: totalExcused,
          recited: totalRecited,
          homeworkDays: totalHomeworkDays,
        },
      };
    });

    res.json({
      circle: {
        _id: circle._id,
        name: circle.name,
        days: circle.days,
        time: circle.time,
      },
      year: y,
      month: m,
      weeks,
      students: studentReports,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
