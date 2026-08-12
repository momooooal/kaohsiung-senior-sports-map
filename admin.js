
'use strict';

document.addEventListener('DOMContentLoaded', () => {
  const config = window.RESOURCE_REQUEST_CONFIG || {};
  const portalUrl = String(config.portalUrl || '').trim();
  const isConfigured = /^https:\/\/script\.google\.com\/macros\/s\/.+\/exec/.test(portalUrl);

  const params = new URLSearchParams(location.search);
  const type = params.get('type') || '';
  const id = params.get('id') || '';
  const name = params.get('name') || '';

  const status = document.getElementById('portal-status');
  const prefilled = document.getElementById('prefilled-request');
  const prefilledName = document.getElementById('prefilled-name');

  if (name && prefilledName) {
    prefilledName.textContent = `申請修改：${name}`;
  } else if (!id && prefilled) {
    prefilled.hidden = true;
  }

  if (!isConfigured) {
    if (status) status.hidden = false;
    document.querySelectorAll('.admin-request-card').forEach(link => {
      link.addEventListener('click', event => {
        event.preventDefault();
        alert('審核服務尚未完成一次性部署，請洽網站管理人員。');
      });
    });
    return;
  }

  if (prefilled && id) {
    const u = new URL(portalUrl);
    u.searchParams.set('action', 'request');
    u.searchParams.set('mode', 'update');
    u.searchParams.set('type', type);
    u.searchParams.set('id', id);
    prefilled.href = u.toString();
  }

  document.querySelectorAll('[data-new-type]').forEach(link => {
    const u = new URL(portalUrl);
    u.searchParams.set('action', 'request');
    u.searchParams.set('mode', 'add');
    u.searchParams.set('type', link.dataset.newType);
    link.href = u.toString();
  });
});
