// ==UserScript==
// @name         Civitai 模型下载直链获取器
// @namespace    https://github.com/SurpassHR/civitai-helper
// @version      2.1.0
// @author       xmsthc
// @description  在 Civitai 模型下载页面原生融合「复制带Token链接」按钮，解析并复制带实际文件名的 B2 直链
// @license      MIT
// @match        *://civitai.com/*
// @match        *://www.civitai.com/*
// @match        *://civitai.red/*
// @match        *://www.civitai.red/*
// @match        *://*.civitai.com/*
// @match        *://*.civitai.red/*
// @connect      civitai.com
// @connect      www.civitai.com
// @connect      civitai.red
// @connect      www.civitai.red
// @connect      b2.civitai.com
// @grant        GM_addStyle
// @grant        GM_getValue
// @grant        GM_registerMenuCommand
// @grant        GM_setClipboard
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @run-at       document-end
// ==/UserScript==

(t=>{if(typeof GM_addStyle=="function"){GM_addStyle(t);return}const o=document.createElement("style");o.textContent=t,document.head.append(o)})(" .civitai-token-btn-wrapper{display:flex;width:100%;margin-top:8px;box-sizing:border-box}.civitai-copy-btn{width:100%;height:38px;padding:0 16px;display:inline-flex;align-items:center;justify-content:center;gap:8px;background-color:#1971c2;color:#fff!important;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:14px;font-weight:600;line-height:1;border-radius:6px;border:1px solid transparent;cursor:pointer;text-decoration:none!important;-webkit-user-select:none;user-select:none;box-sizing:border-box;transition:background-color .15s ease,transform .1s ease}.civitai-copy-btn:hover{background-color:#1864ab}.civitai-copy-btn:active{transform:translateY(1px)}.civitai-copy-btn.copied{background-color:#2f9e44!important}.civitai-copy-btn svg{width:17px;height:17px;fill:currentColor;flex-shrink:0}@keyframes civitai-spin{0%{transform:rotate(0)}to{transform:rotate(360deg)}}.civitai-tm-toast{position:fixed;bottom:24px;right:24px;background-color:#25262b;color:#c1c2c5;padding:10px 16px;border-radius:6px;box-shadow:0 8px 20px #00000073;border:1px solid #373a40;font-size:13px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;z-index:9999999;opacity:0;transform:translateY(8px);transition:opacity .2s ease,transform .2s ease;pointer-events:none}.civitai-tm-toast.show{opacity:1;transform:translateY(0)}.civitai-tm-toast.success{border-left:4px solid #40c057;color:#e6fcf5}.civitai-tm-toast.info{border-left:4px solid #339af0;color:#e7f5ff}.civitai-tm-toast.warning{border-left:4px solid #fab005;color:#fff9db}.civitai-helper-filename{position:absolute;top:6px;left:6px;z-index:30;max-width:calc(100% - 12px);padding:1px 8px;background-color:#000000a6;color:#fff;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;font-size:12px;font-weight:500;line-height:18px;border-radius:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;pointer-events:none;-webkit-backdrop-filter:blur(2px);backdrop-filter:blur(2px)} ");

