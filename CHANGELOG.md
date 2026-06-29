# Changelog

All notable changes to **eegfaktura-web (React frontend)** are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/), and
versioning follows the deployment release tags. Detailed diffs stay in the `git log`;
this changelog highlights the changes relevant for overview and operations.

## [Unreleased]

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
