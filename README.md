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
- **Vite 6** build; **pnpm** package manager
- **Redux Toolkit** + react-redux
- **OIDC** auth (`oidc-client-ts`, `react-oidc-context`); **i18next**; **Recharts**
- **Vitest** (unit tests); served in production by **Caddy**

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
`resource`).

Optional Dynatrace Real User Monitoring: set `DYNATRACE_RUM_URL` on the container to the URL of the
Dynatrace JavaScript tag (`https://…/…_complete.js`). Caddy then renders
`<script src="…" crossorigin="anonymous" async>` into `index.html`; without the variable, or with a
value that is not such an https `.js` URL, no tag is emitted and no session data leaves the browser.
The tag loads `async`, so a slow or blocked CDN does not delay the page; actions before the agent has
loaded are not captured. Set the script execution attribute of the Dynatrace application
(settings → injection → snippet format) to `async` as well. Ports: container **8080**; dev server **5173**.

## Dependencies

- **Keycloak** — OIDC authentication
- **eegfaktura-backend** (`/api`), **energystore** (`/energystore`),
  **billing** (`/cash`), **filestore** (`/filestore`)
- **SheetJS (`xlsx`) from the vendor CDN, not npm** — SheetJS stopped publishing to npm after 0.18.5, which has known
  vulnerabilities. `package.json` points to `https://cdn.sheetjs.com/xlsx-0.20.3/xlsx-0.20.3.tgz` (v0.20.3, tagged
  2024-07-18, Apache-2.0); `pnpm-lock.yaml` pins it with a sha512 `integrity`, which pnpm checks on every install.
  CI and local installs need to reach `cdn.sheetjs.com`.
  - **Integrity:** pnpm 9 writes only the tarball URL for such a dependency; the `integrity` in the xlsx `resolution` of
    `pnpm-lock.yaml` was added by hand. A lockfile-only update (`pnpm add … --lockfile-only`, a Dependabot-style
    lockfile refresh) can drop it silently. The workflow `sheetjs-check.yml` (job „SheetJS pinned with integrity“,
    every pull request and push) fails when `package.json` or the lockfile no longer pin the expected URL and sha512.
  - **Updates:** Dependabot neither updates this dependency nor reports advisories for it. The same workflow compares
    with `https://cdn.sheetjs.com/xlsx-latest/package/package.json` every Monday (and on demand) and fails with a job
    summary when SheetJS has released something newer.
  - **Scanners:** GitHub's advisories GHSA-4r6h-8v6p-xvw6 (`< 0.19.3`) and GHSA-5pgg-2g8v-p4x9 (`< 0.20.2`) carry no
    fixed version on purpose, because the fixed releases are not on npm (github/advisory-database
    [#6144](https://github.com/github/advisory-database/pull/6144), [#8689](https://github.com/github/advisory-database/pull/8689),
    [#8690](https://github.com/github/advisory-database/pull/8690)). OSV copies these records, so OSV-Scanner keeps
    reporting xlsx 0.20.3 with both IDs. Trivy reads the version ranges and reports nothing. The security-scan gate is
    off today (`SCAN_FAIL_ON: none`); once it is on, it needs a central exception in the synced `security-scan.yml`
    (workspace), for web and admin.
  - **To update:** check the new tag and its CHANGELOG on git.sheetjs.com, change the URL in `package.json`, run
    `pnpm install`, then add the `integrity` to the tarball `resolution` in `pnpm-lock.yaml` by hand:
    `sha512-` + base64 of the SHA-512 of the downloaded `.tgz` (`openssl dgst -sha512 -binary x.tgz | base64 -w0`).
    Change `URL` and `INTEGRITY` in `.github/scripts/sheetjs-check.sh` to match. Run the SEPA tests
    (`src/__test__/service/sepa.*`).

## License

GNU Affero General Public License v3.0 (AGPL-3.0) — see [`LICENSE`](LICENSE).
