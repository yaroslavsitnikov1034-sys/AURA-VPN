/* ====================================================================
   AURA VPN — Telegram Web App
   ====================================================================
   Integration hooks (clearly marked with HOOK):
   1. PAYMENT SYSTEM  — onPaymentStart() / onPaymentSuccess()
   2. TELEGRAM BOT     — onBotSend()
   3. VPN SERVER       — onVPNConnect() / onVPNDisconnect()
   ==================================================================== */

const tg = (window.Telegram && window.Telegram.WebApp) ? window.Telegram.WebApp : null;

if (tg) {
    try { tg.expand(); tg.ready(); } catch (e) {}
    try { if (tg.setHeaderColor) tg.setHeaderColor('#0a0a0f'); } catch (e) {}
    try { if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0a0f'); } catch (e) {}
}

var isTelegramWebApp = !!tg;

/* ===== Global State ===== */
var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
var isConnected = false;
var isConnecting = false;
var connectStartTime = null;
var timerInterval = null;
var subscription = null;
var purchaseHistory = [];
var speedTestRunning = false;
var v2rayWizardCompleted = false;

var TARIFFS = {
    'tariff_1_month':  { label: '1 месяц',  price: 150,  days: 30,  code: 'tariff_1_month' },
    'tariff_3_months': { label: '3 месяца', price: 400,  days: 90,  code: 'tariff_3_months' },
    'tariff_1_year':   { label: '1 год',    price: 1500, days: 365, code: 'tariff_1_year' }
};

/* ===== Storage helpers ===== */
function saveState() {
    try {
        localStorage.setItem('aura_vpn_data', JSON.stringify({
            isConnected: isConnected,
            connectStartTime: connectStartTime,
            subscription: subscription,
            purchaseHistory: purchaseHistory,
            v2rayWizardCompleted: v2rayWizardCompleted
        }));
    } catch (e) {}
}

function loadState() {
    try {
        var raw = localStorage.getItem('aura_vpn_data');
        if (raw) {
            var data = JSON.parse(raw);
            isConnected = false;
            connectStartTime = null;
            subscription = data.subscription || null;
            purchaseHistory = data.purchaseHistory || [];
            v2rayWizardCompleted = false;
        }
    } catch (e) {}
}

/* ===== Haptics ===== */
function haptic(type) {
    try {
        if (!tg || !tg.HapticFeedback) return;
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
        else if (type === 'heavy') tg.HapticFeedback.impactOccurred('heavy');
        else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    } catch (e) {}
}

/* ===== Toast ===== */
var toastTimer = null;
function showToast(message, type) {
    var toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast toast--visible';
    if (type) toast.classList.add('toast--' + type);
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () {
        toast.className = 'toast';
    }, 2500);
}

/* ===== Modal ===== */
function showModal(title, body, actions) {
    var overlay = document.getElementById('modalOverlay');
    document.getElementById('modalTitle').textContent = title;
    document.getElementById('modalBody').innerHTML = body;

    var actionsEl = document.getElementById('modalActions');
    actionsEl.innerHTML = '';
    actions.forEach(function (action) {
        var btn = document.createElement('button');
        btn.textContent = action.label;
        if (action.style === 'primary') {
            btn.className = 'btn-buy';
        } else {
            btn.className = 'modal__btn-cancel';
        }
        btn.addEventListener('click', function () {
            var keepOpen = false;
            if (action.callback) {
                keepOpen = action.callback();
            }
            if (!keepOpen) closeModal();
        });
        actionsEl.appendChild(btn);
    });

    overlay.classList.add('modal-overlay--active');
    haptic('light');
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('modal-overlay--active');
}

document.getElementById('modalClose').addEventListener('click', closeModal);
document.getElementById('modalOverlay').addEventListener('click', function (e) {
    if (e.target === this) closeModal();
});

