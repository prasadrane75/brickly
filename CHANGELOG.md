# Changelog

All notable changes to this project are documented here.

## [Unreleased]

### Added
- Logo in navigation on all pages.
- Homepage hero with backsplash image.
- Backsplash patterns and styling tweaks.
- API `/health` endpoint.
- CORS allowlist support via `CORS_ORIGINS`.
- Multi-arch Docker images for `api`, `web`, and `db`.
- Custom DB image with migrations + seed on first init.

### Fixed
- Web image now includes `public/` assets in Docker builds.
