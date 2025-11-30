// グローバル変数
let categoriesData = null;
let charactersData = null;
let currentLanguage = 'ja';

// 所持キャラクター
let ownedCharacters = new Set();

// 現在の状態
const currentState = {
    commissions: {
        1: { categoryId: null, characters: [null, null, null] },
        2: { categoryId: null, characters: [null, null, null] },
        3: { categoryId: null, characters: [null, null, null] },
        4: { categoryId: null, characters: [null, null, null] }
    }
};

// 現在選択中の依頼スロットとキャラクター位置
let currentCommissionSlot = null;
let currentCharacterPosition = null;

// おまかせ成功時のメッセージ分岐
const autoAssignMessages = {
    // ラールが含まれている場合
    withSpecialCharacters: {
        icon: 'images/commission/success_laru.png', 
        messageKey: 'messages.autoAssignSuccess'
    },
    // それ以外（通常）
    normal: {
        icon: 'images/commission/success_default.png', 
        messageKey: 'messages.autoAssignNormal'
    },
    // 分岐トリガーのキャラクターID
    specialCharacterIds: ['50005']
};

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // i18n初期化
    await initI18n('commission');
    
    // 言語設定をi18nから取得
    currentLanguage = i18n.getLanguage();
    
    await loadData();
    setupEventListeners();
    loadFromLocalStorage();
    
    // 言語変更イベントをリッスン
    document.addEventListener('languageChanged', (e) => {
        currentLanguage = e.detail.language;
        updateLanguageDisplay();
        saveToLocalStorage();
    });
});

// データ読み込み
async function loadData() {
    try {
        const [categoriesResponse, charactersResponse] = await Promise.all([
            fetch('data/simu_commission_category.json'),
            fetch('data/simu_commission_char.json')
        ]);
        
        if (!categoriesResponse.ok || !charactersResponse.ok) {
            throw new Error('データの読み込みに失敗しました');
        }
        
        categoriesData = await categoriesResponse.json();
        charactersData = await charactersResponse.json();
        
        console.log('データ読み込み完了');
        
        // デフォルトで全員有効にする処理
        charactersData.characters.forEach(char => {
            ownedCharacters.add(char.id);
        });
        
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showError(i18n.getText('messages.dataLoadError', 'commission'));
    }
}

// イベントリスナーの設定
function setupEventListeners() {
    // 所持キャラクター管理
    document.getElementById('manageOwned').addEventListener('click', openOwnedCharactersModal);
    
    // おまかせ
    document.getElementById('autoAssign').addEventListener('click', handleAutoAssign);
    
    // 初期化
    document.getElementById('resetAll').addEventListener('click', handleResetAll);
    
    // 使い方
    document.getElementById('showUsage').addEventListener('click', () => openModal('usageModal'));
    
    // 依頼選択スロット
    document.querySelectorAll('.commission-select-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const slot = e.currentTarget.dataset.slot;
            openCommissionModal(slot);
        });
    });
    
    // キャラクタースロット
    document.querySelectorAll('.character-slot-item').forEach(slot => {
        slot.addEventListener('click', (e) => {
            const commission = e.currentTarget.dataset.commission;
            const position = e.currentTarget.dataset.position;
            openCharacterModal(commission, position);
        });
    });
    
    // モーダル閉じる
    setupModalClosers();
    
    // プリセット
    setupPresetButtons();
}

// モーダル関連
function closeCommissionModal() {
    document.getElementById('commissionModal').classList.remove('open');
}

function closeCharacterModal() {
    document.getElementById('characterModal').classList.remove('open');
}

function closeOwnedCharactersModal() {
    document.getElementById('ownedCharactersModal').classList.remove('open');
    removeUnownedCharactersFromSlots();
}

function closeAutoAssignModal() {
    document.getElementById('autoAssignModal').classList.remove('open');
}

function closeUsageModal() {
    document.getElementById('usageModal').classList.remove('open');
}

function setupModalClosers() {
    // 依頼選択モーダル
    const commissionModal = document.getElementById('commissionModal');
    commissionModal.querySelector('.commission-modal-close').addEventListener('click', closeCommissionModal);
    commissionModal.querySelector('.commission-modal-overlay').addEventListener('click', closeCommissionModal);
    
    // キャラクター選択モーダル
    const characterModal = document.getElementById('characterModal');
    characterModal.querySelector('.character-modal-close').addEventListener('click', closeCharacterModal);
    characterModal.querySelector('.character-modal-overlay').addEventListener('click', closeCharacterModal);
    
    // 所持キャラクター管理モーダル
    const ownedModal = document.getElementById('ownedCharactersModal');
    ownedModal.querySelector('.owned-characters-modal-close').addEventListener('click', closeOwnedCharactersModal);
    ownedModal.querySelector('.owned-characters-modal-overlay').addEventListener('click', closeOwnedCharactersModal);
    
    // おまかせモーダル
    const autoModal = document.getElementById('autoAssignModal');
    autoModal.querySelector('.auto-assign-modal-close').addEventListener('click', closeAutoAssignModal);
    autoModal.querySelector('.auto-assign-modal-overlay').addEventListener('click', closeAutoAssignModal);
    
    // 使い方モーダル
    const usageModal = document.getElementById('usageModal');
    usageModal.querySelector('.usage-modal-close').addEventListener('click', closeUsageModal);
    usageModal.querySelector('.usage-modal-overlay').addEventListener('click', closeUsageModal);
}

function openModal(modalId) {
    document.getElementById(modalId).classList.add('open');
}

