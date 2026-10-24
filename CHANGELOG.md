# Changelog

All notable changes to **eegfaktura-web (React frontend)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
versioning follows the deployment release tags. Detailed diffs stay in the `git log`;
this changelog highlights the changes relevant for overview and operations.

## [Unreleased]

### Added
- **Smart re-request of energy data** (konzept-smart-nachfordern). **Needs the eegfaktura-backend change "smart
  re-request" (per-meter periods, one-hour lock, live entry) deployed first or together**; an older backend
  ignores the per-meter periods and requests the whole period for the metering points with gaps.
  - "Zählpunktdaten nachfordern" has a new checkbox "Nur fehlende Daten anfordern (Smart)", on by default. It checks
    the energy data of the selected metering points first and requests only those with gaps, each from its first
    to its last missing day. A question names the numbers first ("Von 2.380 Zählpunkten fehlen bei 214 Daten
    (zusammen 1.033 Tage). Diese 214 jetzt anfordern?"). Metering points whose data could not be checked are named
    there and requested over the whole period only on request; otherwise the message after sending names them as
    not requested. If nothing could be checked (energystore down or timed out), the question warns that
    every metering point would be requested for the whole period. Nothing missing: an info, nothing is sent. Metering
    points not registered or not active in the period are left out with Smart. After an owner change or a new
    registration every entry of a metering point is checked; it counts as complete only if all entries are, and
    its gaps are requested as one period from the first to the last missing day over its entries. A period that
    reaches today is checked and requested up to yesterday (energy data of today cannot exist yet); the question
    says so.
  - Without Smart the request is as before; "Gesamte Gemeinschaft" now asks first with the number of metering
    points.
  - Metering points requested in the last hour are skipped by the backend; the dialog names how many and when
    they are all free again ("3 Zählpunkte wurden in der letzten Stunde schon angefordert, alle wieder frei ab
    14:40.").
  - Messages: a running request shows as one entry "Energiedaten-Anforderung läuft" (with "Antwort noch offen"),
    reloaded every minute while it is shown. Summary and live entry have the new groups "Bereits angefordert"
    (with "frei ab") and "Daten vollständig (nicht angefordert)".

### Fixed
- **GUI defects, second bundle (eegfaktura-dev tracking):**
  - **A failed save of the EEG settings showed the load text (261024-ca7):** "Fehler beim Laden der
    EEG-Basisdaten!" or a raw key such as `Bad Gateway_eeg_load`. It now shows "Die Änderung der EEG-Daten konnte
    nicht gespeichert werden." with the reason. An unknown load error shows "Die EEG-Daten konnten nicht geladen
    werden." with the reason instead of the raw key; the known load texts stay.
  - **A failed energy report load was silent (261024-ca6):** the dashboard and the member list just showed no
    energy. It now shows "Die Energiedaten konnten nicht geladen werden." with the reason (only for the latest
    request; an older one replaced by a newer one stays quiet). A community without any imported energy data yet
    (energystore answers "Record doesn't exist") still shows an empty report, without an error.
  - **Billing ZIP and Excel download without busy state, failures only in the console (261024-ca14, part of
    261024-ca6):** the buttons "ZIP", "DOWNLOAD" and "EXCEL" of a billing run now show "ZIP-Datei wird erstellt
    ..." / "Excel-Datei wird erstellt ..." while the file is built (no second click meanwhile) and on failure "Die
    ZIP-Datei konnte nicht erstellt werden." / "Die Excel-Datei konnte nicht erstellt werden." with the reason.
- **Dashboard "Energiemengen – Eingekauft/Verkauft" wrong after an owner change** (support 6611112, 6611148).
  A metering point with two participations in the period (old and new member) counted the value of one of them
  twice, e.g. 160 or 10 kWh instead of 5 + 80 = 85 kWh. Each participation now adds its own value once.
  Billing was not affected.
- **Error messages showed "body stream already read" instead of the real error** (pre-existing). When a server
  error had no JSON body (e.g. 502 from the ingress), the error handler read the body a second time and the
  browser's read error replaced the status text. The body is now read once; the toast names e.g. "Bad Gateway".
- **Messages: a card's data check moved to another card after a reload.** The list keyed its cards by position, so
  when a newer notification came first, the result of "Datenstand prüfen" showed on the wrong summary. Cards are
  now keyed by the notification id. More likely since the list reloads every minute while a request runs.
- **Messages: a failed load went unnoticed** (unhandled promise rejection). It now shows "Die Nachrichten konnten
  nicht geladen werden." with the reason, once until a load works again (the reload every minute during a running
  request does not repeat it). Switching the community empties the list first, so a failed load never shows the
  previous community's messages.
- **UX defects from Karl's analysis (23.10.2026), ids UX-1 … UX-8:**
  - **Participation factor 0 % was sent as 100 % (UX-4):** "Teilnahmefaktor ändern" sent `partFact || 100`, so
    an entered 0 reached the grid operator as 100 %. The field now accepts 1–100 only (like the meter form) and
    sends the entered value.
  - **"1.234,56" was saved as 1.234 (UX-8):** text fields with number input (`Input`, `isNumber`) replaced
    only the first comma. With a comma present, dots now count as thousand separators; dot-only input keeps its
    meaning ("1.5" stays 1.5). The tariff price fields (`NumberInput`) were not affected: they accept no dot.
  - **Expired session (UX-5):** a 401 counted as success. It now fails the call with "Deine Sitzung ist
    abgelaufen. Bitte melde Dich neu an." and starts the login (at most once per minute). A 401 with a valid
    session (the backend also uses 401 for a missing access group) shows "Dafür fehlt Dir die Berechtigung."
    instead and does not redirect.
  - **EDA process forms (UX-2):** Change participation factor, register metering point, revoke and request energy
    data now confirm "Die Anforderung wurde an den Netzbetreiber gesendet.". On failure the input stays and an
    error stays until it is closed. Before, the form was cleared either way and, except for the energy request,
    showed nothing. While a request runs, its button is disabled (no duplicate request to the grid operator).
    "Teilnahmefaktor ändern" parsed the backend's empty 204 answer as JSON; that no longer counts as a failure.
  - **Confirmations (UX-3):** revoking a data consent ("Anfordern" in the revoke form), deleting a new member
    ("Nein, Löschen") and deleting a metering point now ask first. A failed delete shows an error.
  - **New member and new metering point (UX-1):** a failed save no longer loses the form. The page or pane
    closes only after the save worked; on failure an error names the reason. "Registrieren" is disabled while
    saving, so a double click no longer creates the member twice.
  - **Silent failures (UX-6):** failed loads of members and tariffs and failed saves of member, metering
    point, participation factor, moving a metering point and a new metering point now show an error. A
    failed partial member update showed the raw key "Rejected_participant_update"; it now shows readable
    text.
  - **Auto-saved fields (UX-7):** an invalid value no longer resets the whole form, a store update no longer
    overwrites unsaved input in other fields, and a metering point field counts as saved only after the save
    worked. Saving the participation factor no longer clears the other fields of the form. Unsaved input stays
    with its member or meter and does not move to the next selection.
  - Not in this change: navigation below 992 px and the member screen on phones (UX-9, deferred).
- **New member: „Mandatsdatum fehlt!“ stayed after picking a date** (support 23.10.2026). Switching the debit type
  to CORE/B2B checks the still empty mandate date; the form validates on blur, but the date picker's input never
  passes the blur on, so picking a date did not re-check the field and the red message stayed — the member could
  not be saved. Picking a date now re-validates the field. Workaround until release: after picking the date, switch
  to „Kein SEPA“ and back to CORE/B2B.
- **Wording: „Teilnahmefaktor“ instead of „Teilnehmerfaktor“** (pilot feedback 22.10.2026). The title and the
  field label of „Teilnahmefaktor ändern“ and the warning for a missing factor said „Teilnehmerfaktor“, the info
  text and the other places already „Teilnahmefaktor“.

### Security
- `js-yaml` 3.14.1 → 3.15.2 (via xmlbuilder2) and 4.1.0 → 4.3.2 (build/lint tooling) through `pnpm.overrides`: GHSA-2883-xcg3-v3hh, GHSA-52cp-r559-cp3m, GHSA-5p4m-2wfm-xmqj (CVE-2026-59869, CVE-2026-84375) and two moderate advisories (platform#179).
- `lodash` 4.17.21 → 4.18.1 (via recharts) through `pnpm.overrides`: GHSA-r5fr-rjxr-66jc (CVE-2026-4800, HIGH) and two moderate advisories (platform#179).
- `vite` 6.4.3 → 6.4.4 (dev server/build): GHSA-587h-7wmj-h5pm (HIGH) and four moderate/low dev-server advisories; replaces Dependabot PR #173. 6.4.5 follows once it is 7 days old (platform#179).
- `immutable` 4.3.7 → 4.3.9 (via sass, build only) through `pnpm.overrides`: GHSA-wf6x-7x77-mvgw (CRITICAL per CVSS 9.8 (Trivy/NVD); GitHub rates it high), GHSA-v56q-mh7h-f735 and GHSA-xvcm-6775-5m9r (HIGH) (platform#179).
- `brace-expansion` 1.1.11 → 1.1.21 (via minimatch, dev tooling) through `pnpm.overrides`: GHSA-3jxr-9vmj-r5cp, GHSA-6j4f-fj2g-mc7p, GHSA-mh99-v99m-4gvg, GHSA-qhr7-859c-m2p7, GHSA-rgw5-rvv9-x895 (HIGH) and three moderate/low advisories (platform#179).
- `minimatch` 3.1.2 → 3.1.5 (eslint/test tooling) through `pnpm.overrides`: GHSA-23c5-xmqv-rm74, GHSA-3ppc-4f35-3m26, GHSA-7r86-cg39-jmmj (HIGH) (platform#179).
- `cross-spawn` 7.0.3 → 7.0.6 (eslint tooling) through `pnpm.overrides`: GHSA-3xgq-45jj-v275 (HIGH) (platform#179).
- `flatted` 3.3.1 → 3.4.4 (eslint cache) through `pnpm.overrides`: GHSA-rf6f-7fwh-wjgh, GHSA-25h7-pfq9-p65f (HIGH) (platform#179).
- `picomatch` 2.3.1 → 2.3.2 (build tooling) through `pnpm.overrides`: GHSA-c2c7-rcm5-vvqj (HIGH) and GHSA-3v7f-55p6-f55p (platform#179).
- `source-map-js` 1.2.1 → 1.2.2 (via postcss/vite, build only) through `pnpm.overrides`: GHSA-68fv-2mgg-jv7q (HIGH) (platform#179).
- `ws` 8.18.0 → 8.22.0 (via jsdom, tests only) through `pnpm.overrides`: GHSA-96hv-2xvq-fx4p (HIGH) and GHSA-58qx-3vcg-4xpx (platform#179).

### CI
- `rolling-release.yml`: no image build on a draft pull request — it runs when the pull request is marked ready for review (`ready_for_review`) and on every later push to it; `pr-checks.yml` still checks drafts. Pushes, tags and the deploy dispatch are unchanged.

## [1.8.0] – 2026-10-21

### Added
- **Time-of-use tariffs (ZVT)**: consumer and producer tariffs gain a
  "Einfach | Zeitbasiert" mode in the tariff dialog. Time-based tariffs
  configure a base price plus up to two named time windows (Von/Bis on the
  15-min raster, midnight crossing allowed, one shared discount, no free
  kWh). Client-side plausibility checks (raster, Von ≠ Bis, cyclic overlap)
  mirror the backend validation. During billing the app sends the tariff's
  generic time windows with the energystore report request, receives the
  per-window sums (`buckets`) per metering point and forwards them together
  with the window definitions to the billing service (consistency guard;
  simple tariffs are completely unchanged and never carry buckets).
- The Info/Impressum footer names the licence (AGPL-3.0) and links the source code of all components
  (github.com/eegfaktura), as AGPL-3.0 §13 asks for a network service.

### Changed
- Billing runs are started asynchronously (requires billing service with async billing run):
  `POST /api/billing` now answers `202`/`409` with the run id and the UI polls
  `GET /api/billingRuns/{id}` every 2s until the run is `DONE`/`NEW` (preview) or `FAILED`.
  While a run is `RUNNING` the start buttons disappear and a progress note is shown — an
  impatient second click can no longer queue a duplicate full run, and proxy timeouts on
  long runs are gone. Opening the billing panel while a colleague's run is in progress
  attaches to that run instead of starting a new one. Failures now surface the persisted
  `errorSummary` from the billing run (the old `abstractText` string-matching is removed)
  with a retry path via a fresh preview.
- **Billing breakdown expanded by default** (feedback 21.10.2026). The breakdown under the billing (net, VAT, gross
  …) now starts expanded and can be collapsed with the arrow; it was collapsed by default. A viewer who collapsed
  it before keeps that choice (stored in the browser). The small business margin reads „nach Abzug der rechnerischen
  USt bei Reverse Charge“ instead of „abzgl. …“: the amount is already deducted.
- **Participation factor: the time window is shown** (platform#176). The grid operator accepts a change only
  between 09:00 and 17:00 (Austrian time) and applies it from the next day; outside it rejects with „Prozessdatum
  falsch“ (ebUtilities EC_PRTFACT_CHANGE 1.09; prod logs 16.09.–20.10.2026: 67 such rejections in 30
  communities, mostly 08:00–09:00). The form „Teilnehmerfaktor ändern“ and the process description now say so,
  and outside the window the form warns before sending (sending stays possible; if the window closed while the
  form was open, the first click shows the warning). The message of a rejected change in Messages now shows the
  reason (it showed none, and an empty metering point because the rejection names none) and, for „Prozessdatum
  falsch“, says when to send it again.
- **Build: lockfile in sync, release with tsc** (platform#179). `pnpm-lock.yaml` now records the `form-data`
  override from `package.json` (form-data stays 4.0.6; no package version changes), so every CI install runs with
  `--frozen-lockfile` and the check „Lockfile in sync“ fails a PR instead of only warning. The release image
  and the full test suite build with `pnpm run build` (`tsc && vite build`), so a type error stops the release.
  `tsconfig.node.json` (vite.config.ts) uses `moduleResolution: bundler` and is type-checked in „Type check“.
- **Build: pnpm version in `package.json`** (platform#179). `packageManager: pnpm@9.12.1` records the pnpm
  version in the project; the release workflow reads it from there instead of its own `version:`.
- **Build: Vite plugins for Vite 6** (platform#179). `@vitejs/plugin-legacy` 5.4 → 6.1 and `@vitejs/plugin-react`
  4.3.2 → 4.7 declare Vite 6 as supported (the old versions expected Vite ≤ 5). The build output has the same
  files, legacy chunks included; the legacy polyfill chunk is larger (newer core-js).

### Fixed
- **ZVT (env/billing): a time-based tariff without an active window could be saved** (platform#175). web billed
  it as a simple tariff, billing as time-based, and the billing run stopped („keine Fenster-Teilsummen (buckets)“).
  The tariff form (producer and consumer tariffs) now shows a warning and keeps „Änderungen speichern“ disabled
  while „Zeitbasiert“ has no active window with Von and Bis (the same rule web uses for billing). Windows are still
  activated only with the checkbox „Zeitraum aktiv“. Tariffs already saved in that state still stop billing until
  they are opened and fixed.
- **ZVT (env/billing): billing failed after a tariff was switched to time-based** (platform#174). The energy report
  was only fetched again when members or the period changed, so after switching a tariff to „Zeitbasiert“ (or
  editing its windows) it had no buckets; billing then got the time
  windows without buckets and stopped („keine Fenster-Teilsummen (buckets)“). Now:
  - the report is also fetched again when the time windows of a tariff of the EEG's metering points change (EEGs
    without time-based tariffs and edits of tariffs no metering point has fetch as before); not while the
    application reloads EEG, tariffs and members (tenant switch, refresh) — that load ends with one fetch;
  - billing gets the time windows the energystore computed the buckets for (echoed in the report), not those of the
    current tariff. Billing started while the new report is still loading stops (missing buckets, a differing
    window, or buckets for a tariff that is no longer time-based) instead of billing buckets of other windows; it
    works once the report is there. billing checks the windows against the tariff, so a mismatch never bills;
  - an older report response that arrives after a newer one, or after the report was cleared, no longer replaces
    or clears it.
- Tariff card showed `Umsatzsteuer 0 %` for tariffs that actually carry a VAT rate. The backend
  serializes `vatInPercent` as `IntOrString`, so it can arrive as a JSON number; the card guarded
  it with `vatInPercent.length > 0`, which is `undefined` for a number and fell back to `0`. The
  card now coerces via `String(...)`, rendering the real rate for both number and string. Display
  only — the stored value was always correct.
- **Billing: retry after a failed run skipped the check before billing** (web#175 review). „Vorschau erstellen“
  after a failed run started the preview directly; like every other start button it now opens the check before
  billing (platform#148/#163) first.
- **Billing: a second poller for the same run** (web#175 review). With the member amounts shown, every status poll
  of a running run reloaded the amounts, and that reload cleared the flag the panel uses to see that a poller is
  already active; on the next poll the panel attached a second poller to the run (and so on), each polling
  `GET /api/billingRuns/{id}` every 2s. A separate polling flag, set only by the two pollers, now guards it.
  Internal: the unused state `failedRunId` is removed (no behaviour change).

## [1.7.2] – 2026-10-20

### Fixed
- **Messages showed an old list** (feedback 20.10.2026). The page loaded its notifications only when it was first
  opened; Ionic keeps the page mounted, so switching between Mitglieder and Messages never reloaded it (a new
  summary of an energy request was missing until the browser was reloaded), and after switching the community it
  still showed the previous community's messages. It now loads on every visit and when the community changes.
- **Billing mode info text** (feedback 20.10.2026). It said „OK“ creates the draft invoices; „OK“ only switches to
  billing mode. The text now names the steps as the buttons do: „Vorschau erstellen“ (drafts, Excel, ZIP),
  „Vorschau Akt.“, and „Abrechnung durchführen“ (final, not reversible). The cancel button reads „Abbrechen“.

## [1.7.1] – 2026-10-20

### Fixed
- **Member status: a metering point that left never counts as „in Anmeldung“** (platform#165). The rule after the
  prod query of 20.10.2026 (36 members with only left metering points in a stale registration state) was not part
  of the merged change: such members showed as „in Anmeldung“. They now count as inactive; a re-registered metering
  point counts once it is active again.

### Changed
- **Check before billing: buttons** (pilot feedback 20.10.2026). „Abbrechen“ and „Abrechnen“ were hard to tell apart:
  „Abbrechen“ is now grey on the left, the run on the right reads „Abrechnung durchführen“ („Trotzdem Abrechnung
  durchführen“ with warnings). While the check runs, the run button is disabled and reads „Prüfung läuft …“.
- **Billing breakdown toggle shows only the chevron** (feedback 20.10.2026), without the text „Aufstellung“; the
  label stays as tooltip and for screen readers.

## [1.7.0] – 2026-10-20

### Changed
- **Members without an active metering point count as inactive** (platform#165, decision 20.10.2026). The dashboard
  counted every member as active and always showed „0 inaktive“. It now counts, over all members and by the current
  state of their metering points: active (at least one active metering point), inactive (all left, archived or
  rejected, or moved to another member) and, if any, „in Anmeldung“ (one being registered, or none yet). The member
  list marks inactive members with „inaktiv“, from all their metering points (not only the ones the filter or the
  period shows); nothing is hidden. Stored data is unchanged.

## [1.6.0] – 2026-10-20

### Changed
- **Billing breakdown can be collapsed** (feedback 20.10.2026, platform#169). The table, the margins and the
  explanation take much height in the pane footer, so on small screens only a few metering points stayed visible.
  „Aufstellung“ collapses them to the line „Saldo Zahlungen (brutto)“; collapsed is the default, each viewer's choice
  is kept in the browser. The note on paid-out VAT to producers with a VAT ID stays visible when collapsed.
- **Margin wording:** the reverse charge VAT has its own line („Rechnerische USt bei Reverse Charge (20 %): …“) below
  the small business margin („… brutto, abzgl. rechnerischer USt bei Reverse Charge): …“). In one sentence the first
  amount read like the margin.

### Added
- **Messages: summary of an energy data request** (platform#173, with the backend of the same feature). The new
  notification shows the period, how many metering points were requested and accepted, and collapsible groups with
  the metering points (and their equipment names): rejected with reason, no answer, not requested with reason,
  requested again later. „Datenstand prüfen“ checks the energy data of the accepted metering points over the period
  the backend requested for each, with the check before billing (platform#148), and lists the metering points with
  incomplete data and those that cannot be checked (not loaded); „Erneut prüfen“ checks again.
  - **Deploy order:** this web release before the backend; on its own it changes nothing.

## [1.5.1] – 2026-10-19

### Fixed
- **Process history: „Datenfreigabe-Aufhebung“ was always empty** (platform#170). Since 1.2.0 the view asks for three
  protocols at once (`CM_REV_IMP;CM_REV_SP;CM_REV_CUS`). The backend (Go) drops a query parameter with a raw `;`, so
  the protocol arrived empty and no entry matched. The list is now sent encoded (`%3B`); the backend splits it as
  before. The other history categories ask for one protocol and were not affected.

## [1.5.0] – 2026-10-19

### Added
- **Billing: totals per document type and margins** (platform#169). The billing dialog shows invoices and credit
  notes with count, net, VAT and gross, read from the run's documents (billing
  `GET /billingRuns/{id}/billingDocuments`, no change in billing), in the preview and after billing.
  - „Gesamte EEG (brutto)“ is now „Saldo Zahlungen (brutto)“ with the explanation „Rechnungen minus Gutschriften,
    die zu erwartende Kontobewegung aus dieser Abrechnung“, in the same number format as the table (de-AT).
  - Below, two computed margins: „Marge bei Regelbesteuerung (netto)“ = invoices net minus credit notes net (VAT and
    reverse charge are neutral with input tax), and „Marge bei Kleinunternehmerregelung (brutto)“ = invoices gross
    minus credit notes and info documents gross minus the reverse charge VAT. The reverse charge VAT is 20 % (fixed, the standard rate
    for electricity) on the credit note lines without VAT to producers with a VAT ID; billing does not compute it, and
    for a credit note that mixes lines with and without VAT the net without VAT is taken back from the VAT sums and
    can be a few cents off. Info documents, if a run still has any, get their own row and count as paid out.
  - Only the margin that fits is shown, read from today's consumer tariffs of the metering points billed in the run
    (per member): all with VAT (rate above 0) → standard taxation, all without → small business scheme. For an older
    run whose tariffs changed since, the choice follows today's tariffs. Mixed tariffs show both lines and
    „Verbrauchertarife teils mit, teils ohne USt. Bitte prüfen.“; without a known consumer tariff both lines show.
    The membership fee does not count, it can be without VAT under standard taxation as well.
  - If credit notes to producers with a VAT ID show VAT, a note names the VAT and the producers (up to 10).
  - All texts describe the documents only, „Rechnerische Werte, keine steuerliche Beratung“; whether reverse charge
    applies is for the community's tax adviser. The reverse charge sentence appears only when the run has credit notes
    to producers with a VAT ID. Nothing blocks.

### Fixed
- **Billing: the totals include the metering point fees.** The billing dialog total (before „Gesamte EEG“, now
  „Saldo Zahlungen (brutto)“), the amount per member
  in the list and the total in the member's billing details now add the metering point fees, which billing already
  delivered (`meteringPointFeeSum`). Before, these totals were lower than the documents and the Excel export by the
  fees. The details show a line „Zählpunktgebühren“; their energy
  lines say „brutto“ instead of „netto“, which is what the amounts always were. A member with fees but no energy
  amounts in the period now gets the details too; before, the panel stayed empty.

### Removed
- **Dashboard: no money amounts.** The block „Finanzen“ is now „Energiemengen“ and shows only kWh. The euro amounts
  for „Eingekauft“ and „Verkauft“ and the „Marge EEG“ are gone: they were an estimate from the current tariffs
  (net, without membership and metering point fees, with a wrong VZP discount and the unused EZP base fee) and did
  not match the billing. The amounts are in the billing dialog.

## [1.4.0] – 2026-10-19

### Added
- **SEPA export: separate date for the credit transfers** (platform#167). The SEPA dialog has two dates: „Einzug am“
  for the direct debits (`ReqdColltnDt`) and „Überweisung am“ for the credit transfers (`ReqdExctnDt`), so the
  community's account is covered when the credit notes are paid. The transfer date starts 5 days after the debit date
  (a weekend moves to the Monday) and follows it until it is changed by hand; a transfer before the debit shows a
  warning. The EndToEndId of a credit transfer carries the transfer date. Changing a date discards files generated
  before. Before, one due date applied to all files.

### Fixed
- **A rejected metering point no longer disappears from the member list** (feedback Manuel Wurzinger, 19.10.2026).
  A metering point that had left and whose new registration was rejected kept its old inactive date and dropped
  out of the list for later periods; the filter „Abgelehnt“ did not show it either. The member list now always shows
  metering points with a rejected, invalid or revoked registration or a registration in progress, „Abgelehnt“
  shows the rejected, invalid and revoked ones, until the community acts (register again or archive). Only the list changes: billing, energy
  reports, export and dashboard counts still use the metering points of the period. Metering points that simply left
  still drop out after their period.
- Metering point card (member list, invoice details, registration): the exclamation mark of a metering point that
  has left is red, like that of a rejected one (from the day after its last day of participation); an invalid
  registration also shows the exclamation mark. In the member list, metering points with an open problem are
  sorted with the members that need attention.

## [1.3.1] – 2026-10-18

### Changed
- **Checks before billing: the energy balance is green or yellow** (feedback of the project group). It is OK
  (green) when the production was distributed completely (difference production – allocated below 0,01 kWh) and
  a warning (yellow) otherwise, with the text „Nicht die ganze Produktion wurde verteilt.“ or, as before, „Es wurde
  mehr Energie verteilt als produziert.“ (without production in the period: „Keine Produktion im Zeitraum.“, green).
  Before, it was only an info. The difference is shown with three decimals (cut off, not rounded),
  so a warning never shows „0 kWh“. A warning changes the button to „Trotzdem …“ like the other checks.

## [1.3.0] – 2026-10-18

### Added
- **Checks before billing** (platform#148). Before a preview and before the final billing run, an
  overview shows four checks for the selected period: metering points active in the period without a
  tariff (also an archived tariff; the member fee tariff is not checked), L3 values per metering point
  with days, the energy balance of the community (info; a warning only if more was distributed than
  produced) and whether every metering point has energy data for its active part of the period (from the
  period start or its activation day to the period end or its inactive day); gaps in the middle are shown
  with the number of missing quarter hours and the days, e.g. „96 Viertelstunde(n) fehlen (14.02.)“. The checks only warn; the run starts with
  „Trotzdem abrechnen“ / „Trotzdem Vorschau erstellen“, also while the checks are still loading. For the
  final run the overview replaces the confirmation „Abrechnungslauf“, repeats its text and highlights
  that the run cannot be undone. The picked invoice date now survives re-renders
  of the billing pane. The energy checks need energystore 1.6.0 (`POST /eeg/v2/{ecId}/billing-check`);
  without it they show „nicht geprüft“ and billing works as before.

## [1.2.3] – 2026-10-18

### Added
- CI: PR checks (tests on every pull request) and a security scan (leaked secrets in new commits,
  vulnerable dependencies, Dockerfile/Kubernetes misconfigurations). Dependency and misconfiguration
  findings are only reported and do not block; a leaked secret in new commits fails the check. Jobs for
  known failing tests are report-only.
- CI: every run keeps its scan and test results as artifacts for 30 days (`scan-*`,
  `test-results-<job>`, `known-errors-<job>`) for a CI report collector; the secret scan keeps
  outcomes and counts only.

### Fixed
- **The bank accepts more than one SEPA file per year** (user report 18.10.2026). Austrian banks take the first
  16 characters of the payment information id (`PmtInfId`) as the "Bestandskontrollnummer" and refuse a file
  whose first 16 characters they have seen before („Die Bestandskontrollnummer muss auf 16 Zeichen eindeutig
  sein“). The id was name, year and settlement interval, e.g. `EEGSTRASSH-2026-QY003`: the credit transfer and
  the direct debit of one period always had the same id, and for most names (from 9 characters) every file of a
  year had the same first 16 characters. After the first file (e.g. the direct debit) the bank refused the next
  one (e.g. the credit transfer for the credit notes, or the next period). The id now starts with the file kind
  (`G` credit transfer, `C` direct debit CORE, `B` direct debit B2B), the year and the billed period, followed
  by the name, e.g. `G2026YQ003-EEGSTRASSH`. Every file kind of every period is unique; the same file uploaded
  a second time still has the same id and is refused by a bank that checks the Bestandskontrollnummer (no
  double debit). The period is the billed one (before, a monthly community's quarterly billing read `MY003`),
  the name part keeps only A–Z and 0–9, and the B2B file no longer ends in `-B2B`. A `|` in the community name
  no longer breaks the export. The message id (`MsgId`) is now the file kind and the UTC time to the second (`MC20261018105307`), unique in its first 16 characters.
  Files exported before this version are unchanged. **For a period already submitted with an older version,
  upload only the files the bank has not taken yet:** a new export carries new ids, so the bank would accept
  e.g. the direct debit a second time.

## [1.2.2] – 2026-10-17

### Fixed
- **Contract upload stores every selected file and reports failures** (finding 261005-ca2). The upload
  dialog lets you add several files, but only the first one was stored; the others were dropped without
  notice. Each file is now uploaded on its own (also when a member is activated with documents). When the
  filestore rejects a file (e.g. „Invalid content_type“) or answers with a GraphQL error, the contract
  pane shows a red toast with the file name and the reason, the other files are still stored, and the
  list is reloaded from the filestore. When a member is activated with documents, a failed upload no
  longer stops the activation: the member is activated and gets the info mail as before, and a warning
  toast names the files that were not stored and says they can be uploaded later under „Verträge“
  (before, an HTTP error from the filestore stopped the activation and other filestore errors were ignored). The file name is sent as a GraphQL variable, so names with quotes no longer break the request.
- **The due date in the SEPA file is exactly the date chosen in the dialog** (finding 261005-ca1). The
  execution/collection date (`ReqdExctnDt`, `ReqdColltnDt`) was written as the UTC date, so in Austria it
  could be one day earlier than chosen, depending on the time of day carried by the chosen date (e.g. a
  date taken while the clock was between 00:00 and 02:00). It is now the local calendar date.

## [1.2.1] – 2026-10-15

### Fixed
- **EDA processes send a metering point only once** (support ticket 66110076). After an owner change a
  metering point exists twice in a community (the old member's inactive entry and the new active one).
  „Teilnahmefaktor ändern“ looked the selected numbers up in all meters and sent both entries, so the
  grid operator rejected the request. „Zählpunkt aufheben“ and „Energiedaten anfordern“ had the same
  lookup (revoke could fail with „Consent-ID leer“ or include the old consent). All three now send one
  entry per selected metering point, from the meters of the chosen participant (or the whole community),
  the active entry first; a selection that matches none is not sent.

## [1.2.0] – 2026-10-14

### Changed
- **The direct debit type has to be chosen consciously** (platform#143, objection from the team on
  14.10.: CORE as default could debit members without a signed mandate).
  - New member: no direct debit type is preselected; „Kein SEPA“, CORE or B2B must be chosen before
    saving. IBAN, mandate reference and mandate date stay required only for CORE/B2B.
  - A member **without a direct debit type is no longer debited**. Until now an empty type counted as
    CORE. The SEPA download leaves them out of the direct debit file and lists them („keine Einzugsart
    gewählt“); credit notes are still paid. The member form shows a hint while no type is set.
- **SEPA remittance text keeps all document numbers when several documents are combined** (support
  ticket 6610818). With „Mitglieder zusammenfassen“ the text listed every document and was cut off at the
  140 characters banks allow, so document numbers went missing without notice. If the full list is too
  long, numbers of the same type are written once with their common prefix
  („Rechnung202600135/136/138 / Gutschrift202600070/082“); if that is still too long, the longest group
  gives up numbers first (every document type stays visible) and the rest is counted („… (+3 weitere)“).
  A list that fits stays unchanged.

### Fixed
- **Mandate reference suggestion only when the member number is not yet a mandate reference of
  another member of the community** (platform#143, review E): a mandate reference must be unique per
  creditor id. If the number becomes unusable while typing, the untouched earlier suggestion is cleared
  instead of leaving a half-typed number; a reference typed by hand is never changed.
- **SEPA payment information id uses the year of the billed period** (platform#143, review A). It
  used the current year, so an annual run done in January carried the wrong year.

### Changed
- **Payment modes per member instead of one switch per EEG** (platform#143).
  - The EEG setting „SEPA aktiv“ is gone. A finished billing run always offers both downloads:
    **EXCEL** (all documents) and **SEPA** (XML files); the preview offers EXCEL only (no bank
    files from preview invoices). A file without any transaction is no longer created (banks reject
    an empty pain.008/pain.001); a run with nothing to pay or collect says so.
  - The direct debit type of the member decides alone: „Kein SEPA“ (`NONE`) is never debited; an
    empty type is not debited either (see the entry above).
  - **B2B debits get their own file** (`…SEPA_Direct_Debit_B2B`, `LclInstrm` `B2B`, own message
    id). Until now every debit was submitted as CORE in one file, which does not match a B2B
    mandate. The CORE file is unchanged; the B2B file only appears when the run has B2B debits.
    „Mitglieder zusammenfassen“ now sums per account, debit type and mandate reference, so a CORE
    and a B2B (or „Kein SEPA“) member sharing an account are no longer merged under the first one.
    Two members on one account with different mandates are no longer netted either: an invoice of
    one and a credit note of the other become a debit and a transfer (same total). The message id
    of each file now includes the time, so two exports on one day do not repeat it.
  - **Without a creditor ID** the SEPA dialog no longer fails: it creates the credit transfer file
    and says that the direct debit file needs a creditor ID in the EEG master data.
  - **IBAN optional for „Kein SEPA“** (support ticket #6610550), for consumers and producers:
    without IBAN the member is settled in cash and appears in the dialog's „ohne IBAN“ list. With
    CORE/B2B the IBAN stays required; an entered IBAN is still checked. When registering a member,
    the account owner is only required for a debit or when an IBAN is entered.
  - **Mandate reference suggestion.** The mandate reference is suggested from the member number
    while it is empty (on registration it follows the member number until typed over); switching
    an existing member to CORE/B2B fills an empty reference once. An existing reference is never
    replaced, and a member number that is no valid SEPA mandate id (blanks, umlauts, `_`, more
    than 35 characters) is not suggested. Switching a new member to „Kein SEPA“ removes an
    untouched suggestion. A hint under the debit type says that CORE/B2B needs a signed mandate,
    and the mandate date is now required for CORE/B2B (the bank file needs it).
- **IBAN check digits are verified** in every IBAN field (member and EEG): a typo or two swapped
  digits now shows „IBAN ist ungültig (Prüfziffer stimmt nicht)“, and the field is not saved,
  instead of failing later at the bank. Existing IBANs are only checked when edited.

## [1.1.0] – 2026-10-11

### Changed
- **Grid operator of a metering point is no longer entered by hand** (platform#107). The backend
  derives it from the metering point number. For BEGs the fields "Netzbetreiber-ID" and
  "Netzbetreiber-Name" in the metering point dialog are display only and can no longer be
  corrected by hand (a new operator merger needs the backend's alias list). While no value is
  stored and the metering point can be saved, a hint says that the value is determined from the
  metering point number. New metering points are no longer prefilled with the EEG's grid
  operator, and a new metering point number must start with `AT` and 6 digits (existing numbers
  keep the old rule, so metering points with a typo in the prefix stay editable).
  **Deploy order:** the backend with platform#107 first; with an old backend a new BEG metering
  point would get no grid operator.

### Fixed
- **Revocations of the data release by the member were missing in the history.** The history view
  for "Aufhebung der Datenfreigabe" only queried the protocols `CM_REV_IMP` (grid operator) and
  `CM_REV_SP` (community). Revocations the member triggers, e.g. in the grid operator's portal
  (`CM_REV_CUS` / `AUFHEBUNG_CCMC`), were stored but never shown. They are now queried and
  shown with metering point and end date like `AUFHEBUNG_CCMI`.
- **SEPA direct debit no longer contains members with direct debit type "Kein SEPA".** Members who
  pay by invoice (e.g. municipalities) had to be deleted from `…SEPA_Direct_Debit.xml` by hand
  before every import. They are now left out; `NbOfTxs` and `CtrlSum` are computed from the
  remaining transactions, so the totals match. The dialog lists who was left out. The credit
  transfer file (`…SEPA_Credit_Transfer.xml`) is unchanged.
- **Names and remittance text are reduced to the SEPA character set.** Accents outside it were
  exported unchanged and rejected by the bank (e.g. "René" → "Rene"); umlauts and ß stay, `&`
  becomes `+`, other characters become a space; names are cut at 70, the remittance text at 140
  characters. Mandate references are left as entered.
- **SEPA export no longer fails for members without an IBAN.** An empty IBAN cell aborted the whole
  export (`E_SEPA_DOWNLOAD`), and a credit note could end up with an empty `<IBAN/>`. Rows without
  an IBAN are now left out of both files and listed in the dialog ("Ohne IBAN, bitte manuell
  abwickeln") by account owner, like the "Kein SEPA" list. Names cut at the length limit no longer
  end with a blank.

## [1.0.13] – 2026-10-04

### Fixed
- **SEPA mandate date saved one day early when creating a member.** The date picker showed the
  correct day, but after saving the record held the day before. react-hook-form clones the
  form values in `handleSubmit` and turns every `Date` — including the `LocalDate` the picker
  stored — into a plain `Date`, which serialises as UTC: local midnight on 4 June became
  `2026-06-03T22:00:00.000Z`, and the backend kept that date. Editing an existing member was
  not affected, because that path sends the `LocalDate` directly without the clone. The picker
  now writes the date into the form as a `YYYY-MM-DD` string, which survives the clone.
  Mandate dates entered at creation before this fix are still one day early in the data.

### Security
- The image no longer runs as root. Caddy listens on `:8080` per `caddy.conf`, well above
  1024, so it never needed the privileges in the first place. A dedicated `app` user
  (UID/GID 1000) now owns Caddy's XDG directories `/data` and `/config` — without that it
  fails on startup while writing its own state. The served files under `/var/www` stay
  root-owned; Caddy only reads them.

### Added
- CI builds `env/**` branches and deploys the resulting image into the matching feature
  environment (ADR-0008): a push to `env/<name>` pins this service in namespace `env-<name>`
  to that branch's `sha-…` image. Previously only the default branch, tags and `preview/**`
  produced an image at all. The environment itself is still provisioned manually.

### Removed
- Cypress and Capacitor, neither of which was ever used here. Cypress had a config file but not
  a single spec, so `test.e2e` ran nothing; Capacitor had no imports anywhere in `src/`, no
  `android/` or `ios/` project, and a `capacitor.config.ts` that was still the untouched Ionic
  starter — `appId: 'io.ionic.starter'`, `webDir: 'build'` rather than Vite's `dist`, and a
  missing comma that made the file syntactically invalid. It cannot ever have run.

  Removed: the five `@capacitor/*` runtime packages, `@capacitor/cli`, `cypress`, both config
  files, the `test.e2e` script and the Capacitor entry in `ionic.config.json`. The dependency
  tree drops from 601 to 472 packages.

  To be clear about the motive: this closes **no** additional security alerts — the vite,
  cypress and capacitor upgrades already did that work. This is about not carrying scaffolding
  that produces alerts, install time and maintenance questions without ever being used. Should
  end-to-end tests or a mobile build become real goals, they are better set up deliberately
  than inherited from a starter template three majors out of date.

### Security
- `vite` 5.4.9 -> 6.4.3, which also pulls `rollup` 4.63.1, `esbuild` 0.25.12, `postcss` 8.5.28
  and `nanoid` 3.3.18 through the build tree. This closes **22 of the 75 open Dependabot
  alerts** (6 HIGH, 14 MEDIUM, 2 LOW) — among them CVE-2026-53571 (vite) and CVE-2026-27606
  (rollup). All of it is build tooling that never reaches the browser bundle, so this is about
  the integrity of the build, not about the shipped application.
- `cypress` 13.15.0 -> 16.0.0. Cypress dragged in most of the remaining vulnerable build
  packages; the upgrade drops `extract-zip`, `@xmldom/xmldom`, `@babel/core`,
  `@babel/plugin-transform-modules-systemjs`, `@babel/runtime` and `@tootallnate/once` from the
  tree entirely and lifts `tmp` to 0.2.7. Notably `extract-zip` carried a HIGH advisory with
  **no fix published**, so an upgrade was the only way to be rid of it. Together with the vite
  bump this closes 37 of the 75 open alerts (13 HIGH, 18 MEDIUM, 6 LOW).
- `@capacitor/cli` 5.6.0 -> 8.5.1, lifting `tar` 6.2.1 -> 7.5.22. `tar` alone accounted for six
  HIGH advisories and reached the tree solely through this package. Only the CLI moved: the
  Capacitor plugins declare a peer range on `@capacitor/core`, not on the CLI, so the family
  stays consistent. Cumulative across the three bumps: **45 of the 75 alerts closed**
  (19 HIGH, 20 MEDIUM, 6 LOW).
- The `pnpm.overrides` pin on `form-data` survived the update (resolved: 4.0.6). That is worth
  checking on every dependency change here: pnpm 10 and newer no longer read that field and
  drop the pin silently, with only a warning. Build with pnpm 9.12.1, as CI does.

## [1.0.12] – 2026-09-07

### Changed
- Deployment-only release: rebuilt against a refreshed base image, with Dependabot now
  watching the `docker` ecosystem. No changes to the application itself — the version
  exists so the production pin matches a named release.

## [1.0.11] – 2026-07-16

### Fixed
- SEPA export with "Mitglieder zusammenfassen" enabled booked the **net** amount for credit
  notes (Gutschriften) instead of the **gross** amount, so payouts to VAT-liable producers were
  short by the VAT. The summarize path (`summerizeSepaModel`) subtracted
  `Rechnungsbetrag Netto` for non-invoice documents, while the non-summarize path and invoices
  use `Rechnungsbetrag Brutto`. The checkbox is a pure per-IBAN aggregation and must not change
  the amount basis; it now uses gross for credit notes too, matching the other path.
- Member view bottom filter buttons (person/consumption, producer/consumer) no longer showed the
  active-filter highlight, so the selected filter was only inferrable from the result list. The
  `.isActive` state set `--background` on an `IonButton` that defaults to `fill="clear"` inside
  `IonButtons`, where the current Ionic (7.8.6) no longer paints it. The highlight now targets the
  button's `::part(native)` with a real `background` (the pattern already used elsewhere, e.g.
  `FilterSegment.component.scss`), so it renders regardless of the clear-button `--background`
  handling. Visual/CSS-only — the filter logic is unchanged.

## [1.0.10] – 2026-07-06

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
