import { describe, expect, it } from 'vitest';
import planMd from '../../german-plan.md?raw';
import { daysBetween, parseISO, toISO } from '../lib/dates';
import { allUrls, section, type Block } from '../lib/markdown';
import { plain } from '../lib/rich';
import {
  DECISIONS,
  LINKS,
  LINK_GROUPS,
  MILESTONES,
  NICOS,
  PLAN_DAYS,
  SPECIAL_DAYS,
  TEMPLATES,
  WEEKS,
  WORDS,
  type TaskRow,
} from './index';

/** النص الخام لجزء من الخطة */
function raw(n: number): string {
  const lines = planMd.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${n}. `));
  const end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  return lines.slice(start, end < 0 ? undefined : end).join('\n');
}

function tables(n: number): (Block & { t: 'table' })[] {
  return section(planMd, n).blocks.filter((b): b is Block & { t: 'table' } => b.t === 'table');
}

const isISO = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(parseISO(s)) === s;

describe('الروابط', () => {
  it('الـ45 رابط كلهم، من غير تكرار، وكلهم https', () => {
    expect(LINKS).toHaveLength(45);
    const urls = LINKS.map((l) => l.url);
    expect(new Set(urls).size).toBe(45);
    expect(new Set(LINKS.map((l) => l.id)).size).toBe(45);
    for (const u of urls) expect(new URL(u).protocol).toBe('https:');
  });

  it('نفس روابط german-plan.md بالظبط، ولا واحد ناقص ولا زيادة', () => {
    const fromPlan = allUrls(planMd);
    expect(fromPlan).toHaveLength(45);
    expect([...LINKS.map((l) => l.url)].sort()).toEqual([...fromPlan].sort());
  });

  it('كل رابط فيه كل الحقول، ومكتوب في الجزء اللي متسجّل عليه', () => {
    const groups = new Set(LINK_GROUPS.map((g) => g.id));
    for (const l of LINKS) {
      expect(l.name.trim(), l.id).not.toBe('');
      expect(l.desc.trim(), l.id).not.toBe('');
      expect(['video', 'pdf', 'site', 'audio'], l.id).toContain(l.type);
      expect(groups.has(l.group), l.id).toBe(true);
      expect(raw(l.part), `${l.id} مش في جزء ${l.part}`).toContain(l.url);
    }
  });

  it('كل مجموعة فيها روابط، وبيانات جوته من الخطة', () => {
    for (const g of LINK_GROUPS) {
      expect(g.title.trim()).not.toBe('');
      expect(LINKS.some((l) => l.group === g.id), g.id).toBe(true);
    }
    const goethe = LINK_GROUPS.find((g) => g.id === 'goethe');
    expect(goethe?.contact).toBeDefined();
    expect(raw(10)).toContain(goethe?.contact?.email);
    expect(raw(10)).toContain(goethe?.contact?.phone);
  });
});

describe('الكلمات', () => {
  it('60 في جزء 24، و72 في جزء 25، ومفيش متكرر', () => {
    expect(WORDS.filter((w) => w.week === 1)).toHaveLength(60);
    expect(WORDS.filter((w) => w.week === 2)).toHaveLength(72);
    expect(new Set(WORDS.map((w) => w.id)).size).toBe(132);
    expect(new Set(WORDS.map((w) => w.de.trim().toLowerCase())).size).toBe(132);
  });

  it('كل كلمة زي الجدول بالظبط (الكلمة، والجمع، والمعنى)', () => {
    const w1 = tables(24)[0]?.rows ?? [];
    expect(w1).toHaveLength(60);
    w1.forEach(([n, de, meaning]) => {
      const w = WORDS.find((x) => x.week === 1 && x.n === Number(n));
      expect(w, `الأسبوع 1 رقم ${n}`).toMatchObject({ de, meaning, plural: null });
    });
    const w2 = tables(25).flatMap((t) => t.rows);
    expect(w2).toHaveLength(72);
    w2.forEach(([n, de, plural, meaning]) => {
      const w = WORDS.find((x) => x.week === 2 && x.n === Number(n));
      expect(w, `الأسبوع 2 رقم ${n}`).toMatchObject({ de, meaning, plural: plural === '—' ? null : plural });
    });
  });

  it('الأيام: 10 في اليوم في الأسبوع 1، وعناوين أيام الأسبوع 2', () => {
    for (const w of WORDS.filter((x) => x.week === 1)) expect(w.day).toBe(Math.ceil(w.n / 10));
    const titles = section(planMd, 25).blocks.filter((b) => b.t === 'h').map((b) => (b as { text: string }).text);
    for (const w of WORDS.filter((x) => x.week === 2)) {
      expect(titles, w.id).toContain(`اليوم ${w.day}: ${w.topic}`);
    }
  });
});

describe('المحطات', () => {
  const rows = tables(1)[0]?.rows ?? [];

  it('كل صفوف جزء 1، بنفس الكلام', () => {
    expect(MILESTONES).toHaveLength(rows.length);
    for (const [when, what] of rows) {
      const m = MILESTONES.find((x) => x.what === what);
      expect(m, what).toBeDefined();
      // الفاينل بس اتغير: كيرو حدد 3–23 يناير
      if (m?.id !== 'finals') expect(m?.when).toBe(when);
    }
  });

  it('التواريخ صح وبالترتيب', () => {
    let prev = '';
    for (const m of MILESTONES) {
      expect(isISO(m.date), m.id).toBe(true);
      if (m.end) {
        expect(isISO(m.end), m.id).toBe(true);
        expect(m.end >= m.date, m.id).toBe(true);
      }
      expect(m.date >= prev, `${m.id} قبل اللي قبله`).toBe(true);
      prev = m.date;
    }
    expect(new Set(MILESTONES.map((m) => m.id)).size).toBe(MILESTONES.length);
  });

  it('الفاينل 3–23 يناير، زي أسابيع 7–9', () => {
    const finals = MILESTONES.find((m) => m.id === 'finals');
    const w = WEEKS.find((x) => x.from === 7);
    expect([finals?.date, finals?.end]).toEqual(['2027-01-03', '2027-01-23']);
    expect([w?.start, w?.end]).toEqual([finals?.date, finals?.end]);
  });
});

describe('المنهج أسبوع بأسبوع', () => {
  it('نفس جدول جزء 6 بالظبط', () => {
    const rows = tables(6)[0]?.rows ?? [];
    expect(WEEKS).toHaveLength(rows.length);
    rows.forEach((r, i) => {
      const w = WEEKS[i];
      expect([w?.label, w?.dates, w?.hours, w?.nicos, w?.grammar, w?.topics, w?.output]).toEqual(r);
    });
  });

  it('الأسابيع من 1 لـ16 ورا بعض، من الحد للسبت، من غير فراغ', () => {
    expect(WEEKS[0]?.start).toBe(MILESTONES.find((m) => m.id === 'start')?.date);
    let expected = 1;
    WEEKS.forEach((w, i) => {
      expect(isISO(w.start) && isISO(w.end), w.id).toBe(true);
      expect(w.from).toBe(expected);
      expected = w.to + 1;
      expect(parseISO(w.end).getDay(), `${w.id} بيخلص السبت`).toBe(6);
      if (i > 0) {
        expect(parseISO(w.start).getDay(), `${w.id} بيبدأ الحد`).toBe(0);
        expect(daysBetween(parseISO(WEEKS[i - 1]?.end as string), parseISO(w.start))).toBe(1);
      }
      // الأرقام اللي في عمود التاريخ هي نفس أول وآخر يوم
      const nums = w.dates.match(/\d+/g)?.map(Number);
      expect(nums, w.id).toEqual([parseISO(w.start).getDate(), parseISO(w.end).getDate()]);
    });
    expect(expected).toBe(17);
  });

  it('علامة «التوزيع بعد التشخيص» على الأسابيع 3–5 بس', () => {
    expect(WEEKS.filter((w) => w.afterDiagnosis).map((w) => w.from)).toEqual([3, 4, 5]);
  });
});

describe('القرارات', () => {
  const text = plain(raw(9));

  it('كل جملة مكتوبة في جزء 9 بالحرف', () => {
    const strings: string[] = [];
    for (const c of DECISIONS.checkpoints) {
      strings.push(c.title);
      if (c.when) strings.push(c.when);
      if (c.exam) strings.push(c.exam);
      if (c.note) strings.push(c.note);
      if (c.kind === 'bands') for (const b of c.bands) strings.push(b.if, b.then);
      if (c.kind === 'weekly') for (const r of [c.up, c.keep, c.down]) strings.push(r.if, r.then);
      if (c.kind === 'compare' || c.kind === 'info') strings.push(c.text);
    }
    for (const s of strings) expect(text, s).toContain(s);
    for (const n of DECISIONS.notes) expect(raw(9)).toContain(n);
  });

  it('الدرجات مترتبة، والأجزاء والتواريخ صح', () => {
    const parts = new Set(DECISIONS.parts.map((p) => p.id));
    const ids = new Set(DECISIONS.checkpoints.map((c) => c.id));
    for (const c of DECISIONS.checkpoints) {
      if (c.date) expect(isISO(c.date), c.id).toBe(true);
      if (c.kind === 'bands' || c.kind === 'compare') for (const p of c.parts) expect(parts.has(p)).toBe(true);
      if (c.kind === 'compare') expect(ids.has(c.compareWith)).toBe(true);
      if (c.kind === 'bands') {
        const mins = c.bands.map((b) => b.min);
        expect(mins).toEqual([...mins].sort((a, b) => b - a));
        expect(mins[mins.length - 1]).toBe(0);
      }
    }
    expect(DECISIONS.checkpoints.map((c) => c.n)).toEqual([1, 2, 3, 4, 5, 6]);
  });

  it('مواعيد القرارات هي نفس مواعيد المحطات', () => {
    const byId = new Map(MILESTONES.map((m) => [m.id, m.date]));
    for (const id of ['diagnosis', 'a1-mock', 'a2-mock', 'a2-second', 'simulation']) {
      expect(DECISIONS.checkpoints.find((c) => c.id === id)?.date, id).toBe(byId.get(id));
    }
  });
});

describe('قوالب اليوم وأيام جزء 7', () => {
  const linkIds = new Set(LINKS.map((l) => l.id));
  const checkRow = (r: TaskRow, part: number, label: string) => {
    expect(plain(raw(part)), `${label}: ${r.what}`).toContain(plain(r.what));
    if (r.time) expect(r.time.trim(), label).not.toBe('');
    for (const id of r.links ?? []) expect(linkIds.has(id), `${label}: ${id}`).toBe(true);
  };

  it('صفوف جزء 4 زي الجداول بالظبط، والدقايق صح', () => {
    const t = tables(4).slice(1);
    const ids = ['hour', 'ninety', 'gym', 'nogym'] as const;
    ids.forEach((id, i) => {
      const rows = t[i]?.rows ?? [];
      expect(TEMPLATES[id].rows.map((r) => [r.time, r.what]), id).toEqual(rows);
      for (const r of TEMPLATES[id].rows) {
        const [a, b] = (r.time as string).split('–');
        const toMin = (x: string) => (x.includes(':') ? Number(x.split(':')[0]) * 60 + Number(x.split(':')[1]) : Number(x));
        expect(r.minutes, `${id} ${r.time}`).toBe(toMin(b as string) - toMin(a as string));
      }
    });
    expect(TEMPLATES.hour.rows.reduce((n, r) => n + (r.minutes ?? 0), 0)).toBe(60);
    expect(TEMPLATES.ninety.rows.reduce((n, r) => n + (r.minutes ?? 0), 0)).toBe(90);
    expect(TEMPLATES.gym.rows.reduce((n, r) => n + (r.minutes ?? 0), 0)).toBe(120);
    expect(TEMPLATES.nogym.rows.reduce((n, r) => n + (r.minutes ?? 0), 0)).toBe(180);
    expect(TEMPLATES.nogym.rows.filter((r) => r.evening).map((r) => r.time)).toEqual([
      '17:00–17:25',
      '17:25–17:35',
      '17:35–17:55',
      '17:55–18:00',
    ]);
  });

  it('الأسبوع 1، ويوم الـ4 ساعات، واليوم الصغير من كلام الخطة', () => {
    for (const r of TEMPLATES.week1.rows) checkRow(r, 7, 'week1');
    for (const r of TEMPLATES.four.rows) checkRow(r, 4, 'four');
    for (const r of TEMPLATES.small.rows) checkRow(r, 15, 'small');
    expect(TEMPLATES.week1.rows.reduce((n, r) => n + (r.minutes ?? 0), 0)).toBe(60);
  });

  it('أيام جزء 7 بالحرف وبالترتيب', () => {
    const items = section(planMd, 7).blocks.flatMap((b) => (b.t === 'list' ? b.items : []));
    expect(PLAN_DAYS).toHaveLength(items.length);
    PLAN_DAYS.forEach((d, i) => {
      expect(`**${d.label}:** ${d.text}`).toBe(items[i]?.text);
      expect(isISO(d.date)).toBe(true);
      if (i > 0) expect(daysBetween(parseISO(PLAN_DAYS[i - 1]?.date as string), parseISO(d.date))).toBe(1);
      if (d.lessons) {
        const nums = d.text.match(/درس ([\d و]+)/)?.[1]?.match(/\d+/g)?.map(Number) ?? [];
        expect([Math.min(...nums), Math.max(...nums)], d.date).toEqual(d.lessons);
      }
    });
    expect(PLAN_DAYS[0]?.date).toBe('2026-11-23');
  });

  it('الأيام المميزة: مهامها من الخطة، وروابطها موجودة', () => {
    for (const s of SPECIAL_DAYS) {
      expect(isISO(s.date)).toBe(true);
      for (const r of s.tasks ?? []) {
        const inPlan = [7, 9, 13].some((p) => plain(raw(p)).includes(plain(r.what)));
        expect(inPlan, r.what).toBe(true);
        for (const id of r.links ?? []) expect(linkIds.has(id), id).toBe(true);
      }
      if (s.checkpoint) {
        const cp = DECISIONS.checkpoints.find((c) => c.id === s.checkpoint);
        expect(cp?.date, s.date).toBe(s.date);
      }
    }
  });

  it('أسماء دروس A1: 76 درس، وأولهم زي ملاحظات جزء 6', () => {
    expect(NICOS.A1).toHaveLength(76);
    expect(new Set(NICOS.A1).size).toBe(76);
    for (const name of ['Hallo!', 'Kein Problem!', 'Tschüss!', 'Von A bis Z']) expect(raw(6)).toContain(name);
    expect(NICOS.A1.slice(0, 4)).toEqual(['Hallo!', 'Kein Problem!', 'Tschüss!', 'Von A bis Z']);
  });

  it('كل محطة ليها اسم قصير', () => {
    for (const m of MILESTONES) expect(m.short.trim(), m.id).not.toBe('');
  });
});
