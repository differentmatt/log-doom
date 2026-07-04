# Trackers: Work + Exercise (design plan)

Revision to make Log Doom track multiple isolated "groups of things" (starting with
Work and Exercise) with an easy switch between them. Work tracking is preserved
unchanged.

## Locked decisions

- **Generic trackers.** A `tracker` is a named scope with its own items (categories/
  exercises) and a unit. Work and Exercise are two seeded instances; adding a third
  later is just another registry entry.
- **Exercise unit = sets × reps.** A day value for an exercise is `{ sets, reps }`.
- **Entry UX = inline steppers.** Each exercise row shows `– sets +` / `– reps +`,
  always visible, one tap each. No popover.
- **Logging-only for exercise (for now).** The existing weekly-trends Summary stays
  work-only and is hidden when a non-analytics tracker is active. Exercise analytics
  are a later phase.
- **Synced to the existing backend.** No DynamoDB schema change; add a `tracker`
  param and namespaced sort keys.

## Why this is low-risk

The DynamoDB item stores `log` as opaque JSON (`backend/handlers/days.js`), so a
`{sets,reps}` value needs no backend value handling. Work keeps its exact current
local keys and API path. New trackers use namespaced keys that sort clear of
existing data (`DAY#exercise#…` sorts after all digit-prefixed `DAY#<date>` keys in
ASCII), so existing range queries can't sweep them in and **no existing work data is
migrated**.

## Data model (frontend)

```ts
type TrackerUnit = 'hours' | 'sets-reps'
interface Tracker {
  id: string          // 'work', 'exercise', or crypto.randomUUID()
  label: string
  unit: TrackerUnit
  icon?: string       // emoji
  sortOrder: number
  deleted: boolean
}

type LogValue = number | { sets: number; reps: number }
type DayLog = Record<string, LogValue>   // itemId -> value
```

## Storage keys

Work stays on legacy keys (no migration); new trackers are namespaced. A
`dayKey(trackerId, date)` helper returns the legacy key when `id === 'work'`.

| Data     | Work (unchanged)      | New tracker                    |
|----------|-----------------------|--------------------------------|
| Day log  | `logdoom:<date>`      | `logdoom:t:<id>:<date>`        |
| Items    | `logdoom:categories`  | `logdoom:t:<id>:categories`    |
| Registry | `logdoom:trackers` (new: list of Tracker)                |

Storage functions (`getDayLog`, `setHours`/`setValue`, `resetDay`, category CRUD)
gain a `trackerId` parameter threaded explicitly. Use a versioned migration key
(e.g. `logdoom:migrated:trackers:v1`) that only seeds the registry — it does not
move day data.

## Backend / sync

- Days + settings handlers accept optional `?tracker=<id>`. Absent or `work` →
  legacy SK (`DAY#<date>`, `SETTINGS`); otherwise `DAY#<id>#<date>` / `SETTINGS#<id>`.
- `api.ts` calls pass the tracker; `sync.ts` `pullRemote` iterates per tracker.
- CloudFormation change is only the inline Lambda code — no table schema change.
- Note: CI must pass the same `CREATE_OIDC_PROVIDER` value as setup (existing gotcha).

## UI

- **Header switcher**: segmented control (Work | Exercise), selection persisted in
  `sessionStorage` (same pattern already used for the selected date).
- **LogView** generalizes on the active tracker's unit: `hours` → existing preset
  buttons; `sets-reps` → inline steppers per row showing current `3×10`.
- **Summary** button shown only for analytics-capable trackers (work) for now.
- **Settings** gains a tracker manager (add/rename/reorder/delete), reusing the
  existing per-category editor patterns, scoped per tracker.

## Build order (phases)

1. Types + storage helpers + tracker registry + seed/migration. **No visible change**
   — verify the app behaves exactly as before.
2. Header switcher + generalize LogView for the `hours` unit.
3. `sets-reps` unit + inline-stepper exercise entry UI.
4. Settings tracker/exercise management.
5. Backend `tracker` param + per-tracker sync + deploy.
