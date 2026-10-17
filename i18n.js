/**
 * i18n.js — 站点多语言运行时（无构建步骤，纯静态）
 *
 * 职责：
 *   1) 判定并记忆当前语言：localStorage['qr-lang']，首次访问按浏览器语言，兜底 zh-CN
 *   2) 拉取 locales/i18n.json，按 HTML 上的声明式标记渲染静态文案
 *   3) 自动注入语言切换器：桌面端（>=640px）为导航栏胶囊下拉；
 *      移动端（<640px）改为抽屉 #mobileNav 内（或页面预留的 #langSwitchMobile）的语言胶囊行，
 *      避免在移动端导航栏里挤入带文字的按钮导致整行错乱
 *   4) 向 app.js / 各页内联脚本暴露 QRi18n.t() / QRi18n.resources() / QRi18n.aliasGroups() / QRi18n.ready
 *
 * HTML 标记约定：
 *   data-i18n="key"                  → 替换 textContent
 *   data-i18n-html="key"             → 替换 innerHTML（支持 \n 换行、{hint}/{n} 占位符）
 *   data-i18n-attr="attr=key;attr2=key2" → 替换属性（placeholder / aria-label / content 等）
 *
 * 切换语言采用整页 reload：保证静态文案与 JS 渲染内容一并更新，且跨页面持久。
 */
