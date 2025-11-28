// グローバル変数
let gameData = {
    events: [],
    eventPoints: [],
    exchangeRewards: [],
    missionRewards: [],
    missionCompRewards: []
};
let currentEvent = null;
let rewardStates = {};
let missionStates = {};
let missionCompStates = {};
let currentPoints = 0;
let loadedEvents = new Set(); // 読み込み済みイベントID
let eventList = []; // イベント一覧

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // i18n初期化
    await initI18n('exchange');
    
    // イベント一覧読み込み
    await loadEventList();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // イベントセレクト初期化
    initializeEventSelect();
    
    // ローカルストレージから復元
    loadFromLocalStorage();
    
    // 言語変更イベントをリッスン
    document.addEventListener('languageChanged', () => {
        updateLanguageDisplay();
    });
});

// イベント一覧読み込み
async function loadEventList() {
    try {
        const response = await fetch('data/event_list.json');
        eventList = await response.json();
        console.log('イベント一覧読み込み完了', eventList);
    } catch (error) {
        console.error('イベント一覧読み込みエラー:', error);
        alert(i18n.getText('messages.loadError', 'exchange'));
    }
}

// 個別イベントデータ読み込み
async function loadEventData(eventId) {
    // 既に読み込み済みの場合はスキップ
    if (loadedEvents.has(eventId)) {
        console.log(`イベント${eventId}は既に読み込み済み`);
        return;
    }
    
    try {
        const response = await fetch(`data/event_${eventId}.json`);
        const eventData = await response.json();
        
        console.log(`イベント${eventId}のデータ:`, eventData);
        
        // gameDataに統合
        gameData.events.push(eventData.event);
        gameData.eventPoints.push(eventData.eventPoint);
        gameData.exchangeRewards.push(...eventData.exchangeRewards);
        gameData.missionRewards.push(...eventData.missionRewards);
        if (eventData.missionCompRewards && eventData.missionCompRewards.length > 0) {
            gameData.missionCompRewards.push(...eventData.missionCompRewards);
        }
        
        // 読み込み済みとしてマーク
        loadedEvents.add(eventId);
        console.log(`イベント${eventId}のデータ読み込み完了`);
        console.log('Background image:', eventData.event.backgroundImage);
    } catch (error) {
        console.error(`イベント${eventId}のデータ読み込みエラー:`, error);
        alert(i18n.getText('messages.eventLoadError', 'exchange'));
    }
}

// イベントリスナー設定
function setupEventListeners() {
    // イベント選択
    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
        eventSelect.addEventListener('change', onEventChange);
    }
    
    // ボタン
    const resetProgressBtn = document.getElementById('resetProgress');
    if (resetProgressBtn) {
        resetProgressBtn.addEventListener('click', resetProgress);
    }
    
    const resetAllBtn = document.getElementById('resetAll');
    if (resetAllBtn) {
        resetAllBtn.addEventListener('click', resetAll);
    }
    
    const showUsageBtn = document.getElementById('showUsage');
    if (showUsageBtn) {
        showUsageBtn.addEventListener('click', showUsageModal);
    }
    
    // モーダル閉じる
    document.querySelectorAll('.modal-close, .modal-overlay').forEach(element => {
        element.addEventListener('click', closeAllModals);
    });
}

// イベントセレクト初期化
function initializeEventSelect() {
    const eventSelect = document.getElementById('eventSelect');
    
    if (!eventList || eventList.length === 0) return;
    
    eventList.forEach(event => {
        const option = document.createElement('option');
        option.value = event.eventId;
        option.textContent = event.name[i18n.getLanguage()];
        eventSelect.appendChild(option);
    });
}

// イベント変更時の処理
async function onEventChange(e) {
    const eventId = parseInt(e.target.value);
    
    if (!eventId) {
        document.getElementById('eventInfo').classList.add('hidden');
        return;
    }
    
    // イベントデータを読み込み（未読み込みの場合）
    await loadEventData(eventId);
    
    currentEvent = gameData.events.find(event => event.eventId === eventId);
    
    if (!currentEvent) {
        console.error('イベントが見つかりません:', eventId);
        return;
    }
    
    // イベント情報表示
    displayEventInfo();
    
    // 報酬初期化
    initializeRewards();
    
    // ミッション初期化
    initializeMissions();
    
    // コンプリートミッション初期化
    initializeCompMissions();
    
    // ローカルストレージから復元
    loadEventStateFromLocalStorage(eventId);
    
    // 計算更新
    updateCalculations();
    
    // 表示
    document.getElementById('eventInfo').classList.remove('hidden');
    
    // イベント情報内の要素にイベントリスナーを設定（初回のみ）
    setupEventInfoListeners();
}

