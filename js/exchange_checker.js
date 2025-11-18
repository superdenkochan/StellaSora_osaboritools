// ========================================
// グローバル変数
// ========================================
let gameData = null;
let currentEvent = null;
let rewardStates = {};
let missionStates = {};
let missionCompStates = {};
let currentPoints = 0;

// ========================================
// 初期化
// ========================================
document.addEventListener('DOMContentLoaded', async () => {
    // データ読み込み
    await loadGameData();
    
    // イベントリスナー設定
    setupEventListeners();
    
    // イベントセレクト初期化
    initializeEventSelect();
    
    // LocalStorageから復元
    loadFromLocalStorage();
});

// ========================================
// データ読み込み
// ========================================
async function loadGameData() {
    try {
        const response = await fetch('data/exchange_data.json');
        gameData = await response.json();
        console.log('ゲームデータ読み込み完了', gameData);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        alert('データの読み込みに失敗しました。ページをリロードしてください。');
    }
}

// ========================================
// イベントリスナー設定
// ========================================
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

// ========================================
// イベントセレクト初期化
// ========================================
function initializeEventSelect() {
    const eventSelect = document.getElementById('eventSelect');
    
    if (!gameData || !gameData.events) return;
    
    gameData.events.forEach(event => {
        const option = document.createElement('option');
        option.value = event.eventId;
        option.textContent = event.name;
        eventSelect.appendChild(option);
    });
}

// ========================================
// イベント変更時の処理
// ========================================
function onEventChange(e) {
    const eventId = parseInt(e.target.value);
    
    if (!eventId) {
        document.getElementById('eventInfo').classList.add('hidden');
        return;
    }
    
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
    
    // LocalStorageから復元
    loadEventStateFromLocalStorage(eventId);
    
    // 計算更新
    updateCalculations();
    
    // 表示
    document.getElementById('eventInfo').classList.remove('hidden');
    
    // イベント情報内の要素にイベントリスナーを設定（初回のみ）
    setupEventInfoListeners();
}

// ========================================
// イベント情報内の要素のイベントリスナー設定（初回のみ実行）
// ========================================
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

// ========================================
// イベント情報表示
// ========================================
function displayEventInfo() {
    // バナー画像
    const banner = document.getElementById('eventBanner');
    banner.src = currentEvent.bannerImage;
    banner.alt = currentEvent.name;
    
    // ポイント名
    const pointData = gameData.eventPoints.find(p => p.id === currentEvent.pointId);
    if (pointData) {
        document.getElementById('pointName').textContent = pointData.name;
    }
    
    // ポイントボタンの表示を更新
    document.getElementById('pointsDecreaseAmount').textContent = currentEvent.pointsPerRun;
    document.getElementById('pointsIncreaseAmount').textContent = currentEvent.pointsPerRun;
    
    // 残り日数計算
    updateRemainingDays();
}

// ========================================
// 残り日数計算
// ========================================
function updateRemainingDays() {
    const now = new Date();
    const endDate = new Date(currentEvent.endDate);
    
    // 現在の日付（4:59を1日の終わりとする）
    const currentDay = new Date(now);
    if (now.getHours() < 5) {
        // 5時前なら前日扱い
        currentDay.setDate(currentDay.getDate() - 1);
    }
    currentDay.setHours(4, 59, 0, 0);
    
    // 終了日（4:59）
    const lastDay = new Date(endDate);
    lastDay.setHours(4, 59, 0, 0);
    
    // 日数計算（今日を含める）
    const diffTime = lastDay - currentDay;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
    
    const remainingDaysElement = document.getElementById('remainingDays');
    if (diffDays > 0) {
        remainingDaysElement.textContent = `${diffDays}日`;
    } else if (diffDays === 0) {
        remainingDaysElement.textContent = '今日まで！';
    } else {
        remainingDaysElement.textContent = '終了';
    }
}

// ========================================
// 報酬初期化
// ========================================
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

