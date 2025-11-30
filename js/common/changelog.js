/* 変更履歴モーダルの動的生成 */

/**
 * 変更履歴モーダルの内容を動的に生成
 * i18nが初期化された後に呼び出すこと
 */
function renderChangelog() {
    const modalBody = document.querySelector('#changelogModal .modal-body, #changelogModal .usage-modal-body');
    if (!modalBody) {
        console.warn('変更履歴モーダルのbody要素が見つかりません');
        return;
    }
    
    // i18nから変更履歴データを取得
    const changelogData = i18n.commonData?.changelog;
    if (!changelogData || !changelogData.versions) {
        console.warn('変更履歴データが見つかりません');
        return;
    }
    
    const currentLang = i18n.getLanguage();
    
    // モーダル内容をクリア
    modalBody.innerHTML = '';
    
    // 各バージョンの変更履歴を生成
    changelogData.versions.forEach(versionData => {
        // バージョン見出し
        const versionHeading = document.createElement('h3');
        versionHeading.textContent = `${versionData.version} ${versionData.date}`;
        modalBody.appendChild(versionHeading);
        
        // 変更項目リスト
        const itemsList = document.createElement('ul');
        const items = versionData.items[currentLang] || versionData.items['ja'];
        
        items.forEach(itemText => {
            const listItem = document.createElement('li');
            listItem.innerHTML = itemText; // HTMLタグを解釈
            itemsList.appendChild(listItem);
        });
        
        modalBody.appendChild(itemsList);
    });
}

/**
 * 言語変更時に変更履歴を再レンダリング
 */
function setupChangelogLanguageListener() {
    document.addEventListener('languageChanged', () => {
        renderChangelog();
    });
}

// DOMContentLoaded後に自動初期化
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        // i18n初期化を待ってから実行
        if (typeof i18n !== 'undefined' && i18n.commonData) {
            renderChangelog();
            setupChangelogLanguageListener();
        } else {
            // i18nの初期化を待つ
            const checkI18n = setInterval(() => {
                if (typeof i18n !== 'undefined' && i18n.commonData) {
                    clearInterval(checkI18n);
                    renderChangelog();
                    setupChangelogLanguageListener();
                }
            }, 100);
        }
    });
} else {
    // 既にDOMContentLoadedが発火済みの場合
    if (typeof i18n !== 'undefined' && i18n.commonData) {
        renderChangelog();
        setupChangelogLanguageListener();
    }
}
