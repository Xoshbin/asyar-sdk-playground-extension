<script lang="ts">
  import { untrack } from 'svelte';
  import type {
    EnvironmentPaths,
    ExtensionContext,
    IEnvironmentService,
  } from 'asyar-sdk/view';
  import { formatErrorMessage, parseSqlParams } from '../lib/filesQuery';

  interface Props {
    context: ExtensionContext;
  }
  let { context }: Props = $props();

  const files = untrack(() => context.files);
  const env = untrack(() => context.getService<IEnvironmentService>('environment'));

  let loading = $state(false);
  let output = $state('');
  let outputOk = $state(true);

  let paths = $state<EnvironmentPaths | null>(null);
  let existsPath = $state('');
  let missingReadPath = $state('');
  let iconPath = $state('');
  let iconUrl = $state<string | null | undefined>(undefined);
  let iconLoadError = $state<string | null>(null);

  let dbPath = $state('');
  let sqlInput = $state("SELECT name, type FROM sqlite_master WHERE type='table' LIMIT 10");
  let sqlParamsInput = $state('[]');

  function setOutput(msg: string, ok = true) {
    output = msg;
    outputOk = ok;
  }

  async function applyPathDefaults(resolved: EnvironmentPaths, force = false) {
    const sep = resolved.home.includes('\\') ? '\\' : '/';
    const missing = `${resolved.home}${sep}.nonexistent-asyar-test-file`;
    if (force || !existsPath.trim()) existsPath = resolved.appData;
    if (force || !missingReadPath.trim()) missingReadPath = missing;
    if (force || !iconPath.trim()) iconPath = resolved.appData;
    if (force || !dbPath.trim()) {
      const candidates = [
        `${resolved.appData}${sep}org.asyar.dev${sep}usage.db`,
        `${resolved.appData}${sep}org.asyar${sep}usage.db`,
        `${resolved.appData}${sep}org.asyar.dev${sep}asyar_data.db`,
        `${resolved.appData}${sep}org.asyar${sep}asyar_data.db`,
      ];
      let found = candidates[0];
      for (const candidate of candidates) {
        try {
          if (await files.exists(candidate)) {
            found = candidate;
            break;
          }
        } catch {
          // Ignore scope/read errors while probing default DB candidates
        }
      }
      dbPath = found;
    }
  }

  async function fetchPaths() {
    loading = true;
    try {
      const resolved = await env.getPaths();
      paths = resolved;
      await applyPathDefaults(resolved, false);
      setOutput(`environment.getPaths() ->\n${JSON.stringify(resolved, null, 2)}`, true);
    } catch (e: unknown) {
      setOutput(`environment.getPaths() failed: ${formatErrorMessage(e)}`, false);
    } finally {
      loading = false;
    }
  }

  async function checkExists(target = existsPath) {
    const trimmed = target.trim();
    if (!trimmed) {
      setOutput('Enter a path or fetch environment.getPaths() first', false);
      return;
    }
    existsPath = trimmed;
    loading = true;
    try {
      const result = await files.exists(trimmed);
      setOutput(`files.exists(${JSON.stringify(trimmed)}) -> ${result}`, true);
    } catch (e: unknown) {
      setOutput(`files.exists() rejected: ${formatErrorMessage(e)}`, false);
    } finally {
      loading = false;
    }
  }

  async function smokeTestMissingRead() {
    const target = missingReadPath.trim();
    if (!target) {
      setOutput('Enter a missing-file path or fetch environment.getPaths() first', false);
      return;
    }
    loading = true;
    try {
      const content = await files.read(target);
      setOutput(
        `Unexpectedly read ${content.length} chars from ${target} (expected NotFound)`,
        false,
      );
    } catch (e: unknown) {
      setOutput(
        `Caught missing-file error cleanly (no global banner expected):\n${formatErrorMessage(e)}`,
        true,
      );
    } finally {
      loading = false;
    }
  }

  async function fetchIcon(target = iconPath) {
    const trimmed = target.trim();
    if (!trimmed) {
      setOutput('Enter a path for files.icon(path)', false);
      return;
    }
    iconPath = trimmed;
    iconLoadError = null;
    loading = true;
    try {
      const url = await files.icon(trimmed);
      iconUrl = url;
      setOutput(
        url === null
          ? `files.icon(${JSON.stringify(trimmed)}) -> null (unsupported on this OS)`
          : `files.icon(${JSON.stringify(trimmed)}) -> ${url}`,
        true,
      );
    } catch (e: unknown) {
      iconUrl = undefined;
      setOutput(`files.icon() rejected: ${formatErrorMessage(e)}`, false);
    } finally {
      loading = false;
    }
  }

  async function runQuery(overrideSql?: string, expectBlocked = false) {
    const targetDb = dbPath.trim();
    const sql = (overrideSql ?? sqlInput).trim();
    if (overrideSql !== undefined) {
      sqlInput = overrideSql;
    }
    if (!targetDb) {
      setOutput('Enter a SQLite DB path first', false);
      return;
    }
    if (!sql) {
      setOutput('Enter a SQL query first', false);
      return;
    }

    let params: unknown[] | undefined;
    try {
      params = parseSqlParams(sqlParamsInput);
    } catch (e: unknown) {
      setOutput(`Invalid JSON params: ${formatErrorMessage(e)}`, false);
      return;
    }

    loading = true;
    try {
      const rows = await files.query(targetDb, sql, params);
      if (expectBlocked) {
        setOutput(
          `Expected query to be blocked, but it returned ${rows.length} row(s):\n${JSON.stringify(rows, null, 2)}`,
          false,
        );
      } else {
        setOutput(
          `files.query() -> ${rows.length} row(s):\n${JSON.stringify(rows, null, 2)}`,
          true,
        );
      }
    } catch (e: unknown) {
      const msg = formatErrorMessage(e);
      if (expectBlocked && !msg.toLowerCase().includes('not found')) {
        setOutput(`Blocked cleanly by SQLite authorizer (expected):\n${msg}`, true);
      } else {
        setOutput(`files.query() rejected:\n${msg}`, false);
      }
    } finally {
      loading = false;
    }
  }
