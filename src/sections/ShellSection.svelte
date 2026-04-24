<script lang="ts">
  import type {
    ExtensionContext,
    IShellService,
    IStorageService,
    ShellDescriptor,
    ShellHandle,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const shell = $derived(context.getService<IShellService>('shell'));
  const storage = $derived(context.getService<IStorageService>('storage'));

  interface OutputLine {
    kind: 'stdout' | 'stderr' | 'exit' | 'error' | 'aborted' | 'info';
    text: string;
  }

  const STORAGE_KEY = 'playground.lastSpawnId';

  const presets = [
    { icon: '📢', name: 'echo',         program: 'echo',  args: 'Hello from Asyar' },
    { icon: '🐙', name: 'git version',  program: 'git',   args: '--version' },
    { icon: '📁', name: 'ls /tmp',      program: 'ls',    args: '/tmp' },
    { icon: '🌐', name: 'curl version', program: 'curl',  args: '--version' },
  ];

  let program  = $state('ping');
  let args     = $state('-c 30 127.0.0.1');
  let lines    = $state<OutputLine[]>([]);
  let handle: ShellHandle | null = null;
  let currentSpawnId = $state<string | null>(null);
  let running  = $state(false);
  let detached = $state(false);
  let terminal = $state<HTMLElement | null>(null);

  let liveSpawns = $state<ShellDescriptor[]>([]);
  let lastListError = $state<string | null>(null);

  $effect(() => {
    lines;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  });

  function wireHandle(h: ShellHandle, labelOnAttach: string | null = null) {
    handle = h;
    currentSpawnId = h.spawnId;
    running = true;
    detached = false;
    if (labelOnAttach) {
      lines = [...lines, { kind: 'info', text: labelOnAttach }];
    }

    h.onChunk((chunk) => {
      lines = [...lines, { kind: chunk.stream, text: chunk.data }];
    });
    h.onDone((exitCode) => {
      lines = [...lines, { kind: 'exit', text: `[done — exit ${exitCode ?? '?'}]` }];
      running = false;
      handle = null;
    });
    h.onError(({ code, message }) => {
      if (code === 'ABORTED') {
        lines = [...lines, { kind: 'aborted', text: '[aborted]' }];
      } else {
        lines = [...lines, { kind: 'error', text: `[${code}] ${message}` }];
      }
      running = false;
      handle = null;
    });
  }

  function spawn(prog = program, argv = args) {
    if (running) return;
    lines = [];
    const h = shell.spawn({
      program: prog,
      args: argv.trim() ? argv.trim().split(/\s+/) : [],
    });
    wireHandle(h, `[spawned — spawnId=${h.spawnId}]`);
    storage.set(STORAGE_KEY, h.spawnId).catch(() => {});
  }

  function abort() {
    handle?.abort();
  }

  function runPreset(preset: typeof presets[0]) {
    program = preset.program;
    args = preset.args;
    spawn(preset.program, preset.args);
  }

  function detach() {
    if (!handle) return;
    handle = null;
    running = false;
    detached = true;
    lines = [
      ...lines,
      {
        kind: 'info',
        text: `[detached — handle dropped, process still alive. spawnId=${currentSpawnId}]`,
      },
    ];
  }

  async function refreshList() {
    lastListError = null;
    try {
      liveSpawns = await shell.list();
    } catch (err) {
      lastListError = err instanceof Error ? err.message : String(err);
      liveSpawns = [];
    }
  }

  function attachTo(spawnId: string) {
    if (running) return;
    lines = [];
    const h = shell.attach(spawnId);
    wireHandle(h, `[attached to ${spawnId} — resuming stream]`);
  }

  async function attachToSaved() {
    const saved = await storage.get<string>(STORAGE_KEY);
    if (!saved) {
      lines = [...lines, { kind: 'info', text: '[no saved spawnId yet — run a spawn first]' }];
      return;
    }
    attachTo(saved);
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Shell Service</span>
      <span class="section-desc">Spawn, detach, list, reattach — exercises shell.spawn / shell.list / shell.attach</span>
    </div>
  </header>

  <div class="row">
    <div class="field field-program">
      <span class="field-label">Program</span>
      <input
        class="field-input"
        bind:value={program}
        placeholder="e.g. ping"
        disabled={running}
      />
    </div>
    <div class="field field-args">
      <span class="field-label">Args</span>
      <input
        class="field-input"
        bind:value={args}
        placeholder="space-separated arguments"
        disabled={running}
      />
    </div>
  </div>

  <div class="btn-group">
    {#if running}
      <button class="action-btn" onclick={detach}>
        <span class="btn-icon">🔌</span>
        <span class="btn-text">
          <span class="btn-name">Detach Handle</span>
          <span class="btn-hint">drop listener, keep process alive</span>
        </span>
      </button>
      <button class="action-btn danger" onclick={abort}>
        <span class="btn-icon">⏹</span>
        <span class="btn-text">
          <span class="btn-name">Abort Process</span>
          <span class="btn-hint">handle.abort()</span>
        </span>
      </button>
    {:else}
      <button class="action-btn" onclick={() => spawn()} disabled={!program.trim()}>
        <span class="btn-icon">🐚</span>
        <span class="btn-text">
          <span class="btn-name">Spawn Process</span>
          <span class="btn-hint">shell.spawn({'{ program, args }'})</span>
        </span>
      </button>
      {#if detached && currentSpawnId}
        <button class="action-btn" onclick={() => attachTo(currentSpawnId!)}>
          <span class="btn-icon">🔁</span>
          <span class="btn-text">
            <span class="btn-name">Reattach</span>
            <span class="btn-hint">shell.attach({currentSpawnId.slice(0, 8)}…)</span>
          </span>
        </button>
      {/if}
    {/if}
  </div>

  <div class="presets-label">QUICK PRESETS</div>
  <div class="btn-group presets">
    {#each presets as preset}
      <button class="action-btn" onclick={() => runPreset(preset)} disabled={running}>
        <span class="btn-icon">{preset.icon}</span>
        <span class="btn-text">
          <span class="btn-name">{preset.name}</span>
          <span class="btn-hint">{preset.program} {preset.args}</span>
        </span>
      </button>
    {/each}
  </div>

  <div class="presets-label">RE-ATTACH DEMO</div>
  <div class="btn-group presets">
    <button class="action-btn" onclick={refreshList}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">List Live Spawns</span>
        <span class="btn-hint">shell.list()</span>
      </span>
    </button>
    <button class="action-btn" onclick={attachToSaved} disabled={running}>
      <span class="btn-icon">💾</span>
      <span class="btn-text">
        <span class="btn-name">Reattach to Saved</span>
        <span class="btn-hint">shell.attach(storage.get())</span>
      </span>
    </button>
  </div>

  {#if lastListError}
    <div class="list-error">⚠ {lastListError}</div>
  {/if}

  {#if liveSpawns.length > 0}
    <div class="spawn-list">
      {#each liveSpawns as descriptor}
        <div class="spawn-row">
          <div class="spawn-meta">
            <div class="spawn-title">
              <span class="spawn-program">{descriptor.program}</span>
              <span class="spawn-args">{descriptor.args.join(' ')}</span>
            </div>
            <div class="spawn-sub">
              pid {descriptor.pid} · spawnId {descriptor.spawnId.slice(0, 8)}… · started {new Date(descriptor.startedAt).toLocaleTimeString()}
            </div>
          </div>
          <button
            class="action-btn small"
            onclick={() => attachTo(descriptor.spawnId)}
            disabled={running}
          >
            Attach
          </button>
        </div>
      {/each}
    </div>
  {:else if lastListError === null}
    <div class="list-empty">No live spawns (press List to refresh).</div>
  {/if}

  <div class="output-area">
    <span class="output-label">
      OUTPUT{running ? ' — streaming…' : detached ? ' — detached' : ''}
    </span>
    {#if lines.length === 0 && !running}
      <div class="terminal muted-terminal">
        <span class="muted">Spawn a process, detach, list, then reattach.</span>
      </div>
    {:else}
      <div class="terminal" bind:this={terminal}>
        {#each lines as line}
          <div class="line {line.kind}">{line.text}</div>
        {/each}
        {#if running}
          <div class="line cursor">▋</div>
        {/if}
      </div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .row {
    display: flex;
    gap: 8px;
    padding: 0 16px;
  }

  .field-program { flex: 0 0 120px; }
  .field-args    { flex: 1; }

  .row .field {
    padding: 0;
  }

  .presets-label {
    font-size: 9px;
    font-weight: 600;
    letter-spacing: 0.08em;
    color: var(--text-tertiary);
    padding: 4px 16px 0;
  }

  .presets {
    flex-wrap: wrap;
  }

  .spawn-list {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 0 16px;
  }

  .spawn-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 8px;
    padding: 6px 8px;
    background: var(--bg-primary);
    border: 1px solid var(--border-subtle);
    border-radius: 6px;
  }

  .spawn-meta {
    flex: 1;
    min-width: 0;
  }

  .spawn-title {
    display: flex;
    gap: 6px;
    align-items: baseline;
    font-size: 12px;
  }

  .spawn-program {
    font-weight: 600;
    color: var(--text-primary);
  }

  .spawn-args {
    color: var(--text-tertiary);
    font-family: 'SF Mono', 'Menlo', monospace;
    font-size: 11px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .spawn-sub {
    font-size: 10px;
    color: var(--text-tertiary);
    font-family: 'SF Mono', 'Menlo', monospace;
    margin-top: 2px;
  }

  .action-btn.small {
    padding: 4px 10px;
    font-size: 11px;
    min-width: auto;
  }

  .list-empty,
  .list-error {
    font-size: 11px;
    color: var(--text-tertiary);
    padding: 4px 16px;
  }

  .list-error {
    color: #e05252;
  }

  .terminal {
    font-family: 'SF Mono', 'Menlo', 'Monaco', 'Consolas', monospace;
    font-size: 11px;
    line-height: 1.6;
    padding: 10px 12px;
    background: var(--bg-primary);
    border-radius: 6px;
    border: 1px solid var(--border-subtle);
    min-height: 80px;
    max-height: 200px;
    overflow-y: auto;
    scrollbar-width: thin;
  }

  .muted-terminal {
    display: flex;
    align-items: center;
    color: var(--text-tertiary);
  }

  .line { word-break: break-all; white-space: pre-wrap; }
  .line.stdout  { color: var(--text-primary); }
  .line.stderr  { color: #e6a817; }
  .line.exit    { color: var(--accent-primary); opacity: 0.7; margin-top: 4px; }
  .line.error   { color: #e05252; margin-top: 4px; }
  .line.aborted { color: var(--text-tertiary); margin-top: 4px; }
  .line.info    { color: var(--accent-primary); opacity: 0.85; }
  .line.cursor  { color: var(--accent-primary); animation: blink 1s step-end infinite; }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
</style>
