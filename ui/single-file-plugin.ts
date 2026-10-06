// For the web build: folds the bundled JS and CSS into index.html so the whole game is one
// self-contained .html file (fonts and textures are already inlined as data: URIs).
import type { Plugin } from 'vite';

const key = (url: string) => url.replace(/^(\.\/|\/)/, '');

export default function singleFile(): Plugin {
  return {
    name: 'othello-single-file',
    enforce: 'post',
    transformIndexHtml: {
      order: 'post',
      handler(html, ctx) {
        const bundle = ctx.bundle;
        if (!bundle) return html;
        return html
          .replace(/<script\b[^>]*\bsrc="([^"]+)"[^>]*><\/script>/g, (tag, src: string) => {
            const file = bundle[key(src)];
            if (!file || file.type !== 'chunk') return tag;
            delete bundle[key(src)];
            // "</script" inside the code would end the tag early.
            return `<script type="module">${file.code.replace(/<\/script/gi, '<\\/script')}</script>`;
          })
          .replace(/<link\b[^>]*rel="stylesheet"[^>]*href="([^"]+)"[^>]*>/g, (tag, href: string) => {
            const file = bundle[key(href)];
            if (!file || file.type !== 'asset') return tag;
            delete bundle[key(href)];
            // Every browser that can run this page reads woff2, so drop the older duplicate font data.
            const css = String(file.source).replace(/,\s*url\(data:font\/woff;base64,[^)]*\)\s*format\("woff"\)/g, '');
            return `<style>${css}</style>`;
          });
      }
    }
  };
}