/* ===== Navigation ===== */
function switchPage(pageId) {
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('page--active');
    });
    document.querySelectorAll('.nav-item').forEach(function (n) {
        n.classList.remove('nav-item--active');
    });

    var page = document.getElementById('page-' + pageId);
    if (page) page.classList.add('page--active');

    var navItem = document.querySelector('.nav-item[data-page="' + pageId + '"]');
    if (navItem) navItem.classList.add('nav-item--active');

    haptic('light');

    if (pageId === 'subs') renderSubscriptionPage();
    if (pageId === 'profile') renderProfilePage();
    if (pageId === 'home') renderHomePage();
}

document.querySelectorAll('.nav-item').forEach(function (item) {
    item.addEventListener('click', function () {
        switchPage(this.getAttribute('data-page'));
    });
});

/* ===== VPN Timer ===== */
function formatTimer(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return (
        String(h).padStart(2, '0') + ':' +
        String(m).padStart(2, '0') + ':' +
        String(s).padStart(2, '0')
    );
}

function startTimer() {
    connectStartTime = Date.now();
    var timerEl = document.getElementById('connectTimer');
    timerEl.textContent = '00:00:00';
    timerInterval = setInterval(function () {
        var elapsed = Date.now() - connectStartTime;
        timerEl.textContent = formatTimer(elapsed);
    }, 1000);
}

function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
    connectStartTime = null;
    document.getElementById('connectTimer').textContent = '00:00:00';
}

/* ===== HOOK: VPN Server ===== */
function onVPNConnect() {
    // TODO: Replace with real VPN server API call
}

function onVPNDisconnect() {
    // TODO: Replace with real VPN disconnect API call
}

/* ===== HOOK: Telegram Bot ===== */
function onBotSend(data) {
    try {
        if (tg && tg.sendData) tg.sendData(String(data));
    } catch (e) {}
}

/* ===== HOOK: Payment System ===== */
function onPaymentStart(tariffCode, callback) {
    // TODO: Replace with real payment integration
    setTimeout(function () {
        callback(true);
    }, 50);
}

function onPaymentSuccess(tariffCode) {
    // TODO: Notify backend that payment succeeded
}

/* ===== Connect Button (Circular Dial) ===== */
var connectDial = document.getElementById('connectDial');
var btnConnect = document.getElementById('btnConnect');
var btnConnectLabel = document.getElementById('btnConnectLabel');
var dialStatusText = document.getElementById('dialStatusText');

function renderHomePage() {
    if (isConnected) {
        connectDial.classList.remove('connect-dial--connecting');
        connectDial.classList.add('connect-dial--connected');
        btnConnectLabel.textContent = 'Подключено';
        dialStatusText.textContent = 'Подключено';
        document.getElementById('statusBar').classList.add('status-bar--connected');
        document.getElementById('statusText').textContent = 'Подключено — Нидерланды';
        document.getElementById('connectionInfo').classList.add('connection-info--visible');
        document.getElementById('ipValue').textContent = '185.230.124.42';
        document.getElementById('serverValue').textContent = 'Амстердам, NL';
        document.getElementById('pingValue').textContent = '24 мс';

        if (connectStartTime && !timerInterval) {
            var timerEl = document.getElementById('connectTimer');
            timerInterval = setInterval(function () {
                var elapsed = Date.now() - connectStartTime;
                timerEl.textContent = formatTimer(elapsed);
            }, 1000);
        }
    } else {
        connectDial.classList.remove('connect-dial--connected');
        connectDial.classList.remove('connect-dial--connecting');
        btnConnectLabel.textContent = 'Подключить';
        document.getElementById('statusBar').classList.remove('status-bar--connected');
        document.getElementById('statusText').textContent = 'Не подключено';
        document.getElementById('connectionInfo').classList.remove('connection-info--visible');
        stopTimer();
    }
}

