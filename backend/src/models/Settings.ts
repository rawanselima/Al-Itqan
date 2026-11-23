import mongoose, { Schema, Document } from 'mongoose';

export interface ISettings extends Document {
  supervisorName: string;
  introText: string;
  outroText: string;
  createdAt: Date;
  updatedAt: Date;
}

const defaultIntro = `                  ﷽
 إِنَّ اللَّهَ وَمَلائِكَتَهُ يُصَلُّونَ عَلَى
النَّبِيِّ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا
عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا  ﷺ`;

const defaultOutro = `لستُ .. أعرف نوع معاناتكٓم لكنيِ أعرف أنُ القرآن شفاء كل عناء
( إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا )`;

const SettingsSchema = new Schema<ISettings>(
  {
    supervisorName: { type: String, default: 'امل طاهر', trim: true },
    introText: { type: String, default: defaultIntro },
    outroText: { type: String, default: defaultOutro },
  },
  { timestamps: true }
);

export default mongoose.model<ISettings>('Settings', SettingsSchema);
