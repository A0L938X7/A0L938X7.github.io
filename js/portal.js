/* ============================================================
   门户主逻辑：读取 portal.xml，渲染卡片 / 成员 / Hero，处理路由
   ============================================================ */
(function () {
  'use strict';
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
        bg.style.backgroundImage = 'url("' + heroData.image.replace(/"/g, '\\"') + '")';
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

  /* ================= 雨幕 / 云雾（纯装饰，独立于页面部件） ================= */
  function initStorm() {
    var cv = document.getElementById('storm-rain');
    if (!cv || !cv.getContext) return;
    var ctx = cv.getContext('2d', { alpha: true, desynchronized: true });

    /* 自适应画质：按实测帧时间分三档（2 高 / 1 中 / 0 低）。
       低档减少雨量与雾量，并通过 html[data-q="0"] 让 CSS 砍掉一层云，
       这样在弱机/软件渲染上也能保住动感而不是掉到个位数帧率。 */
    var quality = { level: 2, sum: 0, n: 0, cool: 0 };
    function qMul() { return quality.level === 2 ? 1 : (quality.level === 1 ? .62 : .36); }

    var BUCKETS = 8;                         // 雨丝按透明度分 8 档批量绘制
    var BUCKET_ALPHA = (function () {
      var out = [];
      for (var i = 0; i < BUCKETS; i++) out.push(.07 + (.30 - .07) * (i + .5) / BUCKETS);
      return out;
    })();
    var bucketList = (function () {
      var out = [];
      for (var i = 0; i < BUCKETS; i++) out.push([]);
      return out;
    })();
    function bucketOf(a) {
      var b = Math.floor((a - .07) / ((.30 - .07) / BUCKETS));
      return b < 0 ? 0 : (b >= BUCKETS ? BUCKETS - 1 : b);
    }

    var reduce = false;
    try {
      reduce = !!(window.matchMedia &&
        window.matchMedia('(prefers-reduced-motion: reduce)').matches);
    } catch (e) {}

    var W = 0, H = 0, dpr = 1, raf = null, last = 0, running = false;
    var drops = [], mists = [];
    var SLANT = 0.15;                        // 雨丝斜度

    function rnd(a, b) { return a + Math.random() * (b - a); }

    /* 预渲染一根雨丝（渐变 + 斜度），逐帧只做 drawImage */
    var sprite = document.createElement('canvas');
    sprite.width = 10; sprite.height = 180;
    (function () {
      var sc = sprite.getContext('2d');
      var g = sc.createLinearGradient(0, 0, 0, 180);
      g.addColorStop(0, 'rgba(255,255,255,0)');
      g.addColorStop(.45, 'rgba(255,255,255,.42)');
      g.addColorStop(1, 'rgba(255,255,255,.95)');
      sc.fillStyle = g;
      sc.beginPath();
      sc.moveTo(8.4, 0); sc.lineTo(9.6, 0); sc.lineTo(1.6, 180); sc.lineTo(.4, 180);
      sc.closePath(); sc.fill();
    })();

    /* 雾贴图：十几处错落柔斑叠成（不是正圆）；再预渲染几款转向，避免逐帧旋转 */
    var mistSprite = document.createElement('canvas');
    mistSprite.width = mistSprite.height = 256;
    (function () {
      var mc = mistSprite.getContext('2d');
      for (var i = 0; i < 11; i++) {
        var mx = rnd(58, 198), my = rnd(58, 198), mr = rnd(44, 116);
        var mg = mc.createRadialGradient(mx, my, 0, mx, my, mr);
        mg.addColorStop(0, 'rgba(242,242,242,.19)');
        mg.addColorStop(.6, 'rgba(242,242,242,.08)');
        mg.addColorStop(1, 'rgba(242,242,242,0)');
        mc.fillStyle = mg;
        mc.beginPath();
        mc.arc(mx, my, mr, 0, Math.PI * 2);
        mc.fill();
      }
    })();
    var MIST_VARIANTS = 5;
    var mistPics = [];
    for (var mv = 0; mv < MIST_VARIANTS; mv++) {
      var mcv = document.createElement('canvas');
      mcv.width = mcv.height = 256;
      var mcx = mcv.getContext('2d');
      mcx.translate(128, 128);
      mcx.rotate(mv * Math.PI * 2 / MIST_VARIANTS);
      mcx.scale(1 - mv * 0.02, 1 + mv * 0.02);
      mcx.drawImage(mistSprite, -128, -128);
      mistPics.push(mcv);
    }

    function newDrop(seed) {
      var a = rnd(.07, .30);
      return {
        x: rnd(-.12, 1.12) * W,
        y: seed ? rnd(-1, 1) * H : rnd(-.3, -.02) * H,
        len: rnd(34, 120),                   // 雨丝更短（速度提上来后靠拖影读动感）
        spd: rnd(1150, 2200),                // 下落更快
        alpha: a,
        b: bucketOf(a),                      // 预分桶：绘制时按桶批量切 globalAlpha
        w: rnd(3.0, 7.0)
      };
    }
    function newMist(seed) {
      return {
        x: rnd(0, 1) * W,
        y: seed ? rnd(-.15, 1) * H : rnd(1.02, 1.34) * H,
        r: rnd(150, 400),                    // 单片更小 → 全屏重复覆盖面积大幅下降
        spd: rnd(34, 90),                    // px/s，自下而上（明显更快）
        alpha: rnd(.034, .086),
        wob: rnd(0, Math.PI * 2),
        ws: rnd(.05, .16),
        v: Math.floor(Math.random() * MIST_VARIANTS)
      };
    }

    function build() {
      var mul = qMul();
      var n = Math.round(Math.min(700, Math.max(120, W * H / 5200 * mul)));
      drops = [];
      for (var i = 0; i < n; i++) drops.push(newDrop(true));
      var m = Math.round(Math.min(12, Math.max(3, W / 200 * mul)));   // 雾团数量按档位缩放
      mists = [];
      for (var j = 0; j < m; j++) mists.push(newMist(true));
    }

    /* 每帧累计，定期评估：慢则降档（减雨雾 + 砍一层云），快则逐级恢复 */
    function tuneQuality(dt) {
      quality.sum += dt; quality.n++;
      if (quality.cool > 0) quality.cool--;
      if (quality.n < 24) return;
      var avg = quality.sum / quality.n;
      quality.sum = 0; quality.n = 0;
      var lv = quality.level;
      if (avg > 0.028 && lv > 0) quality.level = lv - 1;
      else if (avg < 0.016 && lv < 2 && quality.cool === 0) quality.level = lv + 1;
      if (quality.level !== lv) {
        quality.cool = (quality.level < lv) ? 120 : 240;
        document.documentElement.setAttribute('data-q', String(quality.level));
        build();
        paint(0);
      }
    }

    function paint(dt) {
      ctx.clearRect(0, 0, W, H);

      /* 云雾：向上漂浮（贴图已是预旋转的几款，绘制时不再逐帧做变换） */
      for (var i = 0; i < mists.length; i++) {
        var m = mists[i];
        m.y -= m.spd * dt;
        m.wob += m.ws * dt;
        if (m.y + m.r < -60) { mists[i] = newMist(false); continue; }
        var mx = m.x + Math.sin(m.wob) * 28;
        ctx.globalAlpha = Math.min(1, m.alpha * 1.7 * (0.85 + 0.3 * Math.sin(m.wob)));
        ctx.drawImage(mistPics[m.v], mx - m.r, m.y - m.r, m.r * 2, m.r * 2);
      }

      /* 雨丝：先推进，再按透明度分桶批量绘制（每桶只切一次 globalAlpha） */
      for (var b = 0; b < BUCKETS; b++) bucketList[b].length = 0;
      for (var k = 0; k < drops.length; k++) {
        var d = drops[k];
        d.y += d.spd * dt;
        if (d.y - d.len > H + 30) { drops[k] = newDrop(false); continue; }
        d.x += d.spd * dt * SLANT * .35;
        d.dx = d.x - d.len * SLANT;
        d.dy = d.y - d.len;
        bucketList[d.b].push(d);
      }
      for (var bi = 0; bi < BUCKETS; bi++) {
        var list = bucketList[bi];
        if (!list.length) continue;
        ctx.globalAlpha = BUCKET_ALPHA[bi];
        for (var q = 0; q < list.length; q++) {
          var dd = list[q];
          ctx.drawImage(sprite, dd.dx, dd.dy, dd.w, dd.len);
        }
      }
      ctx.globalAlpha = 1;
    }

    function frame(ts) {
      if (!running) return;
      if (!last) last = ts;
      var dt = Math.min(.05, (ts - last) / 1000);
      last = ts;
      paint(dt);
      tuneQuality(dt);
      raf = window.requestAnimationFrame(frame);
    }
    function start() {
      if (running) return;
      running = true; last = 0;
      raf = window.requestAnimationFrame(frame);
    }
    function stop() {
      running = false;
      if (raf) { window.cancelAnimationFrame(raf); raf = null; }
    }

    function resize() {
      /* 尺寸以画布元素自身的实际盒子为准（不要用 window.innerHeight：
         首屏布局时它可能与元素不符，会把画布钉在错误高度，雨幕就会断一条线） */
      var rect = cv.getBoundingClientRect();
      W = Math.max(1, Math.round(rect.width));
      H = Math.max(1, Math.round(rect.height));
      dpr = Math.min(window.devicePixelRatio || 1, 1.25);   // 雨雾本就柔和，1.25 足够且省下约 30% 填充
      cv.width = Math.round(W * dpr);
      cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      build();
      paint(0);
    }

    resize();
    document.documentElement.setAttribute('data-q', String(quality.level));
    if (reduce) { paint(0); return; }         // 尊重"减少动态"：只留一帧静景
    start();

    /* 视口/元素尺寸变化时重新贴合（含首屏布局完成后的那次修正） */
    if (window.ResizeObserver) {
      new ResizeObserver(function () { resize(); }).observe(cv);
    }
    var rt = null;
    window.addEventListener('resize', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 180);
    });
    window.addEventListener('orientationchange', function () {
      clearTimeout(rt);
      rt = setTimeout(resize, 240);
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden) stop(); else start();
    });
    window.addEventListener('pagehide', stop);
  }

  /* ================= 初始化 ================= */
  function init() {
    C.initTheme();
    C.initHamburger();
    initStorm();
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

    /* 加载配置 */
    C.loadXML('portal.xml').then(function (doc) {
      var data = parsePortal(doc);

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
    }).catch(function (err) {
      console.error(err);
      var grid = document.getElementById('home-grid');
      if (grid) {
        grid.innerHTML = '<div class="portal-loading">加载失败：' +
          C.escapeHtml(err.message) + '</div>';
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();
