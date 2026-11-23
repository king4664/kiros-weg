/**
 * بحث بسيط: من غير تشكيل، والألف والياء والتاء المربوطة بأشكالهم واحد،
 * وä = a، وß = ss. كل كلمة في البحث لازم تبقى موجودة.
 */
export function normalize(s: string): string {
  return s
    .toLowerCase()
    .replace(/[ً-ٰٟـ]/g, '')
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ä/g, 'a')
    .replace(/ö/g, 'o')
    .replace(/ü/g, 'u')
    .replace(/ß/g, 'ss')
    .replace(/\s+/g, ' ')
    .trim();
}

export function matches(haystack: string, query: string): boolean {
  const q = normalize(query);
  if (!q) return true;
  const h = normalize(haystack);
  return q.split(' ').every((part) => h.includes(part));
}
