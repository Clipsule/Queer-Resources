(function () {
  'use strict';

  // ---- 常量 ----
  const TAG_STYLES = [
    'bg-pink-100/80 text-pink-700 border-pink-200/70',
    'bg-blue-100/80 text-blue-700 border-blue-200/70',
    'bg-emerald-100/80 text-emerald-800 border-emerald-200/70',
    'bg-purple-100/80 text-purple-700 border-purple-200/70',
    'bg-indigo-100/80 text-indigo-700 border-indigo-200/70',
    'bg-rose-100/80 text-rose-700 border-rose-200/70',
    'bg-amber-100/80 text-amber-800 border-amber-200/70'
  ];

  const REGION_LABEL = { cn: '中国大陆', tw: '中国台湾', hk: '中国香港', intl: '国际/其他', all: '全部' };
  const REPO_URL = 'https://github.com/Clipsule/Queer-Resources';

  // ---- 安全的 localStorage 包装 ----
  const storage = {
    get(key) { try { return window.localStorage.getItem(key); } catch (e) { return null; } },
    set(key, val) { try { window.localStorage.setItem(key, val); } catch (e) { /* ignore */ } }
  };

  // ---- 状态 ----
  const state = {
    category: 'all',
    type: 'all',
    region: 'all',
    query: ''
  };

  let fullGridRendered = false;
  let allCards = null; // 缓存的 cards NodeList

  // ---- 工具函数 ----
  function debounce(fn, ms) {
    let t;
    return function () {
      clearTimeout(t);
      const args = arguments;
      const ctx = this;
      t = setTimeout(function () { fn.apply(ctx, args); }, ms);
    };
  }

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (ch) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch];
    });
  }

  function safeUrl(url) {
    if (!url) return '';
    if (url.startsWith('tel:')) {
      const rest = url.substring(4);
      if (/^[0-9+\-()\s]+$/.test(rest)) return url;
      return '';
    }
    if (url.startsWith('mailto:')) {
      const rest = url.substring(7);
      if (/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(rest.split('?')[0])) return url;
      return '';
    }
    try {
      const parsed = new URL(url);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') return parsed.href;
    } catch (e) { /* ignore */ }
    return '';
  }

  // ---- URL hash 同步 ----
  function buildHash() {
    const parts = [];
    if (state.category !== 'all') parts.push('cat=' + encodeURIComponent(state.category));
    if (state.type !== 'all') parts.push('type=' + encodeURIComponent(state.type));
    if (state.region !== 'all') parts.push('reg=' + encodeURIComponent(state.region));
    if (state.query) parts.push('q=' + encodeURIComponent(state.query));
    return parts.length ? '#/?' + parts.join('&') : '';
  }

  function parseHash() {
    const hash = window.location.hash;
    const m = hash.match(/^#\/\?(.*)$/);
    if (!m) return null;
    try {
      const params = new URLSearchParams(m[1]);
      return {
        category: params.get('cat') || 'all',
        type: params.get('type') || 'all',
        region: params.get('reg') || 'all',
        query: params.get('q') || ''
      };
    } catch (e) { return null; }
  }

  function syncUrl() {
    const hash = buildHash();
    if (window.location.hash !== hash) {
      try { history.replaceState(null, '', hash || window.location.pathname + window.location.search); } catch (e) { /* ignore */ }
    }
  }

  // ---- 卡片渲染 ----
  function primaryCat(item) { return (item.categories && item.categories[0]) || 'wiki'; }

  const CATEGORY_ACCENT = {
    wiki: 'border-blue-100/80 text-blue-700', identity: 'border-pink-100/80 text-pink-700',
    orientation: 'border-purple-100/80 text-purple-700', medical: 'border-indigo-100/80 text-indigo-700',
    crisis: 'border-rose-100/80 text-rose-700', legal: 'border-violet-100/80 text-purple-700',
    youth: 'border-emerald-100/80 text-emerald-800', voice: 'border-fuchsia-100/80 text-fuchsia-700',
    workplace: 'border-sky-100/80 text-sky-700', community: 'border-amber-100/80 text-amber-800',
    safety: 'border-slate-200/80 text-slate-700', housing: 'border-teal-100/80 text-teal-800',
    violence: 'border-orange-100/80 text-orange-800'
  };

  /**
   * 渲染单张资源卡片
   * @param {Object} item - resources.js 条目
   * @param {string} uid - 唯一 id 如 "0-3" 或 "f-1"
   */
  function cardHtml(item, uid) {
    const href = safeUrl(item.url);
    if (!href) return '';
    const cat = primaryCat(item);
    const accent = CATEGORY_ACCENT[cat] || CATEGORY_ACCENT.wiki;
    const tags = (item.tags || []).slice(0, 3);
    const risk = /风险|减害|不替代|待核验|商业/.test(item.note || '');
    const tagHtml = tags.map(function (tag, i) {
      return '<span class="px-2.5 py-1 rounded-full text-xs font-bold border ' + TAG_STYLES[i % TAG_STYLES.length] + '">' + escapeHtml(tag) + '</span>';
    }).join('');
    const locHtml = item.location
      ? '<span class="px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100/90 text-slate-600">' + escapeHtml(item.location) + '</span>'
      : '';
    const id = 'item-' + uid;

    return (
      // position: relative 为 stretched link 建立定位上下文
      '<article class="glass-card-pro p-7 md:p-8 flex flex-col justify-between group relative min-h-[280px]" id="' + id + '" aria-labelledby="' + id + '-title" data-category="' +
      escapeHtml((item.categories || []).join(' ')) + '" data-region="' + escapeHtml(item.region || 'intl') +
      '" data-type="' + escapeHtml(item.typeKey || 'ngo') + '" data-search="' +
      escapeHtml([item.name, item.type, item.location, item.note, item.section, item.subsection].concat(item.tags || []).join(' ').toLowerCase()) +
      '">' +
        // stretched link：覆盖整卡的主点击入口（z-10，高于背景但低于需要独立点击的子元素）
        '<a class="absolute inset-0 z-10 rounded-3xl cursor-pointer" aria-label="访问 ' + escapeHtml(item.name) + ' 的官网" href="' + escapeHtml(href) + '" rel="noopener noreferrer" target="_blank"></a>' +
        // 内容层：pointer-events-none 让点击穿透到 stretched link；只有真正独立的交互元素才恢复 pointer-events-auto
        '<div class="relative z-20 flex flex-col justify-between flex-1 pointer-events-none">' +
          '<div>' +
            '<div class="flex flex-wrap items-center gap-2 mb-3.5">' + tagHtml + locHtml + '</div>' +
            '<div class="mb-2.5">' +
              '<h3 class="text-xl font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug" id="' + id + '-title">' + escapeHtml(item.name) + '</h3>' +
            '</div>' +
            '<p class="text-sm text-slate-600 leading-relaxed mb-5 font-normal">' + escapeHtml(item.type || '') + (item.subsection ? ' · ' + escapeHtml(item.subsection) : '') + '</p>' +
            '<div class="p-3.5 rounded-2xl bg-white/70 border text-xs text-slate-600 leading-relaxed ' + (risk ? 'border-amber-200/90' : accent.split(' ')[0]) + '">' +
              '<div class="flex items-center gap-1.5 font-bold mb-1 ' + (risk ? 'text-amber-800' : accent.split(' ')[1]) + '">' +
                '<span aria-hidden="true" class="material-symbols-outlined text-base">' + (risk ? 'warning' : 'info') + '</span>' +
                '<span>' + (risk ? '风险提示' : '说明') + '</span>' +
              '</div>' + escapeHtml(item.note || '请以机构官网最新说明为准。') +
            '</div>' +
          '</div>' +
          '<div class="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between text-xs text-slate-500 font-medium gap-3">' +
            '<span class="truncate">' + escapeHtml(item.location || '') + '</span>' +
            '<span class="text-blue-600 font-bold group-hover:underline">打开官网 →</span>' +
          '</div>' +
        '</div>' +
      '</article>'
    );
  }

  /**
   * 渲染危机热线卡片：统一为"名称 + 地区 + 访问官网"，phone 字段待 parse_resources.py 完善
   */
  function crisisCardHtml(item) {
    const href = safeUrl(item.url);
    if (!href) return '';
    const name = escapeHtml(item.name || '');
    const loc = escapeHtml(item.location || '');
    return (
      '<div class="p-4 rounded-xl bg-white/60 border border-slate-200/60 flex items-center justify-between gap-3">' +
        '<div class="min-w-0 flex-1">' +
          '<div class="text-xs text-slate-500 mb-0.5 truncate">' + name + (loc ? ' · ' + loc : '') + '</div>' +
          '<a class="text-base font-bold text-slate-800 hover:text-rose-500 flex items-center gap-1 truncate" href="' + escapeHtml(href) + '" rel="noopener noreferrer" target="_blank">' +
            '<span aria-hidden="true" class="material-symbols-outlined text-base text-slate-400">language</span>访问官网获取联系方式' +
          '</a>' +
        '</div>' +
        '<a class="text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-full flex-shrink-0 hover:bg-rose-50 hover:text-rose-700 transition-colors" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">官网</a>' +
      '</div>'
    );
  }

  function groupResources(resources) {
    const groups = [];
    const index = new Map();
    resources.forEach(function (item) {
      const key = (item.subsection || item.section || '未分类') + '|||' + (item.section || '');
      if (!index.has(key)) {
        index.set(key, groups.length);
        groups.push({ section: item.section || '未分类', subsection: item.subsection || '', items: [] });
      }
      groups[index.get(key)].items.push(item);
    });
    return groups;
  }

  // ---- 渲染 ----
  function buildFullGridHtml() {
    const resources = window.QUEER_RESOURCES || [];
    if (!resources.length) return '<p class="text-sm text-slate-500">未能载入 resources.js。</p>';
    const groups = groupResources(resources);
    let uidCounter = 0;
    return groups.map(function (group, gi) {
      const title = group.subsection || group.section;
      const subtitle = group.subsection ? group.section : '';
      const cardsHtml = group.items.map(function (item) {
        const html = cardHtml(item, 'g' + gi + '-' + uidCounter);
        uidCounter++;
        return html;
      }).join('');
      return (
        '<section class="resource-group space-y-4" data-group>' +
          '<div class="flex items-end justify-between gap-3 border-b border-slate-200/70 pb-2">' +
            '<div><h3 class="text-lg sm:text-xl font-extrabold text-slate-900">' + escapeHtml(title) + '</h3>' +
            (subtitle ? '<p class="text-xs text-slate-500 mt-0.5">' + escapeHtml(subtitle) + '</p>' : '') + '</div>' +
            '<span class="text-xs font-semibold text-slate-500 group-count">' + group.items.length + ' 条</span>' +
          '</div>' +
          '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">' + cardsHtml + '</div>' +
        '</section>'
      );
    }).join('');
  }

  function ensureFullGridRendered() {
    if (fullGridRendered) return;
    const grid = document.getElementById('resourceGrid');
    if (!grid) return;
    grid.innerHTML = buildFullGridHtml();
    fullGridRendered = true;
    allCards = null; // 下次 executeFilter 会重新 querySelectorAll
    updateCounts();
  }

  function renderCrisisGrid() {
    const resources = window.QUEER_RESOURCES || [];
    const container = document.getElementById('crisisGrid');
    if (!container || !resources.length) return;
    const crisis = resources.filter(function (r) {
      return (r.categories || []).indexOf('crisis') !== -1;
    }).slice(0, 6);
    if (!crisis.length) {
      container.innerHTML = '<p class="text-xs text-slate-400">暂无危机热线条目。请以机构官网为准。</p>';
      return;
    }
    container.innerHTML = crisis.map(crisisCardHtml).join('');
  }

  function updateCounts() {
    const resources = window.QUEER_RESOURCES || [];
    const total = document.getElementById('totalCount');
    if (total) total.textContent = resources.length;
    const heroHint = document.getElementById('heroResourceHint');
    if (heroHint) heroHint.textContent = '共 ' + resources.length + ' 条';
    const live = document.getElementById('filterStatus');
    if (live && !live.textContent) live.textContent = '共 ' + resources.length + ' 条资源';
  }

  function renderFeaturedGrid() {
    const grid = document.getElementById('featuredGrid');
    const resources = window.QUEER_RESOURCES || [];
    if (!grid || !resources.length) return;
    const picked = [];
    const seenCats = new Set();
    for (const item of resources) {
      const key = (item.categories && item.categories[0]) || item.section || '';
      if (!seenCats.has(key)) { picked.push(item); seenCats.add(key); }
      if (picked.length >= 9) break;
    }
    for (const item of resources) {
      if (picked.length >= 9) break;
      if (picked.indexOf(item) === -1) picked.push(item);
    }
    grid.innerHTML = picked.slice(0, 9).map(function (item, i) {
      return cardHtml(item, 'f' + i);
    }).join('');
  }

  // ---- 筛选样式 ----
  function setCategoryStyle(activeKey) {
    document.querySelectorAll('.category-btn').forEach(function (btn) {
      const on = btn.getAttribute('data-category') === activeKey;
      btn.classList.toggle('bg-gradient-to-r', on);
      btn.classList.toggle('from-blue-600', on);
      btn.classList.toggle('to-indigo-600', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('shadow-md', on);
      btn.classList.toggle('shadow-blue-500/20', on);
      btn.classList.toggle('font-bold', on);
      btn.classList.toggle('bg-white/70', !on);
      btn.classList.toggle('text-slate-600', !on);
      btn.classList.toggle('border', !on);
      btn.classList.toggle('border-white/80', !on);
      btn.classList.toggle('font-semibold', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      const listId = document.getElementById('resourceGrid');
      if (listId) btn.setAttribute('aria-controls', listId.id);
    });
  }

  function setTypeStyle(activeKey) {
    document.querySelectorAll('.type-btn').forEach(function (btn) {
      const on = btn.getAttribute('data-type') === activeKey;
      btn.classList.toggle('bg-blue-600', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('shadow-sm', on);
      btn.classList.toggle('bg-white/85', !on);
      btn.classList.toggle('text-slate-600', !on);
      btn.classList.toggle('border', !on);
      btn.classList.toggle('border-slate-200/60', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  function setRegionStyle(activeKey) {
    document.querySelectorAll('.region-btn').forEach(function (btn) {
      const on = btn.getAttribute('data-region') === activeKey;
      btn.classList.toggle('bg-blue-600', on);
      btn.classList.toggle('text-white', on);
      btn.classList.toggle('shadow-sm', on);
      btn.classList.toggle('bg-white/85', !on);
      btn.classList.toggle('text-slate-600', !on);
      btn.classList.toggle('border', !on);
      btn.classList.toggle('border-slate-200/60', !on);
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
    });
  }

  // ---- 核心筛选 ----
  function executeFilter() {
    ensureFullGridRendered();
    const searchInput = document.getElementById('searchInput');
    const noResults = document.getElementById('noResults');
    // 缓存 NodeList 避免每次 DOM 查询
    if (!allCards || allCards.length === 0) {
      allCards = document.querySelectorAll('#resourceGrid article');
    }
    state.query = ((searchInput && searchInput.value) || '').toLowerCase().trim();

    // 多关键词 AND 搜索
    const terms = state.query ? state.query.split(/\s+/).filter(Boolean) : [];

    let matchCount = 0;
    allCards.forEach(function (card) {
      const cats = card.getAttribute('data-category') || '';
      const region = card.getAttribute('data-region') || 'intl';
      const type = card.getAttribute('data-type') || 'ngo';
      const hay = card.getAttribute('data-search') || '';
      const okCat = state.category === 'all' || cats.split(/\s+/).indexOf(state.category) !== -1;
      const okType = state.type === 'all' || type === state.type;
      const okRegion = state.region === 'all' || region === state.region;
      let okQuery = true;
      for (let i = 0; i < terms.length; i++) {
        if (hay.indexOf(terms[i]) === -1) { okQuery = false; break; }
      }
      const show = okCat && okType && okRegion && okQuery;
      card.classList.toggle('hidden', !show);
      if (show) matchCount += 1;
    });

    document.querySelectorAll('#resourceGrid [data-group]').forEach(function (group) {
      const visible = group.querySelectorAll('article:not(.hidden)').length;
      group.classList.toggle('hidden', visible === 0);
      const countEl = group.querySelector('.group-count');
      if (countEl) countEl.textContent = visible + ' 条';
    });

    if (noResults) noResults.classList.toggle('hidden', matchCount !== 0);
    const label = document.getElementById('visibleCountLabel');
    const total = allCards.length;
    if (label) {
      const regionLabel = state.region !== 'all' ? ' · ' + (REGION_LABEL[state.region] || state.region) : '';
      label.innerHTML = '<span aria-hidden="true" class="material-symbols-outlined text-sm text-blue-600">sort</span><span>显示 ' + matchCount + ' / ' + total + ' 条' + regionLabel + '</span>';
    }
    // aria-live 更新
    const live = document.getElementById('filterStatus');
    if (live) live.textContent = matchCount === 0 ? '未找到匹配的资源' : '找到 ' + matchCount + ' 条资源';
    // 统一在这里同步 URL（避免多处重复调用）
    syncUrl();
  }

  // ---- 视图切换 ----
  function setActiveNav(view) {
    document.querySelectorAll('.nav-item').forEach(function (el) {
      const target = el.getAttribute('data-nav');
      if (target === view) el.classList.add('nav-active');
      else el.classList.remove('nav-active');
    });
    // logo 也加 nav-active
    const logo = document.querySelector('[data-nav="home"][data-action="show-home"]');
    if (logo && view === 'home') logo.classList.add('nav-active');
    else if (logo) logo.classList.remove('nav-active');
  }

  function showHomeView() {
    document.getElementById('homeView').classList.remove('hidden');
    document.getElementById('allView').classList.add('hidden');
    setActiveNav('home');
    try { document.getElementById('main-content').focus(); } catch (e) { /* ignore */ }
  }

  function showAllView() {
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('allView').classList.remove('hidden');
    ensureFullGridRendered();
    executeFilter();
    setActiveNav('all');
    try { document.getElementById('main-content').focus(); } catch (e) { /* ignore */ }
  }

  function quickSearch(query) {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) { searchInput.value = query; searchInput.focus(); try { searchInput.select(); } catch (e) { /* ignore */ } }
    state.query = query;
    showAllView();
    // showAllView 内部已调用 executeFilter（含 syncUrl），此处不再重复
  }

  function resetFilters() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.value = '';
    state.category = 'all';
    state.type = 'all';
    state.region = 'all';
    state.query = '';
    setCategoryStyle('all');
    setTypeStyle('all');
    setRegionStyle('all');
    executeFilter();
  }

  function applyFilterState() {
    setCategoryStyle(state.category);
    setTypeStyle(state.type);
    setRegionStyle(state.region);
    executeFilter();
  }

  // ---- 主题 ----
  function applyTheme(isDark) {
    document.documentElement.classList.toggle('dark', isDark);
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light');
    const btn = document.getElementById('themeToggleBtn');
    if (btn) btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    const icon = btn ? btn.querySelector('.material-symbols-outlined') : null;
    if (icon) icon.textContent = isDark ? 'light_mode' : 'dark_mode';
  }

  // ---- 事件委托：所有 data-action 按钮 ----
  function handleActionClick(e) {
    let el = e.target;
    while (el && el !== document.body) {
      const action = el.getAttribute && el.getAttribute('data-action');
      if (action) { doAction(action, el); e.preventDefault(); return; }
      el = el.parentNode;
    }
  }

  function doAction(action, el) {
    switch (action) {
      case 'show-home':
        showHomeView(); break;
      case 'show-all':
        showAllView(); break;
      case 'focus-search':
        const si = document.getElementById('searchInput');
        if (si) { si.focus(); try { si.select(); } catch (e) { /* ignore */ } }
        break;
      case 'close-safety-banner':
        const banner = document.getElementById('safety-banner');
        if (banner) banner.style.display = 'none';
        break;
      case 'quick-search':
        const q = el.getAttribute('data-query');
        if (q) quickSearch(q);
        break;
      case 'reset-filters':
        resetFilters(); break;
    }
  }

  // ---- 初始化 ----
  document.addEventListener('DOMContentLoaded', function () {
    // 初始渲染
    renderFeaturedGrid();
    updateCounts();
    renderCrisisGrid();

    // URL hash 恢复状态
    const hashState = parseHash();
    if (hashState) {
      state.category = hashState.category;
      state.type = hashState.type;
      state.region = hashState.region;
      state.query = hashState.query;
      const searchInput = document.getElementById('searchInput');
      if (searchInput) searchInput.value = hashState.query;
    }

    // 主题
    const savedTheme = storage.get('qr-theme');
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

    // data-action 委托
    document.addEventListener('click', handleActionClick);

    // 分类按钮
    document.querySelectorAll('.category-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.category = btn.getAttribute('data-category') || 'all';
        applyFilterState();
      });
    });

    // 类型按钮
    document.querySelectorAll('.type-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.type = btn.getAttribute('data-type') || 'all';
        applyFilterState();
      });
    });

    // 地区按钮
    document.querySelectorAll('.region-btn').forEach(function (btn) {
      btn.addEventListener('click', function () {
        state.region = btn.getAttribute('data-region') || 'all';
        applyFilterState();
      });
    });

    // 搜索框：实时筛选（全部视图时）
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
      searchInput.addEventListener('input', debounce(function () {
        const allHidden = document.getElementById('allView').classList.contains('hidden');
        if (!allHidden) {
          executeFilter();
        }
      }, 180));
      searchInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          showAllView();
        }
      });
    }

    // 主题按钮
    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) {
      themeBtn.addEventListener('click', function () {
        const isDark = !document.documentElement.classList.contains('dark');
        applyTheme(isDark);
        storage.set('qr-theme', isDark ? 'dark' : 'light');
      });
    }

    // 快捷键 ⌘K / Ctrl+K
    window.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        if (searchInput) { searchInput.focus(); try { searchInput.select(); } catch (err) { /* ignore */ } }
      }
    });

    // hashchange 同步
    window.addEventListener('hashchange', function () {
      const h = parseHash();
      if (!h) return;
      state.category = h.category;
      state.type = h.type;
      state.region = h.region;
      state.query = h.query;
      const si = document.getElementById('searchInput');
      if (si) si.value = h.query;
      applyFilterState();
    });

    // 初次渲染筛选状态
    applyFilterState();

    // 初始导航高亮 — 只在 index.html（有 homeView/allView 的 SPA）上干预
    // crisis.html / contributing.html 硬编码 nav-active，不覆盖
    if (document.getElementById('homeView')) {
      const hash = parseHash();
      setActiveNav(hash && hash.category !== 'all' ? 'all' : 'home');
    }
  });
})();
