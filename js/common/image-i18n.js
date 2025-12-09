/* 言語設定に応じて画像を自動的に切り替える設定 */

class ImageI18n {
    constructor() {
        this.supportedExtensions = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        this.currentLang = 'ja';
    }
    
    /* 言語コードをファイル名用サフィックスに変換（ja→JP, en→EN） */
    langToSuffix(lang) {
        return lang === 'ja' ? 'JP' : 'EN';
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
        
        // _JP、_ENが付いてるかチェックのためにファイル名を分解
        const match = filename.match(/^(.+?)(_JP|_EN)?\.([^.]+)$/);
        if (!match) return null;
        
        return {
            dir: dir,
            basename: match[1],
            lang: match[2] ? match[2].substring(1) : null, // _JP -> JP, _EN -> EN
            ext: match[3]
        };
    }
    
    /* 言語付き画像パスを生成 */
    generateI18nPath(pathInfo, lang) {
        if (!pathInfo) return '';
        
        const { dir, basename, ext } = pathInfo;
        const dirPath = dir ? dir + '/' : '';
        const langSuffix = this.langToSuffix(lang);
        return `${dirPath}${basename}_${langSuffix}.${ext}`;
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
        // 1. _JPがない場合、共通の画像とする（何もしない。キャラアイコンなど）
        if (pathInfo.lang === null) {
            img.src = originalSrc;
            return;
        }
        
        // 2. 現在の言語に対応する画像パスを生成
        const langPath = this.generateI18nPath(pathInfo, lang);
        const jaPath = this.generateI18nPath(pathInfo, 'ja');
        
        // 共通画像パス（言語識別子なし）を生成
        const { dir, basename, ext } = pathInfo;
        const dirPath = dir ? dir + '/' : '';
        const commonPath = `${dirPath}${basename}.${ext}`;
        
        // 3. 画像が存在するかチェック（言語付き → _JP → 共通の順）
        if (await this.checkImageExists(langPath)) {
            img.src = langPath;
        } else if (await this.checkImageExists(jaPath)) {
            img.src = jaPath;
        } else {
            // 共通画像にフォールバック
            img.src = commonPath;
        }
    }
    
    /* data-i18n-img属性を持つ画像を更新 */
    async updateImageExplicit(img, lang) {
        const baseName = img.getAttribute('data-i18n-img');
        if (!baseName) return;
        
        const ext = img.getAttribute('data-i18n-ext') || 'png';
        const dir = img.getAttribute('data-i18n-dir') || 'images';
        const langSuffix = this.langToSuffix(lang);
        
        // 言語対応画像のパスを生成
        const langPath = `${dir}/${baseName}_${langSuffix}.${ext}`;
        const jaPath = `${dir}/${baseName}_JP.${ext}`;
        const commonPath = `${dir}/${baseName}.${ext}`;
        
        // 画像存在チェック（言語付き → _JP → 共通の順）
        if (await this.checkImageExists(langPath)) {
            img.src = langPath;
        } else if (await this.checkImageExists(jaPath)) {
            img.src = jaPath;
        } else {
            // 共通画像にフォールバック
            img.src = commonPath;
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
        const langSuffix = this.langToSuffix(targetLang);
        
        document.querySelectorAll('[data-i18n-bg]').forEach(async elem => {
            const baseName = elem.getAttribute('data-i18n-bg');
            const ext = elem.getAttribute('data-i18n-ext') || 'jpg';
            const dir = elem.getAttribute('data-i18n-dir') || 'images';
            
            // 言語対応画像のパスを生成
            const langPath = `${dir}/${baseName}_${langSuffix}.${ext}`;
            const jaPath = `${dir}/${baseName}_JP.${ext}`;
            const commonPath = `${dir}/${baseName}.${ext}`;
            
            // 画像存在チェック（言語付き → _JP → 共通の順）
            if (await this.checkImageExists(langPath)) {
                elem.style.backgroundImage = `url('${langPath}')`;
            } else if (await this.checkImageExists(jaPath)) {
                elem.style.backgroundImage = `url('${jaPath}')`;
            } else {
                // 共通画像にフォールバック
                elem.style.backgroundImage = `url('${commonPath}')`;
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