btnConnect.addEventListener('click', function () {
    if (isConnecting) return;

    if (!subscription) {
        haptic('error');
        showToast('Сначала оформите подписку', 'error');
        switchPage('tariffs');
        return;
    }

    if (isConnected) {
        showModal(
            'Отключить VPN?',
            'Вы уверены, что хотите отключиться от VPN-сервера?',
            [
                { label: 'Отмена', style: 'secondary' },
                {
                    label: 'Отключить',
                    style: 'primary',
                    callback: function () {
                        doDisconnect();
                    }
                }
            ]
        );
    } else {
        startConnectWizard();
    }
});

/* ===== HOOK: VPN Key ===== */
/* Replace this with your real VPN key generation/fetch logic.
   Example: fetch('https://your-api.com/key?user_id=' + user.id) */
var VPN_KEY = 'vless://a29bfe7@185.230.124.42:443?encryption=none&security=tls&type=ws&host=aura.vpn&path=%2Fvpn#AURA-Amsterdam';

function copyToClipboard(text, callback) {
    try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(text).then(function () {
                if (callback) callback(true);
            }).catch(function () {
                fallbackCopy(text, callback);
            });
        } else {
            fallbackCopy(text, callback);
        }
    } catch (e) {
        fallbackCopy(text, callback);
    }
}

function fallbackCopy(text, callback) {
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        var ok = document.execCommand('copy');
        document.body.removeChild(ta);
        if (callback) callback(ok);
    } catch (e) {
        if (callback) callback(false);
    }
}

/* ===== V2Ray Connection Wizard ===== */
var APP_LINKS = {
    android: 'https://play.google.com/store/apps/details?id=com.v2raytun.android',
    ios: 'https://apps.apple.com/ru/search?term=v2raytun'
};

function getDeviceType() {
    var ua = navigator.userAgent || '';
    if (/Android/i.test(ua)) return 'android';
    if (/iPhone|iPad|iPod/i.test(ua)) return 'ios';
    return 'desktop';
}

function openExternal(url) {
    try {
        if (tg && tg.openLink) {
            tg.openLink(url);
            return;
        }
    } catch (e) {}
    window.open(url, '_blank', 'noopener,noreferrer');
}

function openV2RayDeepLink() {
    var encoded = encodeURIComponent(VPN_KEY);
    var deepLink = 'v2raytun://import/' + encoded;
    var device = getDeviceType();

    if (device === 'desktop') return false;

    var openedAt = Date.now();
    try { window.location.href = deepLink; } catch (e) {}

    setTimeout(function () {
        if (Date.now() - openedAt < 1800) {
            openExternal(device === 'android' ? APP_LINKS.android : APP_LINKS.ios);
        }
    }, 1200);

    return true;
}

function showV2RayInstallStep(device) {
    var storeButton = '';
    var storeText = '';

    if (device === 'android') {
        storeText = 'Установите V2RayTun из Google Play.';
        storeButton = '<button type="button" class="btn-buy" id="btnOpenStore">Открыть Google Play</button>';
    } else if (device === 'ios') {
        storeText = 'Установите V2RayTun из App Store.';
        storeButton = '<button type="button" class="btn-buy" id="btnOpenStore">Открыть App Store</button>';
    } else {
        storeText = 'На ПК установите совместимый клиент V2Ray/VLESS, затем вернитесь к шагу 3.';
    }

    showModal(
        'Шаг 2 из 3',
        '<div class="wizard-step">' +
            '<p class="wizard-step__text">Установите приложение V2RayTun</p>' +
            '<p class="wizard-step__sub">' + storeText + '</p>' +
            storeButton +
            '</div>',
        [
            {
                label: 'Далее',
                style: 'primary',
                callback: function () {
                    showV2RayConfigStep();
                    return true;
                }
            }
        ]
    );

    if (storeButton) {
        setTimeout(function () {
            var storeBtn = document.getElementById('btnOpenStore');
            if (storeBtn) {
                storeBtn.addEventListener('click', function () {
                    openExternal(device === 'android' ? APP_LINKS.android : APP_LINKS.ios);
                });
            }
        }, 0);
    }
}

