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
    description: 'Recurring 1:1 meetings with your direct reports',
    color: '#2563eb',
  },
  {
    id: 'mgr-peer-1on1',
    label: 'Manager & Peer 1:1s',
    description: '1:1s with your manager, skip-levels, and peer managers',
    color: '#7c3aed',
  },
  {
    id: 'hire-eval',
    label: 'Hiring — Evaluation',
    description: 'Interview panels, debrief sessions, resume review',
    color: '#db2777',
  },
  {
    id: 'hire-process',
    label: 'Hiring — Process',
    description: 'Job descriptions, recruiter syncs, pipeline management',
    color: '#e11d48',
  },
  {
    id: 'people-perf',
    label: 'People & Performance',
    description: 'Performance reviews, coaching, career development, PIPs',
    color: '#ea580c',
  },
  {
    id: 'team-rituals',
    label: 'Team Rituals',
    description: 'Standups, retros, sprint planning, team meetings',
    color: '#d97706',
  },
  {
    id: 'product-strategy',
    label: 'Product & Strategy',
    description: 'Roadmap discussions, product reviews, strategy sessions',
    color: '#65a30d',
  },
  {
    id: 'eng-health',
    label: 'Engineering Health',
    description: 'Tech debt review, incident response, on-call, architecture',
    color: '#16a34a',
  },
  {
    id: 'eng-leadership',
    label: 'Engineering Leadership',
    description: 'Design reviews, code reviews, mentoring senior ICs',
    color: '#0d9488',
  },
  {
    id: 'org-cadence',
    label: 'Org Cadence',
    description: 'All-hands, leadership meetings, cross-team syncs, comms',
    color: '#0891b2',
  },
  {
    id: 'ai-adoption',
    label: 'AI Adoption',
    description: 'AI tooling evaluation, prompt engineering, team enablement',
    color: '#6366f1',
  },
  {
    id: 'misc',
    label: 'Misc / Untracked',
    description: 'Admin, email triage, context switching, anything else',
    color: '#78716c',
  },
]

export const hourOptions = [0.5, 1, 1.5, 2, 3, 4, 5] as const
