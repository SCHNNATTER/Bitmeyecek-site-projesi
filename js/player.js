// ==========================================
// 🎲 DICE TRAY INTEGRATION HELPERS
// ==========================================

function quickRoll(diceType, modifier, label) {
    if (typeof clearPool === 'function') clearPool();
    if (typeof addToPool === 'function') addToPool(diceType);
    
    const modInput = document.getElementById('modifier-input');
    if (modInput) modInput.value = modifier;
    
    console.log(`Prepped roll: ${label} (1d${diceType} + ${modifier})`);
}

function quickDamageRoll(damageStr, label) {
    if (typeof clearPool === 'function') clearPool();
    
    const match = damageStr.toLowerCase().replace(/\s/g, '').match(/(\d+)d(\d+)(?:([+-])(\d+))?/);
    
    if (match) {
        const count = parseInt(match[1]);
        const sides = parseInt(match[2]);
        const sign = match[3] || '+';
        const mod = match[4] ? parseInt(match[4]) : 0;
        const finalMod = sign === '-' ? -mod : mod;

        for(let i = 0; i < count; i++) {
            if (typeof addToPool === 'function') addToPool(sides);
        }
        
        const modInput = document.getElementById('modifier-input');
        if (modInput) modInput.value = finalMod;
        
        console.log(`Prepped damage: ${label} (${damageStr})`);
    } else {
        alert("Couldn't parse those damage dice! Try rolling manually.");
    }
}

function toggleResource(charId, resourceId, element) {
    const isChecked = element.checked;
    localStorage.setItem(`res_${charId}_${resourceId}`, isChecked);
}

function handleSpellCast(charId, level, spellName) {
    const char = vaultCharacters[charId];
    if (!char) return;

    const atkBonus = char.spellcasting?.attackBonus || 0;
    quickRoll(20, atkBonus, `${spellName} (Attack)`);

    if (level > 0) {
        const slots = char.spellcasting?.slots || { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 };
        let slotSpent = false;
        const maxForLevel = slots[level] || 0;

        for (let i = 0; i < maxForLevel; i++) {
            const resId = `spell_${level}_${i}`;
            const checkbox = document.getElementById(resId);
            const isUsed = localStorage.getItem(`res_${charId}_${resId}`) === 'true';

            if (!isUsed) {
                localStorage.setItem(`res_${charId}_${resId}`, 'true');
                if (checkbox) {
                    checkbox.checked = true;
                    checkbox.style.background = '#4477ff'; 
                }
                slotSpent = true;
                break;
            }
        }
        if (!slotSpent) alert(`No Level ${level} slots remaining!`);
    }
}

// ==========================================
// 🛡️ PLAYER HUB & VAULT NAVIGATION
// ==========================================

let vaultCharacters = {}; 

if (typeof database !== 'undefined') {
    database.ref('vault_characters').on('value', (snapshot) => {
        vaultCharacters = snapshot.val() || {};
        renderVaultSidebar();
        renderActiveCharacterSheet(); 
    });
}

function openPlayerScreen() {
    const modal = document.getElementById('player-modal');
    if (modal) {
        modal.classList.remove('hidden-modal');
        backToPlayerHub(); 
    }
}

function closePlayerScreen() {
    const modal = document.getElementById('player-modal');
    if (modal) modal.classList.add('hidden-modal');
}

function openCharacterVault() {
    document.getElementById('player-hub-view').style.display = 'none';
    document.getElementById('player-vault-view').style.display = 'flex';
    renderVaultSidebar(); 
}

function backToPlayerHub() {
    document.getElementById('player-hub-view').style.display = 'flex';
    document.getElementById('player-vault-view').style.display = 'none';
}

// ==========================================
// 📖 CHARACTER VAULT RENDERING
// ==========================================

