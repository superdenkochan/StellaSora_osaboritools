// グローバル変数
let charactersData = null; // JSONからキャラクターデータ読み込み
const MAX_SUB_LEVEL = 6; // サブ素質の最大レベル
const MAX_CORE_POTENTIALS = 2; // コア素質の最大取得数


// プリセット名入力用の一時変数
let pendingPresetNumber = null;
let currentPresetNumber = null; // 現在読み込み中のプリセット番号
let isProgrammaticUpdate = false; // プログラム的な更新フラグ
let isReorderMode = false; // 並べ替えモード
let draggedCard = null; // ドラッグ中のカード

// デフォルトの素質順序を取得
function getDefaultPotentialOrder(slot) {
    const role = slot === 'main' ? 'main' : 'support';
    const def = POTENTIAL_DEFINITIONS[role];
    return [...def.core, ...def.sub];
}

// 素質データの定義（全キャラ共通）
const POTENTIAL_DEFINITIONS = {
    main: {
        core: ['mc1', 'mc2', 'mc3', 'mc4'],
        sub: ['ms1', 'ms2', 'ms3', 'ms4', 'ms5', 'ms6', 
              'ms7', 'ms8', 'ms9', 'ms10', 'ms11', 'ms12']
    },
    support: {
        core: ['sc1', 'sc2', 'sc3', 'sc4'],
        sub: ['ss1', 'ss2', 'ss3', 'ss4', 'ss5', 'ss6',
              'ss7', 'ss8', 'ss9', 'ss10', 'ss11', 'ss12']
    }
};

// サブ素質をクリックした時のステータス順序
// hideUnobtainedがOFFの時（通常）
const SUB_STATUS_ORDER_NORMAL = ['none', 'level1', 'level2', 'level6'];
// hideUnobtainedがONの時（noneをスキップ）
const SUB_STATUS_ORDER_FILTERED = ['level1', 'level2', 'level6'];

// 現在のhideUnobtained状態に応じた順序を取得
function getCurrentSubStatusOrder() {
    const hideUnobtained = document.getElementById('hideUnobtained')?.classList.contains('active') || false;
    return hideUnobtained ? SUB_STATUS_ORDER_FILTERED : SUB_STATUS_ORDER_NORMAL;
}

// サブ素質のラベルを取得（i18n対応）
function getSubStatusLabel(status) {
    return i18n.getText(`subStatus.${status}`, 'potential');
}

// 現在の状態を保持
const currentState = {
    presetName: '',  // 編集中のプリセット名（一時的）
    main: {
        characterId: null,
        corePotentials: {}, // { potentialId: { obtained: bool, acquired: bool } }
        subPotentials: {},   // { potentialId: { status: 'level6'|'level2'|'level1'|'none', count: number } }
        potentialOrder: null  // カスタム順序 (null = デフォルト順序を使用)
    },
    support1: {
        characterId: null,
        corePotentials: {},
        subPotentials: {},
        potentialOrder: null
    },
    support2: {
        characterId: null,
        corePotentials: {},
        subPotentials: {},
        potentialOrder: null
    }
};

// ヘルパー関数

// 定義に沿った画像パスの自動生成（言語対応）
function getPotentialImagePath(charId, potentialId, lang = null) {
    const targetLang = lang || (window.i18n ? i18n.getLanguage() : 'ja');
    const langSuffix = targetLang === 'ja' ? 'JP' : 'EN';
    return `images/potentials/${charId}_${potentialId}_${langSuffix}.png`;
}

// 共通画像パス（言語識別子なし）
function getPotentialImagePathCommon(charId, potentialId) {
    return `images/potentials/${charId}_${potentialId}.png`;
}

// 画像のsrcを設定（初期設定用 - カード生成時に使用）
function initPotentialImageSrc(img, charId, potentialId) {
    const currentLang = window.i18n ? i18n.getLanguage() : 'ja';
    const langPath = getPotentialImagePath(charId, potentialId, currentLang);
    const commonPath = getPotentialImagePathCommon(charId, potentialId);
    
    img.src = langPath;
    
    // エラー時のフォールバック処理を設定
    img.onerror = function() {
        if (this.src.includes('_JP.') || this.src.includes('_EN.')) {
            this.src = commonPath;
        } else {
            this.onerror = null;
            this.src = 'https://placehold.co/202x256?text=' + potentialId;
        }
    };
}

// 画像のsrcを更新（言語切り替え時に使用）
function updatePotentialImageSrc(img, charId, potentialId, targetLang) {
    const langPath = getPotentialImagePath(charId, potentialId, targetLang);
    const commonPath = getPotentialImagePathCommon(charId, potentialId);
    
    // 現在のsrcのファイル名部分を取得
    const currentSrc = img.src || '';
    const currentFilename = currentSrc.split('/').pop().split('?')[0];
    const newFilename = langPath.split('/').pop();
    const commonFilename = commonPath.split('/').pop();
    
    // 同じファイル名なら更新しない（ちらつき防止）
    if (currentFilename === newFilename) {
        return;
    }
    
    // 共通画像を表示中の場合、言語付き画像があるかチェック
    if (currentFilename === commonFilename) {
        const testImg = new Image();
        testImg.onload = () => { 
            img.src = langPath; 
        };
        testImg.onerror = () => {
            // 言語付き画像なし、共通画像を維持
        };
        testImg.src = langPath;
        return;
    }
    
    img.src = langPath;
    
    // エラー時のフォールバック処理
    img.onerror = function() {
        if (this.src.includes('_JP.') || this.src.includes('_EN.')) {
            this.src = commonPath;
        } else {
            this.onerror = null;
            this.src = 'https://placehold.co/202x256?text=' + potentialId;
        }
    };
}

// Descriptionの取得
function getDescription(character, potentialId) {
    const descData = character.descriptions[potentialId];
    return (descData ? descData[i18n.getLanguage()] : null) || i18n.getText('messages.noDescription', 'potential');
}

// 選択済みキャラクターIDの取得
function getSelectedCharacterIds() {
    return [
        currentState.main.characterId,
        currentState.support1.characterId,
        currentState.support2.characterId
    ].filter(id => id !== null);
}

// 初期化
document.addEventListener('DOMContentLoaded', async () => {
    // i18n初期化
    await initI18n('potential');
    
    // JSONデータの読み込み
    await loadCharacterData();
    
    // キャラクター選択ドロップダウンの生成
    populateCharacterSelects();
    
    // イベントリスナーの設定
    setupEventListeners();
    
    // ローカルストレージから現在の状態を復元
    loadCurrentState();
    
    // プリセットの初期化
    initializePresets();
    
    // 言語変更イベントをリッスン
    document.addEventListener('languageChanged', () => {
        updateLanguageDisplay();
    });
    
    // ラベル選択ボタンの初期状態を設定
    if (!currentPresetNumber) {
        document.querySelector(".label-select-btn[data-label=\"none\"]")?.classList.add("active");
    }
});

// データ読み込み
async function loadCharacterData() {
    try {
        const response = await fetch('data/potential_desc.json');
        if (!response.ok) {
            throw new Error('データの読み込みに失敗しました');
        }
        charactersData = await response.json();
        console.log('キャラクターデータ読み込み完了:', charactersData);
    } catch (error) {
        console.error('データ読み込みエラー:', error);
        showError(i18n.getText('messages.dataLoadError', 'potential'));
    }
}

// キャラクター選択モーダルの生成
function populateCharacterSelects() {
    // 各スロット用のモーダルを生成
    ['main', 'support1', 'support2'].forEach(slot => {
        const modal = document.getElementById(`character-modal-${slot}`);
        const grid = modal.querySelector('.character-modal-grid');
        const button = document.querySelector(`.character-select-button[data-slot="${slot}"]`);
        const closeBtn = modal.querySelector('.character-modal-close');
        const overlay = modal.querySelector('.character-modal-overlay');
        
        // グリッドを初期化
        grid.innerHTML = '';
        
        // 選択解除オプション
        const clearOption = document.createElement('div');
        clearOption.className = 'character-option';
        clearOption.dataset.value = '';
        clearOption.dataset.clearOption = 'true';
        clearOption.innerHTML = `
            <div class="clear-option-text" style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 14px; font-weight: bold; color: #252a42;">
                ${i18n.getText('labels.clear', 'potential')}
            </div>
        `;
        clearOption.addEventListener('click', () => {
            handleCharacterSelectFromDropdown(slot, '');
            closeAllModals();
        });
        grid.appendChild(clearOption);
        
        // キャラクターオプション
        charactersData.characters.forEach(char => {
            const option = document.createElement('div');
            option.className = 'character-option';
            option.dataset.value = char.id;
            
            const icon = document.createElement('img');
            icon.className = 'character-option-icon';
            icon.src = char.icon;
            icon.alt = char.name[i18n.getLanguage()];
            
            // 名前のツールチップ
            const nameTooltip = document.createElement('div');
            nameTooltip.className = 'character-option-name';
            nameTooltip.textContent = char.name[i18n.getLanguage()];
            
            option.appendChild(icon);
            option.appendChild(nameTooltip);
            
            option.addEventListener('click', () => {
                if (!option.classList.contains('disabled')) {
                    handleCharacterSelectFromDropdown(slot, char.id);
                    closeAllModals();
                }
            });
            
            grid.appendChild(option);
        });
        
        // クリックでモーダルを開く
        button.addEventListener('click', (e) => {
            e.stopPropagation();
            closeAllModals();
            updateModalAvailability(slot);
            modal.classList.add('open');
        });
        
        // 閉じるボタン
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('open');
        });
        
        // オーバーレイクリックで閉じる
        overlay.addEventListener('click', () => {
            modal.classList.remove('open');
        });
    });
}

