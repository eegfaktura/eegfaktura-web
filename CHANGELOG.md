# Changelog

Alle nennenswerten Änderungen an **eegfaktura-web (React-Frontend)** werden hier dokumentiert.

Das Format orientiert sich an [Keep a Changelog](https://keepachangelog.com/de/1.1.0/),
die Versionierung an den Deployment-Release-Tags. Detail-Diffs bleiben im `git log`;
dieser Changelog hebt die für Überblick und Betrieb relevanten Änderungen hervor.

## [Unreleased]

## [1.0.2] – 2026-06-28

### Fixed
- Benachrichtigungen: 24-Stunden-Zeitformat (`HH:mm:ss`) statt 12h ohne AM/PM. (#56)

## [1.0.1] – 2026-06-28

### Fixed
- Abrechnungsperiode: Standard ist wieder das aktuelle Datum statt eines
  hartkodierten `2026-02-01`. (#55)

## [1.0.0] – 2026-06-28

Erster vollständig aus öffentlichem Quellcode gebauter Produktiv-Release.

### Fixed
- Konfiguration: `keycloak-config.json` wird als Env-Template ins Image gebacken
  statt als leeres `{}`. (#54)

### Changed
- CI: Stage-1 Source-Build; Push in den Development-Tier der Registry mit
  Auto-Rollout-Bridge (dispatch-deploy). (#51, #52)
- README mit Service-Überblick und Tech-Stack ergänzt. (#53)
