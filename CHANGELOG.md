# Changelog

All notable changes to **eegfaktura-web (React frontend)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
versioning follows the deployment release tags. Detailed diffs stay in the `git log`;
this changelog highlights the changes relevant for overview and operations.

## [Unreleased]

### Changed
- Billing run status label "Versendet" renamed to "Versand gestartet". The mails are handed to
  the mail relay (rate-limited, so they trickle out over time) — "Versendet" wrongly implied
  they were already delivered. The reworded label reflects that the send was started, not that
  delivery is confirmed.

### Fixed
- Billing run "Versendet" / "Abgerechnet" timestamps showed the raw UTC time (2h early in
  summer). `reformatDateTimeStamp` sliced the naive timestamp string with no timezone
  conversion; billing sends these from `LocalDateTime.now()` in a UTC container. It now
  interprets the value as UTC and renders it in the viewer's local time (DST-aware). Output
  format unchanged.

## [1.0.9] – 2026-07-05

### Fixed
- Billing period selector, follow-up to v1.0.8: the selectable range is no longer capped by
  where energy data ends. Billing is time-driven, but the range came straight from the energy
  metadata, so an EEG whose data is frozen in the past (e.g. the platform-fee EEG `RC000000`
  with a single stale 2022 record) only offered that old period plus the current one — every
  quarter in between (incl. the one being billed) was missing. The upper bound is now always
  the current period; the lower bound stays the energy start, or the EEG creation date
  (`createdAt`) when there is no energy data. EEGs with up-to-date energy data are unaffected.

## [1.0.8] – 2026-07-05

### Fixed
- Billing period selector: for an EEG **without energy data** (e.g. the platform-fee EEG
  `RC000000`) the selectable periods no longer collapse to the current period. The period
  range was derived solely from energy metadata, which degenerates to "today" without data,
  so once a quarter ended its period could no longer be selected for billing. It now falls
  back to the EEG creation date (`createdAt`, newly provided by the backend) as the lower
  bound. EEGs **with** energy data are unaffected (range still comes from their metadata).

## [1.0.7] – 2026-07-05

### Added
- Member e-mail hardening (web side of the suite-wide mail-address hardening; prod log
  review found 73 failed sends across 11 tenants in one week):
  - The **registration** form now validates the e-mail format — it only had a
    required-check, so `'x'` or a bare space were accepted; the edit form already
    validated. Both forms now use one shared rule (`src/util/EmailAddress.util.ts`:
    ASCII local part, TLD >= 2 letters, `;`-separated lists without spaces).
  - The participant service normalizes the address on **create, update and partial
    update** (trim per `;`-part, canonical `;`-join) before sending — the backend
    enforces the same rule server-side.
  - Member detail pane shows an **"E-Mail ungültig"** chip when the stored address
    does not match the rule (legacy data), so admins can spot and fix it.
  - Notifications: failed mail sends (`Mail` log notifications from the backend) now
    render with a readable text — previously the error row appeared with an icon but
    an **empty** message line; Excel-import notifications now list their hint messages
    (e.g. rows whose e-mail was not imported).

### Fixed
- EEG master data: the e-mail field's validation rule used `regex:` — not a
  react-hook-form rule key — so it never ran; now a working `pattern` with the shared rule.

### Changed
- CI: Preview-Deployments (ADR-0007) — Push auf `preview/**` baut+deployt on-demand in die Dev-Zone (sha-pinned, kein `:latest`), Auto-Reset bei Branch-Delete.
- Billing config: removed the "Erzeuge Gutschriften für UST-pflichtige Erzeuger" toggle.
  UST-registered producers (companies) now always receive the reverse-charge credit note; the
  "Abrechnungsinfo" variant is no longer offered. `createCreditNotesForAllProducers` is now sent
  as `true` on both create and update of the billing config (the primitive-boolean field would
  otherwise fall back to `false` on save and re-enable the info document). The three
  "Abrechnungsinfos: …" text fields are relabeled "Gutschriften für Firmen: …" — same fields,
  they feed the reverse-charge credit note. (Existing EEGs still on the old setting are switched
  over by a one-off DB update; billing service, document type and schema are unchanged, so
  historical info documents stay intact.)
- Billing config: the credit-note text fields are now labeled by member type —
  "Gutschriften für Mitgliedstyp Privat: …" (producers without a VAT ID) and
  "Gutschriften für Mitgliedstyp Firma: …" (VAT-registered, reverse-charge) — so it is clear
  which member type drives the assignment (the tariff models will follow the same Firma/Privat split).

### Fixed
- Day view previous/next-day arrows stepped wrong in **summer** (any date after
  the spring-forward DST change, e.g. reported in prod on June dates): forward got
  stuck on the same day and backward jumped two days. `dateToDayOfYear` counted
  days by dividing wall-clock milliseconds by 24h, which loses a day once a 23h
  DST day sits between 1 January and the date. Count calendar days via `Date.UTC`
  instead (DST-immune). Winter was unaffected, which is why it only showed on
  current-period (summer) data. Added a regression test that runs under
  `Europe/Vienna` and round-trips every day of the year across the DST boundary. (#67)
- Repaired two stale unit tests (`FilterHelper.util`, `ParticipantPane.functions`) that had drifted
  from the code they cover: `filterActiveParticipantAndMeter` now gets realistic meter `status` and
  the call-site `.filter(p => p.meters.length > 0)`; `buildAllocationMapFromSelected` reads the
  energy report from the store, so the test mocks the store and asserts current behaviour
  (zero-kWh meters included, `participantId` present). Test-only — no production change.
- German UI text: spelling/grammar corrections across the German locale resources
  (`locales/de/common.json`, `error.json`) and several components — real typos
  (Steuernummer, Periode, vorhanden, Aktivierungs-Code, Produktion), missing inflection
  (Mitgliedsbeitrag, Mandatsreferenz, "des Teilnahmefaktors", "mit den Marktpartnern",
  "wenn alle Daten", polite "Ihren"), and compound spacing/hyphenation (Zählpunktgebühr,
  Kontaktperson, Kontoinhaber, Filteroptionen, Netzbetreiber-ID, Gemeinschafts-ID,
  Online-/Offline-Registrierung, E-Mail-Adresse, USt., SEPA). Billing config card additionally:
  "führenden Nullen", "z. B.", "Rechnungsnummern". Text-only — no logic change. (Fable spell-audit)


## [1.0.5] – 2026-07-04

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
  thinning (`interval="preserveStart"` + `minTickGap`) so recharts drops labels
  to fit the available width, with even spacing (`preserveStartEnd` forced the
  last label and left an uneven gap before it).
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
