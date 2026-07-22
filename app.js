'use strict';

/* =====================================================
   State
   ===================================================== */
const state = {
  data: { venues: [], parks: [], schools: [], courses: [], districts: [] },
  loaded: false,
  selectedDistrict: null,
  selectedCategory: null,
  searchQuery: '',
  showAll: false,
  fontScaleIndex: 1,        // default = 100%
  activeSuggestionIndex: -1
};

const FONT_SCALES = [
  { label: '90%',  value: 0.9 },
  { label: '100%', value: 1.0 },
  { label: '110%', value: 1.1 },
  { label: '120%', value: 1.2 },
  { label: '130%', value: 1.3 }
];

const CATEGORY_LABELS = {
  'sports-center': '運動中心',
  'park':          '公園',
  'school':        '可運動的學校',
  'course':        '運動i臺灣課程',
  'sports-park':   '運動／體育園區',
  'all':           '全部'
};

/* =====================================================
   Init
   ===================================================== */
document.addEventListener('DOMContentLoaded', () => {
  initFontScale();
  loadAllData();
  setupEventListeners();
});

/* =====================================================
   Data Loading
   ===================================================== */
async function loadAllData() {
  const sources = [
    { key: 'venues',    url: './data/venues.json' },
    { key: 'parks',     url: './data/parks.json' },
    { key: 'schools',   url: './data/schools.json' },
    { key: 'courses',   url: './data/courses.json' },
    { key: 'districts', url: './data/districts.json' }
  ];

  const results = await Promise.allSettled(
    sources.map(source => fetchJSON(source.url))
  );

  const failed = [];
  let loadedCount = 0;

  results.forEach((result, index) => {
    const source = sources[index];

    if (result.status === 'fulfilled') {
      state.data[source.key] = normalizeCollection(result.value, source.key);
      loadedCount += 1;
    } else {
      state.data[source.key] = [];
      failed.push({
        file: source.url,
        message: result.reason?.message || '未知錯誤'
      });
    }
  });

  if (loadedCount === 0) {
    state.loaded = false;
    console.error('所有資料檔案皆載入失敗：', failed);
    showDataError(failed);
    return;
  }

  state.loaded = true;

  if (failed.length > 0) {
    console.warn('部分資料檔案載入失敗，但其他資料仍可使用：', failed);
  }

  renderDistrictButtons();
  renderResults();
}

function normalizeCollection(payload, preferredKey) {
  if (Array.isArray(payload)) return payload;

  if (!payload || typeof payload !== 'object') return [];

  // 支援 { venues: [...] }、{ parks: [...] } 等包裝格式
  if (Array.isArray(payload[preferredKey])) return payload[preferredKey];

  // 支援常見包裝格式
  for (const key of ['data', 'items', 'results', 'records']) {
    if (Array.isArray(payload[key])) return payload[key];
  }

  // 若物件內只有一個陣列，也視為資料集合
  const arrayValue = Object.values(payload).find(value => Array.isArray(value));
  if (arrayValue) return arrayValue;

  // 支援以 ID 或行政區名稱作為 key 的物件格式
  const objectValues = Object.values(payload);
  if (
    objectValues.length > 0 &&
    objectValues.every(value => value && typeof value === 'object' && !Array.isArray(value))
  ) {
    return objectValues;
  }

  return [];
}

async function fetchJSON(url) {
  const resp = await fetch(url, { cache: 'no-store' });

  if (!resp.ok) {
    throw new Error(`HTTP ${resp.status}：找不到或無法讀取 ${url}`);
  }

  const rawText = await resp.text();

  try {
    return JSON.parse(rawText);
  } catch (error) {
    throw new Error(`JSON 格式錯誤：${url}（${error.message}）`);
  }
}

