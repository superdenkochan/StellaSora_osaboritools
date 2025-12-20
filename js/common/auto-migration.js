/* 新ドメインのLocalStorageに旧サイトのデータを移行するためのスクリプト */

(function() {
    'use strict';
    
    // 設定（T/Fを要確認）
    const CONFIG = {
        // 旧ドメインのURL
        OLD_DOMAIN: 'https://superdenkochan.github.io',
        
        // 旧ドメインのリポジトリ名
        OLD_PATH: '/StellaSora_osaboritools',
        
        TIMEOUT: 10000,
        
        // デバッグモード（本番ではfalseにする）
        DEBUG: true,
        
        // 移行完了フラグのキー
        MIGRATION_FLAG: 'migration_completed_v1',
        
        // 移行エラー表示済みフラグのキー
        ERROR_SHOWN_FLAG: 'migration_error_shown_v1'
    };
    
    function log(...args) {
        if (CONFIG.DEBUG) {
            console.log('[Auto Migration]', ...args);
        }
    }
    
    function logError(...args) {
        console.error('[Auto Migration]', ...args);
    }
    
    // 移行ステータスチェック
    
    function isMigrationCompleted() {
        return localStorage.getItem(CONFIG.MIGRATION_FLAG) === 'true';
    }
    
    function setMigrationCompleted() {
        localStorage.setItem(CONFIG.MIGRATION_FLAG, 'true');
    }
    
    function isErrorShown() {
        return localStorage.getItem(CONFIG.ERROR_SHOWN_FLAG) === 'true';
    }
    
    function setErrorShown() {
        localStorage.setItem(CONFIG.ERROR_SHOWN_FLAG, 'true');
    }
    
    // データ移行の実行
    
    function performMigration() {
        return new Promise((resolve, reject) => {
            log('Starting migration...');
            log('Old domain:', CONFIG.OLD_DOMAIN + CONFIG.OLD_PATH);
            
            // 隠しiframeを作成
            const iframe = document.createElement('iframe');
            iframe.style.display = 'none';
            iframe.src = CONFIG.OLD_DOMAIN + CONFIG.OLD_PATH + '/migration-helper.html';
            
            let timeoutId;
            let resolved = false;
            
            // メッセージ受信ハンドラ
            function messageHandler(event) {
                // オリジン検証
                if (event.origin !== CONFIG.OLD_DOMAIN) {
                    log('Ignoring message from:', event.origin);
                    return;
                }
                
                log('Received message:', event.data);
                
                if (event.data && event.data.type === 'LOCALSTORAGE_DATA') {
                    resolved = true;
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', messageHandler);
                    document.body.removeChild(iframe);
                    
                    if (event.data.success && event.data.data) {
                        resolve(event.data.data);
                    } else {
                        reject(new Error('データの取得に失敗しました'));
                    }
                }
            }
            
            window.addEventListener('message', messageHandler);
            
            // iframeの読み込み完了時
            iframe.onload = function() {
                log('iframe loaded, requesting data...');
                
                // データをリクエスト
                iframe.contentWindow.postMessage({
                    type: 'REQUEST_LOCALSTORAGE'
                }, CONFIG.OLD_DOMAIN);
            };
            
            // iframeの読み込みエラー
            iframe.onerror = function() {
                if (!resolved) {
                    resolved = true;
                    clearTimeout(timeoutId);
                    window.removeEventListener('message', messageHandler);
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    reject(new Error('旧サイトへの接続に失敗しました'));
                }
            };
            
            // タイムアウト処理
            timeoutId = setTimeout(() => {
                if (!resolved) {
                    resolved = true;
                    window.removeEventListener('message', messageHandler);
                    if (iframe.parentNode) {
                        document.body.removeChild(iframe);
                    }
                    reject(new Error('タイムアウト：旧サイトからの応答がありません'));
                }
            }, CONFIG.TIMEOUT);
            
            // iframeをDOMに追加
            document.body.appendChild(iframe);
        });
    }
    
    // データの保存
    
    function saveData(data) {
        let savedCount = 0;
        let skippedCount = 0;
        
        for (const [key, value] of Object.entries(data)) {
            // 移行フラグ自体は移行しない
            if (key === CONFIG.MIGRATION_FLAG || key === CONFIG.ERROR_SHOWN_FLAG) {
                continue;
            }
            
            // 既存データがある場合はスキップ（上書きしない）
            if (localStorage.getItem(key) !== null) {
                log('Skipping existing key:', key);
                skippedCount++;
                continue;
            }
            
            try {
                localStorage.setItem(key, value);
                savedCount++;
                log('Saved:', key);
            } catch (e) {
                logError('Failed to save:', key, e);
            }
        }
        
        log(`Migration complete: ${savedCount} saved, ${skippedCount} skipped`);
        return { savedCount, skippedCount };
    }
    
    // 通知UI（オプション）
    
    function showSuccessNotification(savedCount) {
        // 移行したデータがなければ通知しない
        if (savedCount === 0) {
            return;
        }
        
        const notification = document.createElement('div');
        notification.className = 'migration-notification migration-success';
        notification.innerHTML = `
            <div class="migration-notification-content">
                <span class="migration-notification-icon">✓</span>
                <span class="migration-notification-text">
                    <span class="text-ja">旧サイトからデータを移行しました（${savedCount}件）</span>
                    <span class="text-en">Data migrated from old site (${savedCount} items)</span>
                </span>
                <button class="migration-notification-close" aria-label="閉じる">&times;</button>
            </div>
        `;
        
        addNotificationStyles();
        document.body.appendChild(notification);
        
        // 閉じるボタン
        notification.querySelector('.migration-notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // 5秒後に自動で消える
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
    }
    
    function showErrorNotification(error) {
        // 2回目以降はエラーを表示しない
        if (isErrorShown()) {
            log('Error notification already shown, skipping');
            return;
        }
        
        setErrorShown();
        
        const notification = document.createElement('div');
        notification.className = 'migration-notification migration-error';
        notification.innerHTML = `
            <div class="migration-notification-content">
                <span class="migration-notification-icon">!</span>
                <span class="migration-notification-text">
                    <span class="text-ja">データ移行をスキップしました</span>
                    <span class="text-en">Data migration skipped</span>
                </span>
                <button class="migration-notification-close" aria-label="閉じる">&times;</button>
            </div>
        `;
        
        addNotificationStyles();
        document.body.appendChild(notification);
        
        // 閉じるボタン
        notification.querySelector('.migration-notification-close').addEventListener('click', () => {
            notification.remove();
        });
        
        // 5秒後に自動で消える
        setTimeout(() => {
            if (notification.parentNode) {
                notification.style.opacity = '0';
                setTimeout(() => notification.remove(), 300);
            }
        }, 5000);
        
        log('Error:', error.message);
    }
    
    function addNotificationStyles() {
        if (document.getElementById('migration-notification-styles')) {
            return;
        }
        
        const style = document.createElement('style');
        style.id = 'migration-notification-styles';
        style.textContent = `
            .migration-notification {
                position: fixed;
                top: 80px;
                left: 50%;
                transform: translateX(-50%);
                z-index: 10000;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                font-size: 14px;
                transition: opacity 0.3s ease;
            }
            
            .migration-notification-content {
                display: flex;
                align-items: center;
                gap: 10px;
            }
            
            .migration-notification-icon {
                width: 24px;
                height: 24px;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                flex-shrink: 0;
            }
            
            .migration-notification-close {
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                padding: 0 4px;
                opacity: 0.7;
                margin-left: 8px;
            }
            
            .migration-notification-close:hover {
                opacity: 1;
            }
            
            .migration-success {
                background: #d4edda;
                border: 1px solid #c3e6cb;
                color: #155724;
            }
            
            .migration-success .migration-notification-icon {
                background: #28a745;
                color: white;
            }
            
            .migration-error {
                background: #fff3cd;
                border: 1px solid #ffeeba;
                color: #856404;
            }
            
            .migration-error .migration-notification-icon {
                background: #ffc107;
                color: #000;
            }
            
            @media (max-width: 600px) {
                .migration-notification {
                    left: 10px;
                    right: 10px;
                    transform: none;
                }
            }
        `;
        document.head.appendChild(style);
    }
    
    // メイン処理
    
    async function main() {
        // 既に移行済みならスキップ
        if (isMigrationCompleted()) {
            log('Migration already completed, skipping');
            return;
        }
        
        // 同じドメイン（旧サイト）からアクセスしている場合はスキップ
        if (window.location.origin === CONFIG.OLD_DOMAIN) {
            log('Currently on old domain, skipping migration');
            return;
        }
        
        log('Starting auto migration...');
        
        try {
            const data = await performMigration();
            const { savedCount } = saveData(data);
            setMigrationCompleted();
            
            // 成功通知を表示
            showSuccessNotification(savedCount);
            
            // データがあれば、ページをリロードして反映
            if (savedCount > 0) {
                log('Reloading page to apply migrated data...');
                setTimeout(() => {
                    window.location.reload();
                }, 2000);
            }
        } catch (error) {
            logError('Migration failed:', error);
            
            // エラー通知を表示（初回のみ）
            showErrorNotification(error);
            
            // 失敗しても移行完了フラグは立てずに次回アクセス時に再試行
        }
    }
    
    // デバッグ用関数（グローバルに公開）
    
    window.migrationDebug = {
        // 移行状態を確認
        getStatus: function() {
            return {
                completed: isMigrationCompleted(),
                errorShown: isErrorShown(),
                config: CONFIG
            };
        },
        
        // 移行フラグをリセット（再テスト用）
        reset: function() {
            localStorage.removeItem(CONFIG.MIGRATION_FLAG);
            localStorage.removeItem(CONFIG.ERROR_SHOWN_FLAG);
            console.log('Migration flags reset. Reload the page to test migration.');
        },
        
        // 手動で移行を実行
        runManually: async function() {
            localStorage.removeItem(CONFIG.MIGRATION_FLAG);
            localStorage.removeItem(CONFIG.ERROR_SHOWN_FLAG);
            await main();
        }
    };
    
    // 実行
    
    // DOMContentLoaded後に実行
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', main);
    } else {
        main();
    }
    
})();