// 所持キャラクター管理
function openOwnedCharactersModal() {
    const modal = document.getElementById('ownedCharactersModal');
    const grid = modal.querySelector('.owned-characters-grid');
    
    grid.innerHTML = '';
    
    charactersData.characters.forEach(char => {
        const option = document.createElement('div');
        option.className = 'owned-character-option';
        if (ownedCharacters.has(char.id)) {
            option.classList.add('active');
        } else {
            option.classList.add('inactive');
        }
        
        const icon = document.createElement('img');
        icon.className = 'character-option-icon';
        icon.src = char.icon;
        icon.alt = char.name[currentLanguage];
        
        // ツールチップを追加（ロール+スタイル）
        const tooltip = document.createElement('div');
        tooltip.className = 'owned-character-tooltip';
        const roleName = getRoleName(char.role);
        const styleName = getStyleName(char.style);
        tooltip.innerHTML = `${roleName}<br>${styleName}`;
        
        option.appendChild(icon);
        option.appendChild(tooltip);
        
        option.addEventListener('click', () => {
            if (ownedCharacters.has(char.id)) {
                ownedCharacters.delete(char.id);
                option.classList.remove('active');
                option.classList.add('inactive');
            } else {
                ownedCharacters.add(char.id);
                option.classList.remove('inactive');
                option.classList.add('active');
            }
            saveToLocalStorage();
        });
        
        grid.appendChild(option);
    });
    
    modal.classList.add('open');
}

// 未所持キャラクターをスロットの候補から削除
function removeUnownedCharactersFromSlots() {
    let hasChanges = false;
    
    Object.entries(currentState.commissions).forEach(([slot, commission]) => {
        commission.characters.forEach((charId, index) => {
            if (charId && !ownedCharacters.has(charId)) {
                currentState.commissions[slot].characters[index] = null;
                
                // UIを更新
                const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${index + 1}"]`);
                slotElement.classList.remove('filled', 'anything');
                slotElement.innerHTML = '<div class="character-slot-placeholder">?</div>';
                
                hasChanges = true;
            }
        });
        
        if (hasChanges) {
            checkRequirements(slot);
        }
    });
    
    if (hasChanges) {
        saveToLocalStorage();
    }
}

// 依頼選択
function openCommissionModal(slot) {
    currentCommissionSlot = slot;
    const modal = document.getElementById('commissionModal');
    const grid = modal.querySelector('.commission-modal-grid');
    
    grid.innerHTML = '';
    
    // 依頼を外す選択肢
    const clearOption = document.createElement('div');
    clearOption.className = 'commission-option';
    clearOption.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px; font-weight: bold; color: #252a42; background: white;">
            ${i18n.getText('labels.clear', 'commission')}
        </div>
    `;
    clearOption.addEventListener('click', (e) => {
        e.stopPropagation();
        clearCommission(slot);
        closeCommissionModal();
    });
    grid.appendChild(clearOption);
    
    // 既に選択されている依頼のIDを取得
    const usedCommissions = Object.entries(currentState.commissions)
        .filter(([s, c]) => s != slot && c.categoryId !== null)
        .map(([s, c]) => c.categoryId);
    
    categoriesData.categories.forEach(category => {
        const option = document.createElement('div');
        option.className = 'commission-option';
        
        // 既に他のスロットで選択されている依頼は無効化
        const isUsed = usedCommissions.includes(category.id);
        if (isUsed) {
            option.classList.add('disabled');
        }
        
        const img = document.createElement('img');
        img.className = 'commission-option-image';
        img.src = category.icon;
        img.alt = category.name[currentLanguage];
        
        const name = document.createElement('div');
        name.className = 'commission-option-name';
        name.textContent = category.name[currentLanguage];
        
        option.appendChild(img);
        option.appendChild(name);
        
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!option.classList.contains('disabled')) {
                selectCommission(slot, category.id);
                closeCommissionModal();
            }
        });
        
        grid.appendChild(option);
    });
    
    modal.classList.add('open');
}

function clearCommission(slot) {
    currentState.commissions[slot].categoryId = null;
    currentState.commissions[slot].characters = [null, null, null];
    
    // 依頼ボタンの更新
    const btn = document.querySelector(`.commission-select-btn[data-slot="${slot}"]`);
    btn.classList.remove('selected');
    btn.style.backgroundImage = '';
    
    // 依頼名バッジの削除
    const badge = btn.querySelector('.commission-name-badge');
    if (badge) badge.remove();
    
    // スタイルバッジをクリア
    const styleBadgesContainer = document.querySelector(`.style-badges[data-slot="${slot}"]`);
    styleBadgesContainer.innerHTML = '';
    
    // ロールコンテナとキャラスロをリセット
    for (let i = 1; i <= 3; i++) {
        const container = document.querySelector(`.role-character-container[data-commission="${slot}"][data-position="${i}"]`);
        const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${i}"]`);
        const label = container.querySelector('.role-label');
        
        // ロールラベルをクリア
        label.textContent = '';
        
        // ロールクラスとhas-characterクラスを削除
        container.classList.remove('role-vanguard', 'role-versatile', 'role-support', 'has-character');
        
        // 背景色リセット
        container.style.backgroundColor = '#f0f0f0';
        label.style.color = '#666';
        
        // キャラスロをリセット＆グレーアウト
        slotElement.classList.remove('filled', 'anything');
        slotElement.classList.add('disabled');
        slotElement.innerHTML = '<div class="character-slot-placeholder">?</div>';
    }
    
    updateAutoAssignButton();
    updatePresetThumbnails();
    saveToLocalStorage();
}

function selectCommission(slot, categoryId, skipSave = false) {
    // 既存の依頼IDを取得
    const previousCategoryId = currentState.commissions[slot].categoryId;
    
    // 依頼を変更した時キャラスロを空にする
    if (previousCategoryId !== null && previousCategoryId !== categoryId) {
        currentState.commissions[slot].characters = [null, null, null];
        
        // UIからキャラクターをクリア
        for (let i = 1; i <= 3; i++) {
            const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${i}"]`);
            const containerElement = document.querySelector(`.role-character-container[data-commission="${slot}"][data-position="${i}"]`);
            
            slotElement.classList.remove('filled', 'anything');
            slotElement.innerHTML = '<div class="character-slot-placeholder">?</div>';
            
            if (containerElement) {
                containerElement.classList.remove('has-character');
            }
        }
    }
    
    currentState.commissions[slot].categoryId = categoryId;
    
    // 依頼ボタンの更新
    const btn = document.querySelector(`.commission-select-btn[data-slot="${slot}"]`);
    const category = categoriesData.categories.find(c => c.id === categoryId);
    
    btn.classList.add('selected');
    btn.style.backgroundImage = `url('${category.icon}')`;
    
    // 依頼名バッジの追加
    let badge = btn.querySelector('.commission-name-badge');
    if (!badge) {
        badge = document.createElement('div');
        badge.className = 'commission-name-badge';
        btn.appendChild(badge);
    }
    badge.textContent = category.name[currentLanguage];
    
    // キャラスロを有効化
    for (let i = 1; i <= 3; i++) {
        const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${i}"]`);
        slotElement.classList.remove('disabled');
    }
    
    // 要件バッジの更新
    updateRequirementBadges(slot);
    updateAutoAssignButton();
    updatePresetThumbnails();
    
    if (!skipSave) {
        saveToLocalStorage();
    }
}