function showDataError(failedFiles = []) {
  const promptSec = document.getElementById('prompt-section');

  if (!promptSec) return;

  const details = failedFiles.length
    ? `<ul class="data-error-list">
        ${failedFiles.map(item =>
          `<li><code>${esc(item.file)}</code>：${esc(item.message)}</li>`
        ).join('')}
       </ul>`
    : '';

  promptSec.hidden = false;
  promptSec.innerHTML = `
    <div class="error-state">
      <p class="error-title">⚠ 資料暫時無法載入</p>
      <p class="error-desc">
        請確認 GitHub 儲存庫中有 <code>data</code> 資料夾，
        並且五個 JSON 檔名與大小寫完全正確。
      </p>
      ${details}
      <button class="reload-btn" onclick="location.reload()">重新整理</button>
    </div>`;
}

/* =====================================================
   Font Scale
   ===================================================== */
function initFontScale() {
  const saved = localStorage.getItem('kh-font-index');
  if (saved !== null) {
    const idx = parseInt(saved, 10);
    if (!isNaN(idx)) state.fontScaleIndex = Math.max(0, Math.min(4, idx));
  }
  applyFontScale();
}

function applyFontScale() {
  const scale = FONT_SCALES[state.fontScaleIndex];
  document.documentElement.style.setProperty('--font-scale', scale.value);

  const resetBtn = document.getElementById('font-reset');
  if (resetBtn) {
    resetBtn.textContent = scale.label;
    resetBtn.classList.toggle('font-btn-active', true);
  }

  localStorage.setItem('kh-font-index', state.fontScaleIndex);
}

/* =====================================================
   District Buttons
   ===================================================== */
const PRIORITY_DISTRICTS = [
  '前金區','鼓山區','楠梓區','岡山區',
  '左營區','鹽埕區','鳳山區','前鎮區',
  '美濃區','苓雅區','大寮區'
];

function renderDistrictButtons() {
  const container = document.getElementById('district-buttons');
  if (!container) return;

  container.innerHTML = PRIORITY_DISTRICTS.map(name => {
    const sel = state.selectedDistrict === name;
    return `
      <button
        class="district-btn${sel ? ' selected' : ''}"
        data-district="${esc(name)}"
        aria-pressed="${sel}"
        aria-label="${sel ? '已選擇' : '選擇'}${esc(name)}"
        data-testid="btn-district-${esc(name)}"
      >
        ${sel ? '<span class="district-check" aria-hidden="true">✓</span>' : ''}
        <span class="district-name">${esc(name)}</span>
      </button>`;
  }).join('');

  container.querySelectorAll('.district-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const d = btn.dataset.district;
      state.selectedDistrict = (state.selectedDistrict === d) ? null : d;
      state.showAll = true;
      sync();
    });
  });
}

/* =====================================================
   Event Listeners
   ===================================================== */