// モーダルの選択可能状態を更新
function updateModalAvailability(currentSlot) {
    const selectedIds = getSelectedCharacterIds();
    const modal = document.getElementById(`character-modal-${currentSlot}`);
    const grid = modal.querySelector('.character-modal-grid');
    
    grid.querySelectorAll('.character-option').forEach(option => {
        const charId = option.dataset.value;
        if (charId && selectedIds.includes(charId)) {
            option.classList.add('disabled');
        } else {
            option.classList.remove('disabled');
        }
    });
}

// 全てのモーダルを閉じる
function closeAllModals() {
    document.querySelectorAll('.character-modal').forEach(modal => {
        modal.classList.remove('open');
    });
}

// イベントリスナーの設定
function setupEventListeners() {
    // 取得しない素質を非表示（トグルボタン）
    const hideUnobtainedBtn = document.getElementById('hideUnobtained');
    hideUnobtainedBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        handleHideUnobtained();
    });
    
    // 並べ替えモード（トグルボタン）
    const reorderModeBtn = document.getElementById('reorderMode');
    reorderModeBtn.addEventListener('click', function() {
        this.classList.toggle('active');
        handleReorderMode();
    });
    
    // カウントリセット
    document.getElementById('resetCount').addEventListener('click', handleResetCount);
    
    // 並び順リセット
    document.getElementById('resetOrder').addEventListener('click', handleResetOrder);
    
    // 初期化
    document.getElementById('resetAll').addEventListener('click', handleResetAll);
    
    // スクリーンショット
    document.getElementById('screenshot').addEventListener('click', handleScreenshot);
    
    // 使い方モーダル
    document.getElementById('showUsage').addEventListener('click', () => openModal('usageModal'));
    
    // 変更履歴モーダル
    document.getElementById('showChangelog').addEventListener('click', () => openModal('changelogModal'));
    
    // プリセット保存
    document.querySelectorAll('.btn-save').forEach(btn => {
        btn.addEventListener('click', function(e) {
            const presetNum = parseInt(this.dataset.preset);
            handleSavePreset(presetNum);
        });
    });
    
    // プリセット読み込み
    document.querySelectorAll('.btn-load').forEach(btn => {
        btn.addEventListener('click', function(e) {
            if (this.disabled) return;
            const presetNum = parseInt(this.dataset.preset);
            handleLoadPreset(presetNum);
        });
    });
    
    // モーダル閉じるボタン
    document.querySelectorAll('.modal-close').forEach(btn => {
        btn.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal').id);
        });
    });
    
    // モーダルオーバーレイクリックで閉じる
    document.querySelectorAll('.modal-overlay').forEach(overlay => {
        overlay.addEventListener('click', (e) => {
            closeModal(e.target.closest('.modal').id);
        });
    });
    
    // プリセット名のインライン編集
    const presetNameInput = document.getElementById('preset-name-input-inline');
    const editBtn = document.getElementById('preset-name-edit-btn');
    
    // textarea用の自動高さ調整関数
    function adjustTextareaHeight() {
        presetNameInput.style.height = 'auto';
        presetNameInput.style.height = presetNameInput.scrollHeight + 'px';
    }
    
    // 編集モード開始関数
    function startEditingPresetName() {
        presetNameInput.readOnly = false;
        presetNameInput.style.borderColor = '#252a42';
        presetNameInput.style.background = 'white';
        presetNameInput.focus();
        presetNameInput.select();
        adjustTextareaHeight();
        // 編集中はボタンをグレーアウト
        editBtn.disabled = true;
        editBtn.style.opacity = '0.5';
        editBtn.style.cursor = 'not-allowed';
    }
    
    editBtn.addEventListener('click', () => {
        if (presetNameInput.readOnly) {
            startEditingPresetName();
        }
    });
    
    // input時に高さを自動調整、currentState.presetNameに保存
    presetNameInput.addEventListener('input', () => {
        // プログラム的な更新の場合はスキップ
        if (isProgrammaticUpdate) {
            return;
        }
        
        adjustTextareaHeight();
        
        // 編集中の値をcurrentState.presetNameに保存
        currentState.presetName = presetNameInput.value.trim();
        
        // リロード巻き戻り対策：currentStateをlocalStorageに保存
        saveCurrentState();
        
        // 読み込みボタンの状態を更新（現在と比較、変更があれば有効化する）
        updateLoadButtonsState();
    });
    
    presetNameInput.addEventListener('blur', () => {
        // フォーカスアウト時に確定
        if (!presetNameInput.readOnly) {
            savePresetNameInline();
        }
    });
    
    // textareaでのEnterキー制御
    presetNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            presetNameInput.blur(); // フォーカスアウトで自動保存
        }
    });
    
    // ラベル選択ボタン
    document.querySelectorAll('.label-select-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.preventDefault();
            const selectedLabel = this.dataset.label;
            
            // 全てのボタンから active クラスを削除
            document.querySelectorAll('.label-select-btn').forEach(b => {
                b.classList.remove('active');
            });
            
            // クリックされたボタンに active クラスを追加
            this.classList.add('active');
            
            // 読み込みボタンの状態を更新（変更があることを反映）
            updateLoadButtonsState();
        });
    });
}

// プリセット名をインラインで保存
function savePresetNameInline() {
    const presetNameInput = document.getElementById('preset-name-input-inline');
    const editBtn = document.getElementById('preset-name-edit-btn');
    let presetName = presetNameInput.value.trim();
    
    console.log('プリセット名編集確定:', { 
        currentPresetNumber, 
        inputValue: presetNameInput.value,
        trimmedValue: presetName 
    });
    
    // 空欄の場合はプレースホルダー
    if (presetName === '') {
        presetNameInput.placeholder = i18n.getText('labels.presetNamePlaceholder', 'potential');
    }
    
    // textareaの高さを調整
    presetNameInput.style.height = 'auto';
    presetNameInput.style.height = presetNameInput.scrollHeight + 'px';
    
    // 編集モードを終了（プリセットへの保存はしない）
    presetNameInput.readOnly = true;
    presetNameInput.style.borderColor = 'transparent';
    presetNameInput.style.background = 'transparent';
    
    // ボタンを元に戻す
    editBtn.disabled = false;
    editBtn.style.opacity = '1';
    editBtn.style.cursor = 'pointer';
    
    // 読み込みボタンの状態を更新（変更があれば有効化）
    updateLoadButtonsState();
}

// キャラクター選択時の処理
function handleCharacterSelectFromDropdown(slot, charId) {
    if (!charId) {
        // 選択解除
        currentState[slot].characterId = null;
        currentState[slot].potentialOrder = null;
        document.getElementById(`${slot}-potentials`).innerHTML = '';
        updateCharacterSelectButton(slot, null);
        updateAllModals();
        saveCurrentState();
        return;
    }
    
    const character = charactersData.characters.find(c => c.id === charId);
    if (!character) return;
    
    // 状態を更新
    currentState[slot].characterId = charId;
    currentState[slot].corePotentials = {};
    currentState[slot].subPotentials = {};
    currentState[slot].potentialOrder = null;
    
    // ボタン表示を更新
    updateCharacterSelectButton(slot, character);
    
    // 素質を表示
    displayPotentials(slot, character);
    
    // 他のドロップダウンを更新
    updateAllModals();
    
    // 状態を保存
    saveCurrentState();
}

// キャラクター選択ボタンの表示を更新
function updateCharacterSelectButton(slot, character) {
    const button = document.querySelector(`.character-select-button[data-slot="${slot}"]`);
    
    if (character) {
        button.innerHTML = `
            <img src="${character.icon}" alt="${character.name[i18n.getLanguage()]}" class="character-select-icon">
        `;
    } else {
        button.innerHTML = `<span class="select-text">${i18n.getText('labels.selectCharacter', 'potential')}</span>`;
    }
}

// すべてのモーダルの選択可能状態を更新
function updateAllModals() {
    ['main', 'support1', 'support2'].forEach(slot => {
        updateModalAvailability(slot);
    });
}

// 素質の表示
function displayPotentials(slot, character) {
    const container = document.getElementById(`${slot}-potentials`);
    container.innerHTML = '';
    
    // 主力か支援をチェックして出し分け
    const role = slot === 'main' ? 'main' : 'support';
    const potentialDef = POTENTIAL_DEFINITIONS[role];
    
    // カスタム順序またはデフォルト順序を使用
    const order = currentState[slot].potentialOrder || getDefaultPotentialOrder(slot);
    
    console.log(`[表示] ${slot}のpotentialOrder:`, currentState[slot].potentialOrder);
    console.log(`[表示] ${slot}で使用する順序:`, order);
    
    // 単一のグリッドコンテナを作成（コアとサブを混在表示）
    const grid = document.createElement('div');
    grid.className = 'potentials-grid';
    
    // 順序に従ってカードを作成
    order.forEach(potentialId => {
        const type = potentialDef.core.includes(potentialId) ? 'core' : 'sub';
        const card = createPotentialCard(character, potentialId, slot, type);
        grid.appendChild(card);
    });
    
    container.appendChild(grid);
    
    // フィルターを適用
    applyHideUnobtainedFilter();
    
    // 並べ替えモードが有効な場合はドラッグ&ドロップを有効化
    if (isReorderMode) {
        enableDragAndDrop();
    }
}

