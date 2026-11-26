import mongoose from "mongoose";
import dotenv from "dotenv";
import path from "path";

// Load .env
dotenv.config({ path: path.resolve(__dirname, "../../.env") });
dotenv.config();

const MONGO_URI =
  process.env.MONGO_URI ||
  "mongodb+srv://rawanselima2_db_user:ufAPKbCJSS9vpU4@cluster0.kp1cmi2.mongodb.net/al_itqan?retryWrites=true&w=majority";

// جدول تحويل أسماء الأيام بالعربي إلى أرقام 0-6 (0=الأحد ... 6=السبت)
const ARABIC_DAY_TO_NUM: Record<string, number> = {
  الأحد: 0,
  الاحد: 0,
  أحد: 0,
  احد: 0,
  الإثنين: 1,
  الاثنين: 1,
  إثنين: 1,
  اثنين: 1,
  الثلاثاء: 2,
  الثلاثا: 2,
  ثلاثاء: 2,
  الأربعاء: 3,
  الاربعاء: 3,
  أربعاء: 3,
  اربعاء: 3,
  الخميس: 4,
  خميس: 4,
  الجمعة: 5,
  جمعة: 5,
  الجمعه: 5,
  السبت: 6,
  سبت: 6,
};

async function runMigration() {
  console.log("🚀 بدء تشغيل الـ Migration لحقول قاعدة البيانات...");
  await mongoose.connect(MONGO_URI);
  console.log("✅ تم الاتصال بقاعدة البيانات بنجاح.");

  const db = mongoose.connection.db;
  if (!db) {
    throw new Error("تعذر الوصول إلى كائن قاعدة البيانات");
  }

  // 1. ترحيل الحلقات (Circles): تحويل أيام الأسبوع لأرقام وإضافة teacherName
  const circlesCollection = db.collection("circles");
  const circles = await circlesCollection.find({}).toArray();
  let updatedCirclesCount = 0;

  for (const c of circles) {
    let needsUpdate = false;
    const updateObj: Record<string, any> = {};

    // تحويل الأيام من نصوص إلى أرقام إذا كانت نصوصاً
    if (Array.isArray(c.days)) {
      const convertedDays: number[] = [];
      let hadStrings = false;

      c.days.forEach((d: any) => {
        if (typeof d === "string") {
          hadStrings = true;
          const trimmed = d.trim();
          if (trimmed in ARABIC_DAY_TO_NUM) {
            convertedDays.push(ARABIC_DAY_TO_NUM[trimmed]);
          }
        } else if (typeof d === "number" && d >= 0 && d <= 6) {
          convertedDays.push(d);
        }
      });

      if (hadStrings) {
        // إزالة التكرار وترتيب الأيام تصاعدياً
        const uniqueSortedDays = Array.from(new Set(convertedDays)).sort(
          (a, b) => a - b,
        );
        updateObj.days = uniqueSortedDays;
        needsUpdate = true;
      }
    }

    // إضافة حقل اسم المعلمة إذا لم يكن موجوداً
    if (c.teacherName === undefined) {
      updateObj.teacherName = "";
      needsUpdate = true;
    }

    if (needsUpdate) {
      await circlesCollection.updateOne({ _id: c._id }, { $set: updateObj });
      updatedCirclesCount++;
    }
  }
  console.log(`📌 تم تحديث ${updatedCirclesCount} حلقة (Circles).`);

  // 2. ترحيل الطالبات (Students): إضافة joinedAt, leftAt, warningForRemoval
  const studentsCollection = db.collection("students");
  const students = await studentsCollection.find({}).toArray();
  let updatedStudentsCount = 0;

  for (const st of students) {
    let needsUpdate = false;
    const updateObj: Record<string, any> = {};

    if (!st.joinedAt) {
      const joinedDate = st.createdAt
        ? new Date(st.createdAt).toISOString().split("T")[0]
        : new Date().toISOString().split("T")[0];
      updateObj.joinedAt = joinedDate;
      needsUpdate = true;
    }

    if (st.leftAt === undefined) {
      updateObj.leftAt = null;
      needsUpdate = true;
    }

    if (st.warningForRemoval === undefined) {
      updateObj.warningForRemoval = false;
      needsUpdate = true;
    }

    if (needsUpdate) {
      await studentsCollection.updateOne({ _id: st._id }, { $set: updateObj });
      updatedStudentsCount++;
    }
  }
  console.log(`📌 تم تحديث ${updatedStudentsCount} طالبة (Students).`);

  // 3. ترحيل سجلات الورد(HomeworkRecords): تحويل completed إلى status
  const homeworkCollection = db.collection("homeworkrecords");
  const hwRecords = await homeworkCollection.find({}).toArray();
  let updatedHwCount = 0;

  for (const hw of hwRecords) {
    let needsUpdate = false;
    const updateObj: Record<string, any> = {};

    if (!hw.status) {
      updateObj.status = hw.completed ? "done" : "notDone";
      needsUpdate = true;
    }

    if (needsUpdate) {
      await homeworkCollection.updateOne({ _id: hw._id }, { $set: updateObj });
      updatedHwCount++;
    }
  }
  console.log(`📌 تم تحديث ${updatedHwCount} سجل واجب (HomeworkRecords).`);

  // 4. إنشاء إعدادات افتراضية Settings إن لم تكن موجودة
  const settingsCollection = db.collection("settings");
  const existingSettings = await settingsCollection.findOne({});
  if (!existingSettings) {
    await settingsCollection.insertOne({
      supervisorName: "امل طاهر",
      introText: `                  ﷽
 إِنَّ اللَّهَ وَمَلائِكَتَهُ يُصَلُّونَ عَلَى
النَّبِيِّ يَا أَيُّهَا الَّذِينَ آمَنُوا صَلُّوا
عَلَيْهِ وَسَلِّمُوا تَسْلِيمًا  ﷺ`,
      outroText: `لستُ .. أعرف نوع معاناتكٓم لكنيِ أعرف أنُ القرآن شفاء كل عناء
( إِنَّ هَٰذَا الْقُرْآنَ يَهْدِي لِلَّتِي هِيَ أَقْوَمُ وَيُبَشِّرُ الْمُؤْمِنِينَ الَّذِينَ يَعْمَلُونَ الصَّالِحَاتِ أَنَّ لَهُمْ أَجْرًا كَبِيرًا )`,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    console.log("📌 تم إنشاء وثيقة الإعدادات الافتراضية (Settings).");
  } else {
    console.log("📌 وثيقة الإعدادات (Settings) موجودة بالفعل.");
  }

  console.log("🎉 اكتملت عملية الـ Migration بنجاح تام!");
  await mongoose.disconnect();
}

runMigration().catch((err) => {
  console.error("❌ خطأ أثناء الـ Migration:", err);
  process.exit(1);
});
