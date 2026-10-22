/* ============================================================
   门户主逻辑：读取 portal.xml，渲染卡片 / 成员 / Hero，处理路由
   ============================================================ */
(function () {
  'use strict';

  /* 极老浏览器（无 Promise / querySelector / addEventListener）直接给一句人话，
     免得白屏——IE11 之类既没有 Promise 也不支持后面的 CSS 变量 */
  if (!window.Promise || !document.querySelector || !document.addEventListener) {
    document.body.innerHTML =
      '<div style="padding:56px 24px;font:16px/2 system-ui,-apple-system,\'Microsoft YaHei\',sans-serif;' +
      'color:#dcdcdc;background:#0a0a0a;min-height:100vh;box-sizing:border-box">' +
      '<div style="font-size:20px;letter-spacing:2px;margin-bottom:12px">当前浏览器版本过旧</div>' +
      '<div>页面用到了较新的浏览器特性，无法在此版本运行。</div>' +
      '<div>请改用新版 Chrome / Edge / Firefox 打开。</div></div>';
    return;
  }

  var C = window.XMCommon;

  /* ================= 解析 portal.xml ================= */
  function parsePortal(doc) {
    var root = doc.documentElement;

    var title = root.getAttribute('title') || '响马卦 · 学习中枢';
    var subtitle = root.getAttribute('subtitle') || '';

    /* ----- 主页 ----- */
    var home = [];
    var homeHero = null;
    var homeEl = root.querySelector('home');
    if (homeEl) {
      homeHero = {
        image: homeEl.getAttribute('hero') || '',
        alt: homeEl.getAttribute('hero-alt') || title
      };
      Array.prototype.forEach.call(homeEl.querySelectorAll('card'), function (el) {
        home.push({
          id: el.getAttribute('id') || '',
          title: el.getAttribute('title') || '',
          subtitle: el.getAttribute('subtitle') || '',
          image: el.getAttribute('image') || '',
          link: el.getAttribute('link') || '',
          desc: el.getAttribute('desc') || ''
        });
      });
    }

    /* ----- 关于我们 ----- */
    var about = [];
    var aboutHero = null;
    var aboutTitle = '关于我们';
    var aboutSubtitle = '讲师与整理者';
    var aboutEl = root.querySelector('about');
    if (aboutEl) {
      aboutTitle = aboutEl.getAttribute('title') || aboutTitle;
      aboutSubtitle = aboutEl.getAttribute('subtitle') || aboutSubtitle;
      aboutHero = {
        image: aboutEl.getAttribute('hero') || '',
        alt: aboutEl.getAttribute('hero-alt') || aboutTitle
      };
      Array.prototype.forEach.call(aboutEl.querySelectorAll('member'), function (el) {
        about.push({
          name: el.getAttribute('name') || '',
          avatar: el.getAttribute('avatar') || '',
          role: el.getAttribute('role') || '',
          bio: el.getAttribute('bio') || '',
          message: el.getAttribute('message') || '',
          contact: el.getAttribute('contact') || '',
          contactType: el.getAttribute('contact-type') || ''
        });
      });
    }

    return {
      title: title,
      subtitle: subtitle,
      home: home,
      homeHero: homeHero,
      about: about,
      aboutHero: aboutHero,
      aboutTitle: aboutTitle,
      aboutSubtitle: aboutSubtitle
    };
  }

  /* ================= 应用 Hero ================= */
  function applyHero(heroEl, heroData) {
    if (!heroEl) return;
    var bg = heroEl.querySelector('.page-hero-bg');
    if (!bg) return;

    if (heroData && heroData.image) {
      // 预加载图片，确保可用再设置背景
      var probe = new Image();
      probe.onload = function () {
        var url = 'url("' + heroData.image.replace(/"/g, '\\"') + '")';
        bg.style.backgroundImage = url;
        /* 同时把图挂到 Hero 的变量上：手机端用它做"模糊延展"填满两侧留白，
           这样整幅图完整可见，又不会出现空荡的暗边 */
        heroEl.style.setProperty('--hero-img', url);
        heroEl.classList.add('has-image');
      };
      probe.onerror = function () {
        heroEl.classList.remove('has-image');
      };
      probe.src = heroData.image;
    } else {
      heroEl.classList.remove('has-image');
    }
  }

  /* ================= 渲染主页卡片 ================= */
  function renderHome(cards) {
    var grid = document.getElementById('home-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!cards.length) {
      grid.innerHTML = '<div class="portal-loading">暂无内容</div>';
      return;
    }
    cards.forEach(function (card) {
      grid.appendChild(makeCard(card));
    });
  }

  function makeCard(card) {
    var isAvailable = !!card.link;
    var el = document.createElement('div');
    el.className = 'portal-card' + (isAvailable ? '' : ' disabled');
    el.dataset.id = card.id;
    el.tabIndex = 0;

    /* ----- 图片区 ----- */
    var imgWrap = document.createElement('div');
    imgWrap.className = 'card-image';

    if (card.image) {
      var img = document.createElement('img');
      img.src = card.image;
      img.alt = card.title;
      img.loading = 'lazy';
      img.onerror = function () {
        imgWrap.classList.add('no-image');
        img.style.display = 'none';
      };
      imgWrap.appendChild(img);
    } else {
      imgWrap.classList.add('no-image');
    }

    if (!isAvailable) {
      var lock = document.createElement('div');
      lock.className = 'card-lock';
      lock.innerHTML =
        '<svg viewBox="0 0 24 24" width="40" height="40" ' +
        'fill="none" stroke="currentColor" stroke-width="1.6" ' +
        'stroke-linecap="round" stroke-linejoin="round">' +
        '<rect x="4" y="10" width="16" height="11" rx="2"/>' +
        '<path d="M8 10V7a4 4 0 0 1 8 0v3"/>' +
        '</svg>';
      imgWrap.appendChild(lock);

      var badge = document.createElement('div');
      badge.className = 'card-badge';
      badge.textContent = '未开放';
      imgWrap.appendChild(badge);
    }

    el.appendChild(imgWrap);

    /* ----- 内容区 ----- */
    var body = document.createElement('div');
    body.className = 'card-body';

    var title = document.createElement('div');
    title.className = 'card-title';
    title.textContent = card.title;
    body.appendChild(title);

    if (card.subtitle) {
      var sub = document.createElement('div');
      sub.className = 'card-subtitle';
      sub.textContent = card.subtitle;
      body.appendChild(sub);
    }

    /* ----- 展开区 ----- */
    if (card.desc || isAvailable) {
      var expand = document.createElement('div');
      expand.className = 'card-expand';

      var inner = document.createElement('div');
      inner.className = 'card-expand-inner';

      if (card.desc) {
        var desc = document.createElement('div');
        desc.className = 'card-desc';
        desc.textContent = card.desc;
        inner.appendChild(desc);
      }

      if (isAvailable) {
        var enter = document.createElement('a');
        enter.className = 'card-enter';
        enter.href = card.link;
        enter.textContent = '进入 →';
        enter.addEventListener('click', function (e) {
          e.stopPropagation();
        });
        inner.appendChild(enter);
      }

      expand.appendChild(inner);
      body.appendChild(expand);
    }

    el.appendChild(body);

    /* ----- 交互 ----- */
    function toggle() {
      if (!isAvailable) {
        C.toast('此内容尚未开放');
        return;
      }
      if (el.querySelector('.card-expand')) {
        if (el.classList.contains('expanded')) {
          el.classList.remove('expanded');
        } else {
          document.querySelectorAll('.portal-card.expanded').forEach(function (c) {
            c.classList.remove('expanded');
          });
          el.classList.add('expanded');
        }
      } else {
        location.href = card.link;
      }
    }

    el.addEventListener('click', toggle);
    el.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        toggle();
      }
    });

    return el;
  }

  /* ================= 渲染关于我们 ================= */
  function renderAbout(members) {
    var grid = document.getElementById('member-grid');
    if (!grid) return;
    grid.innerHTML = '';
    if (!members.length) {
      grid.innerHTML = '<div class="portal-loading">暂无成员信息</div>';
      return;
    }
    members.forEach(function (m) {
      grid.appendChild(makeMemberCard(m));
    });
  }

  function makeMemberCard(m) {
    var el = document.createElement('div');
    el.className = 'member-card';

    var avatarWrap = document.createElement('div');
    avatarWrap.className = 'member-avatar-wrap';
    var fallbackText = (m.name || '?').slice(0, 1);

    if (m.avatar) {
      var img = document.createElement('img');
      img.className = 'member-avatar';
      img.src = m.avatar;
      img.alt = m.name;
      img.onerror = function () {
        avatarWrap.innerHTML =
          '<div class="member-avatar-fallback">' +
          C.escapeHtml(fallbackText) + '</div>';
      };
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.innerHTML =
        '<div class="member-avatar-fallback">' +
        C.escapeHtml(fallbackText) + '</div>';
    }
    el.appendChild(avatarWrap);

    var body = document.createElement('div');
    body.className = 'member-body';

    if (m.name) {
      var name = document.createElement('div');
      name.className = 'member-name';
      name.textContent = m.name;
      body.appendChild(name);
    }
    if (m.role) {
      var role = document.createElement('div');
      role.className = 'member-role';
      role.textContent = m.role;
      body.appendChild(role);
    }
    if (m.bio) {
      var bio = document.createElement('div');
      bio.className = 'member-bio';
      bio.textContent = m.bio;
      body.appendChild(bio);
    }
    if (m.message) {
      var msg = document.createElement('div');
      msg.className = 'member-message';
      msg.textContent = m.message;
      body.appendChild(msg);
    }
    if (m.contact) {
      var contact = document.createElement('div');
      contact.className = 'member-contact';
      contact.textContent = m.contact;
      body.appendChild(contact);
    }

    el.appendChild(body);
    return el;
  }

  /* ================= 路由 ================= */
  function goPage(page) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
    });
    var el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');

    document.querySelectorAll('.navbar a[data-page]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page);
    });
    document.querySelectorAll('.mobile-nav-item[data-page]').forEach(function (b) {
      b.classList.toggle('active', b.dataset.page === page);
    });

    if (history.replaceState) {
      if (page === 'home') {
        history.replaceState(null, '', location.pathname);
      } else {
        history.replaceState(null, '', location.pathname + '#' + page);
      }
    }
  }

  function initNav() {
    document.querySelectorAll('.navbar a[data-page]').forEach(function (a) {
      a.addEventListener('click', function (e) {
        e.preventDefault();
        goPage(a.dataset.page);
      });
    });
  }

  function initMobileNav() {
    var nav = document.getElementById('mobile-nav');
    if (!nav) return;
    nav.innerHTML = '';
    [
      { label: '主页', page: 'home' },
      { label: '关于我们', page: 'about' }
    ].forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'mobile-nav-item';
      btn.dataset.page = item.page;
      btn.textContent = item.label;
      btn.addEventListener('click', function () {
        goPage(item.page);
        nav.classList.remove('open');
        var hb = document.getElementById('hamburger');
        if (hb) hb.classList.remove('open');
      });
      nav.appendChild(btn);
    });
  }

  /* ================= 天气层（纯 CSS 动画；JS 只做自检与降档） =================
     雨、上浮雾、云全部交给合成器做 transform 动画，贴图是预渲染的无缝 PNG/JPEG。
     · 不依赖 canvas：规避 desynchronized / 显卡驱动导致的"画布不合成"问题
     · 没有逐帧 JS 绘制：弱机也不掉帧，也不再有 rAF 常驻循环
     · 速度全部写在 css/portal.css 的 animation-duration 里，调快调慢只改一行
     这里只负责两件事：云图缺失时在控制台点名；帧率过低时降档减层。 */
  function initWeather() {
    /* 贴图缺失自检：CSS 的 background-image 一旦 404 是静默退化的，
       这里逐个探测并把缺的文件名报在控制台（历史上就因为漏传 img/portal/ 白排查过一轮） */
    var assets = [
      ['img/portal/storm-clouds.jpg', '云（近层）'],
      ['img/portal/storm-clouds-far.jpg', '云（远层）'],
      ['img/portal/rain.png', '雨'],
      ['img/portal/storm-mist.png', '上浮雾']
    ];
    var missing = [];
    assets.forEach(function (a) {
      var im = new Image();
      im.onerror = function () {
        missing.push(a[0] + '（' + a[1] + '）');
        document.documentElement.classList.add('no-weather-assets');
        if (window.console && console.warn) {
          console.warn('[storm] 贴图缺失：' + missing.join('、') +
            ' —— 对应的天气层不会显示，请把 img/portal/ 整个目录一并上传。');
        }
      };
      im.src = a[0];
    });

    var root = document.documentElement;
    root.setAttribute('data-q', '2');

    /* 系统「减少动态」：保留全部贴图，仅由 CSS 把动画冻住（animation-play-state:paused）。
       ★ 这里绝不能再降档——降档会把雾与远层收掉，页面变成一片死黑，
         用户会以为整页坏了。想在这种情况下仍看到动画：地址后加 ?motion=1。 */
    var reduce = false;
    try {
      reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}
    var forceMotion = /[?&]motion=1(&|$)/.test(location.search);
    if (forceMotion) root.classList.add('force-motion');
    if (reduce && !forceMotion) {
      if (window.console && console.info) {
        console.info('[storm] 系统「减少动态」已开启：天气动画已冻结，贴图仍完整显示。' +
          '想看到云雨雾流动，可在网址后加 ?motion=1，或在系统设置里关闭"减少动态效果"。');
      }
      return;
    }
    if (!window.requestAnimationFrame) return;

    /* 帧率自检：只采样、不绘制。预热 20 帧后测 30 帧，共复测 3 轮即收工，
       避免常驻循环耗电；档位只回升不来回跳，防止抖动。 */
    var samples = [], last = 0, warm = 20, rounds = 0, level = 2, decided = false;
    function tick(ts) {
      if (warm > 0) { warm--; last = ts; window.requestAnimationFrame(tick); return; }
      if (last) samples.push(ts - last);
      last = ts;
      if (samples.length < 30) { window.requestAnimationFrame(tick); return; }
      var sum = 0;
      for (var i = 0; i < samples.length; i++) sum += samples[i];
      var avg = sum / samples.length;
      var want = avg > 28 ? 0 : (avg > 19 ? 1 : 2);
      if (!decided) { level = want; decided = true; }
      else if (want > level) { level = want; }
      root.setAttribute('data-q', String(level));
      samples = []; last = 0; rounds++;
      if (rounds < 3) window.requestAnimationFrame(tick);
    }
    window.requestAnimationFrame(tick);
  }

  /* ================= 兜底内容 =================
     两种情况会用到它：
       1) 直接双击 portal.html（file:// 协议）——浏览器禁止读取本地 XML
       2) portal.xml 取不到或解析失败
     有了它，任何情况下页面都有完整内容，不会停在"正在加载…"。 */
  function fallbackData() {
    return {
      title: '太清術院',
      subtitle: '一个免费且高质的術数学习平台',
      homeHero: { image: 'img/test.jpg', alt: '响马卦学习中枢' },
      aboutTitle: '关于我们',
      aboutSubtitle: '讲师与整理者',
      aboutHero: { image: 'img/test.jpg', alt: '响马卦学习中枢' },
      home: [
        { id: 'learn', title: '响马卦', subtitle: '东北派 · 西北派 · 两派对照',
          image: 'img/test.jpg', link: 'htdocs/index.html',
          desc: '两派学习路径分别拆解为若干阶段，从识牌、起卦、盘层、用神，到分类占、进阶技法、牌谱与实战，逐层推进。' },
        { id: 'quiz', title: '古法六爻', subtitle: '分阶小测 · 自检进度',
          image: 'img/test.jpg', link: 'lydocs/index.html',
          desc: '每阶段配小测，便于自检。答题提交后即可见得分与正确答案，进度自动保存在浏览器本地。' }
      ],
      about: [
        { name: '姜玄衣', avatar: 'img/test.jpg', role: '主讲师 · 作者',
          bio: '自癸卯始习响马卦，遍览前贤诸篇，后承明华师传，遍历东北西北两家民间诸派所传。',
          message: '愿学者循序而进，勿贪多求快。', contact: '', contactType: '' },
        { name: '明华', avatar: 'img/test.jpg', role: '师承 · 顾问',
          bio: '民间响马卦传承人。', message: '理法简易，举重若轻，四盘备立，遍推八门。',
          contact: '', contactType: '' }
      ]
    };
  }

  /* ================= 初始化 ================= */
  function init() {
    C.initTheme();
    C.initHamburger();
    initWeather();
    initNav();
    initMobileNav();

    /* 太极图标 → 返回主页 */
    var taiji = document.getElementById('taiji-home');
    if (taiji) {
      taiji.addEventListener('click', function (e) {
        e.preventDefault();
        goPage('home');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    /* hash 路由 */
    var hash = (location.hash || '').replace('#', '');
    if (hash === 'about') goPage('about');
    window.addEventListener('hashchange', function () {
      var h = (location.hash || '').replace('#', '');
      goPage(h === 'about' ? 'about' : 'home');
    });

    /* 加载配置：file:// 直开、或 portal.xml 取不到时改用内置兜底内容，
       保证任何环境下页面都有完整内容，不会停在"正在加载…" */
    var applied = false;
    function applyData(data) {
      if (applied) return;
      applied = true;

      /* ----- 主页 ----- */
      var titleEl = document.getElementById('portal-title');
      var subEl = document.getElementById('portal-subtitle');
      if (titleEl) titleEl.textContent = data.title;
      if (subEl) subEl.textContent = data.subtitle;
      document.title = data.title;
      applyHero(document.getElementById('home-hero'), data.homeHero);

      /* ----- 关于我们 ----- */
      var aboutTitleEl = document.getElementById('about-title');
      var aboutSubEl = document.getElementById('about-subtitle');
      if (aboutTitleEl) aboutTitleEl.textContent = data.aboutTitle;
      if (aboutSubEl) aboutSubEl.textContent = data.aboutSubtitle;
      applyHero(document.getElementById('about-hero'), data.aboutHero);

      /* ----- 渲染内容 ----- */
      renderHome(data.home);
      renderAbout(data.about);
    }
    function useFallback(why) {
      if (window.console && console.warn) console.warn('[portal] ' + why + ' → 已改用内置兜底内容');
      applyData(fallbackData());
    }

    /* file:// 直开时浏览器一律禁止读取本地 XML（CORS），直接用兜底内容 */
    if (location.protocol === 'file:') {
      useFallback('以 file:// 打开（浏览器禁止读取本地 portal.xml，改用 http 打开可读完整内容）');
      return;
    }

    C.loadXML('portal.xml').then(function (doc) {
      applyData(parsePortal(doc));
    }).catch(function (err) {
      useFallback('portal.xml 读取失败：' + (err && err.message ? err.message : err));
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
