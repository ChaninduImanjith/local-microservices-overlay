import * as vscode from 'vscode';
import { ContainerInfo } from './dockerService';

/**
 * Manages the bottom-bar status item showing a summary of container health.
 *
 * Example:  🐳  5 running  ·  2 stopped
 */
export class StatusBarManager implements vscode.Disposable {
  private readonly _item: vscode.StatusBarItem;

  constructor() {
    this._item = vscode.window.createStatusBarItem(
      vscode.StatusBarAlignment.Left,
      100
    );
    this._item.command = 'workbench.view.extension.microservices-explorer';
    this._item.tooltip = 'Local Microservices — click to open panel';
    this._item.show();
    this.setLoading();
  }

  /** Show a loading spinner while the first fetch is in progress. */
  setLoading(): void {
    this._item.text = '$(loading~spin) Microservices…';
  }

  /** Show an error state (Docker not reachable). */
  setError(): void {
    this._item.text = '$(error) Docker unreachable';
    this._item.tooltip = 'Cannot connect to Docker daemon. Check Docker is running.';
    this._item.color = new vscode.ThemeColor('statusBarItem.errorForeground');
  }

  /** Update the status bar with the latest container list. */
  update(containers: ContainerInfo[]): void {
    const running = containers.filter((c) => c.state === 'running').length;
    const stopped = containers.filter(
      (c) => c.state === 'exited' || c.state === 'dead'
    ).length;
    const other = containers.length - running - stopped;

    const parts: string[] = [`🐳  ${running} running`];
    if (stopped > 0) {
      parts.push(`${stopped} stopped`);
    }
    if (other > 0) {
      parts.push(`${other} other`);
    }

    this._item.text = parts.join('  ·  ');
    this._item.tooltip = `Local Microservices — ${containers.length} total containers`;
    this._item.color = undefined; // reset error colour
  }

  dispose(): void {
    this._item.dispose();
  }
}