// 素質セクションの作成
function createPotentialSection(title, potentialIds, character, slot, type) {
    const section = document.createElement('div');
    section.className = 'potential-group';
    
    // タイトルは非表示
    const titleElem = document.createElement('div');
    titleElem.className = 'potential-group-title';
    titleElem.textContent = title;
    section.appendChild(titleElem);
    
    const grid = document.createElement('div');
    grid.className = 'potentials-grid';
    
    potentialIds.forEach(potentialId => {
        const card = createPotentialCard(character, potentialId, slot, type);
        grid.appendChild(card);
    });
    
    section.appendChild(grid);
    return section;
}

// 素質カードの作成
function createPotentialCard(character, potentialId, slot, type) {
    const card = document.createElement('div');
    card.className = 'potential-card';
    card.dataset.slot = slot;
    card.dataset.potentialId = potentialId;
    card.dataset.type = type;
    
    // 画像ラッパー
    const imageWrapper = document.createElement('div');
    imageWrapper.className = 'potential-image-wrapper';
    
    // 初期状態の設定
    if (type === 'core') {
        // コア素質の初期状態：取得しないを指定
        if (!currentState[slot].corePotentials[potentialId]) {
            currentState[slot].corePotentials[potentialId] = {
                obtained: false,
                acquired: false
            };
        }
        const state = currentState[slot].corePotentials[potentialId];
        if (!state.obtained) {
            imageWrapper.classList.add('grayed-out-unobtained');
        }
        if (state.acquired) {
            imageWrapper.classList.add('obtained');
        }
    } else {
        // サブ素質の初期状態：取得しない＆レベル0
        if (!currentState[slot].subPotentials[potentialId]) {
            currentState[slot].subPotentials[potentialId] = {
                status: 'none',
                count: 0
            };
        }
        const state = currentState[slot].subPotentials[potentialId];
        
        // 現在レベルに応じたグレーアウトの条件分岐
        // 取得しない：グレーアウト＋グレースケール
        // レベル1～6ラベルで現在レベルが1以上：グレーアウト
        // レベル1～6ラベルで現在レベルが0：元画像そのまま
        if (state.status === 'none') {
            imageWrapper.classList.add('grayed-out-unobtained');
        } else if (state.count > 0) {
            imageWrapper.classList.add('grayed-out');
        }
        
        // レベル6の場合サムズアップを添える（おまけ）
        if (state.status === 'level6') {
            const thumbsUp = document.createElement('div');
            thumbsUp.className = 'thumbs-up';
            const thumbImg = document.createElement('img');
            thumbImg.src = 'images/others/thumbs_up.png';
            thumbImg.alt = 'Level 6';
            thumbsUp.appendChild(thumbImg);
            imageWrapper.appendChild(thumbsUp);
        }
        
        // 左上にカウント表示
        if (state.count > 0) {
            const countElem = document.createElement('div');
            countElem.className = 'potential-count';
            countElem.textContent = state.count;
            imageWrapper.appendChild(countElem);
        }
    }
    
    // 画像（＋保険のプレースホルダー）
    const img = document.createElement('img');
    img.className = 'potential-image';
    img.alt = potentialId;
    initPotentialImageSrc(img, character.id, potentialId);
    
    // 画像クリックイベント
    img.addEventListener('click', () => handlePotentialImageClick(slot, potentialId, type));
    
    imageWrapper.appendChild(img);
    
    card.appendChild(imageWrapper);
    
    // ツールチップ（説明文）
    const tooltip = document.createElement('div');
    tooltip.className = 'potential-tooltip';
    tooltip.innerHTML = getDescription(character, potentialId);
    card.appendChild(tooltip);
    
    // ツールチップの表示制御
    imageWrapper.addEventListener('mouseenter', () => {
        // 要素の位置を取得
        const rect = imageWrapper.getBoundingClientRect();
        const tooltipHeight = tooltip.offsetHeight || 150; // ツールチップの高さ
        const tooltipWidth = 245; // ツールチップの幅
        const headerHeight = 50;
        const margin = -5; // 中心に寄せるかどうか
        const screenPadding = 20; // 画面端からの余白
        
        // 画面上部の余白
        const spaceAbove = rect.top - headerHeight;
        const spaceBelow = window.innerHeight - rect.bottom;
        
        // ツールチップの左右位置を計算
        let left = rect.left + (rect.width / 2);
        
        // 左右の画面端チェック（はみ出し防止）
        const halfTooltipWidth = tooltipWidth / 2;
        if (left + halfTooltipWidth > window.innerWidth - screenPadding) {
            // 右端からはみ出る場合：右端から余白を取った位置に調整
            left = window.innerWidth - screenPadding - halfTooltipWidth;
        } else if (left - halfTooltipWidth < screenPadding) {
            // 左端からはみ出る場合：左端から余白を取った位置に調整
            left = screenPadding + halfTooltipWidth;
        }
        
        // 上下どちらに表示するか判定
        if (spaceAbove >= tooltipHeight + margin) {
            // 上
            tooltip.classList.remove('show-below');
            tooltip.style.left = left + 'px';
            tooltip.style.top = (rect.top - tooltipHeight - margin) + 'px';
            tooltip.style.bottom = 'auto';
            tooltip.style.transform = 'translateX(-50%)';
        } else if (spaceBelow >= tooltipHeight + margin) {
            // 下
            tooltip.classList.add('show-below');
            tooltip.style.left = left + 'px';
            tooltip.style.top = (rect.bottom + margin) + 'px';
            tooltip.style.bottom = 'auto';
            tooltip.style.transform = 'translateX(-50%)';
        } else {
            // どちらも厳しい場合は広い方
            if (spaceBelow > spaceAbove) {
                tooltip.classList.add('show-below');
                tooltip.style.left = left + 'px';
                tooltip.style.top = (rect.bottom + margin) + 'px';
                tooltip.style.bottom = 'auto';
                tooltip.style.transform = 'translateX(-50%)';
            } else {
                tooltip.classList.remove('show-below');
                tooltip.style.left = left + 'px';
                tooltip.style.top = (headerHeight + margin) + 'px';
                tooltip.style.bottom = 'auto';
                tooltip.style.transform = 'translateX(-50%)';
            }
        }
        
        tooltip.style.opacity = '1';
    });
    imageWrapper.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
    });
    
    // ステータスボタン
    const statusDiv = document.createElement('div');
    statusDiv.className = 'potential-status';
    
    if (type === 'core') {
        // コア素質：トグル
        const toggleBtn = document.createElement('button');
        toggleBtn.className = 'status-btn';
        const state = currentState[slot].corePotentials[potentialId];
        toggleBtn.textContent = state.obtained 
            ? i18n.getText('coreToggle.obtain', 'potential') 
            : i18n.getText('coreToggle.notObtain', 'potential');
        toggleBtn.classList.add(state.obtained ? 'active' : 'inactive');
        toggleBtn.addEventListener('click', () => handleCoreToggle(slot, potentialId));
        statusDiv.appendChild(toggleBtn);
    } else {
        // サブ素質：クリックで切り替え
        const state = currentState[slot].subPotentials[potentialId];
        const btn = document.createElement('button');
        btn.className = 'sub-status-btn';
        btn.classList.add(state.status);
        btn.textContent = getSubStatusLabel(state.status);
        btn.addEventListener('click', () => handleSubStatusClick(slot, potentialId));
        statusDiv.appendChild(btn);
    }
    
    card.appendChild(statusDiv);
    
    return card;
}

