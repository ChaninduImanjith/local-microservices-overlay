import * as vscode from 'vscode';
import { DockerTreeProvider, ContainerNode } from './dockerTreeProvider';
import { StatusBarManager } from './statusBarManager';
import { LogManager } from './logManager';
import {
  listContainers,
  startContainer,
  stopContainer,
  restartContainer,
  pingDocker,
  resetDockerClient,
} from './dockerService';
import { getConfig, onConfigChange } from './configManager';

// ── Extension state ─────────────────────────────────────────────────────────

let _pollTimer: ReturnType<typeof setInterval> | undefined;

// ── activate ─────────────────────────────────────────────────────────────────

export function activate(context: vscode.ExtensionContext): void {
  const treeProvider = new DockerTreeProvider();
  const statusBar = new StatusBarManager();
  const logManager = new LogManager();

  // Register the tree view
  const treeView = vscode.window.createTreeView('microservicesView', {
    treeDataProvider: treeProvider,
    showCollapseAll: true,
  });

  // ── Commands ──────────────────────────────────────────────────────────────

  const refresh = vscode.commands.registerCommand(
    'local-microservices-overlay.refresh',
    () => fetchAndUpdate(treeProvider, statusBar)
  );

  const cmdStart = vscode.commands.registerCommand(
    'local-microservices-overlay.startContainer',
    async (node: ContainerNode) => {
      if (!node?.containerId) { return; }
      await runWithProgress(`Starting ${node.containerName}…`, async () => {
        await startContainer(node.containerId);
        await fetchAndUpdate(treeProvider, statusBar);
      });
    }
  );

  const cmdStop = vscode.commands.registerCommand(
    'local-microservices-overlay.stopContainer',
    async (node: ContainerNode) => {
      if (!node?.containerId) { return; }
      const answer = await vscode.window.showWarningMessage(
        `Stop container "${node.containerName}"?`,
        { modal: false },
        'Stop'
      );
      if (answer !== 'Stop') { return; }
      await runWithProgress(`Stopping ${node.containerName}…`, async () => {
        await stopContainer(node.containerId);
        await fetchAndUpdate(treeProvider, statusBar);
      });
    }
  );

  const cmdRestart = vscode.commands.registerCommand(
    'local-microservices-overlay.restartContainer',
    async (node: ContainerNode) => {
      if (!node?.containerId) { return; }
      await runWithProgress(`Restarting ${node.containerName}…`, async () => {
        await restartContainer(node.containerId);
        await fetchAndUpdate(treeProvider, statusBar);
      });
    }
  );

  const cmdLogs = vscode.commands.registerCommand(
    'local-microservices-overlay.showLogs',
    async (node: ContainerNode) => {
      if (!node?.containerId) { return; }
      await logManager.showLogs(node.containerId, node.containerName);
    }
  );

  const cmdCopyId = vscode.commands.registerCommand(
    'local-microservices-overlay.copyId',
    async (node: ContainerNode) => {
      if (!node?.containerId) { return; }
      await vscode.env.clipboard.writeText(node.containerId);
      void vscode.window.showInformationMessage(
        `Copied container ID: ${node.info.shortId}`
      );
    }
  );

  // ── Auto-refresh ──────────────────────────────────────────────────────────

  const startPolling = (): void => {
    stopPolling();
    const { pollIntervalSeconds } = getConfig();
    _pollTimer = setInterval(
      () => void fetchAndUpdate(treeProvider, statusBar),
      pollIntervalSeconds * 1000
    );
  };

  const stopPolling = (): void => {
    if (_pollTimer !== undefined) {
      clearInterval(_pollTimer);
      _pollTimer = undefined;
    }
  };

  // Re-start polling when config changes
  const configWatcher = onConfigChange(() => {
    resetDockerClient(); // socket path may have changed
    startPolling();
    void fetchAndUpdate(treeProvider, statusBar);
  });

  // ── Initial fetch ─────────────────────────────────────────────────────────

  void fetchAndUpdate(treeProvider, statusBar);
  startPolling();

  // ── Register disposables ──────────────────────────────────────────────────

  context.subscriptions.push(
    treeView,
    statusBar,
    logManager,
    refresh,
    cmdStart,
    cmdStop,
    cmdRestart,
    cmdLogs,
    cmdCopyId,
    configWatcher,
    new vscode.Disposable(stopPolling)
  );
}

// ── deactivate ────────────────────────────────────────────────────────────────

export function deactivate(): void {
  if (_pollTimer !== undefined) {
    clearInterval(_pollTimer);
    _pollTimer = undefined;
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Fetch the container list from Docker, push it to the tree and status bar.
 * Handles Docker-unreachable errors gracefully.
 */
async function fetchAndUpdate(
  treeProvider: DockerTreeProvider,
  statusBar: StatusBarManager
): Promise<void> {
  try {
    await pingDocker();
    const containers = await listContainers();
    treeProvider.setContainers(containers);
    statusBar.update(containers);
  } catch (err) {
    treeProvider.setContainers([]);
    statusBar.setError();
    console.error('[local-microservices-overlay] Docker error:', err);
  }
}

/**
 * Run an async action with VS Code's progress notification.
 */
async function runWithProgress(
  title: string,
  action: () => Promise<void>
): Promise<void> {
  await vscode.window.withProgress(
    {
      location: vscode.ProgressLocation.Notification,
      title,
      cancellable: false,
    },
    async () => {
      try {
        await action();
      } catch (err) {
        void vscode.window.showErrorMessage(`Operation failed: ${err}`);
      }
    }
  );
}