function updateRequirementBadges(slot) {
    const commission = currentState.commissions[slot];
    if (!commission.categoryId) return;
    
    const category = categoriesData.categories.find(c => c.id === commission.categoryId);
    
    // ロールラベルとコンテナクラスを更新
    category.roles.forEach((role, index) => {
        const container = document.querySelector(`.role-character-container[data-commission="${slot}"][data-position="${index + 1}"]`);
        const label = container.querySelector('.role-label');
        
        // ロール名を表示
        label.textContent = getRoleName(role);
        
        // ロールクラスを追加
        container.classList.remove('role-vanguard', 'role-versatile', 'role-support');
        container.classList.add(`role-${role}`);
        
        // 未配置時の背景色
        const lightRoleColors = {
            'vanguard': '#ffd2e3',
            'versatile': '#cfd1ff',
            'support': '#d2fff6'
        };
        if (lightRoleColors[role]) {
            container.style.backgroundColor = lightRoleColors[role];
        }
    });
    
    // スタイルバッジ
    const styleBadgesContainer = document.querySelector(`.style-badges[data-slot="${slot}"]`);
    styleBadgesContainer.innerHTML = '';
    category.styles.forEach(style => {
        const badge = document.createElement('span');
        badge.className = 'requirement-badge style-badge';
        badge.dataset.style = style;
        badge.textContent = getStyleName(style);
        styleBadgesContainer.appendChild(badge);
    });
    
    // 条件チェック
    checkRequirements(slot);
}

function getRoleName(role) {
    return currentLanguage === 'ja' 
        ? categoriesData.roleNames[role].ja 
        : categoriesData.roleNames[role].en;
}

function getStyleName(style) {
    return currentLanguage === 'ja' 
        ? categoriesData.styleNames[style].ja 
        : categoriesData.styleNames[style].en;
}

// キャラクター選択
function openCharacterModal(commissionSlot, position) {
    currentCommissionSlot = commissionSlot;
    currentCharacterPosition = position;
    
    const commission = currentState.commissions[commissionSlot];
    if (!commission.categoryId) {
        // 依頼未選択の場合は何もしない
        return;
    }
    
    const modal = document.getElementById('characterModal');
    const grid = modal.querySelector('.character-modal-grid');
    
    grid.innerHTML = '';
    
    // 選択解除オプション
    const clearOption = document.createElement('div');
    clearOption.className = 'character-option';
    clearOption.innerHTML = `
        <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 16px; font-weight: bold; color: #252a42;">
            ${i18n.getText('labels.clear', 'commission')}
        </div>
    `;
    clearOption.addEventListener('click', (e) => {
        e.stopPropagation();
        selectCharacter(commissionSlot, position, null);
        closeCharacterModal();
    });
    grid.appendChild(clearOption);
    
    // 既に使用されているキャラクターを取得
    const usedCharacters = getUsedCharacters(commissionSlot, position);
    
    // 必要なロールを取得
    const category = categoriesData.categories.find(c => c.id === commission.categoryId);
    const requiredRole = category.roles[position - 1];
    
    // キャラクターオプション
    charactersData.characters.forEach(char => {
        // 所持していないキャラクターはスキップ
        if (!ownedCharacters.has(char.id)) return;
        
        // ロールが合わないキャラクターはスキップ
        if (char.role !== requiredRole) return;
        
        const option = document.createElement('div');
        option.className = 'character-option';
        
        // 既に使用されているキャラクターは無効化
        if (usedCharacters.includes(char.id)) {
            option.classList.add('disabled');
        }
        
        const icon = document.createElement('img');
        icon.className = 'character-option-icon';
        icon.src = char.icon;
        icon.alt = char.name[currentLanguage];
        
        const styleName = document.createElement('div');
        styleName.className = 'character-option-name';
        styleName.textContent = getStyleName(char.style);
        
        option.appendChild(icon);
        option.appendChild(styleName);
        
        option.addEventListener('click', (e) => {
            e.stopPropagation();
            if (!option.classList.contains('disabled')) {
                selectCharacter(commissionSlot, position, char.id);
                closeCharacterModal();
            }
        });
        
        grid.appendChild(option);
    });
    
    modal.classList.add('open');
}

function selectCharacter(commissionSlot, position, characterId, skipSave = false) {
    currentState.commissions[commissionSlot].characters[position - 1] = characterId;
    
    // キャラスロの更新
    const slotElement = document.querySelector(`.character-slot-item[data-commission="${commissionSlot}"][data-position="${position}"]`);
    const containerElement = document.querySelector(`.role-character-container[data-commission="${commissionSlot}"][data-position="${position}"]`);
    
    slotElement.innerHTML = '';
    
    if (characterId) {
        const character = charactersData.characters.find(c => c.id === characterId);
        slotElement.classList.add('filled');
        
        // コンテナに配置済クラスを追加
        if (containerElement) {
            containerElement.classList.add('has-character');
            
            // 配置済の背景色
            const commission = currentState.commissions[commissionSlot];
            if (commission.categoryId) {
                const category = categoriesData.categories.find(c => c.id === commission.categoryId);
                const currentRole = category.roles[position - 1];
                const roleColors = {
                    'vanguard': '#db6893',
                    'versatile': '#7d81e3',
                    'support': '#41cbaf'
                };
                if (roleColors[currentRole]) {
                    containerElement.style.backgroundColor = roleColors[currentRole];
                }
                const label = containerElement.querySelector('.role-label');
                if (label) {
                    label.style.color = 'white';
                }
            }
        }
        
        const img = document.createElement('img');
        img.className = 'character-slot-image';
        img.src = character.icon;
        img.alt = character.name;
        slotElement.appendChild(img);
    } else {
        slotElement.classList.remove('filled');
        slotElement.classList.remove('anything');
        
        // コンテナから配置済クラスを削除
        if (containerElement) {
            containerElement.classList.remove('has-character');
            
            // 未配置の背景色
            const commission = currentState.commissions[commissionSlot];
            if (commission.categoryId) {
                const category = categoriesData.categories.find(c => c.id === commission.categoryId);
                const currentRole = category.roles[position - 1];
                const lightRoleColors = {
                    'vanguard': '#ffd2e3',
                    'versatile': '#cfd1ff',
                    'support': '#d2fff6'
                };
                if (lightRoleColors[currentRole]) {
                    containerElement.style.backgroundColor = lightRoleColors[currentRole];
                }
                const label = containerElement.querySelector('.role-label');
                if (label) {
                    label.style.color = '#666';
                }
            }
        }
        
        const placeholder = document.createElement('div');
        placeholder.className = 'character-slot-placeholder';
        placeholder.textContent = '?';
        slotElement.appendChild(placeholder);
    }
    
    // 条件チェック
    checkRequirements(commissionSlot);
    
    if (!skipSave) {
        saveToLocalStorage();
    }
}