(function () {
  'use strict';

  // 语言清单：label / short 为语言自身的写法，不参与翻译
  var LANGS = [
    { code: 'zh-CN', label: '简体中文', short: '中文' },
    { code: 'en', label: 'English', short: 'EN' },
    { code: 'ja', label: '日本語', short: '日本語' },
    { code: 'ko', label: '한국어', short: '한국어' }
  ];

  // 切换器无障碍标签：按当前语言给出，避免硬编码中文
  var LANG_ARIA = {
    'zh-CN': '切换语言', en: 'Change language', ja: '言語を切り替え', ko: '언어 변경'
  };

  var STORAGE_KEY = 'qr-lang';
  var FALLBACK = 'zh-CN';
  var PACK_URL = 'locales/i18n.json';

  var pack = null;      // 完整 i18n.json
  var lang = FALLBACK;  // 当前语言
  var dict = {};        // 当前语言文案表
  var zhDict = {};      // 中文兜底表

  var readyResolve;
  var readyPromise = new Promise(function (resolve) { readyResolve = resolve; });

  // ---- 语言判定 ----
  function normalize(code) {
    if (!code) return null;
    var c = String(code).toLowerCase();
    if (c.indexOf('zh') === 0) return 'zh-CN';
    if (c.indexOf('ja') === 0) return 'ja';
    if (c.indexOf('ko') === 0) return 'ko';
    if (c.indexOf('en') === 0) return 'en';
    return null;
  }

  function readStored() {
    try { return normalize(window.localStorage.getItem(STORAGE_KEY)); } catch (e) { return null; }
  }

  function readNavigator() {
    var list = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language];
    for (var i = 0; i < list.length; i++) {
      var n = normalize(list[i]);
      if (n) return n;
    }
    return null;
  }

  function detect() { return readStored() || readNavigator() || FALLBACK; }

  function lookupLang(code) {
    for (var i = 0; i < LANGS.length; i++) if (LANGS[i].code === code) return LANGS[i];
    return LANGS[0];
  }

  // ---- 取值与插值 ----
  function has(obj, key) { return !!obj && Object.prototype.hasOwnProperty.call(obj, key); }

  function pick(table, key) {
    if (has(table, key)) return table[key];
    if (has(zhDict, key)) return zhDict[key];
    return null;
  }

  function interpolate(str, vars) {
    if (!vars) return str;
    return String(str).replace(/\{(\w+)\}/g, function (m, k) {
      return has(vars, k) ? String(vars[k]) : m;
    });
  }

  /** 取当前语言文案；缺失时回退中文，再缺失返回空串 */
  function t(key, vars) {
    var v = pick(dict, key);
    if (v == null) return '';
    return interpolate(v, vars);
  }

  function escapeHtml(str) {
    return String(str == null ? '' : str).replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function resourceCount() { return (window.QUEER_RESOURCES || []).length; }

  /** 富文本渲染：把 {hint}/{n} 还原为带 id 的 span，把 \n 转为 <br/> */
  function richHtml(value) {
    var html = escapeHtml(value);
    var count = resourceCount();
    html = html.replace(/\{hint\}/g,
      '<span id="heroResourceHint">' + escapeHtml(t('app.count.heroHint', { n: count })) + '</span>');
    html = html.replace(/\{n\}/g, '<span id="totalCount">' + count + '</span>');
    html = html.replace(/\n/g, '<br/>');
    return html;
  }

  /**
   * data-i18n-code="cmd:pre;file:code" → 把文案里的 {cmd}/{file} 换回元素内对应子节点
   * （保留子节点的标签与 class，内容重新转义），用于「文字 + 代码片段」混排的条目
   */
  function applyCodeTokens(el, html) {
    var spec = el.getAttribute('data-i18n-code');
    if (!spec) return html;
    spec.split(';').forEach(function (pair) {
      var p = pair.split(':');
      if (p.length !== 2) return;
      var node = el.querySelector(p[1].trim());
      if (!node) return;
      var tag = node.tagName.toLowerCase();
      var cls = node.getAttribute('class');
      var inner = '<' + tag + (cls ? ' class="' + escapeHtml(cls) + '"' : '') + '>' +
        escapeHtml(node.textContent) + '</' + tag + '>';
      html = html.split('{' + p[0].trim() + '}').join(inner);
    });
    return html;
  }

  // ---- DOM 渲染 ----
  function applyTo(root) {
    root = root || document;

    root.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = pick(dict, el.getAttribute('data-i18n'));
      if (v != null) el.textContent = v;
    });

    root.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      var v = pick(dict, el.getAttribute('data-i18n-html'));
      if (v != null) el.innerHTML = applyCodeTokens(el, richHtml(v));
    });

    root.querySelectorAll('[data-i18n-attr]').forEach(function (el) {
      el.getAttribute('data-i18n-attr').split(';').forEach(function (pair) {
        var p = pair.split('=');
        if (p.length !== 2) return;
        var v = pick(dict, p[1].trim());
        if (v != null) el.setAttribute(p[0].trim(), v);
      });
    });
  }

  // ---- 供 app.js 使用的数据 ----
  /** 当前语言的资源条目：以 resources.js 为骨架，按索引套用译文 */
  function resources() {
    var base = window.QUEER_RESOURCES || [];
    if (!base.length) return base;
    var table = pack && pack.resources;
    if (!table) return base;
    var arr = table[lang] && table[lang].length ? table[lang] : (table[FALLBACK] || []);
    if (!arr.length) return base;
    var out = [];
    for (var i = 0; i < base.length; i++) {
      var src = base[i] || {};
      var tr = arr[i] || {};
      out.push({
        name: tr.name || src.name,
        type: tr.type || src.type,
        location: tr.location || src.location,
        note: tr.note || src.note,
        section: tr.section || src.section,
        subsection: tr.subsection || src.subsection,
        tags: (tr.tags && tr.tags.length) ? tr.tags : (src.tags || []),
        // 以下字段与语言无关，直接沿用 resources.js
        url: src.url,
        categories: src.categories,
        region: src.region,
        typeKey: src.typeKey,
        // 风险提示判断基于中文原文，避免译文措辞差异导致漏判
        noteRaw: src.note
      });
    }
    return out;
  }

  /** 当前语言的搜索同义词分组；缺失时返回 null（调用方回退内置中文表） */
  function aliasGroups() {
    if (!pack || !pack.searchAliases) return null;
    var table = pack.searchAliases[lang] || pack.searchAliases[FALLBACK];
    if (!table) return null;
    var groups = [];
    Object.keys(table).forEach(function (k) {
      var g = table[k];
      if (g && g.aliases && g.targets) groups.push({ aliases: g.aliases, targets: g.targets });
    });
    return groups.length ? groups : null;
  }

  // ---- 语言切换器（自动注入导航栏） ----
  var CHEVRON = '<svg aria-hidden="true" class="hidden sm:block w-3 h-3 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>';
  var GLOBE = '<svg aria-hidden="true" class="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.4 2.6 3.6 5.6 3.6 9s-1.2 6.4-3.6 9c-2.4-2.6-3.6-5.6-3.6-9s1.2-6.4 3.6-9z"/></svg>';
  var CHECK = '<svg aria-hidden="true" class="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 13 4 4L19 7"/></svg>';

  function menuItemsHtml() {
    return LANGS.map(function (l) {
      var on = l.code === lang;
      return '<button type="button" role="menuitemradio" aria-checked="' + (on ? 'true' : 'false') +
        '" data-lang="' + l.code + '" class="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center justify-between gap-2 ' +
        (on ? 'text-blue-600 dark:text-[#7AA5FF] bg-blue-50/90 dark:bg-white/10' : 'text-slate-700 dark:text-slate-200 hover:bg-blue-50/90 dark:hover:bg-white/10') +
        '"><span>' + l.label + '</span>' + (on ? CHECK : '') + '</button>';
    }).join('');
  }

  function closeMenu() {
    var menu = document.getElementById('langMenu');
    var btn = document.getElementById('langBtn');
    if (menu) menu.classList.add('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'false');
  }

  function openMenu() {
    var menu = document.getElementById('langMenu');
    var btn = document.getElementById('langBtn');
    if (menu) menu.classList.remove('hidden');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }

  function setLang(code) {
    code = normalize(code) || FALLBACK;
    if (code === lang) { closeMenu(); return; }
    try { window.localStorage.setItem(STORAGE_KEY, code); } catch (e) { /* ignore */ }
    lang = code;
    // 整页 reload：静态文案 + JS 渲染内容一并刷新
    window.location.reload();
  }

  /** 移动端语言胶囊行（横排，超窄屏自动折行兜底） */
  function langChipsHtml() {
    return LANGS.map(function (l) {
      var on = l.code === lang;
      return '<button type="button" data-lang="' + l.code + '" aria-pressed="' + (on ? 'true' : 'false') + '"' +
        ' class="px-2.5 py-1 rounded-full border text-xs font-semibold whitespace-nowrap transition-colors ' +
        (on
          ? 'border-blue-500/40 bg-blue-50/90 dark:bg-white/10 text-blue-600 dark:text-[#7AA5FF]'
          : 'border-slate-200/80 dark:border-white/10 bg-white/70 dark:bg-white/5 text-slate-600 dark:text-slate-300') +
        '">' + l.short + '</button>';
    }).join('');
  }

  /** 移动端语言入口：优先挂进移动端导航抽屉，其次挂进页面预留的 #langSwitchMobile */
  function installMobileSwitcher() {
    var box = document.getElementById('langSwitchMobile');
    if (!box) {
      var drawer = document.getElementById('mobileNav');
      if (!drawer) return; // 没有移动端导航容器则不注入，避免继续挤压导航栏
      box = document.createElement('div');
      box.id = 'langSwitchMobile';
      box.className = 'sm:hidden px-4 pt-1 pb-3';
      drawer.appendChild(box);
    }
    box.innerHTML =
      '<div class="flex flex-wrap items-center gap-1.5" role="group" aria-label="' +
        escapeHtml(LANG_ARIA[lang] || LANG_ARIA[FALLBACK]) + '">' +
        '<span aria-hidden="true" class="mr-0.5 inline-flex items-center text-slate-400 dark:text-slate-500">' + GLOBE + '</span>' +
        langChipsHtml() +
      '</div>';
    box.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('[data-lang]') : null;
      if (item) { e.preventDefault(); setLang(item.getAttribute('data-lang')); }
    });
  }

  function installSwitcher() {
    if (document.getElementById('langSwitch')) return;

    var wrap = document.createElement('div');
    wrap.id = 'langSwitch';
    // 移动端（<640px）隐藏桌面胶囊，改用 langChipsHtml() 注入的语言胶囊行
    wrap.className = 'relative shrink-0 hidden sm:block';
    wrap.innerHTML =
      '<button type="button" id="langBtn" aria-haspopup="true" aria-expanded="false" aria-label="' +
        escapeHtml(LANG_ARIA[lang] || LANG_ARIA[FALLBACK]) +
        '" class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-transparent text-slate-600 dark:text-slate-300 hover:bg-white/80 dark:hover:bg-white/10 hover:border-white/80 dark:hover:border-white/10 transition-all shrink-0 text-xs font-semibold whitespace-nowrap">' +
        GLOBE +
        '<span id="langCurrentLabel">' + lookupLang(lang).short + '</span>' +
        CHEVRON +
      '</button>' +
      '<div id="langMenu" role="menu" aria-label="' + escapeHtml(LANG_ARIA[lang] || LANG_ARIA[FALLBACK]) +
        '" class="hidden absolute right-0 top-full mt-2 w-36 z-[60] rounded-2xl border border-white/90 dark:border-white/10 bg-white/85 dark:bg-[rgba(30,30,35,0.92)] backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.10)] p-1">' +
        menuItemsHtml() +
      '</div>';

    var anchor = document.getElementById('themeToggleBtn');
    if (anchor && anchor.parentNode) {
      anchor.parentNode.insertBefore(wrap, anchor);
    } else {
      var host = document.querySelector('header') || document.body;
      host.appendChild(wrap);
      wrap.classList.add('mr-2');
    }

    var btn = document.getElementById('langBtn');
    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      var menu = document.getElementById('langMenu');
      if (menu && menu.classList.contains('hidden')) openMenu(); else closeMenu();
    });

    wrap.addEventListener('click', function (e) {
      var item = e.target.closest ? e.target.closest('[data-lang]') : null;
      if (item) { e.preventDefault(); setLang(item.getAttribute('data-lang')); }
    });

    document.addEventListener('click', function (e) {
      if (!wrap.contains(e.target)) closeMenu();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') closeMenu();
    });
  }

  // ---- 启动 ----
  function loadPack() {
    if (typeof window.fetch !== 'function') return Promise.resolve();
    return window.fetch(PACK_URL)
      .then(function (res) {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.json();
      })
      .then(function (json) {
        pack = json;
        dict = (pack[lang] && typeof pack[lang] === 'object') ? pack[lang] : {};
        zhDict = (pack[FALLBACK] && typeof pack[FALLBACK] === 'object') ? pack[FALLBACK] : {};
      })
      .catch(function () { pack = null; });
  }

  function boot() {
    lang = detect();
    installSwitcher();
    installMobileSwitcher();
    document.documentElement.setAttribute('lang', lang);
    loadPack().then(function () {
      // fetch 失败时 dict 为空 → applyTo 无操作，页面保留中文原文；ready 仍会 resolve，站点照常可用
      applyTo(document);
      document.documentElement.setAttribute('lang', lang);
      readyResolve();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  window.QRi18n = {
    ready: readyPromise,
    langs: LANGS,
    t: t,
    resources: resources,
    aliasGroups: aliasGroups,
    apply: function () { applyTo(document); },
    get lang() { return lang; }
  };
})();
