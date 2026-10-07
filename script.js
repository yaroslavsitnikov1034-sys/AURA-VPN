'use strict';

const APP_LINKS = {
  android: 'https://play.google.com/store/apps/details?id=com.v2raytun.android',
  ios: 'https://apps.apple.com/ru/app/v2ray-vpn-%D0%B2%D0%BF%D0%BD-v2raytun/id6798667599'
};
const DEMO_VLESS = 'vless://demo@example.com:443?encryption=none&security=tls&type=ws&host=example.com&path=%2Fvpn#AURA-Demo';
const TARIFFS = {
  month: {name:'1 месяц', price:150, days:30},
  three: {name:'3 месяца', price:400, days:90},
  year: {name:'1 год', price:1500, days:365}
};

const $ = (s) => document.querySelector(s);
let state = {connected:false, subscription:null};

function detectDevice(){
  const ua = navigator.userAgent || '';
  if(/android/i.test(ua)) return 'android';
  if(/iphone|ipad|ipod/i.test(ua)) return 'ios';
  return 'desktop';
}

function saveState(){
  try{ localStorage.setItem('aura_minimal_state', JSON.stringify({subscription:state.subscription})); }catch(e){}
}
function loadState(){
  try{
    const raw = localStorage.getItem('aura_minimal_state');
    if(raw) state.subscription = JSON.parse(raw).subscription || null;
  }catch(e){}
}
function escapeHtml(value){
  return String(value).replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
}
function showToast(message){
  const el = $('#toast');
  el.textContent = message;
  el.classList.add('is-visible');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => el.classList.remove('is-visible'), 2400);
}
function openExternal(url){
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  document.body.appendChild(a);
  a.click();
  a.remove();
}

function openStore(device){
  const url = APP_LINKS[device];
  if(url) window.location.assign(url);
}

function copyAndOpenV2RayTun(device){
  const deepLink = `v2raytun://import/${encodeURIComponent(DEMO_VLESS)}`;
  let leftPage = false;
  const onVisibility = () => { if(document.hidden) leftPage = true; };
  document.addEventListener('visibilitychange', onVisibility, {once:true});
  window.addEventListener('pagehide', () => { leftPage = true; }, {once:true});

  try{
    if(navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(DEMO_VLESS).catch(()=>{});
  }catch(e){}

  showToast('Ключ скопирован');
  window.location.href = deepLink;

  setTimeout(() => {
    if(!leftPage && document.visibilityState === 'visible') openStore(device);
  }, 2200);
}

function updateConnectionState(){
  $('#statusText').textContent = state.connected ? 'Подключено' : 'Не подключено';
  $('#statusText').classList.toggle('is-connected', state.connected);
  $('#connectBtn').classList.toggle('is-connected', state.connected);
  $('#connectLabel').textContent = state.connected ? 'Отключиться' : 'Подключиться';
}

function openModal({step='', title, body, actions=[]}){
  $('#modalStep').textContent = step;
  $('#modalTitle').textContent = title;
  $('#modalBody').innerHTML = body;
  const wrap = $('#modalActions');
  wrap.innerHTML = '';

  actions.forEach(action => {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = action.label;
    button.className = action.primary ? 'primary' : 'ghost';
    button.addEventListener('click', async () => {
      const keepOpen = action.onClick ? await action.onClick() : false;
      if(!keepOpen) closeModal();
    });
    wrap.appendChild(button);
  });

  $('#modal').classList.add('is-open');
  $('#modal').setAttribute('aria-hidden','false');
}
function closeModal(){
  $('#modal').classList.remove('is-open');
  $('#modal').setAttribute('aria-hidden','true');
}

function showTariffs(){
  const cards = Object.entries(TARIFFS).map(([code,t]) => `
    <div class="tariff-option">
      <strong>${escapeHtml(t.name)}</strong>
      <span>${t.price.toLocaleString('ru-RU')} ₽</span>
      <button type="button" data-tariff-code="${code}">Выбрать</button>
    </div>
  `).join('');

  openModal({
    step:'AURA PLANS',
    title:'Выберите тариф',
    body:`<div class="tariff-list">${cards}</div>`,
    actions:[{label:'Закрыть',primary:false}]
  });

  document.querySelectorAll('[data-tariff-code]').forEach(button => {
    button.addEventListener('click', () => handlePurchase(button.dataset.tariffCode));
  });
}

function handlePurchase(code){
  const t = TARIFFS[code];
  if(!t) return;
  openModal({
    step:'Покупка тарифа',
    title:t.name,
    body:`<p>Стоимость: <strong>${t.price.toLocaleString('ru-RU')} ₽</strong>.</p><p>Сейчас оформление работает в демо-режиме. Реальная оплата подключается через серверную часть.</p>`,
    actions:[
      {label:'Назад',primary:false,onClick:()=>{showTariffs();return true;}},
      {label:'Продолжить',primary:true,onClick:()=>{activateSubscription(t);return false;}}
    ]
  });
}
function activateSubscription(t){
  const expires = new Date(Date.now() + t.days*86400000).toISOString();
  state.subscription = {name:t.name,price:t.price,expires};
  saveState();
  showToast(`Тариф «${t.name}» выбран`);
}

function startDesktopWizard(){
  openModal({
    step:'Шаг 1 из 3',
    title:'Проверка конфигурации',
    body:'<p>Проверяем формат подключения и готовим конфигурацию для ПК.</p><div class="key">VLESS ✓<br>Конфигурация готова к импорту.</div>',
    actions:[
      {label:'Закрыть',primary:false},
      {label:'Далее',primary:true,onClick:()=>{showDesktopInstall();return true;}}
    ]
  });
}
function showDesktopInstall(){
  openModal({
    step:'Шаг 2 из 3',
    title:'Установка клиента',
    body:'<p>Откройте совместимый VLESS-клиент на ПК. Сайт не устанавливает приложения автоматически.</p>',
    actions:[
      {label:'Назад',primary:false,onClick:()=>{startDesktopWizard();return true;}},
      {label:'Далее',primary:true,onClick:()=>{showDesktopConfig();return true;}}
    ]
  });
}
function showDesktopConfig(){
  openModal({
    step:'Шаг 3 из 3',
    title:'Ваша конфигурация',
    body:`<p>Скопируйте VLESS-конфигурацию и импортируйте её в клиент.</p><div class="key">${escapeHtml(DEMO_VLESS)}</div>`,
    actions:[
      {label:'Скопировать',primary:false,onClick:async()=>{try{await navigator.clipboard.writeText(DEMO_VLESS);showToast('Ключ скопирован');}catch(e){showToast('Скопируйте ключ вручную');}return true;}},
      {label:'Готово',primary:true}
    ]
  });
}

function handleConnect(){
  const device = detectDevice();
  if(device === 'android' || device === 'ios'){
    copyAndOpenV2RayTun(device);
    return;
  }
  if(state.connected){
    state.connected = false;
    updateConnectionState();
    showToast('Соединение отключено');
    return;
  }
  startDesktopWizard();
}

$('#connectBtn').addEventListener('click', handleConnect);
$('#tariffBtn').addEventListener('click', showTariffs);
$('#modal .modal__backdrop').addEventListener('click', closeModal);

loadState();
updateConnectionState();
