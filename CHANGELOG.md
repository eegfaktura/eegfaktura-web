# Changelog

All notable changes to **eegfaktura-web (React frontend)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
versioning follows the deployment release tags. Detailed diffs stay in the `git log`;
this changelog highlights the changes relevant for overview and operations.

## [Unreleased]

### Added
- Metering point day view: previous/next-day arrows around the date, so you can
  step through days without opening the calendar and see the chart update in
  place. The arrows are clamped to (and disabled at the edges of) the same
  billing-period range as the date picker; the calendar stays for larger jumps.

### Changed
- Metering point day view now defaults to **yesterday** instead of today, because
  today's 15-minute data is still incomplete when the view opens. When a
  **non-current billing period** is selected, it opens on that period's **first
  day** (period start) instead of 1 January.

### Fixed
- Member registration: the suggested next member number was derived from the
  count of *active* members (`activeParticipants.length + 1`), which recycled the
  numbers of archived members and collided with the per-tenant unique index on
  `base.participant` (customer report: the suggestion is often wrong). Derive it
  instead from the highest numeric tail across *all* members (incl. archived),
  preserving any prefix and zero-padding (`001→002`, `MG-001→MG-002`), and
  re-sync the form field once the member list resolves unless the user already
  edited it. Ported from an AGPL-3.0 sibling deployment.
- Day view X-axis labels overlapped on narrow screens (e.g. Safari on mobile):
  the fixed `interval={6}` rendered ~14 time labels regardless of width, which
  fit on a wide desktop chart but ran together on a phone. Use responsive tick
  thinning (`interval="preserveStartEnd"` + `minTickGap`) so recharts drops
  labels to fit the available width.
- Day view date button wrapped onto three lines ("1." / "Jan." / "2023") next to
  the new prev/next arrows: as a flex item it collapsed to min-content. Keep it on
  a single line (`flexShrink: 0`) and let the day control size to its content
  instead of the fixed 30% width used by the other period selectors.

## [1.0.4] – 2026-06-30

### Security
- Cleared the critical Dependabot dev-dependency alerts: bumped `vitest`
  to `^3.2.6` (UI-server arbitrary file read/execute) and forced
  `form-data` `^4.0.4` via a `pnpm.overrides` entry. Both are development
  dependencies (never shipped in the production bundle); the production
  `vite build` is unchanged.

### Fixed
- Type-check: `tsc` now passes (0 errors). The `vitest` bump restored the
  test-global types and a type-only fix to `NewDatePickerForm` (`rules` prop
  now uses the parameterized `RegisterOptions` type) cleared the last error.
  No runtime/UI change — types are erased at compile time. The CI build step
  may drop its `tsc`-skip workaround.
- Test tooling: bumped `@testing-library/jest-dom` to `^6` so the unit suite
  runs again under vitest (`src/setupTests.ts` already imported the v6-only
  `/vitest` entry point while the package was pinned to v5).

### Added
- Metering point energy chart: a day view (`D`) showing the day's 15-minute
  values as a line chart (EEG vs EVU), with day-by-day navigation. Pulls raw
  interval data from the energystore `/eeg/v2/{ec}/raw` endpoint. Ported from an
  AGPL-3.0 sibling deployment.

### Changed
- Day view: restrict the date picker to the billing-period range so only days with data are selectable (mirrors the month selector). (#72)
- Chart period switch now defaults to the current date's segment instead of the
  EEG period end (which often has no data yet).
- Day view date navigation uses Ionic's localized `IonDatetime` picker
  (`de-DE`, `DD.MM.YYYY`) instead of a raw native `<input type="date">`.

## [1.0.3] – 2026-06-29

### Fixed
- Dashboard finances: "Verkauft" and "Marge EEG" no longer show `NaN €` when an
  active tariff leaves the optional fields `freeKWh` (VZP) or `baseFee` (EZP)
  empty — they are now treated as `0`, matching `TariffHelper`. (#59)

## [1.0.2] – 2026-06-28

### Fixed
- Notifications: 24-hour time format (`HH:mm:ss`) instead of 12h without AM/PM. (#56)

## [1.0.1] – 2026-06-28

### Fixed
- Billing period: defaults to the current date again instead of a hardcoded
  `2026-02-01`. (#55)

## [1.0.0] – 2026-06-28

First production release built entirely from public source.

### Fixed
- Configuration: `keycloak-config.json` is baked into the image as an env template
  instead of an empty `{}`. (#54)

### Changed
- CI: stage-1 source build; push to the registry's development tier with an
  auto-rollout bridge (dispatch-deploy). (#51, #52)
- Added README with service overview and tech stack. (#53)
