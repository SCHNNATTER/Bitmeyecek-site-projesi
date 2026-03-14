// 1. FIREBASE SETUP
const firebaseConfig = {
    apiKey: "AIzaSyCp02JKeA1HHmQ-MaTAxwklaob3LZh4k7I",
    authDomain: "bitmeyecek-site-projesi.firebaseapp.com",
    projectId: "bitmeyecek-site-projesi",
    storageBucket: "bitmeyecek-site-projesi.firebasestorage.app",
    messagingSenderId: "52233887739",
    appId: "1:52233887739:web:30440e9bea18443e46b55e",
    databaseURL: "https://bitmeyecek-site-projesi-default-rtdb.firebaseio.com/" 
};
firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const rollsRef = database.ref('rolls'); 

// 2. PLAYER IDENTITY
let currentPlayerName = "Mysterious Stranger";
function initializePlayer() {
    let savedName = localStorage.getItem("tavernPlayerName");
    if (savedName) {
        currentPlayerName = savedName;
        document.getElementById("display-name").innerText = currentPlayerName;
    } else {
        changeName();
    }
}
function changeName() {
    let newName = prompt("Welcome to the Tavern! What is your character's name?");
    if (newName && newName.trim() !== "") {
        currentPlayerName = newName.trim();
        localStorage.setItem("tavernPlayerName", currentPlayerName);
        document.getElementById("display-name").innerText = currentPlayerName;
    }
}
initializePlayer();

// 3. UI TOGGLES
function toggleAdvDis(type) {
    let advBtn = document.getElementById("btn-adv");
    let disBtn = document.getElementById("btn-dis");
    if (type === 'adv') {
        if (advBtn.classList.contains('active')) advBtn.classList.remove('active');
        else { advBtn.classList.add('active'); disBtn.classList.remove('active'); }
    } else if (type === 'dis') {
        if (disBtn.classList.contains('active')) disBtn.classList.remove('active');
        else { disBtn.classList.add('active'); advBtn.classList.remove('active'); }
    }
}

function toggleCharSheet() {
    let sheet = document.getElementById("char-sidebar");
    if(sheet) sheet.classList.toggle("open");
}

