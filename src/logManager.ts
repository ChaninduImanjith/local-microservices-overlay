import * as vscode from 'vscode';
import { getContainerLogs, followContainerLogs } from './dockerService';
import { getConfig } from './configManager';

interface ManagedChannel {
  channel: vscode.OutputChannel;
  stopFollowing: (() => void) | undefined;
}

/**
 * Manages VS Code Output Channels for container log streaming.
 *
 * - Opens a dedicated Output Channel per container.
 * - Fetches historical tail lines on first open.
 * - Streams live log output using Docker's follow mode.
 * - Cleans up all channels and streams on dispose.
 */
export class LogManager implements vscode.Disposable {
  private readonly _channels = new Map<string, ManagedChannel>();

  /**
   * Opens (or focuses) the log channel for a container, fetching history
   * and starting live streaming.
   */
  async showLogs(containerId: string, containerName: string): Promise<void> {
    const existing = this._channels.get(containerId);
    if (existing) {
      // Already open — just reveal
      existing.channel.show(true);
      return;
    }

    const channel = vscode.window.createOutputChannel(
      `Microservices: ${containerName}`,
      'log'
    );
    this._channels.set(containerId, { channel, stopFollowing: undefined });
    channel.show(true);

    const { logTailLines } = getConfig();

    // 1. Historical logs
    try {
      channel.appendLine(`── Historical logs (last ${logTailLines} lines) ──`);
      const history = await getContainerLogs(containerId, logTailLines);
      channel.append(history);
      channel.appendLine('── Live logs ──────────────────────────────────────');
    } catch (err) {
      channel.appendLine(`[error] Could not fetch log history: ${err}`);
    }

    // 2. Live streaming
    try {
      const stop = await followContainerLogs(containerId, (chunk) => {
        channel.append(chunk);
      });

      const managed = this._channels.get(containerId);
      if (managed) {
        managed.stopFollowing = stop;
      } else {
        // Channel was removed while we were awaiting — clean up immediately
        stop();
      }
    } catch (err) {
      channel.appendLine(`[error] Could not start live log stream: ${err}`);
    }
  }

  /**
   * Stops streaming and closes the channel for a specific container.
   */
  closeChannel(containerId: string): void {
    const managed = this._channels.get(containerId);
    if (!managed) {
      return;
    }
    managed.stopFollowing?.();
    managed.channel.dispose();
    this._channels.delete(containerId);
  }

  /** Dispose all channels and stop all live streams. */
  dispose(): void {
    for (const [id] of this._channels) {
      this.closeChannel(id);
    }
  }
}
