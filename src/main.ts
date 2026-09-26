import './style.css';

/**
 * Civitai Download Link Copier with Token
 * TypeScript Implementation
 *
 * 核心逻辑：
 * 1. 自动过滤未购买/未付费（⚡Buzz）模型；
 * 2. 携带用户 Token 通过极轻量 HEAD 请求从 307 重定向中解析出带正确文件名的 B2 直链；
 * 3. 界面精简：去除多余的齿轮设置按钮，首次点击未设置时自动弹窗引导输入；后续如需修改可随时通过油猴脚本菜单修改。
 */

type ToastType = 'success' | 'warning' | 'info';

const STORAGE_KEY = 'civitai_download_token';

const ICON_COPY = `<svg viewBox="0 0 24 24"><path d="M16 1H4c-1.1 0-2 .9-2 2v14h2V3h12V1zm3 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm0 16H8V7h11v14z"/></svg>`;
const ICON_CHECK = `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`;
const ICON_SPINNER = `<svg viewBox="0 0 24 24" style="animation: civitai-spin 1s linear infinite;"><path d="M12 4V2A10 10 0 0 0 2 12h2a8 8 0 0 1 8-8z"/></svg>`;

let toastTimer: ReturnType<typeof setTimeout> | null = null;

function showToast(msg: string, type: ToastType = 'success'): void {
  let toast = document.getElementById('civitai-tm-toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'civitai-tm-toast';
    toast.className = 'civitai-tm-toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.className = `civitai-tm-toast ${type} show`;
  if (toastTimer) {
    clearTimeout(toastTimer);
  }
  toastTimer = setTimeout(() => {
    if (toast) toast.className = `civitai-tm-toast ${type}`;
  }, 3000);
}

function promptTokenSetting(): void {
  const current = (GM_getValue<string>(STORAGE_KEY, '') || '').trim();
  const tip = current
    ? `当前已保存 Token: ${current.substring(0, 4)}****\n\n请输入新的 Civitai API Token（留空清除）：`
    : '请输入你的 Civitai API Token（用于拼接 ?token=xxx）：';
  const input = window.prompt(tip, current);
  if (input !== null) {
    const val = input.trim();
    GM_setValue(STORAGE_KEY, val);
    if (val) {
      showToast('Token 设置已更新！', 'success');
    } else {
      showToast('Token 已清除', 'warning');
    }
  }
}

// 注册油猴菜单入口，用户若要修改 Token 可在浏览器插件栏点击油猴随时修改
if (typeof GM_registerMenuCommand !== 'undefined') {
  GM_registerMenuCommand('⚙️ 设置 / 修改 Civitai Token', promptTokenSetting);
}

/**
 * 判断某个按钮或链接是否属于“需付费/未购买”的锁定状态
 */
function isPaidOrLocked(el: HTMLElement): boolean {
  if (el.tagName === 'A' && !el.getAttribute('href')) {
    return true;
  }
  if (el.querySelector('.tabler-icon-bolt, [class*="mantine-Badge-root"]')) {
    return true;
  }
  const badge = el.parentElement?.querySelector('.mantine-Badge-root');
  if (badge && badge.textContent && /\d+/.test(badge.textContent)) {
    return true;
  }
  return false;
}

/**
 * 组装拼接 Token 的 Civitai API 直链
 */
function buildApiUrl(rawUrl: string, token: string): string {
  try {
    const parsed = new URL(rawUrl, window.location.origin);
    if (token) {
      parsed.searchParams.set('token', token);
    }
    return parsed.toString();
  } catch {
    const delimiter = rawUrl.includes('?') ? '&' : '?';
    return token ? `${rawUrl}${delimiter}token=${encodeURIComponent(token)}` : rawUrl;
  }
}

/**
 * 获取当前准确的下载链接（严格过滤掉付费/未购买的按钮）
 */
function getTargetDownloadUrl(): string | null {
  const allDownloadLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/download/models/"]')
  );

  const validLinks = allDownloadLinks.filter((a) => !isPaidOrLocked(a));

  if (validLinks.length > 0) {
    const withFileId = validLinks.find((a) => a.href.includes('fileId='));
    if (withFileId) {
      return withFileId.href;
    }
    return validLinks[0].href;
  }

  const anyDownloadBtn = Array.from(document.querySelectorAll<HTMLElement>('button, a')).find((b) => {
    const txt = (b.textContent || '').trim();
    return /Download/i.test(txt) || /下载/i.test(txt);
  });
  if (anyDownloadBtn && isPaidOrLocked(anyDownloadBtn)) {
    return null;
  }

  const sp = new URLSearchParams(window.location.search);
  const ver = sp.get('modelVersionId');
  if (ver) {
    return `${window.location.origin}/api/download/models/${ver}`;
  }

  return null;
}

/**
 * 提取真实 B2 直链
 */
