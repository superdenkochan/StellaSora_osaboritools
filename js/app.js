/**
 * ステラソラ おサボりツール - メインアプリケーション
 * タブナビゲーションの初期化とルーティング設定
 */

(async function() {
    'use strict';
    
    console.log('App: 初期化開始');
    
    // i18n初期化（共通データとindexページデータ）
    await i18n.loadCommon();
    await i18n.loadPage('index');
    
    // タブ登録
    tabManager.register('top', {
        title: 'TOP',
        titleKey: 'menu.top',
        init: async () => {
            console.log('Top: 初期化');
            // TOPページは静的HTMLなので特別な初期化不要
            i18n.applyTranslations();
        }
    });
    
    tabManager.register('potential', {
        title: '素質シミュレーター',
        titleKey: 'menu.potential',
        init: async () => {
            console.log('Potential: 初期化');
            if (window.PotentialApp) {
                await PotentialApp.init();
            }
        },
        cleanup: () => {
            if (window.PotentialApp) {
                PotentialApp.cleanup();
            }
        }
    });
    
    tabManager.register('exchange', {
        title: '交換所チェッカー',
        titleKey: 'menu.exchange',
        init: async () => {
            console.log('Exchange: 初期化');
            if (window.ExchangeApp) {
                await ExchangeApp.init();
            }
        },
        cleanup: () => {
            if (window.ExchangeApp) {
                ExchangeApp.cleanup();
            }
        }
    });
    
    tabManager.register('commission', {
        title: '依頼シミュレーター',
        titleKey: 'menu.commission',
        init: async () => {
            console.log('Commission: 初期化');
            if (window.CommissionApp) {
                await CommissionApp.init();
            }
        },
        cleanup: () => {
            if (window.CommissionApp) {
                CommissionApp.cleanup();
            }
        }
    });
    
    // タブUI生成
    tabManager.createTabsUI();
    
    // ルーター設定
    router.register('top', {
        onEnter: () => tabManager.switchTab('top')
    });
    
    router.register('potential', {
        onEnter: () => tabManager.switchTab('potential')
    });
    
    router.register('exchange', {
        onEnter: () => tabManager.switchTab('exchange')
    });
    
    router.register('commission', {
        onEnter: () => tabManager.switchTab('commission')
    });
    
    // 初回ルート処理
    router.init();
    
    // 言語切り替えボタンの初期化
    i18n.initToggleButton();
    
    // 翻訳を適用
    i18n.applyTranslations();
    
    // 言語変更時の処理
    document.addEventListener('languageChanged', () => {
        // タブのタイトルを更新
        tabManager.updateTabTitles();
        // 翻訳を適用
        i18n.applyTranslations();
    });
    
    console.log('App: 初期化完了');
})();
