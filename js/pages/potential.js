/**
 * 素質シミュレーター ページモジュール
 * 既存のscript.jsをラップして、タブ切り替え対応にする
 */

const PotentialApp = (function() {
    let initialized = false;
    let contentLoaded = false;
    
    // HTMLコンテンツを取得
    function getContentHTML() {
        return `
            <div class="container">
                <header>
                    <h1 data-i18n="page.title" data-i18n-source="potential">素質シミュレーター</h1>
                    <div class="controls">
                        <label>
                            <input type="checkbox" id="hideUnobtained"> <span data-i18n="buttons.hideUnobtained" data-i18n-source="potential">取得しない素質を非表示</span>
                        </label>
                        <button id="resetCount" class="btn" data-i18n="buttons.resetCount" data-i18n-source="potential">カウントリセット</button>
                        <button id="resetAll" class="btn btn-danger" data-i18n="buttons.reset" data-i18n-source="potential">初期化</button>
                        <button id="screenshot" class="btn btn-primary" data-i18n="buttons.screenshot" data-i18n-source="potential">スクショ</button>
                        <button id="showUsage" class="btn btn-info" data-i18n="buttons.usage" data-i18n-source="potential">使い方</button>
                        <button id="showChangelog" class="btn btn-info" data-i18n="buttons.changelog" data-i18n-source="potential">変更履歴</button>
                    </div>
                </header>

                <div class="main-content">
                    <div class="characters-area">
                        <div id="preset-name-container" style="text-align: center; margin-bottom: 15px; padding: 10px; background: #f0f0ff; border-radius: 5px;">
                            <div id="preset-name-display-area" style="display: flex; align-items: center; justify-content: center; gap: 10px;">
                                <span style="font-size: 14px; color: #667eea; font-weight: bold;">プリセット名:</span>
                                <input type="text" id="preset-name-input-inline" maxlength="20" placeholder="（未設定）" 
                                       style="font-size: 16px; color: #667eea; font-weight: bold; border: 2px solid transparent; background: transparent; padding: 5px; width: 300px; text-align: center; outline: none;"
                                       readonly>
                                <button id="preset-name-edit-btn" class="btn" style="padding: 5px 15px; font-size: 14px;">✎ 編集</button>
                            </div>
                        </div>
                        
                        <div id="screenshot-footer" style="display: none; text-align: center; padding: 10px; background: #f9f9f9; border-top: 2px solid #667eea; margin-top: 20px;">
                            <p style="margin: 0; font-size: 14px; color: #666;">ステラソラ おサボりツール - 素質シミュレーター</p>
                        </div>
                        
                        <div class="character-section" data-slot="main">
                            <div class="character-header">
                                <div class="character-label">
                                    <img src="images/others/label_main_ja.png" alt="主力" data-i18n-auto>
                                </div>
                                <div class="character-select-wrapper">
                                    <button class="character-select-button" data-slot="main">
                                        <span class="select-text">巡遊者を<br>選択してね</span>
                                    </button>
                                    <select class="character-select" data-slot="main" style="display: none;">
                                        <option value="">巡遊者を選択してね</option>
                                    </select>
                                </div>
                            </div>
                            <div class="potentials-container" id="main-potentials"></div>
                        </div>

                        <div class="character-section" data-slot="support1">
                            <div class="character-header">
                                <div class="character-label">
                                    <img src="images/others/label_support_ja.png" alt="支援" data-i18n-auto>
                                </div>
                                <div class="character-select-wrapper">
                                    <button class="character-select-button" data-slot="support1">
                                        <span class="select-text">巡遊者を<br>選択してね</span>
                                    </button>
                                    <select class="character-select" data-slot="support1" style="display: none;">
                                        <option value="">巡遊者を選択してね</option>
                                    </select>
                                </div>
                            </div>
                            <div class="potentials-container" id="support1-potentials"></div>
                        </div>

                        <div class="character-section" data-slot="support2">
                            <div class="character-header">
                                <div class="character-label">
                                    <img src="images/others/label_support_ja.png" alt="支援" data-i18n-auto>
                                </div>
                                <div class="character-select-wrapper">
                                    <button class="character-select-button" data-slot="support2">
                                        <span class="select-text">巡遊者を<br>選択してね</span>
                                    </button>
                                    <select class="character-select" data-slot="support2" style="display: none;">
                                        <option value="">巡遊者を選択してね</option>
                                    </select>
                                </div>
                            </div>
                            <div class="potentials-container" id="support2-potentials"></div>
                        </div>
                    </div>

                    <aside class="presets-area">
                        <h3 data-i18n="preset.title">プリセット</h3>
                        <div class="presets-list">
                            ${generatePresetItems()}
                        </div>
                    </aside>
                </div>

                <div id="errorMessage" class="error-message hidden"></div>
            </div>

            ${getModalsHTML()}
            ${getFooterHTML()}
        `;
    }
    
    // プリセットアイテムを生成
    function generatePresetItems() {
        let html = '';
        for (let i = 1; i <= 10; i++) {
            html += `
                <div class="preset-item" data-preset="${i}">
                    <div class="preset-thumbnail">
                        <img src="" alt="プリセット${i}" class="preset-icon" style="display: none;">
                        <span class="preset-number">${i}</span>
                    </div>
                    <div class="preset-actions">
                        <button class="btn-save" data-preset="${i}" data-i18n="buttons.save">保存</button>
                        <button class="btn-load" data-preset="${i}" disabled data-i18n="buttons.load">読み込み</button>
                    </div>
                </div>
            `;
        }
        return html;
    }
    
    // モーダルHTML
    function getModalsHTML() {
        return `
            <div id="usageModal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <button class="modal-close">&times;</button>
                        <h2 data-i18n="modal.usage.title" data-i18n-source="potential">使い方</h2>
                    </div>
                    <div class="modal-body">
                        <h3 data-i18n="modal.usage.basic" data-i18n-source="potential">基本操作</h3>
                        <p><strong data-i18n="modal.usage.step1Title" data-i18n-source="potential">1. 巡遊者を選択！</strong><br>
                        <span data-i18n-html="modal.usage.step1Text" data-i18n-source="potential">アイコンをクリックして選んでね。素質カードは主力と支援で自動で切り替わるから気にしなくていいよ～</span></p>
                        
                        <p><strong data-i18n="modal.usage.step2Title" data-i18n-source="potential">2. コア素質</strong><br>
                        <span data-i18n-html="modal.usage.step2Text" data-i18n-source="potential">「取得する/取得しない」ボタンをクリックして、取りたい素質を選ぼう！ゲームの仕様と同じで2つまでしか選べないようにしてるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.step3Title" data-i18n-source="potential">3. サブ素質</strong><br>
                        <span data-i18n-html="modal.usage.step3Text" data-i18n-source="potential">ボタンをクリックすると[取得しない]→[レベル1]→[レベル1～]→[レベル6]の順に切り替わるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.step4Title" data-i18n-source="potential">4. 素質レベルカウント</strong><br>
                        <span data-i18n-html="modal.usage.step4Text" data-i18n-source="potential">素質カードの画像部分をクリックするとレベルが上がっていくよ</span></p>
                        
                        <h3 data-i18n="modal.usage.others" data-i18n-source="potential">その他色々</h3>
                        <p><strong data-i18n="modal.usage.hideTitle" data-i18n-source="potential">取得しない素質を非表示</strong><br>
                        <span data-i18n-html="modal.usage.hideText" data-i18n-source="potential">チェックを入れると、「取得しない」素質が非表示になるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.presetTitle" data-i18n-source="potential">プリセット保存・読み込み</strong><br>
                        <span data-i18n-html="modal.usage.presetText" data-i18n-source="potential">巡遊者と素質のラベル設定を10個まで保存できるよ。</span></p>
                    </div>
                </div>
            </div>

            <div id="changelogModal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <button class="modal-close">&times;</button>
                        <h2 data-i18n="modal.changelog.title" data-i18n-source="potential">変更履歴</h2>
                    </div>
                    <div class="modal-body">
                        <h3>v1.0.1 2025.11.18</h3>
                        <ul><li>フユカに対応。キャラクター選択画面をモーダル形式に変更</li></ul>
                        <h3>v1.0.0 2025.11.16</h3>
                        <ul><li>お試しリリース！</li></ul>
                    </div>
                </div>
            </div>

            <div id="presetNameModal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content" style="max-width: 400px;">
                    <div class="modal-header">
                        <button class="modal-close">&times;</button>
                        <h2 data-i18n="modal.presetName.title" data-i18n-source="potential">プリセット名を入力</h2>
                    </div>
                    <div class="modal-body">
                        <p style="margin-bottom: 15px;">プリセット<span id="preset-number-display"></span>の名前を入力してください（最大20文字）</p>
                        <input type="text" id="preset-name-input" maxlength="20" style="width: 100%; padding: 10px; font-size: 16px; border: 2px solid #ddd; border-radius: 5px; margin-bottom: 15px;">
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="preset-name-cancel" class="btn btn-danger">キャンセル</button>
                            <button id="preset-name-save" class="btn">保存</button>
                        </div>
                    </div>
                </div>
            </div>

            <div class="character-modal" id="character-modal-main">
                <div class="character-modal-overlay"></div>
                <div class="character-modal-content">
                    <div class="character-modal-header">
                        <button class="character-modal-close">&times;</button>
                        <h3 class="character-modal-title" data-i18n="characterSelect.mainTitle" data-i18n-source="potential">主力キャラクター選択</h3>
                    </div>
                    <div class="character-modal-body">
                        <div class="character-modal-grid" data-slot="main"></div>
                    </div>
                </div>
            </div>

            <div class="character-modal" id="character-modal-support1">
                <div class="character-modal-overlay"></div>
                <div class="character-modal-content">
                    <div class="character-modal-header">
                        <button class="character-modal-close">&times;</button>
                        <h3 class="character-modal-title" data-i18n="characterSelect.support1Title" data-i18n-source="potential">支援キャラクター1選択</h3>
                    </div>
                    <div class="character-modal-body">
                        <div class="character-modal-grid" data-slot="support1"></div>
                    </div>
                </div>
            </div>

            <div class="character-modal" id="character-modal-support2">
                <div class="character-modal-overlay"></div>
                <div class="character-modal-content">
                    <div class="character-modal-header">
                        <button class="character-modal-close">&times;</button>
                        <h3 class="character-modal-title" data-i18n="characterSelect.support2Title" data-i18n-source="potential">支援キャラクター2選択</h3>
                    </div>
                    <div class="character-modal-body">
                        <div class="character-modal-grid" data-slot="support2"></div>
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
            console.log('PotentialApp: 既に初期化済み');
            return;
        }
        
        console.log('PotentialApp: 初期化開始');
        
        // コンテンツをロード
        const container = document.getElementById('potential-content');
        if (!container) {
            console.error('PotentialApp: コンテナが見つかりません');
            return;
        }
        
        if (!contentLoaded) {
            container.innerHTML = getContentHTML();
            contentLoaded = true;
        }
        
        // i18nの言語データをロード
        await i18n.loadPage('potential');
        
        // 既存のscript.jsを動的に読み込み
        await loadScript('js/script.js');
        
        // 翻訳を適用
        i18n.applyTranslations();
        
        initialized = true;
        console.log('PotentialApp: 初期化完了');
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
        console.log('PotentialApp: クリーンアップ');
        // 必要に応じてイベントリスナーの削除など
    }
    
    // パブリックAPI
    return {
        init,
        cleanup,
        isInitialized: () => initialized
    };
})();