</script>

<div class="section">
  <header class="section-header">
    <div>
      <span class="section-title">Files &amp; Environment Paths (files:read)</span>
      <span class="section-desc">
        Smoke-test <code>environment.getPaths()</code>, <code>files.exists()</code>,
        <code>files.read()</code>, <code>files.icon()</code>, and <code>files.query()</code>
      </span>
    </div>
  </header>

  <div class="cards-scroll">
    <!-- 1. environment.getPaths() -->
  <div class="card">
    <div class="card-head">
      <span class="field-label">1. environment.getPaths()</span>
      <div class="inline-actions">
        <button class="mini-btn" onclick={fetchPaths} disabled={loading}>
          Fetch Paths
        </button>
        {#if paths}
          <button
            class="mini-btn"
            onclick={() => paths && void applyPathDefaults(paths, true)}
            disabled={loading}
          >
            Pre-fill defaults
          </button>
        {/if}
      </div>
    </div>
    {#if paths}
      <div class="paths-grid">
        <div><span class="path-key">home</span><code>{paths.home}</code></div>
        <div><span class="path-key">appData</span><code>{paths.appData}</code></div>
        <div><span class="path-key">localAppData</span><code>{paths.localAppData}</code></div>
        <div><span class="path-key">config</span><code>{paths.config}</code></div>
      </div>
    {:else}
      <div class="note">Click "Fetch Paths" to resolve OS user directories and pre-fill test paths.</div>
    {/if}
  </div>

  <!-- 2. files.exists(path) -->
  <div class="card">
    <span class="field-label">2. files.exists(path)</span>
    <div class="input-row">
      <input
        class="field-input"
        type="text"
        bind:value={existsPath}
        placeholder="/Users/you/..."
      />
      <button class="mini-btn" onclick={() => void checkExists()} disabled={loading}>
        Check Exists
      </button>
    </div>
    {#if paths}
      <div class="preset-row">
        <button
          class="mini-btn"
          onclick={() => void checkExists(paths?.appData)}
          disabled={loading}
        >
          Preset: appData (true)
        </button>
        <button
          class="mini-btn"
          onclick={() => void checkExists(`${paths?.home}/.nonexistent-asyar-test-file`)}
          disabled={loading}
        >
          Preset: missing (false)
        </button>
      </div>
    {/if}
  </div>

  <!-- 3. files.read(path) missing-file smoke test -->
  <div class="card">
    <span class="field-label">3. files.read(path) — Missing-File Smoke Test</span>
    <div class="input-row">
      <input
        class="field-input"
        type="text"
        bind:value={missingReadPath}
        placeholder="/Users/you/.nonexistent-asyar-test-file"
      />
      <button class="mini-btn" onclick={smokeTestMissingRead} disabled={loading}>
        Read Missing File
      </button>
    </div>
    <div class="note">
      Verifies the extension catches <code>NotFound</code> cleanly without triggering a global launcher error banner.
    </div>
  </div>

  <!-- 4. files.icon(path) -->
  <div class="card">
    <span class="field-label">4. files.icon(path)</span>
    <div class="input-row">
      <input
        class="field-input"
        type="text"
        bind:value={iconPath}
        placeholder="/Applications or ~/..."
      />
      <button class="mini-btn" onclick={() => void fetchIcon()} disabled={loading}>
        Fetch Icon
      </button>
    </div>
    <div class="preset-row">
      {#if paths}
        <button class="mini-btn" onclick={() => void fetchIcon(paths?.appData)} disabled={loading}>
          Preset: appData
        </button>
        <button class="mini-btn" onclick={() => void fetchIcon(paths?.config)} disabled={loading}>
          Preset: config
        </button>
      {/if}
      <button class="mini-btn" onclick={() => void fetchIcon('/Applications')} disabled={loading}>
        Preset: /Applications (out of scope)
      </button>
    </div>
    {#if iconUrl !== undefined}
      <div class="icon-preview">
        {#if iconUrl === null}
          <span class="note">Returned <code>null</code> (unsupported on this OS).</span>
        {:else}
          <img
            src={iconUrl}
            alt="Resolved OS file icon"
            width="32"
            height="32"
            onerror={() => {
              iconLoadError = `<img> failed to load ${iconUrl}`;
            }}
          />
          <code class="icon-url">{iconUrl}</code>
          {#if iconLoadError}
            <span class="err-inline">{iconLoadError}</span>
          {/if}
        {/if}
      </div>
    {/if}
  </div>

  <!-- 5. files.query(path, sql, params?) -->
  <div class="card">
    <span class="field-label">5. files.query(path, sql, params?)</span>
    <div class="field">
      <span class="sub-label">SQLite DB Path</span>
      <input
        class="field-input"
        type="text"
        bind:value={dbPath}
        placeholder="/path/to/database.sqlite"
      />
    </div>
    <div class="field">
      <span class="sub-label">SQL (SELECT only)</span>
      <input
        class="field-input"
        type="text"
        bind:value={sqlInput}
        placeholder="SELECT * FROM sqlite_master LIMIT 10"
      />
    </div>
    <div class="field">
      <span class="sub-label">Params (optional JSON array)</span>
      <input
        class="field-input"
        type="text"
        bind:value={sqlParamsInput}
        placeholder="[]"
      />
    </div>
    <div class="preset-row">
      <button class="mini-btn primary" onclick={() => void runQuery()} disabled={loading}>
        Run Query
      </button>
      <button
        class="mini-btn"
        onclick={() => void runQuery('SELECT sqlite_version() AS version')}
        disabled={loading}
      >
        SELECT sqlite_version()
      </button>
      <button
        class="mini-btn danger-btn"
        onclick={() => void runQuery('PRAGMA user_version', true)}
        disabled={loading}
      >
        Blocked: PRAGMA
      </button>
      <button
        class="mini-btn danger-btn"
        onclick={() => void runQuery("ATTACH DATABASE ':memory:' AS x", true)}
        disabled={loading}
      >
        Blocked: ATTACH
      </button>
    </div>
  </div>
  </div>

  <div class="output-area">
    <span class="output-label">OUTPUT</span>
    {#if loading}
      <div class="output-body muted">Working…</div>
    {:else if output}
      <div class="output-body" class:ok={outputOk} class:err={!outputOk}>{output}</div>
    {:else}
      <div class="output-body muted">Run any Files or Environment Paths check above.</div>
    {/if}
  </div>
</div>

<style>
  @import './section.css';

  .section {
    overflow: hidden;
  }

  .cards-scroll {
    flex: 1;
    min-height: 0;
    overflow-y: auto;
    display: flex;
    flex-direction: column;
    gap: var(--space-4);
    padding-right: var(--space-1);
    scrollbar-width: thin;
    scrollbar-color: var(--scrollbar-thumb) transparent;
  }

  .output-area {
    margin-top: 0;
    flex-shrink: 0;
  }

  .card {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
    padding: var(--space-3) var(--space-4);
    background: var(--bg-secondary);
    border: 1px solid var(--separator);
    border-radius: var(--radius-md);
  }

  .card-head {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-2);
  }

  .inline-actions,
  .preset-row {
    display: flex;
    flex-wrap: wrap;
    gap: var(--space-2);
  }

  .input-row {
    display: flex;
    gap: var(--space-2);
    align-items: center;
  }

  .input-row .field-input {
    flex: 1;
  }

  .mini-btn {
    padding: 6px var(--space-3);
    border: 1px solid var(--separator);
    border-radius: var(--radius-sm);
    background: var(--bg-primary);
    color: var(--text-primary);
    font-family: var(--font-ui);
    font-size: var(--font-size-xs);
    font-weight: 500;
    cursor: pointer;
    white-space: nowrap;
    transition: background var(--transition-fast), border-color var(--transition-fast);
  }

  .mini-btn:hover:not(:disabled) {
    background: var(--bg-hover);
    border-color: var(--accent-primary);
  }

  .mini-btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  .mini-btn.primary {
    border-color: var(--accent-primary);
    color: var(--accent-primary);
    font-weight: 600;
  }

  .mini-btn.danger-btn {
    color: var(--accent-danger);
    border-color: color-mix(in srgb, var(--accent-danger) 30%, transparent);
  }

  .paths-grid {
    display: flex;
    flex-direction: column;
    gap: 4px;
    font-size: var(--font-size-xs);
  }

  .paths-grid > div {
    display: flex;
    gap: var(--space-2);
    align-items: baseline;
  }

  .path-key {
    min-width: 90px;
    font-weight: 600;
    color: var(--text-secondary);
  }

  .sub-label {
    font-size: var(--font-size-2xs);
    color: var(--text-secondary);
  }

  .icon-preview {
    display: flex;
    align-items: center;
    gap: var(--space-3);
    padding-top: var(--space-1);
  }

  .icon-url {
    font-size: var(--font-size-2xs);
    color: var(--text-secondary);
    word-break: break-all;
  }

  .err-inline {
    font-size: var(--font-size-2xs);
    color: var(--accent-danger);
  }
</style>
