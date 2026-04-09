<script lang="ts">
  import { svc } from '../store';
  import type { ShellHandle } from 'asyar-sdk';

  interface OutputLine {
    kind: 'stdout' | 'stderr' | 'exit' | 'error' | 'aborted';
    text: string;
  }

  const presets = [
    { icon: '📢', name: 'echo',         program: 'echo',  args: 'Hello from Asyar' },
    { icon: '🐙', name: 'git version',  program: 'git',   args: '--version' },
    { icon: '📁', name: 'ls /tmp',      program: 'ls',    args: '/tmp' },
    { icon: '🌐', name: 'curl version', program: 'curl',  args: '--version' },
  ];

  let program  = $state('echo');
  let args     = $state('Hello from Asyar');
  let lines    = $state<OutputLine[]>([]);
  let running  = $state(false);
  let handle: ShellHandle | null = null;
  let terminal = $state<HTMLElement | null>(null);

  $effect(() => {
    // scroll terminal to bottom whenever lines change
    lines;
    if (terminal) terminal.scrollTop = terminal.scrollHeight;
  });

  function spawn(prog = program, argv = args) {
    if (running) return;
    lines = [];
    running = true;

    handle = svc.shell.spawn({
      program: prog,
      args: argv.trim() ? argv.trim().split(/\s+/) : [],
    });

    handle.onChunk((chunk) => {
      lines = [...lines, { kind: chunk.stream, text: chunk.data }];
    });

    handle.onDone((exitCode) => {
      lines = [...lines, { kind: 'exit', text: `[done — exit ${exitCode ?? '?'}]` }];
      running = false;
      handle = null;
    });

    handle.onError(({ code, message }) => {
      if (code === 'ABORTED') {
        lines = [...lines, { kind: 'aborted', text: '[aborted]' }];
      } else {
        lines = [...lines, { kind: 'error', text: `[${code}] ${message}` }];
      }
      running = false;
      handle = null;
    });
  }

  function abort() {
    handle?.abort();
  }

  function runPreset(preset: typeof presets[0]) {
    program = preset.program;
    args = preset.args;
    spawn(preset.program, preset.args);
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Shell Service</span>
      <span class="section-desc">Spawn OS processes and stream stdout/stderr via shell.spawn()</span>
    </div>
  </header>

  <!-- Freeform inputs -->
  <div class="row">
    <div class="field field-program">
      <span class="field-label">Program</span>
      <input
        class="field-input"
        bind:value={program}
        placeholder="e.g. ffmpeg"
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

  <!-- Spawn / Abort -->
  <div class="btn-group">
    {#if running}
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
    {/if}
  </div>

  <!-- Presets -->
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

  <!-- Streaming terminal output -->
  <div class="output-area">
    <span class="output-label">OUTPUT{running ? ' — running…' : ''}</span>
    {#if lines.length === 0 && !running}
      <div class="terminal muted-terminal">
        <span class="muted">Press Spawn or a preset to run a process</span>
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
  .line.cursor  { color: var(--accent-primary); animation: blink 1s step-end infinite; }

  @keyframes blink {
    0%, 100% { opacity: 1; }
    50%       { opacity: 0; }
  }
</style>
