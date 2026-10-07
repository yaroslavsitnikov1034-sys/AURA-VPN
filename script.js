/* ====================================================================
   AURA VPN — Telegram Web App (Оптимизирован для мобильных)
   ==================================================================== */

const tg = window.Telegram ? window.Telegram.WebApp : null;

if (tg) {
    tg.expand();
    tg.ready();
    if (tg.setHeaderColor) tg.setHeaderColor('#0a0a0f');
    if (tg.setBackgroundColor) tg.setBackgroundColor('#0a0a0f');
}

/* ===== Global State ===== */
var user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user ? tg.initDataUnsafe.user : null;
var isConnected = false;
var isConnecting = false;
var connectStartTime = null;
var timerInterval = null;
var subscription = null;
var purchaseHistory = [];
var v2rayWizardCompleted = false;

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
            isConnected = data.isConnected || false;
            connectStartTime = data.connectStartTime || null;
            subscription = data.subscription || null;
            purchaseHistory = data.purchaseHistory || [];
            v2rayWizardCompleted = data.v2rayWizardCompleted || false;
        }
    } catch (e) {}
}

/* ===== Haptics ===== */
function haptic(type) {
    try {
        if (!tg) return;
        if (type === 'light') tg.HapticFeedback.impactOccurred('light');
        else if (type === 'medium') tg.HapticFeedback.impactOccurred('medium');
        else if (type === 'success') tg.HapticFeedback.notificationOccurred('success');
        else if (type === 'error') tg.HapticFeedback.notificationOccurred('error');
    } catch (e) {}
}

/* ===== Timer ===== */
function formatTimer(ms) {
    var totalSec = Math.floor(ms / 1000);
    var h = Math.floor(totalSec / 3600);
    var m = Math.floor((totalSec % 3600) / 60);
    var s = totalSec % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
}

