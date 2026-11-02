<script lang="ts">
  import type {
    ExtensionContext,
    IMediaService,
    MediaSessionInfo,
    MediaTransportAction,
  } from 'asyar-sdk/view';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const media = $derived(context.getService<IMediaService>('media'));

  const PLAYERS = [
    { value: '', label: 'System (media keys / best player)' },
    { value: 'music', label: 'Music' },
    { value: 'spotify', label: 'Spotify' },
  ];

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);
  let player = $state('');
  let nowPlaying = $state<MediaSessionInfo | null>(null);
  let sessions = $state<MediaSessionInfo[]>([]);

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  function fmtSeconds(s: number | null): string {
    if (s == null) return '–';
    const total = Math.round(s);
    return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
  }

  async function run(label: string, fn: () => Promise<void>) {
    loading = true;
    try {
      await fn();
    } catch (e: any) {
      setOutput(`${label} error: ${e?.message ?? e}`, false);
    } finally {
      loading = false;
    }
  }

  const getNowPlaying = () =>
    run('getNowPlaying', async () => {
      nowPlaying = await media.getNowPlaying(player || undefined);
      setOutput(nowPlaying ? '✓ Fetched now playing' : 'Nothing playing (or player not running)');
    });

  const listSessions = () =>
    run('listSessions', async () => {
      sessions = await media.listSessions();
      setOutput(`✓ ${sessions.length} session(s)`);
    });

  const control = (action: MediaTransportAction) =>
    run('control', async () => {
      await media.control(action, player || undefined);
      setOutput(`✓ Sent ${action} to ${player || 'system media keys'}`);
      if (player) nowPlaying = await media.getNowPlaying(player);
    });
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Media Service</span>
      <span class="section-desc">
        Now-playing and transport control for Music and Spotify. Closed players are never launched.
        The first targeted call asks macOS for Automation permission.
      </span>
    </div>
  </header>

  <div class="field">
    <span class="field-label">Target</span>
    <select class="field-input" bind:value={player}>
      {#each PLAYERS as p (p.value)}
        <option value={p.value}>{p.label}</option>
      {/each}
    </select>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={getNowPlaying} disabled={loading}>
      <span class="btn-icon">🎵</span>
      <span class="btn-text">
        <span class="btn-name">Now Playing</span>
        <span class="btn-hint">media.getNowPlaying(player?)</span>
      </span>
    </button>
    <button class="action-btn" onclick={listSessions} disabled={loading}>
      <span class="btn-icon">📋</span>
      <span class="btn-text">
        <span class="btn-name">List Sessions</span>
        <span class="btn-hint">media.listSessions()</span>
      </span>
    </button>
  </div>

  <div class="btn-row">
    <button class="action-btn" onclick={() => control('previous')} disabled={loading}>
      <span class="btn-icon">⏮</span>
      <span class="btn-text"><span class="btn-name">Previous</span></span>
    </button>
    <button class="action-btn" onclick={() => control('playPause')} disabled={loading}>
      <span class="btn-icon">⏯</span>
      <span class="btn-text"><span class="btn-name">Play / Pause</span></span>
    </button>
    <button class="action-btn" onclick={() => control('next')} disabled={loading}>
      <span class="btn-icon">⏭</span>
      <span class="btn-text"><span class="btn-name">Next</span></span>
    </button>
  </div>

  {#if player}
    <div class="btn-row">
      <button class="action-btn" onclick={() => control('play')} disabled={loading}>
        <span class="btn-icon">▶️</span>
        <span class="btn-text"><span class="btn-name">Play</span></span>
      </button>
      <button class="action-btn" onclick={() => control('pause')} disabled={loading}>
        <span class="btn-icon">⏸</span>
        <span class="btn-text"><span class="btn-name">Pause</span></span>
      </button>
    </div>
  {/if}

  <div class="output-area">
    <span class="output-label">NOW PLAYING</span>
    {#if nowPlaying}
      <div class="output-body ok">
        {nowPlaying.title ?? '(untitled)'} — {nowPlaying.artist ?? 'unknown artist'}
        {nowPlaying.album ? `· ${nowPlaying.album}` : ''}
        [{nowPlaying.playerName}, {nowPlaying.status}]
        {fmtSeconds(nowPlaying.positionSeconds)} / {fmtSeconds(nowPlaying.durationSeconds)}
      </div>
    {:else}
      <div class="output-body muted">None.</div>
    {/if}
  </div>

  <div class="output-area">
    <span class="output-label">SESSIONS ({sessions.length})</span>
    {#each sessions as s (s.playerId)}
      <div class="output-body">
        <b>{s.playerName}</b> ({s.playerId}) · {s.status} · {s.title ?? '–'} / {s.artist ?? '–'}
      </div>
    {:else}
      <div class="output-body muted">Click List Sessions.</div>
    {/each}
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Play something in Music or Spotify, then try the buttons.</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';
</style>
