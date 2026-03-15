// ==========================================
// 🎲 3D DICE POOL & HISTORY ENGINE
// ==========================================
const rollsRef = database.ref('rolls'); 

// Securely grab the player's info directly from localStorage
function getRollerInfo() {
    return {
        name: localStorage.getItem('tavernCharacterName') || 'Unknown Adventurer',
        role: String(localStorage.getItem('tavernUserRole') || 'player').toLowerCase()
    };
}

let dicePool = {}; 
let isSecretState = false; // Renamed to avoid the crash!

// --- TOGGLE DICE TRAY ---
function toggleDice() {
    const diceSec = document.getElementById('dice-section');
    const tab = document.getElementById('dice-tab');
    if (!diceSec || !tab) return;
    
    diceSec.classList.toggle('collapsed');
    tab.innerHTML = diceSec.classList.contains('collapsed') ? "🎲 Show Dice ▲" : "🎲 Hide Dice ▼";
}

function toggleSecret() {
    isSecretState = !isSecretState;
    const btn = document.getElementById("btn-secret");
    if (btn) {
        if (isSecretState) btn.classList.add('active');
        else btn.classList.remove('active');
    }
}

function addToPool(sides) {
    if (!dicePool[sides]) dicePool[sides] = 0;
    dicePool[sides]++;
    updateTrayDisplay();
}

function updateTrayDisplay() {
    let trayText = document.getElementById("current-pool");
    if (!trayText) return;
    
    let activeDice = Object.keys(dicePool).filter(sides => dicePool[sides] > 0);
    
    if (activeDice.length === 0) {
        trayText.innerHTML = "Select dice to roll...";
        return;
    }

    let htmlParts = [];
    for (let sides of activeDice) {
        htmlParts.push(`<span class="tray-die" onclick="removeFromPool(${sides})" title="Click to remove 1d${sides}">${dicePool[sides]}d${sides}</span>`);
    }
    trayText.innerHTML = htmlParts.join(" <span style='color: #888;'>+</span> ");
}

function removeFromPool(sides) {
    if (dicePool[sides] && dicePool[sides] > 0) {
        dicePool[sides]--;
        if (dicePool[sides] === 0) delete dicePool[sides];
        updateTrayDisplay();
    }
}

function clearPool() {
    dicePool = {};
    updateTrayDisplay();
    
    let modInput = document.getElementById("modifier-input");
    if(modInput) modInput.value = 0;
    
    let advBtn = document.getElementById("btn-adv");
    let disBtn = document.getElementById("btn-dis");
    if (advBtn) advBtn.classList.remove('active');
    if (disBtn) disBtn.classList.remove('active');
}

// Cryptographically secure RNG
function generateRandomNumber(sides) {
    let randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return Math.floor((randomBuffer[0] / 4294967295) * sides) + 1;
}

