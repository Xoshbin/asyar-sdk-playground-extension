<script lang="ts">
  import { onMount } from 'svelte';
  import type {
    ExtensionContext,
    ExtensionStateProxy,
    INetworkService,
    IWebSocketHandle,
  } from 'asyar-sdk/view';
  import { STATE_KEYS, type WorkerWebSocketProbe } from '../stateKeys';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const network = $derived(context.getService<INetworkService>('network'));
  const stateProxy = $derived(context.getService<ExtensionStateProxy>('state'));

  // HTTP Fetch state
  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let url = $state('https://httpbin.org/get');

  // WebSocket state
  let wsUrl = $state('wss://echo.websocket.org');
  let wsMessage = $state('Hello from Asyar SDK!');
  let wsConnected = $state(false);
  let wsLogs = $state<string[]>([]);
  let wsHandle = $state<IWebSocketHandle | null>(null);
  let workerProbe = $state<WorkerWebSocketProbe | null>(null);
  let workerProbeLoading = $state(false);

  onMount(() => {
    let active = true;
    let unsubscribe: (() => void | Promise<void>) | null = null;
    (async () => {
      const [initial, off] = await Promise.all([
        stateProxy.get(STATE_KEYS.workerWebSocketProbe),
        stateProxy.subscribe(STATE_KEYS.workerWebSocketProbe, (value) => {
          if (active) workerProbe = (value as WorkerWebSocketProbe | null) ?? null;
        }),
      ]);
      if (!active) {
        void off();
        return;
      }
      workerProbe = (initial as WorkerWebSocketProbe | null) ?? null;
      unsubscribe = off;
    })();
    return () => {
      active = false;
      if (unsubscribe) void unsubscribe();
    };
  });

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  function addWsLog(msg: string) {
    const time = new Date().toLocaleTimeString();
    wsLogs = [`[${time}] ${msg}`, ...wsLogs.slice(0, 49)];
  }

  async function fetchGet() {
    loading = true;
    try {
      const res = await network.fetch(url, { method: 'GET' });
      const body = typeof res.body === 'string' && res.body.length > 400
        ? res.body.slice(0, 400) + '…'
        : res.body;
      setOutput(`status: ${res.status} ${res.ok ? '✓' : '✗'}\n\n${body}`, res.ok);
    } catch (e: any) {
      setOutput(`Error: ${e.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  async function connectWs() {
    if (wsConnected || wsHandle) return;
    addWsLog(`Connecting to ${wsUrl}…`);
    try {
      const handle = await network.connectWebSocket(wsUrl);
      wsHandle = handle;

      handle.onOpen(() => {
        wsConnected = true;
        addWsLog('🟢 Connected');
      });

      handle.onMessage((data) => {
        addWsLog(`📩 Received: ${data}`);
      });

      handle.onError((err) => {
        addWsLog(`❌ Error: ${err}`);
      });

      handle.onClose((info) => {
        wsConnected = false;
        wsHandle = null;
        addWsLog(`🔌 Closed (code: ${info.code ?? 'none'}, reason: ${info.reason ?? 'none'})`);
      });
    } catch (e: any) {
      addWsLog(`❌ Failed to connect: ${e.message ?? e}`);
      wsConnected = false;
      wsHandle = null;
    }
  }

  async function sendWsMessage() {
    if (!wsHandle || !wsConnected) return;
    try {
      addWsLog(`📤 Sending: ${wsMessage}`);
      await wsHandle.send(wsMessage);
    } catch (e: any) {
      addWsLog(`❌ Send error: ${e.message ?? e}`);
    }
  }

  async function disconnectWs() {
    if (!wsHandle) return;
    try {
      await wsHandle.close(1000, 'User disconnected');
    } catch (e: any) {
      addWsLog(`❌ Close error: ${e.message ?? e}`);
    } finally {
      wsHandle = null;
      wsConnected = false;
    }
  }

  async function runWorkerWebSocketProbe() {
    workerProbeLoading = true;
    try {
      await context.request<{ ok: boolean }>('network.workerWebSocketProbe', { url: wsUrl });
    } finally {
      workerProbeLoading = false;
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Network Service</span>
      <span class="section-desc">Make authorized HTTP requests & real-time WebSocket connections</span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">HTTP URL</span>
    <input class="field-input" type="text" bind:value={url} placeholder="https://…" />
  </div>

  <div class="btn-group">
    <button class="action-btn" onclick={fetchGet} disabled={loading}>
      <span class="btn-icon">🌐</span>
      <span class="btn-text">
        <span class="btn-name">Fetch GET</span>
        <span class="btn-hint">network.fetch(url, {"{ method: 'GET' }"})</span>
      </span>
    </button>
  </div>

  <div class="output-area">
    <span class="output-label">HTTP OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Fetching…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Enter a URL and press Fetch GET</div>
    {/if}
  </div>

  <hr class="section-divider" />

  <header class="section-header">
    <div>
      <span class="section-title">WebSocket Streaming</span>
      <span class="section-desc">Real-time event push streaming over persistent sockets</span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">WebSocket URL</span>
    <input class="field-input" type="text" bind:value={wsUrl} placeholder="wss://…" />
  </div>

  <div class="field">
    <span class="field-label">Message Payload</span>
    <input class="field-input" type="text" bind:value={wsMessage} placeholder="Payload string" />
  </div>

  <div class="btn-group">
    {#if !wsConnected}
      <button class="action-btn" onclick={connectWs}>
        <span class="btn-icon">🔌</span>
        <span class="btn-text">
          <span class="btn-name">Connect WebSocket</span>
          <span class="btn-hint">network.connectWebSocket(wsUrl)</span>
        </span>
      </button>
    {:else}
      <button class="action-btn" onclick={sendWsMessage}>
        <span class="btn-icon">📤</span>
        <span class="btn-text">
          <span class="btn-name">Send Message</span>
          <span class="btn-hint">handle.send(data)</span>
        </span>
      </button>

      <button class="action-btn danger" onclick={disconnectWs}>
        <span class="btn-icon">🛑</span>
        <span class="btn-text">
          <span class="btn-name">Disconnect</span>
          <span class="btn-hint">handle.close()</span>
        </span>
      </button>
    {/if}
  </div>

  <div class="output-area">
    <span class="output-label">WEBSOCKET LOG ({wsConnected ? 'Connected' : 'Disconnected'})</span>
    {#if wsLogs.length > 0}
      <div class="output-body">
        {#each wsLogs as log}
          <div>{log}</div>
        {/each}
      </div>
    {:else}
      <div class="output-body muted">Click Connect WebSocket to start streaming</div>
    {/if}
  </div>

  <div class="worker-probe">
    <header class="section-header">
      <div>
        <span class="section-title">Worker WebSocket Probe</span>
        <span class="section-desc">
          Opens the socket in the background worker. Its callbacks are mirrored through state,
          not delivered to this view iframe.
        </span>
      </div>
    </header>

    <button class="action-btn" onclick={runWorkerWebSocketProbe} disabled={workerProbeLoading}>
      <span class="btn-icon">🧪</span>
      <span class="btn-text">
        <span class="btn-name">{workerProbeLoading ? 'Starting Worker Probe…' : 'Run Worker WebSocket Probe'}</span>
        <span class="btn-hint">worker → network.connectWebSocket(wsUrl)</span>
      </span>
    </button>

    <div class="output-area">
      <span class="output-label">WORKER SOCKET RESULT</span>
      {#if workerProbe}
        <div class="output-body">
          <div>role: {workerProbe.role} · status: {workerProbe.status}</div>
          <div>url: {workerProbe.url}</div>
          {#if workerProbe.data}<div>data: {workerProbe.data}</div>{/if}
        </div>
      {:else}
        <div class="output-body muted">Run the probe and wait for its worker-owned callback.</div>
      {/if}
    </div>
  </div>
</div>

<style>
  @import './section.css';

  .section-divider {
    border: none;
    border-top: 1px solid var(--border-color, rgba(255, 255, 255, 0.1));
    margin: 1.5rem 0;
  }
  .worker-probe {
    margin-top: 1.5rem;
  }
  .btn-group .danger {
    background: rgba(239, 68, 68, 0.2);
    border-color: rgba(239, 68, 68, 0.4);
  }
  .btn-group .danger:hover {
    background: rgba(239, 68, 68, 0.3);
  }
</style>
