
'use strict';

let allVenues = [];
let workingVenues = [];
let changedIds = new Set();

const $ = id => document.getElementById(id);

document.addEventListener('DOMContentLoaded', () => {
  $('admin-login-btn')?.addEventListener('click', login);
  $('admin-password')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') login();
  });
  $('record-select')?.addEventListener('change', loadSelectedRecord);
  $('new-record-btn')?.addEventListener('click', newRecord);
  $('record-form')?.addEventListener('submit', saveRecord);
  $('download-json-btn')?.addEventListener('click', downloadJSON);
});

async function sha256(text) {
  const bytes = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(b => b.toString(16).padStart(2, '0')).join('');
}

async function login() {
  const config = window.MOBILE_GYM_ADMIN_CONFIG || {};
  const input = $('admin-password');
  const msg = $('login-message');
  const value = String(input?.value || '');

  if (!value) {
    showMessage(msg, '請輸入維護密碼。', true);
    return;
  }

  const digest = await sha256(value);
  if (!config.passwordSha256 || digest !== config.passwordSha256) {
    showMessage(msg, '密碼不正確。', true);
    return;
  }

  sessionStorage.setItem('mobile-gym-admin-ok', '1');
  showMessage(msg, '驗證成功，正在載入資料。', false);

  try {
    await loadData();
    $('login-panel').hidden = true;
    $('editor-panel').hidden = false;
  } catch (error) {
    showMessage(msg, `資料載入失敗：${error.message}`, true);
  }
}

async function loadData() {
  const response = await fetch('./data/venues.json', { cache: 'no-store' });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  allVenues = await response.json();
  workingVenues = structuredClone(allVenues);
  populateSelect();
}

function mobileRecords() {
  return workingVenues.filter(item => item.type === 'mobile-gym');
}

function populateSelect(preferredId = '') {
  const select = $('record-select');
  const records = mobileRecords().sort((a, b) =>
    `${a.vehicle}-${a.weekday}-${a.hours}-${a.district}`.localeCompare(
      `${b.vehicle}-${b.weekday}-${b.hours}-${b.district}`, 'zh-TW'
    )
  );

  select.innerHTML = records.map(item =>
    `<option value="${escapeHtml(item.id)}">${escapeHtml(item.district)}｜${escapeHtml(item.locationName)}｜${escapeHtml(item.dates)}</option>`
  ).join('');

  if (preferredId && records.some(r => r.id === preferredId)) {
    select.value = preferredId;
  }
  loadSelectedRecord();
}

function loadSelectedRecord() {
  const id = $('record-select').value;
  const item = workingVenues.find(v => v.id === id);
  if (!item) return;

  $('field-id').value = item.id || '';
  $('field-district').value = item.district || '';
  $('field-vehicle').value = item.vehicle || 'A車';
  $('field-serviceType').value = item.serviceType || '一般據點';
  $('field-weekday').value = item.weekday || '';
  $('field-hours').value = item.hours || '';
  $('field-dates').value = item.dates || '';
  $('field-activeUntil').value = toLocalDateTimeValue(item.activeUntil);
  $('field-locationName').value = item.locationName || '';
  $('field-address').value = item.address || '';
  $('field-provider').value = item.provider || '';
  $('field-contactName').value = item.contactName || '';
  $('field-phone').value = item.phone || '';
  $('field-officialUrl').value = item.officialUrl || '';
  $('field-notes').value = item.notes || '';
}

function newRecord() {
  const id = `mobile-custom-${Date.now()}`;
  const item = {
    id,
    type: 'mobile-gym',
    status: '115年第二階段',
    district: '',
    nameZh: '行動健身房巡迴車',
    nameEn: '',
    summary: '',
    vehicle: 'A車',
    serviceType: '一般據點',
    weekday: '',
    hours: '',
    dates: '',
    locationName: '',
    provider: '',
    address: '',
    mapsUrl: '',
    contactName: '',
    phone: '',
    activeUntil: '',
    officialUrl: 'https://sports.kcg.gov.tw/EventSite/index.aspx?SiteId=d1d9d431-67a7-4921-be53-f76d96967378',
    facilities: ['行動健身房巡迴服務', '社區運動據點'],
    searchKeywords: [],
    notes: '實際服務日期及現場安排，請以主辦單位最新公告為準。'
  };
  workingVenues.push(item);
  changedIds.add(id);
  populateSelect(id);
  updateCount();
  showMessage($('editor-message'), '已建立新據點草稿，請填寫後按「儲存這筆修改」。', false);
}

function saveRecord(event) {
  event.preventDefault();

  const id = $('field-id').value;
  const item = workingVenues.find(v => v.id === id);
  if (!item) return;

  item.district = $('field-district').value.trim();
  item.vehicle = $('field-vehicle').value;
  item.serviceType = $('field-serviceType').value;
  item.weekday = $('field-weekday').value.trim();
  item.hours = $('field-hours').value.trim();
  item.dates = $('field-dates').value.trim();
  item.activeUntil = fromLocalDateTimeValue($('field-activeUntil').value);
  item.locationName = $('field-locationName').value.trim();
  item.address = $('field-address').value.trim();
  item.provider = $('field-provider').value.trim();
  item.contactName = $('field-contactName').value.trim();
  item.phone = $('field-phone').value.trim();
  item.officialUrl = $('field-officialUrl').value.trim();
  item.notes = $('field-notes').value.trim();

  item.nameZh = `${item.district}行動健身房巡迴車`;
  item.mapsUrl = item.address
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(item.address)}`
    : '';
  item.registrationNotice =
    `為掌握長輩運動前後測狀況，課程採事先報名制，報名請洽據點「${item.locationName || '運動據點'}」。`;
  item.summary =
    `${item.vehicle}${item.serviceType === '身障據點' ? '身障據點' : ''}於${item.weekday}${item.hours}巡迴至${item.district}，服務日期為${item.dates}，運動據點為${item.locationName}。`;
  item.searchKeywords = [
    '行動健身房', '巡迴車', item.vehicle, item.serviceType,
    item.weekday, item.hours, item.dates, item.locationName,
    item.provider, item.address, item.contactName, item.phone,
    '事先報名', '電話報名', '前後測'
  ].filter(Boolean);

  changedIds.add(id);
  populateSelect(id);
  updateCount();
  showMessage($('editor-message'), '這筆資料已儲存在本次編輯內容中。完成後請下載 venues.json。', false);
}

function downloadJSON() {
  if (!workingVenues.length) return;

  const text = JSON.stringify(workingVenues, null, 2);
  const blob = new Blob([text], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'venues.json';
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);

  showMessage($('editor-message'), '已下載 venues.json，請交由局方覆蓋網站 data/venues.json。', false);
}

function updateCount() {
  $('change-count').textContent = String(changedIds.size);
}

function showMessage(el, text, isError) {
  if (!el) return;
  el.textContent = text;
  el.classList.toggle('is-error', !!isError);
  el.classList.toggle('is-success', !isError && !!text);
}

function toLocalDateTimeValue(value) {
  if (!value) return '';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const pad = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromLocalDateTimeValue(value) {
  if (!value) return '';
  // Taiwan website: store explicit +08:00 so public expiry is deterministic.
  return `${value}:00+08:00`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
