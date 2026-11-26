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
import { validate, asyncHandler } from '../middleware';
import {
  monthlyReportQuerySchema,
  homeworkReportQuerySchema,
} from '../schemas';

const router = Router();

// Helper to get formatted date string YYYY-MM-DD
function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// GET /api/reports/homework - Monthly homework & attendance report for WhatsApp
router.get(
  '/homework',
  validate({ query: homeworkReportQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId } = req.query;
    let { from, to, year, month } = req.query;

    // If year and month provided, calculate full month range
    if (year && month) {
      const y = parseInt(String(year), 10);
      const m = parseInt(String(month), 10);
      from = new Date(Date.UTC(y, m - 1, 1)).toISOString().slice(0, 10);
      to = new Date(Date.UTC(y, m, 0)).toISOString().slice(0, 10);
    } else if (!from || !to) {
      // Default to current month
      const now = new Date();
      const y = now.getFullYear();
      const m = now.getMonth();
      from = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
      to = new Date(Date.UTC(y, m + 1, 0)).toISOString().slice(0, 10);
    }

    if (String(from) > String(to)) {
      return res.status(400).json({ error: 'تاريخ البداية (from) لا يمكن أن يكون بعد تاريخ النهاية (to)' });
    }

    // Fetch circle data
    const circle = await Circle.findById(circleId).lean();
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة المطلوبة غير موجودة' });
    }

    // Parallel queries for performance
    const [students, sessions, homework, holidays, settings] = await Promise.all([
      Student.find({ circleId, isActive: true, deletedAt: null }).sort({ name: 1 }).lean(),
      AttendanceSession.find({ circleId, date: { $gte: from, $lte: to } }).lean(),
      HomeworkRecord.find({ circleId, date: { $gte: from, $lte: to } }).lean(),
      Holiday.find({ $or: [{ circleId: null }, { circleId }] }).lean(),
      Settings.findOne().lean(),
    ]);

    // Build report using pure function
    const report = buildReport({
      from: String(from),
      to: String(to),
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

    // Generate WhatsApp-ready text (بدون عرض الإجازات في التقرير الشهري)
    const text = renderReportText(report, {
      supervisorName: settings?.supervisorName || 'امل طاهر',
      introText: settings?.introText,
      outroText: settings?.outroText,
      circleName: circle.name,
    });

    res.json({
      report: {
        ...report,
        usedSymbols: Array.from(report.usedSymbols), // Convert Set to Array for JSON
      },
      warnings: report.warnings,
      text,
    });
  })
);

// GET monthly report for a circle - divided into calendar weeks
router.get(
  '/monthly',
  validate({ query: monthlyReportQuerySchema.shape.query }),
  asyncHandler(async (req: Request, res: Response) => {
    const { circleId, year, month } = req.query;
    const y = parseInt(String(year), 10);
    const m = parseInt(String(month), 10); // 1-indexed (1 = January)

    const circle = await Circle.findById(circleId);
    if (!circle) {
      return res.status(404).json({ error: 'الحلقة غير موجودة' });
    }

    const students = await Student.find({ circleId, isActive: true, deletedAt: null }).sort({ name: 1 });

    // Calculate month boundaries using UTC
    const firstDay = new Date(Date.UTC(y, m - 1, 1));
    const lastDay = new Date(Date.UTC(y, m, 0));

    const startMonthStr = firstDay.toISOString().slice(0, 10);
    const endMonthStr = lastDay.toISOString().slice(0, 10);

    // Fetch all attendance sessions, homework records, and holidays in parallel
    const [rawAttendanceSessions, homeworkRecords, holidays] = await Promise.all([
      AttendanceSession.find({
        circleId,
        date: { $gte: startMonthStr, $lte: endMonthStr },
      }),
      HomeworkRecord.find({
        circleId,
        date: { $gte: startMonthStr, $lte: endMonthStr },
      }),
      Holiday.find({
        $or: [{ circleId: null }, { circleId }],
      }).lean(),
    ]);

    // استبعاد جلسات الإجازات تماماً من التقرير الشهري حتى لا تُحسب ولا تظهر
    const isHolidayDay = (dateStr: string) =>
      holidays.some((h: any) => dateStr >= h.from && dateStr <= h.to);

    const attendanceSessions = rawAttendanceSessions.filter(
      (session) => !session.isHoliday && !isHolidayDay(session.date)
    );

    // Divide month into actual calendar weeks (Saturday to Thursday, no Friday)
    // Weeks are strictly contained within the month (no spillover from adjacent months)
    const rawWeeksMap = new Map<string, Array<{ dateStr: string; dayOfWeek: number }>>();
    const satKeysOrder: string[] = [];

    let curDate = new Date(Date.UTC(y, m - 1, 1));
    const endDateObj = new Date(Date.UTC(y, m, 0));

    while (curDate <= endDateObj) {
      const dayOfWeek = curDate.getUTCDay();
      // Exclude Friday (5)
      if (dayOfWeek !== 5) {
        // Calculate Saturday of this week
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

    const todayStr = new Date().toISOString().slice(0, 10);

    // Build per-student report
    const studentReports = students.map((st) => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalExcused = 0;
      let totalRecited = 0;
      let totalHomeworkDays = 0;

      // Attendance history across all sessions
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

        // Homework days strictly within this month (excluding Friday and adjacent month days)
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
            badge = 'medal'; // 🏅 Completed tasks and attendance
          } else {
            badge = 'trophy'; // 🏆 Completed tasks
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
  })
);

export default router;