// ==========================================
// D&D BEYOND CHARACTER SHEET
// ==========================================
function saveCheckboxState(checkboxElement) {
    let states = JSON.parse(localStorage.getItem("dndCheckboxStates") || "{}");
    states[checkboxElement.id] = checkboxElement.checked;
    localStorage.setItem("dndCheckboxStates", JSON.stringify(states));
}

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
            if (!response.ok) throw new Error(`Node Proxy failed!`);
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
            statsHTML += `<button class="stat-btn" onclick="loadSkillToTray(${modifier})">${statNames[i]}<br><span style="color:#ffcc00; font-size:16px;">${sign}${modifier}</span></button>`;
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
                    
                    allActions.push({ name: item.definition.name, type: "Weapon", dice: dmgDice, mod: (baseMod + magicBonus), attackMod: (baseMod + profBonus + magicBonus), uses: 0 });
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
                            else if (act.limitedUse?.statModifierUsesId) maxUses = Math.max(1, statMods[act.limitedUse.statModifierUsesId - 1] || 0);
                            allActions.push({ name: act.name, type: "Action", dice: "", mod: 0, attackMod: null, uses: maxUses });
                        }
                    });
                }
            });
        }

        let uniqueActions = Array.from(new Set(allActions.map(a => a.name))).map(name => allActions.find(a => a.name === name));
        let savedCheckboxes = JSON.parse(localStorage.getItem("dndCheckboxStates") || "{}");

        uniqueActions.forEach(act => {
            let btnHTML = ""; let buttons = [];
            if (act.type === "Weapon" && act.attackMod !== null) buttons.push(`<button class="roll-action-btn" style="background:#444; border: 1px solid #666; margin-right: 4px;" onclick="loadSkillToTray(${act.attackMod})">⚔️ ${act.attackMod >= 0 ? "+" : ""}${act.attackMod}</button>`);
            if (act.dice) buttons.push(`<button class="roll-action-btn" onclick="loadActionToTray('${act.dice}', ${act.mod})">${act.dice} ${act.mod >= 0 ? "+" : ""}${act.mod}</button>`);
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

        let spellsHTML = "";
        let spellsByLevel = {0:[], 1:[], 2:[], 3:[], 4:[], 5:[], 6:[], 7:[], 8:[], 9:[]};

        ['classSpells', 'raceSpells', 'featSpells'].forEach(source => {
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
                            spellsByLevel[def.level].push({ name: def.name, level: def.level, dice: diceString, uses: spellObj.limitedUse?.maxUses || 0 });
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

        const slotTable = [[0,0,0,0,0,0,0,0,0], [2,0,0,0,0,0,0,0,0], [3,0,0,0,0,0,0,0,0], [4,2,0,0,0,0,0,0,0], [4,3,0,0,0,0,0,0,0], [4,3,2,0,0,0,0,0,0], [4,3,3,0,0,0,0,0,0], [4,3,3,1,0,0,0,0,0], [4,3,3,2,0,0,0,0,0], [4,3,3,3,1,0,0,0,0], [4,3,3,3,2,0,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,0,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,0,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,0], [4,3,3,3,2,1,1,1,1], [4,3,3,3,3,1,1,1,1], [4,3,3,3,3,2,1,1,1], [4,3,3,3,3,2,2,1,1]];
        let warlockSlots = warlockLevel > 0 ? (warlockLevel < 2 ? 1 : (warlockLevel < 11 ? 2 : (warlockLevel < 17 ? 3 : 4))) : 0;
        let warlockSlotLevel = warlockLevel > 0 ? Math.min(5, Math.ceil(warlockLevel / 2)) : 0;

        for (let lvl = 0; lvl <= 9; lvl++) {
            let levelSpells = spellsByLevel[lvl];
            if (levelSpells.length === 0) continue; 
            let uniqueSpells = Array.from(new Set(levelSpells.map(s => s.name))).map(name => levelSpells.find(s => s.name === name));
            let maxSlots = (lvl > 0 && casterLevel > 0 && casterLevel <= 20) ? slotTable[casterLevel][lvl - 1] : 0;
            if (lvl === warlockSlotLevel) maxSlots += warlockSlots; 

            let slotBoxesHTML = "";
            if (lvl > 0 && maxSlots > 0) {
                slotBoxesHTML = `<div style="display:flex; gap: 2px;">`;
                for (let i = 0; i < maxSlots; i++) {
                    let boxId = `chk-spell-lvl${lvl}-${i}`;
                    slotBoxesHTML += `<input type="checkbox" id="${boxId}" class="action-checkbox lvl-${lvl}-slot" onchange="saveCheckboxState(this)" ${savedCheckboxes[boxId] ? "checked" : ""} style="border-color: #4477ff; width:16px; height:16px;">`;
                }
                slotBoxesHTML += `</div>`;
            }

            spellsHTML += `<div style="background:#15151a; padding:8px 10px; margin-top:15px; margin-bottom:5px; border-bottom: 2px solid #4477ff; color:#ffcc00; font-size:14px; font-weight:bold; display: flex; justify-content: space-between; align-items: center; border-radius: 4px;"><span>${lvl === 0 ? "Cantrips" : `Level ${lvl} Spells`}</span>${slotBoxesHTML}</div>`;

            uniqueSpells.forEach(spell => {
                let btnHTML = ""; let personalUsesHTML = "";
                if (spell.uses > 0) {
                    personalUsesHTML = `<div style="margin-top: 4px; display:flex; gap:2px;">`;
                    for(let i=0; i < spell.uses; i++) {
                        let boxId = `chk-personalspell-${spell.name.replace(/[^a-zA-Z0-9]/g, '')}-${i}`;
                        personalUsesHTML += `<input type="checkbox" id="${boxId}" class="action-checkbox personal-spell-slot" onchange="saveCheckboxState(this)" ${savedCheckboxes[boxId] ? "checked" : ""} style="border-color: #aa44ff; width:14px; height:14px;">`;
                    }
                    personalUsesHTML += `</div>`;
                }
                
                if (spell.dice) btnHTML = `<button class="roll-action-btn" style="background:#4477ff;" onclick="castSpell(${spell.level}, '${spell.dice}')">Roll ${spell.dice}</button>`;
                else if (spell.level > 0) btnHTML = `<button class="roll-action-btn" style="background:#555; border: 1px solid #777;" onclick="castSpell(${spell.level}, null)">Use Slot</button>`;

                spellsHTML += `<div class="action-card" style="border-left: 3px solid #4477ff;"><div><strong style="display:block; font-size:13px;">${spell.name}</strong>${personalUsesHTML}</div>${btnHTML}</div>`;
            });
        }

        document.getElementById("sheet-actions").innerHTML = actionsHTML + spellsHTML;
        currentPlayerName = charData.name;
        localStorage.setItem("tavernPlayerName", currentPlayerName);
        document.getElementById("sheet-name").innerText = charData.name;
        applyRoleStyling(userRole);

        if (isManual) alert(`Successfully Synced ${charData.name}!`);
    } catch (error) {
        console.error(error);
        if (isManual) alert(`Sync Failed! \n${error.message}`);
    }
}

if (localStorage.getItem("dndCharId") || localStorage.getItem("dndCharData")) importDndBeyond(false); 

function loadSkillToTray(modifier = 0) {
    clearPool(); addToPool(20); 
    document.getElementById("modifier-input").value = modifier;
}

function loadActionToTray(diceString, modifier = 0) {
    if (!diceString) return;
    let parts = diceString.split('d');
    if (parts.length === 2) {
        for (let i = 0; i < (parseInt(parts[0]) || 1); i++) addToPool(parseInt(parts[1]));
    }
    let modInput = document.getElementById("modifier-input");
    if(modInput) modInput.value = (parseInt(modInput.value) || 0) + modifier; 
}

function castSpell(level, diceString) {
    if (diceString && diceString !== "null") loadActionToTray(diceString, 0); 
    if (level > 0) {
        let slots = document.querySelectorAll(`.lvl-${level}-slot`);
        if (slots.length > 0) {
            let usedSlot = false;
            for (let i = 0; i < slots.length; i++) {
                if (!slots[i].checked) {
                    slots[i].checked = true; saveCheckboxState(slots[i]); usedSlot = true; break; 
                }
            }
            if (!usedSlot) alert(`Warning: You are completely out of Level ${level} spell slots!`);
        }
    }
}