/* ===== Главная логика кнопок и онбординга V2Ray ===== */
document.addEventListener('DOMContentLoaded', () => {
    loadState();

    const modal = document.getElementById('v2rayModal');
    const btnConnect = document.getElementById('btnConnect');
    const connectDial = document.getElementById('connectDial');
    const btnConnectLabel = document.getElementById('btnConnectLabel');
    const dialStatusText = document.getElementById('dialStatusText');
    const statusBar = document.getElementById('statusBar');
    const statusText = document.getElementById('statusText');
    const connectionInfo = document.getElementById('connectionInfo');
    const timerEl = document.getElementById('connectTimer');

    const step1 = document.getElementById('modalStep1');
    const step2 = document.getElementById('modalStep2');
    const step3 = document.getElementById('modalStep3');
    
    const btnHasApp = document.getElementById('btnHasApp');
    const btnNoApp = document.getElementById('btnNoApp');
    const btnGoToKey = document.getElementById('btnGoToKey');
    const btnCopyKey = document.getElementById('btnCopyKey');
    const btnCloseModal = document.getElementById('btnCloseModal');
    
    const testVpnKey = "vless://aura-premium-vpn-test-access-key-bolt-new-protocol-xtls-reality@127.0.0.1:443?security=reality#AURA_VPN_TEST";

    // Инициализация при первой загрузке страницы
    if (isConnected) {
        if (connectDial) connectDial.classList.add('connect-dial--connected');
        if (btnConnectLabel) btnConnectLabel.textContent = 'Подключено';
        if (dialStatusText) dialStatusText.textContent = 'Подключено';
        if (statusBar) statusBar.classList.add('status-bar--connected');
        if (statusText) statusText.textContent = 'Подключено — Нидерланды';
        if (connectionInfo) connectionInfo.classList.add('connection-info--visible');
    }

    // Логика кнопки Подключения
    if (btnConnect) {
        btnConnect.addEventListener('click', (e) => {
            e.preventDefault();
            haptic('medium');

            if (!isConnected && !isConnecting) {
                // Имитация начала подключения
                isConnecting = true;
                if (connectDial) connectDial.classList.add('connect-dial--connecting');
                if (btnConnectLabel) btnConnectLabel.textContent = 'Загрузка...';
                
                // Спустя 2 секунды успешное подключение и открытие окна V2Ray
                setTimeout(() => {
                    isConnecting = false;
                    isConnected = true;
                    saveState();
                    haptic('success');

                    if (connectDial) {
                        connectDial.classList.remove('connect-dial--connecting');
                        connectDial.classList.add('connect-dial--connected');
                    }
                    if (btnConnectLabel) btnConnectLabel.textContent = 'Подключено';
                    if (dialStatusText) dialStatusText.textContent = 'Подключено';
                    if (statusBar) statusBar.classList.add('status-bar--connected');
                    if (statusText) statusText.textContent = 'Подключено — Нидерланды';
                    if (connectionInfo) connectionInfo.classList.add('connection-info--visible');
                    
                    // Показываем реальный IP и пинг
                    const ipValue = document.getElementById('ipValue');
                    const serverValue = document.getElementById('serverValue');
                    const pingValue = document.getElementById('pingValue');
                    if (ipValue) ipValue.textContent = '185.230.124.42';
                    if (serverValue) serverValue.textContent = 'Амстердам, NL';
                    if (pingValue) pingValue.textContent = '24 мс';

                    // Запуск таймера
                    connectStartTime = Date.now();
                    if (timerEl) timerEl.textContent = '00:00:00';
                    timerInterval = setInterval(() => {
                        var elapsed = Date.now() - connectStartTime;
                        if (timerEl) timerEl.textContent = formatTimer(elapsed);
                    }, 1000);

                    // Мгновенное открытие интерактивного окна V2RayTun
                    if (modal) {
                        if (step1) step1.style.display = 'block';
                        if (step2) step2.style.display = 'none';
                        if (step3) step3.style.display = 'none';
                        modal.style.display = 'flex';
                    }
                }, 2000);

            } else if (isConnected) {
                // Отключение VPN
                isConnected = false;
                saveState();
                clearInterval(timerInterval);
                timerInterval = null;

                if (connectDial) connectDial.classList.remove('connect-dial--connected');
                if (btnConnectLabel) btnConnectLabel.textContent = 'Подключить';
                if (dialStatusText) dialStatusText.textContent = 'Не подключено';
                if (statusBar) statusBar.classList.remove('status-bar--connected');
                if (statusText) statusText.textContent = 'Не подключено';
                if (connectionInfo) connectionInfo.classList.remove('connection-info--visible');
                if (timerEl) timerEl.textContent = '00:00:00';
                haptic('light');
            }
        });
    }

    // Навигация по шагам внутри окна
    if (btnHasApp) {
        btnHasApp.addEventListener('click', () => {
            haptic('light');
            if (step1) step1.style.display = 'none';
            if (step3) step3.style.display = 'block';
        });
    }

    if (btnNoApp) {
        btnNoApp.addEventListener('click', () => {
            haptic('light');
            if (step1) step1.style.display = 'none';
            if (step2) step2.style.display = 'block';
        });
    }

    if (btnGoToKey) {
        btnGoToKey.addEventListener('click', () => {
            haptic('light');
            if (step2) step2.style.display = 'none';
            if (step3) step3.style.display = 'block';
        });
    }

    // Копирование ключа и переброс в программу
    if (btnCopyKey) {
        btnCopyKey.addEventListener('click', () => {
            navigator.clipboard.writeText(testVpnKey).then(() => {
                haptic('success');
                const oldText = btnCopyKey.innerText;
                btnCopyKey.innerText = "✓ Скопировано!";
                btnCopyKey.style.background = "#10b981";
                btnCopyKey.style.color = "#fff";
                
                setTimeout(() => {
                    btnCopyKey.innerText = oldText;
                    btnCopyKey.style.background = "#00d4ff";
                    btnCopyKey.style.color = "#0a0a0f";
                }, 2000);

                // Пытаемся запустить приложение на телефоне
                setTimeout(() => {
                    window.location.href = testVpnKey;
                }, 1000);
            }).catch(() => {
                alert("Ключ скопирован в буфер обмена!");
            });
        });
    }

    if (btnCloseModal) {
        btnCloseModal.addEventListener('click', () => {
            if (modal) modal.style.display = 'none';
        });
    }

    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) modal.style.display = 'none';
        });
    }

    // Безопасное подключение кнопок меню (если они есть)
