# Log Doom

Time-tracking web app for engineering managers. Static SPA deployed to logdoom.com via S3 + CloudFront.

## Commands

- `npm run dev` — Start dev server (Vite)
- `npm run build` — Type-check and build to `dist/`
- `npm run lint` — Run ESLint
- `npm run preview` — Preview production build locally

## Architecture

- **Stack**: React 19, TypeScript, Vite, Tailwind CSS v4
- **Persistence**: localStorage keyed by date (`logdoom:YYYY-MM-DD`)
- **Routing**: State-based view switching (no router), two views: Log and Summary
- **Styling**: Tailwind utility classes only, mobile-first, dark theme (zinc palette)

## Deployment

- **Hosting**: S3 + CloudFront, custom domain `logdoom.com`
- **CI/CD**: GitHub Actions deploys on push to `main` (OIDC auth, no stored secrets)
- **Infra**: CloudFormation template in `infra/template.yaml`
- `scripts/setup.sh` — One-time infra provisioning (ACM cert + CloudFormation stack)
- `.github/workflows/deploy.yml` — Auto-deploy workflow

## Key files

- `src/categories.ts` — 12 time categories with colors, hour options constant
- `src/storage.ts` — localStorage read/write helpers
- `src/components/LogView.tsx` — Main view: date nav + category rows + hour buttons
- `src/components/SummaryView.tsx` — 14-day aggregate bar chart + daily breakdown
- `src/App.tsx` — App shell with view switching
