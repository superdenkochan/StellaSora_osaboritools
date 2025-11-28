/**
 * 交換所チェッカー ページモジュール
 * 既存のexchange_checker.jsをラップして、タブ切り替え対応にする
 */

const ExchangeApp = (function() {
    let initialized = false;
    let contentLoaded = false;
    
    // HTMLコンテンツを取得
    function getContentHTML() {
        return `
            <!-- 背景 -->
            <div id="backgroundLayer" class="background-layer"></div>

            <div class="container">
                <header>
                    <h1 data-i18n="page.title" data-i18n-source="exchange">イベント交換所チェッカー</h1>
                    <div class="controls">
                        <button id="resetProgress" class="btn" data-i18n="buttons.resetProgress" data-i18n-source="exchange">進捗リセット</button>
                        <button id="resetAll" class="btn btn-danger" data-i18n="buttons.reset" data-i18n-source="exchange">初期化</button>
                        <button id="showUsage" class="btn btn-info" data-i18n="buttons.usage" data-i18n-source="exchange">使い方</button>
                    </div>
                </header>

                <div class="main-content">
                    <!-- イベント選択エリア -->
                    <div class="event-selector">
                        <label for="eventSelect" data-i18n="labels.event" data-i18n-source="exchange">イベント：</label>
                        <select id="eventSelect" class="event-select">
                            <option value="">-</option>
                        </select>
                    </div>

                    <!-- イベント情報表示エリア -->
                    <div id="eventInfo" class="event-info hidden">
                        <div class="three-column-layout">
                            <!-- 左カラム：計算結果サマリー -->
                            <div class="column column-left">
                                <h2 data-i18n="section.calcResult" data-i18n-source="exchange">計算結果</h2>
                                
                                <div class="current-points-section">
                                    <label for="currentPoints" data-i18n="labels.currentPoints" data-i18n-source="exchange">所持ポイント数</label>
                                    <input type="number" id="currentPoints" min="0" max="999999" value="0" class="points-input">
                                    <div class="points-buttons">
                                        <button id="pointsDecrease" class="points-btn points-btn-minus">-<span id="pointsDecreaseAmount">400</span></button>
                                        <img id="pointIcon" src="" alt="" class="point-icon">
                                        <button id="pointsIncrease" class="points-btn points-btn-plus">+<span id="pointsIncreaseAmount">400</span></button>
                                    </div>
                                </div>

                                <div class="summary-section">
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.remainingDays" data-i18n-source="exchange">残り日数</div>
                                        <div class="summary-value" id="remainingDays">-</div>
                                    </div>
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.remainingNeeded" data-i18n-source="exchange">残り周回ポイント</div>
                                        <div class="summary-value highlight" id="remainingNeeded">0</div>
                                    </div>
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.dailyQuota" data-i18n-source="exchange">1日あたりのノルマ</div>
                                        <div class="summary-value highlight" id="dailyQuota">0周</div>
                                    </div>
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.dailyStamina" data-i18n-source="exchange">1日あたりのやる気</div>
                                        <div class="summary-value highlight" id="dailyStamina">0</div>
                                    </div>
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.runsNeeded" data-i18n-source="exchange">あと何周？</div>
                                        <div class="summary-value highlight" id="runsNeeded">0</div>
                                    </div>
                                    <div class="summary-card">
                                        <div class="summary-label" data-i18n="summary.totalNeeded" data-i18n-source="exchange">欲しいもの全交換ノルマ</div>
                                        <div class="summary-value" id="totalNeeded">0</div>
                                    </div>
                                </div>
                            </div>

                            <!-- 中央カラム：交換所報酬 -->
                            <div class="column column-center">
                                <h2 data-i18n="section.lineup" data-i18n-source="exchange">ラインナップ</h2>
                                <div id="rewardsGrid" class="rewards-grid"></div>
                            </div>

                            <!-- 右カラム:ミッション報酬 -->
                            <div class="column column-right">
                                <div class="mission-header">
                                    <h2 data-i18n="section.clearReward" data-i18n-source="exchange">クリア報酬</h2>
                                    <label class="mission-filter">
                                        <input type="checkbox" id="hideCompletedMissions">
                                        <span data-i18n="labels.hideCompleted" data-i18n-source="exchange">クリア済を非表示</span>
                                    </label>
                                </div>
                                <div class="mission-summary">
                                    <div class="mission-total">
                                        <span data-i18n="mission.totalPoints" data-i18n-source="exchange">全達成の合計：</span>
                                        <span id="totalMissionPoints">0</span>
                                    </div>
                                    <div class="mission-remaining">
                                        <span data-i18n="mission.remainingPoints" data-i18n-source="exchange">残り獲得可能：</span>
                                        <span id="remainingMissionPoints">0</span>
                                    </div>
                                    <div class="mission-earned">
                                        <span data-i18n="mission.earnedPoints" data-i18n-source="exchange">獲得済み：</span>
                                        <span id="earnedMissionPoints">0</span>
                                    </div>
                                </div>
                                <div id="missionsGrid" class="missions-grid"></div>
                                <div id="compMissionsGrid" class="missions-grid" style="margin-top: 15px;"></div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <!-- 使い方モーダル -->
            <div id="usageModal" class="modal hidden">
                <div class="modal-overlay"></div>
                <div class="modal-content">
                    <div class="modal-header">
                        <button class="modal-close">&times;</button>
                        <h2 data-i18n="modal.usage.title" data-i18n-source="exchange">使い方</h2>
                    </div>
                    <div class="modal-body">
                        <p><strong data-i18n="modal.usage.step1Title" data-i18n-source="exchange">1. 欲しいアイテムを決める</strong><br>
                        <span data-i18n-html="modal.usage.step1Text" data-i18n-source="exchange">各カードをクリックすると取る・取らないを切り替えられるよ！<br>
                        交換しないアイテムの分はノルマから差し引かれるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.step2Title" data-i18n-source="exchange">2. 右側のクリア済任務を選択</strong><br>
                        <span data-i18n-html="modal.usage.step2Text" data-i18n-source="exchange">ゲーム内の状況と同じにしよう！<br>
                        左のポイントを合わせただけだと、あと何周すればいいかが正しく出ないから注意してね</span></p>
                        
                        <p><strong data-i18n="modal.usage.step3Title" data-i18n-source="exchange">3. 所持ポイント数を入力</strong><br>
                        <span data-i18n-html="modal.usage.step3Text" data-i18n-source="exchange">ここもゲーム内の状況と一致させてね（直接入力可）<br>
                        任務の分は自動で入るから周回した分とかを微調整</span></p>
                        
                        <p><strong data-i18n="modal.usage.step4Title" data-i18n-source="exchange">4. アイテムの交換状況を更新</strong><br>
                        <span data-i18n-html="modal.usage.step4Text" data-i18n-source="exchange">交換所で交換したら「-1」ボタン（緑）をクリックして在庫を減らしていこう！<br>
                        間違えた時は「+1」ボタン（赤）で戻せるよ</span></p>
                        
                        <p><strong data-i18n="modal.usage.step5Title" data-i18n-source="exchange">5. 計算結果を見る</strong><br>
                        <span data-i18n-html="modal.usage.step5Text" data-i18n-source="exchange">左の数字が計算結果！<br>
                        イベント終了までどれくらいのペースで周回すれば間に合うのかがわかるよ</span></p>
                    </div>
                </div>
            </div>

            <footer style="margin-top: 60px; padding-top: 20px; border-top: 2px solid #ffffff; text-align: center; color: #666;">
                <p style="color: white; margin-bottom: 10px;">
                    <a href="https://x.com/denko_gaminggal" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;">@denko_gaminggal</a> |
                    <a href="https://marshmallow-qa.com/2vagoau6ezqonbq?t=zH1owd&utm_medium=url_text&utm_source=promotion" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;" data-i18n="footer.marshmallow">マシュマロ（感想・要望など）</a> |
                    <a href="privacy.html" target="_blank" rel="noopener noreferrer" style="color: #0000ee; text-decoration: none; margin: 0 10px;" data-i18n="footer.privacy">プライバシーポリシー</a>
                </p>
                <p style="color: white"><span data-i18n="footer.copyright">©Yostar</span><br>
                <span data-i18n="footer.disclaimer">※本サイトはステラソラの非公式ファンサイトです！</span></p>
            </footer>
        `;
    }
    
    // 初期化
    async function init() {
        if (initialized) {
            console.log('ExchangeApp: 既に初期化済み');
            return;
        }
        
        console.log('ExchangeApp: 初期化開始');
        
        // コンテンツをロード
        const container = document.getElementById('exchange-content');
        if (!container) {
            console.error('ExchangeApp: コンテナが見つかりません');
            return;
        }
        
        if (!contentLoaded) {
            container.innerHTML = getContentHTML();
            contentLoaded = true;
        }
        
        // i18nの言語データをロード
        await i18n.loadPage('exchange');
        
        // 既存のexchange_checker.jsを動的に読み込み
        await loadScript('js/exchange_checker.js');
        
        // 翻訳を適用
        i18n.applyTranslations();
        
        initialized = true;
        console.log('ExchangeApp: 初期化完了');
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
        console.log('ExchangeApp: クリーンアップ');
    }
    
    // パブリックAPI
    return {
        init,
        cleanup,
        isInitialized: () => initialized
    };
})();
