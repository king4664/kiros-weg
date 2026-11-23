import { esc } from '../lib/rich';

export { esc, rich } from '../lib/rich';

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
