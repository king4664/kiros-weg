const ESC: Record<string, string> = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };

export function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ESC[c] as string);
}

/** كلام ألماني: LTR جوه <bdi>. */
export function de(text: string): string {
  return `<bdi lang="de" dir="ltr" class="de">${esc(text)}</bdi>`;
}

/** بيعمل عنصر من HTML. */
export function el<T extends HTMLElement = HTMLElement>(html: string): T {
  const tpl = document.createElement('template');
  tpl.innerHTML = html.trim();
  return tpl.content.firstElementChild as T;
}