// イベント情報内の要素のイベントリスナー設定（初回のみ）
let eventInfoListenersSetup = false;
function setupEventInfoListeners() {
    if (eventInfoListenersSetup) return;
    
    // 現在のポイント数
    const currentPointsInput = document.getElementById('currentPoints');
    if (currentPointsInput) {
        currentPointsInput.addEventListener('input', onPointsChange);
    }
    
    // ポイント操作ボタン
    const pointsDecrease = document.getElementById('pointsDecrease');
    if (pointsDecrease) {
        pointsDecrease.addEventListener('click', decreasePoints);
    }
    
    const pointsIncrease = document.getElementById('pointsIncrease');
    if (pointsIncrease) {
        pointsIncrease.addEventListener('click', increasePoints);
    }
    
    // ミッション非表示チェックボックス
    const hideCompletedMissions = document.getElementById('hideCompletedMissions');
    if (hideCompletedMissions) {
        hideCompletedMissions.addEventListener('change', toggleHideCompletedMissions);
    }
    
    eventInfoListenersSetup = true;
}

// イベント情報表示
function displayEventInfo() {
    console.log('displayEventInfo called', currentEvent);
    
    // 背景画像設定
    const bgLayer = document.getElementById('backgroundLayer');
    if (bgLayer && currentEvent.backgroundImage) {
        bgLayer.style.backgroundImage = `url('${currentEvent.backgroundImage}')`;
        }

    // ポイント名と収集アイテムのアイコン
    const pointData = gameData.eventPoints.find(p => p.id === currentEvent.pointId);
    if (pointData) {
        // アイコン画像を設定
        const pointIcon = document.getElementById('pointIcon');
        if (pointIcon) {
            pointIcon.src = pointData.icon;
            pointIcon.alt = pointData.name[i18n.getLanguage()];
        }
    }
    
    // ポイントボタンの表示を更新
    document.getElementById('pointsDecreaseAmount').textContent = currentEvent.pointsPerRun;
    document.getElementById('pointsIncreaseAmount').textContent = currentEvent.pointsPerRun;
    
    // 残り日数計算
    updateRemainingDays();
}

// 残り日数計算
function updateRemainingDays() {
    const now = new Date();
    const endDate = new Date(currentEvent.endDate);
    
    // 終了日時までの残り時間（ミリ秒）
    const diffTime = endDate - now;
    
    const remainingDaysElement = document.getElementById('remainingDays');
    
    if (diffTime > 0) {
        // dd/hh/mm/ssを計算
        const days = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diffTime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diffTime % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diffTime % (1000 * 60)) / 1000);
        
        // dd:hh:mm:ss形式で表示（0埋めあり）
        const daysStr = String(days).padStart(2, '0');
        const hoursStr = String(hours).padStart(2, '0');
        const minutesStr = String(minutes).padStart(2, '0');
        const secondsStr = String(seconds).padStart(2, '0');
        
        const format = i18n.getText('time.format', 'exchange');
        remainingDaysElement.textContent = format
            .replace('{days}', daysStr)
            .replace('{hours}', hoursStr)
            .replace('{minutes}', minutesStr)
            .replace('{seconds}', secondsStr);
        
        // 1秒ごとに更新
        setTimeout(updateRemainingDays, 1000);
    } else {
        remainingDaysElement.textContent = i18n.getText('time.ended', 'exchange');
    }
}

// 報酬初期化
function initializeRewards() {
    const rewards = gameData.exchangeRewards.filter(
        reward => reward.eventId === currentEvent.eventId
    );
    
    // 状態初期化
    rewardStates = {};
    rewards.forEach(reward => {
        rewardStates[reward.id] = {
            wanted: true,
            remaining: reward.stock
        };
    });
    
    // UI生成
    renderRewards(rewards);
}

// 報酬UI生成
function renderRewards(rewards) {
    const grid = document.getElementById('rewardsGrid');
    grid.innerHTML = '';
    
    rewards.forEach(reward => {
        const item = createRewardItem(reward);
        grid.appendChild(item);
    });
}

