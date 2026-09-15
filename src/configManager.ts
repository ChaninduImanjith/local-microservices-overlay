import * as vscode from 'vscode';

const SECTION = 'localMicroservicesOverlay';

export interface ExtensionConfig {
  pollIntervalSeconds: number;
  dockerSocketPath: string;
  showStoppedContainers: boolean;
  logTailLines: number;
}

/**
 * Reads and returns the current extension configuration from VS Code settings.
 */
export function getConfig(): ExtensionConfig {
  const cfg = vscode.workspace.getConfiguration(SECTION);
  return {
    pollIntervalSeconds: cfg.get<number>('pollIntervalSeconds', 5),
    dockerSocketPath: cfg.get<string>('dockerSocketPath', '/var/run/docker.sock'),
    showStoppedContainers: cfg.get<boolean>('showStoppedContainers', true),
    logTailLines: cfg.get<number>('logTailLines', 200),
  };
}

/**
 * Watches for configuration changes and calls the provided callback.
 */
export function onConfigChange(callback: () => void): vscode.Disposable {
  return vscode.workspace.onDidChangeConfiguration((e) => {
    if (e.affectsConfiguration(SECTION)) {
      callback();
    }
  });
}
