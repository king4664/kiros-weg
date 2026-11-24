import { ladderSuggestion } from '../lib/progress';
import { RUNG_NAMES, type Rung } from '../lib/today';
import { answerLadder, getLadder, getLadderAnswered } from './daystore';
import { esc, rich } from './dom';
import { makeDayStat } from './stats';

/** جزء 3 */
const RULE = '**السلّم:** تطلع درجة بس لما تكمّل 6 أيام في الأسبوع. ولو فاتك يومين، تنزل درجة.';

/** كارت «تطلع درجة؟» أو «تنزل درجة؟» لو فيه اقتراح. بيظهر في «النهارده» و«المتابعة». */
export function ladderCard(today: Date): string {
  const rung = getLadder();
  const s = ladderSuggestion(today, rung, makeDayStat(), getLadderAnswered());
  if (!s) return '';
  const to = (s.kind === 'up' ? rung + 1 : rung - 1) as Rung;
  const text =
    s.kind === 'up'
      ? `كمّلت ${s.stats.complete} أيام كاملة في الأسبوع. تطلع درجة؟`
      : `فاتك ${s.stats.missed === 2 ? 'يومين' : `${s.stats.missed} أيام`} في الأسبوع. تنزل درجة؟`;
  return `
    <section class="card special">
      <p class="eyebrow">السلّم</p>
      <p><strong>${text}</strong></p>
      <p class="small">من «${esc(RUNG_NAMES[rung])}» لـ«${esc(RUNG_NAMES[to])}».</p>
      <p class="small muted">${rich(RULE)}</p>
      <div class="task-actions">
        <button type="button" class="btn" data-ladder="yes" data-key="${s.weekId}:${s.kind}" data-to="${to}">${
          s.kind === 'up' ? 'أيوه، اطلع' : 'أيوه، انزل'
        }</button>
        <button type="button" class="ghost-btn" data-ladder="no" data-key="${s.weekId}:${s.kind}">لأ</button>
      </div>
    </section>`;
}

/** بيرد على الاقتراح لو الضغطة على زرار من زراير الكارت. بيرجّع true لو اتعامل معاها. */
export function handleLadderClick(target: HTMLElement): boolean {
  const btn = target.closest<HTMLElement>('[data-ladder]');
  if (!btn) return false;
  answerLadder(btn.dataset.key as string, btn.dataset.ladder === 'yes' ? (Number(btn.dataset.to) as Rung) : null);
  return true;
}