// 報酬アイテム
function createRewardItem(reward) {
    const div = document.createElement('div');
    div.className = 'reward-item wanted';
    div.dataset.rewardId = reward.id;
    
    const state = rewardStates[reward.id];
    
    div.innerHTML = `
        <div class="reward-icon-wrapper">
            <img src="${reward.icon}" alt="${reward.name[i18n.getLanguage()]}" class="reward-icon">
            <div class="reward-stock-badge">×${state.remaining}</div>
        </div>
        <div class="reward-name">${reward.name[i18n.getLanguage()]}</div>
        <div class="reward-price">${reward.price.toLocaleString()}pt</div>
        <div class="reward-status">${i18n.getText('reward.wantedShort', 'exchange')}</div>
        <div class="reward-controls">
            <button class="reward-btn reward-btn-decrease">${i18n.getText('reward.decrease', 'exchange')}</button>
            <button class="reward-btn reward-btn-increase">${i18n.getText('reward.increase', 'exchange')}</button>
        </div>
        <div class="reward-controls" style="margin-top: 4px;">
            <button class="reward-btn reward-btn-buy-all">${i18n.getText('reward.buyAll', 'exchange')}</button>
            <button class="reward-btn reward-btn-reset">${i18n.getText('reward.reset', 'exchange')}</button>
        </div>
        <div class="sold-out-badge" style="display: none;">${i18n.getText('reward.soldOut', 'exchange')}</div>
    `;
    
    // カード全体クリックでトグル切り替え（交換するしない）
    div.addEventListener('click', (e) => {
        // ボタンクリックの場合は別挙動
        if (e.target.classList.contains('reward-btn')) {
            return;
        }
        toggleRewardWanted(reward.id);
    });
    
    // 在庫-1ボタン
    const decreaseBtn = div.querySelector('.reward-btn-decrease');
    decreaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        decreaseStock(reward.id);
    });
    
    // 在庫+1ボタン
    const increaseBtn = div.querySelector('.reward-btn-increase');
    increaseBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        increaseStock(reward.id);
    });
    
    // 一括購入ボタン
    const buyAllBtn = div.querySelector('.reward-btn-buy-all');
    buyAllBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        buyAllStock(reward.id);
    });
    
    // リセットボタン
    const resetBtn = div.querySelector('.reward-btn-reset');
    resetBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        resetStock(reward.id);
    });
    
    return div;
}

