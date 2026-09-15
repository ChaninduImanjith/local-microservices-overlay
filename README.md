# Local Microservices Overlay

> Real-time monitoring, live log streaming, and container lifecycle management for local Docker Compose microservices — directly inside VS Code.

[![VS Code Marketplace](https://img.shields.io/badge/VS%20Code-Marketplace-007ACC?logo=visual-studio-code)](https://marketplace.visualstudio.com/items?itemName=ChaninduImanjith.local-microservices-overlay)
[![GitHub](https://img.shields.io/github/license/ChaninduImanjith/local-microservices-overlay)](LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/ChaninduImanjith/local-microservices-overlay)](https://github.com/ChaninduImanjith/local-microservices-overlay/issues)

---

## Features

### 🐳 Container Health Tree View
See all your Docker containers at a glance in the VS Code Activity Bar. Containers are **grouped by Docker Compose project** for easy navigation.

| State | Icon | Colour |
|---|---|---|
| Running | ● | Green |
| Stopped / Exited | ● | Red |
| Paused | ● | Yellow |
| Restarting | ↻ | Blue (animated) |
| Created | ○ | Grey |

### 📊 Status Bar Summary
A persistent status bar item shows a live summary at the bottom of VS Code:

```
🐳  3 running  ·  1 stopped
```

Clicking it opens the Microservices panel.

### 📋 Live Log Streaming
Right-click any container → **Show Logs** to open a dedicated Output Channel that:
- Fetches the last N historical lines (configurable)
- Streams new log output in real time

### ▶️ Container Lifecycle Actions
Right-click context menu on each container:
- **Start** — start a stopped container
- **Stop** — stop a running container (with confirmation prompt)
- **Restart** — restart a container
- **Show Logs** — open live log stream
- **Copy Container ID** — copy full ID to clipboard

### ⚙️ Configurable Settings
All behaviour is tunable via VS Code Settings (`Cmd/Ctrl+,`):

| Setting | Default | Description |
|---|---|---|
| `localMicroservicesOverlay.pollIntervalSeconds` | `5` | Auto-refresh interval in seconds |
| `localMicroservicesOverlay.dockerSocketPath` | `/var/run/docker.sock` | Docker socket path |
| `localMicroservicesOverlay.showStoppedContainers` | `true` | Show exited containers |
| `localMicroservicesOverlay.logTailLines` | `200` | Historical log lines to fetch |

---

## Requirements

- **Docker Desktop** (or Docker Engine) installed and running
- VS Code **1.90.0** or later
- On Linux/macOS: the current user must have permission to access `/var/run/docker.sock`
  ```bash
  sudo usermod -aG docker $USER   # then log out and back in
  ```

---

## Getting Started

1. Install the extension from the VS Code Marketplace
2. Make sure Docker is running (`docker ps` should work in your terminal)
3. Click the **🐳 server** icon in the Activity Bar to open the **Local Microservices** panel
4. Your containers will appear automatically and refresh every 5 seconds

---

## Troubleshooting

**"Docker unreachable" in the status bar**
- Ensure Docker Desktop is running
- On Linux, ensure you have socket permissions (see Requirements)
- Check `localMicroservicesOverlay.dockerSocketPath` if using a non-default socket

**No containers appear**
- Toggle `localMicroservicesOverlay.showStoppedContainers` to `true`
- Run `docker ps -a` in the terminal to verify containers exist

**Log streaming stops**
- The container may have stopped. Reopen logs after restarting the container.

---

## Contributing

Pull requests and issues are welcome!

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-feature`
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/)
4. Push and open a PR against `master`

---

## License

[MIT](LICENSE) © Chanindu Imanjith