function getUsedCharacters(excludeCommission = null, excludePosition = null) {
    const used = [];
    
    Object.entries(currentState.commissions).forEach(([slot, commission]) => {
        commission.characters.forEach((charId, index) => {
            if (charId && !(slot == excludeCommission && (index + 1) == excludePosition)) {
                used.push(charId);
            }
        });
    });
    
    return used;
}

// 条件チェック
function checkRequirements(slot) {
    const commission = currentState.commissions[slot];
    if (!commission.categoryId) return;
    
    const category = categoriesData.categories.find(c => c.id === commission.categoryId);
    const assignedCharacters = commission.characters
        .map((id, index) => ({ id, index }))
        .filter(item => item.id !== null)
        .map(item => ({
            ...charactersData.characters.find(c => c.id === item.id),
            position: item.index
        }));
    
    // スタイルチェック
    const styleBadges = document.querySelectorAll(`.style-badges[data-slot="${slot}"] .style-badge`);
    const styleMatches = {};
    
    category.styles.forEach(style => {
        styleMatches[style] = assignedCharacters.some(char => char.style === style);
    });
    
    styleBadges.forEach(badge => {
        if (styleMatches[badge.dataset.style]) {
            badge.classList.add('active');
        } else {
            badge.classList.remove('active');
        }
    });
    
    // 「誰でもOK」判定
    checkAnythingOk(slot);
}

function checkAnythingOk(slot) {
    const commission = currentState.commissions[slot];
    if (!commission.categoryId) return;
    
    const category = categoriesData.categories.find(c => c.id === commission.categoryId);
    
    // 全てのスロットから「誰でもOK」をクリア
    for (let i = 1; i <= 3; i++) {
        const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${i}"]`);
        slotElement.classList.remove('anything');
        
        // キャラクターが配置されていない場合はハテナに戻す
        if (!commission.characters[i - 1]) {
            slotElement.innerHTML = '<div class="character-slot-placeholder">?</div>';
        }
    }
    
    // 2キャラ設定時点でスタイル条件満たしてるかチェック
    const combinations = [
        { filled: [0, 1], empty: 2 }, 
        { filled: [0, 2], empty: 1 }, 
        { filled: [1, 2], empty: 0 }  
    ];
    
    for (const combo of combinations) {
        const char1Id = commission.characters[combo.filled[0]];
        const char2Id = commission.characters[combo.filled[1]];
        const emptySlotId = commission.characters[combo.empty];
        
        // 2つが埋まっていて、1つが空いている場合のみチェック
        if (char1Id && char2Id && !emptySlotId) {
            const char1 = charactersData.characters.find(c => c.id === char1Id);
            const char2 = charactersData.characters.find(c => c.id === char2Id);
            
            const styles = [char1.style, char2.style];
            const allStylesMatched = category.styles.every(style => styles.includes(style));
            
            if (allStylesMatched) {
                // 空いているスロットに「なんでもOK」を表示
                const emptySlotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${combo.empty + 1}"]`);
                emptySlotElement.classList.add('anything');
                const text = i18n.getText('messages.anyoneOk', 'commission');
                emptySlotElement.innerHTML = `<div class="character-slot-placeholder">${text}</div>`;
                
                // 1つ見つかったら終了
                break;
            }
        }
    }
}

// おまかせボタン
function updateAutoAssignButton() {
    const autoAssignBtn = document.getElementById('autoAssign');
    const selectedCommissions = Object.values(currentState.commissions)
        .filter(c => c.categoryId !== null);
    
    // 1～4個の依頼が選択されている場合に有効化
    if (selectedCommissions.length >= 1 && selectedCommissions.length <= 4) {
        autoAssignBtn.disabled = false;
        autoAssignBtn.classList.remove('btn-disabled');
    } else {
        autoAssignBtn.disabled = true;
        autoAssignBtn.classList.add('btn-disabled');
    }
}

// おまかせ機能
function handleAutoAssign() {
    const solutions = findAutoAssignSolutions();
    displayAutoAssignResults(solutions);
}

function findAutoAssignSolutions() {
    const solutions = [];
    const maxSolutions = 20; // キャラが増えてきたら探索漏れ防止で増やす
    
    // 選択された依頼を取得
    const selectedCommissions = Object.entries(currentState.commissions)
        .filter(([slot, commission]) => commission.categoryId !== null)
        .map(([slot, commission]) => ({
            slot: parseInt(slot),
            category: categoriesData.categories.find(c => c.id === commission.categoryId)
        }));
    
    if (selectedCommissions.length === 0) {
        return [];
    }
    
    // 所持キャラクターのみをフィルタ
    const availableCharacters = charactersData.characters.filter(c => ownedCharacters.has(c.id));
    
    // バックトラック探索
    function backtrack(commissionIndex, usedCharacters, currentSolution) {
        if (solutions.length >= maxSolutions) return;
        
        if (commissionIndex >= selectedCommissions.length) {
            solutions.push(JSON.parse(JSON.stringify(currentSolution)));
            return;
        }
        
        const commission = selectedCommissions[commissionIndex];
        const candidates = findCandidatesForCommission(commission.category, availableCharacters, usedCharacters);
        
        for (const candidate of candidates) {
            const newUsed = new Set([...usedCharacters, ...candidate.map(c => c.id)]);
            const newSolution = [...currentSolution, {
                slot: commission.slot,
                characters: candidate
            }];
            
            backtrack(commissionIndex + 1, newUsed, newSolution);
            
            if (solutions.length >= maxSolutions) return;
        }
    }
    
    backtrack(0, new Set(), []);
    
    return solutions;
}

