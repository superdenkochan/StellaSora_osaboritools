// ========================================
// グローバル変数
// ========================================
let gameData = null;
let currentEvent = null;
let rewardStates = {};
let missionStates = {};
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
    document.getElementById('eventSelect').addEventListener('change', onEventChange);
    
    // 現在のポイント数
    document.getElementById('currentPoints').addEventListener('input', onPointsChange);
    
    // ボタン
    document.getElementById('resetProgress').addEventListener('click', resetProgress);
    document.getElementById('resetAll').addEventListener('click', resetAll);
    document.getElementById('showUsage').addEventListener('click', showUsageModal);
    
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
    
    // LocalStorageから復元
    loadEventStateFromLocalStorage(eventId);
    
    // 計算更新
    updateCalculations();
    
    // 表示
    document.getElementById('eventInfo').classList.remove('hidden');
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
        <button class="reward-toggle wanted">いる</button>
    `;
    
    // アイコンクリック
    const iconWrapper = div.querySelector('.reward-icon-wrapper');
    iconWrapper.addEventListener('click', () => decreaseStock(reward.id));
    
    // トグルボタン
    const toggleBtn = div.querySelector('.reward-toggle');
    toggleBtn.addEventListener('click', () => toggleRewardWanted(reward.id));
    
    return div;
}

// ========================================
// 報酬「いる/いらない」トグル
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
    const state = rewardStates[rewardId];
    const item = document.querySelector(`[data-reward-id="${rewardId}"]`);
    
    if (!item) return;
    
    const toggleBtn = item.querySelector('.reward-toggle');
    const stockBadge = item.querySelector('.reward-stock-badge');
    
    if (state.wanted) {
        item.classList.remove('unwanted');
        item.classList.add('wanted');
        toggleBtn.classList.remove('unwanted');
        toggleBtn.classList.add('wanted');
        toggleBtn.textContent = 'いる';
    } else {
        item.classList.remove('wanted');
        item.classList.add('unwanted');
        toggleBtn.classList.remove('wanted');
        toggleBtn.classList.add('unwanted');
        toggleBtn.textContent = 'いらない';
    }
    
    stockBadge.textContent = `×${state.remaining}`;
}

// ========================================
// 在庫減少
// ========================================
function decreaseStock(rewardId) {
    const state = rewardStates[rewardId];
    
    // 「いらない」設定の場合は何もしない
    if (!state.wanted) return;
    
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
    
    // サマリー更新
    updateMissionSummary();
    
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
        updateMissionSummary();
    }
    
    // 現在のポイント復元
    if (state.currentPoints !== undefined) {
        currentPoints = state.currentPoints;
        document.getElementById('currentPoints').value = currentPoints;
    }
}
