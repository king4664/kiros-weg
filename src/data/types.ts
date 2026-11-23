/** أنواع البيانات اللي في src/data. كل حاجة هنا جاية من german-plan.md. */

/** تاريخ بصيغة YYYY-MM-DD (يوم في توقيت الموبايل) */
export type ISODate = string;

export type LinkType = 'video' | 'pdf' | 'site' | 'audio';

export type LinkGroupId =
  | 'curriculum'
  | 'exams'
  | 'pronunciation'
  | 'grammar'
  | 'input'
  | 'backup'
  | 'goethe'
  | 'speaking'
  | 'germany'
  | 'research';

export interface Contact {
  email: string;
  phone: string;
  phoneHours: string;
  officeHours: string;
}

export interface LinkGroup {
  id: LinkGroupId;
  title: string;
  note?: string;
  contact?: Contact;
}

export interface Link {
  id: string;
  group: LinkGroupId;
  /** اسم بالعربي (ممكن يبقى فيه اسم ألماني) */
  name: string;
  /** هو إيه وإمتى أستخدمه */
  desc: string;
  type: LinkType;
  /** رقم الجزء في german-plan.md */
  part: number;
  url: string;
}

export interface Word {
  id: string;
  week: 1 | 2;
  /** رقم الكلمة في جدول الأسبوع */
  n: number;
  /** اليوم في الأسبوع (1–6) */
  day: number;
  /** عنوان اليوم في جزء 25 */
  topic?: string;
  /** الكلمة بأداتها زي ما هي في الملف */
  de: string;
  /** الجمع، أو null لو الملف مافيهوش جمع */
  plural: string | null;
  meaning: string;
}

export interface Milestone {
  id: string;
  /** اسم قصير للعدّاد: «التشخيص بعد 5 أيام» */
  short: string;
  /** الميعاد بنفس كتابة جزء 1 */
  when: string;
  what: string;
  date: ISODate;
  end?: ISODate;
  /** الشهر بس معروف، مش اليوم */
  approx?: boolean;
  /** لازم يخلص قبل date */
  deadline?: boolean;
  /** ملاحظة للي بيعدّل البيانات (مابتظهرش) */
  editNote?: string;
}

export interface Week {
  id: string;
  from: number;
  to: number;
  start: ISODate;
  end: ISODate;
  /** الأسابيع 3–5: التوزيع بعد التشخيص */
  afterDiagnosis?: boolean;
  /** الأعمدة زي ما هي في جدول جزء 6 */
  label: string;
  dates: string;
  hours: string;
  nicos: string;
  grammar: string;
  topics: string;
  output: string;
}

export type ExamPart = 'hoeren' | 'lesen' | 'schreiben' | 'sprechen';

export interface ExamPartInfo {
  id: ExamPart;
  de: string;
  ar: string;
}

export interface Rule {
  if: string;
  then: string;
}

export interface Band extends Rule {
  /** أقل درجة للقرار ده */
  min: number;
}

interface CheckpointBase {
  id: string;
  n: number;
  title: string;
  when?: string;
  exam?: string;
  date?: ISODate;
  note?: string;
}

export interface BandsCheckpoint extends CheckpointBase {
  kind: 'bands';
  parts: ExamPart[];
  bands: Band[];
}

export interface WeeklyCheckpoint extends CheckpointBase {
  kind: 'weekly';
  up: Rule;
  keep: Rule;
  down: Rule;
}

export interface CompareCheckpoint extends CheckpointBase {
  kind: 'compare';
  parts: ExamPart[];
  compareWith: string;
  text: string;
}

export interface InfoCheckpoint extends CheckpointBase {
  kind: 'info';
  text: string;
}

export type Checkpoint = BandsCheckpoint | WeeklyCheckpoint | CompareCheckpoint | InfoCheckpoint;

export interface Decisions {
  parts: ExamPartInfo[];
  checkpoints: Checkpoint[];
  notes: string[];
}

/* اليوم (المرحلة 3) */

export type TaskKind =
  | 'anki'
  | 'nicos'
  | 'pronunciation'
  | 'claude'
  | 'shadowing'
  | 'listening'
  | 'reading'
  | 'followup'
  | 'mistakes'
  | 'rest'
  | 'exam'
  | 'tutor';

export interface TaskRow {
  /** الوقت زي ما هو في الخطة: «0–15» أو «12:00–12:20» أو «25 دقيقة» */
  time?: string;
  minutes?: number;
  what: string;
  kind: TaskKind;
  /** روابط من links.json */
  links?: string[];
  /** أيام الأسبوع اللي المهمة فيها (0 = الحد) */
  weekdays?: number[];
  /** الساعة الزيادة بالليل (17–18) في اليوم اللي من غير جيم */
  evening?: boolean;
}

export type TemplateId = 'week1' | 'hour' | 'ninety' | 'gym' | 'nogym' | 'four' | 'small';

export interface Template {
  title: string;
  /** رقم الجزء في الخطة */
  part: number;
  /** يوم الـ4 ساعات = اليوم اللي من غير جيم + الصفوف دي */
  base?: TemplateId;
  rows: TaskRow[];
}

export interface PlanDay {
  date: ISODate;
  /** زي ما هو في جزء 7 */
  label: string;
  text: string;
  /** أول وآخر درس في Nicos Weg */
  lessons?: [number, number];
}

export interface SpecialDay {
  date: ISODate;
  kind: 'compensation' | 'diagnosis' | 'mock';
  /** القرار اللي في جزء 9 */
  checkpoint?: string;
  tasks?: TaskRow[];
}

export interface NicosLessons {
  source: string;
  fetched: ISODate;
  note: string;
  A1: string[];
}