// ========================================
// 報酬UI生成
// ========================================
function renderRewards(rewards) {
    const grid = document.getElementById('rewardsGrid');
    grid.innerHTML = '';
    
    rewards.forEach(reward => {
        const item = createRewardItem(reward);
        grid.appendChild(item);
    });
}

// ========================================
// 報酬アイテム要素作成
// ========================================
function createRewardItem(reward) {
    const div = document.createElement('div');
    div.className = 'reward-item wanted';
    div.dataset.rewardId = reward.id;
    
    const state = rewardStates[reward.id];
    
    div.innerHTML = `
        <div class="reward-icon-wrapper">
            <img src="${reward.icon}" alt="${reward.name}" class="reward-icon">
            <div class="reward-stock-badge">×${state.remaining}</div>
        </div>
        <div class="reward-name">${reward.name}</div>
        <div class="reward-price">${reward.price.toLocaleString()}pt</div>
        <div class="reward-status">いる</div>
        <div class="reward-controls">
            <button class="reward-btn reward-btn-decrease">－1</button>
            <button class="reward-btn reward-btn-increase">＋1</button>
        </div>
    `;
    
    // カード全体クリックでトグル
    div.addEventListener('click', (e) => {
        // ボタンクリックの場合は除外
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
    
    return div;
}

// ========================================
// 報酬「交換する/交換しない」トグル
// ========================================
function toggleRewardWanted(rewardId) {
    const state = rewardStates[rewardId];
    state.wanted = !state.wanted;
    
    // UI更新
    updateRewardUI(rewardId);
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ========================================
// 報酬UI更新
// ========================================
function updateRewardUI(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    const item = document.querySelector(`[data-reward-id="${rewardId}"]`);
    
    if (!item) return;
    
    const statusText = item.querySelector('.reward-status');
    const stockBadge = item.querySelector('.reward-stock-badge');
    const decreaseBtn = item.querySelector('.reward-btn-decrease');
    const increaseBtn = item.querySelector('.reward-btn-increase');
    
    // wanted/unwantedの切り替え
    if (state.wanted) {
        item.classList.remove('unwanted');
        item.classList.add('wanted');
        statusText.textContent = '交換する';
    } else {
        item.classList.remove('wanted');
        item.classList.add('unwanted');
        statusText.textContent = '交換しない';
    }
    
    // 在庫0の売り切れ表示
    if (state.remaining === 0) {
        item.classList.add('sold-out');
    } else {
        item.classList.remove('sold-out');
    }
    
    // 在庫表示更新
    stockBadge.textContent = `×${state.remaining}`;
    
    // ボタンの有効/無効
    // unwantedの時は両方のボタンを無効化
    if (!state.wanted) {
        decreaseBtn.disabled = true;
        increaseBtn.disabled = true;
    } else {
        // 在庫-1ボタン：在庫が0以下の場合は無効
        if (state.remaining <= 0) {
            decreaseBtn.disabled = true;
        } else {
            decreaseBtn.disabled = false;
        }
        
        // 在庫+1ボタン：在庫が最大値以上の場合は無効
        if (state.remaining >= reward.stock) {
            increaseBtn.disabled = true;
        } else {
            increaseBtn.disabled = false;
        }
    }
}

// ========================================
// 在庫減少
// ========================================
function decreaseStock(rewardId) {
    const state = rewardStates[rewardId];
    
    // 在庫がある場合のみ減らす
    if (state.remaining > 0) {
        state.remaining--;
        
        // UI更新
        updateRewardUI(rewardId);
        
        // 計算更新
        updateCalculations();
        
        // 保存
        saveToLocalStorage();
    }
}

// ========================================
// 在庫増加
// ========================================
function increaseStock(rewardId) {
    const reward = gameData.exchangeRewards.find(r => r.id === rewardId);
    const state = rewardStates[rewardId];
    
    // 最大値未満の場合のみ増やす
    if (state.remaining < reward.stock) {
        state.remaining++;
        
        // UI更新
        updateRewardUI(rewardId);
        
        // 計算更新
        updateCalculations();
        
        // 保存
        saveToLocalStorage();
    }
}

// ========================================
// ミッション初期化
// ========================================
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
    
    // UI生成
    renderMissions(missions);
    updateMissionSummary();
}

// ========================================
// ミッションUI生成
// ========================================
function renderMissions(missions) {
    const grid = document.getElementById('missionsGrid');
    grid.innerHTML = '';
    
    missions.forEach(mission => {
        const item = createMissionItem(mission);
        grid.appendChild(item);
    });
}

// ========================================
// ミッションアイテム要素作成
// ========================================
function createMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item';
    div.dataset.missionId = mission.id;
    
    div.innerHTML = `
        <div class="mission-checkbox"></div>
        <div class="mission-info">
            <div class="mission-name">${mission.name}</div>
            <div class="mission-points">+${mission.points.toLocaleString()}pt</div>
        </div>
    `;
    
    div.addEventListener('click', () => toggleMissionCompleted(mission.id));
    
    return div;
}

// ========================================
// ミッション完了トグル
// ========================================
function toggleMissionCompleted(missionId) {
    const state = missionStates[missionId];
    state.completed = !state.completed;
    
    // UI更新
    updateMissionUI(missionId);
    
    // コンプリートミッションの状態確認（サマリー更新より先に実行）
    checkAndUpdateCompMissions();
    
    // サマリー更新（compMissionの状態を反映）
    updateMissionSummary();
    
    // 非表示フィルター適用
    toggleHideCompletedMissions();
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ========================================
// ミッションUI更新
// ========================================
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

// ========================================
// ミッションサマリー更新
// ========================================
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

// ========================================
// 現在のポイント数変更
// ========================================
function onPointsChange(e) {
    let value = parseInt(e.target.value) || 0;
    
    // 範囲制限
    if (value < 0) value = 0;
    if (value > 999999) value = 999999;
    
    currentPoints = value;
    e.target.value = value;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ========================================
// 計算更新
// ========================================
function updateCalculations() {
    if (!currentEvent) return;
    
    // 合計必要ポイント計算
    const rewards = gameData.exchangeRewards.filter(
        reward => reward.eventId === currentEvent.eventId
    );
    
    let totalNeeded = 0;
    let remainingNeeded = 0;
    
    rewards.forEach(reward => {
        const state = rewardStates[reward.id];
        if (state && state.wanted) {
            const totalCost = reward.price * reward.stock;
            const remainingCost = reward.price * state.remaining;
            totalNeeded += totalCost;
            remainingNeeded += remainingCost;
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
    
    // あと何周必要か
    const pointsToFarm = Math.max(0, remainingNeeded - currentPoints - remainingMissionPoints);
    const runsNeeded = Math.floor(pointsToFarm / currentEvent.pointsPerRun * 10) / 10; // 小数点第2位で切り捨て
    
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
    const remainingDays = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);
    
    // 1日あたりのノルマ
    const dailyQuota = remainingDays > 0 ? (runsNeeded / remainingDays).toFixed(1) : 0;
    
    // 1日あたりのやる気
    const dailyStamina = Math.ceil(dailyQuota * currentEvent.staminaCost);
    
    // UI更新
    document.getElementById('totalNeeded').textContent = totalNeeded.toLocaleString();
    document.getElementById('remainingNeeded').textContent = remainingNeeded.toLocaleString();
    document.getElementById('runsNeeded').textContent = runsNeeded.toFixed(1) + '周';
    document.getElementById('dailyQuota').textContent = dailyQuota + '周';
    document.getElementById('dailyStamina').textContent = dailyStamina.toLocaleString();
}

// ========================================
// 進捗リセット
// ========================================
function resetProgress() {
    if (!confirm('交換済みの在庫数と達成済みミッションをリセットしますか？\n「いる/いらない」の設定は保持されます。')) {
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

// ========================================
// 完全初期化
// ========================================
function resetAll() {
    if (!confirm('すべての設定とデータを初期化しますか？\nこの操作は取り消せません。')) {
        return;
    }
    
    // LocalStorage削除
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

// ========================================
// モーダル表示
// ========================================
function showUsageModal() {
    document.getElementById('usageModal').classList.remove('hidden');
}

// ========================================
// モーダル閉じる
// ========================================
function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.add('hidden');
    });
}

// ========================================
// LocalStorage保存
// ========================================
function saveToLocalStorage() {
    if (!currentEvent) return;
    
    // 現在のイベントID保存
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

// ========================================
// LocalStorage読み込み
// ========================================
function loadFromLocalStorage() {
    const savedEventId = localStorage.getItem('exchangeChecker_currentEvent');
    
    if (savedEventId) {
        const eventSelect = document.getElementById('eventSelect');
        eventSelect.value = savedEventId;
        
        // イベント変更イベントを発火
        eventSelect.dispatchEvent(new Event('change'));
    }
}

// ========================================
// イベント状態をLocalStorageから復元
// ========================================
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
    }
    
    // 現在のポイント復元
    if (state.currentPoints !== undefined) {
        currentPoints = state.currentPoints;
        document.getElementById('currentPoints').value = currentPoints;
    }
}

// ========================================
// コンプリートミッション初期化
// ========================================
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

// ========================================
// コンプリートミッションUI生成
// ========================================
function renderCompMissions(compMissions) {
    const grid = document.getElementById('compMissionsGrid');
    grid.innerHTML = '';
    
    compMissions.forEach(mission => {
        const item = createCompMissionItem(mission);
        grid.appendChild(item);
    });
}

// ========================================
// コンプリートミッションアイテム要素作成
// ========================================
function createCompMissionItem(mission) {
    const div = document.createElement('div');
    div.className = 'mission-item auto-completed';
    div.dataset.compMissionId = mission.id;
    
    div.innerHTML = `
        <div class="mission-checkbox"></div>
        <div class="mission-info">
            <div class="mission-name">${mission.name}</div>
            <div class="mission-points">+${mission.points.toLocaleString()}pt</div>
        </div>
    `;
    
    return div;
}

// ========================================
// コンプリートミッションの状態確認と更新
// ========================================
function checkAndUpdateCompMissions() {
    if (!gameData.missionCompRewards) return;
    
    const compMissions = gameData.missionCompRewards.filter(
        mission => mission.eventId === currentEvent.eventId
    );
    
    compMissions.forEach(compMission => {
        const allCompleted = compMission.requiredMissions.every(reqId => {
            return missionStates[reqId] && missionStates[reqId].completed;
        });
        
        missionCompStates[compMission.id].completed = allCompleted;
        
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

// ========================================
// ミッション非表示トグル
// ========================================
function toggleHideCompletedMissions() {
    const checkbox = document.getElementById('hideCompletedMissions');
    if (!checkbox) return; // チェックボックスが存在しない場合は何もしない
    
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

// ========================================
// ポイント減少
// ========================================
function decreasePoints() {
    if (!currentEvent) return; // イベントが選択されていない場合は何もしない
    
    const amount = currentEvent.pointsPerRun;
    currentPoints = Math.max(0, currentPoints - amount);
    document.getElementById('currentPoints').value = currentPoints;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

// ========================================
// ポイント増加
// ========================================
function increasePoints() {
    if (!currentEvent) return; // イベントが選択されていない場合は何もしない
    
    const amount = currentEvent.pointsPerRun;
    currentPoints = Math.min(999999, currentPoints + amount);
    document.getElementById('currentPoints').value = currentPoints;
    
    // 計算更新
    updateCalculations();
    
    // 保存
    saveToLocalStorage();
}