// コア素質のトグル処理
function handleCoreToggle(slot, potentialId) {
    // 「取得しない素質を非表示」が有効な場合はクリック無効にする
    const hideUnobtained = document.getElementById('hideUnobtained')?.classList.contains('active');
    if (hideUnobtained) {
        return;
    }
    
    const state = currentState[slot].corePotentials[potentialId];
    const newObtained = !state.obtained;
    
    // 取得する・取得しないの変更
    if (!newObtained) {
        state.obtained = false;
        state.acquired = false;
        refreshPotentialDisplay(slot);
        saveCurrentState();
        return;
    }
    
    // コア2つまでの制限チェックとエラー処理
    const obtainedCount = Object.values(currentState[slot].corePotentials)
        .filter(s => s.obtained).length;
    
    if (obtainedCount >= MAX_CORE_POTENTIALS) {
        showError(i18n.getText('messages.coreLimitError', 'potential'));
        return;
    }
    
    state.obtained = true;
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// 素質画像クリック処理
function handlePotentialImageClick(slot, potentialId, type) {
    if (type === 'core') {
        // コア素質：取得する状態の時のみチェックマーク切り替え
        const state = currentState[slot].corePotentials[potentialId];
        if (!state.obtained) return;
        
        state.acquired = !state.acquired;
    } else {
        // サブ素質：レベル1以上の時のみカウント増加
        const state = currentState[slot].subPotentials[potentialId];
        if (state.status === 'none') return;
        
        state.count = (state.count + 1) % (MAX_SUB_LEVEL + 1);
    }
    
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// サブ素質のステータスクリック処理
function handleSubStatusClick(slot, potentialId) {
    const state = currentState[slot].subPotentials[potentialId];
    const SUB_STATUS_ORDER = getCurrentSubStatusOrder();
    const currentIndex = SUB_STATUS_ORDER.indexOf(state.status);
    const nextIndex = (currentIndex + 1) % SUB_STATUS_ORDER.length;
    state.status = SUB_STATUS_ORDER[nextIndex];
    state.count = 0; // ステータス変更時にカウントをリセット
    
    refreshPotentialDisplay(slot);
    saveCurrentState();
}

// 素質表示の更新（カードを再生成せず状態のみ更新）
function refreshPotentialDisplay(slot) {
    const charId = currentState[slot].characterId;
    if (!charId) return;
    
    const character = charactersData.characters.find(c => c.id === charId);
    if (!character) return;
    
    // 既存のカードを取得
    const container = document.getElementById(`${slot}-potentials`);
    const existingCards = container.querySelectorAll('.potential-card');
    
    // カードが存在しない場合のみ再生成
    if (existingCards.length === 0) {
        displayPotentials(slot, character);
        applyHideUnobtainedFilter();
        return;
    }
    
    // 既存のカードの状態を更新
    existingCards.forEach(card => {
        const potentialId = card.dataset.potentialId;
        const type = card.dataset.type;
        const imageWrapper = card.querySelector('.potential-image-wrapper');
        
        if (!imageWrapper) return;
        
        if (type === 'core') {
            // コア素質の状態更新
            const state = currentState[slot].corePotentials[potentialId];
            if (!state) return;
            
            // グレーアウト状態の更新
            imageWrapper.classList.toggle('grayed-out-unobtained', !state.obtained);
            imageWrapper.classList.toggle('obtained', state.acquired);
            
            // ボタンの更新
            const btn = card.querySelector('.status-btn');
            if (btn) {
                btn.textContent = state.obtained 
                    ? i18n.getText('coreToggle.obtain', 'potential') 
                    : i18n.getText('coreToggle.notObtain', 'potential');
                btn.classList.remove('active', 'inactive');
                btn.classList.add(state.obtained ? 'active' : 'inactive');
            }
            
        } else {
            // サブ素質の状態更新
            const state = currentState[slot].subPotentials[potentialId];
            if (!state) return;
            
            // グレーアウト状態の更新
            imageWrapper.classList.remove('grayed-out', 'grayed-out-unobtained');
            if (state.status === 'none') {
                imageWrapper.classList.add('grayed-out-unobtained');
            } else if (state.count > 0) {
                imageWrapper.classList.add('grayed-out');
            }
            
            // サムズアップの更新
            let thumbsUp = imageWrapper.querySelector('.thumbs-up');
            if (state.status === 'level6') {
                if (!thumbsUp) {
                    thumbsUp = document.createElement('div');
                    thumbsUp.className = 'thumbs-up';
                    const thumbImg = document.createElement('img');
                    thumbImg.src = 'images/others/thumbs_up.png';
                    thumbImg.alt = 'Level 6';
                    thumbsUp.appendChild(thumbImg);
                    imageWrapper.appendChild(thumbsUp);
                }
            } else if (thumbsUp) {
                thumbsUp.remove();
            }
            
            // カウント表示の更新
            let countElem = imageWrapper.querySelector('.potential-count');
            if (state.count > 0) {
                if (!countElem) {
                    countElem = document.createElement('div');
                    countElem.className = 'potential-count';
                    imageWrapper.appendChild(countElem);
                }
                countElem.textContent = state.count;
            } else if (countElem) {
                countElem.remove();
            }
            
            // ステータスボタンの更新（テキストとクラス両方）
            const btn = card.querySelector('.sub-status-btn');
            if (btn) {
                btn.textContent = getSubStatusLabel(state.status);
                // クラスを更新（none, level1, level2, level6）
                btn.classList.remove('none', 'level1', 'level2', 'level6');
                btn.classList.add(state.status);
            }
        }
    });
    
    // チェック状態を再適用
    applyHideUnobtainedFilter();
}

// 取得しない素質を非表示
function applyHideUnobtainedFilter() {
    const hideUnobtained = document.getElementById('hideUnobtained').classList.contains('active');
    
    document.querySelectorAll('.potential-card').forEach(card => {
        const slot = card.dataset.slot;
        const potentialId = card.dataset.potentialId;
        const type = card.dataset.type;
        
        let shouldHide = false;
        
        if (type === 'core') {
            const state = currentState[slot].corePotentials[potentialId];
            shouldHide = state && !state.obtained;
        } else {
            const state = currentState[slot].subPotentials[potentialId];
            shouldHide = state && state.status === 'none';
        }
        
        if (hideUnobtained && shouldHide) {
            card.classList.add('hidden');
        } else {
            card.classList.remove('hidden');
        }
    });
}

function handleHideUnobtained(e) {
    applyHideUnobtainedFilter();
    
    // コア素質ボタンの無効化
    const hideUnobtained = document.getElementById('hideUnobtained').classList.contains('active');
    if (hideUnobtained) {
        document.body.classList.add('hide-unobtained-active');
    } else {
        document.body.classList.remove('hide-unobtained-active');
    }
    
    saveCurrentState();
}

// カウントリセット
function handleResetCount() {
    // コア素質を全てfalseに
    Object.values(currentState).forEach(slotState => {
        Object.values(slotState.corePotentials).forEach(state => {
            state.acquired = false;
        });
    });
    
    // サブ素質のカウントをゼロに
    Object.values(currentState).forEach(slotState => {
        Object.values(slotState.subPotentials).forEach(state => {
            state.count = 0;
        });
    });
    
    // 表示を更新
    ['main', 'support1', 'support2'].forEach(slot => {
        refreshPotentialDisplay(slot);
    });
    
    saveCurrentState();
}

// 初期化
function handleResetAll() {
    if (!confirm(i18n.getText('messages.confirmReset', 'potential'))) {
        return;
    }
    
    // 状態をクリア
    currentState.presetName = '';
    ['main', 'support1', 'support2'].forEach(slot => {
        currentState[slot].characterId = null;
        currentState[slot].corePotentials = {};
        currentState[slot].subPotentials = {};
        currentState[slot].potentialOrder = null;
        
        // キャラクター選択をリセット
        updateCharacterSelectButton(slot, null);
        
        // 素質表示をクリア
        const container = document.getElementById(`${slot}-potentials`);
        if (container) {
            container.innerHTML = '';
        }
    });
    
    // チェックボックスをリセット
    document.getElementById('hideUnobtained').classList.remove('active');
    
    // 現在のプリセット番号をリセット
    currentPresetNumber = null;
    
    // プリセット名を空に
    displayPresetName('');
    
    // ラベル選択をリセット
    document.querySelectorAll(".label-select-btn").forEach(btn => {
        btn.classList.remove("active");
    });
    document.querySelector(".label-select-btn[data-label=\"none\"]")?.classList.add("active");
    
    // ドロップダウンを更新
    updateAllModals();
    
    // 状態を保存
    saveCurrentState();
}

// 並び順リセット
function handleResetOrder() {
    if (!confirm(i18n.getText('messages.confirmResetOrder', 'potential'))) {
        return;
    }
    
    // 各スロットの並び順をnullに（デフォルトに戻す）
    ['main', 'support1', 'support2'].forEach(slot => {
        currentState[slot].potentialOrder = null;
        
        // キャラクターが選択されている場合は再表示
        if (currentState[slot].characterId) {
            const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
            if (character) {
                displayPotentials(slot, character);
            }
        }
    });
    
    // 状態を保存
    saveCurrentState();
}

// 並べ替えモードのトグル
function handleReorderMode() {
    isReorderMode = !isReorderMode;
    
    if (isReorderMode) {
        document.body.classList.add('reorder-mode-active');
        enableDragAndDrop();
    } else {
        document.body.classList.remove('reorder-mode-active');
        disableDragAndDrop();
    }
}

// ドラッグ&ドロップを有効化
function enableDragAndDrop() {
    document.querySelectorAll('.potential-card').forEach(card => {
        card.draggable = true;
        card.addEventListener('dragstart', handleDragStart);
        card.addEventListener('dragover', handleDragOver);
        card.addEventListener('drop', handleDrop);
        card.addEventListener('dragend', handleDragEnd);
        card.addEventListener('dragenter', handleDragEnter);
        card.addEventListener('dragleave', handleDragLeave);
    });
}

// ドラッグ&ドロップを無効化
function disableDragAndDrop() {
    document.querySelectorAll('.potential-card').forEach(card => {
        card.draggable = false;
        card.removeEventListener('dragstart', handleDragStart);
        card.removeEventListener('dragover', handleDragOver);
        card.removeEventListener('drop', handleDrop);
        card.removeEventListener('dragend', handleDragEnd);
        card.removeEventListener('dragenter', handleDragEnter);
        card.removeEventListener('dragleave', handleDragLeave);
        card.classList.remove('dragging', 'drop-target-before', 'drop-target-after');
    });
}

// ドラッグ開始
function handleDragStart(e) {
    draggedCard = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
    
    // カードの中心をマウスカーソルに合わせる
    // より確実な方法：透明なキャンバスを作成して中央にオフセット
    const rect = this.getBoundingClientRect();
    const offsetX = rect.width / 2;
    const offsetY = rect.height / 2;
    
    // ブラウザによってsetDragImageの挙動が異なる場合があるため、
    // 空の透明画像を使用して確実に中央配置を実現
    try {
        // まずカード自体を使用
        e.dataTransfer.setDragImage(this, offsetX, offsetY);
        
        // カード要素を一時的に複製してドラッグイメージとして使用
        // これにより、より正確な中央配置が可能
        setTimeout(() => {
            this.style.transformOrigin = 'center';
        }, 0);
    } catch (err) {
        // setDragImageに失敗した場合はデフォルトの挙動
        console.warn('setDragImage failed:', err);
    }
}

// ドラッグオーバー
function handleDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    e.dataTransfer.dropEffect = 'move';
    return false;
}

// ドラッグ進入
function handleDragEnter(e) {
    if (!draggedCard || this === draggedCard) return;
    
    // 同じスロット内かチェック
    const draggedSlot = draggedCard.dataset.slot;
    const targetSlot = this.dataset.slot;
    
    if (draggedSlot !== targetSlot) return;
    
    // カード内での相対位置を計算
    const rect = this.getBoundingClientRect();
    const mouseX = e.clientX;
    const cardCenterX = rect.left + rect.width / 2;
    
    // マウスがカードの中心より左なら左側に、右なら右側に挿入
    if (mouseX < cardCenterX) {
        this.classList.add('drop-target-before');
        this.classList.remove('drop-target-after');
    } else {
        this.classList.add('drop-target-after');
        this.classList.remove('drop-target-before');
    }
}

// ドラッグ離脱
function handleDragLeave(e) {
    // relatedTargetをチェック：カード内の要素に移動する場合は何もしない
    const relatedTarget = e.relatedTarget;
    
    // カード外に出た場合のみクラスを削除
    if (!this.contains(relatedTarget)) {
        this.classList.remove('drop-target-before', 'drop-target-after');
    }
}

// ドロップ
function handleDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }
    
    if (!draggedCard || this === draggedCard) return;
    
    // 同じスロット内かチェック
    const draggedSlot = draggedCard.dataset.slot;
    const targetSlot = this.dataset.slot;
    
    if (draggedSlot !== targetSlot) return;
    
    // カード内での相対位置を計算
    const rect = this.getBoundingClientRect();
    const mouseX = e.clientX;
    const cardCenterX = rect.left + rect.width / 2;
    
    // DOM要素を移動
    if (mouseX < cardCenterX) {
        // 左側に挿入
        this.parentNode.insertBefore(draggedCard, this);
    } else {
        // 右側に挿入
        this.parentNode.insertBefore(draggedCard, this.nextSibling);
    }
    
    // 新しい順序を保存
    updatePotentialOrder(draggedSlot);
    
    return false;
}

