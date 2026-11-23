/** Hash routing: #/today، #/links، ... علشان GitHub Pages. */
export type RouteId = 'today' | 'links' | 'plan' | 'words' | 'progress' | 'settings';

export const TABS: readonly RouteId[] = ['today', 'links', 'plan', 'words', 'progress'];

export function parseRoute(hash: string): RouteId {
  const path = hash.replace(/^#\/?/, '').split('?')[0] ?? '';
  const id = path.split('/')[0] ?? '';
  const all: readonly string[] = [...TABS, 'settings'];
  return (all.includes(id) ? id : 'today') as RouteId;
}

export function onRoute(fn: (id: RouteId) => void): void {
  window.addEventListener('hashchange', () => fn(parseRoute(location.hash)));
}
