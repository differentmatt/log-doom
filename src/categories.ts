export interface Category {
  id: string
  label: string
  description: string
  color: string
}

export const categories: Category[] = [
  {
    id: 'dr-1on1',
    label: 'Direct Report 1:1s',
    description: 'Scheduled 1:1s, prep, and follow-ups with direct reports',
    color: '#2563eb',
  },
  {
    id: 'mgr-peer-1on1',
    label: 'Manager & Peer 1:1s',
    description: '1:1s with manager, peers; managing up and laterally',
    color: '#7c3aed',
  },
  {
    id: 'hire-eval',
    label: 'Hiring — Evaluation',
    description: 'HM interviews, peer interviews, debriefs, feedback writing, interview prep',
    color: '#db2777',
  },
  {
    id: 'hire-process',
    label: 'Hiring — Process',
    description: 'Recruiting syncs, interviewer pool mgmt, interview guides, sourcing reviews, pipeline mgmt, job postings',
    color: '#e11d48',
  },
  {
    id: 'people-perf',
    label: 'People & Performance',
    description: 'Perf reviews, calibration, promo work, leveling, comp, onboarding, PIPs',
    color: '#ea580c',
  },
  {
    id: 'team-rituals',
    label: 'Team Rituals',
    description: 'Standup, sprint planning, async retro, bug triage, on-call rotation management',
    color: '#d97706',
  },
  {
    id: 'product-strategy',
    label: 'Product & Strategy',
    description: 'Product strategy, roadmapping, product reviews, roasts, triad sync, design/eng sync, kickoffs, PRD reviews',
    color: '#65a30d',
  },
  {
    id: 'eng-health',
    label: 'Engineering Health',
    description: 'Bug management, incident response and retros, reliability, sentry/infra, flaky tests, tech debt decisions',
    color: '#16a34a',
  },
  {
    id: 'eng-leadership',
    label: 'Engineering Leadership',
    description: 'Staff meeting, RFCs, tech reviews, cross-team eng coordination, eng process and culture, leveling framework',
    color: '#0d9488',
  },
  {
    id: 'org-cadence',
    label: 'Org Cadence',
    description: 'All hands, EPD delivery meeting, org-wide rituals you attend but don\'t run',
    color: '#0891b2',
  },
  {
    id: 'ai-adoption',
    label: 'AI Adoption',
    description: 'Claude Code, AI pipeline, tooling experiments, automated workflows, hands-on technical work',
    color: '#6366f1',
  },
  {
    id: 'misc',
    label: 'Misc / Untracked',
    description: 'Donuts, lunches, social events, anything that doesn\'t fit elsewhere',
    color: '#78716c',
  },
]

export const hourOptions = [0.5, 1, 1.5, 2, 3, 4, 5] as const