// ドラッグ終了
function handleDragEnd(e) {
    this.classList.remove('dragging');
    
    // すべてのドロップターゲット表示をクリア
    document.querySelectorAll('.potential-card').forEach(card => {
        card.classList.remove('drop-target-before', 'drop-target-after');
    });
    
    draggedCard = null;
}

// 素質の順序を更新してLocalStorageに保存
function updatePotentialOrder(slot) {
    const container = document.getElementById(`${slot}-potentials`);
    const cards = container.querySelectorAll('.potential-card');
    const newOrder = Array.from(cards).map(card => card.dataset.potentialId);
    
    console.log(`[並び替え] ${slot}の新しい順序:`, newOrder);
    
    currentState[slot].potentialOrder = newOrder;
    console.log(`[並び替え] currentState[${slot}].potentialOrder:`, currentState[slot].potentialOrder);
    
    saveCurrentState();
}

// プリセット管理
function initializePresets() {
    for (let i = 1; i <= 12; i++) {
        const preset = loadPreset(i);
        if (preset) {
            updatePresetDisplay(i, preset);
        }
    }
    // 削除ボタンを初期化
    updatePresetDeleteButtons();
    // 読み込みボタンの状態を初期化
    updateLoadButtonsState();
}

function handleSavePreset(presetNum) {
    // 既存プリセットの確認
    const existingPreset = localStorage.getItem(`preset_${presetNum}`);
    if (existingPreset) {
        if (!confirm(i18n.getText('messages.confirmOverwrite', 'potential').replace('{number}', presetNum))) {
            return;
        }
    }
    
    // カウントをリセットした状態でコピー（素質の現在レベルは保存しない）
    const stateToSave = JSON.parse(JSON.stringify(currentState));
    ['main', 'support1', 'support2'].forEach(slot => {
        Object.values(stateToSave[slot].corePotentials).forEach(state => {
            state.acquired = false;
        });
        Object.values(stateToSave[slot].subPotentials).forEach(state => {
            state.count = 0;
        });
    });
    
    console.log(`[プリセット保存] プリセット${presetNum}に保存する順序:`, {
        main: stateToSave.main.potentialOrder,
        support1: stateToSave.support1.potentialOrder,
        support2: stateToSave.support2.potentialOrder
    });
    
    // プリセット名を保存（currentState.presetNameから取得）
    let presetName = currentState.presetName || '';
    
    // 空欄の場合は空文字列として保存（未設定にする）
    const placeholderText = i18n.getText('labels.presetNamePlaceholder', 'potential');
    if (presetName === '' || presetName === placeholderText) {
        presetName = '';
    }
    
    // 保存
    localStorage.setItem(`preset_${presetNum}`, JSON.stringify(stateToSave));
    localStorage.setItem(`preset_${presetNum}_name`, presetName);
    
    // 現在のラベル選択を保存
    const activeLabel = document.querySelector(".label-select-btn.active");
    const currentLabel = activeLabel ? activeLabel.dataset.label : "none";
    localStorage.setItem(`preset_${presetNum}_label`, currentLabel);
    console.log(`プリセット${presetNum}を保存しました（名前: "${presetName}"）`);
    updatePresetDisplay(presetNum, stateToSave);
    
    // 中身があるプリセットは読み込みボタンを有効化
    const loadBtn = document.querySelector(`.btn-load[data-preset="${presetNum}"]`);
    if (loadBtn) {
        loadBtn.disabled = false;
    }
    
    // 現在のプリセット番号を設定
    currentPresetNumber = presetNum;
    console.log('currentPresetNumberを設定:', currentPresetNumber);
    
    // プリセット削除ボタンを更新
    updatePresetDeleteButtons();
    // 読み込みボタンの状態を更新（現在読み込み中のプリセットを無効化）
    updateLoadButtonsState();
}

function handleLoadPreset(presetNum) {
    const preset = loadPreset(presetNum);
    if (!preset) return;
    
    // 現在の状態が初期状態でない場合、または変更がある場合は確認
    const isInitialState = !currentState.main.characterId && 
                          !currentState.support1.characterId && 
                          !currentState.support2.characterId;
    
    // 変更があるかチェック
    const hasChanges = checkPresetChanges(presetNum);
    
    if (!isInitialState && hasChanges) {
        if (!confirm(i18n.getText('messages.confirmPresetLoad', 'potential'))) {
            return;
        }
    }
    
    // プリセットを読み込み
    currentState.presetName = '';
    Object.assign(currentState, JSON.parse(JSON.stringify(preset)));
    
    console.log(`[プリセット読込] プリセット${presetNum}から読み込んだ順序:`, {
        main: currentState.main.potentialOrder,
        support1: currentState.support1.potentialOrder,
        support2: currentState.support2.potentialOrder
    });
    
    // UIを更新
    ['main', 'support1', 'support2'].forEach(slot => {
        if (currentState[slot].characterId) {
            const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
            if (character) {
                updateCharacterSelectButton(slot, character);
                displayPotentials(slot, character);
            }
        } else {
            updateCharacterSelectButton(slot, null);
            document.getElementById(`${slot}-potentials`).innerHTML = '';
        }
    });
    
    // ドロップダウンを更新
    updateAllModals();
    
    // フィルターを適用
    applyHideUnobtainedFilter();
    
    // プリセット名を表示
    const presetName = localStorage.getItem(`preset_${presetNum}_name`) || '';
    currentPresetNumber = presetNum; // 現在のプリセット番号を保存
    console.log(`プリセット${presetNum}を読み込みました（名前: "${presetName}"）`);
    displayPresetName(presetName);
    
    // ラベル選択ボタンの状態を更新
    updateLabelSelector(presetNum);
    
    // 読み込みボタンの状態を更新（現在読み込み中のプリセットを無効化）
    updateLoadButtonsState();
    
    saveCurrentState();
}

// 読み込みボタンの状態を更新（現在読み込み中のプリセットを無効化）
function updateLoadButtonsState() {
    for (let i = 1; i <= 12; i++) {
        const loadBtn = document.querySelector(`.btn-load[data-preset="${i}"]`);
        if (!loadBtn) continue;
        
        const presetData = localStorage.getItem(`preset_${i}`);
        
        if (!presetData) {
            // プリセットが存在しない場合は無効化
            loadBtn.disabled = true;
        } else if (currentPresetNumber === i) {
            // 現在読み込み中のプリセットの場合、状態を比較
            const hasChanges = checkPresetChanges(i);
            // 変更がある場合は有効化、ない場合は無効化
            loadBtn.disabled = !hasChanges;
        } else {
            // それ以外は有効化
            loadBtn.disabled = false;
        }
    }
}