function startConnectWizard() {
    haptic('medium');
    var device = getDeviceType();
    var deviceText = device === 'android' ? 'Android' : device === 'ios' ? 'iPhone / iPad' : 'ПК';

    showModal(
        'Шаг 1 из 3',
        '<div class="wizard-step">' +
            '<p class="wizard-step__text">Проверяем подключение</p>' +
            '<p class="wizard-step__sub">Формат конфигурации: VLESS ✓</p>' +
            '<p class="wizard-step__sub">Устройство: ' + deviceText + '</p>' +
        '</div>',
        [
            {
                label: 'Далее',
                style: 'primary',
                callback: function () {
                    showV2RayInstallStep(device);
                    return true;
                }
            }
        ]
    );
}

function showV2RayConfigStep() {
    showModal(
        'Шаг 3 из 3',
        '<div class="wizard-step">' +
            '<p class="wizard-step__text">Конфигурация готова</p>' +
            '<p class="wizard-step__sub">Ключ будет скопирован перед открытием V2RayTun.</p>' +
            '<div style="margin-top:12px;word-break:break-all;font-size:12px;opacity:.75;">' + VPN_KEY + '</div>' +
        '</div>',
        [
            { label: 'Закрыть', style: 'secondary' },
            {
                label: 'Подключиться',
                style: 'primary',
                callback: function () {
                    openV2RayApp();
                }
            }
        ]
    );
}

function finishLocalConnectionState() {
    isConnecting = false;
    // The browser cannot verify a VPN tunnel in another application.
    // Keep the UI disconnected until the user explicitly confirms or returns.
}

function openV2RayApp() {
    v2rayWizardCompleted = true;
    saveState();
    isConnecting = true;

    copyToClipboard(VPN_KEY, function (ok) {
        if (ok) {
            haptic('success');
            showToast('Ключ скопирован', 'success');
        } else {
            haptic('error');
            showToast('Не удалось скопировать ключ', 'error');
        }

        var device = getDeviceType();
        if (device === 'android' || device === 'ios') {
            var opened = openV2RayDeepLink();
            if (!opened) finishLocalConnectionState();
        } else {
            finishLocalConnectionState();
            showModal(
                'Ключ готов',
                '<p>Ключ скопирован в буфер обмена.</p>' +
                '<p style="margin-top:8px">Импортируйте его в V2Ray/VLESS-клиент на ПК.</p>',
                [{ label: 'Готово', style: 'primary' }]
            );
        }
    });
}

function doDisconnect() {
    isConnected = false;
    stopTimer();
    saveState();
    renderHomePage();
    haptic('medium');
    showToast('VPN отключён', 'error');
    onVPNDisconnect();
}

/* ===== Speed Test ===== */
var speedGaugeFill = document.getElementById('speedGaugeFill');
var speedValueEl = document.getElementById('speedValue');
var speedBtn = document.getElementById('btnSpeedTest');
var speedBtnLabel = document.getElementById('speedBtnLabel');
var speedResults = document.getElementById('speedResults');
var speedStatus = document.getElementById('speedStatus');
var speedStatusText = document.getElementById('speedStatusText');

var GAUGE_LENGTH = 251.3;
var MAX_SPEED = 100;

function setGauge(mbps) {
    var pct = Math.min(1, mbps / MAX_SPEED);
    speedGaugeFill.style.strokeDashoffset = String(GAUGE_LENGTH * (1 - pct));
    speedValueEl.textContent = mbps.toFixed(1);
}

function animateSpeed(from, to, duration, done) {
    var start = performance.now();
    function frame(now) {
        var t = Math.min(1, (now - start) / duration);
        var eased = 1 - Math.pow(1 - t, 3);
        var val = from + (to - from) * eased;
        setGauge(val);
        if (t < 1) {
            requestAnimationFrame(frame);
        } else if (done) {
            done();
        }
    }
    requestAnimationFrame(frame);
}

speedBtn.addEventListener('click', function () {
    if (speedTestRunning) return;
    runSpeedTest();
});