function findCandidatesForCommission(category, availableCharacters, usedCharacters) {
    const candidates = [];
    const seenCombinations = new Set(); // 重複チェック用（順不同）
    
    // 各ポジションのロール要件
    const requiredRoles = category.roles;
    const requiredStyles = category.styles;
    
    // ポジション1の候補
    const pos1Candidates = availableCharacters.filter(c => 
        c.role === requiredRoles[0] && !usedCharacters.has(c.id)
    );
    
    for (const char1 of pos1Candidates) {
        // ポジション2の候補
        const pos2Candidates = availableCharacters.filter(c => 
            c.role === requiredRoles[1] && !usedCharacters.has(c.id) && c.id !== char1.id
        );
        
        for (const char2 of pos2Candidates) {
            // ポジション3の候補を取得（スタイルチェック前）
            const pos3Candidates = availableCharacters.filter(c => 
                c.role === requiredRoles[2] && 
                !usedCharacters.has(c.id) && 
                c.id !== char1.id && 
                c.id !== char2.id
            );
            
            for (const char3 of pos3Candidates) {
                // 3人全員のスタイルでチェック
                const currentStyles = new Set([char1.style, char2.style, char3.style]);
                const stylesSatisfied = requiredStyles.every(style => currentStyles.has(style));
                
                if (stylesSatisfied) {
                    // キャラクターIDをソートして正規化（順不同の重複を排除）
                    const normalizedKey = [char1.id, char2.id, char3.id].sort().join(',');
                    
                    // 重複チェック：同じキャラの組み合わせは1回だけ
                    if (!seenCombinations.has(normalizedKey)) {
                        seenCombinations.add(normalizedKey);
                        candidates.push([char1, char2, char3]);
                        if (candidates.length >= 10) break; // キャラが増えてきたら増やすかも
                    }
                }
            }
            if (candidates.length >= 10) break; // キャラが増えてきたら増やすかも
        }
        if (candidates.length >= 10) break; // キャラが増えてきたら増やすかも
    }
    
    return candidates;
}

function displayAutoAssignResults(solutions) {
    const modal = document.getElementById('autoAssignModal');
    const resultsContainer = document.getElementById('autoAssignResults');
    
    resultsContainer.innerHTML = '';
    
    if (solutions.length === 0) {
        // 達成できない場合
        const errorDiv = document.createElement('div');
        errorDiv.className = 'auto-assign-error';
        errorDiv.innerHTML = `<h4>${i18n.getText('autoAssign.failedTitle', 'commission')}</h4><p>${i18n.getText('autoAssign.failedMessage', 'commission')}</p>`;
        
        // 不足しているキャラクターの提案
        const missingResult = findMissingCharacters({
            maxTotalPatterns: 20,   // 合計20パターンまで表示
            maxRequiredChars: 5     // 最大5人まで試す
        });
        
        if (missingResult.tooMany) {
            // 必要キャラが多すぎる場合
            errorDiv.innerHTML += `<p>${i18n.getText('autoAssign.needSix', 'commission')}</p>`;
        } else if (missingResult.groups.length > 0) {
            // 候補がある場合
            errorDiv.innerHTML += '<div class="missing-characters-section"></div>';
            const sectionContainer = errorDiv.querySelector('.missing-characters-section');
            
            missingResult.groups.forEach(group => {
                const groupDiv = document.createElement('div');
                groupDiv.className = 'missing-group';
                
                // 人数が足りない時の各セクションタイトル
                const groupTitle = document.createElement('h5');
                groupTitle.className = 'missing-group-title';
                groupTitle.textContent = group.requiredCount === 1 
                    ? i18n.getText('autoAssign.need1', 'commission')
                    : i18n.getText('autoAssign.needN', 'commission').replace('{count}', group.requiredCount);
                groupDiv.appendChild(groupTitle);
                
                // 候補を1つずつコンテナに格納
                const candidatesContainer = document.createElement('div');
                candidatesContainer.className = 'missing-candidates-container';
                
                // 各候補を表示
                group.candidates.forEach((candidate, idx) => {
                    // 1パターンごとにコンテナ作る
                    const candidateItem = document.createElement('div');
                    candidateItem.className = 'missing-candidate-item';
                    
                    // キャラクターアイコンを格納
                    const iconsContainer = document.createElement('div');
                    iconsContainer.className = 'missing-candidate-icons';
                    
                    candidate.forEach((char, charIdx) => {
                        const img = document.createElement('img');
                        img.className = 'missing-character-icon-box';
                        img.src = char.icon;
                        img.alt = char.name[currentLanguage];
                        img.title = char.name[currentLanguage];
                        iconsContainer.appendChild(img);
                        
                        // 複数人の場合+で繋げる
                        if (group.requiredCount > 1 && charIdx < candidate.length - 1) {
                            const plusSign = document.createElement('span');
                            plusSign.className = 'candidate-plus';
                            plusSign.textContent = '+';
                            iconsContainer.appendChild(plusSign);
                        }
                    });
                    
                    candidateItem.appendChild(iconsContainer);
                    candidatesContainer.appendChild(candidateItem);
                });
                
                groupDiv.appendChild(candidatesContainer);
                sectionContainer.appendChild(groupDiv);
            });
            
            errorDiv.innerHTML += `<p>${i18n.getText('autoAssign.tryAgain', 'commission')}</p>`;
        }
        
        resultsContainer.appendChild(errorDiv);
    } else {
        // 成功時のメッセージヘッダーを追加
        const hasSpecialCharacter = checkForSpecialCharacters(solutions);
        const messageConfig = hasSpecialCharacter 
            ? autoAssignMessages.withSpecialCharacters 
            : autoAssignMessages.normal;
        
        // メッセージヘッダーを作成
        if (messageConfig.messageKey) {
            const headerDiv = document.createElement('div');
            headerDiv.className = 'auto-assign-success-header';
            
            // アイコンがある場合は表示
            if (messageConfig.icon) {
                const icon = document.createElement('img');
                icon.className = 'auto-assign-success-icon';
                icon.src = messageConfig.icon;
                icon.alt = 'Success';
                headerDiv.appendChild(icon);
            }
            
            // メッセージテキスト
            const message = document.createElement('div');
            message.className = 'auto-assign-success-message';
            message.textContent = i18n.getText(messageConfig.messageKey, 'commission');
            headerDiv.appendChild(message);
            
            resultsContainer.appendChild(headerDiv);
        }
        
        // 候補を表示
        solutions.forEach((solution, index) => {
            const resultDiv = document.createElement('div');
            resultDiv.className = 'auto-assign-result';
            
            // 「候補1～4」表記は見栄え良くないから一旦消す
            // const title = document.createElement('h4');
            // title.textContent = `候補 ${index + 1}`;
            // resultDiv.appendChild(title);
            
            const commissionsDiv = document.createElement('div');
            commissionsDiv.className = 'auto-assign-commissions';
            
            solution.forEach(item => {
                const commission = currentState.commissions[item.slot];
                const category = categoriesData.categories.find(c => c.id === commission.categoryId);
                
                const commissionDiv = document.createElement('div');
                commissionDiv.className = 'auto-assign-commission';
                
                // 依頼アイコンを表示
                const iconImg = document.createElement('img');
                iconImg.className = 'auto-assign-commission-icon';
                iconImg.src = category.icon;
                iconImg.alt = category.name[currentLanguage];
                iconImg.title = category.name[currentLanguage];
                commissionDiv.appendChild(iconImg);
                
                const charsDiv = document.createElement('div');
                charsDiv.className = 'auto-assign-characters';
                
                item.characters.forEach(char => {
                    const img = document.createElement('img');
                    img.className = 'auto-assign-character-icon';
                    img.src = char.icon;
                    img.alt = char.name[currentLanguage];
                    img.title = char.name[currentLanguage];
                    charsDiv.appendChild(img);
                });
                
                commissionDiv.appendChild(charsDiv);
                commissionsDiv.appendChild(commissionDiv);
            });
            
            resultDiv.appendChild(commissionsDiv);
            
            resultDiv.addEventListener('click', (e) => {
                e.stopPropagation();
                applySolution(solution);
                closeAutoAssignModal();
            });
            
            resultsContainer.appendChild(resultDiv);
        });
    }
    
    modal.classList.add('open');
}