// プリセットと現在の状態を比較
function checkPresetChanges(presetNum) {
    const preset = loadPreset(presetNum);
    if (!preset) return false;
    
    // キャラクターIDを比較
    for (const slot of ['main', 'support1', 'support2']) {
        if (currentState[slot].characterId !== preset[slot].characterId) {
            return true;
        }
    }
    
    // 素質の取得状態を比較（acquired以外）
    for (const slot of ['main', 'support1', 'support2']) {
        // コア素質のobtained状態を比較
        const currentCoreKeys = Object.keys(currentState[slot].corePotentials);
        const presetCoreKeys = Object.keys(preset[slot].corePotentials);
        
        if (currentCoreKeys.length !== presetCoreKeys.length) {
            return true;
        }
        
        for (const key of currentCoreKeys) {
            const currentObtained = currentState[slot].corePotentials[key]?.obtained || false;
            const presetObtained = preset[slot].corePotentials[key]?.obtained || false;
            if (currentObtained !== presetObtained) {
                return true;
            }
        }
        
        // サブ素質のstatus状態を比較
        const currentSubKeys = Object.keys(currentState[slot].subPotentials);
        const presetSubKeys = Object.keys(preset[slot].subPotentials);
        
        if (currentSubKeys.length !== presetSubKeys.length) {
            return true;
        }
        
        for (const key of currentSubKeys) {
            const currentStatus = currentState[slot].subPotentials[key]?.status || 'none';
            const presetStatus = preset[slot].subPotentials[key]?.status || 'none';
            if (currentStatus !== presetStatus) {
                return true;
            }
        }
        
        // potentialOrderを比較
        const currentOrder = currentState[slot].potentialOrder;
        const presetOrder = preset[slot].potentialOrder;
        
        // 両方nullの場合は同じ
        if (currentOrder === null && presetOrder === null) {
            continue;
        }
        
        // 一方だけnullの場合は異なる
        if ((currentOrder === null) !== (presetOrder === null)) {
            return true;
        }
        
        // 両方配列の場合、長さと要素を比較
        if (currentOrder && presetOrder) {
            if (currentOrder.length !== presetOrder.length) {
                return true;
            }
            for (let i = 0; i < currentOrder.length; i++) {
                if (currentOrder[i] !== presetOrder[i]) {
                    return true;
                }
            }
        }
    }
    
    // プリセット名を比較（currentState.presetName vs 保存済）
    const currentPresetName = currentState.presetName || '';
    const savedPresetName = localStorage.getItem(`preset_${presetNum}_name`) || '';
    if (currentPresetName !== savedPresetName) {
        return true;
    }
    
    // ラベルを比較
    const currentLabel = document.querySelector('.label-select-btn.active')?.dataset.label || 'none';
    const savedLabel = localStorage.getItem(`preset_${presetNum}_label`) || 'none';
    if (currentLabel !== savedLabel) {
        return true;
    }
    
    return false;
}

function displayPresetName(name) {
    const input = document.getElementById('preset-name-input-inline');
    if (input) {
        // プログラム的な更新フラグを立てる
        isProgrammaticUpdate = true;
        
        // 値を設定（空文字列でも明示的に設定）
        input.value = name || '';
        
        // currentState.presetNameも更新
        currentState.presetName = name || '';
        
        // textareaの高さを調整
        input.style.height = 'auto';
        input.style.height = input.scrollHeight + 'px';
        
        // プレースホルダーの設定
        if (name && name.trim() !== '') {
            // 名前がある場合はプレースホルダーを空にする
            input.placeholder = '';
        } else {
            // 名前が空の場合はプレースホルダーを設定
            input.placeholder = i18n.getText('labels.presetNamePlaceholder', 'potential');
        }
        
        // フラグを戻す（非同期処理のため次のイベントループで）
        setTimeout(() => {
            isProgrammaticUpdate = false;
        }, 0);
    }
}

function loadPreset(presetNum) {
    const data = localStorage.getItem(`preset_${presetNum}`);
    return data ? JSON.parse(data) : null;
}

function updatePresetDisplay(presetNum, preset) {
    const presetItem = document.querySelector(`.preset-item[data-preset="${presetNum}"]`);
    if (!presetItem) return;
    
    const iconImg = presetItem.querySelector('.preset-icon');
    const presetNumber = presetItem.querySelector('.preset-number');
    
    // キャラクターアイコンの表示
    if (preset.main.characterId) {
        const character = charactersData.characters.find(c => c.id === preset.main.characterId);
        if (character) {
            iconImg.src = character.icon;
            iconImg.style.display = 'block';
        }
    } else {
        iconImg.style.display = 'none';
    }
    
    // ラベル画像の表示・非表示
    const savedLabel = localStorage.getItem(`preset_${presetNum}_label`) || 'none';
    
    // 既存のラベル画像を削除
    const existingLabel = presetItem.querySelector('.preset-label');
    if (existingLabel) {
        existingLabel.remove();
    }
    
    if (savedLabel !== 'none') {
        // ラベル画像を表示（プリセット番号を非表示）
        presetNumber.style.display = 'none';
        
        const labelImg = document.createElement('img');
        labelImg.className = 'preset-label';
        labelImg.src = `images/others/${savedLabel}.png`;
        labelImg.alt = savedLabel;
        
        const thumbnail = presetItem.querySelector('.preset-thumbnail');
        thumbnail.appendChild(labelImg);
    } else {
        // ラベルなしの場合はプリセット番号を表示
        presetNumber.style.display = 'block';
    }
}


function deletePreset(presetNum) {
    if (!confirm(i18n.getText('messages.confirmDelete', 'potential').replace('{number}', presetNum))) {
        return;
    }
    
    localStorage.removeItem(`preset_${presetNum}`);
    localStorage.removeItem(`preset_${presetNum}_name`);
    localStorage.removeItem(`preset_${presetNum}_label`);
    
    // プリセット表示を更新（初期状態に戻す）
    const presetItem = document.querySelector(`.preset-item[data-preset="${presetNum}"]`);
    if (presetItem) {
        // アイコンを非表示
        const iconImg = presetItem.querySelector('.preset-icon');
        iconImg.style.display = 'none';
        
        // ラベル画像を削除
        const existingLabel = presetItem.querySelector('.preset-label');
        if (existingLabel) {
            existingLabel.remove();
        }
        
        // プリセット番号を表示
        const presetNumber = presetItem.querySelector('.preset-number');
        if (presetNumber) {
            presetNumber.style.display = 'block';
        }
    }
    
    // 削除ボタンを更新
    updatePresetDeleteButtons();
    
    // 削除したプリセットが現在のプリセットだった場合
    if (currentPresetNumber === presetNum) {
        currentPresetNumber = null;
        displayPresetName('');
    }
    
    // 読み込みボタンの状態を更新
    updateLoadButtonsState();
}

function updatePresetDeleteButtons() {
    for (let i = 1; i <= 12; i++) {
        const presetItem = document.querySelector(`.preset-item[data-preset="${i}"]`);
        const presetData = localStorage.getItem(`preset_${i}`);
        const actionsDiv = presetItem.querySelector('.preset-actions');
        
        // 既存の削除ボタンを削除
        const existingDeleteBtn = actionsDiv.querySelector('.btn-delete-preset');
        if (existingDeleteBtn) {
            existingDeleteBtn.remove();
        }
        
        // プリセットが存在する場合のみ削除ボタンを追加
        if (presetData) {
            const deleteBtn = document.createElement('button');
            deleteBtn.className = 'btn-delete-preset';
            deleteBtn.textContent = i18n.getText('labels.delete', 'potential');
            deleteBtn.dataset.preset = i;
            deleteBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const presetNum = parseInt(e.currentTarget.dataset.preset);
                deletePreset(presetNum);
            });
            actionsDiv.appendChild(deleteBtn);
        }
    }
}


// ローカルストレージ
function saveCurrentState() {
    const hideUnobtained = document.getElementById('hideUnobtained').classList.contains('active');
    const stateToSave = {
        ...currentState,
        hideUnobtained: hideUnobtained,
        currentPresetNumber: currentPresetNumber
    };
    
    console.log('[保存] currentState:', {
        main: { 
            characterId: currentState.main.characterId, 
            potentialOrder: currentState.main.potentialOrder 
        },
        support1: { 
            characterId: currentState.support1.characterId, 
            potentialOrder: currentState.support1.potentialOrder 
        },
        support2: { 
            characterId: currentState.support2.characterId, 
            potentialOrder: currentState.support2.potentialOrder 
        }
    });
    
    localStorage.setItem('currentState', JSON.stringify(stateToSave));
    console.log('現在の状態を保存しました（プリセット番号:', currentPresetNumber, '）');
    
    // 読み込みボタンの状態を更新（変更検知）
    updateLoadButtonsState();
}