function runSpeedTest() {
    speedTestRunning = true;
    haptic('medium');

    speedBtn.classList.remove('speed-start-btn--done');
    speedBtn.classList.add('speed-start-btn--running');
    speedBtnLabel.textContent = 'Тест идёт...';
    speedResults.style.display = 'none';
    speedStatus.style.display = 'flex';
    speedStatusText.textContent = 'Измеряем пинг...';
    setGauge(0);

    /* Phase 1: Ping (simulate) */
    setTimeout(function () {
        var ping = isConnected ? 18 + Math.floor(Math.random() * 12) : 35 + Math.floor(Math.random() * 30);
        var jitter = isConnected ? 1 + Math.random() * 3 : 3 + Math.random() * 8;

        speedStatusText.textContent = 'Измеряем скорость загрузки...';
        haptic('light');

        /* Phase 2: Download (animate gauge) */
        var downloadSpeed = isConnected
            ? 45 + Math.random() * 50
            : 15 + Math.random() * 30;

        animateSpeed(0, downloadSpeed, 2000, function () {
            speedStatusText.textContent = 'Измеряем скорость отдачи...';
            haptic('light');

            /* Phase 3: Upload (animate gauge to lower value) */
            var uploadSpeed = isConnected
                ? 20 + Math.random() * 30
                : 5 + Math.random() * 15;

            animateSpeed(downloadSpeed, uploadSpeed, 1500, function () {
                /* Done */
                speedTestRunning = false;
                speedBtn.classList.remove('speed-start-btn--running');
                speedBtn.classList.add('speed-start-btn--done');
                speedBtnLabel.textContent = 'Тест заново';
                speedStatus.style.display = 'none';
                speedResults.style.display = 'grid';

                document.getElementById('resultPing').textContent = ping + ' мс';
                document.getElementById('resultJitter').textContent = jitter.toFixed(1) + ' мс';
                document.getElementById('resultDownload').textContent = downloadSpeed.toFixed(1) + ' Мбит/с';
                document.getElementById('resultUpload').textContent = uploadSpeed.toFixed(1) + ' Мбит/с';

                setGauge(downloadSpeed);
                haptic('success');
            });
        });
    }, 800);
}

/* ===== Buy / Tariff buttons ===== */
function handlePurchase(tariffCode) {
    var tariff = TARIFFS[tariffCode];
    if (!tariff) return;

    showModal(
        'Подтверждение покупки',
        '<p>Тариф: <strong>' + tariff.label + '</strong></p>' +
        '<p style="margin-top:8px">Стоимость: <strong>' + tariff.price + ' ₽</strong></p>' +
        '<p style="margin-top:12px">Оплата пройдёт через платёжную систему. После оплаты подписка активируется автоматически.</p>',
        [
            { label: 'Отмена', style: 'secondary' },
            {
                label: 'Оплатить ' + tariff.price + ' ₽',
                style: 'primary',
                callback: function () {
                    onPaymentStart(tariffCode, function (success) {
                        if (success) {
                            onPaymentSuccess(tariffCode);
                            activateSubscription(tariffCode);
                        } else {
                            haptic('error');
                            showToast('Оплата не удалась', 'error');
                        }
                    });
                }
            }
        ]
    );
}

function activateSubscription(tariffCode) {
    var tariff = TARIFFS[tariffCode];
    var now = new Date();
    var endDate = new Date(now.getTime() + tariff.days * 86400000);

    subscription = {
        tariffCode: tariffCode,
        label: tariff.label,
        price: tariff.price,
        startDate: now.toISOString(),
        endDate: endDate.toISOString()
    };

    purchaseHistory.unshift({
        tariffCode: tariffCode,
        label: tariff.label,
        price: tariff.price,
        date: now.toISOString()
    });

    saveState();
    haptic('success');
    showToast('Подписка активирована!', 'success');
    onBotSend(tariffCode);

    renderSubscriptionPage();
    setTimeout(function () {
        switchPage('subs');
    }, 600);
}

