import { svelte } from '@sveltejs/vite-plugin-svelte'
import { defineConfig } from 'vite'
import design from './design-plugin.ts'

// https://vite.dev/config/
export default defineConfig({
  plugins: [design(), svelte()],
})
