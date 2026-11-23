/**
 * بيقرا أجزاء من german-plan.md علشان الكلام يظهر في التطبيق بنفس نص الخطة بالظبط.
 * بيفهم بس اللي الملف بيستخدمه: فقرات، وقوايم (جوه بعض)، وجداول، وكود.
 */

export interface ListItem {
  text: string;
  sub: Block[];
}

export type Block =
  | { t: 'h'; text: string }
  | { t: 'p'; text: string }
  | { t: 'list'; ordered: boolean; items: ListItem[] }
  | { t: 'table'; head: string[]; rows: string[][] }
  | { t: 'code'; text: string };

export interface Section {
  n: number;
  title: string;
  blocks: Block[];
}

const LIST = /^(\s*)(-|\d+\.)\s+(.*)$/;

function cells(line: string): string[] {
  return line
    .trim()
    .replace(/^\|/, '')
    .replace(/\|$/, '')
    .split('|')
    .map((c) => c.trim());
}

interface Entry {
  indent: number;
  ordered: boolean;
  text: string;
}

function buildList(entries: Entry[], start: number): [Block & { t: 'list' }, number] {
  const first = entries[start] as Entry;
  const { indent, ordered } = first;
  const items: ListItem[] = [];
  let i = start;
  while (i < entries.length) {
    const e = entries[i] as Entry;
    if (e.indent < indent) break;
    if (e.indent > indent) {
      const [sub, next] = buildList(entries, i);
      const parent = items[items.length - 1];
      if (parent) parent.sub.push(sub);
      else items.push({ text: '', sub: [sub] });
      i = next;
      continue;
    }
    if (e.ordered !== ordered) break;
    items.push({ text: e.text, sub: [] });
    i++;
  }
  return [{ t: 'list', ordered, items }, i];
}

export function parseBlocks(text: string): Block[] {
  const lines = text.replace(/\r\n/g, '\n').split('\n');
  const blocks: Block[] = [];
  let para: string[] = [];

  const flush = () => {
    if (!para.length) return;
    const joined = para.join(' ').trim();
    para = [];
    if (/^\*\*[^*]+\*\*$/.test(joined)) blocks.push({ t: 'h', text: joined.slice(2, -2) });
    else blocks.push({ t: 'p', text: joined });
  };

  let i = 0;
  while (i < lines.length) {
    const line = lines[i] as string;

    if (line.trim() === '' || line.trim() === '---') {
      flush();
      i++;
      continue;
    }

    if (line.startsWith('```')) {
      flush();
      const body: string[] = [];
      i++;
      while (i < lines.length && !(lines[i] as string).startsWith('```')) body.push(lines[i++] as string);
      i++;
      blocks.push({ t: 'code', text: body.join('\n') });
      continue;
    }

    if (line.trim().startsWith('|')) {
      flush();
      const rows: string[][] = [];
      while (i < lines.length && (lines[i] as string).trim().startsWith('|')) {
        const l = (lines[i] as string).trim();
        if (!/^\|[-:| ]+\|$/.test(l)) rows.push(cells(l));
        i++;
      }
      const [head = [], ...body] = rows;
      blocks.push({ t: 'table', head, rows: body });
      continue;
    }

    if (LIST.test(line)) {
      flush();
      const entries: Entry[] = [];
      while (i < lines.length) {
        const m = (lines[i] as string).match(LIST);
        if (!m) break;
        entries.push({ indent: (m[1] as string).length, ordered: m[2] !== '-', text: m[3] as string });
        i++;
      }
      let k = 0;
      while (k < entries.length) {
        const [list, next] = buildList(entries, k);
        blocks.push(list);
        k = next;
      }
      continue;
    }

    para.push(line.trim());
    i++;
  }
  flush();
  return blocks;
}

/** جزء بالرقم، زي section(md, 10) لـ«## 10. اختبار تحديد المستوى…». */
export function section(md: string, n: number): Section {
  const lines = md.replace(/\r\n/g, '\n').split('\n');
  const start = lines.findIndex((l) => l.startsWith(`## ${n}. `));
  if (start < 0) throw new Error(`جزء ${n} مش موجود في الخطة`);
  let end = lines.findIndex((l, i) => i > start && l.startsWith('## '));
  if (end < 0) end = lines.length;
  const title = (lines[start] as string).slice(`## ${n}. `.length).trim();
  return { n, title, blocks: parseBlocks(lines.slice(start + 1, end).join('\n')) };
}

/** كل الروابط اللي في الملف، من غير تكرار، بالترتيب. */
export function allUrls(md: string): string[] {
  const found = md.match(/https:\/\/[^\s)`»]+/g) ?? [];
  return [...new Set(found.map((u) => u.replace(/[.,،:]+$/, '')))];
}
