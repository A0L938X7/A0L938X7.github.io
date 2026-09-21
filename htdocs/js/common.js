/* ============================================================
   公共：主题 / 页面路由 / 移动导航 / XML 加载 / toast
   ============================================================ */
(function (global) {
  'use strict';

  /* ---------- 主题 ---------- */
  function isDark() { return document.body.classList.contains('dark'); }
  function updateThemeBtn() {
    var b = document.getElementById('theme-toggle');
    if (b) b.textContent = isDark() ? '☀' : '🌙';
  }
  function initTheme() {
    var saved = null;
    try { saved = localStorage.getItem('xiangma-learn-theme'); } catch (e) {}
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
          localStorage.setItem('xiangma-learn-theme', isDark() ? 'dark' : 'light');
        } catch (e) {}
        updateThemeBtn();
      });
    }
  }

  /* ---------- 移动导航 ---------- */
  var PAGES = [
    { href: 'index.html', label: '欢迎页面', page: 'welcome' },
    { href: 'learn.html', label: '学习模块', page: 'modules' },
    { href: 'test.html', label: '快速检测', page: 'quizzes' },
    { href: 'paipan.html', label: '排盘软件', page: 'pan' }
  ];

  function buildMobileNav(activePage, catalogData, currentNoteId, onSelectNote) {
    var nav = document.getElementById('mobile-nav');
    if (!nav) return;
    nav.innerHTML = '';

    if (activePage === 'modules' && catalogData) {
      catalogData.folders.forEach(function (folder) {
        var gt = document.createElement('div');
        gt.className = 'mobile-nav-group-title';
        gt.textContent = folder.name;
        nav.appendChild(gt);
        folder.children.forEach(function (child) {
          if (child.type === 'folder') {
            var st = document.createElement('div');
            st.className = 'mobile-nav-subgroup-title';
            st.textContent = child.name;
            nav.appendChild(st);
            child.children.forEach(function (note) {
              appendNoteBtn(nav, note, currentNoteId, onSelectNote);
            });
          } else {
            appendNoteBtn(nav, child, currentNoteId, onSelectNote);
          }
        });
      });
      var divider = document.createElement('div');
      divider.className = 'mobile-nav-divider';
      nav.appendChild(divider);
      var pl = document.createElement('div');
      pl.className = 'mobile-nav-page-label';
      pl.textContent = '返回其他页面';
      nav.appendChild(pl);
    }

    PAGES.forEach(function (p) {
      var a = document.createElement('a');
      a.className = 'mobile-nav-item';
      a.href = p.href;
      a.textContent = p.label;
      if (p.page === activePage) a.classList.add('active');
      nav.appendChild(a);
    });
  }
  function appendNoteBtn(nav, note, currentId, onSelectNote) {
    var btn = document.createElement('button');
    btn.className = 'mobile-nav-item';
    btn.textContent = note.title;
    if (note.id === currentId) btn.classList.add('active');
    btn.addEventListener('click', function () {
      nav.classList.remove('open');
      var hb = document.getElementById('hamburger');
      if (hb) hb.classList.remove('open');
      if (onSelectNote) onSelectNote(note);
      else location.href = 'learn.html?note=' + encodeURIComponent(note.id);
    });
    nav.appendChild(btn);
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

  /* ---------- XML 加载 ---------- */
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
          reject(new Error('加载失败：' + url + ' (' + xhr.status + ')'));
        }
      };
      xhr.onerror = function () { reject(new Error('网络错误：' + url)); };
      xhr.send();
    });
  }

  /* 把 learn.xml 的 catalog 转成 JS 对象 */
  function parseCatalog(xmlDoc) {
    var site = xmlDoc.documentElement;
    var catalogEl = site.querySelector('catalog');
    var folders = [];
    if (catalogEl) {
      Array.prototype.forEach.call(catalogEl.children, function (child) {
        if (child.tagName === 'folder') folders.push(parseFolder(child));
      });
    }
    var quizzes = [];
    var quizzesEl = site.querySelector('quizzes');
    if (quizzesEl) {
      Array.prototype.forEach.call(quizzesEl.querySelectorAll('quiz'), function (q) {
        quizzes.push(parseQuiz(q));
      });
    }
    return {
      title: site.getAttribute('title') || '响马卦学习系统',
      author: site.getAttribute('author') || '',
      folders: folders,
      quizzes: quizzes
    };
  }
  function parseFolder(el) {
    var folder = {
      type: 'folder',
      name: el.getAttribute('name') || '',
      subtitle: el.getAttribute('subtitle') || '',
      children: []
    };
    Array.prototype.forEach.call(el.children, function (child) {
      if (child.tagName === 'folder') folder.children.push(parseFolder(child));
      else if (child.tagName === 'note') folder.children.push(parseNote(child));
    });
    return folder;
  }
  function parseNote(el) {
    var related = (el.getAttribute('related') || '')
      .split(',').map(function (s) { return s.trim(); }).filter(Boolean);
    return {
      type: 'note',
      id: el.getAttribute('id') || '',
      title: el.getAttribute('title') || '',
      path: el.getAttribute('path') || '',
      related: related,
      folder: el.getAttribute('group') || ''
    };
  }
  function parseQuiz(el) {
    var qs = [];
    Array.prototype.forEach.call(el.querySelectorAll('question'), function (q) {
      var opts = [];
      Array.prototype.forEach.call(q.querySelectorAll('opt'), function (o) {
        opts.push(o.textContent.trim());
      });
      qs.push({
        q: q.getAttribute('q') || '',
        a: q.getAttribute('a') || '',
        opts: opts
      });
    });
    return {
      id: el.getAttribute('id') || '',
      title: el.getAttribute('title') || '',
      desc: el.getAttribute('desc') || '',
      questions: qs
    };
  }

  /* 扁平化 notes，便于按 id 查 */
  function flattenNotes(folders) {
    var map = {};
    var order = [];
    function walk(list, parentName, subName) {
      list.forEach(function (node) {
        if (node.type === 'folder') {
          walk(node.children, parentName ? parentName : node.name, parentName ? node.name : '');
        } else {
          map[node.id] = node;
          node._group = subName || parentName || '';
          order.push(node);
        }
      });
    }
    walk(folders, '', '');
    return { map: map, order: order };
  }

  /* ---------- toast ---------- */
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

  /* ---------- 工具 ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function pad2(n) { return n < 10 ? '0' + n : '' + n; }
  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  global.XMCommon = {
    isDark: isDark,
    initTheme: initTheme,
    initHamburger: initHamburger,
    buildMobileNav: buildMobileNav,
    loadXML: loadXML,
    parseCatalog: parseCatalog,
    flattenNotes: flattenNotes,
    toast: toast,
    escapeHtml: escapeHtml,
    pad2: pad2,
    shuffle: shuffle,
    PAGES: PAGES
  };
})(window);