/* タブ管理システム */

class TabManager {
    constructor() {
        this.tabs = new Map();
        this.currentTab = null;
        this.tabsContainer = null;
        this.tabsWrapper = null;
        this.initializedTabs = new Set(); // 初期化済みタブを追跡
    }
    
    /**
     * タブ登録
     * @param {string} id - タブID
     * @param {Object} options - オプション
     */
    register(id, options = {}) {
        this.tabs.set(id, {
            id,
            titleKey: options.titleKey || `menu.${id}`,
            title: options.title || id,
            init: options.init || null,
            cleanup: options.cleanup || null,
            scripts: options.scripts || [],
            styles: options.styles || []
        });
    }
    
    /**
     * タブUI生成
     */
    createTabsUI() {
        this.tabsContainer = document.getElementById('tabsContainer');
        this.tabsWrapper = document.getElementById('tabsWrapper');
        
        if (!this.tabsContainer) {
            console.error('タブコンテナが見つかりません');
            return;
        }
        
        // 既存の内容をクリア
        this.tabsContainer.innerHTML = '';
        
        const tabsList = document.createElement('ul');
        tabsList.className = 'tabs-list';
        
        this.tabs.forEach((tab, id) => {
            const li = document.createElement('li');
            const a = document.createElement('a');
            a.className = 'tab-item';
            a.href = `#${id}`;
            a.dataset.tab = id;
            
            // タイトル設定（i18n対応）
            if (typeof i18n !== 'undefined' && i18n.commonData) {
                const text = i18n.getText(tab.titleKey, 'common');
                a.textContent = text !== tab.titleKey ? text : tab.title;
            } else {
                a.textContent = tab.title;
            }
            a.setAttribute('data-i18n', tab.titleKey);
            
            // クリックイベント（デフォルト動作でハッシュ変更）
            a.addEventListener('click', (e) => {
                // ハッシュ遷移に任せる（preventDefaultしない）
            });
            
            li.appendChild(a);
            tabsList.appendChild(li);
        });
        
        this.tabsContainer.appendChild(tabsList);
    }
    
    /**
     * タブ切り替え
     * @param {string} id - タブID
     */
    async switchTab(id) {
        if (!this.tabs.has(id)) {
            console.warn(`タブが見つかりません: ${id}`);
            return;
        }
        
        const tab = this.tabs.get(id);
        
        // 前のタブのクリーンアップ
        if (this.currentTab && this.currentTab.id !== id && this.currentTab.cleanup) {
            this.currentTab.cleanup();
        }
        
        // タブUIの更新
        document.querySelectorAll('.tab-item').forEach(item => {
            item.classList.toggle('active', item.dataset.tab === id);
        });
        
        // コンテンツの切り替え
        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `${id}-content`;
            content.classList.toggle('active', isActive);
        });
        
        // 初期化（初回のみ）
        if (tab.init && !this.initializedTabs.has(id)) {
            this.initializedTabs.add(id);
            await tab.init();
        }
        
        this.currentTab = tab;
        
        // スクロール位置をリセット
        window.scrollTo(0, 0);
        
        // タブ変更イベント発火
        document.dispatchEvent(new CustomEvent('tabChanged', {
            detail: { tabId: id }
        }));
    }
    
    /**
     * 言語変更時のタブタイトル更新
     */
    updateTabTitles() {
        if (!this.tabsContainer) return;
        
        this.tabs.forEach((tab, id) => {
            const element = this.tabsContainer.querySelector(`[data-tab="${id}"]`);
            if (element && typeof i18n !== 'undefined') {
                const text = i18n.getText(tab.titleKey, 'common');
                element.textContent = text !== tab.titleKey ? text : tab.title;
            }
        });
    }
    
    /**
     * 現在のタブID取得
     * @returns {string|null}
     */
    getCurrentTabId() {
        return this.currentTab ? this.currentTab.id : null;
    }
}

// グローバルインスタンス
const tabManager = new TabManager();
