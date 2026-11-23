import daysJson from './days.json';
import decisionsJson from './decisions.json';
import linksJson from './links.json';
import milestonesJson from './milestones.json';
import nicosJson from './nicos.json';
import templatesJson from './templates.json';
import weeksJson from './weeks.json';
import wordsJson from './words.json';
import type {
  Decisions,
  Link,
  LinkGroup,
  Milestone,
  NicosLessons,
  PlanDay,
  SpecialDay,
  Template,
  TemplateId,
  Week,
  Word,
} from './types';

// الـJSON مالوش types لوحده، فبنحددها هنا، والتستات (data.test.ts) بتتأكد إن كل حقل موجود وصح.
export const LINK_GROUPS = linksJson.groups as LinkGroup[];
export const LINKS = linksJson.links as Link[];
export const WORDS = wordsJson as Word[];
export const MILESTONES = milestonesJson as Milestone[];
export const WEEKS = weeksJson as Week[];
export const DECISIONS = decisionsJson as Decisions;
export const TEMPLATES = templatesJson as Record<TemplateId, Template>;
export const PLAN_DAYS = daysJson.days as PlanDay[];
export const SPECIAL_DAYS = daysJson.specials as SpecialDay[];
export const NICOS = nicosJson as NicosLessons;

export * from './types';
