import * as vscode from 'vscode';
import { ContainerInfo, ContainerState } from './dockerService';

// ---------------------------------------------------------------------------
// Tree Item Types
// ---------------------------------------------------------------------------

/** Context values referenced by package.json menu `when` clauses. */
type ContainerContextValue = 'container-running' | 'container-stopped' | 'container-other';
type ProjectContextValue = 'compose-project';

// ---------------------------------------------------------------------------
// TreeDataProvider
// ---------------------------------------------------------------------------

/**
 * Drives the "Containers" tree view in the activity bar.
 *
 * Hierarchy:
 *   [Compose Project]   (collapsible, when > 1 project)
 *     └─ [Container]
 *   [Standalone Container]  (no parent)
 */
export class DockerTreeProvider implements vscode.TreeDataProvider<TreeNode> {
  private readonly _onDidChangeTreeData =
    new vscode.EventEmitter<TreeNode | undefined | void>();
  readonly onDidChangeTreeData = this._onDidChangeTreeData.event;

  /** Latest snapshot — set externally by the extension controller. */
  private _containers: ContainerInfo[] = [];

  // ── Public API ────────────────────────────────────────────────────────────

  /** Replace the container snapshot and refresh the view. */
  setContainers(containers: ContainerInfo[]): void {
    this._containers = containers;
    this._onDidChangeTreeData.fire();
  }

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  // ── vscode.TreeDataProvider ───────────────────────────────────────────────

  getTreeItem(element: TreeNode): vscode.TreeItem {
    return element;
  }

  getChildren(element?: TreeNode): TreeNode[] {
    if (!element) {
      return this._buildRootNodes();
    }
    if (element instanceof ProjectGroupNode) {
      return this._buildContainerNodes(element.containers);
    }
    return [];
  }

  // ── Private helpers ───────────────────────────────────────────────────────

  private _buildRootNodes(): TreeNode[] {
    const grouped = new Map<string, ContainerInfo[]>();
    const standalone: ContainerInfo[] = [];

    for (const c of this._containers) {
      if (c.composeProject) {
        const list = grouped.get(c.composeProject) ?? [];
        list.push(c);
        grouped.set(c.composeProject, list);
      } else {
        standalone.push(c);
      }
    }

    const nodes: TreeNode[] = [];

    // Compose project groups
    for (const [project, containers] of grouped) {
      nodes.push(new ProjectGroupNode(project, containers));
    }

    // Standalone containers
    nodes.push(...this._buildContainerNodes(standalone));

    return nodes;
  }

  private _buildContainerNodes(containers: ContainerInfo[]): ContainerNode[] {
    return containers.map((c) => new ContainerNode(c));
  }
}

// ---------------------------------------------------------------------------
// Tree Node classes
// ---------------------------------------------------------------------------

type TreeNode = ProjectGroupNode | ContainerNode;

/** A collapsible node representing a Docker Compose project. */
export class ProjectGroupNode extends vscode.TreeItem {
  readonly contextValue: ProjectContextValue = 'compose-project';

  constructor(
    public readonly projectName: string,
    public readonly containers: ContainerInfo[]
  ) {
    super(projectName, vscode.TreeItemCollapsibleState.Expanded);

    const running = containers.filter((c) => c.state === 'running').length;
    this.description = `${running}/${containers.length} running`;
    this.tooltip = new vscode.MarkdownString(
      `**${projectName}** — Compose project\n\n${running} of ${containers.length} containers running`
    );
    this.iconPath = new vscode.ThemeIcon('layers', groupColor(running, containers.length));
  }
}

/** A leaf node representing a single Docker container. */
export class ContainerNode extends vscode.TreeItem {
  readonly contextValue: ContainerContextValue;
  readonly containerId: string;
  readonly containerName: string;

  constructor(public readonly info: ContainerInfo) {
    super(info.name, vscode.TreeItemCollapsibleState.None);

    this.containerId = info.id;
    this.containerName = info.name;
    this.description = info.status;
    this.contextValue = stateToContextValue(info.state);

    const { icon, color } = stateToIconAndColor(info.state);
    this.iconPath = new vscode.ThemeIcon(icon, color);

    // Rich tooltip
    const portsLine = info.ports.length > 0 ? `\n\n**Ports:** ${info.ports.join(', ')}` : '';
    const imageLine = `\n\n**Image:** \`${info.image}\``;
    const idLine = `\n\n**ID:** \`${info.shortId}\``;
    this.tooltip = new vscode.MarkdownString(
      `**${info.name}**\n\n**State:** ${info.state}  ·  ${info.status}${imageLine}${idLine}${portsLine}`
    );
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function stateToContextValue(state: ContainerState): ContainerContextValue {
  if (state === 'running') {
    return 'container-running';
  }
  if (state === 'exited' || state === 'dead' || state === 'created') {
    return 'container-stopped';
  }
  return 'container-other';
}

function stateToIconAndColor(
  state: ContainerState
): { icon: string; color: vscode.ThemeColor | undefined } {
  switch (state) {
    case 'running':
      return { icon: 'circle-filled', color: new vscode.ThemeColor('testing.iconPassed') };
    case 'paused':
      return { icon: 'circle-filled', color: new vscode.ThemeColor('notificationsWarningIcon.foreground') };
    case 'restarting':
      return { icon: 'sync~spin', color: new vscode.ThemeColor('notificationsInfoIcon.foreground') };
    case 'exited':
    case 'dead':
      return { icon: 'circle-filled', color: new vscode.ThemeColor('testing.iconFailed') };
    case 'created':
      return { icon: 'circle-outline', color: new vscode.ThemeColor('disabledForeground') };
    default:
      return { icon: 'question', color: undefined };
  }
}

function groupColor(running: number, total: number): vscode.ThemeColor {
  if (running === total) {
    return new vscode.ThemeColor('testing.iconPassed');
  }
  if (running === 0) {
    return new vscode.ThemeColor('testing.iconFailed');
  }
  return new vscode.ThemeColor('notificationsWarningIcon.foreground');
}