function setupEventListeners() {
  // Font
  document.getElementById('font-decrease')?.addEventListener('click', () => {
    if (state.fontScaleIndex > 0) { state.fontScaleIndex--; applyFontScale(); }
  });
  document.getElementById('font-reset')?.addEventListener('click', () => {
    state.fontScaleIndex = 1; applyFontScale();
  });
  document.getElementById('font-increase')?.addEventListener('click', () => {
    if (state.fontScaleIndex < 4) { state.fontScaleIndex++; applyFontScale(); }
  });

  // All / clear districts
  document.getElementById('all-districts-btn')?.addEventListener('click', () => {
    state.selectedDistrict = null; state.showAll = true; sync();
  });
  document.getElementById('clear-district-btn')?.addEventListener('click', () => {
    state.selectedDistrict = null;
    if (!state.selectedCategory && !state.searchQuery) state.showAll = false;
    sync();
  });

  // Category
  document.querySelectorAll('.category-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const cat = btn.dataset.category;
      if (cat === 'all') {
        state.selectedCategory = null;
      } else {
        state.selectedCategory = (state.selectedCategory === cat) ? null : cat;
      }
      state.showAll = true;
      sync();
    });
  });

  // Search
  const input    = document.getElementById('search-input');
  const clearBtn = document.getElementById('search-clear');
  let searchTimer;

  input?.addEventListener('input', e => {
    const q = e.target.value.trim();
    state.searchQuery = q;
    if (clearBtn) clearBtn.hidden = !q;
    clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      if (q.length >= 2) showSuggestions(q);
      else               hideSuggestions();
      if (q.length > 0) state.showAll = true;
      else if (!state.selectedDistrict && !state.selectedCategory) state.showAll = false;
      sync();
    }, 300);
  });

  input?.addEventListener('keydown', e => {
    const list  = document.getElementById('search-suggestions');
    const items = list ? [...list.querySelectorAll('li')] : [];
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      state.activeSuggestionIndex = Math.min(state.activeSuggestionIndex + 1, items.length - 1);
      highlightSuggestion(items);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      state.activeSuggestionIndex = Math.max(state.activeSuggestionIndex - 1, -1);
      highlightSuggestion(items);
    } else if (e.key === 'Enter') {
      if (state.activeSuggestionIndex >= 0) items[state.activeSuggestionIndex]?.click();
      else { hideSuggestions(); state.showAll = true; sync(); }
    } else if (e.key === 'Escape') {
      hideSuggestions();
    }
  });

  clearBtn?.addEventListener('click', () => {
    if (input) input.value = '';
    state.searchQuery = '';
    clearBtn.hidden = true;
    hideSuggestions();
    if (!state.selectedDistrict && !state.selectedCategory) state.showAll = false;
    sync();
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('#search-section')) hideSuggestions();
  });

  document.getElementById('clear-all-btn')?.addEventListener('click', clearAll);
}

/* =====================================================
   Suggestions
   ===================================================== */
function allSearchable() {
  const venues  = state.data.venues.map(v => ({ ...v }));
  const parks   = state.data.parks.map(p => ({ ...p, type: 'park' }));
  const schools = state.data.schools.map(s => ({
    id: `school-${s.district}`, type: 'school',
    nameZh: `${s.district}可運動學校`, nameEn: '',
    district: s.district, address: '', summary: `${s.district}共有${s.count}間可運動的學校`,
    facilities: []
  }));
  const courses = state.data.courses.map(c => ({
    ...c, district: '全市', address: '', facilities: []
  }));
  return [...venues, ...parks, ...schools, ...courses];
}

function showSuggestions(query) {
  const lq = query.toLowerCase();
  const matches = allSearchable().filter(item =>
    [item.nameZh, item.nameEn, item.district, item.address, item.summary,
      ...(item.facilities || []),
      ...(item.otherFacilities || []),
      ...(item.seniorBenefits || [])
    ].some(f => f && String(f).toLowerCase().includes(lq))
  ).slice(0, 8);

  const ul    = document.getElementById('search-suggestions');
  const input = document.getElementById('search-input');
  if (!ul) return;

  if (!matches.length) { ul.hidden = true; input?.setAttribute('aria-expanded', 'false'); return; }

  state.activeSuggestionIndex = -1;
  ul.innerHTML = matches.map((item, i) => `
    <li role="option" id="sug-${i}" aria-selected="false" data-name="${esc(item.nameZh)}">
      <span class="sug-name">${esc(item.nameZh)}</span>
      ${item.district ? `<span class="sug-district">${esc(item.district)}</span>` : ''}
      <span class="sug-type">${esc(CATEGORY_LABELS[item.type] || item.type)}</span>
    </li>`).join('');

  ul.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      const name = li.dataset.name;
      const input = document.getElementById('search-input');
      const cb    = document.getElementById('search-clear');
      if (input) input.value = name;
      if (cb)    cb.hidden = false;
      state.searchQuery = name;
      hideSuggestions();
      state.showAll = true;
      sync();
    });
  });

  ul.hidden = false;
  input?.setAttribute('aria-expanded', 'true');
}

