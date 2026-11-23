import { describe, expect, it } from 'vitest';
import planMd from '../../german-plan.md?raw';
import { allUrls, parseBlocks, section } from './markdown';
import { latin, rich } from './rich';
import { matches, normalize } from './search';

describe('البحث', () => {
  it('من غير تشكيل، والألف والتاء المربوطة واحد', () => {
    expect(normalize('أهلًا')).toBe('اهلا');
    expect(matches('جوته إسكندرية', 'اسكندريه')).toBe(true);
    expect(matches('Übungssatz 01', 'ubungssatz')).toBe(true);
    expect(matches('امتحان A1 التجريبي', 'a1 امتحان')).toBe(true);
    expect(matches('امتحان A1', 'A2')).toBe(false);
    expect(matches('أي حاجة', '   ')).toBe(true);
  });
});

describe('الكلام الألماني جوه العربي', () => {
  const runs = (s: string) => [...latin(s).matchAll(/<bdi[^>]*>(.*?)<\/bdi>/g)].map((m) => m[1]);

  it('كل جملة ألماني حتة واحدة', () => {
    expect(runs('درس Nicos Weg: أول مرة')).toEqual(['Nicos Weg']);
    expect(runs('أول قياس: Start Deutsch 1 Übungssatz 01. السبت')).toEqual(['Start Deutsch 1 Übungssatz 01']);
    expect(runs('(«Ich brauche einen Stuhl. Was kostet er?»)')).toEqual(['Ich brauche einen Stuhl. Was kostet er?']);
    expect(runs('زي: Ich habe keine Zeit, Deutsch zu lernen.')).toEqual(['Ich habe keine Zeit, Deutsch zu lernen']);
    expect(runs('(zu + Infinitiv)')).toEqual(['zu + Infinitiv']);
    expect(runs('في B1.1 وA2.2')).toEqual(['B1.1', 'A2.2']);
    expect(runs('der، die، das')).toEqual(['der', 'die', 'das']);
  });

  it('الأرقام لوحدها مابتتلفّش، والإنجليزي lang=en', () => {
    expect(latin('ساعة 12:00–14:00')).not.toContain('<bdi');
    expect(latin('Anki')).toContain('lang="en"');
    expect(latin('Präsens')).toContain('lang="de"');
  });

  it('تقيل، وروابط وإيميل وتليفون، ومفيش HTML بيعدّي', () => {
    expect(rich('**مهم:** كلام')).toBe('<strong>مهم:</strong> كلام');
    const r = rich('الموقع: https://www.vhs-lernportal.de.');
    expect(r).toContain('href="https://www.vhs-lernportal.de"');
    expect(r).toContain('target="_blank"');
    expect(r.endsWith('.')).toBe(true);
    expect(rich('على sprache-alexandria@goethe.de، وتليفون 01556002872 (الحد)')).toContain(
      'href="mailto:sprache-alexandria@goethe.de"',
    );
    expect(rich('تليفون 01556002872')).toContain('href="tel:01556002872"');
    const unsafe = rich('<img src=x onerror="alert(1)">');
    expect(unsafe).not.toMatch(/<img|<script/);
    expect(unsafe.startsWith('&lt;')).toBe(true);
  });
});

describe('قراية أجزاء الخطة', () => {
  it('فقرات وقوايم جوه بعض وجداول وكود', () => {
    const blocks = parseBlocks(
      ['**عنوان:**', '', '- أول', '  1. جوه', '  2. جوه تاني', '- تاني', '', '| أ | ب |', '|---|---|', '| 1 | 2 |', '', '```text', 'Hallo', '```'].join('\n'),
    );
    expect(blocks.map((b) => b.t)).toEqual(['h', 'list', 'table', 'code']);
    const list = blocks[1] as { t: 'list'; items: { text: string; sub: { t: string; ordered?: boolean }[] }[] };
    expect(list.items.map((i) => i.text)).toEqual(['أول', 'تاني']);
    expect(list.items[0]?.sub[0]).toMatchObject({ t: 'list', ordered: true });
    expect(blocks[2]).toEqual({ t: 'table', head: ['أ', 'ب'], rows: [['1', '2']] });
    expect(blocks[3]).toEqual({ t: 'code', text: 'Hallo' });
  });

  it('أجزاء الخطة الحقيقية', () => {
    expect(section(planMd, 2).title).toBe('كلام صريح عن الفرصة');
    const s16 = section(planMd, 16);
    const list = s16.blocks.find((b) => b.t === 'list') as { items: unknown[] };
    expect(list.items).toHaveLength(11);
    expect(s16.blocks.some((b) => b.t === 'code')).toBe(true);
    expect(allUrls(planMd)).toHaveLength(45);
  });
});
