# civitai-helper

**Civitai 模型下载直链获取器** —— 在 **Civitai** 模型下载页面自动挂载原生质感的「**复制带Token链接**」按钮。

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
  支持官方站点 `civitai.com`，以及 Civitai 的分站 `civitai.red`。

  > ⚠️ 说明：`civitai.red` **不是镜像站 / 加速站**，而是 Civitai 的独立分站，主要承载成人（NSFW）内容。
- **图像原始文件名角标**：
  在图片浏览页 / 详情页中，自动在每张图像左上角叠加显示上传时的原始文件名（如 `Imagen_00133_.png`）。
  由于 Civitai 卡片图片的 `src` 是 CDN 优化后的 `.jpeg`，而 `alt` 保留了原始扩展名，借助角标可一眼区分原始 PNG 与优化版 JPEG，快速判断该图是否值得下载原图提取 ComfyUI 工作流。

---

## 🚀 安装方式

### 方式一：直接安装构建好的脚本（推荐）
1. 打开浏览器扩展 [Tampermonkey (油猴)](https://www.tampermonkey.net/) 或 Violentmonkey。
2. 点击「新建脚本」。
3. 复制本项目 [`dist/civitai-helper.user.js`](https://raw.githubusercontent.com/SurpassHR/civitai-helper/main/dist/civitai-helper.user.js) 的全部内容粘贴覆盖并保存。

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
