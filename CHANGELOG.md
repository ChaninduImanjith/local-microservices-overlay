# Changelog

All notable changes to **Local Microservices Overlay** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] — 2026-09-15

### Added
- **Container Tree View** in the Activity Bar — lists all Docker containers grouped by Docker Compose project
- **Rich state icons** — colour-coded icons for running (green), stopped (red), paused (yellow), restarting (blue animated), created (grey)
- **Status Bar item** — live summary showing `🐳 N running · N stopped`, click to open the panel
- **Live log streaming** — dedicated Output Channel per container with historical tail + real-time follow mode
- **Container lifecycle commands** via right-click context menu:
  - Start container
  - Stop container (with confirmation prompt)
  - Restart container
  - Show Logs
  - Copy Container ID to clipboard
- **Auto-refresh polling** — configurable interval (default 5 s)
- **Extension settings**:
  - `pollIntervalSeconds` — auto-refresh interval
  - `dockerSocketPath` — custom Docker socket path
  - `showStoppedContainers` — toggle visibility of exited containers
  - `logTailLines` — number of historical log lines to fetch
- **Graceful error handling** — status bar shows error state when Docker daemon is unreachable
- **Markdown tooltips** — hover any container to see state, image, ports, and short ID

### Technical
- Built with TypeScript strict mode, esbuild bundler
- Dockerode for typed Docker Engine API access
- Stream demultiplexing for Docker log protocol (stdout/stderr frames)

---

*[Unreleased]: https://github.com/ChaninduImanjith/local-microservices-overlay/compare/v1.0.0...HEAD*
*[1.0.0]: https://github.com/ChaninduImanjith/local-microservices-overlay/releases/tag/v1.0.0*