document.querySelectorAll('.btn-buy[data-tariff]').forEach(function (btn) {
    btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var tariff = this.getAttribute('data-tariff');
        handlePurchase(tariff);
    });
});

document.querySelectorAll('.card[data-tariff]').forEach(function (card) {
    card.addEventListener('click', function (e) {
        if (e.target.closest('.btn-buy')) return;
        var tariff = this.getAttribute('data-tariff');
        handlePurchase(tariff);
    });
});

/* ===== Subscription Page ===== */
function formatDate(iso) {
    var d = new Date(iso);
    var day = String(d.getDate()).padStart(2, '0');
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var year = d.getFullYear();
    return day + '.' + month + '.' + year;
}

function renderSubscriptionPage() {
    var statusEl = document.getElementById('subStatus');
    var activeCard = document.getElementById('subActiveCard');
    var emptyEl = document.getElementById('subEmpty');
    var historyEl = document.getElementById('subHistory');

    if (subscription) {
        statusEl.classList.add('sub-status--active');
        document.getElementById('subPlanTitle').textContent = 'Подписка активна';
        document.getElementById('subPlanText').textContent = 'Тариф: ' + subscription.label;

        activeCard.style.display = 'block';
        emptyEl.style.display = 'none';

        document.getElementById('subActivePlan').textContent = subscription.label;
        document.getElementById('subDateStart').textContent = formatDate(subscription.startDate);
        document.getElementById('subDateEnd').textContent = formatDate(subscription.endDate);

        var now = new Date();
        var end = new Date(subscription.endDate);
        var total = end - new Date(subscription.startDate);
        var elapsed = now - new Date(subscription.startDate);
        var remaining = end - now;

        var progressPercent = Math.max(0, Math.min(100, (elapsed / total) * 100));
        var daysLeft = Math.max(0, Math.ceil(remaining / 86400000));

        document.getElementById('subProgressBar').style.width = (100 - progressPercent) + '%';
        document.getElementById('subProgressText').textContent = daysLeft + ' ' + pluralDays(daysLeft) + ' осталось';

        if (purchaseHistory.length > 0) {
            historyEl.style.display = 'block';
            var listEl = document.getElementById('subHistoryList');
            listEl.innerHTML = '';
            purchaseHistory.forEach(function (item) {
                var el = document.createElement('div');
                el.className = 'sub-history__item';
                el.innerHTML =
                    '<div class="sub-history__item-info">' +
                        '<span class="sub-history__item-plan">' + item.label + '</span>' +
                        '<span class="sub-history__item-date">' + formatDate(item.date) + '</span>' +
                    '</div>' +
                    '<span class="sub-history__item-price">' + item.price + ' ₽</span>';
                listEl.appendChild(el);
            });
        } else {
            historyEl.style.display = 'none';
        }
    } else {
        statusEl.classList.remove('sub-status--active');
        document.getElementById('subPlanTitle').textContent = 'Нет активной подписки';
        document.getElementById('subPlanText').textContent = 'Выберите тариф, чтобы начать пользоваться VPN';

        activeCard.style.display = 'none';
        emptyEl.style.display = 'block';
        historyEl.style.display = 'none';
    }
}

function pluralDays(n) {
    if (n === 1) return 'день';
    if (n >= 2 && n <= 4) return 'дня';
    return 'дней';
}

document.getElementById('btnCancelSub').addEventListener('click', function () {
    showModal(
        'Отменить подписку?',
        '<p>Подписка будет отменена немедленно. Доступ к VPN прекратится.</p>' +
        '<p style="margin-top:8px">Это действие нельзя отменить.</p>',
        [
            { label: 'Нет, оставить', style: 'secondary' },
            {
                label: 'Отменить подписку',
                style: 'primary',
                callback: function () {
                    subscription = null;
                    isConnected = false;
                    stopTimer();
                    saveState();
                    renderSubscriptionPage();
                    renderHomePage();
                    haptic('medium');
                    showToast('Подписка отменена', 'error');
                }
            }
        ]
    );
});

