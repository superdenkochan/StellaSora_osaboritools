/* 言語設定に応じて画像を自動的に切り替える設定 */

class ImageI18n {
    constructor() {
        this.supportedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        this.currentLang = 'ja';
    }
    
    /* 画像パスから情報を抽出 */
    parseImagePath(src) {
        if (!src) return null;
        
        // URLからパスを抽出（絶対パスの場合）
        let path = src;
        try {
            const url = new URL(src, window.location.href);
            path = url.pathname;
        } catch (e) {
            // 相対パスの場合はそのまま
        }
        
        // パスを分割
        const parts = path.split('/');
        const filename = parts[parts.length - 1];
        const dir = parts.slice(0, -1).join('/');
        
        // _ja、_enが付いてるかチェックのためにファイル名を分解
        const match = filename.match(/^(.+?)(_ja|_en)?\.([^.]+)$/);
        if (!match) return null;
        
        return {
            dir: dir,
            basename: match[1],
            lang: match[2] ? match[2].substring(1) : null, // _ja -> ja
            ext: match[3]
        };
    }
    
    /* 言語付き画像パスを生成 */
    generateI18nPath(pathInfo, lang) {
        if (!pathInfo) return '';
        
        const { dir, basename, ext } = pathInfo;
        const dirPath = dir ? dir + '/' : '';
        return `${dirPath}${basename}_${lang}.${ext}`;
    }
    
    /* 画像が存在しているかチェック */
    async checkImageExists(src) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(true);
            img.onerror = () => resolve(false);
            img.src = src;
        });
    }
    
    /* 単一の画像要素を言語に応じて更新 */
    async updateImage(img, lang) {
        const originalSrc = img.getAttribute('data-i18n-original-src') || img.src;
        
        // 初回の場合はオリジナルのsrcを保存
        if (!img.getAttribute('data-i18n-original-src')) {
            img.setAttribute('data-i18n-original-src', originalSrc);
        }
        
        // パス情報を解析
        const pathInfo = this.parseImagePath(originalSrc);
        if (!pathInfo) {
            console.warn('画像パスの解析に失敗:', originalSrc);
            return;
        }
        
        // ルール適用
        // 1. _jaがない場合、共通の画像とする（何もしない。キャラアイコンなど）
        if (pathInfo.lang === null) {
            img.src = originalSrc;
            return;
        }
        
        // 2. 現在の言語に対応する画像パスを生成
        const langPath = this.generateI18nPath(pathInfo, lang);
        
        // 3. 画像が存在するかチェック
        const exists = await this.checkImageExists(langPath);
        
        if (exists) {
            // 言語対応画像が存在する
            img.src = langPath;
        } else {
            // 4. _jaがあるのに_enがない場合 → 仮置きとして_jaを表示させる
            const jaPath = this.generateI18nPath(pathInfo, 'ja');
            img.src = jaPath;
        }
    }
    
    /* data-i18n-img属性を持つ画像を更新 */
    async updateImageExplicit(img, lang) {
        const baseName = img.getAttribute('data-i18n-img');
        if (!baseName) return;
        
        const ext = img.getAttribute('data-i18n-ext') || 'png';
        const dir = img.getAttribute('data-i18n-dir') || 'images';
        
        // 言語対応画像のパスを生成
        const langPath = `${dir}/${baseName}_${lang}.${ext}`;
        
        // 画像存在チェック
        const exists = await this.checkImageExists(langPath);
        
        if (exists) {
            img.src = langPath;
        } else {
            // フォールバック: _jaを表示
            const jaPath = `${dir}/${baseName}_ja.${ext}`;
            img.src = jaPath;
        }
        
        // alt属性の更新（data-i18n-alt が指定されている場合）
        const altKey = img.getAttribute('data-i18n-alt');
        if (altKey && window.i18n) {
            const altSource = img.getAttribute('data-i18n-source') || 'common';
            img.alt = i18n.getText(altKey, altSource);
        }
    }
    
    /* すべての言語対応画像を更新 */
    async updateAllImages(lang = null) {
        const targetLang = lang || (window.i18n ? i18n.language : 'ja');
        this.currentLang = targetLang;
        
        // data-i18n-img属性を持つ画像（明示的指定）
        const explicitImages = document.querySelectorAll('[data-i18n-img]');
        for (const img of explicitImages) {
            await this.updateImageExplicit(img, targetLang);
        }
        
        // data-i18n-auto属性を持つ画像（自動検出）
        const autoImages = document.querySelectorAll('[data-i18n-auto]');
        for (const img of autoImages) {
            await this.updateImage(img, targetLang);
        }
    }
    
    /* 背景画像の更新 */
    async updateBackgroundImages(lang = null) {
        const targetLang = lang || this.currentLang;
        
        document.querySelectorAll('[data-i18n-bg]').forEach(async elem => {
            const baseName = elem.getAttribute('data-i18n-bg');
            const ext = elem.getAttribute('data-i18n-ext') || 'jpg';
            const dir = elem.getAttribute('data-i18n-dir') || 'images';
            
            // 言語対応画像のパスを生成
            const langPath = `${dir}/${baseName}_${lang}.${ext}`;
            
            // 画像存在チェック
            const exists = await this.checkImageExists(langPath);
            
            if (exists) {
                elem.style.backgroundImage = `url('${langPath}')`;
            } else {
                // フォールバック
                const jaPath = `${dir}/${baseName}_ja.${ext}`;
                elem.style.backgroundImage = `url('${jaPath}')`;
            }
        });
    }
    
    /* 動的に生成された画像要素に対する処理 */
    async processDynamicImage(img) {
        if (img.hasAttribute('data-i18n-img')) {
            await this.updateImageExplicit(img, this.currentLang);
        } else if (img.hasAttribute('data-i18n-auto')) {
            await this.updateImage(img, this.currentLang);
        }
    }
}

// グローバルインスタンス
const imageI18n = new ImageI18n();

// 言語変更イベントリスナー
document.addEventListener('languageChanged', (e) => {
    imageI18n.updateAllImages(e.detail.language);
    imageI18n.updateBackgroundImages(e.detail.language);
});

// DOMContentLoaded時の初期化
document.addEventListener('DOMContentLoaded', () => {
    // i18nが読み込まれるのを待つ
    const initImageI18n = () => {
        if (window.i18n) {
            imageI18n.updateAllImages();
            imageI18n.updateBackgroundImages();
        } else {
            // i18nが後から読み込まれる場合に備える
            setTimeout(initImageI18n, 100);
        }
    };
    
    initImageI18n();
});

// MutationObserverで動的に追加される画像を監視（オプション）
if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            mutation.addedNodes.forEach((node) => {
                if (node.nodeType === 1) { // Element node
                    // 追加されたノード自体が画像の場合
                    if (node.tagName === 'IMG' && 
                        (node.hasAttribute('data-i18n-img') || node.hasAttribute('data-i18n-auto'))) {
                        imageI18n.processDynamicImage(node);
                    }
                    
                    // 追加されたノードの子孫に画像がある場合
                    const images = node.querySelectorAll && node.querySelectorAll('[data-i18n-img], [data-i18n-auto]');
                    if (images) {
                        images.forEach(img => imageI18n.processDynamicImage(img));
                    }
                }
            });
        });
    });
    
    // 監視開始（bodyが利用可能になってから）
    if (document.body) {
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    } else {
        document.addEventListener('DOMContentLoaded', () => {
            observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        });
    }
}
