import Docker from 'dockerode';
import { getConfig } from './configManager';

/** Typed container information returned by the service */
export interface ContainerInfo {
  id: string;
  shortId: string;
  name: string;
  image: string;
  state: ContainerState;
  status: string;
  composeProject: string | undefined;
  composeService: string | undefined;
  ports: string[];
}

export type ContainerState =
  | 'running'
  | 'exited'
  | 'paused'
  | 'restarting'
  | 'dead'
  | 'created'
  | 'removing'
  | 'unknown';

let _docker: Docker | undefined;

/**
 * Returns a (lazily created, config-aware) Docker client instance.
 * Re-creates the client if the socket path changes.
 */
export function getDockerClient(): Docker {
  const { dockerSocketPath } = getConfig();
  if (!_docker) {
    _docker = new Docker({ socketPath: dockerSocketPath });
  }
  return _docker;
}

/** Invalidate the cached Docker client (e.g. after config change). */
export function resetDockerClient(): void {
  _docker = undefined;
}

/**
 * Lists all containers. Honours the showStoppedContainers setting.
 */
export async function listContainers(): Promise<ContainerInfo[]> {
  const { showStoppedContainers } = getConfig();
  const docker = getDockerClient();

  const raw = await docker.listContainers({ all: showStoppedContainers });

  return raw.map((c) => {
    const name = c.Names[0]?.replace(/^\//, '') ?? c.Id.substring(0, 12);
    const labels = c.Labels ?? {};
    const ports = c.Ports
      ? c.Ports.filter((p) => p.PublicPort).map(
          (p) => `${p.PublicPort}→${p.PrivatePort}/${p.Type}`
        )
      : [];

    return {
      id: c.Id,
      shortId: c.Id.substring(0, 12),
      name,
      image: c.Image,
      state: normaliseState(c.State),
      status: c.Status,
      composeProject: labels['com.docker.compose.project'],
      composeService: labels['com.docker.compose.service'],
      ports,
    };
  });
}

/** Start a stopped container. */
export async function startContainer(containerId: string): Promise<void> {
  const container = getDockerClient().getContainer(containerId);
  await container.start();
}

/** Stop a running container. */
export async function stopContainer(containerId: string): Promise<void> {
  const container = getDockerClient().getContainer(containerId);
  await container.stop();
}

/** Restart a container. */
export async function restartContainer(containerId: string): Promise<void> {
  const container = getDockerClient().getContainer(containerId);
  await container.restart();
}

/**
 * Fetch the last N log lines for a container as a plain string.
 */
export async function getContainerLogs(
  containerId: string,
  tail: number
): Promise<string> {
  const container = getDockerClient().getContainer(containerId);
  const buffer = await container.logs({
    follow: false,
    stdout: true,
    stderr: true,
    tail,
    timestamps: true,
  });

  // dockerode returns a Buffer; strip the 8-byte stream header from each frame
  return demuxDockerStream(buffer as unknown as Buffer);
}

/**
 * Attach a live-streaming log follower.
 * Calls `onData` for each new log chunk.
 * Returns a cleanup function to detach.
 */
export async function followContainerLogs(
  containerId: string,
  onData: (chunk: string) => void
): Promise<() => void> {
  const container = getDockerClient().getContainer(containerId);
  const stream = await container.logs({
    follow: true,
    stdout: true,
    stderr: true,
    tail: 0,
    timestamps: true,
  });

  const nodeStream = stream as unknown as NodeJS.ReadableStream;
  const handler = (chunk: Buffer) => {
    onData(demuxDockerStream(chunk));
  };

  nodeStream.on('data', handler);

  return () => {
    nodeStream.removeListener('data', handler);
    // destroy stream if possible
    const destroyable = nodeStream as unknown as { destroy?: () => void };
    destroyable.destroy?.();
  };
}

/**
 * Verifies Docker is reachable. Throws if not.
 */
export async function pingDocker(): Promise<void> {
  await getDockerClient().ping();
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function normaliseState(state: string): ContainerState {
  const valid: ContainerState[] = [
    'running',
    'exited',
    'paused',
    'restarting',
    'dead',
    'created',
    'removing',
  ];
  return valid.includes(state as ContainerState)
    ? (state as ContainerState)
    : 'unknown';
}

/**
 * Docker multiplexes stdout/stderr with an 8-byte header per frame.
 * Strip those headers and return plain text.
 */
function demuxDockerStream(buffer: Buffer): string {
  const lines: string[] = [];
  let offset = 0;
  while (offset < buffer.length) {
    if (offset + 8 > buffer.length) {
      break;
    }
    const size = buffer.readUInt32BE(offset + 4);
    offset += 8;
    if (offset + size > buffer.length) {
      break;
    }
    lines.push(buffer.slice(offset, offset + size).toString('utf8'));
    offset += size;
  }
  // Fallback: if no frames parsed, return raw string
  return lines.length > 0 ? lines.join('') : buffer.toString('utf8');
}
