import type {
  ExtensionStateProxy,
  INetworkService,
  IWebSocketHandle,
} from 'asyar-sdk/contracts';
import { STATE_KEYS, type WorkerWebSocketProbe } from '../stateKeys';

export interface WorkerWebSocketProbeController {
  connect(url: string): Promise<{ ok: boolean }>;
  disconnect(): Promise<void>;
}

export function createWorkerWebSocketProbe(deps: {
  network: INetworkService;
  state: ExtensionStateProxy;
}): WorkerWebSocketProbeController {
  let handle: IWebSocketHandle | null = null;

  const publish = async (
    url: string,
    status: WorkerWebSocketProbe['status'],
    data?: string,
  ): Promise<void> => {
    await deps.state.set(STATE_KEYS.workerWebSocketProbe, {
      at: Date.now(),
      role: 'worker',
      url,
      status,
      ...(data === undefined ? {} : { data }),
    } satisfies WorkerWebSocketProbe);
  };

  const disconnect = async (): Promise<void> => {
    if (!handle) return;
    const current = handle;
    handle = null;
    await current.close(1000, 'Worker probe disconnected');
  };

  return {
    async connect(url) {
      const trimmedUrl = url.trim();
      await disconnect();
      await publish(trimmedUrl, 'connecting');

      try {
        const nextHandle = await deps.network.connectWebSocket(trimmedUrl);
        handle = nextHandle;
        const isCurrent = (): boolean => handle === nextHandle;
        nextHandle.onOpen(() => {
          if (isCurrent()) void publish(trimmedUrl, 'connected');
        });
        nextHandle.onMessage((data) => {
          if (isCurrent()) void publish(trimmedUrl, 'message', data);
        });
        nextHandle.onError((error) => {
          if (isCurrent()) void publish(trimmedUrl, 'error', error);
        });
        nextHandle.onClose(({ code, reason }) => {
          if (!isCurrent()) return;
          handle = null;
          const detail = [code, reason].filter((part) => part !== undefined && part !== '').join(' ');
          void publish(trimmedUrl, 'closed', detail || undefined);
        });
        return { ok: true };
      } catch (error: unknown) {
        await publish(trimmedUrl, 'error', error instanceof Error ? error.message : String(error));
        return { ok: false };
      }
    },

    disconnect,
  };
}
