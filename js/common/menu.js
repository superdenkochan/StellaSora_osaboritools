/* メニュー共通コンポーネント */

/* メニュー項目の設定 */
const MENU_ITEMS = [
    { href: 'index.html', text: 'TOP', id: 'index' },
    { href: 'simu_potential.html', text: '素質シミュレーター', id: 'potential' },
    { href: 'exchange_checker.html', text: 'イベント交換所チェッカー', id: 'exchange' },
    { href: 'simu_commission.html', text: '依頼シミュレーター', id: 'commission' },
    // 未実装
    { text: '（予定）昇格に必要な素材数計算機', disabled: true },
    { text: '（予定）素材逆引き', disabled: true },
    { text: '（予定）星ノ塔クイズのカンペ', disabled: true },
    { text: '（予定）無限リングのバフ早見表', disabled: true },
    { text: '（予定）未実装キャラメモ', disabled: true },
    { text: '（予定）ココチャまとめ', disabled: true },
];

/* 現在のページを判定 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    // 空の場合はindex.htmlを返す
    return filename || 'index.html';
}

/* ハンバーガーメニューのHTMLを生成 */
function createHamburgerHTML() {
    return `
        <div class="hamburger-menu" id="hamburgerMenu">
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
            <div class="hamburger-line"></div>
        </div>
    `;
}

/* サイドメニューのHTMLを生成 */
function createSideMenuHTML() {
    const currentPage = getCurrentPage();
    
    const menuItems = MENU_ITEMS.map(item => {
        // 無効化項目
        if (item.disabled) {
            return `<li><span class="menu-item-disabled">${item.text}</span></li>`;
        }
        
        // 現在のページかどうか判定（今ここ）を入れる
        const isCurrent = item.href === currentPage;
        const currentClass = isCurrent ? ' class="menu-item-current"' : '';
        const currentText = isCurrent ? '' : '';
        
        return `<li><a href="${item.href}"${currentClass}>${item.text}${currentText}</a></li>`;
    }).join('');
    
    return `
        <nav class="side-menu" id="sideMenu">
            <div class="side-menu-header">メニュー</div>
            <ul class="side-menu-list">
                ${menuItems}
            </ul>
        </nav>
    `;
}

/* オーバーレイのHTMLを生成 */
function createOverlayHTML() {
    return `<div class="menu-overlay" id="menuOverlay"></div>`;
}

/* メニュー全体のHTMLを生成 */
function createMenuHTML() {
    return createHamburgerHTML() + createSideMenuHTML() + createOverlayHTML();
}

/* メニューのイベントリスナーを設定 */
function setupMenuEvents() {
    const hamburger = document.getElementById('hamburgerMenu');
    const sideMenu = document.getElementById('sideMenu');
    const overlay = document.getElementById('menuOverlay');
    
    if (!hamburger || !sideMenu || !overlay) {
        console.error('メニュー要素が見つかりません');
        return;
    }
    
    function openMenu() {
        sideMenu.classList.add('open');
        overlay.classList.add('active');
    }
    
    function closeMenu() {
        sideMenu.classList.remove('open');
        overlay.classList.remove('active');
    }
    
    function toggleMenu() {
        if (sideMenu.classList.contains('open')) {
            closeMenu();
        } else {
            openMenu();
        }
    }
    
    hamburger.addEventListener('click', toggleMenu);
    overlay.addEventListener('click', closeMenu);
    
    // Escキーで閉じられるように
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}

/* メニューを初期化 */
function initMenu() {
    const menuHTML = createMenuHTML();
    document.body.insertAdjacentHTML('afterbegin', menuHTML);
    setupMenuEvents();
}

// DOMContentLoaded後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
} else {
    // 既にDOMが読み込まれている場合は即時実行
    initMenu();
}
