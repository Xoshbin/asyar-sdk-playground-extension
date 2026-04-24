import { defineConfig } from 'vite';
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { existsSync } from 'fs';
import { fileURLToPath, URL } from 'url';
import { resolve } from 'path';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

// Same per-subpath SDK alias pattern Coffee/Pomodoro use. The bare `asyar-sdk`
// specifier has no "." entry in the SDK exports map (post-Phase 4); only
// `/contracts`, `/worker`, `/view` are valid. In dev redirect to workspace
// source; in CI / published mode fall back to node_modules.
const sdkSrcDir = resolve(__dirname, '../../asyar-sdk/src');
const sdkSubpaths = ['contracts', 'worker', 'view'] as const;
const useLocalSdk = sdkSubpaths.every((sub) =>
  existsSync(resolve(sdkSrcDir, `${sub}.ts`)),
);

const sdkAliases = useLocalSdk
  ? Object.fromEntries(
      sdkSubpaths.map((sub) => [
        `asyar-sdk/${sub}`,
        resolve(sdkSrcDir, `${sub}.ts`),
      ]),
    )
  : {};

export default defineConfig(() => {
  // eslint-disable-next-line no-console
  console.log(
    `\x1b[36m[Vite] (SDK Playground)\x1b[0m Asyar-SDK: \x1b[33m${
      useLocalSdk ? `Local Source (${sdkSrcDir})` : 'node_modules (NPM)'
    }\x1b[0m`,
  );

  return {
    plugins: [svelte()],
    base: './',
    resolve: {
      alias: sdkAliases,
    },
    build: {
      outDir: 'dist',
      emptyOutDir: true,
      assetsDir: 'assets',
      rollupOptions: {
        input: {
          worker: resolve(__dirname, 'worker.html'),
          view: resolve(__dirname, 'view.html'),
        },
        output: {
          entryFileNames: '[name].js',
          chunkFileNames: 'assets/[name]-[hash].js',
          assetFileNames: 'assets/[name]-[hash][extname]',
        },
      },
    },
  };
});