function hideSuggestions() {
  const ul    = document.getElementById('search-suggestions');
  const input = document.getElementById('search-input');
  if (ul)    ul.hidden = true;
  input?.setAttribute('aria-expanded', 'false');
  state.activeSuggestionIndex = -1;
}

function highlightSuggestion(items) {
  items.forEach((li, i) => li.setAttribute('aria-selected', i === state.activeSuggestionIndex ? 'true' : 'false'));
}

/* =====================================================
   Sync (re-render everything)
   ===================================================== */
function sync() {
  renderDistrictButtons();
  updateCategoryButtons();
  updateFilterTags();
  renderResults();
}

function updateCategoryButtons() {
  document.querySelectorAll('.category-btn').forEach(btn => {
    const cat = btn.dataset.category;
    const active = cat === 'all'
      ? (!state.selectedCategory && state.showAll && !state.selectedDistrict && !state.searchQuery)
      : state.selectedCategory === cat;
    btn.setAttribute('aria-pressed', active ? 'true' : 'false');
  });
}

/* =====================================================
   Filter Tags
   ===================================================== */
function updateFilterTags() {
  const sec  = document.getElementById('filter-section');
  const tags = document.getElementById('filter-tags');
  if (!sec || !tags) return;

  const items = [];
  if (state.selectedDistrict)  items.push({ label: `行政區：${state.selectedDistrict}`,  key: 'district' });
  if (state.selectedCategory)  items.push({ label: `資源分類：${CATEGORY_LABELS[state.selectedCategory] || state.selectedCategory}`, key: 'category' });
  if (state.searchQuery)       items.push({ label: `關鍵字：${state.searchQuery}`, key: 'search' });

  sec.hidden = items.length === 0;
  tags.innerHTML = items.map(item => `
    <span class="filter-tag">
      ${esc(item.label)}
      <button class="filter-tag-remove" aria-label="移除${esc(item.label)}" data-key="${item.key}">✕</button>
    </span>`).join('');

  tags.querySelectorAll('.filter-tag-remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.key;
      if (key === 'district') { state.selectedDistrict = null; }
      else if (key === 'category') { state.selectedCategory = null; }
      else if (key === 'search') {
        state.searchQuery = '';
        const input = document.getElementById('search-input');
        const cb    = document.getElementById('search-clear');
        if (input) input.value = '';
        if (cb)    cb.hidden = true;
      }
      if (!state.selectedDistrict && !state.selectedCategory && !state.searchQuery) state.showAll = false;
      sync();
    });
  });
}

function clearAll() {
  state.selectedDistrict = null;
  state.selectedCategory = null;
  state.searchQuery = '';
  state.showAll = false;
  const input = document.getElementById('search-input');
  const cb    = document.getElementById('search-clear');
  if (input) input.value = '';
  if (cb)    cb.hidden = true;
  hideSuggestions();
  sync();
}

/* =====================================================
   Results
   ===================================================== */
function getFiltered() {
  const { selectedDistrict, selectedCategory, searchQuery } = state;

  const showType = t => !selectedCategory || selectedCategory === t;
  const matchDistrict = d => !selectedDistrict || d === selectedDistrict;

  let items = [];

  // Venues (sports-center + sports-park)
  state.data.venues.forEach(v => {
    if (v.type !== 'sports-center' && v.type !== 'sports-park') return;
    if (!showType(v.type)) return;
    // "全市" cards only show when no district selected
    if (selectedDistrict && (v.district === '全市' || v.district !== selectedDistrict)) return;
    items.push(v);
  });

  // Parks
  if (showType('park')) {
    state.data.parks.forEach(p => {
      if (!matchDistrict(p.district)) return;
      items.push({ ...p, type: 'park' });
    });
  }

  // Schools
  if (showType('school')) {
    state.data.schools.forEach(s => {
      if (!matchDistrict(s.district)) return;
      items.push({
        ...s,
        type: 'school',
        id: `school-${s.district}`,
        nameZh: `${s.district}可運動學校`,
        nameEn: ''
      });
    });
  }

  // Courses — city-wide; appear regardless of district
  if (showType('course')) {
    state.data.courses.forEach(c => items.push({ ...c, district: '全市' }));
  }

  // Search filter
  if (searchQuery) {
    const lq = searchQuery.toLowerCase();
    items = items.filter(item =>
      [item.nameZh, item.nameEn, item.district, item.address,
        item.summary, item.phone, item.notes,
        ...(item.facilities       || []),
        ...(item.otherFacilities  || []),
        ...(item.seniorBenefits   || [])
      ].some(f => f && String(f).toLowerCase().includes(lq))
    );
  }

  return items;
}