function findMissingCharacters(options = {}) {
    // オプションのデフォルト値
    const maxTotalPatterns = options.maxTotalPatterns || 20; // 合計パターン数の上限
    const maxRequiredChars = options.maxRequiredChars || 5; // 最大何体まで試すか
    
    // 未所持のキャラクターを取得
    const missingChars = charactersData.characters.filter(c => !ownedCharacters.has(c.id));
    
    if (missingChars.length === 0) {
        return { groups: [], tooMany: false };
    }
    
    // 結果を格納: { requiredCount: number, candidates: Array<Array<Character>> }
    const resultGroups = [];
    let totalPatterns = 0;
    
    // 既に見つかったキャラクターのIDを記録（それ以降に除外するため）
    const alreadyFoundCharIds = new Set();
    
    // 1体ずつ増やしながら試す
    for (let requiredCount = 1; requiredCount <= Math.min(maxRequiredChars, missingChars.length); requiredCount++) {
        const candidatesForThisCount = [];
        
        // この体数での組み合わせを生成して試す
        const combinations = generateCombinations(missingChars, requiredCount);
        
        for (const combo of combinations) {
            // 合計パターン数が上限に達したら終了
            if (totalPatterns >= maxTotalPatterns) break;
            
            // すでに見つかったキャラクターが含まれている場合はスキップ
            // （前の体数グループで見つかったキャラクターを含む組み合わせは無視）
            const hasAlreadyFoundChar = combo.some(char => alreadyFoundCharIds.has(char.id));
            if (hasAlreadyFoundChar) {
                continue;
            }
            
            // この組み合わせのキャラクターを一時的に所持キャラクターに追加
            const tempOwnedChars = new Set(ownedCharacters);
            combo.forEach(char => tempOwnedChars.add(char.id));
            
            // 一時的に所持キャラクターを変更して解を探す
            const originalOwnedChars = ownedCharacters;
            ownedCharacters = tempOwnedChars;
            const solutions = findAutoAssignSolutions();
            ownedCharacters = originalOwnedChars;
            
            // 解が見つかった場合、この組み合わせを候補に追加
            if (solutions.length > 0) {
                candidatesForThisCount.push(combo);
                totalPatterns++;
            }
        }
        
        // この体数で候補が見つかった場合、結果に追加
        if (candidatesForThisCount.length > 0) {
            resultGroups.push({
                requiredCount: requiredCount,
                candidates: candidatesForThisCount
            });
            
            // この体数グループで見つかったキャラクターを記録
            // 次の体数グループではこれらを含む組み合わせは除外（例：コハクが見つかった場合、コハク＋αを提案する意味がない）
            candidatesForThisCount.forEach(candidate => {
                candidate.forEach(char => {
                    alreadyFoundCharIds.add(char.id);
                });
            });
        }
        
        // 合計パターン数が上限に達したら終了
        if (totalPatterns >= maxTotalPatterns) break;
    }
    
    // 何も見つからなかった場合はmaxRequiredCharsを超える体数が必要
    const tooMany = resultGroups.length === 0;
    
    return { groups: resultGroups, tooMany: tooMany };
}

