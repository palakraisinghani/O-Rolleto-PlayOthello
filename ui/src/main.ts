import { mount } from 'svelte'
import '@fontsource/monoton'
import '@fontsource/playfair-display/700.css'
import '@fontsource/playfair-display/900.css'
import './app.css'
import App from './App.svelte'

const app = mount(App, {
  target: document.getElementById('app')!,
})

export default app
