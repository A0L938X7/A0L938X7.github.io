/* ============================================================
   首页：读取 learn.xml，渲染课程目录
   ============================================================ */
(function () {
  'use strict';
  var C = window.XMCommon;

  function renderToc(data) {
    var wrap = document.getElementById('toc-container');
    if (!wrap) return;
    wrap.innerHTML = '';
    var noteIndex = 0;

    data.folders.forEach(function (folder) {
      var group = document.createElement('div');
      group.className = 'toc-group';

      var title = document.createElement('div');
      title.className = 'toc-group-title';
      title.textContent = folder.name;
      group.appendChild(title);

      var ul = document.createElement('ul');
      ul.className = 'toc-list';

      folder.children.forEach(function (node) {
        if (node.type === 'folder') {
          var subLi = document.createElement('li');
          subLi.className = 'sub';
          subLi.innerHTML = '<span class="t"></span>';
          // 子文件夹标题
          var subTitle = document.createElement('li');
          subTitle.className = 'sub';
          subTitle.style.fontWeight = '600';
          subTitle.style.color = 'var(--text-3)';
          subTitle.textContent = '└ ' + node.name;
          ul.appendChild(subTitle);

          node.children.forEach(function (note) {
            if (note.type !== 'note') return;
            noteIndex++;
            var li = document.createElement('li');
            li.className = 'sub';
            var a = document.createElement('a');
            a.href = 'learn.html?note=' + encodeURIComponent(note.id);
            a.innerHTML = '<span class="t">' + C.escapeHtml(note.title) + '</span>';
            li.appendChild(a);
            ul.appendChild(li);
          });
        } else if (node.type === 'note') {
          noteIndex++;
          var li2 = document.createElement('li');
          var a2 = document.createElement('a');
          a2.href = 'learn.html?note=' + encodeURIComponent(node.id);
          a2.innerHTML = '<span class="idx">' + C.pad2(noteIndex) + '</span><span class="t">' +
                         C.escapeHtml(node.title) + '</span>';
          li2.appendChild(a2);
          ul.appendChild(li2);
        }
      });

      group.appendChild(ul);
      wrap.appendChild(group);
    });
  }

  function init() {
    C.initTheme();
    C.initHamburger();

    // 开始学习按钮
    var btn = document.getElementById('start-learning');
    if (btn) {
      btn.addEventListener('click', function () {
        location.href = 'learn.html';
      });
    }

    // 头像降级
    var img = document.querySelector('.instructor-avatar');
    if (img) {
      img.addEventListener('error', function () {
        img.style.display = 'none';
        var fb = img.nextElementSibling;
        if (fb) fb.style.display = 'flex';
      });
    }

    // 读取 XML
    var tocEl = document.getElementById('toc-container');
    if (tocEl) tocEl.innerHTML = '<div class="loading-tip">正在加载课程目录…</div>';

    C.loadXML('learn.xml').then(function (doc) {
      var data = C.parseCatalog(doc);
      renderToc(data);
      C.buildMobileNav('welcome', data, null, null);
    }).catch(function (err) {
      console.error(err);
      if (tocEl) tocEl.innerHTML = '<div class="loading-tip">课程目录加载失败：' +
        C.escapeHtml(err.message) + '</div>';
      C.buildMobileNav('welcome', null, null, null);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else { init(); }
})();