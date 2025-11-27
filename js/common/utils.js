/* 共通ユーティリティ */

/* Google Analytics初期化 */
function initGoogleAnalytics(trackingId) {
    if (!trackingId) return;
    
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', trackingId);
}

/* ローカルストレージのヘルパー */
const Storage = {
    /**
     * 値を取得
     * @param {string} key - キー
     * @param {*} defaultValue - デフォルト値
     * @returns {*} 保存された値またはデフォルト値
     */
    get(key, defaultValue = null) {
        try {
            const value = localStorage.getItem(key);
            return value ? JSON.parse(value) : defaultValue;
        } catch {
            return defaultValue;
        }
    },
    
    /**
     * 値を保存
     * @param {string} key - キー
     * @param {*} value - 保存する値
     * @returns {boolean} 成功したかどうか
     */
    set(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch {
            return false;
        }
    },
    
    /**
     * 値を削除
     * @param {string} key - キー
     */
    remove(key) {
        localStorage.removeItem(key);
    }
};

/* 言語設定を取得 */
function getCurrentLanguage() {
    return Storage.get('language', 'ja');
}

/* 言語設定を保存 */
function setCurrentLanguage(lang) {
    Storage.set('language', lang);
}
