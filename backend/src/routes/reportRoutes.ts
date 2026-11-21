import { Router, Request, Response } from 'express';
import Student from '../models/Student';
import AttendanceSession from '../models/AttendanceSession';
import HomeworkRecord from '../models/HomeworkRecord';
import Circle from '../models/Circle';

const router = Router();

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

    // Divide the month into 4 weeks (7 days each, week 4 absorbs remainder)
    const weeks: Array<{
      weekNumber: number;
      name: string;
      startDate: string;
      endDate: string;
    }> = [];

    let currentStart = 1;
    const totalDays = lastDay.getDate();

    for (let w = 1; w <= 4; w++) {
      const startD = new Date(y, m - 1, currentStart);
      let endDayNum = currentStart + 6;
      if (w === 4 || endDayNum > totalDays) {
        endDayNum = totalDays;
      }
      const endD = new Date(y, m - 1, endDayNum);

      weeks.push({
        weekNumber: w,
        name: `الأسبوع ${w === 1 ? 'الأول' : w === 2 ? 'الثاني' : w === 3 ? 'الثالث' : 'الرابع'}`,
        startDate: formatDate(startD),
        endDate: formatDate(endD),
      });

      currentStart = endDayNum + 1;
      if (currentStart > totalDays) break;
    }

    // Build per-student report
    const studentReports = students.map((st) => {
      let totalPresent = 0;
      let totalAbsent = 0;
      let totalExcused = 0;
      let totalRecited = 0;
      let totalHomeworkDays = 0;

      const weeklyStats = weeks.map((week) => {
        // Attendance in this week
        let weekPresent = 0;
        let weekAbsent = 0;
        let weekExcused = 0;
        let weekRecited = 0;

        attendanceSessions.forEach((session) => {
          if (session.date >= week.startDate && session.date <= week.endDate) {
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

        // Homework in this week
        const weekHwRecords = homeworkRecords.filter(
          (hw) =>
            String(hw.studentId) === String(st._id) &&
            hw.date >= week.startDate &&
            hw.date <= week.endDate &&
            hw.completed
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