// 交換するしないトグル
function toggleRewardWanted(rewardId) {
    const state = rewardStates[rewardId];
    
    // 在庫が0の場合は切り替え不可
    if (state.remaining === 0) {
        return;
    }
    
    state.wanted = !state.wanted;
    
    // UI更新
    updateRewardUI(rewardId);
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// 報酬UI更新
function updateRewardUI(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    const item = document.querySelector(`[data-reward-id="${rewardId}"]`);
    
    if (!item) return;
    
    const statusText = item.querySelector('.reward-status');
    const stockBadge = item.querySelector('.reward-stock-badge');
    const decreaseBtn = item.querySelector('.reward-btn-decrease');
    const increaseBtn = item.querySelector('.reward-btn-increase');
    const soldOutBadge = item.querySelector('.sold-out-badge');
    
    // 在庫0の売り切れ表示（交換するしないはそのまま）
    if (state.remaining === 0) {
        item.classList.add('sold-out');
        if (soldOutBadge) {
            soldOutBadge.style.display = 'block';
        }
    } else {
        item.classList.remove('sold-out');
        if (soldOutBadge) {
            soldOutBadge.style.display = 'none';
        }
    }
    
    // 交換するしないの切り替え
    if (state.wanted) {
        item.classList.remove('unwanted');
        item.classList.add('wanted');
        statusText.textContent = i18n.getText('reward.wanted', 'exchange');
    } else {
        item.classList.remove('wanted');
        item.classList.add('unwanted');
        statusText.textContent = i18n.getText('reward.notWanted', 'exchange');
    }
    
    // 在庫表示更新
    stockBadge.textContent = `×${state.remaining}`;
    
    // ボタンの有効/無効
    const buyAllBtn = item.querySelector('.reward-btn-buy-all');
    const resetBtn = item.querySelector('.reward-btn-reset');
    
    // 交換しないアイテムは全てのボタンを無効化
    if (!state.wanted) {
        decreaseBtn.disabled = true;
        increaseBtn.disabled = true;
        if (buyAllBtn) buyAllBtn.disabled = true;
        if (resetBtn) resetBtn.disabled = true;
    } else {
        // 在庫-1ボタン:在庫が0以下の場合は無効
        if (state.remaining <= 0) {
            decreaseBtn.disabled = true;
        } else {
            decreaseBtn.disabled = false;
        }
        
        // 在庫+1ボタン:在庫が最大値以上の場合は無効（かつ売り切れ時は有効）
        if (state.remaining >= reward.stock) {
            increaseBtn.disabled = true;
        } else {
            increaseBtn.disabled = false;
        }
        
        // 一括購入ボタン:在庫が0の場合は無効
        if (buyAllBtn) {
            if (state.remaining <= 0) {
                buyAllBtn.disabled = true;
            } else {
                buyAllBtn.disabled = false;
            }
        }
        
        // リセットボタン:在庫が最大（デフォルト値）の場合は無効
        if (resetBtn) {
            if (state.remaining === reward.stock) {
                resetBtn.disabled = true;
            } else {
                resetBtn.disabled = false;
            }
        }
    }
}

// 在庫減少
function decreaseStock(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    
    // 在庫がある場合のみ減らす
    if (state.remaining > 0) {
        state.remaining--;
        
        // 所持ポイントから購入分を減算して連動（下限はゼロ、ボタン有効無効には干渉させない）
        currentPoints = Math.max(0, currentPoints - reward.price);
        document.getElementById('currentPoints').value = currentPoints;
        
        // UI更新
        updateRewardUI(rewardId);
        
        // 計算更新
        updateCalculations();
        
        // 保存
        saveToLocalStorage();
    }
}

// 在庫増加
function increaseStock(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    
    // 最大値未満の場合のみ増やす
    if (state.remaining < reward.stock) {
        state.remaining++;
        
        // 所持ポイントに価格を加算して連動（999999を上限とする）
        currentPoints = Math.min(999999, currentPoints + reward.price);
        document.getElementById('currentPoints').value = currentPoints;
        
        // UI更新
        updateRewardUI(rewardId);
        
        // 計算更新
        updateCalculations();
        
        // 保存
        saveToLocalStorage();
    }
}

// 一括購入
function buyAllStock(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    
    // 所持ポイントから価格x現在の在庫数を減算（-1の流用）
    const totalPrice = reward.price * state.remaining;
    currentPoints = Math.max(0, currentPoints - totalPrice);
    document.getElementById('currentPoints').value = currentPoints;
    
    // 在庫を0にする
    state.remaining = 0;
    
    // UI更新
    updateRewardUI(rewardId);
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// リセット（在庫をデフォルト値に戻す）
function resetStock(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    
    // 在庫の差分を計算
    const stockDiff = reward.stock - state.remaining;
    
    // 所持ポイントを増減（基本増えるだけ）
    const pointsDiff = reward.price * stockDiff;
    currentPoints = Math.max(0, Math.min(999999, currentPoints + pointsDiff));
    document.getElementById('currentPoints').value = currentPoints;
    
    // デフォルト値に戻す
    state.remaining = reward.stock;
    
    // UI更新
    updateRewardUI(rewardId);
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ミッション初期化
function initializeMissions() {
    const missions = gameData.missionRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    // 状態初期化
    missionStates = {};
    missions.forEach(mission => {
        missionStates[mission.id] = {
            completed: false
        };
    });
    
    // jsonで設定した特定の単語を含むミッション名をグループ化
    const accordionGroups = [
        {
            titleKey: 'accordion.groups.normal',
            missionIds: missions.filter(m => m.name.ja.includes('ノーマル')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.hard',
            missionIds: missions.filter(m => m.name.ja.includes('ハード')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.regularMission',
            missionIds: missions.filter(m => m.name.ja.includes('通常任務')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.challengeMission',
            missionIds: missions.filter(m => m.name.ja.includes('挑戦任務')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.adventureMission',
            missionIds: missions.filter(m => m.name.ja.includes('冒険任務')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.minigame',
            missionIds: missions.filter(m => m.name.ja.includes('ミニゲーム')).map(m => m.id)
        },
        {
            titleKey: 'accordion.groups.other',
            missionIds: missions.filter(m => !m.name.ja.includes('ノーマル') && !m.name.ja.includes('ハード') && !m.name.ja.includes('通常任務') && !m.name.ja.includes('挑戦任務') && !m.name.ja.includes('冒険任務') && !m.name.ja.includes('ミニゲーム')).map(m => m.id)
        }
    ];
    
    // UI生成
    renderMissionsWithAccordion(missions, accordionGroups);
    updateMissionSummary();
}

// ミッションUI生成
function renderMissionsWithAccordion(missions, accordionGroups) {
    const grid = document.getElementById('missionsGrid');
    grid.innerHTML = '';
    
    // グループ化されていないミッションのID一覧を取得
    const groupedIds = new Set();
    accordionGroups.forEach(group => {
        group.missionIds.forEach(id => groupedIds.add(id));
    });
    
    // アコーディオングループごとに生成
    accordionGroups.forEach((group, index) => {
        if (group.missionIds.length === 0) return;
        
        // アコーディオンコンテナ
        const accordionContainer = document.createElement('div');
        accordionContainer.className = 'mission-accordion';
        accordionContainer.dataset.accordionIndex = index;
        
        // アコーディオンヘッダー
        const header = document.createElement('div');
        header.className = 'mission-accordion-header';
        header.innerHTML = `
            <div class="accordion-toggle">
                <span class="accordion-icon">${i18n.getText('accordion.iconClosed', 'exchange')}</span>
                <span class="accordion-title">${i18n.getText(group.titleKey, 'exchange')}</span>
                <span class="accordion-count"></span>
            </div>
            <div class="accordion-actions">
                <button class="accordion-check-all" data-group-index="${index}">${i18n.getText('accordion.checkAll', 'exchange')}</button>
                <button class="accordion-uncheck-all" data-group-index="${index}">${i18n.getText('accordion.uncheckAll', 'exchange')}</button>
            </div>
        `;
        
        // アコーディオンコンテンツ（デフォルトで閉じた状態）
        const content = document.createElement('div');
        content.className = 'mission-accordion-content';
        
        // グループ内のミッション生成
        group.missionIds.forEach(missionId => {
            const mission = missions.find(m => m.id === missionId);
            if (mission) {
                const item = createMissionItem(mission);
                content.appendChild(item);
            }
        });
        
        accordionContainer.appendChild(header);
        accordionContainer.appendChild(content);
        grid.appendChild(accordionContainer);
        
        // 初期状態の更新
        updateAccordionGroupStatus(index, group.missionIds);
        
        // アコーディオン開閉表現
        const toggle = header.querySelector('.accordion-toggle');
        toggle.addEventListener('click', () => {
            content.classList.toggle('open');
            const icon = header.querySelector('.accordion-icon');
            icon.textContent = content.classList.contains('open') 
                ? i18n.getText('accordion.iconOpen', 'exchange') 
                : i18n.getText('accordion.iconClosed', 'exchange');
        });
        
        // 一括ONボタン
        const checkAllBtn = header.querySelector('.accordion-check-all');
        checkAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            group.missionIds.forEach(missionId => {
                if (missionStates[missionId] && !missionStates[missionId].completed) {
                    toggleMissionCompleted(missionId);
                }
            });
            updateAccordionGroupStatus(index, group.missionIds);
        });
        
        // 一括OFFボタン
        const uncheckAllBtn = header.querySelector('.accordion-uncheck-all');
        uncheckAllBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            group.missionIds.forEach(missionId => {
                if (missionStates[missionId] && missionStates[missionId].completed) {
                    toggleMissionCompleted(missionId);
                }
            });
            updateAccordionGroupStatus(index, group.missionIds);
        });
    });
    
    // グループ化されていないミッションをその他に集約
    const ungroupedMissions = missions.filter(m => !groupedIds.has(m.id));
    if (ungroupedMissions.length > 0) {
        const otherHeader = document.createElement('div');
        otherHeader.className = 'mission-section-title';
        otherHeader.textContent = i18n.getText('accordion.groups.other', 'exchange');
        grid.appendChild(otherHeader);
        
        ungroupedMissions.forEach(mission => {
            const item = createMissionItem(mission);
            grid.appendChild(item);
        });
    }
}

// アコーディオングループの達成状態を更新
function updateAccordionGroupStatus(groupIndex, missionIds) {
    const container = document.querySelector(`[data-accordion-index="${groupIndex}"]`);
    if (!container) return;
    
    const header = container.querySelector('.mission-accordion-header');
    const countSpan = header.querySelector('.accordion-count');
    
    // 全てのミッションが完了しているかチェック
    const allCompleted = missionIds.every(id => 
        missionStates[id] && missionStates[id].completed
    );
    
    if (allCompleted) {
        header.classList.add('all-completed');
        countSpan.textContent = i18n.getText('accordion.completedMark', 'exchange');
    } else {
        header.classList.remove('all-completed');
        countSpan.textContent = ``;
    }
}

// 全てのアコーディオングループの状態を更新
function updateAllAccordionGroupStatus() {
    const accordions = document.querySelectorAll('.mission-accordion');
    accordions.forEach((accordion, index) => {
        const groupIndex = parseInt(accordion.dataset.accordionIndex);
        const missionItems = accordion.querySelectorAll('.mission-item');
        const missionIds = Array.from(missionItems).map(item => 
            parseInt(item.dataset.missionId)
        );
        updateAccordionGroupStatus(groupIndex, missionIds);
    });
}

// ミッションアイテム要素作成
function createMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item';
    div.dataset.missionId = mission.id;
    
    div.innerHTML = `
        <div class="mission-checkbox"></div>
        <div class="mission-info">
            <div class="mission-name">${mission.name[i18n.getLanguage()]}</div>
            <div class="mission-points">+${mission.points.toLocaleString()}pt</div>
        </div>
    `;
    
    div.addEventListener('click', () => toggleMissionCompleted(mission.id));
    
    return div;
}

// ミッション完了の個別トグル
function toggleMissionCompleted(missionId) {
    const mission = gameData.missionRewards.find(m => m.id === missionId);
    const state = missionStates[missionId];
    
    // 状態の切り替え
    const wasCompleted = state.completed;
    state.completed = !state.completed;
    
    // ポイントを加算・減算
    if (state.completed) {
        // 達成にしたとき加算
        currentPoints += mission.points;
    } else {
        // 未達成にしたとき減算
        currentPoints = Math.max(0, currentPoints - mission.points);
    }
    
    // 所持ポイントを更新
    document.getElementById('currentPoints').value = currentPoints;
    
    // UI更新
    updateMissionUI(missionId);
    
    // コンプリートミッションの状態確認
    checkAndUpdateCompMissions();
    
    // サマリー更新（compMissionの状態を反映）
    updateMissionSummary();
    
    // アコーディオングループの状態更新
    updateAllAccordionGroupStatus();
    
    // 非表示フィルター
    toggleHideCompletedMissions();
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ミッションUI更新
function updateMissionUI(missionId) {
    const state = missionStates[missionId];
    const item = document.querySelector(`[data-mission-id="${missionId}"]`);
    
    if (!item) return;
    
    if (state.completed) {
        item.classList.add('completed');
    } else {
        item.classList.remove('completed');
    }
}

// ミッションサマリー更新
function updateMissionSummary() {
    const missions = gameData.missionRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    let totalPoints = 0;
    let earnedPoints = 0;
    
    missions.forEach(mission => {
        totalPoints += mission.points;
        const state = missionStates[mission.id];
        if (state && state.completed) {
            earnedPoints += mission.points;
        }
    });
    
    // コンプリートミッションのポイントも含める
    if (gameData.missionCompRewards) {
        const compMissions = gameData.missionCompRewards.filter(
            mission => mission.eventId === currentEvent.eventId
        );
        
        compMissions.forEach(mission => {
            totalPoints += mission.points;
            const state = missionCompStates[mission.id];
            if (state && state.completed) {
                earnedPoints += mission.points;
            }
        });
    }
    
    const remainingPoints = totalPoints - earnedPoints;
    
    document.getElementById('totalMissionPoints').textContent = totalPoints.toLocaleString();
    document.getElementById('remainingMissionPoints').textContent = remainingPoints.toLocaleString();
    document.getElementById('earnedMissionPoints').textContent = earnedPoints.toLocaleString();
}

// 現在のポイント数変更
function onPointsChange(e) {
    let value = parseInt(e.target.value) || 0;
    
    // 範囲指定
    if (value < 0) value = 0;
    if (value > 999999) value = 999999;
    
    currentPoints = value;
    e.target.value = value;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// 計算更新
function updateCalculations() {
    if (!currentEvent) return;
    
    // 合計必要ポイント計算
    const rewards = gameData.exchangeRewards.filter(
        reward => reward.eventId === currentEvent.eventId
    );
    
    let totalNeeded = 0;
    let remainingRewardsCost = 0;
    
    rewards.forEach(reward => {
        const state = rewardStates[reward.id];
        if (state && state.wanted) {
            const totalCost = reward.price * reward.stock;
            const remainingCost = reward.price * state.remaining;
            totalNeeded += totalCost;
            remainingRewardsCost += remainingCost;
        }
    });
    
    // ミッション残りポイント
    const missions = gameData.missionRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    let remainingMissionPoints = 0;
    missions.forEach(mission => {
        const state = missionStates[mission.id];
        if (state && !state.completed) {
            remainingMissionPoints += mission.points;
        }
    });
    
    // コンプリートミッション残りポイント
    if (gameData.missionCompRewards) {
        const compMissions = gameData.missionCompRewards.filter(
            mission => mission.eventId === currentEvent.eventId
        );
        
        compMissions.forEach(mission => {
            const state = missionCompStates[mission.id];
            if (state && !state.completed) {
                remainingMissionPoints += mission.points;
            }
        });
    }
    
    // 実際に周回で稼ぐ必要があるポイント（現在のポイントとミッションポイントを引く）
    const remainingNeeded = Math.max(0, remainingRewardsCost - currentPoints - remainingMissionPoints);
    
    // あと何周必要か
    const runsNeeded = Math.floor(remainingNeeded / currentEvent.pointsPerRun * 100) / 100; // 小数点第2位で切り捨て
    
    // 残り日数
    const now = new Date();
    const endDate = new Date(currentEvent.endDate);
    const currentDay = new Date(now);
    if (now.getHours() < 5) {
        currentDay.setDate(currentDay.getDate() - 1);
    }
    currentDay.setHours(4, 59, 0, 0);
    const lastDay = new Date(endDate);
    lastDay.setHours(4, 59, 0, 0);
    const diffTime = lastDay - currentDay;
    const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
    
    // 1日あたりのノルマ（小数点第3位まで出す）
    const dailyQuota = remainingDays > 0 ? (runsNeeded / remainingDays).toFixed(3) : 0;
    
    // 1日あたりのやる気
    const dailyStamina = Math.ceil(dailyQuota * currentEvent.staminaCost);
    
    // UI更新
    document.getElementById('totalNeeded').textContent = totalNeeded.toLocaleString();
    document.getElementById('remainingNeeded').textContent = remainingNeeded.toLocaleString();
    document.getElementById('runsNeeded').textContent = runsNeeded.toFixed(3) + i18n.getText('unit.runs', 'exchange');
    document.getElementById('dailyQuota').textContent = dailyQuota + i18n.getText('unit.runs', 'exchange');
    document.getElementById('dailyStamina').textContent = dailyStamina.toLocaleString();
}

// 進捗リセット
function resetProgress() {
    if (!confirm(i18n.getText('messages.confirmResetProgress', 'exchange'))) {
        return;
    }
    
    // 在庫リセット
    const rewards = gameData.exchangeRewards.filter(
        reward => reward.eventId === currentEvent.eventId
    );
    
    rewards.forEach(reward => {
        if (rewardStates[reward.id]) {
            rewardStates[reward.id].remaining = reward.stock;
            updateRewardUI(reward.id);
        }
    });
    
    // ミッションリセット
    const missions = gameData.missionRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    missions.forEach(mission => {
        if (missionStates[mission.id]) {
            missionStates[mission.id].completed = false;
            updateMissionUI(mission.id);
        }
    });
    
    // コンプリートミッションリセット
    if (gameData.missionCompRewards) {
        const compMissions = gameData.missionCompRewards.filter(
            mission => mission.eventId === currentEvent.eventId
        );
        
        compMissions.forEach(mission => {
            if (missionCompStates[mission.id]) {
                missionCompStates[mission.id].completed = false;
            }
        });
        
        checkAndUpdateCompMissions();
    }
    
    // 現在のポイントリセット
    currentPoints = 0;
    document.getElementById('currentPoints').value = 0;
    
    // サマリー更新
    updateMissionSummary();
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// 完全初期化
function resetAll() {
    if (!confirm(i18n.getText('messages.confirmResetAll', 'exchange'))) {
        return;
    }
    
    // ローカルストレージ削除
    localStorage.removeItem('exchangeChecker_currentEvent');
    localStorage.removeItem('exchangeChecker_eventStates');
    
    // 状態リセット
    currentEvent = null;
    rewardStates = {};
    missionStates = {};
    missionCompStates = {};
    currentPoints = 0;
    
    // UI リセット
    document.getElementById('eventSelect').value = '';
    document.getElementById('currentPoints').value = 0;
    document.getElementById('eventInfo').classList.add('hidden');
}

// モーダル表示
function showUsageModal() {
    document.getElementById('usageModal').classList.remove('hidden');
}

// モーダルを閉じる
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// ローカルストレージ保存
function saveToLocalStorage() {
    if (!currentEvent) return;
    
    // 現在表示中のイベントID保存
    localStorage.setItem('exchangeChecker_currentEvent', currentEvent.eventId);
    
    // イベント状態保存
    const eventStates = JSON.parse(localStorage.getItem('exchangeChecker_eventStates') || '{}');
    
    eventStates[currentEvent.eventId] = {
        rewardStates: rewardStates,
        missionStates: missionStates,
        missionCompStates: missionCompStates,
        currentPoints: currentPoints
    };
    
    localStorage.setItem('exchangeChecker_eventStates', JSON.stringify(eventStates));
}

// ローカルストレージ読み込み
function loadFromLocalStorage() {
    const savedEventId = localStorage.getItem('exchangeChecker_currentEvent');
    
    if (savedEventId) {
        const eventSelect = document.getElementById('eventSelect');
        eventSelect.value = savedEventId;
        
        // イベント変更イベントを発火
        eventSelect.dispatchEvent(new Event('change'));
    }
}

// イベント状態をローカルストレージから復元
function loadEventStateFromLocalStorage(eventId) {
    const eventStates = JSON.parse(localStorage.getItem('exchangeChecker_eventStates') || '{}');
    const state = eventStates[eventId];
    
    if (!state) return;
    
    // 報酬状態復元
    if (state.rewardStates) {
        Object.keys(state.rewardStates).forEach(rewardId => {
            if (rewardStates[rewardId]) {
                rewardStates[rewardId] = state.rewardStates[rewardId];
                updateRewardUI(parseInt(rewardId));
            }
        });
    }
    
    // ミッション状態復元
    if (state.missionStates) {
        Object.keys(state.missionStates).forEach(missionId => {
            if (missionStates[missionId]) {
                missionStates[missionId] = state.missionStates[missionId];
                updateMissionUI(parseInt(missionId));
            }
        });
        
        // コンプリートミッション状態復元
        if (state.missionCompStates) {
            Object.keys(state.missionCompStates).forEach(compMissionId => {
                if (missionCompStates[compMissionId]) {
                    missionCompStates[compMissionId] = state.missionCompStates[compMissionId];
                }
            });
        }
        
        // コンプリートミッションの状態確認
        checkAndUpdateCompMissions();
        updateMissionSummary();
        
        // アコーディオングループの状態更新
        updateAllAccordionGroupStatus();
    }
    
    // 現在のポイント復元
    if (state.currentPoints !== undefined) {
        currentPoints = state.currentPoints;
        document.getElementById('currentPoints').value = currentPoints;
    }
}

// コンプリートミッション初期化
function initializeCompMissions() {
    if (!gameData.missionCompRewards) return;
    
    const compMissions = gameData.missionCompRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    // 状態初期化
    missionCompStates = {};
    compMissions.forEach(mission => {
        missionCompStates[mission.id] = {
            completed: false
        };
    });
    
    // UI生成
    renderCompMissions(compMissions);
}

// コンプリートミッションUI生成
function renderCompMissions(compMissions) {
    const grid = document.getElementById('compMissionsGrid');
    grid.innerHTML = '';
    
    compMissions.forEach(mission => {
        const item = createCompMissionItem(mission);
        grid.appendChild(item);
    });
}

// コンプリートミッションアイテム要素作成
function createCompMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item auto-completed';
    div.dataset.compMissionId = mission.id;
    
    div.innerHTML = `
        <div class="mission-checkbox"></div>
        <div class="mission-info">
            <div class="mission-name">${mission.name[i18n.getLanguage()]}</div>
            <div class="mission-points">+${mission.points.toLocaleString()}pt</div>
        </div>
    `;
    
    return div;
}

// コンプリートミッションの状態確認と更新
function checkAndUpdateCompMissions() {
    if (!gameData.missionCompRewards) return;
    
    const compMissions = gameData.missionCompRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    compMissions.forEach(compMission => {
        const allCompleted = compMission.requiredMissions.every(reqId => {
            return missionStates[reqId] && missionStates[reqId].completed;
        });
        
        const state = missionCompStates[compMission.id];
        const wasCompleted = state.completed;
        state.completed = allCompleted;
        
        // 状態が変化した場合、ポイントを加算/減算
        if (wasCompleted !== allCompleted) {
            if (allCompleted) {
                // 達成した場合、ポイントを加算
                currentPoints += compMission.points;
            } else {
                // 未達成になった場合、ポイントを減算
                currentPoints = Math.max(0, currentPoints - compMission.points);
            }
            
            // 所持ポイント入力欄を更新
            document.getElementById('currentPoints').value = currentPoints;
        }
        
        // UI更新
        const item = document.querySelector(`[data-comp-mission-id="${compMission.id}"]`);
        if (item) {
            if (allCompleted) {
                item.classList.add('completed');
            } else {
                item.classList.remove('completed');
            }
        }
    });
}

// ミッション非表示トグル
function toggleHideCompletedMissions() {
    const checkbox = document.getElementById('hideCompletedMissions');
    if (!checkbox) return;
    
    const missionItems = document.querySelectorAll('.mission-item');
    
    missionItems.forEach(item => {
        if (item.classList.contains('completed') && !item.classList.contains('auto-completed')) {
            if (checkbox.checked) {
                item.classList.add('hidden-completed');
            } else {
                item.classList.remove('hidden-completed');
            }
        }
    });
}

// ポイント減少
function decreasePoints() {
    if (!currentEvent) return;
    
    const amount = currentEvent.pointsPerRun;
    currentPoints = Math.max(0, currentPoints - amount);
    document.getElementById('currentPoints').value = currentPoints;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ポイント増加
function increasePoints() {
    if (!currentEvent) return;
    
    const amount = currentEvent.pointsPerRun;
    currentPoints = Math.min(999999, currentPoints + amount);
    document.getElementById('currentPoints').value = currentPoints;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// 言語切り替え時の表示更新
function updateLanguageDisplay() {
    const lang = i18n.getLanguage();
    
    // イベントセレクトの更新
    const eventSelect = document.getElementById('eventSelect');
    if (eventSelect) {
        Array.from(eventSelect.options).forEach(option => {
            if (option.value) {
                const event = eventList.find(e => e.eventId === parseInt(option.value));
                if (event) {
                    option.textContent = event.name[lang];
                }
            }
        });
    }
    
    // ポイントアイコンのalt更新
    if (currentEvent) {
        const pointData = gameData.eventPoints.find(p => p.id === currentEvent.pointId);
        if (pointData) {
            const pointIcon = document.getElementById('pointIcon');
            if (pointIcon) {
                pointIcon.alt = pointData.name[lang];
            }
        }
    }
    
    // 報酬カードの名前更新
    document.querySelectorAll('.reward-item[data-reward-id]').forEach(item => {
        const rewardId = parseInt(item.dataset.rewardId);
        const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
        if (reward) {
            const nameElem = item.querySelector('.reward-name');
            if (nameElem) {
                nameElem.textContent = reward.name[lang];
            }
            const iconElem = item.querySelector('.reward-icon');
            if (iconElem) {
                iconElem.alt = reward.name[lang];
            }
        }
    });
    
    // ミッションの名前更新
    document.querySelectorAll('.mission-item[data-mission-id]').forEach(item => {
        const missionId = parseInt(item.dataset.missionId);
        const mission = gameData.missionRewards.find(m => m.id === missionId);
        if (mission) {
            const nameElem = item.querySelector('.mission-name');
            if (nameElem) {
                nameElem.textContent = mission.name[lang];
            }
        }
    });
    
    // コンプリートミッションの名前更新
    document.querySelectorAll('.mission-item[data-comp-mission-id]').forEach(item => {
        const missionId = parseInt(item.dataset.compMissionId);
        const mission = gameData.missionCompRewards.find(m => m.id === missionId);
        if (mission) {
            const nameElem = item.querySelector('.mission-name');
            if (nameElem) {
                nameElem.textContent = mission.name[lang];
            }
        }
    });
}
