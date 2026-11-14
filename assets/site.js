/* ==========================================================================
   site.js · 独立仓库壳层
   --------------------------------------------------------------------------
   1. 依据页面 data-section 高亮顶栏当前栏目；
   2. 向 .container 末尾注入统一页脚（页面已自带 .site-footer 时跳过）。
   仓库根目录由本脚本自身的 URL 推导，项目页 /deductrium-walkthrough/ 子路径
   与自定义域名根路径都无需配置。
   ========================================================================== */
(function () {
    'use strict';

    var d = document;
    var script = d.currentScript;
    var root = script && script.src
        ? script.src.replace(/assets\/site\.js.*$/, '')
        : './';

    var section = d.body && d.body.getAttribute('data-section');
    if (!section) section = 'walkthrough';
    var active = d.querySelector('.site-nav__links a[data-nav="' + section + '"]');
    if (active) {
        active.classList.add('is-active');
        active.setAttribute('aria-current', 'page');
    }

    if (d.querySelector('.site-footer')) return;
    var container = d.querySelector('.container');
    if (!container) return;

    var REPO_URL = 'https://github.com/tabelog-lg/deductrium-walkthrough';
    var SITE_URL = 'https://tabelog-lg.github.io/deductrium/';
    var footer = d.createElement('footer');
    footer.className = 'site-footer';
    footer.innerHTML =
        '<span>© 2026 tabelog-lg · Deductrium 攻略存档</span>' +
        '<span class="site-footer__links">' +
        '<a href="' + root + 'index.html">存档主页</a>' +
        '<a href="' + root + 'index.html#docs">文档中心</a>' +
        '<a href="' + SITE_URL + '" target="_blank" rel="noopener">Deductrium 主站 ↗</a>' +
        '<a href="' + REPO_URL + '" target="_blank" rel="noopener">GitHub ↗</a>' +
        '</span>';
    container.appendChild(footer);
})();
