import { describe, expect, it } from 'vitest';
import { parseRoute } from './router';

describe('الـrouting', () => {
  it('بيعرف الشاشات', () => {
    expect(parseRoute('#/links')).toBe('links');
    expect(parseRoute('#/plan?time=night')).toBe('plan');
    expect(parseRoute('#/settings')).toBe('settings');
  });

  it('أي حاجة تانية = النهارده', () => {
    expect(parseRoute('')).toBe('today');
    expect(parseRoute('#/')).toBe('today');
    expect(parseRoute('#/nothing')).toBe('today');
  });
});