// n個の要素からk個を選ぶ組み合わせを生成
function generateCombinations(array, k, maxCombinations = 1000) {
    const result = [];
    
    function backtrack(start, current) {
        if (result.length >= maxCombinations) return; // 上限に達したら終了
        
        if (current.length === k) {
            result.push([...current]);
            return;
        }
        
        for (let i = start; i < array.length; i++) {
            current.push(array[i]);
            backtrack(i + 1, current);
            current.pop();
            
            if (result.length >= maxCombinations) return; // 上限チェック
        }
    }
    
    backtrack(0, []);
    return result;
}

function applySolution(solution) {
    solution.forEach(item => {
        const slot = String(item.slot); // 明示的に文字列に変換
        item.characters.forEach((char, index) => {
            selectCharacter(slot, index + 1, char.id, true);
        });
    });
    
    // 最後にまとめて保存とUI更新
    saveToLocalStorage();
    updateAutoAssignButton();
    updatePresetThumbnails();
}

// ラールが候補に含まれているかチェック
function checkForSpecialCharacters(solutions) {
    // ラールが設定されていない場合はfalse
    if (!autoAssignMessages.specialCharacterIds || autoAssignMessages.specialCharacterIds.length === 0) {
        return false;
    }
    
    // 全候補のキャラクターIDを収集
    const allCharacterIds = new Set();
    solutions.forEach(solution => {
        solution.forEach(item => {
            item.characters.forEach(char => {
                allCharacterIds.add(char.id);
            });
        });
    });
    
    // ラールのIDが1つでも含まれているかチェック
    return autoAssignMessages.specialCharacterIds.some(id => allCharacterIds.has(id));
}

// プリセット機能
function setupPresetButtons() {
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNum = parseInt(e.target.dataset.preset);
            handleSavePreset(presetNum);
        });
    });
    
    document.querySelectorAll('.btn-load').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const presetNum = parseInt(e.target.dataset.preset);
            handleLoadPreset(presetNum);
        });
    });
    
    // プリセット削除ボタンのセットアップはupdatePresetThumbnailsに移行
}

function handleSavePreset(presetNum) {
    // 確認ダイアログ
    const existingPreset = localStorage.getItem(`commission_preset_${presetNum}`);
    if (existingPreset) {
        if (!confirm(i18n.getText('messages.confirmOverwrite', 'commission').replace('{number}', presetNum))) {
            return;
        }
    }
    
    savePreset(presetNum);
}

function savePreset(presetNum) {
    const presetData = {
        commissions: currentState.commissions,
        ownedCharacters: [...ownedCharacters], // 所持キャラクター情報を追加
        timestamp: Date.now()
    };
    
    localStorage.setItem(`commission_preset_${presetNum}`, JSON.stringify(presetData));
    
    updatePresetButtons();
    updatePresetThumbnails();
    alert(i18n.getText('messages.savedPreset', 'commission').replace('{number}', presetNum));
}

function handleLoadPreset(presetNum) {
    const presetData = JSON.parse(localStorage.getItem(`commission_preset_${presetNum}`));
    
    if (!presetData) return;
    
    // 現在の設定と異なる場合は警告
    if (JSON.stringify(currentState.commissions) !== JSON.stringify(presetData.commissions)) {
        if (!confirm(i18n.getText('messages.confirmLoad', 'commission'))) {
            return;
        }
    }
    
    // 依頼情報を復元
    currentState.commissions = JSON.parse(JSON.stringify(presetData.commissions));
    
    // 所持キャラクター情報を復元
    if (presetData.ownedCharacters) {
        ownedCharacters = new Set(presetData.ownedCharacters);
    }
    
    // UIを再描画
    renderAllCommissions();
    
    saveToLocalStorage();
}

function deletePreset(presetNum) {
    if (!confirm(i18n.getText('messages.confirmDelete', 'commission').replace('{number}', presetNum))) {
        return;
    }
    
    localStorage.removeItem(`commission_preset_${presetNum}`);
    updatePresetButtons();
    updatePresetThumbnails();
}

function renderAllCommissions() {
    // まず全てをクリア
    document.querySelectorAll('.commission-select-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.backgroundImage = '';
        const badge = btn.querySelector('.commission-name-badge');
        if (badge) badge.remove();
    });
    
    document.querySelectorAll('.character-slot-item').forEach(slot => {
        slot.classList.remove('filled', 'anything');
        slot.classList.add('disabled');
        slot.innerHTML = '<div class="character-slot-placeholder">?</div>';
    });
    
    // ロールコンテナもクリア
    document.querySelectorAll('.role-character-container').forEach(container => {
        container.classList.remove('role-vanguard', 'role-versatile', 'role-support', 'has-character');
        const label = container.querySelector('.role-label');
        if (label) {
            label.textContent = '';
            label.style.color = '#666';
        }
        // デフォルト背景色にリセット
        container.style.backgroundColor = '#f0f0f0';
    });
    
    document.querySelectorAll('.requirement-badges').forEach(container => {
        container.innerHTML = '';
    });
    
    // 依頼とキャラクターを復元
    Object.entries(currentState.commissions).forEach(([slot, commission]) => {
        if (commission.categoryId) {
            selectCommission(slot, commission.categoryId, true);
            
            commission.characters.forEach((charId, index) => {
                if (charId) {
                    selectCharacter(slot, index + 1, charId, true);
                }
            });
        }
    });
    
    updateAutoAssignButton();
    updatePresetThumbnails();
}

function updatePresetButtons() {
    for (let i = 1; i <= 10; i++) {
        const loadBtn = document.querySelector(`.btn-load[data-preset="${i}"]`);
        const presetData = localStorage.getItem(`commission_preset_${i}`);
        
        if (presetData) {
            loadBtn.disabled = false;
        } else {
            loadBtn.disabled = true;
        }
    }
}

