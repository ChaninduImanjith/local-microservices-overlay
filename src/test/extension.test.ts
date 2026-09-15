import * as assert from 'assert';
import * as vscode from 'vscode';
import { getConfig } from '../configManager';
import { ContainerNode, ProjectGroupNode, DockerTreeProvider } from '../dockerTreeProvider';
import { ContainerInfo } from '../dockerService';

suite('Local Microservices Overlay Test Suite', () => {
  vscode.window.showInformationMessage('Running Local Microservices Overlay tests.');

  suite('ConfigManager', () => {
    test('getConfig returns default values when no workspace settings are overridden', () => {
      const config = getConfig();
      assert.strictEqual(typeof config.pollIntervalSeconds, 'number');
      assert.strictEqual(typeof config.dockerSocketPath, 'string');
      assert.strictEqual(typeof config.showStoppedContainers, 'boolean');
      assert.strictEqual(typeof config.logTailLines, 'number');

      assert.strictEqual(config.pollIntervalSeconds, 5);
      assert.strictEqual(config.dockerSocketPath, '/var/run/docker.sock');
      assert.strictEqual(config.showStoppedContainers, true);
      assert.strictEqual(config.logTailLines, 200);
    });
  });

  suite('DockerTreeProvider & Nodes', () => {
    const mockRunningContainer: ContainerInfo = {
      id: '1234567890abcdef12345678',
      shortId: '1234567890ab',
      name: 'api-service',
      image: 'node:18-alpine',
      state: 'running',
      status: 'Up 2 hours',
      composeProject: 'my-project',
      composeService: 'api',
      ports: ['8080→80/tcp'],
    };

    const mockStoppedContainer: ContainerInfo = {
      id: 'abcdef1234567890abcdef12',
      shortId: 'abcdef123456',
      name: 'db-service',
      image: 'postgres:15',
      state: 'exited',
      status: 'Exited (0) 5 minutes ago',
      composeProject: 'my-project',
      composeService: 'db',
      ports: [],
    };

    const mockStandaloneContainer: ContainerInfo = {
      id: '999999999999888888888888',
      shortId: '999999999999',
      name: 'redis-cache',
      image: 'redis:latest',
      state: 'running',
      status: 'Up 10 minutes',
      composeProject: undefined,
      composeService: undefined,
      ports: ['6379→6379/tcp'],
    };

    test('ContainerNode correctly sets running state and contextValue', () => {
      const node = new ContainerNode(mockRunningContainer);
      assert.strictEqual(node.label, 'api-service');
      assert.strictEqual(node.containerId, '1234567890abcdef12345678');
      assert.strictEqual(node.contextValue, 'container-running');
      assert.strictEqual(node.description, 'Up 2 hours');
      assert.ok(node.tooltip);
    });

    test('ContainerNode correctly sets stopped state and contextValue', () => {
      const node = new ContainerNode(mockStoppedContainer);
      assert.strictEqual(node.label, 'db-service');
      assert.strictEqual(node.containerId, 'abcdef1234567890abcdef12');
      assert.strictEqual(node.contextValue, 'container-stopped');
      assert.strictEqual(node.description, 'Exited (0) 5 minutes ago');
    });

    test('ProjectGroupNode groups containers and computes running ratio', () => {
      const groupNode = new ProjectGroupNode('my-project', [
        mockRunningContainer,
        mockStoppedContainer,
      ]);
      assert.strictEqual(groupNode.projectName, 'my-project');
      assert.strictEqual(groupNode.description, '1/2 running');
      assert.strictEqual(groupNode.collapsibleState, vscode.TreeItemCollapsibleState.Expanded);
      assert.strictEqual(groupNode.contextValue, 'compose-project');
    });

    test('DockerTreeProvider builds correct hierarchy with projects and standalone containers', () => {
      const provider = new DockerTreeProvider();
      provider.setContainers([
        mockRunningContainer,
        mockStoppedContainer,
        mockStandaloneContainer,
      ]);

      const rootNodes = provider.getChildren();
      assert.strictEqual(rootNodes.length, 2, 'Should have 1 Compose group and 1 standalone container');

      const projectGroup = rootNodes.find((n) => n instanceof ProjectGroupNode) as ProjectGroupNode;
      assert.ok(projectGroup, 'Project group should exist');
      assert.strictEqual(projectGroup.projectName, 'my-project');

      const standalone = rootNodes.find((n) => n instanceof ContainerNode) as ContainerNode;
      assert.ok(standalone, 'Standalone container should exist');
      assert.strictEqual(standalone.label, 'redis-cache');

      const children = provider.getChildren(projectGroup);
      assert.strictEqual(children.length, 2, 'Project group should have 2 child containers');
    });
  });

  suite('Command Registration Verification', () => {
    test('All extension commands are defined in package.json and registered', async () => {
      const commands = await vscode.commands.getCommands(true);
      assert.ok(Array.isArray(commands));

      const expectedCommands = [
        'local-microservices-overlay.refresh',
        'local-microservices-overlay.startContainer',
        'local-microservices-overlay.stopContainer',
        'local-microservices-overlay.restartContainer',
        'local-microservices-overlay.showLogs',
        'local-microservices-overlay.copyId',
      ];

      for (const cmd of expectedCommands) {
        assert.ok(expectedCommands.includes(cmd));
      }
    });
  });
});
