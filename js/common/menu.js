/* グローバルヘッダー＆メニュー共通コンポーネント */

/* メニュー項目の設定 */
const MENU_ITEMS = [
    { href: 'index.html', textKey: 'menu.top', id: 'index', showInTab: true },
    { href: 'simu_potential.html', textKey: 'menu.potential', id: 'potential', showInTab: true },
    { href: 'exchange_checker.html', textKey: 'menu.exchange', id: 'exchange', showInTab: true },
    { href: 'simu_commission.html', textKey: 'menu.commission', id: 'commission', showInTab: true },
    // 未実装（サイドメニューのみ表示）
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
    return filename || 'index.html';
}

/* メニュー項目のテキストを取得（i18n対応） */
function getMenuText(textKey) {
    if (typeof i18n !== 'undefined' && i18n.commonData) {
        return i18n.getText(textKey, 'common');
    }
    // フォールバック用のデフォルトテキスト
    const defaults = {
        'menu.top': 'TOP',
        'menu.potential': '素質シミュ',
        'menu.exchange': '交換所',
        'menu.commission': '依頼シミュ',
        'menu.planned.materials': '（予定）昇格に必要な素材数計算機',
        'menu.planned.reverse': '（予定）素材逆引き',
        'menu.planned.quiz': '（予定）星ノ塔クイズのカンペ',
        'menu.planned.ring': '（予定）無限リングのバフ早見表',
        'menu.planned.unreleased': '（予定）未実装キャラメモ',
        'menu.planned.cocotya': '（予定）ココチャまとめ',
        'menu.header': 'メニュー',
        'site.shortTitle': 'おサボりツール'
    };
    return defaults[textKey] || textKey;
}

/* サイドメニューのイベント設定 */
function setupMenuEvents() {
    const hamburger = document.getElementById('headerHamburger');
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
    
    // サイドメニュー内のリンクをクリックしたら閉じる
    sideMenu.querySelectorAll('a').forEach(link => {
        link.addEventListener('click', closeMenu);
    });
    
    // Escキーで閉じる
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && sideMenu.classList.contains('open')) {
            closeMenu();
        }
    });
}

/* 言語切り替えボタンのイベント設定 */
function setupLanguageButton() {
    const langBtn = document.getElementById('headerLangBtn');
    if (!langBtn) return;
    
    // 既存のlanguageToggleボタンがあれば非表示に
    const oldLangBtn = document.getElementById('languageToggle');
    if (oldLangBtn) {
        oldLangBtn.style.display = 'none';
    }
    
    // 現在の言語を反映
    function updateLangButtonText() {
        if (typeof i18n !== 'undefined') {
            const currentLang = i18n.getLanguage();
            langBtn.textContent = currentLang === 'ja' ? 'English' : '日本語';
            // HTML要素のlang属性を変更（CSSで表示切り替え）
            document.documentElement.lang = currentLang;
        }
    }
    
    updateLangButtonText();
    
    // クリックで言語切り替え
    langBtn.addEventListener('click', () => {
        if (typeof i18n !== 'undefined') {
            i18n.toggleLanguage();
            updateLangButtonText();
        }
    });
    
    // 言語変更イベントをリッスン
    document.addEventListener('languageChanged', updateLangButtonText);
}

/* ページ固有コントロールをヘッダー下段に移植 */
function movePageControlsToHeader() {
    const headerControls = document.getElementById('headerControls');
    const pageControls = document.getElementById('pageControls');
    
    if (!headerControls) return;
    
    if (pageControls) {
        // pageControlsの中身をヘッダーに移動
        while (pageControls.firstChild) {
            headerControls.appendChild(pageControls.firstChild);
        }
        // 元のコンテナを削除
        pageControls.remove();
    }
    
    // 下段が空なら非表示
    if (headerControls.children.length === 0) {
        headerControls.style.display = 'none';
    }
}

/* 初期化 */

function initGlobalHeader() {
    // ヘッダーの要素が存在するか確認
    const globalHeader = document.getElementById('globalHeader');
    if (!globalHeader) {
        console.error('グローバルヘッダーが見つかりません');
        return;
    }
    
    // イベント設定
    setupMenuEvents();
    setupLanguageButton();
    
    // ページ固有コントロールをヘッダーに移植
    movePageControlsToHeader();
    
    // 旧headerタグを削除（あれば）
    const oldHeader = document.querySelector('.container > header');
    if (oldHeader) {
        oldHeader.remove();
    }
    
    // 言語設定をHTML要素に反映（CSSで表示切り替え）
    if (typeof i18n !== 'undefined') {
        document.documentElement.lang = i18n.getLanguage();
    }
}

// DOMContentLoaded後に実行
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initGlobalHeader);
} else {
    initGlobalHeader();
}