function renderVaultSidebar() {
    const sidebar = document.getElementById('character-vault-grid'); 
    if (!sidebar) return;

    // The NEW "Create Character" Button
    let html = `
        <div style="border: 2px dashed #444; border-radius: 6px; cursor: pointer; padding: 15px; text-align: center; transition: 0.2s; min-height: 100px; display: flex; flex-direction: column; justify-content: center;" onmouseover="this.style.borderColor='#44ff44'" onmouseout="this.style.borderColor='#444'" onclick="createNewCharacter()">
            <span style="font-size: 24px; color: #44ff44;">+</span>
            <span style="color: #888; font-size: 14px; margin-top: 5px;">Create New Character</span>
        </div>
    `;

    Object.keys(vaultCharacters).forEach(id => {
        const char = vaultCharacters[id];
        html += `
            <div style="position: relative; background: #1a1a24; border: 1px solid #333; border-left: 4px solid #ffcc00; border-radius: 6px; padding: 15px; display: flex; flex-direction: column;">
                <button onclick="deleteVaultCharacter('${id}')" style="position: absolute; top: 5px; right: 8px; background: transparent; border: none; color: #882222; cursor: pointer; font-size: 14px; font-weight: bold; transition: 0.2s;" onmouseover="this.style.color='#ff4444'" onmouseout="this.style.color='#882222'">✖</button>
                <h3 style="margin: 0 0 5px 0; color: #fff; font-size: 18px;">${char.name || "Unknown"}</h3>
                <div style="color: #888; font-size: 12px; margin-bottom: 15px;">${char.classLevel || ""} • ${char.species || ""}</div>
                <div style="display: flex; gap: 5px; margin-top: auto;">
                    <button class="ui-btn" style="flex: 1; background: #222; border-color: #555; font-size: 13px;" onclick="previewVaultCharacter('${id}')">👁️ View</button>
                    <button class="ui-btn" style="flex: 1; background: #4477ff; font-size: 13px; font-weight: bold;" onclick="playAsCharacter('${id}')">🎮 Play</button>
                </div>
            </div>
        `;
    });
    sidebar.innerHTML = html;
}

function createNewCharacter() {
    const charName = prompt("Enter your new character's name:");
    if (!charName || charName.trim() === "") return;

    // The perfect blank canvas!
    const blankChar = {
        name: charName,
        classLevel: "Adventurer 1",
        species: "Humanoid",
        hp: { current: 10, max: 10, temp: 0 },
        ac: 10,
        speed: "30 ft.",
        initiative: 0,
        stats: {
            str: { score: 10, mod: 0, saveProf: false },
            dex: { score: 10, mod: 0, saveProf: false },
            con: { score: 10, mod: 0, saveProf: false },
            int: { score: 10, mod: 0, saveProf: false },
            wis: { score: 10, mod: 0, saveProf: false },
            cha: { score: 10, mod: 0, saveProf: false }
        },
        skills: [],
        actions: [],
        features: [],
        spellcasting: { ability: "int", saveDc: 10, attackBonus: 2, slots: { 1: 0 } },
        spells: []
    };

    // Push it straight to your Firebase Vault
    database.ref('vault_characters').push(blankChar).then(() => {
        console.log(`Created new blank sheet for ${charName}!`);
    }).catch(err => {
        alert("Failed to create character: " + err.message);
    });
}

function deleteVaultCharacter(id) {
    const charName = vaultCharacters[id]?.name || "this character";
    if (!confirm(`Are you sure you want to permanently delete ${charName}?`)) return;

    database.ref(`vault_characters/${id}`).remove().then(() => {
        console.log("Deleted from Firebase.");
        if (localStorage.getItem('tavernActiveCharId') === id) {
            localStorage.removeItem('tavernActiveCharId');
            renderActiveCharacterSheet();
        }
    }).catch(err => {
        alert("Delete failed: " + err.message);
    });
}

