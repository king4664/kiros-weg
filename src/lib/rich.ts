/**
 * كلام الخطة لـHTML: **تقيل**، والروابط والإيميل والتليفون بيتفتحوا بلمسة،
 * وأي كلام لاتيني (ألماني غالبًا) بيتحط في <bdi> علشان مايتلخبطش جوه العربي.
 */

const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] as string);
}

const L = 'A-Za-z\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u00FF';
const WORD = `[${L}][${L}0-9'’\\-]*(?:[./][${L}0-9]+)*[!?…]*`;
const NUM = '[0-9]+(?:\\.[0-9]+)?';
const SEP = '(?: +| *[+/] *|, |\\. )';
/** كلمة لاتيني (وممكن قبلها رقم زي «1 Kennenlernen»)، وبعدها كلمات أو أرقام لحد ما العربي يرجع */
const RUN = new RegExp(`(?:[0-9]+ (?=[${L}]))?${WORD}(?:${SEP}(?:${WORD}|${NUM}))*`, 'g');

/** أسامي وكلمات إنجليزي مش ألماني */
const EN = new Set([
  'Anki',
  'AnkiDroid',
  'AnkiMobile',
  'AnkiWeb',
  'Claude',
  'DW',
  'PDF',
  'Zoom',
  'YouTube',
  'Reddit',
  'italki',
  'Preply',
  'Tandem',
  'HelloTalk',
  'TTS',
  'SMS',
  'Sync',
  'Webshop',
  'Easy German',
  'community tutor',
  'Spaced repetition',
  'Retrieval practice',
  'Comprehensible input',
  'Interleaving',
  'Shadowing',
  'Text-to-speech',
  'Language Librarian',
  'Cyber Security',
]);

export function bdi(text: string): string {
  const lang = EN.has(text) ? 'en' : 'de';
  return `<bdi lang="${lang}" dir="ltr" class="de">${esc(text)}</bdi>`;
}

/** بيلف الكلام اللاتيني بـ<bdi>، والباقي بيتعمله escape. */
export function latin(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(RUN)) {
    const i = m.index ?? 0;
    out += esc(text.slice(last, i)) + bdi(m[0]);
    last = i + m[0].length;
  }
  return out + esc(text.slice(last));
}

const LINKISH = /https:\/\/[^\s)`»]+|[\w.+-]+@[\w-]+(?:\.[\w-]+)+|\b01\d{9}\b/g;

function linkify(text: string): string {
  let out = '';
  let last = 0;
  for (const m of text.matchAll(LINKISH)) {
    let raw = m[0];
    // النقطة أو الفاصلة في آخر الجملة مش من الرابط
    const trail = raw.match(/[.,،:]+$/)?.[0] ?? '';
    raw = raw.slice(0, raw.length - trail.length);
    const i = m.index ?? 0;
    out += latin(text.slice(last, i));
    const shown = `<bdi dir="ltr">${esc(raw)}</bdi>`;
    if (raw.startsWith('https://')) {
      out += `<a href="${esc(raw)}" target="_blank" rel="noopener noreferrer">${shown}</a>`;
    } else if (raw.includes('@')) {
      out += `<a href="mailto:${esc(raw)}">${shown}</a>`;
    } else {
      out += `<a href="tel:${esc(raw)}">${shown}</a>`;
    }
    out += esc(trail);
    last = i + m[0].length;
  }
  return out + latin(text.slice(last));
}

/** سطر من الخطة لـHTML آمن. */
export function rich(text: string): string {
  return text
    .split('**')
    .map((part, i) => (i % 2 === 1 ? `<strong>${linkify(part)}</strong>` : linkify(part)))
    .join('');
}

/** نفس الكلام من غير **، للبحث ولمقارنة النص. */
export function plain(text: string): string {
  return text.replace(/\*\*/g, '');
}
