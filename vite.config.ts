import { defineConfig } from 'vite';
import monkey from 'vite-plugin-monkey';

export default defineConfig({
  plugins: [
    monkey({
      entry: 'src/main.ts',
      userscript: {
        name: 'Civitai 模型下载直链获取器',
        namespace: 'https://github.com/SurpassHR/civitai-helper',
        version: '2.1.0',
        description: '在 Civitai 模型下载页面原生融合「复制带Token链接」按钮，解析并复制带实际文件名的 B2 直链',
        author: 'xmsthc',
        match: [
          '*://civitai.com/*',
          '*://www.civitai.com/*',
          '*://civitai.red/*',
          '*://www.civitai.red/*',
          '*://*.civitai.com/*',
          '*://*.civitai.red/*'
        ],
        connect: [
          'civitai.com',
          'www.civitai.com',
          'civitai.red',
          'www.civitai.red',
          'b2.civitai.com'
        ],
        grant: [
          'GM_setValue',
          'GM_getValue',
          'GM_registerMenuCommand',
          'GM_setClipboard',
          'GM_xmlhttpRequest'
        ],
        'run-at': 'document-end'
      },
      build: {
        fileName: 'civitai-helper.user.js'
      }
    })
  ]
});