function previewVaultCharacter(characterId) {
    const display = document.getElementById('vault-character-display');
    const char = vaultCharacters[characterId];
    if (!char || !display) return;
    const formatMod = (mod) => (mod >= 0 ? `+${mod}` : mod);

    let statsHtml = '';
    const statsOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    statsOrder.forEach(stat => {
        if (char.stats && char.stats[stat]) {
            const s = char.stats[stat];
            const saveIcon = s.saveProf ? '<span style="color:#ffcc00;">★</span>' : '';
            statsHtml += `
                <div style="background: #111; padding: 10px 5px; border-radius: 4px; border: 1px solid #333; text-align: center;">
                    <div style="color: #aaa; font-size: 11px; font-weight: bold; text-transform: uppercase;">${stat} ${saveIcon}</div>
                    <div style="color: white; font-size: 18px;">${s.score}</div>
                    <div style="color: #4477ff; font-size: 12px; font-weight: bold;">${formatMod(s.mod)}</div>
                </div>`;
        }
    });

    let actionsHtml = '';
    if (char.actions) {
        char.actions.forEach(act => {
            actionsHtml += `
                <div style="background: #1a1a24; padding: 10px; border-radius: 4px; border-left: 3px solid #ff4444; border: 1px solid #333; margin-bottom: 6px;">
                    <strong style="color: white; font-size: 14px;">${act.name}</strong><br>
                    ${act.attackMod !== undefined ? `<span style="color: #ff4444; font-weight: bold;">${formatMod(act.attackMod)}</span> to hit` : ''}
                    ${act.damage ? `<span style="color: #fff; font-weight: bold; margin-left: 10px;">${act.damage}</span>` : ''}
                </div>`;
        });
    }

    let featuresHtml = '';
    if (char.features) {
        char.features.forEach(feat => {
            featuresHtml += `
                <div style="margin-bottom: 10px; border-bottom: 1px solid #222; padding-bottom: 5px;">
                    <strong style="color: #ffcc00; font-size: 13px;">${feat.name}</strong>
                    <p style="color: #aaa; font-size: 11px; margin: 0;">${feat.description}</p>
                </div>`;
        });
    }

    let spellsHtml = '';
    if (char.spells && char.spells.length > 0) {
        spellsHtml += `<div style="margin-top: 40px; border-top: 2px solid #4477ff; padding-top: 20px;"><h2 style="color: #4477ff;">📖 Spellbook</h2><div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">`;
        char.spells.forEach(spell => {
            spellsHtml += `
                <div style="background: #1a1a24; padding: 10px; border-radius: 4px; border: 1px solid #333;">
                    <strong style="color: white;">${spell.name}</strong><br>
                    <span style="color: #888; font-size: 10px;">${spell.level === 0 ? 'Cantrip' : 'Level ' + spell.level}</span>
                    <p style="color: #aaa; font-size: 11px;">${spell.description || ''}</p>
                </div>`;
        });
        spellsHtml += `</div></div>`;
    }

    display.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding-bottom: 50px;">
            <h1 style="color: white;">${char.name}</h1>
            <h3 style="color: #888;">${char.classLevel} • ${char.species}</h3>
            <div style="display: flex; gap: 10px; margin-bottom: 20px;">
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 1;">AC: ${char.ac}</div>
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 1;">HP: ${char.hp?.current}/${char.hp?.max}</div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(6, 1fr); gap: 8px; margin-bottom: 20px;">${statsHtml}</div>
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div><h3>Actions</h3>${actionsHtml}</div>
                <div><h3>Features</h3>${featuresHtml}</div>
            </div>
            ${spellsHtml}
        </div>`;
}

function playAsCharacter(id) {
    localStorage.setItem('tavernActiveCharId', id);
    renderActiveCharacterSheet();
    closePlayerScreen();
    const charSidebar = document.getElementById('char-sidebar');
    if (charSidebar && (charSidebar.style.display === 'none' || charSidebar.style.display === '')) {
        toggleCharSheet(); 
    }
}

// ==========================================
// ⚔️ ACTIVE CHARACTER SIDEBAR RENDERER
// ==========================================

function renderActiveCharacterSheet() {
    const sheetContent = document.getElementById('pc-sheet-content');
    if (!sheetContent) return;

    const activeId = localStorage.getItem('tavernActiveCharId');
    const char = vaultCharacters[activeId];

    if (!char) {
        sheetContent.innerHTML = `<div style="text-align: center; padding: 40px; color: #888;">No character selected.</div>`;
        return;
    }

    const formatMod = (mod) => (mod >= 0 ? `+${mod}` : mod);

    let statsHtml = '';
    const statsOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    statsOrder.forEach(stat => {
        if (char.stats && char.stats[stat]) {
            const s = char.stats[stat];
            statsHtml += `
                <button class="ui-btn" style="background: #111; padding: 8px 5px; border-radius: 4px; border: 1px solid #333; display: flex; flex-direction: column; align-items: center;" onclick="quickRoll(20, ${s.mod}, '${stat.toUpperCase()} Check')">
                    <div style="color: #aaa; font-size: 10px; font-weight: bold; text-transform: uppercase;">${stat}</div>
                    <div style="color: white; font-size: 16px;">${s.score}</div>
                    <div style="color: #4477ff; font-size: 12px; font-weight: bold;">${formatMod(s.mod)}</div>
                </button>`;
        }
    });

    let savesHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; row-gap: 2px;">';
    statsOrder.forEach(stat => {
        if (char.stats && char.stats[stat]) {
            const s = char.stats[stat];
            const isProf = s.saveProf;
            savesHtml += `
                <div style="display: flex; justify-content: space-between; padding: 4px; border-bottom: 1px solid #222; cursor: pointer;" onclick="quickRoll(20, ${s.mod}, '${stat.toUpperCase()} Save')">
                    <span style="font-size: 12px; color: ${isProf ? '#ffcc00' : '#aaa'};">${isProf ? '★ ' : ''}${stat.toUpperCase()}</span>
                    <strong style="color: white; font-size: 13px;">${formatMod(s.mod)}</strong>
                </div>`;
        }
    });
    savesHtml += '</div>';

    let skillsHtml = '<div style="display: grid; grid-template-columns: 1fr 1fr; column-gap: 10px; row-gap: 2px;">';
    if (char.skills) {
        char.skills.forEach(skill => {
            skillsHtml += `
                <div style="display: flex; justify-content: space-between; padding: 4px; border-bottom: 1px solid #222; cursor: pointer;" onclick="quickRoll(20, ${skill.mod}, '${skill.name}')">
                    <span style="font-size: 12px; color: ${skill.prof ? '#ffcc00' : '#aaa'}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${skill.prof ? '★ ' : ''}${skill.name}</span>
                    <strong style="color: white; font-size: 13px;">${formatMod(skill.mod)}</strong>
                </div>`;
        });
    }
    skillsHtml += '</div>';

    let actionsHtml = '';
    if (char.actions) {
        char.actions.forEach(act => {
            actionsHtml += `
                <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border-left: 3px solid #ff4444; border: 1px solid #333; margin-bottom: 6px;">
                    <div style="color: white; font-size: 13px; font-weight: bold; margin-bottom: 5px;">${act.name}</div>
                    <div style="display: flex; gap: 5px;">
                        ${act.attackMod !== undefined ? `<button class="ui-btn" style="flex: 1; font-size: 11px; padding: 4px;" onclick="quickRoll(20, ${act.attackMod}, '${act.name} Atk')">⚔️ Atk: ${formatMod(act.attackMod)}</button>` : ''}
                        ${act.damage ? `<button class="ui-btn" style="flex: 1; font-size: 11px; padding: 4px;" onclick="quickDamageRoll('${act.damage}', '${act.name} Dmg')">🩸 Dmg: ${act.damage}</button>` : ''}
                    </div>
                </div>`;
        });
    }

    let spellsHtml = '';
    if (char.spells && char.spells.length > 0) {
        spellsHtml += `<h4 style="color: #4477ff; margin-top: 20px; border-bottom: 1px solid #333; padding-bottom: 4px;">Spellbook & Slots</h4>`;
        const spellLevels = {};
        char.spells.forEach(s => {
            const lvl = s.level === 0 ? "Cantrips" : "Level " + s.level;
            if (!spellLevels[lvl]) spellLevels[lvl] = [];
            spellLevels[lvl].push(s);
        });

        const slots = char.spellcasting?.slots || { 1: 4, 2: 3, 3: 3, 4: 3, 5: 2, 6: 1, 7: 1, 8: 1, 9: 1 };
        
        Object.keys(spellLevels).sort((a, b) => {
            if (a === "Cantrips") return -1;
            if (b === "Cantrips") return 1;
            return parseInt(a.replace("Level ", "")) - parseInt(b.replace("Level ", ""));
        }).forEach(lvl => {
            const lvlNum = lvl === "Cantrips" ? 0 : parseInt(lvl.replace("Level ", ""));
            let slotTrackers = '';
            if (lvlNum > 0 && slots[lvlNum]) {
                for(let i = 0; i < slots[lvlNum]; i++) {
                    const resId = `spell_${lvlNum}_${i}`;
                    const isChecked = localStorage.getItem(`res_${activeId}_${resId}`) === 'true' ? 'checked' : '';
                    slotTrackers += `
                        <input type="checkbox" id="${resId}" 
                            style="appearance: none; width: 12px; height: 12px; border: 1px solid #4477ff; border-radius: 2px; background: ${isChecked ? '#4477ff' : 'transparent'}; cursor: pointer; transition: 0.2s;" 
                            ${isChecked} 
                            onclick="this.style.background = this.checked ? '#4477ff' : 'transparent'; toggleResource('${activeId}', '${resId}', this)">`;
                }
            }

            spellsHtml += `<div style="display: flex; justify-content: space-between; margin: 12px 0 6px 0;"><span style="color: #ffcc00; font-size: 11px; font-weight: bold; text-transform: uppercase;">${lvl}</span><div style="display: flex; gap: 4px;">${slotTrackers}</div></div>`;
            
            spellLevels[lvl].forEach(spell => {
                const hasDmg = spell.damage && spell.damage.trim() !== "";
                spellsHtml += `
                    <div style="background: #1a1a24; padding: 6px 8px; border-radius: 4px; border: 1px solid #333; margin-bottom: 4px; display: flex; justify-content: space-between; align-items: center;">
                        <span style="color: white; font-size: 12px; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${spell.name}</span>
                        <div style="display: flex; gap: 4px;">
                            <button class="ui-btn" style="padding: 2px 6px; font-size: 10px; color: #4477ff; border-color: #4477ff;" onclick="handleSpellCast('${activeId}', ${lvlNum}, '${spell.name}')">✨ Cast</button>
                            ${hasDmg ? `<button class="ui-btn" style="padding: 2px 6px; font-size: 10px; color: #ff4444; border-color: #ff4444;" onclick="quickDamageRoll('${spell.damage}', '${spell.name}')">🩸 Dmg</button>` : ''}
                        </div>
                    </div>`;
            });
        });
    }

    sheetContent.innerHTML = `
        <div style="padding-bottom: 30px;">
            <div style="margin-bottom: 15px;">
                <h2 style="color: white; margin: 0;">${char.name}</h2>
                <div style="color: #888; font-size: 11px;">AC: ${char.ac} | HP: <span style="color: #44ff44;">${char.hp?.current}</span>/${char.hp?.max}</div>
            </div>
            <h4 style="color: #ffcc00; margin: 0 0 5px 0;">Attributes</h4>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 25px;">${statsHtml}</div>
            <h4 style="color: #ffcc00; margin: 0 0 5px 0;">Saving Throws</h4>
            <div style="margin-bottom: 15px;">${savesHtml}</div>
            <h4 style="color: #ffcc00; margin: 0 0 5px 0;">Skills</h4>
            <div style="margin-bottom: 15px;">${skillsHtml}</div>
            <h4 style="color: #ffcc00; margin: 0 0 5px 0;">Actions</h4>
            ${actionsHtml}
            ${spellsHtml}
        </div>`;
}