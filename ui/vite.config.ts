import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import design from './design-plugin.ts'
import singleFile from './single-file-plugin.ts'

// `vite build` makes the desktop app's front-end (dist/, loaded by Tauri).
// `vite build --mode mobile` makes the phone apps' front-end (dist-mobile/, wrapped by Capacitor; see ../mobile/).
// `vite build --mode site` makes the GitHub Pages site (dist-site/, copied to ../docs by scripts/finish-site.mjs).
// `vite build --mode web` makes the single-file web page (dist-web/index.html; see scripts/finish-web.mjs).
export default defineConfig(({ mode }) => {
  const web = mode === 'web'
  // `site` is the GitHub Pages build: like the phone build (Oroletto inside) but progress lasts one session only.
  const site = mode === 'site'
  const mobile = mode === 'mobile' || site
  return {
    base: web || mobile ? './' : '/',
    define: { __WITH_ORO__: JSON.stringify(mobile), __SESSION_ONLY__: JSON.stringify(site) },
    plugins: [design({ inlineTextures: web || mobile }), svelte(), ...(web ? [singleFile()] : [])],
    // The web page carries its textures inside the CSS tokens, so the public folder is not copied.
    // The mobile build serves the model and the WebAssembly runtime from mobile-public/ (scripts/prepare-mobile.mjs).
    publicDir: web ? false : mobile ? 'mobile-public' : 'public',
    build: web
      ? { outDir: 'dist-web', emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false }
      : mobile
        ? { outDir: site ? 'dist-site' : 'dist-mobile', emptyOutDir: true, chunkSizeWarningLimit: 2000 }
        : {}
  }
})
