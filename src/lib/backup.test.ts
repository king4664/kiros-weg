import { describe, expect, it } from 'vitest';
import { collect, parseBackup, restore, toFileText, type KeyValueStore } from './backup';

class MemoryStore implements KeyValueStore {
  map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  key(i: number) {
    return [...this.map.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.map.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.map.set(k, v);
  }
  removeItem(k: string) {
    this.map.delete(k);
  }
}

function filled(): MemoryStore {
  const s = new MemoryStore();
  s.setItem('kirosweg.settings.v1', JSON.stringify({ scene: 'mountains', motion: false }));
  s.setItem(
    'kirosweg.days.v1',
    JSON.stringify({ '2026-11-24': { done: ['week1-0'], minutes: { 'week1-0': 25.5 }, log: { mistake: 'die Tisch → der Tisch' } } }),
  );
  s.setItem('kirosweg.sentences.v1', JSON.stringify({ lines: ['جملة أولى', 'Ich lerne.'], anchor: '2026-11-24', offset: 0 }));
  s.setItem('kirosweg.nicos.v1', JSON.stringify({ last: { level: 'A1', n: 4 } }));
  s.setItem('kirosweg.weird.v1', '"نص لوحده"');
  s.setItem('kirosweg.raw.v1', 'مش JSON');
  s.setItem('other.app', 'مالناش دعوة بيه');
  return s;
}

const own = (s: MemoryStore) => new Map([...s.map].filter(([k]) => k.startsWith('kirosweg.')));

describe('Export وبعده Import', () => {
  it('بيرجّعوا نفس البيانات بالظبط', () => {
    const a = filled();
    const text = toFileText(collect(a, new Date('2026-11-24T10:00:00Z')));

    const b = new MemoryStore();
    b.setItem('kirosweg.days.v1', '{"old":true}');
    b.setItem('kirosweg.timer.v1', '{"key":"x"}');
    b.setItem('other.app', 'زي ما هو');
    restore(b, parseBackup(text));

    expect(own(b)).toEqual(own(a));
    expect(b.getItem('other.app')).toBe('زي ما هو');
  });

  it('الجمل جوه النسخة', () => {
    const backup = collect(filled(), new Date());
    expect(backup.data['kirosweg.sentences.v1']).toMatchObject({ lines: ['جملة أولى', 'Ich lerne.'] });
    expect(backup.data['other.app']).toBeUndefined();
  });

  it('بيرفض الملفات اللي مش بتاعة التطبيق', () => {
    expect(() => parseBackup('مش JSON')).toThrow('مش JSON');
    expect(() => parseBackup('{"app":"x","version":1,"data":{}}')).toThrow('مش نسخة احتياطية');
    expect(() => parseBackup('{"app":"kiros-weg","version":2,"data":{}}')).toThrow('مش معروفة');
    expect(() => parseBackup('{"app":"kiros-weg","version":1,"data":{"evil":1}}')).toThrow('مش بتاعة');
  });
});
