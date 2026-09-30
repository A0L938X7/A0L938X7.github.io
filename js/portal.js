/* ============================================================
   主门户：读取 portal.xml，渲染卡片与成员，处理主页/关于路由
   ============================================================ */
(function () {
  'use strict';
  var C = window.XMCommon;

  /* ================= 加载 portal.xml ================= */
  function loadPortalXML() {
    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open('GET', 'portal.xml', true);
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

  /* ================= 解析 ================= */
  function parsePortal(doc) {
    var root = doc.documentElement;

    var title = root.getAttribute('title') || '响马卦 · 学习中枢';
    var subtitle = root.getAttribute('subtitle') || '';

    var home = [];
    var homeEl = root.querySelector('home');
    if (homeEl) {
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

    var about = [];
    var aboutEl = root.querySelector('about');
    if (aboutEl) {
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

    return { title: title, subtitle: subtitle, home: home, about: about };
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

    /* 未开放：锁 + 角标 */
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

    /* ----- 展开区（描述 + 进入按钮） ----- */
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
          // 让浏览器原生跳转（不带 target，当前页跳转）
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
        if (C.toast) C.toast('此内容尚未开放');
        return;
      }
      // 若可展开内容，切换展开状态
      if (el.querySelector('.card-expand')) {
        if (el.classList.contains('expanded')) {
          el.classList.remove('expanded');
        } else {
          // 收起其他展开的卡片
          document.querySelectorAll('.portal-card.expanded').forEach(function (c) {
            c.classList.remove('expanded');
          });
          el.classList.add('expanded');
        }
      } else {
        // 无描述内容，直接跳转
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

    /* 头像 */
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
          C.escapeHtml(fallbackText) +
          '</div>';
      };
      avatarWrap.appendChild(img);
    } else {
      avatarWrap.innerHTML =
        '<div class="member-avatar-fallback">' +
        C.escapeHtml(fallbackText) +
        '</div>';
    }
    el.appendChild(avatarWrap);

    /* 内容 */
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

  /* ================= 路由：主页 / 关于我们 ================= */
  function goPage(page) {
    document.querySelectorAll('.page').forEach(function (p) {
      p.classList.remove('active');
    });
    var el = document.getElementById('page-' + page);
    if (el) el.classList.add('active');

    document.querySelectorAll('.navbar a[data-page]').forEach(function (a) {
      a.classList.toggle('active', a.dataset.page === page);
    });

    if (history.replaceState) {
      if (page === 'home') {
        history.replaceState(null, '', 'portal.html');
      } else {
        history.replaceState(null, '', 'portal.html#' + page);
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
    var items = [
      { label: '主页', page: 'home' },
      { label: '关于我们', page: 'about' }
    ];
    items.forEach(function (item) {
      var btn = document.createElement('button');
      btn.className = 'mobile-nav-item';
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

  /* ================= 初始化 ================= */
  function init() {
    C.initTheme();
    C.initHamburger();
    initNav();
    initMobileNav();

    /* 太极图标点击返回主页 */
    var taijiLink = document.querySelector('.taiji-link');
    if (taijiLink) {
      taijiLink.addEventListener('click', function (e) {
        e.preventDefault();
        goPage('home');
      });
    }

    /* 从 hash 判断初始页 */
    var hash = (location.hash || '').replace('#', '');
    if (hash === 'about') {
      goPage('about');
    }

    /* 加载配置 */
    loadPortalXML().then(function (doc) {
      var data = parsePortal(doc);

      // 更新标题
      var titleEl = document.getElementById('portal-title');
      var subEl = document.getElementById('portal-subtitle');
      if (titleEl) titleEl.textContent = data.title;
      if (subEl) subEl.textContent = data.subtitle;
      document.title = data.title;

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