// 4. DICE POOL LOGIC
let dicePool = {}; 
function addToPool(sides) {
    if (!dicePool[sides]) dicePool[sides] = 0;
    dicePool[sides]++;
    updateTrayDisplay();
}
function updateTrayDisplay() {
    let formulaParts = [];
    for (let sides in dicePool) {
        formulaParts.push(`${dicePool[sides]}d${sides}`);
    }
    let trayText = document.getElementById("current-pool");
    trayText.textContent = formulaParts.length === 0 ? "Select dice to roll..." : formulaParts.join(" + ");
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

// 5. RNG ENGINE
function generateRandomNumber(sides) {
    let randomBuffer = new Uint32Array(1);
    window.crypto.getRandomValues(randomBuffer);
    return Math.floor((randomBuffer[0] / 4294967295) * sides) + 1;
}

// 6. MULTIPLAYER ROLL LOGIC
function rollPool() {
    if (Object.keys(dicePool).length === 0) return;
    let grandTotal = 0;
    let formulaParts = [];
    let tinyDiceHTML = "";

    let advState = "normal";
    let advBtn = document.getElementById("btn-adv");
    let disBtn = document.getElementById("btn-dis");
    if (advBtn && advBtn.classList.contains('active')) advState = "adv";
    if (disBtn && disBtn.classList.contains('active')) advState = "dis";

    for (let sides in dicePool) {
        let count = dicePool[sides];
        if (sides == 20 && advState !== "normal") {
            let text = advState === "adv" ? "Adv" : "Dis";
            formulaParts.push(`${count}d20 (${text})`);
        } else {
            formulaParts.push(`${count}d${sides}`);
        }

        for (let i = 0; i < count; i++) {
            if (sides == 20 && advState !== "normal") {
                let roll1 = generateRandomNumber(20);
                let roll2 = generateRandomNumber(20);
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

    let rollData = {
        player: currentPlayerName, 
        formula: formulaParts.join(" "), 
        total: grandTotal,
        diceHTML: tinyDiceHTML,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    rollsRef.push(rollData); 
    clearPool(); 
}

// 7. HISTORY & MODALS
function openClearModal() { let modal = document.getElementById("clear-modal"); if(modal) modal.classList.remove("hidden-modal"); }
function closeClearModal() { let modal = document.getElementById("clear-modal"); if(modal) modal.classList.add("hidden-modal"); }
function confirmClearHistory() { rollsRef.remove(); closeClearModal(); }

rollsRef.on('value', (snapshot) => { if (!snapshot.exists()) { let historyEl = document.getElementById("roll-history"); if(historyEl) historyEl.innerHTML = ""; } });
rollsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    let timeString = "";
    if (data.timestamp) { timeString = new Date(data.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }); }
    let newRollMessage = document.createElement("li");
    newRollMessage.innerHTML = `
        <div class="player-name">${data.player} <span style="color: #666; font-size: 10px; font-weight: normal; float: right;">${timeString}</span></div>
        <div class="roll-formula">${data.formula}</div>
        <div class="roll-output">
            <div class="roll-total">${data.total}</div>
            <div class="dice-grid">${data.diceHTML}</div>
        </div>`;
    let historyEl = document.getElementById("roll-history");
    if(historyEl) historyEl.prepend(newRollMessage);
});

// CHECKBOX PERSISTENCE
function saveCheckboxState(checkboxElement) {
    let states = JSON.parse(localStorage.getItem("dndCheckboxStates") || "{}");
    states[checkboxElement.id] = checkboxElement.checked;
    localStorage.setItem("dndCheckboxStates", JSON.stringify(states));
}

// 8. D&D BEYOND INTEGRATION 
async function importDndBeyond(isManual = true) {
    let charId = localStorage.getItem("dndCharId");

    if (isManual || !charId) {
        let charInput = prompt("Enter your D&D Beyond Character ID to Sync:", charId || "");
        if (!charInput || charInput.trim() === "") return;
        charId = charInput.split('/').pop().trim();
        localStorage.setItem("dndCharId", charId); 
    }

    if (isManual) document.getElementById("display-name").innerText = "Syncing with D&D Beyond...";

    try {
        let charData;

        if (!isManual && localStorage.getItem("dndCharData")) {
            charData = JSON.parse(localStorage.getItem("dndCharData"));
        } else {
            let proxyUrl = `http://localhost:3000/api/dnd/${charId}`; 
            let response = await fetch(proxyUrl);
            if (!response.ok) throw new Error(`Node Proxy failed! Status: ${response.status}`);
            
            let rawData = await response.json();
            if (rawData.success === false) throw new Error(rawData.message || "Sheet is Private.");
            
            charData = rawData.data;
            localStorage.setItem("dndCharData", JSON.stringify(charData));
        }

        let totalLevel = charData.classes ? charData.classes.reduce((sum, cls) => sum + cls.level, 0) : 1;
        let profBonus = Math.ceil(totalLevel / 4) + 1;

        let allModifiers = [];
        if (charData.modifiers) {
            for (let key in charData.modifiers) {
                if (Array.isArray(charData.modifiers[key])) allModifiers = allModifiers.concat(charData.modifiers[key]);
            }
        }

        function getProfMultiplier(subType) {
            if (allModifiers.some(m => m.type === "expertise" && m.subType === subType)) return 2;
            if (allModifiers.some(m => m.type === "proficiency" && m.subType === subType)) return 1;
            if (allModifiers.some(m => m.type === "half-proficiency" && m.subType === subType)) return 0.5;
            return 0;
        }

        let statMods = [];
        let statNames = ["STR", "DEX", "CON", "INT", "WIS", "CHA"];
        let statsHTML = "";

        for (let i = 0; i < 6; i++) {
            let baseScore = charData.stats[i]?.value || 10;
            let bonusScore = charData.bonusStats[i]?.value || 0;
            let overrideScore = charData.overrideStats[i]?.value || 0;
            let finalScore = overrideScore > 0 ? overrideScore : (baseScore + bonusScore);
            let modifier = Math.floor((finalScore - 10) / 2);
            statMods[i] = modifier; 
            let sign = modifier >= 0 ? "+" : "";
            statsHTML += `<button class="stat-btn" onclick="loadSkillToTray(${modifier})">${statNames[i]}<br><span style="color:white; font-size:16px;">${sign}${modifier}</span></button>`;
        }
        document.getElementById("sheet-stats").innerHTML = statsHTML;

        let savesHTML = "";
        let saveSubTypes = ["strength-saving-throws", "dexterity-saving-throws", "constitution-saving-throws", "intelligence-saving-throws", "wisdom-saving-throws", "charisma-saving-throws"];
        for (let i = 0; i < 6; i++) {
            let totalSaveMod = statMods[i] + Math.floor(profBonus * getProfMultiplier(saveSubTypes[i]));
            let sign = totalSaveMod >= 0 ? "+" : "";
            savesHTML += `<button class="skill-btn" onclick="loadSkillToTray(${totalSaveMod})"><span>${statNames[i]}</span> <span class="skill-val">${sign}${totalSaveMod}</span></button>`;
        }
        document.getElementById("sheet-saves").innerHTML = savesHTML;

        const skillList = [
            { name: "Acrobatics", statIdx: 1, subType: "acrobatics" }, { name: "Animal Handling", statIdx: 4, subType: "animal-handling" },
            { name: "Arcana", statIdx: 3, subType: "arcana" }, { name: "Athletics", statIdx: 0, subType: "athletics" },
            { name: "Deception", statIdx: 5, subType: "deception" }, { name: "History", statIdx: 3, subType: "history" },
            { name: "Insight", statIdx: 4, subType: "insight" }, { name: "Intimidation", statIdx: 5, subType: "intimidation" },
            { name: "Investigation", statIdx: 3, subType: "investigation" }, { name: "Medicine", statIdx: 4, subType: "medicine" },
            { name: "Nature", statIdx: 3, subType: "nature" }, { name: "Perception", statIdx: 4, subType: "perception" },
            { name: "Performance", statIdx: 5, subType: "performance" }, { name: "Persuasion", statIdx: 5, subType: "persuasion" },
            { name: "Religion", statIdx: 3, subType: "religion" }, { name: "Sleight of Hand", statIdx: 1, subType: "sleight-of-hand" },
            { name: "Stealth", statIdx: 1, subType: "stealth" }, { name: "Survival", statIdx: 4, subType: "survival" }
        ];

        let skillsHTML = "";
        skillList.forEach(skill => {
            let totalSkillMod = statMods[skill.statIdx] + Math.floor(profBonus * getProfMultiplier(skill.subType));
            let sign = totalSkillMod >= 0 ? "+" : "";
            skillsHTML += `<button class="skill-btn" onclick="loadSkillToTray(${totalSkillMod})"><span>${skill.name}</span> <span class="skill-val">${sign}${totalSkillMod}</span></button>`;
        });
        document.getElementById("sheet-skills").innerHTML = skillsHTML;

        // --- WEAPONS & ACTIONS ---
        let actionsHTML = "<h4 style='color:#ffcc00; margin-bottom: 5px; margin-top: 15px; border-bottom: 1px solid #444; padding-bottom: 3px;'>Weapons & Actions</h4>";
        let allActions = [];
        let strMod = statMods[0]; let dexMod = statMods[1];

        if (charData.inventory) {
            charData.inventory.forEach(item => {
                if (item.equipped && item.definition?.filterType === "Weapon") {
                    let dmgDice = item.definition.damage?.diceString || item.definition.baseItem?.damage?.diceString || "";
                    let isFinesse = item.definition.properties?.some(p => p.name === "Finesse") || false;
                    let isRanged = item.definition.attackType === 2; 
                    let baseMod = isRanged ? dexMod : strMod;
                    if (isFinesse) baseMod = Math.max(strMod, dexMod); 
                    
                    let magicBonus = item.definition.grantedModifiers?.find(m => m.type === "bonus" && m.subType === "magic")?.value || 0;
                    let totalDamageMod = baseMod + magicBonus;
                    let attackMod = baseMod + profBonus + magicBonus;

                    allActions.push({ name: item.definition.name, type: "Weapon", dice: dmgDice, mod: totalDamageMod, attackMod: attackMod, uses: 0 });
                }
            });
        }
        
        if (charData.actions) {
            ['class', 'race', 'feat'].forEach(type => {
                if (charData.actions[type]) {
                    charData.actions[type].forEach(act => {
                        if (act.name) {
                            let maxUses = act.limitedUse?.maxUses || 0;
                            if (act.limitedUse?.useProficiencyBonus) maxUses = profBonus;
                            else if (act.limitedUse?.statModifierUsesId) {
                                let statBonus = statMods[act.limitedUse.statModifierUsesId - 1] || 0;
                                maxUses = Math.max(1, statBonus);
                            }
                            allActions.push({ name: act.name, type: "Action", dice: "", mod: 0, attackMod: null, uses: maxUses });
                        }
                    });
                }
            });
        }

        let uniqueActions = Array.from(new Set(allActions.map(a => a.name))).map(name => allActions.find(a => a.name === name));
        let savedCheckboxes = JSON.parse(localStorage.getItem("dndCheckboxStates") || "{}");

        uniqueActions.forEach(act => {
            let btnHTML = "";
            let buttons = [];

            if (act.type === "Weapon" && act.attackMod !== null) {
                let atkSign = act.attackMod >= 0 ? "+" : "";
                buttons.push(`<button class="roll-action-btn" style="background:#444; border: 1px solid #666; margin-right: 4px;" onclick="loadSkillToTray(${act.attackMod})">⚔️ ${atkSign}${act.attackMod}</button>`);
            }
            if (act.dice) {
                let sign = act.mod >= 0 ? "+" : "";
                buttons.push(`<button class="roll-action-btn" onclick="loadActionToTray('${act.dice}', ${act.mod})">${act.dice} ${sign}${act.mod}</button>`);
            }
            if (buttons.length > 0) btnHTML = `<div style="display:flex;">${buttons.join('')}</div>`;

            let usesHTML = "";
            if (act.uses > 0) {
                usesHTML = `<div style="margin-top: 6px;">`;
                for(let i=0; i < act.uses; i++) {
                    let boxId = `chk-${act.name.replace(/[^a-zA-Z0-9]/g, '')}-${i}`;
                    let isChecked = savedCheckboxes[boxId] ? "checked" : "";
                    usesHTML += `<input type="checkbox" id="${boxId}" class="action-checkbox" onchange="saveCheckboxState(this)" ${isChecked}>`;
                }
                usesHTML += `</div>`;
            }

            actionsHTML += `<div class="action-card"><div><strong style="display:block; margin-bottom:3px; font-size:13px;">${act.name}</strong><span class="action-type">${act.type}</span>${usesHTML}</div>${btnHTML}</div>`;
        });

        // --- SPELLS ---
        let spellsHTML = "";
        let spellsByLevel = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};

        let spellSources = ['classSpells', 'raceSpells', 'featSpells'];
        spellSources.forEach(source => {
            if (charData[source]) {
                charData[source].forEach(cs => {
                    let spellList = cs.spells || [cs]; 
                    spellList.forEach(spellObj => {
                        let def = spellObj.definition || spellObj;
                        if (def && (def.level === 0 || spellObj.alwaysPrepared || spellObj.prepared || source !== 'classSpells')) {
                            let diceString = "";
                            if (def.modifiers) {
                                let dmgMod = def.modifiers.find(m => m.type === "damage" || m.type === "healing");
                                if (dmgMod && dmgMod.die) diceString = dmgMod.die.diceString;
                            }
                            let maxUses = spellObj.limitedUse?.maxUses || 0;
                            spellsByLevel[def.level].push({ name: def.name, level: def.level, dice: diceString, uses: maxUses });
                        }
                    });
                });
            }
        });

        let casterLevel = 0; let warlockLevel = 0;
        if (charData.classes) {
            charData.classes.forEach(cls => {
                let name = cls.definition.name.toLowerCase();
                let lvl = cls.level;
                if (["wizard", "cleric", "druid", "sorcerer", "bard"].includes(name)) casterLevel += lvl;
                else if (["paladin", "ranger"].includes(name)) casterLevel += Math.floor(lvl / 2);
                else if (name === "artificer") casterLevel += Math.ceil(lvl / 2);
                else if (cls.subclassDefinition && ["eldritch knight", "arcane trickster"].includes(cls.subclassDefinition.name.toLowerCase())) casterLevel += Math.floor(lvl / 3);
                else if (name === "warlock") warlockLevel += lvl;
            });
        }

        const slotTable = [
            [0,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0],
            [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0], [4,3,3,3,1,0,0,0,0],
            [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0],
            [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1],
            [4,3,3,3,3,2,2,1,1]
        ];

        let warlockSlots = 0; let warlockSlotLevel = 0;
        if (warlockLevel > 0) {
            warlockSlots = warlockLevel < 2 ? 1 : (warlockLevel < 11 ? 2 : (warlockLevel < 17 ? 3 : 4));
            warlockSlotLevel = Math.ceil(warlockLevel / 2);
            if (warlockSlotLevel > 5) warlockSlotLevel = 5;
        }

        for (let lvl = 0; lvl <= 9; lvl++) {
            let levelSpells = spellsByLevel[lvl];
            if (levelSpells.length === 0) continue; 
            let uniqueSpells = Array.from(new Set(levelSpells.map(s => s.name))).map(name => levelSpells.find(s => s.name === name));

            let maxSlots = 0;
            if (lvl > 0 && casterLevel > 0 && casterLevel <= 20) maxSlots = slotTable[casterLevel][lvl - 1] || 0;
            if (lvl === warlockSlotLevel) maxSlots += warlockSlots; 

            let slotBoxesHTML = "";
            if (lvl > 0 && maxSlots > 0) {
                slotBoxesHTML = `<div style="display:flex; gap: 2px;">`;
                for (let i = 0; i < maxSlots; i++) {
                    let boxId = `chk-spell-lvl${lvl}-${i}`;
                    let isChecked = savedCheckboxes[boxId] ? "checked" : "";
                    slotBoxesHTML += `<input type="checkbox" id="${boxId}" class="action-checkbox lvl-${lvl}-slot" onchange="saveCheckboxState(this)" ${isChecked} style="border-color: #4477ff; width:16px; height:16px;">`;
                }
                slotBoxesHTML += `</div>`;
            }

            let lvlHeader = lvl === 0 ? "Cantrips" : `Level ${lvl} Spells`;
            spellsHTML += `<div style="background:#15151a; padding:8px 10px; margin-top:15px; margin-bottom:5px; border-bottom: 2px solid #4477ff; color:#ffcc00; font-size:14px; font-weight:bold; display: flex; justify-content: space-between; align-items: center; border-radius: 4px;"><span>${lvlHeader}</span>${slotBoxesHTML}</div>`;

            uniqueSpells.forEach(spell => {
                let btnHTML = "";
                let personalUsesHTML = "";
                if (spell.uses > 0) {
                    personalUsesHTML = `<div style="margin-top: 4px; display:flex; gap:2px;">`;
                    for(let i=0; i < spell.uses; i++) {
                        let boxId = `chk-personalspell-${spell.name.replace(/[^a-zA-Z0-9]/g, '')}-${i}`;
                        let isChecked = savedCheckboxes[boxId] ? "checked" : "";
                        personalUsesHTML += `<input type="checkbox" id="${boxId}" class="action-checkbox personal-spell-slot" onchange="saveCheckboxState(this)" ${isChecked} style="border-color: #aa44ff; width:14px; height:14px;">`;
                    }
                    personalUsesHTML += `</div>`;
                }
                
                if (spell.dice) btnHTML = `<button class="roll-action-btn" style="background:#4477ff;" onclick="castSpell(${spell.level}, '${spell.dice}')">Roll ${spell.dice}</button>`;
                else if (spell.level > 0) btnHTML = `<button class="roll-action-btn" style="background:#555; border: 1px solid #777;" onclick="castSpell(${spell.level}, null)">Use Slot</button>`;

                spellsHTML += `<div class="action-card" style="border-left: 3px solid #4477ff;"><div><strong style="display:block; font-size:13px;">${spell.name}</strong>${personalUsesHTML}</div>${btnHTML}</div>`;
            });
        }

        let sheetActions = document.getElementById("sheet-actions");
        if (sheetActions) sheetActions.innerHTML = actionsHTML + spellsHTML;

        currentPlayerName = charData.name;
        localStorage.setItem("tavernPlayerName", currentPlayerName);
        document.getElementById("display-name").innerText = currentPlayerName;
        document.getElementById("sheet-name").innerText = charData.name;

        if (isManual) alert(`Successfully Synced ${charData.name}!`);

    } catch (error) {
        console.error(error);
        if (isManual) alert(`Sync Failed! \n${error.message}`);
        document.getElementById("display-name").innerText = currentPlayerName; 
    }
}

if (localStorage.getItem("dndCharId") || localStorage.getItem("dndCharData")) importDndBeyond(false); 

// 10. ACTION LOADERS
function loadSkillToTray(modifier = 0) {
    clearPool(); addToPool(20); 
    let modInput = document.getElementById("modifier-input");
    if(modInput) modInput.value = modifier;
}

function loadActionToTray(diceString, modifier = 0) {
    if (!diceString) return;
    let parts = diceString.split('d');
    if (parts.length === 2) {
        let count = parseInt(parts[0]) || 1;
        let sides = parseInt(parts[1]);
        for (let i = 0; i < count; i++) addToPool(sides);
    }
    let modInput = document.getElementById("modifier-input");
    if(modInput) {
        let currentMod = parseInt(modInput.value) || 0;
        modInput.value = currentMod + modifier; 
    }
}

function castSpell(level, diceString) {
    if (diceString && diceString !== "null") loadActionToTray(diceString, 0); 
    if (level > 0) {
        let slots = document.querySelectorAll(`.lvl-${level}-slot`);
        if (slots.length > 0) {
            let usedSlot = false;
            for (let i = 0; i < slots.length; i++) {
                if (!slots[i].checked) {
                    slots[i].checked = true;
                    saveCheckboxState(slots[i]); 
                    usedSlot = true; break; 
                }
            }
            if (!usedSlot) alert(`Warning: You are completely out of Level ${level} spell slots!`);
        }
    }
}