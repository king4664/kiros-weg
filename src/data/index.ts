import decisionsJson from './decisions.json';
import linksJson from './links.json';
import milestonesJson from './milestones.json';
import weeksJson from './weeks.json';
import wordsJson from './words.json';
import type { Decisions, Link, LinkGroup, Milestone, Week, Word } from './types';

// الـJSON مالوش types لوحده، فبنحددها هنا، والتستات (data.test.ts) بتتأكد إن كل حقل موجود وصح.
export const LINK_GROUPS = linksJson.groups as LinkGroup[];
export const LINKS = linksJson.links as Link[];
export const WORDS = wordsJson as Word[];
export const MILESTONES = milestonesJson as Milestone[];
export const WEEKS = weeksJson as Week[];
export const DECISIONS = decisionsJson as Decisions;

export * from './types';
