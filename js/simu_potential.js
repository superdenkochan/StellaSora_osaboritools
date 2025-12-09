// グローバル変数
let charactersData = null; // JSONからキャラクターデータ読み込み
const MAX_SUB_LEVEL = 6; // サブ素質の最大レベル
const MAX_CORE_POTENTIALS = 2; // コア素質の最大取得数
const TOOLTIP_MAX_CHARS = 320; // ツールチップの1行あたりの最大文字数（？）

// プリセット名入力用の一時変数
let pendingPresetNumber = null;
let currentPresetNumber = null; // 現在読み込み中のプリセット番号

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
    main: {
        characterId: null,
        corePotentials: {}, // { potentialId: { obtained: bool, acquired: bool } }
        subPotentials: {}   // { potentialId: { status: 'level6'|'level2'|'level1'|'none', count: number } }
    },
    support1: {
        characterId: null,
        corePotentials: {},
        subPotentials: {}
    },
    support2: {
        characterId: null,
        corePotentials: {},
        subPotentials: {}
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
    
    console.log('initPotentialImageSrc:', { charId, potentialId, currentLang, langPath });
    
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
    
    console.log('updatePotentialImageSrc:', {
        charId, potentialId, targetLang,
        currentFilename, newFilename,
        langPath
    });
    
    // 同じファイル名なら更新しない（ちらつき防止）
    if (currentFilename === newFilename) {
        console.log('  -> スキップ（同じファイル名）');
        return;
    }
    
    // 共通画像を表示中の場合、言語付き画像があるかチェック
    if (currentFilename === commonFilename) {
        console.log('  -> 共通画像から言語付き画像をテスト');
        const testImg = new Image();
        testImg.onload = () => { 
            console.log('  -> 言語付き画像が存在、切り替え:', langPath);
            img.src = langPath; 
        };
        testImg.onerror = () => {
            console.log('  -> 言語付き画像なし、共通画像を維持');
        };
        testImg.src = langPath;
        return;
    }
    
    console.log('  -> 言語付きパスを設定:', langPath);
    img.src = langPath;
    
    // エラー時のフォールバック処理
    img.onerror = function() {
        if (this.src.includes('_JP.') || this.src.includes('_EN.')) {
            console.log('  -> フォールバック: 共通画像へ');
            this.src = commonPath;
        } else {
            this.onerror = null;
            this.src = 'https://placehold.co/202x256?text=' + potentialId;
        }
    };
}

// Descriptionの取得と文字数制御
function getDescription(character, potentialId) {
    const descData = character.descriptions[potentialId];
    const desc = (descData ? descData[i18n.getLanguage()] : null) || i18n.getText('messages.noDescription', 'potential');
    return formatTooltipText(desc, TOOLTIP_MAX_CHARS);
}

