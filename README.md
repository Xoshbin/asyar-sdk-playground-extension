# SDK Playground

> Developer playground demonstrating every Asyar SDK service in a Tier 2 extension

`org.asyar.sdk-playground` is a Tier 2 Asyar extension (developer-tools · macOS, Windows, Linux).

## What it does

The extension provides **12 commands**:

| Command | Mode | What it does |
| --- | --- | --- |
| **SDK Playground** | `view` | Exercise every SDK service in a sandboxed Tier 2 extension |
| **SDK Playground Onboarding** | `view` | First-use onboarding view — shown automatically the first time the user runs any command from this extension |
| **Required Preferences Demo** | `view` | Triggers the in-shell Required Preferences screen (searchable dropdown + required field) before opening the demo view |
| **Scheduling Tick Test** | `background` | Background command fired by the platform scheduler every 60 seconds |
| **Scheduling Tick Test (10s floor)** | `background` | End-to-end probe at the 10-second minimum interval — verifies sub-minute pollers traverse the full Rust→host→iframe pipeline |
| **Run echo (worker spawn)** | `background` | Spawn echo from the background worker while the launcher window is hidden — runs with no runtime trust prompt because echo is declared in permissionArgs and seeded at consent. |
| **Image Icon Probe** | `background` | Uses a 512px PNG as its icon. Installed copies are served a 128px version written at install; a linked dev copy shows the original. |
| **Coffee — extend** | `background` | Fired by the Extend button in the feedback harness. |
| **Coffee — stop** | `background` | Fired by the Stop button in the feedback harness. |
| **Timer — ring** | `background` | Fired by a one-shot timer scheduled from the Timers section. Records the fire in the Timers log. |
| **Timer — snooze** | `background` | Fired by the snooze demo timer. Records the fire and the original schedule args in the Timers log. |
| **Greet Someone** | `background` | Demonstrates command arguments — Tab on this command to fill name, style, and volume inline before greeting. |

It also exposes **3 tools** to AI agents:

| Tool | What the agent uses it for |
| --- | --- |
| `playground_text_stats` | Compute statistics for a piece of text — character count, word count, and the longest word. Use this when the user asks about the size or shape of some text. |
| `playground_save_note` | Save a short note to the user's persistent note store. Notes survive launcher restarts and are scoped to this extension. Use this whenever the user asks you to remember something. |
| `playground_list_notes` | List every note the user has previously saved via playground_save_note. Use this whenever the user asks what they have saved, what you remember, or when you need to recall facts about them. Returns an array of {id, note, at} entries sorted oldest first. |

## Permissions

```json
"permissions": [
  "selection:read",
  "clipboard:read",
  "notifications:send",
  "feedback:announce",
  "shell:open-url",
  "shell:open-path",
  "storage:read",
  "storage:write",
  "network",
  "network:lan",
  "oauth:use",
  "shell:spawn",
  "fs:read",
  "fs:write",
  "fs:watch",
  "extension:invoke",
  "cache:read",
  "cache:write",
  "application:read",
  "app:frontmost-watch",
  "power:inhibit",
  "media:control",
  "calendar:read",
  "calendar:write",
  "reminders:read",
  "reminders:write",
  "shortcuts:read",
  "shortcuts:run",
  "systemEvents:read",
  "timers:schedule",
  "timers:cancel",
  "timers:list",
  "tools:register",
  "ai:web-search",
  "ai:provider",
  "ai:web-reader",
  "files:read",
  "files:search-provider",
  "preferences:read",
  "preferences:write"
]
```

## Install

Install from the [Asyar Store](https://asyar.org/extensions).

Then open the **Agent editor** in the launcher to enable its tools for any agent.

## Develop

```bash
# from this directory
pnpm install
pnpm dev          # vite dev server
pnpm test:run     # vitest
pnpm build        # emits dist/{worker,view}.js + assets
pnpm link         # registers the dev path with the launcher
asyar publish     # builds, packages, GitHub release, store submission
```

## License

[MIT](./LICENSE) © Khoshbin