function renderResults() {
  const promptSec  = document.getElementById('prompt-section');
  const resultsSec = document.getElementById('results-section');
  const grid       = document.getElementById('results-grid');
  const countEl    = document.getElementById('results-count');

  const hasFilter = state.selectedDistrict || state.selectedCategory || state.searchQuery || state.showAll;

  if (!hasFilter) {
    if (promptSec)  promptSec.hidden  = false;
    if (resultsSec) resultsSec.hidden = true;
    return;
  }

  if (promptSec)  promptSec.hidden  = true;
  if (resultsSec) resultsSec.hidden = false;

  if (!state.loaded) {
    if (grid) grid.innerHTML = '<p style="padding:1rem;color:var(--color-text-muted)">資料載入中⋯</p>';
    return;
  }

  const items = getFiltered();

  if (countEl) {
    const d = state.selectedDistrict;
    const q = state.searchQuery;
    if (d && q) countEl.textContent = `${d}中共有 ${items.length} 筆符合「${q}」的運動資源`;
    else if (d)  countEl.textContent = `${d}共有 ${items.length} 筆運動資源`;
    else if (q)  countEl.textContent = `共有 ${items.length} 筆符合「${q}」的結果`;
    else         countEl.textContent = `共有 ${items.length} 筆運動資源`;
  }

  if (grid) {
    if (items.length === 0) {
      grid.innerHTML = renderEmpty();
    } else {
      grid.innerHTML = items.map(renderCard).join('');
      attachCardListeners(grid);
    }
  }
}

function renderEmpty() {
  return `
    <div class="empty-state">
      <p class="empty-title">找不到符合條件的運動資源</p>
      <p class="empty-desc">請嘗試其他關鍵字、切換行政區，或清除目前的篩選條件。</p>
      <div class="empty-actions">
        <button class="action-btn" onclick="clearAll()">清除搜尋</button>
        <button class="action-btn action-btn-ghost" onclick="(function(){state.selectedDistrict=null;state.showAll=true;sync();})()">顯示全部行政區</button>
      </div>
    </div>`;
}

/* =====================================================
   Card Rendering
   ===================================================== */
function renderCard(item) {
  switch (item.type) {
    case 'sports-center':
    case 'sports-park':  return renderVenueCard(item);
    case 'park':         return renderParkCard(item);
    case 'school':       return renderSchoolCard(item);
    case 'course':       return renderCourseCard(item);
    default:             return '';
  }
}

function statusClass(status) {
  if (!status)                    return 'badge-other';
  if (status === '營運中')        return 'badge-active';
  if (/建|整/.test(status))       return 'badge-construction';
  if (/部分/.test(status))        return 'badge-partial';
  return 'badge-other';
}

