// ==========================================
// DICE POOL & HISTORY ENGINE
// ==========================================
let dicePool = {}; 

function addToPool(sides) {
    if (!dicePool[sides]) dicePool[sides] = 0;
    dicePool[sides]++;
    updateTrayDisplay();
}

function updateTrayDisplay() {
    let trayText = document.getElementById("current-pool");
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

function generateRandomNumber(sides) {
    let randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return Math.floor((randomBuffer[0] / 4294967295) * sides) + 1;
}

function rollPool() {
    if (Object.keys(dicePool).length === 0) return;
    let grandTotal = 0; let formulaParts = []; let tinyDiceHTML = "";
    let advState = "normal";
    
    if (document.getElementById("btn-adv").classList.contains('active')) advState = "adv";
    if (document.getElementById("btn-dis").classList.contains('active')) advState = "dis";

    for (let sides in dicePool) {
        let count = dicePool[sides];
        formulaParts.push((sides == 20 && advState !== "normal") ? `${count}d20 (${advState === "adv" ? "Adv" : "Dis"})` : `${count}d${sides}`);

        for (let i = 0; i < count; i++) {
            if (sides == 20 && advState !== "normal") {
                let roll1 = generateRandomNumber(20); let roll2 = generateRandomNumber(20);
                let kept = advState === "adv" ? Math.max(roll1, roll2) : Math.min(roll1, roll2);
                let dropped = advState === "adv" ? Math.min(roll1, roll2) : Math.max(roll1, roll2);
                grandTotal += kept;
                tinyDiceHTML += `<div class="mini-die">${kept}</div><div class="mini-die dropped-die">${dropped}</div>`;
            } else {
                let rollResult = generateRandomNumber(sides);
                grandTotal += rollResult;
                tinyDiceHTML += `<div class="mini-die">${rollResult}</div>`;
            }
        }
    }

    let modInput = document.getElementById("modifier-input");
    let modifierValue = modInput ? (parseInt(modInput.value) || 0) : 0;
    if (modifierValue !== 0) {
        grandTotal += modifierValue;
        let sign = modifierValue > 0 ? "+" : "";
        formulaParts.push(`${sign}${modifierValue}`);
        tinyDiceHTML += `<div class="mini-die" style="background-color: #333; border-color: #555;">${sign}${modifierValue}</div>`;
    }

    rollsRef.push({
        player: currentPlayerName, 
        formula: formulaParts.join(" "), 
        total: grandTotal,
        diceHTML: tinyDiceHTML,
        isSecret: isSecretRoll,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    });

    clearPool(); 
    isSecretRoll = false;
    document.getElementById("btn-secret").classList.remove("active");
}

function openClearModal() { document.getElementById("clear-modal").classList.remove("hidden-modal"); }
function closeClearModal() { document.getElementById("clear-modal").classList.add("hidden-modal"); }
function confirmClearHistory() { rollsRef.remove(); closeClearModal(); }

rollsRef.on('value', (snapshot) => {
    if (!snapshot.exists()) {
        let historyEl = document.getElementById("roll-history");
        if(historyEl) historyEl.innerHTML = "";
    }
});

rollsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (data.isSecret && userRole !== 'dm' && data.player !== currentPlayerName) return; 

    let timeString = data.timestamp ? new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "";
    const secretStyle = data.isSecret ? "border-left: 4px solid #ff4444; background: #2a1515;" : "";
    const secretTag = data.isSecret ? " <span style='color: #ff4444;'>(SECRET)</span>" : "";

    let newRollMessage = document.createElement("li");
    newRollMessage.innerHTML = `
        <div class="player-name" style="${secretStyle}">${data.player}${secretTag} <span style="color: #666; font-size: 10px; font-weight: normal; float: right;">${timeString}</span></div>
        <div class="roll-formula">${data.formula}</div>
        <div class="roll-output"><div class="roll-total">${data.total}</div><div class="dice-grid">${data.diceHTML}</div></div>
    `;
    let historyEl = document.getElementById("roll-history");
    if(historyEl) historyEl.prepend(newRollMessage);
});