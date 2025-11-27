/* i18n 各キーにjaとenを設定 */

const STORAGE_KEY = 'stellasora_language';

/* デフォルト言語を取得（ブラウザ設定 or 日本語） */
function getDefaultLanguage() {
    const browserLang = navigator.language || navigator.userLanguage;
    return browserLang.startsWith('ja') ? 'ja' : 'en';
}

/* 現在の言語を取得 */
function getCurrentLanguage() {
    return localStorage.getItem(STORAGE_KEY) || getDefaultLanguage();
}

/* 言語を設定 */
function setLanguage(lang) {
    localStorage.setItem(STORAGE_KEY, lang);
}

/* I18nクラス */
class I18n {
    constructor() {
        this.language = getCurrentLanguage();
        this.data = {};
        this.commonData = null;
        this.callbacks = [];
    }
    
    /* 共通言語データを読み込み */
    async loadCommon() {
        if (!this.commonData) {
            try {
                const response = await fetch('data/i18n/common.json');
                if (!response.ok) throw new Error('common.json load failed');
                this.commonData = await response.json();
            } catch (error) {
                console.error('共通言語データの読み込みに失敗:', error);
                this.commonData = {};
            }
        }
        return this.commonData;
    }
    
    /* ページ固有の言語データを読み込み */
    async loadPage(pageName) {
        if (!this.data[pageName]) {
            try {
                const response = await fetch(`data/i18n/${pageName}.json`);
                if (!response.ok) throw new Error(`${pageName}.json load failed`);
                this.data[pageName] = await response.json();
            } catch (error) {
                console.error(`ページ言語データの読み込みに失敗 (${pageName}):`, error);
                this.data[pageName] = {};
            }
        }
        return this.data[pageName];
    }
    
    /* テキストを取得（ネストしたキーに対応） */
    getText(key, source = 'common') {
        const data = source === 'common' ? this.commonData : this.data[source];
        if (!data) return key;
        
        // ドット区切りでネストを辿る
        const keys = key.split('.');
        let result = data;
        
        for (const k of keys) {
            if (result && result[k] !== undefined) {
                result = result[k];
            } else {
                return key; // キーが見つからない場合はキー自体を返す
            }
        }
        
        // 最終的なオブジェクトから言語キーで取得
        if (result && typeof result === 'object' && result[this.language] !== undefined) {
            return result[this.language];
        }
        
        // 言語キーがない場合（古い形式のデータ or 直接値）
        if (typeof result === 'string') {
            return result;
        }
        
        return key;
    }
    
    /* 言語切り替え */
    setLanguage(lang) {
        this.language = lang;
        setLanguage(lang);
        this.applyTranslations();
        
        // 登録されたコールバックを実行
        this.callbacks.forEach(cb => cb(lang));
        
        // カスタムイベント発火
        document.dispatchEvent(new CustomEvent('languageChanged', { 
            detail: { language: this.language } 
        }));
    }
    
    /* 言語変更時のコールバックを登録 */
    onLanguageChange(callback) {
        this.callbacks.push(callback);
    }
    
    /* 全要素に翻訳を適用 */
    applyTranslations() {
        // data-i18n属性のテキスト
        document.querySelectorAll('[data-i18n]').forEach(elem => {
            const key = elem.getAttribute('data-i18n');
            const source = elem.getAttribute('data-i18n-source') || 'common';
            const text = this.getText(key, source);
            if (text !== key) {
                elem.textContent = text;
            }
        });
        
        // data-i18n-html属性（HTMLを含むテキスト）
        document.querySelectorAll('[data-i18n-html]').forEach(elem => {
            const key = elem.getAttribute('data-i18n-html');
            const source = elem.getAttribute('data-i18n-source') || 'common';
            const text = this.getText(key, source);
            if (text !== key) {
                elem.innerHTML = text;
            }
        });
        
        // data-i18n-placeholder属性
        document.querySelectorAll('[data-i18n-placeholder]').forEach(elem => {
            const key = elem.getAttribute('data-i18n-placeholder');
            const source = elem.getAttribute('data-i18n-source') || 'common';
            const text = this.getText(key, source);
            if (text !== key) {
                elem.placeholder = text;
            }
        });
        
        // data-i18n-title属性
        document.querySelectorAll('[data-i18n-title]').forEach(elem => {
            const key = elem.getAttribute('data-i18n-title');
            const source = elem.getAttribute('data-i18n-source') || 'common';
            const text = this.getText(key, source);
            if (text !== key) {
                elem.title = text;
            }
        });
        
        // html lang属性を更新
        document.documentElement.lang = this.language;
    }
    
    /* 言語切り替えボタンを初期化 */
    initToggleButton() {
        const toggleBtn = document.getElementById('languageToggle');
        if (!toggleBtn) return;
        
        // ボタンテキスト更新
        toggleBtn.textContent = this.language === 'ja' ? 'English' : '日本語';
        
        // クリックイベント
        toggleBtn.addEventListener('click', () => {
            const newLang = this.language === 'ja' ? 'en' : 'ja';
            this.setLanguage(newLang);
            toggleBtn.textContent = newLang === 'ja' ? 'English' : '日本語';
        });
    }
    
    /* 現在の言語を取得 */
    getLanguage() {
        return this.language;
    }
}

// グローバルインスタンス
const i18n = new I18n();

/* i18n初期化関数 */
async function initI18n(pageName = null) {
    await i18n.loadCommon();
    if (pageName) {
        await i18n.loadPage(pageName);
    }
    i18n.applyTranslations();
    i18n.initToggleButton();
    
    console.log('i18n初期化完了:', i18n.language);
}
