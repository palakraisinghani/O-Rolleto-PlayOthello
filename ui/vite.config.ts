import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import design from './design-plugin.ts'
import singleFile from './single-file-plugin.ts'

// `vite build` makes the desktop app's front-end (dist/, loaded by Tauri).
// `vite build --mode web` makes the single-file web page (dist-web/index.html; see scripts/finish-web.mjs).
export default defineConfig(({ mode }) => {
  const web = mode === 'web'
  return {
    base: web ? './' : '/',
    plugins: [design({ inlineTextures: web }), svelte(), ...(web ? [singleFile()] : [])],
    // The web page carries its textures inside the CSS tokens, so the public folder is not copied.
    publicDir: web ? false : 'public',
    build: web
      ? { outDir: 'dist-web', emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false }
      : {}
  }
})