(function () {
  'use strict';

  const STORAGE_KEY = "civitai_download_token";
  const ICON_COPY = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
  const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
  const ICON_SPINNER = `<svg viewBox="0 0 24 24" style="animation: civitai-spin 1s linear infinite;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`;
  let toastTimer = null;
  function showToast(msg, type = "success") {
    let toast = document.getElementById("civitai-tm-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "civitai-tm-toast";
      toast.className = "civitai-tm-toast";
      document.body.appendChild(toast);
    }
    toast.textContent = msg;
    toast.className = `civitai-tm-toast ${type} show`;
    if (toastTimer) {
      clearTimeout(toastTimer);
    }
    toastTimer = setTimeout(() => {
      if (toast) toast.className = `civitai-tm-toast ${type}`;
    }, 3e3);
  }
  function promptTokenSetting() {
    const current = (GM_getValue(STORAGE_KEY, "") || "").trim();
    const tip = current ? `当前已保存 Token: ${current.substring(0, 4)}****

请输入新的 Civitai API Token（留空清除）：` : "请输入你的 Civitai API Token（用于拼接 ?token=xxx）：";
    const input = window.prompt(tip, current);
    if (input !== null) {
      const val = input.trim();
      GM_setValue(STORAGE_KEY, val);
      if (val) {
        showToast("Token 设置已更新！", "success");
      } else {
        showToast("Token 已清除", "warning");
      }
    }
  }
  if (typeof GM_registerMenuCommand !== "undefined") {
    GM_registerMenuCommand("⚙️ 设置 / 修改 Civitai Token", promptTokenSetting);
  }
  function isPaidOrLocked(el) {
    var _a;
    if (el.tagName === "A" && !el.getAttribute("href")) {
      return true;
    }
    if (el.querySelector('.tabler-icon-bolt, [class*="mantine-Badge-root"]')) {
      return true;
    }
    const badge = (_a = el.parentElement) == null ? void 0 : _a.querySelector(".mantine-Badge-root");
    if (badge && badge.textContent && /\d+/.test(badge.textContent)) {
      return true;
    }
    return false;
  }
  function buildApiUrl(rawUrl, token) {
    try {
      const parsed = new URL(rawUrl, window.location.origin);
      if (token) {
        parsed.searchParams.set("token", token);
      }
      return parsed.toString();
    } catch {
      const delimiter = rawUrl.includes("?") ? "&" : "?";
      return token ? `${rawUrl}${delimiter}token=${encodeURIComponent(token)}` : rawUrl;
    }
  }
  function getTargetDownloadUrl() {
    const allButtons = Array.from(document.querySelectorAll("a, button"));
    const downloadSelectedEl = allButtons.find((el) => {
      const txt = (el.textContent || "").trim();
      return /Download Selected/i.test(txt) || /下载所选/i.test(txt);
    });
    if (downloadSelectedEl && !isPaidOrLocked(downloadSelectedEl)) {
      if (downloadSelectedEl instanceof HTMLAnchorElement && downloadSelectedEl.href) {
        console.log("[Civitai Debug] 从 Download Selected (A) 提取到链接:", downloadSelectedEl.href);
        return downloadSelectedEl.href;
      }
      const parentA = downloadSelectedEl.closest('a[href*="/api/download/models/"]');
      if (parentA && parentA.href) {
        console.log("[Civitai Debug] 从 Download Selected (Parent A) 提取到链接:", parentA.href);
        return parentA.href;
      }
      const innerA = downloadSelectedEl.querySelector('a[href*="/api/download/models/"]');
      if (innerA && innerA.href) {
        console.log("[Civitai Debug] 从 Download Selected (Inner A) 提取到链接:", innerA.href);
        return innerA.href;
      }
    }
    const checkedIcons = document.querySelectorAll('svg.tabler-icon-check, [data-checked="true"], [aria-selected="true"]');
    for (const icon of Array.from(checkedIcons)) {
      const row = icon.closest('div, tr, li, [class*="mantine"]') || icon.parentElement;
      if (row) {
        const rowDownloadLink = row.querySelector('a[href*="/api/download/models/"]');
        if (rowDownloadLink && rowDownloadLink.href && !isPaidOrLocked(rowDownloadLink)) {
          console.log("[Civitai Debug] 从勾选行中定位到下载链接:", rowDownloadLink.href);
          return rowDownloadLink.href;
        }
      }
    }
    const allDownloadLinks = Array.from(
      document.querySelectorAll('a[href*="/api/download/models/"]')
    );
    const validLinks = allDownloadLinks.filter((a) => !isPaidOrLocked(a));
    if (validLinks.length > 0) {
      if (downloadSelectedEl) {
        const nearLink = validLinks.find((a) => downloadSelectedEl.contains(a) || a.contains(downloadSelectedEl));
        if (nearLink) {
          return nearLink.href;
        }
      }
      const nonRowLink = validLinks.find(
        (a) => a.textContent && /Download/i.test(a.textContent)
      );
      if (nonRowLink) {
        return nonRowLink.href;
      }
      return validLinks[0].href;
    }
    const anyDownloadBtn = Array.from(document.querySelectorAll("button, a")).find((b) => {
      const txt = (b.textContent || "").trim();
      return /Download/i.test(txt) || /下载/i.test(txt);
    });
    if (anyDownloadBtn && isPaidOrLocked(anyDownloadBtn)) {
      return null;
    }
    const sp = new URLSearchParams(window.location.search);
    const ver = sp.get("modelVersionId");
    if (ver) {
      return `${window.location.origin}/api/download/models/${ver}`;
    }
    return null;
  }
  function fetchRealB2Url(apiUrl) {
    return new Promise((resolve) => {
      let resolved = false;
      let requestObj = null;
      const finish = (resultUrl) => {
        if (resolved) return;
        resolved = true;
        if (requestObj && typeof requestObj.abort === "function") {
          try {
            requestObj.abort();
          } catch {
          }
        }
        resolve(resultUrl);
      };
      if (typeof GM_xmlhttpRequest === "undefined") {
        finish(apiUrl);
        return;
      }
      try {
        requestObj = GM_xmlhttpRequest({
          method: "HEAD",
          url: apiUrl,
          timeout: 1e4,
          headers: {
            "Accept": "*/*"
          },
          onreadystatechange: (res) => {
            var _a, _b, _c;
            if (res.finalUrl && res.finalUrl.includes("b2ContentDisposition")) {
              finish(res.finalUrl);
              return;
            }
            if (res.readyState >= 2 && (res.status === 307 || res.status === 302 || res.status === 301)) {
              const loc = (_c = (_b = (_a = res.responseHeaders) == null ? void 0 : _a.match(/location:\s*([^\r\n]+)/i)) == null ? void 0 : _b[1]) == null ? void 0 : _c.trim();
              if (loc && loc.startsWith("http")) {
                finish(loc);
                return;
              }
            }
            if (res.readyState === 2 && res.status === 200) {
              if (res.finalUrl && res.finalUrl.startsWith("http") && res.finalUrl !== apiUrl) {
                finish(res.finalUrl);
                return;
              }
            }
          },
          onload: (res) => {
            var _a, _b, _c;
            if (res.finalUrl && res.finalUrl.startsWith("http") && res.finalUrl !== apiUrl) {
              finish(res.finalUrl);
            } else {
              const loc = (_c = (_b = (_a = res.responseHeaders) == null ? void 0 : _a.match(/location:\s*([^\r\n]+)/i)) == null ? void 0 : _b[1]) == null ? void 0 : _c.trim();
              if (loc && loc.startsWith("http")) {
                finish(loc);
              } else {
                finish(apiUrl);
              }
            }
          },
          onerror: () => finish(apiUrl),
          ontimeout: () => finish(apiUrl)
        });
      } catch {
        finish(apiUrl);
      }
    });
  }
  function copyText(text) {
    return new Promise((resolve) => {
      if (typeof GM_setClipboard !== "undefined") {
        GM_setClipboard(text);
        resolve(true);
      } else if (navigator.clipboard) {
        navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => resolve(false));
      } else {
        resolve(false);
      }
    });
  }
  async function doCopy(targetUrl, copyBtn) {
    let token = (GM_getValue(STORAGE_KEY, "") || "").trim();
    if (!token) {
      const input = window.prompt(
        "检测到尚未配置 Civitai Token，请输入你的 API Token（输入后将持久保存，以后点击直接复制）：",
        ""
      );
      if (input !== null && input.trim()) {
        token = input.trim();
        GM_setValue(STORAGE_KEY, token);
      }
    }
    const apiUrlWithToken = buildApiUrl(targetUrl, token);
    copyBtn.innerHTML = `${ICON_SPINNER}<span>解析直链中...</span>`;
    try {
      const finalUrl = await fetchRealB2Url(apiUrlWithToken);
      const ok = await copyText(finalUrl);
      if (ok) {
        copyBtn.innerHTML = `${ICON_CHECK}<span>已复制直链</span>`;
        copyBtn.classList.add("copied");
        if (finalUrl.includes("b2ContentDisposition") || finalUrl.includes("filename=")) {
          showToast("已复制真实文件名直链！可直接保存正确文件名", "success");
        } else {
          showToast("已复制直链", "success");
        }
      } else {
        window.prompt("请手动复制链接：", finalUrl);
      }
    } catch {
      await copyText(apiUrlWithToken);
      showToast("已复制直链", "warning");
    } finally {
      setTimeout(() => {
        copyBtn.innerHTML = `${ICON_COPY}<span>复制带Token链接</span>`;
        copyBtn.classList.remove("copied");
      }, 2e3);
    }
  }
  function createButtonGroup(getTargetUrl) {
    const wrapper = document.createElement("div");
    wrapper.className = "civitai-token-btn-wrapper";
    const copyBtn = document.createElement("button");
    copyBtn.type = "button";
    copyBtn.className = "civitai-copy-btn";
    copyBtn.innerHTML = `${ICON_COPY}<span>复制带Token链接</span>`;
    copyBtn.title = "点击一键解析并复制带实际文件名的 B2 最终直链";
    copyBtn.addEventListener("pointerup", (e) => {
      e.preventDefault();
      e.stopPropagation();
      const url = getTargetUrl();
      if (!url) {
        showToast("未能识别到模型下载直链", "warning");
        return;
      }
      doCopy(url, copyBtn);
    });
    wrapper.appendChild(copyBtn);
    return wrapper;
  }
  function autoInject() {
    const existingWrapper = document.querySelector(".civitai-token-btn-wrapper");
    const validUrl = getTargetDownloadUrl();
    if (!validUrl) {
      if (existingWrapper) {
        existingWrapper.remove();
      }
      return;
    }
    if (existingWrapper) {
      return;
    }
    const allDownloadLinks = Array.from(
      document.querySelectorAll('a[href*="/api/download/models/"]')
    );
    const directLink = allDownloadLinks.find((a) => !isPaidOrLocked(a));
    if (directLink) {
      const anchor = directLink.closest(".mantine-Button-root") || directLink;
      const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
      anchor.insertAdjacentElement("afterend", btnGroup);
      return;
    }
    const buttons = document.querySelectorAll("button, a");
    for (const b of buttons) {
      const txt = (b.textContent || "").trim();
      if ((/Download/i.test(txt) || /下载/i.test(txt)) && !isPaidOrLocked(b)) {
        const anchor = b.closest(".mantine-Button-root") || b;
        const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
        anchor.insertAdjacentElement("afterend", btnGroup);
        return;
      }
    }
    const allDivs = document.querySelectorAll("div");
    for (const div of allDivs) {
      const s = div.getAttribute("style") || "";
      if (s.includes("border-top") && s.includes("mantine-spacing-sm") || s.includes("border-top") && s.toLowerCase().includes("#373a40")) {
        const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
        div.appendChild(btnGroup);
        return;
      }
    }
  }
  const IMAGE_FILE_EXT_RE = /\.(png|jpe?g|jfif|webp|gif|bmp|avif|tiff?|mp4|webm)$/i;
  const filenameBadges = /* @__PURE__ */ new WeakMap();
  const filenameApplied = /* @__PURE__ */ new WeakMap();
  function looksLikeFileName(text) {
    const t = text.trim();
    return t.length > 1 && t.length <= 150 && IMAGE_FILE_EXT_RE.test(t) && !t.includes("/") && !t.includes("\\");
  }
  function extractFileNameFromUrl(url) {
    try {
      const last = new URL(url, window.location.origin).pathname.split("/").filter(Boolean).pop() || "";
      const seg = decodeURIComponent(last);
      return looksLikeFileName(seg) ? seg : null;
    } catch {
      return null;
    }
  }
  function getImageFileName(img) {
    const alt = (img.getAttribute("alt") || "").trim();
    if (looksLikeFileName(alt)) {
      return alt;
    }
    if (img.closest('a[href*="/images/"]')) {
      return extractFileNameFromUrl(img.currentSrc || img.src || "");
    }
    return null;
  }
  function applyFilenameBadge(img, name) {
    const parent = img.parentElement;
    if (!parent) return;
    const host = parent.tagName === "PICTURE" && parent.parentElement ? parent.parentElement : parent;
    let badge = filenameBadges.get(img);
    if (badge && badge.parentElement !== host) {
      badge.remove();
      badge = void 0;
    }
    if (!badge) {
      if (getComputedStyle(host).position === "static") {
        host.style.position = "relative";
      }
      badge = document.createElement("span");
      badge.className = "civitai-helper-filename";
      host.appendChild(badge);
      filenameBadges.set(img, badge);
    }
    if (badge.textContent !== name) {
      badge.textContent = name;
      badge.title = name;
    }
  }
  function enhanceImageFilenames() {
    const imgs = document.querySelectorAll('img[alt], a[href*="/images/"] img');
    for (const img of Array.from(imgs)) {
      const name = getImageFileName(img);
      if (!name) {
        if (filenameApplied.has(img)) {
          filenameApplied.delete(img);
          const stale = filenameBadges.get(img);
          if (stale) {
            stale.remove();
            filenameBadges.delete(img);
          }
        }
        continue;
      }
      if (filenameApplied.get(img) === name) continue;
      filenameApplied.set(img, name);
      applyFilenameBadge(img, name);
    }
  }
  let filenameEnhanceScheduled = false;
  function scheduleImageFilenameEnhance() {
    if (filenameEnhanceScheduled) return;
    filenameEnhanceScheduled = true;
    requestAnimationFrame(() => {
      filenameEnhanceScheduled = false;
      enhanceImageFilenames();
    });
  }
  autoInject();
  enhanceImageFilenames();
  const observer = new MutationObserver(() => {
    autoInject();
    scheduleImageFilenameEnhance();
  });
  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });
  setInterval(() => {
    autoInject();
    enhanceImageFilenames();
  }, 800);

})();