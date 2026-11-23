import type { Block } from '../lib/markdown';
import { esc, rich } from '../lib/rich';

/** أجزاء الخطة لـHTML. الجداول بتبقى كروت صغيرة علشان تتقري على 360px. */
export function renderBlocks(blocks: readonly Block[]): string {
  return blocks.map(renderBlock).join('');
}

function renderBlock(b: Block): string {
  switch (b.t) {
    case 'h':
      return `<h3 class="sub-title">${rich(b.text)}</h3>`;
    case 'p':
      return `<p>${rich(b.text)}</p>`;
    case 'list': {
      const tag = b.ordered ? 'ol' : 'ul';
      const items = b.items.map((i) => `<li>${rich(i.text)}${renderBlocks(i.sub)}</li>`).join('');
      return `<${tag} class="prose-list">${items}</${tag}>`;
    }
    case 'table':
      return `<div class="rows">${b.rows
        .map(
          (r) => `
          <div class="row-card">
            <p class="row-title">${rich(r[0] ?? '')}</p>
            <dl class="kv">${r
              .slice(1)
              .map((c, i) => (c ? `<div><dt>${rich(b.head[i + 1] ?? '')}</dt><dd>${rich(c)}</dd></div>` : ''))
              .join('')}</dl>
          </div>`,
        )
        .join('')}</div>`;
    case 'code':
      return `<pre class="code" dir="ltr" lang="de">${esc(b.text)}</pre>`;
  }
}