function fetchRealB2Url(apiUrl: string): Promise<string> {
  return new Promise((resolve) => {
    let resolved = false;
    let requestObj: any = null;

    const finish = (resultUrl: string) => {
      if (resolved) return;
      resolved = true;
      if (requestObj && typeof requestObj.abort === 'function') {
        try {
          requestObj.abort();
        } catch {}
      }
      resolve(resultUrl);
    };

    if (typeof GM_xmlhttpRequest === 'undefined') {
      finish(apiUrl);
      return;
    }

    try {
      requestObj = GM_xmlhttpRequest({
        method: 'HEAD',
        url: apiUrl,
        timeout: 10000,
        headers: {
          'Accept': '*/*'
        },
        onreadystatechange: (res) => {
          if (res.finalUrl && res.finalUrl.includes('b2ContentDisposition')) {
            finish(res.finalUrl);
            return;
          }
          if (res.readyState >= 2 && (res.status === 307 || res.status === 302 || res.status === 301)) {
            const loc = res.responseHeaders?.match(/location:\s*([^\r\n]+)/i)?.[1]?.trim();
            if (loc && loc.startsWith('http')) {
              finish(loc);
              return;
            }
          }
          if (res.readyState === 2 && res.status === 200) {
            if (res.finalUrl && res.finalUrl.startsWith('http') && res.finalUrl !== apiUrl) {
              finish(res.finalUrl);
              return;
            }
          }
        },
        onload: (res) => {
          if (res.finalUrl && res.finalUrl.startsWith('http') && res.finalUrl !== apiUrl) {
            finish(res.finalUrl);
          } else {
            const loc = res.responseHeaders?.match(/location:\s*([^\r\n]+)/i)?.[1]?.trim();
            if (loc && loc.startsWith('http')) {
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

function copyText(text: string): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof GM_setClipboard !== 'undefined') {
      GM_setClipboard(text);
      resolve(true);
    } else if (navigator.clipboard) {
      navigator.clipboard.writeText(text).then(() => resolve(true)).catch(() => resolve(false));
    } else {
      resolve(false);
    }
  });
}

/**
 * 执行复制
 */
async function doCopy(targetUrl: string, copyBtn: HTMLButtonElement): Promise<void> {
  let token = (GM_getValue<string>(STORAGE_KEY, '') || '').trim();

  // 若未设置，首次点击时自动引导弹出输入框
  if (!token) {
    const input = window.prompt(
      '检测到尚未配置 Civitai Token，请输入你的 API Token（输入后将持久保存，以后点击直接复制）：',
      ''
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
      copyBtn.classList.add('copied');

      if (finalUrl.includes('b2ContentDisposition') || finalUrl.includes('filename=')) {
        showToast('已复制真实文件名直链！可直接保存正确文件名', 'success');
      } else {
        showToast('已复制直链', 'success');
      }
    } else {
      window.prompt('请手动复制链接：', finalUrl);
    }
  } catch {
    await copyText(apiUrlWithToken);
    showToast('已复制直链', 'warning');
  } finally {
    setTimeout(() => {
      copyBtn.innerHTML = `${ICON_COPY}<span>复制带Token链接</span>`;
      copyBtn.classList.remove('copied');
    }, 2000);
  }
}

/**
 * 创建纯净的单个全宽复制按钮
 */
function createButtonGroup(getTargetUrl: () => string | null): HTMLElement {
  const wrapper = document.createElement('div');
  wrapper.className = 'civitai-token-btn-wrapper';

  const copyBtn = document.createElement('button');
  copyBtn.type = 'button';
  copyBtn.className = 'civitai-copy-btn';
  copyBtn.innerHTML = `${ICON_COPY}<span>复制带Token链接</span>`;
  copyBtn.title = '点击一键解析并复制带实际文件名的 B2 最终直链';

  copyBtn.addEventListener('pointerup', (e: PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const url = getTargetUrl();
    if (!url) {
      showToast('未能识别到模型下载直链', 'warning');
      return;
    }
    doCopy(url, copyBtn);
  });

  wrapper.appendChild(copyBtn);
  return wrapper;
}

function autoInject(): void {
  const existingWrapper = document.querySelector('.civitai-token-btn-wrapper');
  const validUrl = getTargetDownloadUrl();

  // 若为未购买模型，清理按钮并退出
  if (!validUrl) {
    if (existingWrapper) {
      existingWrapper.remove();
    }
    return;
  }

  if (existingWrapper) {
    return;
  }

  // 1. 优先寻找未锁定的下载 <a> 标签
  const allDownloadLinks = Array.from(
    document.querySelectorAll<HTMLAnchorElement>('a[href*="/api/download/models/"]')
  );
  const directLink = allDownloadLinks.find((a) => !isPaidOrLocked(a));

  if (directLink) {
    const anchor = directLink.closest('.mantine-Button-root') || directLink;
    const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
    anchor.insertAdjacentElement('afterend', btnGroup);
    return;
  }

  // 2. 寻找带有 Download 文案且未锁定的按钮
  const buttons = document.querySelectorAll<HTMLElement>('button, a');
  for (const b of buttons) {
    const txt = (b.textContent || '').trim();
    if ((/Download/i.test(txt) || /下载/i.test(txt)) && !isPaidOrLocked(b)) {
      const anchor = b.closest('.mantine-Button-root') || b;
      const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
      anchor.insertAdjacentElement('afterend', btnGroup);
      return;
    }
  }

  // 3. 兜底方案：找到底栏操作容器
  const allDivs = document.querySelectorAll<HTMLDivElement>('div');
  for (const div of allDivs) {
    const s = div.getAttribute('style') || '';
    if (
      (s.includes('border-top') && s.includes('mantine-spacing-sm')) ||
      (s.includes('border-top') && s.toLowerCase().includes('#373a40'))
    ) {
      const btnGroup = createButtonGroup(() => getTargetDownloadUrl());
      div.appendChild(btnGroup);
      return;
    }
  }
}

autoInject();

const observer = new MutationObserver(() => {
  autoInject();
});

observer.observe(document.documentElement, {
  childList: true,
  subtree: true,
});

setInterval(autoInject, 800);