function loadCurrentState() {
    const data = localStorage.getItem('currentState');
    if (data) {
        const savedState = JSON.parse(data);
        
        console.log('[復元] LocalStorageから読み込んだデータ:', {
            main: { 
                characterId: savedState.main?.characterId, 
                potentialOrder: savedState.main?.potentialOrder 
            },
            support1: { 
                characterId: savedState.support1?.characterId, 
                potentialOrder: savedState.support1?.potentialOrder 
            },
            support2: { 
                characterId: savedState.support2?.characterId, 
                potentialOrder: savedState.support2?.potentialOrder 
            }
        });
        
        // キャラクターと素質の状態を復元
        Object.assign(currentState, {
            main: savedState.main,
            support1: savedState.support1,
            support2: savedState.support2,
            presetName: savedState.presetName || ''  // 編集中のプリセット名を復元
        });
        
        console.log('[復元] currentStateに代入後:', {
            main: { 
                characterId: currentState.main.characterId, 
                potentialOrder: currentState.main.potentialOrder 
            },
            support1: { 
                characterId: currentState.support1.characterId, 
                potentialOrder: currentState.support1.potentialOrder 
            },
            support2: { 
                characterId: currentState.support2.characterId, 
                potentialOrder: currentState.support2.potentialOrder 
            }
        });
        
        // UIに反映
        ['main', 'support1', 'support2'].forEach(slot => {
            if (currentState[slot].characterId) {
                const character = charactersData.characters.find(c => c.id === currentState[slot].characterId);
                if (character) {
                    updateCharacterSelectButton(slot, character);
                    displayPotentials(slot, character);
                }
            }
        });
        
        // チェックボックスの状態を復元
        if (savedState.hideUnobtained !== undefined) {
            if (savedState.hideUnobtained) {
                document.getElementById('hideUnobtained').classList.add('active');
                document.body.classList.add('hide-unobtained-active');
            } else {
                document.getElementById('hideUnobtained').classList.remove('active');
                document.body.classList.remove('hide-unobtained-active');
            }
        }
        
        // 現在のプリセット番号を復元
        if (savedState.currentPresetNumber !== undefined) {
            currentPresetNumber = savedState.currentPresetNumber;
            console.log('現在のプリセット番号を復元:', currentPresetNumber);
            
            // プリセット名を表示（currentState.presetNameから）
            if (currentPresetNumber) {
                // 編集中のプリセット名を表示（リロード時は保存内容よりこっちを優先）
                const presetName = currentState.presetName || '';
                
                // プリセット名を即設定
                const input = document.getElementById('preset-name-input-inline');
                if (input) {
                    // プログラム的な更新フラグを立てる
                    isProgrammaticUpdate = true;
                    
                    input.value = presetName;
                    input.placeholder = presetName ? '' : i18n.getText('labels.presetNamePlaceholder', 'potential');
                    
                    // textareaの高さを調整
                    input.style.height = 'auto';
                    input.style.height = input.scrollHeight + 'px';
                    
                    // フラグを戻す
                    setTimeout(() => {
                        isProgrammaticUpdate = false;
                    }, 0);
                }
                
                console.log('プリセット名を復元:', currentPresetNumber, presetName);
                
                // ラベル選択ボタンの状態を復元
                updateLabelSelector(currentPresetNumber);
            }

        }
        
        // ドロップダウンを更新
        updateAllModals();
        
        // フィルターを適用
        applyHideUnobtainedFilter();
    }
}