function renderVenueCard(v) {
  const typeLabel = CATEGORY_LABELS[v.type] || v.type;
  const facTags   = (v.facilities || []).slice(0, 6).map(f => `<span class="facility-tag">${esc(f)}</span>`).join('');

  const metaRows = [];
  if (v.address && v.address !== '待補')
    metaRows.push(`<div class="meta-row"><img src="./assets/icons/location.svg" class="meta-icon" alt="地址"><span>${esc(v.address)}</span></div>`);
  if (v.phone && v.phone !== '待補')
    metaRows.push(`<div class="meta-row"><img src="./assets/icons/phone.svg" class="meta-icon" alt="電話"><span>${esc(v.phone)}</span></div>`);
  if (v.hours)
    metaRows.push(`<div class="meta-row"><img src="./assets/icons/clock.svg" class="meta-icon" alt="時間"><span>${esc(v.hours)}</span></div>`);

  const actions = [];
  if (v.phone && v.phone !== '待補') {
    const num = v.phone.replace(/[^\d+]/g, '').split('/')[0];
    actions.push(`<a href="tel:${esc(num)}" class="card-btn btn-phone">📞 撥打電話</a>`);
  }
  if (v.website && v.website !== '#course-link-placeholder' && v.website.startsWith('http'))
    actions.push(`<a href="${esc(v.website)}" target="_blank" rel="noopener noreferrer" class="card-btn btn-web">🌐 官方網站</a>`);
  if (v.facebook)
    actions.push(`<a href="${esc(v.facebook)}" target="_blank" rel="noopener noreferrer" class="card-btn btn-fb">Facebook</a>`);

  // Accordion items
  const accordItems = [];
  if (v.seniorBenefits?.length)  accordItems.push(accordion('長者優惠與公益時段', v.seniorBenefits));
  if (v.facilities?.length)      accordItems.push(accordion('場館設施', v.facilities));
  if (v.localBenefits?.length)   accordItems.push(accordion('里民優惠', v.localBenefits));
  if (v.notes)                   accordItems.push(accordion('注意事項', [v.notes]));

  const detailsId = `details-${v.id}`;
  const hasDetails = accordItems.length > 0;

  if (hasDetails)
    actions.push(`<button class="card-btn btn-expand" aria-expanded="false" aria-controls="${detailsId}">查看詳細 <span class="accordion-chevron" aria-hidden="true">▼</span></button>`);

  return `
    <article class="card" id="card-${esc(v.id)}" data-type="${esc(v.type)}">
      <div class="card-header">
        <div class="card-badges">
          <span class="badge badge-type">${esc(typeLabel)}</span>
          ${v.status ? `<span class="badge ${statusClass(v.status)}">${esc(v.status)}</span>` : ''}
        </div>
        <h3 class="card-title">${esc(v.nameZh)}</h3>
        ${v.nameEn ? `<p class="card-subtitle">${esc(v.nameEn)}</p>` : ''}
        <span class="card-district">📍 ${esc(v.district)}</span>
      </div>
      ${v.summary ? `<div class="card-summary">${esc(v.summary)}</div>` : ''}
      ${metaRows.length ? `<div class="card-meta">${metaRows.join('')}</div>` : ''}
      ${facTags ? `<div class="card-facilities">${facTags}</div>` : ''}
      <div class="card-actions">${actions.join('')}</div>
      ${hasDetails ? `<div class="card-details" id="${detailsId}" hidden>${accordItems.join('')}</div>` : ''}
    </article>`;
}

function accordion(title, items) {
  const id = `acc-${Math.random().toString(36).slice(2, 8)}`;
  const body = Array.isArray(items)
    ? `<ul>${items.map(i => `<li>${esc(i)}</li>`).join('')}</ul>`
    : `<p>${esc(items)}</p>`;
  return `
    <div class="accordion-item">
      <button class="accordion-btn" aria-expanded="false" aria-controls="${id}">
        ${esc(title)} <span class="accordion-chevron" aria-hidden="true">▼</span>
      </button>
      <div class="accordion-content" id="${id}" hidden>${body}</div>
    </div>`;
}

