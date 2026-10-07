'use strict';

const SUPPORT_URL = 'https://t.me/AURA_supp0rt';
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

const $ = (s, root=document) => root.querySelector(s);
const $$ = (s, root=document) => [...root.querySelectorAll(s)];
let state = { connected:false, connectStart:null, subscription:null };
let timer = null;
let speedTimer = null;

function loadState(){
  try { const raw=localStorage.getItem('aura_clean_state'); if(raw) state={...state,...JSON.parse(raw)}; }
  catch(e){}
  // A real OS-level VPN state cannot be safely inferred from a static GitHub Pages site.
  state.connected=false;
  state.connectStart=null;
}
function saveState(){ try{ localStorage.setItem('aura_clean_state', JSON.stringify({subscription:state.subscription})); }catch(e){} }
function escapeHtml(value){ return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c])); }
function openExternal(url){ const a=document.createElement('a'); a.href=url; a.target='_blank'; a.rel='noopener noreferrer'; document.body.appendChild(a); a.click(); a.remove(); }
function detectDevice(){ const ua=navigator.userAgent||''; if(/android/i.test(ua)) return 'android'; if(/iphone|ipad|ipod/i.test(ua)) return 'ios'; return 'desktop'; }
function openStore(device){
  const url=APP_LINKS[device];
  if(!url) return;
  window.location.assign(url);
}
function applyMobileLayout(){
  const device=detectDevice();
  document.documentElement.classList.toggle('is-mobile-device',device!=='desktop');
}
applyMobileLayout();
window.addEventListener('resize',applyMobileLayout);
function showToast(message){ const el=$('#toast'); el.textContent=message; el.classList.add('is-visible'); clearTimeout(showToast.t); showToast.t=setTimeout(()=>el.classList.remove('is-visible'),2400); }
function showModal({step='',title,body,actions=[]}){
  $('#modalStep').textContent=step;
  $('#modalTitle').textContent=title;
  $('#modalBody').innerHTML=body;
  const actionsEl=$('#modalActions'); actionsEl.innerHTML='';
  actions.forEach(a=>{
    const btn=document.createElement('button'); btn.textContent=a.label; btn.className=a.primary?'primary':'ghost';
    btn.addEventListener('click',()=>{
      const keepOpen=a.onClick ? a.onClick() : false;
      if(!keepOpen) closeModal();
    });
    actionsEl.appendChild(btn);
  });
  $('#modal').classList.add('is-open'); $('#modal').setAttribute('aria-hidden','false');
}
function closeModal(){ $('#modal').classList.remove('is-open'); $('#modal').setAttribute('aria-hidden','true'); }
function switchPage(id){
  $$('.page').forEach(p=>p.classList.toggle('page--active',p.id===`page-${id}`));
  $$('.nav-item').forEach(n=>n.classList.toggle('nav-item--active',n.dataset.page===id));
  if(id==='subscription') renderSubscription();
  if(id==='profile') renderProfile();
  window.scrollTo({top:0,behavior:'smooth'});
}
function updateHome(){
  const status=$('#statusBar'); const label=$('#statusText'); const btn=$('#connectBtn');
  status.classList.toggle('status--connected',state.connected); label.textContent=state.connected?'Подключено':'Не подключено';
  btn.classList.toggle('connected',state.connected);
  $('#profileState').textContent=state.connected?'Подключение активно':(state.subscription?`Тариф: ${state.subscription.name}`:'Аккаунт не подключён');
  if(state.connected){
    $('#connectLabel').textContent='Отключить'; $('#ipValue').textContent=' защищено'; $('#serverValue').textContent='AURA Global'; $('#pingValue').textContent='—';
  } else {
    $('#connectLabel').textContent='Подключить'; $('#connectTimer').textContent='00:00:00'; $('#ipValue').textContent='—'; $('#serverValue').textContent='—'; $('#pingValue').textContent='—';
  }
}
function startConnectTimer(){ clearInterval(timer); state.connectStart=Date.now(); $('#connectTimer').style.display='block'; timer=setInterval(()=>{const s=Math.floor((Date.now()-state.connectStart)/1000); const h=String(Math.floor(s/3600)).padStart(2,'0'); const m=String(Math.floor((s%3600)/60)).padStart(2,'0'); const sec=String(s%60).padStart(2,'0'); $('#connectTimer').textContent=`${h}:${m}:${sec}`;},1000); }
function stopConnectTimer(){ clearInterval(timer); timer=null; $('#connectTimer').style.display='none'; }

