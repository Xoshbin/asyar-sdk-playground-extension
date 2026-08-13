import { describe, expect, it, vi } from 'vitest';
import { STATE_KEYS } from '../stateKeys';
import { createWorkerWebSocketProbe } from './websocketProbe';

describe('createWorkerWebSocketProbe', () => {
  it('records worker-owned open and message callbacks in extension state', async () => {
    const onOpen = vi.fn();
    const onMessage = vi.fn();
    const onError = vi.fn();
    const onClose = vi.fn();
    const handle = { onOpen, onMessage, onError, onClose, close: vi.fn() };
    const network = { connectWebSocket: vi.fn().mockResolvedValue(handle) };
    const state = { set: vi.fn().mockResolvedValue(undefined) };
    const probe = createWorkerWebSocketProbe({ network, state } as never);

    await probe.connect('wss://echo.websocket.org');
    onOpen.mock.calls[0][0]();
    await vi.waitFor(() => {
      expect(state.set).toHaveBeenCalledWith(
        STATE_KEYS.workerWebSocketProbe,
        expect.objectContaining({ status: 'connected', url: 'wss://echo.websocket.org' }),
      );
    });

    onMessage.mock.calls[0][0]('worker-smoke-001');
    await vi.waitFor(() => {
      expect(state.set).toHaveBeenCalledWith(
        STATE_KEYS.workerWebSocketProbe,
        expect.objectContaining({ status: 'message', data: 'worker-smoke-001' }),
      );
    });
  });

  it('records a connection failure for the view to render', async () => {
    const network = { connectWebSocket: vi.fn().mockRejectedValue(new Error('blocked')) };
    const state = { set: vi.fn().mockResolvedValue(undefined) };
    const probe = createWorkerWebSocketProbe({ network, state } as never);

    await expect(probe.connect('wss://blocked.example')).resolves.toEqual({ ok: false });
    expect(state.set).toHaveBeenLastCalledWith(
      STATE_KEYS.workerWebSocketProbe,
      expect.objectContaining({ status: 'error', data: 'blocked' }),
    );
  });

  it('does not let a stale close callback overwrite a newer probe', async () => {
    const first = {
      onOpen: vi.fn(), onMessage: vi.fn(), onError: vi.fn(), onClose: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const second = {
      onOpen: vi.fn(), onMessage: vi.fn(), onError: vi.fn(), onClose: vi.fn(),
      close: vi.fn().mockResolvedValue(undefined),
    };
    const network = { connectWebSocket: vi.fn().mockResolvedValueOnce(first).mockResolvedValueOnce(second) };
    const state = { set: vi.fn().mockResolvedValue(undefined) };
    const probe = createWorkerWebSocketProbe({ network, state } as never);

    await probe.connect('wss://first.example');
    await probe.connect('wss://second.example');
    second.onOpen.mock.calls[0][0]();
    first.onClose.mock.calls[0][0]({ code: 1000, reason: 'old socket' });

    await vi.waitFor(() => {
      expect(state.set).toHaveBeenLastCalledWith(
        STATE_KEYS.workerWebSocketProbe,
        expect.objectContaining({ status: 'connected', url: 'wss://second.example' }),
      );
    });
  });
});