// --- CORE ROLL LOGIC ---
function rollPool() {
    if (Object.keys(dicePool).length === 0) return;
    
    let grandTotal = 0; 
    let formulaParts = []; 
    let tinyDiceHTML = "";
    
    let advBtn = document.getElementById("btn-adv");
    let disBtn = document.getElementById("btn-dis");
    let advState = "normal";
    
    if (advBtn && advBtn.classList.contains('active')) advState = "adv";
    if (disBtn && disBtn.classList.contains('active')) advState = "dis";

    // First, process all NON-d20s
    for (let sides in dicePool) {
        if (sides == 20) continue; // Skip d20s for now
        
        let count = dicePool[sides];
        formulaParts.push(`${count}d${sides}`);

        for (let i = 0; i < count; i++) {
            let rollResult = generateRandomNumber(sides);
            grandTotal += rollResult;
            tinyDiceHTML += `<div class="mini-die" title="d${sides}">${rollResult}</div>`;
        }
    }

    // Second, process d20s (Handling True Advantage/Disadvantage)
    if (dicePool[20]) {
        let count = dicePool[20];
        
        // If Adv/Dis is checked, force the pool to have AT LEAST 2 dice to drop one
        if (advState !== "normal" && count === 1) count = 2; 

        formulaParts.push(`${count}d20 ${advState !== "normal" ? `(${advState === "adv" ? "Adv" : "Dis"})` : ""}`);

        let d20Rolls = [];
        for (let i = 0; i < count; i++) {
            d20Rolls.push(generateRandomNumber(20));
        }

        if (advState === "normal") {
            // Normal roll: keep everything
            d20Rolls.forEach(r => {
                grandTotal += r;
                tinyDiceHTML += `<div class="mini-die" title="d20">${r}</div>`;
            });
        } else {
            // Advantage/Disadvantage: Find the single highest/lowest to keep
            let targetRoll = advState === "adv" ? Math.max(...d20Rolls) : Math.min(...d20Rolls);
            let keptTarget = false; // Ensures we only keep the target ONCE (e.g., if you roll two 18s)

            d20Rolls.forEach(r => {
                if (r === targetRoll && !keptTarget) {
                    grandTotal += r;
                    tinyDiceHTML += `<div class="mini-die" title="d20">${r}</div>`;
                    keptTarget = true;
                } else {
                    tinyDiceHTML += `<div class="mini-die dropped-die" title="Dropped d20">${r}</div>`;
                }
            });
        }
    }

    // Finally, process Modifiers
    let modInput = document.getElementById("modifier-input");
    let modifierValue = modInput ? (parseInt(modInput.value) || 0) : 0;
    
    if (modifierValue !== 0) {
        grandTotal += modifierValue;
        let sign = modifierValue > 0 ? "+" : "";
        formulaParts.push(`${sign}${modifierValue}`);
        tinyDiceHTML += `<div class="mini-die" style="background-color: #333; border-color: #555; color: #fff;" title="Modifier">${sign}${modifierValue}</div>`;
    }

    // Fetch Roller Info securely
    const rollerInfo = getRollerInfo();
    
    // Check if the statblock roller set a temporary monster name
    const displayElement = document.getElementById('display-name');
    if (displayElement && displayElement.innerText !== rollerInfo.name && displayElement.innerText !== "") {
        rollerInfo.name = displayElement.innerText; // Use the monster's name!
    }

    rollsRef.push({
        player: rollerInfo.name, 
        formula: formulaParts.join(" + "), 
        total: grandTotal,
        diceHTML: tinyDiceHTML,
        isSecret: isSecretState, // Updated name here!
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    clearPool(); 
    
    // Turn off Secret mode after rolling so you don't accidentally hide your next attack
    isSecretState = false; // Updated name here!
    let secretBtn = document.getElementById("btn-secret");
    if(secretBtn) secretBtn.classList.remove("active");
}

// --- CLEAR HISTORY MODAL ---
function openClearModal() { 
    const modal = document.getElementById("clear-modal");
    if(modal) modal.classList.remove("hidden-modal"); 
}

function closeClearModal() { 
    const modal = document.getElementById("clear-modal");
    if(modal) modal.classList.add("hidden-modal"); 
}

function confirmClearHistory() { 
    rollsRef.remove(); 
    closeClearModal(); 
}

// --- RENDER HISTORY FROM FIREBASE ---
rollsRef.on('value', (snapshot) => {
    if (!snapshot.exists()) {
        let historyEl = document.getElementById("roll-history");
        if(historyEl) historyEl.innerHTML = "";
    }
});

rollsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    const rollerInfo = getRollerInfo();
    
    // SECURE SECRET ROLLS: If it's secret, and you aren't the DM, and you didn't roll it -> Hide it!
    if (data.isSecret && !rollerInfo.role.includes('dm') && data.player !== rollerInfo.name) return; 

    let timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
    const secretStyle = data.isSecret ? "border-left: 4px solid #ff4444; background: #2a1515; padding-left: 5px;" : "";
    const secretTag = data.isSecret ? " <span style='color: #ff4444; font-size: 10px;'>(SECRET)</span>" : "";

    let newRollMessage = document.createElement("li");
    newRollMessage.style.cssText = "margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #333;";
    newRollMessage.innerHTML = `
        <div class="player-name" style="${secretStyle} color: #ffcc00; font-weight: bold; margin-bottom: 2px;">
            ${data.player}${secretTag} 
            <span style="color: #666; font-size: 10px; font-weight: normal; float: right;">${timeString}</span>
        </div>
        <div class="roll-formula" style="font-size: 11px; color: #aaa; margin-bottom: 4px;">Rolled: ${data.formula}</div>
        <div class="roll-output" style="display: flex; align-items: center; gap: 10px;">
            <div class="roll-total" style="font-size: 24px; font-weight: bold; color: white;">${data.total}</div>
            <div class="dice-grid" style="display: flex; flex-wrap: wrap; gap: 4px;">${data.diceHTML}</div>
        </div>
    `;
    
    let historyEl = document.getElementById("roll-history");
    if(historyEl) historyEl.prepend(newRollMessage);
});