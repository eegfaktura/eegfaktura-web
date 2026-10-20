# Changelog

All notable changes to **eegfaktura-web (React frontend)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
versioning follows the deployment release tags. Detailed diffs stay in the `git log`;
this changelog highlights the changes relevant for overview and operations.

## [Unreleased]

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