// スクリーンショット機能（dom-to-image-more版）
async function handleScreenshot() {
    // dom-to-image-moreが読み込まれているか確認
    if (typeof domtoimage === 'undefined') {
        console.error('dom-to-image-more が読み込まれていません');
        showError(i18n.getText('messages.screenshotError', 'potential'));
        return;
    }
    
    // 状態保存用の変数
    let footer, presetNameContainer, originalPresetDisplay;
    let wasHideUnobtainedActive = false;
    let grayedOutClasses = [];
    let obtainedElements = [];
    let originalStyles = new Map();
    
    try {
        // === 1. UI要素の準備 ===
        
        // スクリーンショット用フッターは非表示のまま（Canvas上で描画）
        footer = document.getElementById('screenshot-footer');
        // footer.style.display = 'block'; // Canvas上で描画するため不要
        
        // プリセット名エリアを非表示
        presetNameContainer = document.getElementById('preset-name-container');
        originalPresetDisplay = presetNameContainer.style.display;
        presetNameContainer.style.display = 'none';
        
        // === 2. hideUnobtainedを一時解除 ===
        const hideUnobtainedBtn = document.getElementById('hideUnobtained');
        wasHideUnobtainedActive = hideUnobtainedBtn?.classList.contains('active') || false;
        if (wasHideUnobtainedActive) {
            document.body.classList.remove('hide-unobtained-active');
        }
        
        // === 3. グレーアウトを一時解除 ===
        const grayedOutElements = document.querySelectorAll('.grayed-out, .grayed-out-unobtained');
        grayedOutElements.forEach((el, index) => {
            grayedOutClasses[index] = {
                element: el,
                hasGrayedOut: el.classList.contains('grayed-out'),
                hasGrayedOutUnobtained: el.classList.contains('grayed-out-unobtained')
            };
            el.classList.remove('grayed-out', 'grayed-out-unobtained');
        });
        
        // === 4. 取得済みマーク（チェックマーク）を一時解除 ===
        obtainedElements = Array.from(document.querySelectorAll('.potential-image-wrapper.obtained'));
        obtainedElements.forEach(el => {
            el.classList.remove('obtained');
        });
        
        // === 5. 背景色を強制設定 ===
        const targetElement = document.querySelector('.characters-area');
        const mainContent = document.querySelector('.main-content');
        const characterSections = document.querySelectorAll('.character-section');
        const potentialsContainers = document.querySelectorAll('.potentials-container');
        
        // 元のスタイルを保存
        originalStyles.set(targetElement, targetElement.style.cssText);
        if (mainContent) {
            originalStyles.set(mainContent, mainContent.style.cssText);
        }
        characterSections.forEach(section => {
            originalStyles.set(section, section.style.cssText);
        });
        potentialsContainers.forEach(container => {
            originalStyles.set(container, container.style.cssText);
        });
        
        // 背景色を設定
        targetElement.style.background = 'white';
        // characters-areaの幅を内容に合わせて広げる
        targetElement.style.width = 'max-content';
        targetElement.style.minWidth = '100%';
        
        if (mainContent) {
            mainContent.style.background = 'white';
        }
        characterSections.forEach(section => {
            section.style.background = 'rgb(66, 77, 113)';
            // 折り返し防止: セクションの幅を広げる
            section.style.width = 'max-content';
            section.style.minWidth = '100%';
        });
        
        // === 6. 折り返しを無効化 ===
        potentialsContainers.forEach(container => {
            container.style.flexWrap = 'nowrap';
        });
        
        // === 6.5. フッターは非表示のままにする（Canvas上で描画するため） ===
        const screenshotFooter = document.getElementById('screenshot-footer');
        if (screenshotFooter) {
            originalStyles.set(screenshotFooter, screenshotFooter.style.cssText);
            // フッターは非表示のまま（後でCanvas上に描画）
            screenshotFooter.style.display = 'none';
        }
        
        // === 7. レンダリング完了を待つ ===
        await new Promise(resolve => {
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    setTimeout(resolve, 200);
                });
            });
        });
        
        // === 8. コンテンツ幅を計算（折り返し解除後） ===
        const targetRect = targetElement.getBoundingClientRect();
        let maxRightPosition = 0;
        
        // 各素質カードの右端を確認
        const cards = targetElement.querySelectorAll('.potential-card');
        cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const rightPosition = rect.right - targetRect.left;
            if (rightPosition > maxRightPosition) {
                maxRightPosition = rightPosition;
            }
        });
        
        // キャラクター画像の幅も確認
        const charImgs = targetElement.querySelectorAll('.character-img');
        charImgs.forEach(img => {
            const rect = img.getBoundingClientRect();
            const rightPosition = rect.right - targetRect.left;
            if (rightPosition > maxRightPosition) {
                maxRightPosition = rightPosition;
            }
        });
        
        const rightPadding = 20;
        const contentWidth = Math.ceil(maxRightPosition + rightPadding);
        console.log('コンテンツ幅:', contentWidth, 'px (最右端:', maxRightPosition, 'px)');
        
        // === 9. dom-to-image-moreでキャプチャ ===
        // 実際のコンテンツサイズを再取得（幅調整後）
        const actualWidth = targetElement.scrollWidth;
        const actualHeight = targetElement.scrollHeight;
        
        const scale = 2; // 高解像度
        const options = {
            width: actualWidth * scale,
            height: actualHeight * scale,
            style: {
                transform: `scale(${scale})`,
                transformOrigin: 'top left'
            },
            quality: 1.0,
            bgcolor: '#ffffff'
        };
        
        console.log('キャプチャ開始... サイズ:', options.width, 'x', options.height);
        
        const dataUrl = await domtoimage.toPng(targetElement, options);
        console.log('キャプチャ完了');
        
        // === 10. 画像をCanvasに変換 ===
        const img = new Image();
        img.src = dataUrl;
        await new Promise((resolve, reject) => {
            img.onload = resolve;
            img.onerror = reject;
        });
        
        console.log('元のキャンバスサイズ:', img.width, 'x', img.height);
        
        // === 11. トリミング ===
        const trimWidth = Math.min(Math.ceil(contentWidth * scale), img.width);
        
        // フッターの高さを計算（scale考慮）
        const footerHeight = 28 * scale; // 元のpaddingとフォントサイズから概算
        
        let trimmedCanvas = document.createElement('canvas');
        trimmedCanvas.width = trimWidth;
        trimmedCanvas.height = img.height + footerHeight; // フッター分を追加
        
        let ctx = trimmedCanvas.getContext('2d');
        
        // 元画像を描画（フッター分下にスペースを空ける形ではなく、上に描画）
        // まず背景を白で塗りつぶす
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
        
        // === 11.5. フッターをCanvas上部に描画 ===
        // フッター背景
        ctx.fillStyle = 'rgba(37, 42, 66, 1)';
        ctx.fillRect(0, 0, trimWidth, footerHeight);
        
        // フッターの下線
        ctx.fillStyle = '#252a42';
        ctx.fillRect(0, footerHeight - 2 * scale, trimWidth, 2 * scale);
        
        // フッターテキスト
        const footerText = 'ステラソラ おサボりツール - 素質シミュレーター';
        ctx.fillStyle = '#ffffff';
        ctx.font = `${14 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(footerText, trimWidth / 2, footerHeight / 2);
        
        // 元画像をフッターの下に描画
        ctx.drawImage(img, 0, 0, trimWidth, img.height, 0, footerHeight, trimWidth, img.height);
        
        // Canvasの高さを調整（元画像 + フッター）
        trimmedCanvas.height = img.height + footerHeight;
        
        // 再描画（高さ変更後）
        ctx = trimmedCanvas.getContext('2d');
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, trimmedCanvas.width, trimmedCanvas.height);
        
        // フッター背景
        ctx.fillStyle = 'rgba(37, 42, 66, 1)';
        ctx.fillRect(0, 0, trimWidth, footerHeight);
        
        // フッターテキスト
        ctx.fillStyle = '#ffffff';
        ctx.font = `${14 * scale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(footerText, trimWidth / 2, footerHeight / 2);
        
        // 元画像をフッターの下に描画
        ctx.drawImage(img, 0, 0, trimWidth, img.height, 0, footerHeight, trimWidth, img.height);
        
        console.log('トリミング後（フッター追加）:', trimmedCanvas.width, 'x', trimmedCanvas.height);
        
        // === 12. 最大サイズ（1920x1080）に縮小 ===
        const maxWidth = 1920;
        const maxHeight = 1080;
        let finalCanvas = trimmedCanvas;
        
        if (trimmedCanvas.width > maxWidth || trimmedCanvas.height > maxHeight) {
            const widthScale = maxWidth / trimmedCanvas.width;
            const heightScale = maxHeight / trimmedCanvas.height;
            const shrinkScale = Math.min(widthScale, heightScale);
            
            const newWidth = Math.floor(trimmedCanvas.width * shrinkScale);
            const newHeight = Math.floor(trimmedCanvas.height * shrinkScale);
            
            console.log('縮小比率:', shrinkScale, '新しいサイズ:', newWidth, 'x', newHeight);
            
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = newWidth;
            finalCanvas.height = newHeight;
            
            ctx = finalCanvas.getContext('2d');
            ctx.imageSmoothingEnabled = true;
            ctx.imageSmoothingQuality = 'high';
            ctx.drawImage(trimmedCanvas, 0, 0, newWidth, newHeight);
        }
        
        console.log('最終キャンバスサイズ:', finalCanvas.width, 'x', finalCanvas.height);
        
        // === 13. 状態を復元 ===
        // グレーアウトを復元
        grayedOutClasses.forEach(item => {
            if (item.hasGrayedOut) {
                item.element.classList.add('grayed-out');
            }
            if (item.hasGrayedOutUnobtained) {
                item.element.classList.add('grayed-out-unobtained');
            }
        });
        
        // 取得済みマークを復元
        obtainedElements.forEach(el => {
            el.classList.add('obtained');
        });
        
        // スタイルを復元（折り返し設定も含む）
        originalStyles.forEach((cssText, element) => {
            element.style.cssText = cssText;
        });
        
        // hideUnobtainedを復元
        if (wasHideUnobtainedActive) {
            document.body.classList.add('hide-unobtained-active');
        }
        
        // プリセット名エリアを復元
        presetNameContainer.style.display = originalPresetDisplay;
        
        // フッターを非表示
        footer.style.display = 'none';
        
        // === 14. ダウンロード ===
        finalCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `osaboritools_potential_${Date.now()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        }, 'image/png');
        
    } catch (error) {
        console.error('スクリーンショットエラー:', error);
        showError(i18n.getText('messages.screenshotError', 'potential'));
        
        // エラー時の復元処理
        try {
            // グレーアウトを復元
            grayedOutClasses.forEach(item => {
                if (item.hasGrayedOut) {
                    item.element.classList.add('grayed-out');
                }
                if (item.hasGrayedOutUnobtained) {
                    item.element.classList.add('grayed-out-unobtained');
                }
            });
            
            // 取得済みマークを復元
            obtainedElements.forEach(el => {
                el.classList.add('obtained');
            });
            
            // スタイルを復元
            originalStyles.forEach((cssText, element) => {
                element.style.cssText = cssText;
            });
            
            // hideUnobtainedを復元
            if (wasHideUnobtainedActive) {
                document.body.classList.add('hide-unobtained-active');
            }
            
            // UI要素を復元
            if (presetNameContainer) {
                presetNameContainer.style.display = originalPresetDisplay || '';
            }
            if (footer) {
                footer.style.display = 'none';
            }
        } catch (restoreError) {
            console.error('復元処理でエラー:', restoreError);
        }
    }
}


// エラーメッセージ表示
function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    errorDiv.textContent = message;
    errorDiv.classList.remove('hidden');
    
    // 3秒後に自動で消す
    setTimeout(() => {
        errorDiv.classList.add('hidden');
    }, 3000);
}

// モーダル管理
function openModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.add('open');
        // スクロールを一番上に
        const modalContent = modal.querySelector('.modal-content');
        if (modalContent) {
            modalContent.scrollTop = 0;
        }
    }
}

function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('open');
    }
}

// Escキーでモーダルを閉じる
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        document.querySelectorAll('.modal.open').forEach(modal => {
            modal.classList.remove('open');
        });
    }
});

// 言語切り替え時の表示更新
function updateLanguageDisplay() {
    if (!charactersData) return;
    
    const lang = i18n.getLanguage();
    
    // キャラクター選択モーダルの「解除」オプションを更新
    document.querySelectorAll('.character-option[data-clear-option="true"]').forEach(option => {
        const textDiv = option.querySelector('.clear-option-text');
        if (textDiv) {
            textDiv.textContent = i18n.getText('labels.clear', 'potential');
        }
    });
    
    // キャラクター選択モーダル内のキャラ名を更新
    document.querySelectorAll('.character-option').forEach(option => {
        const charId = option.dataset.value;
        const char = charactersData.characters.find(c => c.id === charId);
        if (char) {
            const icon = option.querySelector('.character-option-icon');
            if (icon) {
                icon.alt = char.name[lang];
            }
            const nameTooltip = option.querySelector('.character-option-name');
            if (nameTooltip) {
                nameTooltip.textContent = char.name[lang];
            }
        }
    });
    
    // 選択済みキャラクターボタンのalt更新
    ['main', 'support1', 'support2'].forEach(slot => {
        const charId = currentState[slot].characterId;
        if (charId) {
            const char = charactersData.characters.find(c => c.id === charId);
            if (char) {
                const button = document.querySelector(`.character-select-button[data-slot="${slot}"]`);
                const icon = button?.querySelector('.character-select-icon');
                if (icon) {
                    icon.alt = char.name[lang];
                }
            }
        }
    });
    
    // 素質カードのツールチップを更新
    document.querySelectorAll('.potential-card').forEach(card => {
        const potentialId = card.dataset.potentialId;
        const slot = card.dataset.slot;  // カード自身のdata-slotを参照
        if (potentialId && slot) {
            const charId = currentState[slot]?.characterId;
            if (charId) {
                const char = charactersData.characters.find(c => c.id === charId);
                if (char && char.descriptions && char.descriptions[potentialId]) {
                    const desc = char.descriptions[potentialId][lang] || '';
                    const tooltip = card.querySelector('.potential-tooltip');
                    if (tooltip) {
                        tooltip.innerHTML = desc;
                    }
                }
            }
        }
    });
    
    // サブ素質のステータスラベルを更新
    document.querySelectorAll('.potential-card[data-type="sub"]').forEach(card => {
        const potentialId = card.dataset.potentialId;
        const slot = card.dataset.slot;
        if (potentialId && slot) {
            const state = currentState[slot]?.subPotentials?.[potentialId];
            if (state) {
                const btn = card.querySelector('.sub-status-btn');
                if (btn) {
                    btn.textContent = getSubStatusLabel(state.status);
                }
            }
        }
    });
    
    // コア素質のトグルボタンを更新
    document.querySelectorAll('.potential-card[data-type="core"]').forEach(card => {
        const potentialId = card.dataset.potentialId;
        const slot = card.dataset.slot;
        if (potentialId && slot) {
            const state = currentState[slot]?.corePotentials?.[potentialId];
            if (state) {
                const btn = card.querySelector('.status-btn');
                if (btn) {
                    btn.textContent = state.obtained 
                        ? i18n.getText('coreToggle.obtain', 'potential') 
                        : i18n.getText('coreToggle.notObtain', 'potential');
                }
            }
        }
    });
    
    // 素質画像の言語切り替え
    document.querySelectorAll('.potential-card').forEach(card => {
        const potentialId = card.dataset.potentialId;
        const slot = card.dataset.slot;
        if (potentialId && slot) {
            const charId = currentState[slot]?.characterId;
            if (charId) {
                const img = card.querySelector('.potential-image');
                if (img) {
                    updatePotentialImageSrc(img, charId, potentialId, lang);
                }
            }
        }
    });
    
    // プリセットモーダルの説明文を更新
    if (pendingPresetNumber !== null) {
        updatePresetModalDescription(pendingPresetNumber);
    }
    
    // プリセットの削除ボタンを更新
    document.querySelectorAll('.btn-delete-preset').forEach(btn => {
        btn.textContent = i18n.getText('labels.delete', 'potential');
    });
}

// プリセットモーダルの説明文を更新する関数
function updatePresetModalDescription(presetNumber) {
    const descElem = document.getElementById('preset-modal-description');
    if (descElem) {
        const template = i18n.getText('modal.presetName.description', 'potential');
        descElem.textContent = template.replace('{number}', presetNumber);
    }
}

// ラベル選択ボタンの状態を更新
function updateLabelSelector(presetNum) {
    const savedLabel = localStorage.getItem(`preset_${presetNum}_label`) || 'none';
    
    // 全てのボタンから active クラスを削除
    document.querySelectorAll('.label-select-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // 保存されているラベルに対応するボタンを active に
    const targetBtn = document.querySelector(`.label-select-btn[data-label="${savedLabel}"]`);
    if (targetBtn) {
        targetBtn.classList.add('active');
    }
}