document.getElementById('btnSubGoTariffs').addEventListener('click', function () {
    switchPage('tariffs');
});

/* ===== Profile Page ===== */
function renderProfilePage() {
    if (user) {
        var fullName = (user.first_name || '') + (user.last_name ? ' ' + user.last_name : '');
        document.getElementById('profileName').textContent = fullName || 'Пользователь';
        document.getElementById('profileId').textContent = 'ID: ' + (user.id || '—');
        var initials = ((user.first_name || 'A')[0] || 'A').toUpperCase();
        document.getElementById('profileAvatar').textContent = initials;
    } else {
        document.getElementById('profileName').textContent = 'Гость';
        document.getElementById('profileId').textContent = 'ID: —';
        document.getElementById('profileAvatar').textContent = 'A';
    }

    var traffic = isConnected ? '24.6' : '0';
    document.getElementById('statTraffic').textContent = traffic + ' ГБ';
    document.getElementById('statDevices').textContent = isConnected ? '2' : '0';

    var days = 0;
    if (subscription) {
        days = Math.max(0, Math.ceil((new Date(subscription.endDate) - Date.now()) / 86400000));
    }
    document.getElementById('statDays').textContent = days;
}

document.getElementById('btnProfileSpeed').addEventListener('click', function () {
    switchPage('speed');
});

document.getElementById('btnProfileSub').addEventListener('click', function () {
    switchPage('subs');
});

document.getElementById('btnProfileTariffs').addEventListener('click', function () {
    switchPage('tariffs');
});

document.getElementById('btnProfileSupport').addEventListener('click', function () {
    showModal(
        'Поддержка',
        '<p>Наша поддержка доступна 24/7.</p>' +
        '<p style="margin-top:8px">Свяжитесь с нами через бот, и мы ответим в течение нескольких минут.</p>',
        [
            { label: 'Закрыть', style: 'secondary' },
            {
                label: 'Написать в поддержку',
                style: 'primary',
                callback: function () {
                    onBotSend('support_request');
                    if (tg && tg.openTelegramLink) {
                        try { tg.openTelegramLink('https://t.me/AURA_supp0rt'); return; } catch (e) {}
                    }
                    window.open('https://t.me/AURA_supp0rt', '_blank', 'noopener,noreferrer');
                    return true;
                }
            }
        ]
    );
});

document.getElementById('btnProfileAbout').addEventListener('click', function () {
    showModal(
        'О приложении',
        '<p><strong>AURA VPN</strong></p>' +
        '<p style="margin-top:6px">Версия 3.1.0</p>' +
        '<p style="margin-top:8px">Безопасный VPN с серверами в 50+ странах. Шифрование AES-256, высокая скорость, без логов.</p>' +
        '<p style="margin-top:8px">© 2026 AURA VPN</p>',
        [
            { label: 'Закрыть', style: 'secondary' }
        ]
    );
});

/* ===== Settings button ===== */
document.getElementById('btnSettings').addEventListener('click', function () {
    showModal(
        'Настройки',
        '<p>Управление приложением и уведомлениями.</p>',
        [
            { label: 'Закрыть', style: 'secondary' },
            {
                label: 'Сбросить данные',
                style: 'primary',
                callback: function () {
                    try {
                        localStorage.removeItem('aura_vpn_data');
                    } catch (e) {}
                    isConnected = false;
                    stopTimer();
                    subscription = null;
                    purchaseHistory = [];
                    v2rayWizardCompleted = false;
                    renderHomePage();
                    renderSubscriptionPage();
                    renderProfilePage();
                    haptic('medium');
                    showToast('Данные сброшены', 'success');
                }
            }
        ]
    );
});

/* ===== Home: go to tariffs ===== */
document.getElementById('btnGoTariffs').addEventListener('click', function () {
    switchPage('tariffs');
});

/* ===== Init ===== */
loadState();
renderHomePage();
renderSubscriptionPage();
renderProfilePage();
