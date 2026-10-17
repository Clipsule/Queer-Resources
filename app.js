(function () {
  'use strict';

  // ---- 常量 ----
  const TAG_STYLES = [
    'bg-pink-100/80 dark:bg-pink-500/20 text-pink-700 border-pink-200/70 dark:border-pink-400/30',
    'bg-blue-100/80 dark:bg-blue-500/20 text-blue-700 border-blue-200/70 dark:border-blue-400/30',
    'bg-emerald-100/80 dark:bg-emerald-500/20 text-emerald-800 border-emerald-200/70 dark:border-emerald-400/30',
    'bg-purple-100/80 dark:bg-purple-500/20 text-purple-700 border-purple-200/70 dark:border-purple-400/30',
    'bg-indigo-100/80 dark:bg-indigo-500/20 text-indigo-700 border-indigo-200/70 dark:border-indigo-400/30',
    'bg-rose-100/80 dark:bg-rose-500/20 text-rose-700 border-rose-200/70 dark:border-rose-400/30',
    'bg-amber-100/80 dark:bg-amber-500/20 text-amber-800 border-amber-200/70 dark:border-amber-400/30'
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

  // ---- i18n 桥接 ----
  // i18n.js 暴露 QRi18n：t() 取当前语言文案、resources() 取译文资源、aliasGroups() 取本地化同义词
  // 未加载成功时（例如用 file:// 打开）一律回退中文原文与 resources.js 原始数据
  function T(key, vars, fallback) {
    const v = window.QRi18n ? QRi18n.t(key, vars) : '';
    return v || fallback || '';
  }

  function currentResources() {
    const r = (window.QRi18n && QRi18n.resources) ? QRi18n.resources() : null;
    return (r && r.length) ? r : (window.QUEER_RESOURCES || []);
  }

  function currentAliasGroups() {
    const g = (window.QRi18n && QRi18n.aliasGroups) ? QRi18n.aliasGroups() : null;
    return (g && g.length) ? g : QUERY_ALIAS_GROUPS;
  }

  // ---- URL hash 同步 ----
  // 搜索词（q）不写入 URL：否则刷新后会从上一次的搜索结果自动跳转、且搜索框残留旧值。
  // URL 只保存「分类 / 类型 / 地区」这类可分享的筛选条件。
  function buildHash() {
    const parts = [];
    if (state.category !== 'all') parts.push('cat=' + encodeURIComponent(state.category));
    if (state.type !== 'all') parts.push('type=' + encodeURIComponent(state.type));
    if (state.region !== 'all') parts.push('reg=' + encodeURIComponent(state.region));
    return parts.length ? '#/?' + parts.join('&') : '';
  }

  function parseHash() {
    const hash = window.location.hash;
    // 支持 #/（纯路径 = 进入全部资源视图）与 #/?cat=xxx&type=yyy&reg=zzz（带筛选）
    if (/^#\/$/.test(hash)) {
      return { category: 'all', type: 'all', region: 'all', query: '' };
    }
    const withQuery = hash.match(/^#\/\?(.*)$/);
    if (!withQuery) return null;
    let params;
    try { params = new URLSearchParams(withQuery[1]); } catch (e) { return null; }
    const category = params.get('cat') || 'all';
    const type = params.get('type') || 'all';
    const region = params.get('reg') || 'all';
    // 搜索词一律忽略：不回填搜索框、不触发自动跳转；
    // 历史遗留的、只含 q 的链接也视为无状态 → 停留在首页
    if (category === 'all' && type === 'all' && region === 'all') return null;
    return { category: category, type: type, region: region, query: '' };
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
    // 风险判断基于中文原文 note：译文措辞不稳定，见 locales/i18n.json 的 i18nNotes ②
    const risk = /风险|减害|不替代|待核验|商业/.test(item.noteRaw || item.note || '');
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
        '<a class="absolute inset-0 z-10 rounded-3xl cursor-pointer" aria-label="' + escapeHtml(T('app.card.visitAria', { name: item.name }, '访问 ' + item.name + ' 的官网')) + '" href="' + escapeHtml(href) + '" rel="noopener noreferrer" target="_blank"></a>' +
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
                '<span>' + (risk ? T('app.card.riskLabel', null, '风险提示') : T('app.card.noteLabel', null, '说明')) + '</span>' +
              '</div>' + escapeHtml(item.note || T('app.card.defaultNote', null, '请以机构官网最新说明为准。')) +
            '</div>' +
          '</div>' +
          '<div class="mt-6 pt-4 border-t border-slate-200/50 flex items-center justify-between text-xs text-slate-500 font-medium gap-3">' +
            '<span class="truncate">' + escapeHtml(item.location || '') + '</span>' +
            '<span class="text-blue-600 font-bold group-hover:underline">' + escapeHtml(T('app.card.openSite', null, '打开官网 →')) + '</span>' +
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
            '<span aria-hidden="true" class="material-symbols-outlined text-base text-slate-400">language</span>' + escapeHtml(T('app.crisis.getContact', null, '访问官网获取联系方式')) +
          '</a>' +
        '</div>' +
        '<a class="text-xs text-slate-500 bg-slate-100 px-2.5 py-1.5 rounded-full flex-shrink-0 hover:bg-rose-50 hover:text-rose-700 transition-colors" href="' + escapeHtml(href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(T('app.crisis.website', null, '官网')) + '</a>' +
      '</div>'
    );
  }

  function groupResources(resources) {
    const groups = [];
    const index = new Map();
    resources.forEach(function (item) {
      const uncategorized = T('app.group.uncategorized', null, '未分类');
      const key = (item.subsection || item.section || uncategorized) + '|||' + (item.section || '');
      if (!index.has(key)) {
        index.set(key, groups.length);
        groups.push({ section: item.section || uncategorized, subsection: item.subsection || '', items: [] });
      }
      groups[index.get(key)].items.push(item);
    });
    return groups;
  }

  // ---- 渲染 ----
  function buildFullGridHtml() {
    const resources = currentResources();
    if (!resources.length) return '<p class="text-sm text-slate-500">' + escapeHtml(T('app.empty.loadError', null, '未能载入 resources.js。')) + '</p>';
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
            '<span class="text-xs font-semibold text-slate-500 group-count">' + escapeHtml(T('app.group.count', { n: group.items.length }, group.items.length + ' 条')) + '</span>' +
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
    const resources = currentResources();
    const container = document.getElementById('crisisGrid');
    if (!container || !resources.length) return;
    const crisis = resources.filter(function (r) {
      return (r.categories || []).indexOf('crisis') !== -1;
    }).slice(0, 6);
    if (!crisis.length) {
      container.innerHTML = '<p class="text-xs text-slate-400">' + escapeHtml(T('app.empty.noCrisis', null, '暂无危机热线条目。请以机构官网为准。')) + '</p>';
      return;
    }
    container.innerHTML = crisis.map(crisisCardHtml).join('');
  }

  function updateCounts() {
    const resources = currentResources();
    const total = document.getElementById('totalCount');
    if (total) total.textContent = resources.length;
    const heroHint = document.getElementById('heroResourceHint');
    if (heroHint) heroHint.textContent = T('app.count.heroHint', { n: resources.length }, '共 ' + resources.length + ' 条');
    const live = document.getElementById('filterStatus');
    if (live && !live.textContent) live.textContent = T('app.count.liveTotal', { n: resources.length }, '共 ' + resources.length + ' 条资源');
  }

  function renderFeaturedGrid() {
    const grid = document.getElementById('featuredGrid');
    const resources = currentResources();
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

  // ---- 搜索同义词展开 ----
  // 权威来源: docs/search-aliases.md（社区编辑的 Markdown 表格）
  // 生成方式: python3 scripts/generate_alias_js.py  自动从 MD 同步
  // 匹配规则: expandTerm() 对每个用户输入的词，返回 [原词, 所有 targets 小写]，再对卡片 data-search 做 OR 匹配
  /*BEGIN_ALIAS*/
  // 所有 targets 经过精准性筛选：跨 70+ 条目的通用词已移除
  // 资源来源: docs/search-aliases.md → 由 python3 scripts/generate_alias_js.py 生成
  const QUERY_ALIAS_GROUPS = [
    // group 1: trans 统称 → 跨性别总称（70 条，但这是"跨性别统称"的语义定义，可接受）
    { aliases: ['跨性别', '跨性', 'trans', '变性', '人妖', '性别转换', '性别再分配', '性别确认', '트랜스젠더'], targets: ['跨性别总称'] },
    // group 2: MtF → 精准 MtF tag（5+4+ 条，与 FtM 零交集）
    { aliases: ['mtf', '男转女', '跨女', '变女', '女跨', '伪娘', '娘炮', '飞天猫', '满天星', '药娘', '术娘', '男の娘', '뉴하프'], targets: ['跨性别女性', '女性倾向', 'transfeminine'] },
    // group 3: FtM → 精准 FtM tag（6+4+ 条，与 MtF 零交集）
    { aliases: ['ftm', '女转男', '跨男', '变男', '男跨'], targets: ['跨性别男性', '男性倾向', 'transmasculine'] },
    // group 4: 非二元
    { aliases: ['非二元', 'nb', 'non-binary', 'nonbinary', '性别酷儿', '多元性别', '性别流动', 'genderfluid', 'enby'], targets: ['非二元', '性别多元', '性别流动'] },
   // group 5: 拉拉
    { aliases: ['拉拉', 'les', 'lesbian', '女同', 'lesbi', '百合', '蕾丝边', '蕾丝', '拉子', '橘里橘气'], targets: ['女同性恋', 'lesbian'] },
    // group 6: gay（注意：移除"同志"，因为中文"同志"也指一般朋友）
    { aliases: ['gay', '基佬', '男同', 'homosexual', '给佬', '搞基', '玻璃', '断背', '龙阳'], targets: ['男同性恋', 'gay'] },  
    // group 7: 双
    { aliases: ['双性恋', 'bi', 'bisexual', '双性'], targets: ['双性恋', 'bisexual'] },
    // group 8: 无性
    { aliases: ['无性恋', 'ace', 'asexual', '无性', '灰无性', '灰色无性恋'], targets: ['无性恋', '灰色无性恋'] },
    // group 9: 无浪漫
    { aliases: ['无浪漫', 'aro', 'aromantic', '无浪漫倾向'], targets: ['无浪漫倾向', 'aromantic'] },
    // group 10: 酷儿
    { aliases: ['酷儿', 'queer'], targets: ['酷儿', 'queer'] },
    // group 11: 间性
    { aliases: ['间性', '阴阳人', '双性人', '雌雄同体'], targets: ['间性人', 'intersex'] },
    // group 12: 木桶饭（异装/MtF 语境）→ 只命中 MtF tag，与 group 2 意图一致（注意：组 2 和组 12 合并意图）
    { aliases: ['木桶饭', '异装', '跨装', 'crossdress', '女装大佬', '女装', '男娘', '异装癖'], targets: ['跨性别女性', '女性倾向', 'transfeminine'] },
    // group 13: HRT
    { aliases: ['hrt', '激素', '荷尔蒙', '吃药', '打针', '雌激素', 'estrogen', 'testosterone'], targets: ['激素治疗', 'hrt'] },
    // group 14: 手术
    { aliases: ['手术', 'srs', '改性别', '变性手术', '确认手术', 'gender affirming', '切胸'], targets: ['性别肯定手术', 'srs', 'surgery'] },
    // group 15: 声音
    { aliases: ['声音', '伪声', '变声'], targets: ['声音训练'] },
    // group 16: PrEP
    { aliases: ['prep', '暴露前预防', 'pep', 'PrEP'], targets: ['暴露前预防'] },
    // group 17: HIV
    { aliases: ['hiv', '艾滋', '爱滋', 'aids'], targets: ['艾滋'] },
    // group 18: 自杀/危机 → 移除"心理"（跨所有条目）和"抑郁"（太泛）
    { aliases: ['自杀', '想死', '轻生', '危机', '跳楼'], targets: ['危机干预', '自杀'] },
    // group 19: 咨询/治疗
    { aliases: ['咨询', 'therapy', '治疗师', 'counselor'], targets: ['咨询', 'mental health'] },
    // group 20: 诊所
    { aliases: ['诊所', '医院', '看病', '医生'], targets: ['诊所', '医院', '医生'] },
    // group 21: 法律
    { aliases: ['法律', '维权', '权益', '诉讼', '官司'], targets: ['法律', '权益'] },
    // group 22: 安全/隐私 → 只留"数字安全"，移除宽泛词
    { aliases: ['安全', '隐私', '加密', 'vpn', '翻墙', '匿名'], targets: ['数字安全'] },
    // group 23: 工作/职场/出柜
    { aliases: ['工作', '职场', '就业', '老板', '出柜', 'come out'], targets: ['职场', '就业'] },
    // group 24: 学生/学校
    { aliases: ['学生', '学校', '上学', '老师', '校园'], targets: ['青年', '学校', '学生'] },
    // group 25: 社区
    { aliases: ['社区', '小组', '聚会', '微信群'], targets: ['社区', '同伴'] },
    // group 26: 改名/证件
    { aliases: ['改名', '改证', '身份证', '证件', '性别标记', '性别变更'], targets: ['证件', '法律性别承认'] },
    // group 27: 家庭
    { aliases: ['家庭', '父母', '妈妈', '爸爸', '家长'], targets: ['家庭', '父母'] },
    // group 28: DIY
    { aliases: ['diy', '自助', '自己', '网购', '海淘'], targets: ['DIY', '减害'] },
    // group 29: 性角色
    { aliases: ['1', '0', '0.5', 'top', 'bottom', 'vers', '攻', '受', '可攻可受'], targets: ['性角色'] },
    // group 30: 身材分类（男同社群）
    { aliases: ['熊', '猴', '壮熊', '肌肉', 'bear', 'otter', 'twink', 'twunk', 'cub', 'wolf'], targets: ['身材分类'] },
    // group 31: Pass/出柜 → 只留"出柜"，pass/passing 在 resources.js 里没有
    { aliases: ['pass', '过关', '出柜', 'come out', '深柜', 'stealth'], targets: ['出柜', 'come out'] },
    // group 32: 性别焦虑（target 全部不存在，保留原词 fallback）
    { aliases: ['性别焦虑', '性别不安', '性别烦躁', 'gd', 'gender dysphoria'], targets: ['性别焦虑'] },
    // group 33: 性取向探索（target 存疑，保留原词 fallback）
    { aliases: ['探索', 'questioning', '疑问', '不确定'], targets: ['性取向探索', '性别探索'] },
    // group 34: 泛性恋
    { aliases: ['泛性恋', 'pan', 'pansexual', '多性恋', 'polysexual'], targets: ['泛性恋', '多性恋', 'pansexual'] },
    // group 35: 浪漫取向（target 存疑，保留原词 fallback）
    { aliases: ['浪漫取向', '浪漫倾向', '双浪漫', '泛浪漫', '灰色浪漫'], targets: ['浪漫取向'] },
    // group 36: 多边恋（target 存疑，保留原词 fallback）
    { aliases: ['多边恋', '开放关系', '非单偶', 'poly', 'polyamory'], targets: ['多边恋', '开放关系', '非单偶'] },
    // group 37: 束胸/垫裆（target 存疑，保留原词 fallback）
    { aliases: ['束胸', 'binding', 'binder', '垫裆', 'packing', 'packer', 'tuck'], targets: ['束胸', 'binding', 'packing', 'tuck'] },
    // group 38: 网络骚扰
    { aliases: ['网暴', '人肉', 'doxxing', '网络骚扰', '仇恨言论'], targets: ['网络骚扰', '数字安全'] },
    // group 39: 生育/生殖（target 存疑，保留原词 fallback）
    { aliases: ['生育', '怀孕', '生殖', '冻卵', '冻精'], targets: ['生育', '生殖健康', 'fertility'] },
    // group 40: 宗教/灵性（target 存疑，保留原词 fallback）
    { aliases: ['宗教', '信仰', '灵性', '教会', '寺庙'], targets: ['宗教', '灵性', '信仰'] },
    // group 41: 变装/CD/伪娘/男娘（精准：只命中新增的变装专项条目）
    { aliases: ['cd', 'crossdress', 'crossdressing', '变装', '异装', '跨装', '伪娘', '男娘', '女装', '女装大佬', '女装子', '男の娘', 'ニューハーフ', '여장', '크로스드레서', 'cdts', 'tsf', '性转', '变身'], targets: ['变装', '伪娘', '男娘', 'CDTS', 'TSF', '性转'] },
    // group 42: 攻受/性角色/Vers
    { aliases: ['1', '0', '0.5', 'top', 'bottom', 'vers', 'versatile', '攻', '受', '可攻可受', '偏1', '偏0', '纯1', '纯0', '公', '母', 'タチ', 'ネコ', 'リバ', '탑', '바텀'], targets: ['性角色'] },
    // group 43: 熊圈/身材类型
    { aliases: ['熊', '猴', '狒狒', '狼', '猪', '壮熊', '肌肉', '毛熊', 'bear', 'otter', 'twink', 'twunk', 'cub', 'wolf', 'silver fox', 'chaser', '追逐者', 'ゴリマッチョ'], targets: ['身材分类'] },
    // group 44: 药娘/吃糖/GAHT
    { aliases: ['药娘', '吃糖', '糖', '药', 'gaht', '激素替代', '抗雄', '雌激素', '补佳乐', '色普龙', '螺内酯', 'ホルモン療法', '호르몬 치료'], targets: ['药娘', '激素治疗', 'hrt'] },
    // group 45: BDSM/字母圈/主奴
    { aliases: ['bdsm', 'sm', '字母圈', '主奴', '主人', '奴隶', 'dom', 'sub', 'switch', '调教', '束缚', '皮绳', '愉虐', 'spank', '小圈', 'fetish', 'kink', '恋物', 'd/s', '支配', '臣服', '縄', '緊縛'], targets: ['BDSM', '字母圈', '主奴'] },
    // group 46: CDTS变身文学/TSF
    { aliases: ['tsf', '变身文学', '性转小说', '变身小说', 'cdbook', '伪娘漫画', '性转漫画', 'ts漫画', '变身漫画', '성전환 소설'], targets: ['TSF', '变身文学', '性转'] },
    // group 47: 韩国性少数
    { aliases: ['이반시티', 'ivancity', '게이', '레즈비언', '트랜스젠더', '성소수자', '퀴어', '한국 게이', '한국 레즈', '커밍아웃', '한국 성소수자'], targets: ['韩国', 'KSCRC'] },
    // group 48: 日本伪娘/女装子
    { aliases: ['男の娘', '女装子', 'ニューハーフ', 'おとこのこ', 'メンズメイク'], targets: ['日本', '男の娘'] },
    // group 49: 台湾伪娘/CDTS
    { aliases: ['偽娘', '女裝男子', '偽娘板', '巴哈偽娘', 'dcard偽娘', '女裝男子互助'], targets: ['伪娘', 'CDTS'] },
    // group 50: 中东/阿拉伯语
    { aliases: ['arab', 'arabic', '阿拉伯', '中东', 'middle east', 'mena', 'queer arab', 'lgbt arab', 'عربي', 'المثليين', 'مجتمع الميم'], targets: ['中东', '阿拉伯'] },
    // group 51: 非洲
    { aliases: ['africa', 'african', '非洲', 'gala', 'gender dynamix', 'cal', 'qayn', 'amsher', 'south africa', 'african lgbt', 'african queer'], targets: ['非洲', 'GALA'] },
    // group 52: 拉丁美洲
    { aliases: ['latino', 'latina', 'latin america', '拉丁美洲', '拉美', 'ilgalac', 'gpsgay', '巴西', '墨西哥', 'argentina', 'colombia'], targets: ['拉丁美洲'] },
    // group 53: 残障/聋人/视障
    { aliases: ['disability', 'disabled', 'deaf', 'blind', '残障', '聋人', '视障', '听障', 'pwda', 'deaf queer', 'blind lgbt'], targets: ['残障', '聋人', '视障'] },
    // group 54: 宗教/信仰（已在 group 40 存在同义词，这里补充宗教英文）
    { aliases: ['religion', 'religious', 'faith', 'church', 'christian', 'jewish', 'muslim', 'buddhist', '基督教', '犹太教', '穆斯林', '佛教'], targets: ['宗教', '信仰'] },
    // group 55: 移民/难民/庇护
    { aliases: ['immigrant', 'refugee', 'asylum', 'migration', '移民', '难民', '庇护', '政治庇护', 'immigration equality', 'oram', 'rainbow railroad', 'rainbow initiative'], targets: ['移民', '难民', '庇护'] },
    // group 56: 性健康/PrEP补充
    { aliases: ['性健康', 'sexual health', 'pep', '暴露后预防', '安全套', '检测', 'hiv检测', '匿名检测', '性病', 'std', 'sti'], targets: ['暴露前预防', '艾滋', '检测'] },
    // group 57: 多边恋/开放关系/ENM
    { aliases: ['多边恋', '开放关系', '非单偶', 'poly', 'polyamory', 'polyam', 'enm', 'ethical non-monogamy', '多元关系', '开放式关系'], targets: ['多边恋', '开放关系', '非单偶'] }
  ];
  /*END_ALIAS*/

  function expandTerm(term) {
    const t = (term || '').toLowerCase().trim();
    if (!t) return [];
    const result = new Set([t]);
    const groups = currentAliasGroups();
    for (let i = 0; i < groups.length; i++) {
      const g = groups[i];
      for (let j = 0; j < g.aliases.length; j++) {
        const a = g.aliases[j];
        if (a === t || t.indexOf(a) !== -1 || a.indexOf(t) !== -1) {
          for (let k = 0; k < g.targets.length; k++) result.add(g.targets[k].toLowerCase());
          break;
        }
      }
    }
    return [...result];
  }

  // ---- 核心筛选 ----
  function executeFilter() {
    ensureFullGridRendered();
    const noResults = document.getElementById('noResults');
    // 缓存 NodeList 避免每次 DOM 查询
    if (!allCards || allCards.length === 0) {
      allCards = document.querySelectorAll('#resourceGrid article');
    }
    // state.query 已在 input 事件里由两个搜索框同步好，不再覆盖

    // 多关键词 AND 搜索；每个关键词内部是同义词 OR 匹配
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
        const expanded = expandTerm(terms[i]);
        let hit = false;
        for (let j = 0; j < expanded.length; j++) {
          if (hay.indexOf(expanded[j]) !== -1) { hit = true; break; }
        }
        if (!hit) { okQuery = false; break; }
      }
      const show = okCat && okType && okRegion && okQuery;
      card.classList.toggle('hidden', !show);
      if (show) matchCount += 1;
    });

    document.querySelectorAll('#resourceGrid [data-group]').forEach(function (group) {
      const visible = group.querySelectorAll('article:not(.hidden)').length;
      group.classList.toggle('hidden', visible === 0);
      const countEl = group.querySelector('.group-count');
      if (countEl) countEl.textContent = T('app.group.count', { n: visible }, visible + ' 条');
    });

    if (noResults) noResults.classList.toggle('hidden', matchCount !== 0);
    const label = document.getElementById('visibleCountLabel');
    const total = allCards.length;
    if (label) {
      const regionLabel = state.region !== 'all'
        ? ' · ' + T('app.region.' + state.region, null, REGION_LABEL[state.region] || state.region)
        : '';
      const visibleText = T('app.count.visible', { matched: matchCount, total: total }, '显示 ' + matchCount + ' / ' + total + ' 条');
      label.innerHTML = '<span aria-hidden="true" class="material-symbols-outlined text-sm text-blue-600">sort</span><span>' + escapeHtml(visibleText) + escapeHtml(regionLabel) + '</span>';
    }
    // aria-live 更新
    const live = document.getElementById('filterStatus');
    if (live) live.textContent = matchCount === 0
      ? T('app.count.noMatch', null, '未找到匹配的资源')
      : T('app.count.found', { n: matchCount }, '找到 ' + matchCount + ' 条资源');
    // 统一在这里同步 URL（避免多处重复调用）
    syncUrl();
  }

  // ---- 视图切换 ----
  function setActiveNav(view) {
    document.querySelectorAll('.nav-item, .mobile-nav-item').forEach(function (el) {
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
    // 关键：回到首页顶部，而不是停在之前的滚动位置
    window.scrollTo(0, 0); //把原本的值换成scollTo
    // 让键盘焦点落在 hero 搜索框，方便用户直接搜索
    const hero = document.getElementById('searchInput');
    if (hero) { try { hero.focus({ preventScroll: true }); } catch (e) { try { hero.focus(); } catch (_) {} } }
  }

  function showAllView() {
    document.getElementById('homeView').classList.add('hidden');
    document.getElementById('allView').classList.remove('hidden');
    window.scrollTo(0, 0);
    ensureFullGridRendered();
    executeFilter();
    setActiveNav('all');
    // 自动聚焦全部视图的搜索框，方便继续搜索
    const searchAll = document.getElementById('searchInputAll');
    if (searchAll) { try { searchAll.focus(); } catch (e) { /* ignore */ } }
  }

  function quickSearch(query) {
    // 同步两个搜索框的值
    const inputHome = document.getElementById('searchInput');
    const inputAll = document.getElementById('searchInputAll');
    if (inputHome) inputHome.value = query;
    if (inputAll) inputAll.value = query;
    state.query = (query || '').trim().toLowerCase();
    showAllView(); // showAllView 内部会聚焦 searchInputAll
  }

  function resetFilters() {
    // 清空两个搜索框
    const inputHome = document.getElementById('searchInput');
    const inputAll = document.getElementById('searchInputAll');
    if (inputHome) inputHome.value = '';
    if (inputAll) inputAll.value = '';
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
        if (banner) { banner.classList.add('is-closed'); storage.set('qr-banner-closed', '1'); }
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
  function initSite() {
    // === 移动端导航抽屉 ===
    const mobileBtn = document.getElementById('mobileMenuBtn');
    const mobileNav = document.getElementById('mobileNav');
    function toggleMobileNav(force) {
      if (!mobileBtn || !mobileNav) return;
      const willOpen = typeof force === 'boolean' ? force : !mobileNav.classList.contains('is-open');
      mobileNav.classList.toggle('is-open', willOpen);
      mobileBtn.setAttribute('aria-expanded', willOpen ? 'true' : 'false');
      mobileBtn.classList.toggle('is-open', willOpen);
      // 打开时锁 body 滚动
      document.body.style.overflow = willOpen ? 'hidden' : '';
    }
    if (mobileBtn) {
      mobileBtn.addEventListener('click', function (e) { e.stopPropagation(); toggleMobileNav(); });
    }
    // 点击移动端导航项后自动关闭抽屉
    if (mobileNav) {
      mobileNav.addEventListener('click', function (e) {
        const item = e.target.closest('.mobile-nav-item');
        if (item) toggleMobileNav(false);
      });
      // 点击抽屉外部关闭
      document.addEventListener('click', function (e) {
        if (mobileNav.classList.contains('is-open') && !mobileNav.contains(e.target) && e.target !== mobileBtn && !mobileBtn.contains(e.target)) {
          toggleMobileNav(false);
        }
      });
      // Esc 关闭
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') toggleMobileNav(false);
      });
    }

    // 初始渲染
    renderFeaturedGrid();
    updateCounts();
    renderCrisisGrid();

    // 用户之前关闭过安全警示 → 本次直接加 is-closed class（CSS transition 平滑过渡）
    if (storage.get('qr-banner-closed')) {
      const b = document.getElementById('safety-banner');
      if (b) b.classList.add('is-closed');
    }

    // 刷新后不自动跳转、搜索框留空：URL 已不保存搜索词（见 buildHash），
    // 这里再显式清空两个搜索框，避免浏览器在刷新时恢复上次输入的表单值
    const inputHomeInit = document.getElementById('searchInput');
    const inputAllInit = document.getElementById('searchInputAll');
    if (inputHomeInit) inputHomeInit.value = '';
    if (inputAllInit) inputAllInit.value = '';
    state.query = '';

    // URL hash 只恢复「分类 / 类型 / 地区」筛选 —— 带 hash 进入 = 直接进入全部资源视图
    const hashState = parseHash();
    const isAllView = !!hashState;
    if (hashState) {
      state.category = hashState.category;
      state.type = hashState.type;
      state.region = hashState.region;
    }

    // 根据 hash 决定初始视图和导航高亮 —— 两个动作显式绑定
    if (isAllView) {
      showAllView();       // 隐藏 homeView，显示 allView
      setActiveNav('all'); // 高亮"全部资源"
    } else {
      setActiveNav('home'); // 高亮"首页"
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

    // ---- 搜索框双向同步 ----
    // homeView 里的大搜索框（searchInput）和 allView 里的紧凑搜索框（searchInputAll）
    // 共享同一个 state.query，任何一个输入都会同步到另一个并触发过滤
    const inputHome = document.getElementById('searchInput');
    const inputAll = document.getElementById('searchInputAll');
    const clearAll = document.getElementById('searchClearAll');

    function updateClearBtnVisible() {
      if (clearAll) {
        const hasVal = state.query && state.query.length > 0;
        clearAll.classList.toggle('hidden', !hasVal);
      }
    }

    // 核心：任何一个搜索框 input 事件 → 同步另一个 → 过滤 → 更新 state
    function bindSearchInput(input, from) {
      if (!input) return;
      input.addEventListener('input', debounce(function () {
        const val = input.value;
        state.query = (val || '').trim().toLowerCase();
        // 同步值到另一个框（但不触发对方的 input 事件）
        const other = from === 'home' ? inputAll : inputHome;
        if (other && other !== input && other.value !== val) {
          other.value = val;
        }
        // 无论哪个视图，都过滤一次（首页上 executeFilter 是 no-op 因为 allCards 还没渲染）
        executeFilter();
        updateClearBtnVisible();
      }, 180));
      // Enter → 如果当前在首页，切到全部视图；如果已在全部视图，无额外行为
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') {
          e.preventDefault();
          const allHidden = document.getElementById('allView').classList.contains('hidden');
          if (allHidden) {
            showAllView();
          }
        }
      });
    }
    bindSearchInput(inputHome, 'home');
    bindSearchInput(inputAll, 'all');

    // 清除按钮（allView 搜索框旁边的 close 按钮）
    if (clearAll) {
      clearAll.addEventListener('click', function () {
        state.query = '';
        if (inputHome) inputHome.value = '';
        if (inputAll) inputAll.value = '';
        executeFilter();
        updateClearBtnVisible();
        if (inputAll) { try { inputAll.focus(); } catch (e) {} }
      });
    }

    // 首页大"搜索"按钮 → 切到全部视图并把焦点给 allView 的搜索框
    const heroBtn = document.getElementById('heroSearchBtn');
    if (heroBtn) {
      heroBtn.addEventListener('click', function () {
        showAllView(); // showAllView 内部会聚焦 searchInputAll
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

    // 快捷键 ⌘K / Ctrl+K → 聚焦全部视图的搜索框（没全部视图就聚焦首页搜索框）
    window.addEventListener('keydown', function (e) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        const target = inputAll && !document.getElementById('allView').classList.contains('hidden')
          ? inputAll : inputHome;
        if (target) { try { target.focus(); try { target.select(); } catch (err) {} } catch (err) { /* ignore */ } }
      }
    });

    // hashchange 同步状态和视图切换
    window.addEventListener('hashchange', function () {
      const h = parseHash();
      if (h) {
        state.category = h.category;
        state.type = h.type;
        state.region = h.region;
        state.query = h.query;
        if (inputHome) inputHome.value = h.query;
        if (inputAll) inputAll.value = h.query;
        showAllView();  // 带 hash = 全部资源视图 + setActiveNav('all')
        applyFilterState();
      } else {
        // hash 被清空（例如 syncUrl 清除筛选后）→ 切回首页
        showHomeView();
      }
    });

    // 初次渲染筛选状态
    applyFilterState();
    // setActiveNav 已在上方显式调用，不在此处重复
  }

  // i18n 就绪后再初始化：确保资源卡片用当前语言的译文渲染
  document.addEventListener('DOMContentLoaded', function () {
    if (window.QRi18n && QRi18n.ready && typeof QRi18n.ready.then === 'function') {
      QRi18n.ready.then(initSite);
    } else {
      initSite();
    }
  });
})();
