/* ============================================================
   门户通用逻辑：主题 / 移动导航 / XML 加载 / 工具
   ============================================================ */
(function (global) {
  'use strict';

  function isDark() { return document.body.classList.contains('dark'); }
  function updateThemeBtn() {
    var b = document.getElementById('theme-toggle');
    if (b) b.textContent = isDark() ? '☀' : '🌙';
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('xiangma-portal-theme'); } catch (e) {}
    var prefersDark = false;
    try {
      prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch (e) {}
    var useDark = saved === 'dark' || (saved !== 'light' && prefersDark);
    if (useDark) document.body.classList.add('dark');
    updateThemeBtn();
    var btn = document.getElementById('theme-toggle');
    if (btn) {
      btn.addEventListener('click', function () {
        document.body.classList.toggle('dark');
        try {
          localStorage.setItem('xiangma-portal-theme', isDark() ? 'dark' : 'light');
        } catch (e) {}
        updateThemeBtn();
      });
    }
  }

  function initHamburger() {
    var hb = document.getElementById('hamburger');
    var nav = document.getElementById('mobile-nav');
    if (!hb || !nav) return;
    hb.addEventListener('click', function (e) {
      e.stopPropagation();
      if (nav.classList.contains('open')) {
        nav.classList.remove('open'); hb.classList.remove('open');
      } else {
        nav.classList.add('open'); hb.classList.add('open');
      }
    });
    document.addEventListener('click', function (e) {
      if (!nav.classList.contains('open')) return;
      if (nav.contains(e.target) || hb.contains(e.target)) return;
      nav.classList.remove('open'); hb.classList.remove('open');
    });
  }

  function loadXML(url) {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', url, true);
      xhr.onreadystatechange = function () {
        if (xhr.readyState !== 4) return;
        if (xhr.status === 0 || (xhr.status >= 200 && xhr.status < 300)) {
          try {
            var doc = new DOMParser().parseFromString(xhr.responseText, 'application/xml');
            var err = doc.querySelector('parsererror');
            if (err) return reject(new Error('XML 解析失败'));
            resolve(doc);
          } catch (e) { reject(e); }
        } else {
          reject(new Error('加载失败 ' + xhr.status));
        }
      };
      xhr.onerror = function () { reject(new Error('网络错误')); };
      xhr.send();
    });
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  
  function toast(msg, ms) {
    var el = document.getElementById('toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toast';
      document.body.appendChild(el);
    }
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(el._t);
    el._t = setTimeout(function () { el.classList.remove('show'); }, ms || 2000);
  }

  global.XMCommon = {
    isDark: isDark,
    initTheme: initTheme,
    initHamburger: initHamburger,
    loadXML: loadXML,
    escapeHtml: escapeHtml,
    toast: toast
  };
})(window);