function renderParkCard(p) {
  const insideFacilities = Array.isArray(p.facilities) ? p.facilities : [];
  const otherFacilities = Array.isArray(p.otherFacilities) ? p.otherFacilities : [];

  const insideText = insideFacilities.length
    ? insideFacilities.join('、')
    : '園內設施資料待補';

  const otherBlock = otherFacilities.length
    ? `<p><strong>其他設施：</strong>${esc(otherFacilities.join('、'))}</p>`
    : '';

  return `
    <article class="card park-card" id="card-${esc(p.id)}" data-type="park">
      <div class="card-header">
        <div class="card-badges"><span class="badge badge-type">公園</span></div>
        <h3 class="card-title">${esc(p.nameZh)}</h3>
        <span class="card-district">📍 ${esc(p.district)}</span>
      </div>
      <div class="park-description">
        <p><strong>園內設施：</strong>${esc(insideText)}</p>
        ${otherBlock}
      </div>
    </article>`;
}

function renderSchoolCard(s) {
  const url = s.queryUrl || '#school-link-placeholder';
  const hasUrl = /^https?:\/\//.test(url);
  return `
    <article class="card" id="card-school-${esc(s.district)}" data-type="school">
      <div class="card-header">
        <div class="card-badges"><span class="badge badge-type">可運動的學校</span></div>
        <h3 class="card-title">${esc(s.district)}可運動學校</h3>
        <span class="card-district">📍 ${esc(s.district)}</span>
      </div>
      <div class="school-info-box">
        <span class="school-count">${s.count} 間</span>
        <p class="school-note">${esc(s.notes || '學校名稱與詳細開放資訊請至教育局查詢。')}</p>
        ${hasUrl ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"
           class="card-btn btn-web" style="display:inline-flex;text-decoration:none;align-self:flex-start;">
          🔍 前往可運動學校查詢頁面
        </a>` : `<span class="school-note">可運動學校查詢網址待補</span>`}
      </div>
    </article>`;
}

function renderCourseCard(c) {
  const url = c.url || '#course-link-placeholder';
  const hasUrl = /^https?:\/\//.test(url);
  return `
    <article class="card" id="card-${esc(c.id)}" data-type="course">
      <div class="card-header">
        <div class="card-badges">
          <span class="badge badge-type">運動i臺灣課程</span>
          <span class="badge badge-active">運動i臺灣計畫</span>
        </div>
        <h3 class="card-title">${esc(c.nameZh)}</h3>
        <span class="card-district">📍 全市</span>
      </div>
      <div class="course-body">
        <p class="course-desc">${esc(c.summary || '簡介內容待補。')}</p>
        ${hasUrl ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer"
           class="card-btn btn-web" style="display:inline-flex;text-decoration:none;align-self:flex-start;">
          查看完整課程資訊
        </a>` : `<span class="course-desc">課程網址待補</span>`}
      </div>
    </article>`;
}

/* =====================================================
   Card Event Listeners
   ===================================================== */
function attachCardListeners(container) {
  // Expand / collapse full details
  container.querySelectorAll('.btn-expand').forEach(btn => {
    btn.addEventListener('click', () => {
      const id      = btn.getAttribute('aria-controls');
      const details = document.getElementById(id);
      if (!details) return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !open);
      details.hidden = open;
      btn.innerHTML = open
        ? '查看詳細 <span class="accordion-chevron" aria-hidden="true">▼</span>'
        : '收起詳細 <span class="accordion-chevron" aria-hidden="true" style="transform:rotate(180deg)">▼</span>';
    });
  });

  // Inner accordion items
  container.querySelectorAll('.accordion-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id  = btn.getAttribute('aria-controls');
      const con = document.getElementById(id);
      if (!con) return;
      const open = btn.getAttribute('aria-expanded') === 'true';
      btn.setAttribute('aria-expanded', !open);
      con.hidden = open;
    });
  });
}

/* =====================================================
   Utility
   ===================================================== */
function esc(str) {
  if (str == null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