function startWizard(){
  const device=detectDevice();
  showModal({step:'Шаг 1 из 3',title:'Проверка конфигурации',body:`<p>Проверяем формат подключения и подготавливаем инструкции для <strong>${device==='android'?'Android':device==='ios'?'iPhone / iPad':'ПК'}</strong>.</p><div class="key">VLESS ✓<br>Конфигурация готова к импорту.</div>`,actions:[
    {label:'Отмена',primary:false},
    {label:'Далее',primary:true,onClick:()=>{showInstallStep(device);return true;}}
  ]});
}
function showInstallStep(device){
  let body='';
  if(device==='android') body=`<p>Установите v2RayTun из Google Play. На странице приложения можно импортировать конфигурацию из буфера обмена или по ссылке.</p>`;
  else if(device==='ios') body=`<p>Откройте App Store и установите совместимый клиент. После установки вернитесь сюда и продолжите настройку.</p>`;
  else body=`<p>На ПК откройте совместимый VLESS-клиент. Этот сайт не устанавливает приложения автоматически.</p>`;
  const actions=[{label:'Назад',primary:false,onClick:()=>{startWizard();return true;}}];
  if(device==='android') actions.push({label:'Google Play',primary:true,onClick:()=>{openExternal(APP_LINKS.android);return true;}});
  else if(device==='ios') actions.push({label:'App Store',primary:true,onClick:()=>{openExternal(APP_LINKS.ios);return true;}});
  actions.push({label:'Далее',primary:true,onClick:()=>{showConfigStep();return true;}});
  showModal({step:'Шаг 2 из 3',title:'Установка клиента',body,actions});
}
function showConfigStep(){
  showModal({step:'Шаг 3 из 3',title:'Ваша конфигурация',body:`<p>Скопируйте VLESS-конфигурацию и импортируйте её в выбранный клиент.</p><div class="key" id="vlessKey">${escapeHtml(DEMO_VLESS)}</div><p style="margin-top:10px">В демо-версии ключ тестовый. Для реального подключения нужен сервер и выданная сервером конфигурация.</p>`,actions:[
    {label:'Скопировать',primary:false,onClick:async()=>{try{await navigator.clipboard.writeText(DEMO_VLESS);showToast('Конфигурация скопирована');}catch(e){showToast('Скопируйте ключ вручную');}return true;}},
    {label:'Завершить',primary:true,onClick:()=>{showConnectionInfo();return true;}}
  ]});
}
function showConnectionInfo(){
  showModal({step:'Готово',title:'Проверка завершена',body:`<p>Браузер не может достоверно проверить состояние VPN-клиента в другой программе.</p><div class="key">После импорта включите соединение в клиенте.</div>`,actions:[
    {label:'Закрыть',primary:false},
    {label:'Я подключился',primary:true,onClick:()=>{state.connected=true;startConnectTimer();updateHome();showToast('Статус соединения обновлён');switchPage('home');return false;}}
  ]});
}

function handleConnect(){
  const device=detectDevice();
  if(device==='android' || device==='ios'){
    openStore(device);
    return;
  }
  if(state.connected){state.connected=false;stopConnectTimer();updateHome();showToast('Соединение отключено');return;}
  startWizard();
}
function handlePurchase(code){
  const t=TARIFFS[code]; if(!t)return;
  showModal({step:'Покупка тарифа',title:t.name,body:`<p>Стоимость: <strong>${t.price.toLocaleString('ru-RU')} ₽</strong>.</p><p>Ниже используется демонстрационное оформление: реальная оплата требует подключённого платёжного сервиса и серверной части.</p>`,actions:[
    {label:'Отмена',primary:false},
    {label:'Продолжить',primary:true,onClick:()=>{activateSubscription(t);return false;}}
  ]});
}
function activateSubscription(t){
  const expires=new Date(Date.now()+t.days*86400000).toISOString(); state.subscription={name:t.name,price:t.price,expires}; saveState(); renderSubscription(); showToast(`Тариф «${t.name}» активирован в демо-режиме`); switchPage('subscription'); }
function renderSubscription(){
  const el=$('#subscriptionCard');
  if(!state.subscription){el.innerHTML='<div class="empty">Активной подписки нет.<br>Выберите тариф, чтобы продолжить.</div>';return;}
  const date=new Date(state.subscription.expires).toLocaleDateString('ru-RU');
  el.innerHTML=`<h3>${escapeHtml(state.subscription.name)}</h3><p>${state.subscription.price.toLocaleString('ru-RU')} ₽ · демо-статус</p><span class="expiry">Действует до ${date}</span>`;
}
function renderProfile(){ updateHome(); }

function runSpeedTest(){
  clearTimeout(speedTimer); $('#speedBtn').disabled=true; $('#speedBtn').textContent='Тестируем…'; $('#speedNumber').textContent='0'; $('#speedBar').style.width='0%';
  let n=0; const target=72; const step=()=>{n+=3;if(n>=target){n=target;$('#speedNumber').textContent=n;$('#speedBar').style.width='86%';$('#speedPing').textContent='38 мс';$('#speedJitter').textContent='5 мс';$('#speedBtn').textContent='Повторить тест';$('#speedBtn').disabled=false;return}$('#speedNumber').textContent=n;$('#speedBar').style.width=Math.round(n/target*78)+'%';speedTimer=setTimeout(step,45)}; step();
}

$('#connectBtn').addEventListener('click',handleConnect);
$('#settingsBtn').addEventListener('click',()=>showModal({step:'AURA VPN',title:'Настройки',body:'<p>Сайт работает без обязательной привязки к Telegram и хранит только демо-состояние подписки в этом браузере.</p>',actions:[{label:'Закрыть',primary:true}]}));
$('#modalClose').addEventListener('click',closeModal); $('.modal__backdrop').addEventListener('click',closeModal);
$('#speedBtn').addEventListener('click',runSpeedTest);
$$('[data-page]').forEach(el=>el.addEventListener('click',()=>switchPage(el.dataset.page)));
$$('[data-action="support"]').forEach(el=>el.addEventListener('click',()=>openExternal(SUPPORT_URL)));
$$('[data-action="about"]').forEach(el=>el.addEventListener('click',()=>showModal({step:'О сервисе',title:'AURA VPN',body:'<p>AURA — интерфейс для управления подпиской и пошагового подключения. Публикация на GitHub Pages не заменяет сервер, оплату или выдачу реальных VPN-конфигураций.</p>',actions:[{label:'Понятно',primary:true}]})));
$$('.buy-btn').forEach(el=>el.addEventListener('click',e=>{e.stopPropagation();handlePurchase(el.dataset.tariff)}));
$$('.tariff').forEach(el=>el.addEventListener('click',e=>{if(!e.target.closest('.buy-btn'))handlePurchase(el.dataset.tariff)}));
$('.brand').addEventListener('click',()=>switchPage('home'));

loadState(); updateHome(); renderSubscription(); renderProfile();
