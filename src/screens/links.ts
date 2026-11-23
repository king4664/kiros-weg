import { esc, rich } from '../app/dom';
import { icons } from '../app/icons';
import { isObject, isStringArray, readJSON, writeJSON } from '../app/storage';
import { LINKS, LINK_GROUPS, type Link, type LinkGroup, type LinkType } from '../data';
import { matches } from '../lib/search';
import type { Screen } from './types';

const KEY = 'kirosweg.links.v1';
const RECENT_MAX = 5;

interface LinksState {
  fav: string[];
  recent: string[];
}

const valid = (v: unknown): v is LinksState => isObject(v) && isStringArray(v.fav) && isStringArray(v.recent);

const TYPE_NAMES: Record<LinkType, string> = { video: 'فيديو', pdf: 'PDF', site: 'موقع', audio: 'صوت' };

const byId = new Map(LINKS.map((l) => [l.id, l]));
const groupTitle = new Map(LINK_GROUPS.map((g) => [g.id, g.title]));

function host(url: string): string {
  return new URL(url).hostname.replace(/^www\./, '');
}

function row(l: Link, state: LinksState, showGroup = false): string {
  const fav = state.fav.includes(l.id);
  const meta = [TYPE_NAMES[l.type], `<bdi dir="ltr">${esc(host(l.url))}</bdi>`];
  if (showGroup) meta.push(esc(groupTitle.get(l.group) ?? ''));
  return `
    <li class="link-row">
      <a class="link-main" href="${esc(l.url)}" target="_blank" rel="noopener noreferrer" data-open="${l.id}">
        <span class="link-icon">${icons[l.type]}</span>
        <span class="link-text">
          <span class="link-name">${rich(l.name)}</span>
          <span class="link-desc">${rich(l.desc)}</span>
          <span class="link-meta">${meta.join(' · ')}</span>
        </span>
      </a>
      <button type="button" class="icon-btn star" data-fav="${l.id}" aria-pressed="${fav}"
        aria-label="${fav ? 'شيل من المفضلة' : 'ضيف للمفضلة'}">${fav ? icons.starFilled : icons.star}</button>
    </li>`;
}

function contact(g: LinkGroup): string {
  const c = g.contact;
  if (!c) return '';
  return `
    <div class="contact">
      <a class="btn" href="mailto:${esc(c.email)}">${icons.mail}<span>إيميل <bdi dir="ltr">${esc(c.email)}</bdi></span></a>
      <a class="btn" href="tel:${esc(c.phone)}">${icons.phone}<span>اتصل <bdi dir="ltr">${esc(c.phone)}</bdi></span></a>
      <p class="small muted">${rich(c.phoneHours)}. ${rich(c.officeHours)}</p>
    </div>`;
}

function list(items: Link[], state: LinksState, showGroup = false): string {
  return `<ul class="link-list">${items.map((l) => row(l, state, showGroup)).join('')}</ul>`;
}

function pick(ids: string[]): Link[] {
  return ids.map((id) => byId.get(id)).filter((l): l is Link => !!l);
}

export const links: Screen = {
  id: 'links',
  title: 'الروابط',
  render(root) {
    let state = readJSON<LinksState>(KEY, { fav: [], recent: [] }, valid);
    let query = '';

    root.innerHTML = `
      <section class="card hero">
        <p class="eyebrow">الروابط</p>
        <h1 class="title">كل روابط الخطة</h1>
        <p class="muted">${LINKS.length} رابط في ${LINK_GROUPS.length} مجموعات. النجمة بتثبّت الرابط فوق.</p>
        <label class="search">
          ${icons.search}
          <input type="search" placeholder="دوّر: امتحان، نطق، Goethe…" aria-label="دوّر في الروابط" autocomplete="off" />
        </label>
      </section>
      <div class="links-body"></div>`;

    const body = root.querySelector<HTMLElement>('.links-body') as HTMLElement;
    const input = root.querySelector<HTMLInputElement>('input[type=search]') as HTMLInputElement;

    const draw = () => {
      if (query.trim()) {
        const found = LINKS.filter((l) =>
          matches([l.name, l.desc, groupTitle.get(l.group), TYPE_NAMES[l.type], host(l.url)].join(' '), query),
        );
        body.innerHTML = `
          <section class="card">
            <h2 class="card-title" aria-live="polite">${found.length ? `${found.length} نتيجة` : 'مالقيتش حاجة'}</h2>
            ${found.length ? list(found, state, true) : '<p class="muted">جرّب كلمة تانية، أو دوّر بالألماني أو بالعربي.</p>'}
          </section>`;
        return;
      }
      const favs = pick(state.fav);
      const recent = pick(state.recent);
      body.innerHTML = `
        ${favs.length ? `<section class="card"><h2 class="card-title">المفضلة</h2>${list(favs, state, true)}</section>` : ''}
        ${recent.length ? `<section class="card"><h2 class="card-title">آخر اللي فتحته</h2>${list(recent, state, true)}</section>` : ''}
        ${LINK_GROUPS.map(
          (g) => `
          <section class="card" id="group-${g.id}">
            <h2 class="card-title">${rich(g.title)}</h2>
            ${g.note ? `<p class="note">${rich(g.note)}</p>` : ''}
            ${contact(g)}
            ${list(
              LINKS.filter((l) => l.group === g.id),
              state,
            )}
          </section>`,
        ).join('')}`;
    };

    const save = (next: LinksState) => {
      state = next;
      writeJSON(KEY, state);
    };

    input.addEventListener('input', () => {
      query = input.value;
      draw();
    });

    body.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const star = target.closest<HTMLElement>('[data-fav]');
      if (star) {
        const id = star.dataset.fav as string;
        const fav = state.fav.includes(id) ? state.fav.filter((x) => x !== id) : [id, ...state.fav];
        save({ ...state, fav });
        draw();
        body.querySelector<HTMLElement>(`[data-fav="${id}"]`)?.focus();
        return;
      }
      const open = target.closest<HTMLElement>('[data-open]');
      if (open) {
        const id = open.dataset.open as string;
        save({ ...state, recent: [id, ...state.recent.filter((x) => x !== id)].slice(0, RECENT_MAX) });
        // نستنى لحد ما الرابط يفتح، وبعدين نحدّث «آخر اللي فتحته»
        setTimeout(draw, 400);
      }
    });

    draw();
  },
};
