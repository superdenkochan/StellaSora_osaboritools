/* URLハッシュベースのルーター */

class Router {
    constructor() {
        this.routes = new Map();
        this.currentRoute = null;
        this.defaultRoute = 'top';
        this.initialized = false;
        
        // ハッシュ変更イベント
        window.addEventListener('hashchange', () => this.handleRoute());
        
        // popstate（戻る/進むボタン）
        window.addEventListener('popstate', () => this.handleRoute());
    }
    
    /**
     * ルート登録
     * @param {string} path - ルートパス
     * @param {Object} options - オプション
     * @param {Function} options.onEnter - 遷移時のコールバック
     * @param {Function} options.onLeave - 離脱時のコールバック
     */
    register(path, options = {}) {
        this.routes.set(path, {
            path,
            onEnter: options.onEnter || (() => {}),
            onLeave: options.onLeave || (() => {})
        });
    }
    
    /**
     * ルート処理
     */
    handleRoute() {
        const hash = window.location.hash.slice(1) || this.defaultRoute;
        const route = this.routes.get(hash);
        
        if (route) {
            // 前のルートの離脱処理
            if (this.currentRoute && this.currentRoute.path !== hash) {
                const prevRoute = this.routes.get(this.currentRoute.path);
                if (prevRoute && prevRoute.onLeave) {
                    prevRoute.onLeave();
                }
            }
            
            // 新しいルートの遷移処理
            route.onEnter();
            this.currentRoute = route;
            
            // カスタムイベント発火
            document.dispatchEvent(new CustomEvent('routeChanged', {
                detail: { 
                    route: hash,
                    previousRoute: this.currentRoute ? this.currentRoute.path : null
                }
            }));
        } else {
            // 存在しないルートの場合はデフォルトへ
            this.navigate(this.defaultRoute);
        }
    }
    
    /**
     * プログラムによるナビゲーション
     * @param {string} path - 遷移先パス
     * @param {boolean} replace - 履歴を置換するかどうか
     */
    navigate(path, replace = false) {
        if (replace) {
            window.history.replaceState(null, '', `#${path}`);
        } else {
            window.location.hash = path;
        }
    }
    
    /**
     * 現在のルート取得
     * @returns {string}
     */
    getCurrentRoute() {
        return window.location.hash.slice(1) || this.defaultRoute;
    }
    
    /**
     * 初期化（DOMContentLoaded後に呼ぶ）
     */
    init() {
        if (!this.initialized) {
            this.initialized = true;
            this.handleRoute();
        }
    }
}

// グローバルインスタンス
const router = new Router();
