/* メニュー共通コンポーネント（テキストベタ打ちをやめたi18n対応版） */

/* メニュー項目の設定（キーベース） */
const MENU_ITEMS = [
    { href: 'index.html', textKey: 'menu.top', id: 'index' },
    { href: 'simu_potential.html', textKey: 'menu.potential', id: 'potential' },
    { href: 'exchange_checker.html', textKey: 'menu.exchange', id: 'exchange' },
    { href: 'simu_commission.html', textKey: 'menu.commission', id: 'commission' },
    // 未実装
    { textKey: 'menu.planned.materials', disabled: true },
    { textKey: 'menu.planned.reverse', disabled: true },
    { textKey: 'menu.planned.quiz', disabled: true },
    { textKey: 'menu.planned.ring', disabled: true },
    { textKey: 'menu.planned.unreleased', disabled: true },
    { textKey: 'menu.planned.cocotya', disabled: true },
];

/* 現在のページを判定 */
function getCurrentPage() {
    const path = window.location.pathname;
    const filename = path.split('/').pop();
    // 空の場合はindex.htmlを返す
    return filename || 'index.html';
}

/* メニュー項目のテキストを取得（i18n対応） */
function getMenuText(textKey) {
    // i18nが初期化されていればそれを使用、なければデフォルト
    if (typeof i18n !== 'undefined' && i18n.commonData) {
        return i18n.getText(textKey, 'common');
    }
    // フォールバック用のデフォルトテキスト
    const defaults = {
        'menu.top': 'TOP',
        'menu.potential': '素質シミュレーター',
        'menu.exchange': 'イベント交換所チェッカー',
        'menu.commission': '依頼シミュレーター',
        'menu.planned.materials': '（予定）昇格に必要な素材数計算機',
        'menu.planned.reverse': '（予定）素材逆引き',
        'menu.planned.quiz': '（予定）星ノ塔クイズのカンペ',
        'menu.planned.ring': '（予定）無限リングのバフ早見表',
        'menu.planned.unreleased': '（予定）未実装キャラメモ',
        'menu.planned.cocotya': '（予定）ココチャまとめ',
        'menu.header': 'メニュー'
    };
    return defaults[textKey] || textKey;
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
            return `<li><span class="menu-item-disabled" data-i18n="${item.textKey}">${getMenuText(item.textKey)}</span></li>`;
        }
        
        // 現在のページかどうか判定
        const isCurrent = item.href === currentPage;
        const currentClass = isCurrent ? ' class="menu-item-current"' : '';
        
        return `<li><a href="${item.href}"${currentClass} data-i18n="${item.textKey}">${getMenuText(item.textKey)}</a></li>`;
    }).join('');
    
    const headerText = getMenuText('menu.header');
    
    return `
        <nav class="side-menu" id="sideMenu">
            <div class="side-menu-header" data-i18n="menu.header">${headerText}</div>
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

/* メニューを再描画（言語変更時用） */
function updateMenuLanguage() {
    const sideMenu = document.getElementById('sideMenu');
    if (!sideMenu) return;
    
    // ヘッダーの更新
    const header = sideMenu.querySelector('.side-menu-header');
    if (header) {
        header.textContent = getMenuText('menu.header');
    }
    
    // 各メニュー項目の更新
    MENU_ITEMS.forEach(item => {
        const element = sideMenu.querySelector(`[data-i18n="${item.textKey}"]`);
        if (element) {
            element.textContent = getMenuText(item.textKey);
        }
    });
}

/* メニューを初期化 */
function initMenu() {
    const menuHTML = createMenuHTML();
    document.body.insertAdjacentHTML('afterbegin', menuHTML);
    setupMenuEvents();
    
    // 言語変更イベントをリッスン
    document.addEventListener('languageChanged', () => {
        updateMenuLanguage();
    });
}

// DOMContentLoaded後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initMenu);
} else {
    // 既にDOMが読み込まれている場合は即時実行
    initMenu();
}
