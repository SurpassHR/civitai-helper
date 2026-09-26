# civitai-token-copier

在 **Civitai** 模型下载页面自动挂载原生质感的「**复制带Token链接**」按钮。

点击后自动在后台请求 307 重定向，快速解析并复制带真实文件名（`b2ContentDisposition`）的 Backblaze B2 最终直链，让你的浏览器、下载工具、`wget` 或 `curl` 都能直接以**正确文件名**保存模型。

---

## ✨ 核心特性

- **自动解析真实文件名**：
  Civitai 的 API 直链通常保存为无意义的代码串（如 `3223006?fileId=...`）。本脚本在点击后通过毫秒级 `HEAD` 截获 307 重定向，直接抓取携带 `b2ContentDisposition=attachment; filename="真实模型名.safetensors"` 的完整 B2 CDN 直链。
- **Mantine UI 原生融合**：
  与 Civitai 现行 Mantine UI 深度统一，宽度 100% 满宽铺开，视觉整洁一致。
- **未付费/锁定模型智能过滤**：
  自动识别需 Buzz 积分购买（⚡100）的锁定模型，拒绝无效注入并自动清理按钮。
- **免手动维护 Token**：
  首次点击复制若未设置，会自动弹出原生窗口引导输入；后续若需更改，可随时在浏览器插件栏点击油猴菜单中的「⚙️ 设置 / 修改 Civitai Token」进行修改。
- **多站点支持**：
  支持官方站点 `civitai.com` 及国内常用的加速镜像 `civitai.red` 等。

---

## 🚀 安装方式

### 方式一：直接安装构建好的脚本（推荐）
1. 打开浏览器扩展 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 点击「新建脚本」。
3. 复制本项目 [`dist/civitai-token-copier.user.js`](https://raw.githubusercontent.com/SurpassHR/civitai-token-copier/main/dist/civitai-token-copier.user.js) 的全部内容粘贴覆盖并保存。

---

## 🛠️ 本地开发与构建

项目基于 **TypeScript + Vite + vite-plugin-monkey** 开发：

```bash
# 安装依赖
pnpm install

# 单次构建
pnpm run build

# 监听开发
pnpm run watch
```

---

## 📄 开源许可

[MIT License](LICENSE)