// ツールチップテキストのフォーマット
function formatTooltipText(text, maxChars) {
    if (text.length <= maxChars) return text;
    
    let result = '';
    let currentLine = '';
    
    for (let i = 0; i < text.length; i++) {
        currentLine += text[i];
        
        if (currentLine.length >= maxChars) {
            result += currentLine + '\n';
            currentLine = '';
        }
    }
    
    if (currentLine.length > 0) {
        result += currentLine;
    }
    
    return result;
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
        clearOption.innerHTML = `
            <div style="display: flex; align-items: center; justify-content: center; width: 100%; height: 100%; font-size: 14px; font-weight: bold; color: #252a42;">
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
        if (charId && selectedIds.includes(charId) && currentState[currentSlot].characterId !== charId) {
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
    
    // カウントリセット
    document.getElementById('resetCount').addEventListener('click', handleResetCount);
    
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
    
    editBtn.addEventListener('click', () => {
        if (presetNameInput.readOnly) {
            // 編集モードに切り替え
            presetNameInput.readOnly = false;
            presetNameInput.style.borderColor = '#252a42';
            presetNameInput.style.background = 'white';
            presetNameInput.focus();
            presetNameInput.select();
            // 編集中はボタンをグレーアウト（確定ボタンはややこしかったからやらない）
            editBtn.disabled = true;
            editBtn.style.opacity = '0.5';
            editBtn.style.cursor = 'not-allowed';
        }
    });
    
    presetNameInput.addEventListener('blur', () => {
        // フォーカスアウト時に確定
        if (!presetNameInput.readOnly) {
            savePresetNameInline();
        }
    });
    
    presetNameInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            presetNameInput.blur(); // フォーカスアウトで自動保存
        }
    });
}

// プリセット名をインラインで保存
function savePresetNameInline() {
    const presetNameInput = document.getElementById('preset-name-input-inline');
    const editBtn = document.getElementById('preset-name-edit-btn');
    let presetName = presetNameInput.value.trim();
    
    console.log('プリセット名保存処理開始:', { 
        currentPresetNumber, 
        inputValue: presetNameInput.value,
        trimmedValue: presetName 
    });
    
    // 空欄の場合は（未設定）にする
    if (presetName === '') {
        presetName = '';
        presetNameInput.placeholder = i18n.getText('labels.presetNamePlaceholder', 'potential');
    }
    
    // ローカルストレージに保存（現在読み込み中のプリセット用）
    if (currentPresetNumber) {
        localStorage.setItem(`preset_${currentPresetNumber}_name`, presetName);
        console.log(`プリセット${currentPresetNumber}の名前を保存しました:`, presetName);
    } else {
        console.warn('currentPresetNumberがnullのため、プリセット名を保存できませんでした');
    }
    
    // 編集モードを終了
    presetNameInput.readOnly = true;
    presetNameInput.style.borderColor = 'transparent';
    presetNameInput.style.background = 'transparent';
    
    // ボタンを元に戻す
    editBtn.disabled = false;
    editBtn.style.opacity = '1';
    editBtn.style.cursor = 'pointer';
}

// キャラクター選択時の処理
function handleCharacterSelectFromDropdown(slot, charId) {
    if (!charId) {
        // 選択解除
        currentState[slot].characterId = null;
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
    
    // コア素質セクション
    const coreSection = createPotentialSection(i18n.getText('labels.corePotential', 'potential'), potentialDef.core, character, slot, 'core');
    container.appendChild(coreSection);
    
    // サブ素質セクション
    const subSection = createPotentialSection(i18n.getText('labels.subPotential', 'potential'), potentialDef.sub, character, slot, 'sub');
    container.appendChild(subSection);
    
    // フィルターを適用
    applyHideUnobtainedFilter();
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
            
            // ステータスボタンの更新
            const btn = card.querySelector('.sub-status-btn');
            if (btn) {
                btn.textContent = getSubStatusLabel(state.status);
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
    ['main', 'support1', 'support2'].forEach(slot => {
        currentState[slot].characterId = null;
        currentState[slot].corePotentials = {};
        currentState[slot].subPotentials = {};
        
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
    
    // ドロップダウンを更新
    updateAllModals();
    
    // 状態を保存
    saveCurrentState();
}

// プリセット管理
function initializePresets() {
    for (let i = 1; i <= 10; i++) {
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
    Object.values(stateToSave).forEach(slotState => {
        Object.values(slotState.corePotentials).forEach(state => {
            state.acquired = false;
        });
        Object.values(slotState.subPotentials).forEach(state => {
            state.count = 0;
        });
    });
    
    // プリセット名を保存（インライン入力されている文字列を取得）
    const presetNameInput = document.getElementById('preset-name-input-inline');
    let presetName = presetNameInput.value.trim();
    console.log(`プリセット${presetNum}保存時のプリセット名:`, presetName);
    
    // 空欄の場合は空文字列として保存（未設定にする）
    const placeholderText = i18n.getText('labels.presetNamePlaceholder', 'potential');
    if (presetName === '' || presetName === placeholderText) {
        presetName = '';
    }
    
    // 保存
    localStorage.setItem(`preset_${presetNum}`, JSON.stringify(stateToSave));
    localStorage.setItem(`preset_${presetNum}_name`, presetName);
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
    
    // 現在の状態が初期状態でない場合は確認
    const isInitialState = !currentState.main.characterId && 
                          !currentState.support1.characterId && 
                          !currentState.support2.characterId;
    
    if (!isInitialState && JSON.stringify(currentState) !== JSON.stringify(preset)) {
        if (!confirm(i18n.getText('messages.confirmPresetLoad', 'potential'))) {
            return;
        }
    }
    
    // プリセットを読み込み
    Object.assign(currentState, JSON.parse(JSON.stringify(preset)));
    
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
    console.log('currentPresetNumberを設定:', currentPresetNumber);
    displayPresetName(presetName);
    
    // 読み込みボタンの状態を更新（現在読み込み中のプリセットを無効化）
    updateLoadButtonsState();
    
    saveCurrentState();
}

// 読み込みボタンの状態を更新（現在読み込み中のプリセットを無効化）
function updateLoadButtonsState() {
    for (let i = 1; i <= 10; i++) {
        const loadBtn = document.querySelector(`.btn-load[data-preset="${i}"]`);
        if (!loadBtn) continue;
        
        const presetData = localStorage.getItem(`preset_${i}`);
        
        if (!presetData) {
            // プリセットが存在しない場合は無効化
            loadBtn.disabled = true;
        } else if (currentPresetNumber === i) {
            // 現在読み込み中のプリセットは無効化
            loadBtn.disabled = true;
        } else {
            // それ以外は有効化
            loadBtn.disabled = false;
        }
    }
}
function displayPresetName(name) {
    const input = document.getElementById('preset-name-input-inline');
    if (input) {
        input.value = name || '';
        input.placeholder = name ? '' : i18n.getText('labels.presetNamePlaceholder', 'potential');
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
    if (preset.main.characterId) {
        const character = charactersData.characters.find(c => c.id === preset.main.characterId);
        if (character) {
            iconImg.src = character.icon;
            iconImg.style.display = 'block';
        }
    } else {
        iconImg.style.display = 'none';
    }
}

function deletePreset(presetNum) {
    if (!confirm(i18n.getText('messages.confirmDelete', 'potential').replace('{number}', presetNum))) {
        return;
    }
    
    localStorage.removeItem(`preset_${presetNum}`);
    localStorage.removeItem(`preset_${presetNum}_name`);
    
    // プリセット表示を更新
    const presetItem = document.querySelector(`.preset-item[data-preset="${presetNum}"]`);
    if (presetItem) {
        const iconImg = presetItem.querySelector('.preset-icon');
        iconImg.style.display = 'none';
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
    for (let i = 1; i <= 10; i++) {
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
    localStorage.setItem('currentState', JSON.stringify(stateToSave));
    console.log('現在の状態を保存しました（プリセット番号:', currentPresetNumber, '）');
}

function loadCurrentState() {
    const data = localStorage.getItem('currentState');
    if (data) {
        const savedState = JSON.parse(data);
        
        // キャラクターと素質の状態を復元
        Object.assign(currentState, {
            main: savedState.main,
            support1: savedState.support1,
            support2: savedState.support2
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
            } else {
                document.getElementById('hideUnobtained').classList.remove('active');
            }
        }
        
        // 現在のプリセット番号を復元
        if (savedState.currentPresetNumber !== undefined) {
            currentPresetNumber = savedState.currentPresetNumber;
            console.log('現在のプリセット番号を復元:', currentPresetNumber);
            
            // プリセット名を表示
            if (currentPresetNumber) {
                const presetName = localStorage.getItem(`preset_${currentPresetNumber}_name`) || '';
                displayPresetName(presetName);
                console.log('プリセット名を復元:', presetName);
            }
        }
        
        // ドロップダウンを更新
        updateAllModals();
        
        // フィルターを適用
        applyHideUnobtainedFilter();
    }
}

// スクリーンショット機能
async function handleScreenshot() {
    try {
        // スクリーンショット用フッターを一時的に表示
        const footer = document.getElementById('screenshot-footer');
        footer.style.display = 'block';
        
        // プリセット名エリアを一時的に非表示
        const presetNameContainer = document.getElementById('preset-name-container');
        const originalPresetDisplay = presetNameContainer.style.display;
        presetNameContainer.style.display = 'none';
        
        // グレーアウトを一時的に解除
        const grayedOutElements = document.querySelectorAll('.grayed-out, .grayed-out-unobtained');
        const grayedOutClasses = [];
        grayedOutElements.forEach((el, index) => {
            grayedOutClasses[index] = {
                element: el,
                hasGrayedOut: el.classList.contains('grayed-out'),
                hasGrayedOutUnobtained: el.classList.contains('grayed-out-unobtained')
            };
            el.classList.remove('grayed-out', 'grayed-out-unobtained');
        });
        
        // コア素質の取得済みマーク（チェックマーク）を一時的に解除
        const obtainedElements = document.querySelectorAll('.potential-image-wrapper.obtained');
        obtainedElements.forEach(el => {
            el.classList.remove('obtained');
        });
        
        // レンダリングが完了するのを待つ
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // キャラクターエリアをまずフルサイズでキャプチャ
        const targetElement = document.querySelector('.characters-area');
        const originalCanvas = await html2canvas(targetElement, {
            backgroundColor: '#ffffff',
            logging: false,
            useCORS: true,
            scrollY: -window.scrollY,
            scrollX: -window.scrollX
        });
        
        console.log('元のキャンバスサイズ:', originalCanvas.width, 'x', originalCanvas.height);
        
        // 最大サイズ（1920x1080）
        const maxWidth = 1920;
        const maxHeight = 1080;
        
        let finalCanvas = originalCanvas;
        
        // サイズが1920x1080を超える場合は縮小
        if (originalCanvas.width > maxWidth || originalCanvas.height > maxHeight) {
            // 縮小比率を計算
            const widthScale = maxWidth / originalCanvas.width;
            const heightScale = maxHeight / originalCanvas.height;
            const scale = Math.min(widthScale, heightScale);
            
            const newWidth = Math.floor(originalCanvas.width * scale);
            const newHeight = Math.floor(originalCanvas.height * scale);
            
            console.log('縮小比率:', scale, '新しいサイズ:', newWidth, 'x', newHeight);
            
            // 新しいキャンバスを作成して縮小描画
            finalCanvas = document.createElement('canvas');
            finalCanvas.width = newWidth;
            finalCanvas.height = newHeight;
            
            const ctx = finalCanvas.getContext('2d');
            ctx.drawImage(originalCanvas, 0, 0, newWidth, newHeight);
        }
        
        console.log('最終キャンバスサイズ:', finalCanvas.width, 'x', finalCanvas.height);
        
        // スクショ用にグレーアウトしたのを元に戻す
        grayedOutClasses.forEach(item => {
            if (item.hasGrayedOut) {
                item.element.classList.add('grayed-out');
            }
            if (item.hasGrayedOutUnobtained) {
                item.element.classList.add('grayed-out-unobtained');
            }
        });
        
        // コア素質の取得済みマークを元に戻す
        obtainedElements.forEach(el => {
            el.classList.add('obtained');
        });
        
        // プリセット名エリアを元に戻す
        presetNameContainer.style.display = originalPresetDisplay;
        
        // フッターを非表示に戻す
        footer.style.display = 'none';
        
        // Canvasを画像に変換してダウンロード
        finalCanvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `osaboritools_potential_${new Date().getTime()}.png`;
            a.click();
            URL.revokeObjectURL(url);
        });
    } catch (error) {
        console.error('スクリーンショットエラー:', error);
        showError(i18n.getText('messages.screenshotError', 'potential'));
        
        // エラー時も要素を元に戻す
        const footer = document.getElementById('screenshot-footer');
        const presetNameContainer = document.getElementById('preset-name-container');
        if (footer) footer.style.display = 'none';
        if (presetNameContainer) presetNameContainer.style.display = '';
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
                        tooltip.innerHTML = formatTooltipText(desc, TOOLTIP_MAX_CHARS);
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
}
