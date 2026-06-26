# eegfaktura-web

> Customer-facing web application for the eegfaktura suite.

The main single-page app for members and managers of renewable energy communities
(EEGs): managing metering points, participants, tariffs and billing accounts, and
visualising energy data. Authenticates via Keycloak (OIDC) and talks to the backend,
energystore, filestore and billing services. (Container image: `vfeeg-web`.)

Part of the **eegfaktura** suite — an open-source billing and management platform
for Austrian renewable energy communities (*Erneuerbare-Energiegemeinschaften*, EEG).

## Tech stack

- **TypeScript**, **React 18** + **Ionic 7** (React Router 5)
- **Vite 5** build; **pnpm** package manager
- **Redux Toolkit** + react-redux
- **OIDC** auth (`oidc-client-ts`, `react-oidc-context`); **i18next**; **Recharts**
- Vitest + Cypress (tests); served in production by **Caddy**

## Structure

- `src/` — `components/`, `pages/`, `service/` (auth, eeg, energy, billing,
  filestore, participants, tariffs), `store/`, `models/`, `theme/`; `locales/` (i18n)
- Entry point: `src/main.tsx`; runtime config fetched from `/config/keycloak-config.json`

## Development

On Windows, install [`fnm`](https://nodejs.org/en/download/package-manager) and set up
Node via `fnm use .nvmrc`, and install [`pnpm`](https://pnpm.io/installation#using-choco).
Optionally install [`act`](https://nektosact.com/installation/chocolatey.html) to run
GitHub Actions locally via `act pull_request`.

## Build

```bash
pnpm install
pnpm run build        # tsc && vite build  →  dist/
```

## Run

Dev server:

```bash
pnpm run dev          # Vite dev server; setupProxy.js proxies the backends
```

Docker: the built image serves `dist/` via Caddy on port **8080**.

## Configuration

Dev environment variables (Vite):

- `VITE_API_SERVER_URL` (default `/api`) — eegfaktura-backend
- `VITE_ENERGY_SERVER_URL` (default `/energystore`) — energystore
- `VITE_BILLING_SERVER_URL` (default `/cash`) — billing
- `VITE_FILESTORE_SERVER_URL` (default `/filestore`) — filestore

Runtime Keycloak config: `/config/keycloak-config.json` (`auth-server-url`, `realm`,
`resource`). Ports: container **8080**; dev server **5173**.

## Dependencies

- **Keycloak** — OIDC authentication
- **eegfaktura-backend** (`/api`), **energystore** (`/energystore`),
  **billing** (`/cash`), **filestore** (`/filestore`)

## License

GNU Affero General Public License v3.0 (AGPL-3.0) — see [`LICENSE`](LICENSE).
