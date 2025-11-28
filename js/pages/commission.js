/**
 * 依頼シミュレーター ページモジュール
 * 既存のsimu_commission.jsをラップして、タブ切り替え対応にする
 */

const CommissionApp = (function() {
    let initialized = false;
    let contentLoaded = false;
    
    // 依頼スロットのHTMLを生成
    function generateCommissionSlot(slotNum) {
        return `
            <div class="commission-slot" data-slot="${slotNum}">
                <div class="commission-header">
                    <button class="commission-select-btn" data-slot="${slotNum}">
                        <span class="commission-select-text" data-i18n="buttons.selectCommission" data-i18n-source="commission">依頼を選択</span>
                    </button>
                </div>
                <div class="commission-requirements">
                    <div class="requirement-section">
                        <h4 class="requirement-title" data-i18n="labels.requirementTitle" data-i18n-source="commission">条件達成に必要な性格</h4>
                        <div class="requirement-badges style-badges" data-slot="${slotNum}">
                        </div>
                    </div>
                </div>
                <div class="character-slots-with-roles">
                    <div class="role-character-container" data-commission="${slotNum}" data-position="1">
                        <div class="role-label"></div>
                        <div class="character-slot-item" data-commission="${slotNum}" data-position="1">
                            <div class="character-slot-placeholder">?</div>
                        </div>
                    </div>
                    <div class="role-character-container" data-commission="${slotNum}" data-position="2">
                        <div class="role-label"></div>
                        <div class="character-slot-item" data-commission="${slotNum}" data-position="2">
                            <div class="character-slot-placeholder">?</div>
                        </div>
                    </div>
                    <div class="role-character-container" data-commission="${slotNum}" data-position="3">
                        <div class="role-label"></div>
                        <div class="character-slot-item" data-commission="${slotNum}" data-position="3">
                            <div class="character-slot-placeholder">?</div>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // プリセットアイテムを生成
    function generatePresetItems() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `
                <div class="preset-item" data-preset="${i}">
                    <div class="preset-thumbnail"><span class="preset-number">${i}</span></div>
                    <div class="preset-actions">
                        <button class="btn-save" data-preset="${i}" data-i18n="buttons.save">保存</button>
                        <button class="btn-load" data-preset="${i}" disabled data-i18n="buttons.load">読み込み</button>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    // HTMLコンテンツを取得
    function getContentHTML() {
        return `
            <div class="container">
                <header>
                    <h1 data-i18n="page.title" data-i18n-source="commission">依頼シミュレーター</h1>
                    <div class="controls">
                        <button id="resetAll" class="btn btn-danger" data-i18n="buttons.reset" data-i18n-source="commission">初期化</button>
                        <button id="showUsage" class="btn btn-info" data-i18n="buttons.usage" data-i18n-source="commission">使い方</button>
                    </div>
                </header>

                <div class="main-content">
                    <!-- 上部コントロール -->
                    <div class="top-controls">
                        <button id="manageOwned" class="btn btn-primary" data-i18n="buttons.manageOwned" data-i18n-source="commission">所持巡遊者の設定</button>
                        <button id="autoAssign" class="btn btn-success" disabled data-i18n="buttons.autoAssign" data-i18n-source="commission">おまかせ</button>
                    </div>

                    <!-- 依頼エリア -->
                    <div class="commissions-area">
                        ${generateCommissionSlot(1)}
                        ${generateCommissionSlot(2)}
                        ${generateCommissionSlot(3)}
                        ${generateCommissionSlot(4)}
                    </div>

                    <!-- プリセット管理エリア -->
                    <aside class="presets-area">
                        <h3 data-i18n="preset.title">プリセット</h3>
                        <div class="presets-list">
                            ${generatePresetItems()}
                        </div>
                    </aside>
                </div>

                <!-- エラーメッセージ表示エリア -->
                <div id="errorMessage" class="error-message hidden"></div>
            </div>

            ${getModalsHTML()}
            ${getFooterHTML()}
        `;
    }
    
    // モーダルHTML
    function getModalsHTML() {
        return `
            <!-- 使い方モーダル -->
            <div class="usage-modal" id="usageModal">
                <div class="usage-modal-overlay"></div>
                <div class="usage-modal-content">
                    <div class="usage-modal-header">
                        <h3 class="usage-modal-title" data-i18n="modal.usage.title" data-i18n-source="commission">使い方</h3>
                        <button class="usage-modal-close">&times;</button>
                    </div>
                    <div class="usage-modal-body">
                        <h3 data-i18n="modal.usage.basic" data-i18n-source="commission">基本操作</h3>
                        <p><strong data-i18n="modal.usage.step1Title" data-i18n-source="commission">1. 所持巡遊者の設定</strong><br>
                        <span data-i18n-html="modal.usage.step1Text" data-i18n-source="commission">自分のデータに合わせて設定しよう！<br>
                        ここでグレーアウトさせた巡遊者は候補に出なくなるから、<br>
                        持ってない巡遊者と、レベル70未満の巡遊者も設定しておくのがおすすめ！</span></p>
                        
                        <p><strong data-i18n="modal.usage.step2Title" data-i18n-source="commission">2. 依頼を選択</strong><br>
                        <span data-i18n-html="modal.usage.step2Text" data-i18n-source="commission">依頼を最大4つ選んでね！</span></p>
                        
                        <p><strong data-i18n="modal.usage.step3Title" data-i18n-source="commission">3. 巡遊者を配置</strong><br>
                        <span data-i18n-html="modal.usage.step3Text" data-i18n-source="commission">「？」をクリックして巡遊者をあてはめていこう！</span></p>
                        
                        <p><strong data-i18n="modal.usage.step4Title" data-i18n-source="commission">4. おまかせ機能（試験中）</strong><br>
                        <span data-i18n-html="modal.usage.step4Text" data-i18n-source="commission">「おまかせ」ボタンを押すと、自動で組み合わせを提案してくれるよ！</span></p>
                        
                        <p><strong data-i18n="modal.usage.step5Title" data-i18n-source="commission">5. プリセット</strong><br>
                        <span data-i18n-html="modal.usage.step5Text" data-i18n-source="commission">現在の設定を保存できるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.step6Title" data-i18n-source="commission">6. 初期化</strong><br>
                        <span data-i18n-html="modal.usage.step6Text" data-i18n-source="commission">現在の設定と所持巡遊者をデフォの状態に戻すよ</span></p>
                    </div>
                </div>
            </div>

            <!-- 依頼選択モーダル -->
            <div class="commission-modal" id="commissionModal">
                <div class="commission-modal-overlay"></div>
                <div class="commission-modal-content">
                    <div class="commission-modal-header">
                        <h3 class="commission-modal-title" data-i18n="modal.selectCommission.title" data-i18n-source="commission">依頼を選択</h3>
                        <button class="commission-modal-close">&times;</button>
                    </div>
                    <div class="commission-modal-body">
                        <div class="commission-modal-grid"></div>
                    </div>
                </div>
            </div>

            <!-- キャラクター選択モーダル -->
            <div class="character-modal" id="characterModal">
                <div class="character-modal-overlay"></div>
                <div class="character-modal-content">
                    <div class="character-modal-header">
                        <h3 class="character-modal-title" data-i18n="modal.selectCharacter.title" data-i18n-source="commission">巡遊者を選択</h3>
                        <button class="character-modal-close">&times;</button>
                    </div>
                    <div class="character-modal-body">
                        <div class="character-modal-grid"></div>
                    </div>
                </div>
            </div>

            <!-- 所持キャラクター管理モーダル -->
            <div class="owned-characters-modal" id="ownedCharactersModal">
                <div class="owned-characters-modal-overlay"></div>
                <div class="owned-characters-modal-content">
                    <div class="owned-characters-modal-header">
                        <h3 class="owned-characters-modal-title" data-i18n="modal.manageOwned.title" data-i18n-source="commission">所持巡遊者の設定</h3>
                        <button class="owned-characters-modal-close">&times;</button>
                    </div>
                    <div class="owned-characters-modal-body">
                        <div class="owned-characters-grid"></div>
                    </div>
                </div>
            </div>

            <!-- おまかせ結果モーダル -->
            <div class="auto-assign-modal" id="autoAssignModal">
                <div class="auto-assign-modal-overlay"></div>
                <div class="auto-assign-modal-content">
                    <div class="auto-assign-modal-header">
                        <h3 class="auto-assign-modal-title" data-i18n="modal.autoAssign.title" data-i18n-source="commission">おまかせ編成候補</h3>
                        <button class="auto-assign-modal-close">&times;</button>
                    </div>
                    <div class="auto-assign-modal-body">
                        <div id="autoAssignResults"></div>
                    </div>
                </div>
            </div>
        `;
    }
    
    // フッターHTML
    function getFooterHTML() {
        return `
            <footer style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #ffffff; text-align: center; color: #666;">
                <p style="color: white; margin-bottom: 10px;">
                    <a href="https://x.com/denko_gaminggal" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;">@denko_gaminggal</a> |
                    <a href="https://marshmallow-qa.com/2vagoau6ezqonbq?t=zH1owd&utm_medium=url_text&utm_source=promotion" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;" data-i18n="footer.marshmallow">マシュマロ（感想・要望など）</a> |
                    <a href="privacy.html" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;" data-i18n="footer.privacy">プライバシーポリシー</a>
                </p>
                <p style="color: white;"><span data-i18n="footer.copyright">©Yostar</span><br>
                <span data-i18n="footer.disclaimer">※本サイトはステラソラの非公式ファンサイトです！</span></p>
            </footer>
        `;
    }
    
    // 初期化
    async function init() {
        if (initialized) {
            console.log('CommissionApp: 既に初期化済み');
            return;
        }
        
        console.log('CommissionApp: 初期化開始');
        
        // コンテンツをロード
        const container = document.getElementById('commission-content');
        if (!container) {
            console.error('CommissionApp: コンテナが見つかりません');
            return;
        }
        
        if (!contentLoaded) {
            container.innerHTML = getContentHTML();
            contentLoaded = true;
        }
        
        // i18nの言語データをロード
        await i18n.loadPage('commission');
        
        // 既存のsimu_commission.jsを動的に読み込み
        await loadScript('js/simu_commission.js');
        
        // 翻訳を適用
        i18n.applyTranslations();
        
        initialized = true;
        console.log('CommissionApp: 初期化完了');
    }
    
    // スクリプトを動的に読み込み
    function loadScript(src) {
        return new Promise((resolve, reject) => {
            // 既に読み込まれているかチェック
            if (document.querySelector(`script[src="${src}"]`)) {
                resolve();
                return;
            }
            
            const script = document.createElement('script');
            script.src = src;
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
        });
    }
    
    // クリーンアップ
    function cleanup() {
        console.log('CommissionApp: クリーンアップ');
    }
    
    // パブリックAPI
    return {
        init,
        cleanup,
        isInitialized: () => initialized
    };
})();
