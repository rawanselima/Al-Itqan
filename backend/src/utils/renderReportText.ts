/**
 * renderReportText.ts
 * دالة نقية لتحويل مخرجات buildReport إلى نص رسالة واتساب منسق تماماً.
 * تعرض في قائمة المصطلحات فقط الرموز التي تم استخدامها بالفعل في هذا التقرير.
 */

import { BuiltReportResult, SYMBOLS, HolidayInput } from './buildReport';

export interface RenderSettingsInput {
  supervisorName?: string;
  introText?: string;
  outroText?: string;
  holidays?: HolidayInput[];
  circleName?: string;
}

const DEFAULT_INTRO = `التقرير الأسبوعي والشهري
                  ‏﷽
۝ إِنَّ اللَّهَ وَمَلائِكَتَهُ يُصَلُّونَ عَلَى
النَّبِيِّ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا
عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا ۝ ﷺ`;

const DEFAULT_OUTRO = `جزاكم الله خيراً وبارك في همتكم العالية 🌸`;

const LEGEND_ITEMS = [
  { symbol: SYMBOLS.awardHomework, label: '🏆 اتمتت عمل المهام' },
  { symbol: SYMBOLS.awardFull, label: '🏅 اتمتت المهام والحضور' },
  { symbol: SYMBOLS.done, label: '✅ اتمت التعهد اليوم بالموعود' },
  { symbol: SYMBOLS.partial, label: '☑️ اتمت بعض المهام' },
  { symbol: SYMBOLS.notDone, label: '❗ لم تتم المهام' },
  { symbol: SYMBOLS.absent, label: '🛑 لم تحضر الحصه' },
  { symbol: SYMBOLS.present, label: '⭐ حضرت الحصه' },
  { symbol: SYMBOLS.warning, label: '⚠️ تحذير بالحذف' },
  { symbol: SYMBOLS.excused, label: '✋🏻 اعتذار عن الحلقه' },
];

export function renderReportText(
  report: BuiltReportResult,
  settings: RenderSettingsInput = {}
): string {
  if (report.empty) {
    return `لا توجد طالبات مسجلات في حلقة ${report.circle.name || ''}.`;
  }

  const supervisor = settings.supervisorName?.trim() || 'امل طاهر';
  const teacher = report.circle.teacherName?.trim() || 'معلمة الحلقة';
  const intro = settings.introText?.trim() || DEFAULT_INTRO;
  const outro = settings.outroText?.trim() || DEFAULT_OUTRO;

  // استخراج الشهر أو الفترة
  const fromParts = report.from.split('-');
  const toParts = report.to.split('-');
  let periodTitle = '';
  if (fromParts[0] === toParts[0] && fromParts[1] === toParts[1]) {
    const monthNum = parseInt(fromParts[1], 10);
    periodTitle = `*تقرير شهر*${monthNum}`;
  } else {
    periodTitle = `*تقرير الفترة من* ${report.from} *إلى* ${report.to}`;
  }

  const lines: string[] = [];

  // 1. المقدمة والبسملة
  lines.push(intro);
  lines.push('🎀🎀🎀🎀🎀🎀🎀');
  lines.push(`*حلقة ${report.circle.name}*`);
  lines.push(periodTitle);
  lines.push(`*المعلمة *${teacher}*`);
  lines.push(` *المشرفه ${supervisor}* \n`);

  // 2. قائمة الرموز المستخدمة فقط (Legend)
  const activeLegendLines: string[] = [];
  for (const item of LEGEND_ITEMS) {
    if (report.usedSymbols.has(item.symbol)) {
      activeLegendLines.push(item.label);
    }
  }

  lines.push('المتميزات👏👏👏👏');
  if (activeLegendLines.length > 0) {
    lines.push(activeLegendLines.join('\n'));
  }
  lines.push('__________________');

  // 3. تقرير كل طالبة
  report.students.forEach((st, idx) => {
    const studentNum = idx + 1;
    const warningSign = st.warningForRemoval ? ` ${SYMBOLS.warning}` : '';
    lines.push(`🎀${studentNum}- *اسم الطالبه :${st.name}*${warningSign}`);

    // الحضور
    const attStr = st.attendanceSymbols ? ` ${st.attendanceSymbols}` : ' -';
    lines.push(` *الحضور*${attStr}`);

    // البطاقة اليومية
    lines.push(' *البطاقة اليومية* ');
    st.weeks.forEach((w) => {
      const awardSign = w.award ? w.award : '';
      lines.push(`${w.weekIcon}${w.symbols}${awardSign}`);
    });

    lines.push(''); // سطر فارغ بين الطالبات
  });

  // 4. الخاتمة
  lines.push('🎀🎀🎀🎀🎀🎀🎀');
  lines.push(outro);

  return lines.join('\n');
}