function updatePresetThumbnails() {
    for (let i = 1; i <= 10; i++) {
        const presetItem = document.querySelector(`.preset-item[data-preset="${i}"]`);
        const thumbnail = presetItem.querySelector('.preset-thumbnail');
        const presetData = localStorage.getItem(`commission_preset_${i}`);
        
        // 既存の削除ボタンを削除
        const existingDeleteBtn = presetItem.querySelector('.btn-delete-preset');
        if (existingDeleteBtn) {
            existingDeleteBtn.remove();
        }
        
        if (presetData) {
            const data = JSON.parse(presetData);
            thumbnail.classList.remove('empty');
            thumbnail.innerHTML = '';
            
            // 4つの依頼アイコンを表示
            for (let slot = 1; slot <= 4; slot++) {
                const commission = data.commissions[slot];
                if (commission.categoryId) {
                    const category = categoriesData.categories.find(c => c.id === commission.categoryId);
                    const img = document.createElement('img');
                    img.className = 'preset-commission-icon';
                    img.src = category.icon;
                    img.alt = category.name[currentLanguage];
                    thumbnail.appendChild(img);
                } else {
                    // 空の場合は番号を表示
                    const placeholder = document.createElement('div');
                    placeholder.style.cssText = 'width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: rgba(255,255,255,0.3); border-radius: 3px; color: white; font-weight: bold; font-size: 16px;';
                    placeholder.textContent = slot;
                    thumbnail.appendChild(placeholder);
                }
            }
            
            // 削除ボタンを追加
            const actionsDiv = presetItem.querySelector('.preset-actions');
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-preset';
            deleteBtn.textContent = i18n.getText('labels.delete', 'commission');
            deleteBtn.dataset.preset = i;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetNum = parseInt(e.target.dataset.preset);
                deletePreset(presetNum);
            });
            actionsDiv.appendChild(deleteBtn);
        } else {
            // プリセットが空の場合
            thumbnail.classList.add('empty');
            thumbnail.innerHTML = `<span class="preset-number">${i}</span>`;
        }
    }
}

// 初期化
function handleResetAll() {
    const confirmMsg = i18n.getText('messages.confirmReset', 'commission');
    if (!confirm(confirmMsg)) {
        return;
    }
    
    // 依頼をリセット
    currentState.commissions = {
        1: { categoryId: null, characters: [null, null, null] },
        2: { categoryId: null, characters: [null, null, null] },
        3: { categoryId: null, characters: [null, null, null] },
        4: { categoryId: null, characters: [null, null, null] }
    };
    
    // 所持キャラクターを全て活性化
    ownedCharacters.clear();
    charactersData.characters.forEach(char => {
        ownedCharacters.add(char.id);
    });
    
    // UIリセット
    document.querySelectorAll('.commission-select-btn').forEach(btn => {
        btn.classList.remove('selected');
        btn.style.backgroundImage = '';
        const badge = btn.querySelector('.commission-name-badge');
        if (badge) badge.remove();
    });
    
    document.querySelectorAll('.character-slot-item').forEach(slot => {
        slot.classList.remove('filled', 'anything');
        slot.classList.add('disabled');
        slot.innerHTML = '<div class="character-slot-placeholder">?</div>';
    });
    
    // ロールコンテナもクリア
    document.querySelectorAll('.role-character-container').forEach(container => {
        container.classList.remove('role-vanguard', 'role-versatile', 'role-support', 'has-character');
        const label = container.querySelector('.role-label');
        if (label) {
            label.textContent = '';
            label.style.color = '#666';
        }
        // デフォルト背景色にリセット
        container.style.backgroundColor = '#f0f0f0';
    });
    
    document.querySelectorAll('.requirement-badge').forEach(badge => {
        badge.classList.remove('active');
    });
    
    document.querySelectorAll('.requirement-badges').forEach(container => {
        container.innerHTML = '';
    });
    
    updateAutoAssignButton();
    updatePresetThumbnails();
    
    saveToLocalStorage();
    alert(i18n.getText('messages.resetComplete', 'commission'));
}

function updateLanguageDisplay() {
    // 依頼名バッジの更新
    Object.entries(currentState.commissions).forEach(([slot, commission]) => {
        if (commission.categoryId) {
            const btn = document.querySelector(`.commission-select-btn[data-slot="${slot}"]`);
            const badge = btn.querySelector('.commission-name-badge');
            if (badge) {
                const category = categoriesData.categories.find(c => c.id === commission.categoryId);
                badge.textContent = category.name[currentLanguage];
            }
            
            const category = categoriesData.categories.find(c => c.id === commission.categoryId);
            
            // ロールラベルの更新
            category.roles.forEach((role, index) => {
                const container = document.querySelector(`.role-character-container[data-commission="${slot}"][data-position="${index + 1}"]`);
                const label = container.querySelector('.role-label');
                if (label) {
                    label.textContent = getRoleName(role);
                }
            });
            
            // スタイルバッジの更新
            const styleBadges = document.querySelectorAll(`.style-badges[data-slot="${slot}"] .style-badge`);
            styleBadges.forEach(badge => {
                const style = badge.dataset.style;
                badge.textContent = getStyleName(style);
            });
            
            // 「誰でもOK」の更新
            for (let i = 1; i <= 3; i++) {
                const slotElement = document.querySelector(`.character-slot-item[data-commission="${slot}"][data-position="${i}"]`);
                if (slotElement.classList.contains('anything') && !commission.characters[i - 1]) {
                    const text = i18n.getText('messages.anyoneOk', 'commission');
                    slotElement.innerHTML = `<div class="character-slot-placeholder">${text}</div>`;
                }
            }
        }
    });
}

// ローカルストレージ
function saveToLocalStorage() {
    localStorage.setItem('commission_current_state', JSON.stringify(currentState));
    localStorage.setItem('commission_owned_characters', JSON.stringify([...ownedCharacters]));
    localStorage.setItem('commission_language', currentLanguage);
}

function loadFromLocalStorage() {
    const savedState = localStorage.getItem('commission_current_state');
    if (savedState) {
        const parsed = JSON.parse(savedState);
        currentState.commissions = parsed.commissions;
        renderAllCommissions();
    } else {
        // 初回ロード時は全スロットをグレーアウト
        document.querySelectorAll('.character-slot-item').forEach(slot => {
            slot.classList.add('disabled');
        });
    }
    
    const savedOwned = localStorage.getItem('commission_owned_characters');
    if (savedOwned) {
        ownedCharacters = new Set(JSON.parse(savedOwned));
    }
    
    // 言語設定はi18nシステムが管理するため削除
    // currentLanguageはi18n初期化時に設定済み
    
    updatePresetButtons();
    updatePresetThumbnails();
    updateAutoAssignButton();
}

// エラー表示
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 5000);
}
