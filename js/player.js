// ==========================================
// 🛡️ PLAYER HUB, VAULT & AI IMPORTER (FIREBASE EDITION)
// ==========================================

let vaultCharacters = {}; // Stores all characters from the database locally

// --- 1. FIREBASE LISTENER ---
if (typeof database !== 'undefined') {
    database.ref('vault_characters').on('value', (snapshot) => {
        vaultCharacters = snapshot.val() || {};
        renderVaultSidebar();
        renderActiveCharacterSheet(); // 🆕 Automatically updates the active sidebar sheet!
    });
}

// --- MAIN HUB VISIBILITY ---
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
    renderVaultSidebar(); // Refresh the list when opened
}

function backToPlayerHub() {
    document.getElementById('player-hub-view').style.display = 'flex';
    document.getElementById('player-vault-view').style.display = 'none';
}

function openAiImportModal() {
    const subModal = document.getElementById('ai-import-submodal');
    if (subModal) subModal.classList.remove('hidden-modal');
}

function closeAiImportModal() {
    const subModal = document.getElementById('ai-import-submodal');
    if (subModal) subModal.classList.add('hidden-modal');
}

// --- 2. IMPORT LOGIC (SAVING TO CLOUD) ---
function importAiCharacter() {
    let rawData = document.getElementById('ai-char-json').value;
    if (!rawData.trim()) return alert("Please paste the AI-generated JSON first!");

    // MAGIC FIX: Strip out markdown formatting (```json and ```) and extra spaces
    rawData = rawData.replace(/```json/gi, '').replace(/```/g, '').trim();

    try {
        const charData = JSON.parse(rawData);
        
        // Push the new character to Firebase!
        database.ref('vault_characters').push(charData).then(() => {
            alert(`Successfully saved ${charData.name} to the Cloud Vault!`);
            document.getElementById('ai-char-json').value = "";
            closeAiImportModal();
        });

    } catch (error) {
        console.error("AI Import Failed:", error);
        alert("Import Failed! The AI did not provide valid JSON. Make sure you only pasted the code block.");
    }
}

// --- 3. RENDER THE LEFT SIDEBAR ---
function renderVaultSidebar() {
    // Note: You need to give the left panel wrapper an ID in your HTML to target it easily.
    // For now, we will target the grid container from earlier.
    const sidebar = document.getElementById('character-vault-grid'); 
    if (!sidebar) return;

    // Start with the Import Button
    let html = `
        <div style="border: 2px dashed #444; border-radius: 6px; cursor: pointer; padding: 15px; text-align: center; transition: 0.2s; min-height: 100px; display: flex; flex-direction: column; justify-content: center;" onmouseover="this.style.borderColor='#4477ff'" onmouseout="this.style.borderColor='#444'" onclick="openAiImportModal()">
            <span style="font-size: 24px; color: #4477ff;">+</span>
            <span style="color: #888; font-size: 14px; margin-top: 5px;">Import AI Character</span>
        </div>
    `;

    // Loop through Firebase data and build real cards
    Object.keys(vaultCharacters).forEach(id => {
        const char = vaultCharacters[id];
        const hp = char.hp || { current: 0, max: 0 };
        
        html += `
            <div style="background: #1a1a24; border: 1px solid #333; border-left: 4px solid #ffcc00; border-radius: 6px; padding: 15px; display: flex; flex-direction: column;">
                <h3 style="margin: 0 0 5px 0; color: #fff; font-size: 18px;">${char.name || "Unknown"}</h3>
                <div style="color: #888; font-size: 12px; margin-bottom: 15px;">${char.classLevel || ""} • ${char.species || ""}</div>
                <div style="display: flex; gap: 5px; margin-top: auto;">
                    <button class="ui-btn" style="flex: 1; background: #222; border-color: #555; font-size: 13px;" onclick="previewVaultCharacter('${id}')">👁️ View Details</button>
                    <button class="ui-btn" style="flex: 1; background: #4477ff; font-size: 13px; font-weight: bold;" onclick="playAsCharacter('${id}')">🎮 Play</button>
                </div>
            </div>
        `;
    });

    sidebar.innerHTML = html;
}

// --- 4. THE HIGH-DETAIL SHEET RENDERER (ARCHMAGE EDITION) ---
function previewVaultCharacter(characterId) {
    const display = document.getElementById('vault-character-display');
    const char = vaultCharacters[characterId];
    if (!char || !display) return;

    const formatMod = (mod) => (mod >= 0 ? `+${mod}` : mod);

    // Build Attributes
    let statsHtml = '';
    const statsOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    statsOrder.forEach(stat => {
        if (char.stats && char.stats[stat]) {
            const s = char.stats[stat];
            const saveIcon = s.saveProf ? '<span title="Saving Throw Proficiency" style="color:#ffcc00;">★</span>' : '';
            statsHtml += `
                <div style="background: #111; padding: 10px 5px; border-radius: 4px; border: 1px solid #333; text-align: center;">
                    <div style="color: #aaa; font-size: 11px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase;">${stat} ${saveIcon}</div>
                    <div style="color: white; font-size: 18px;">${s.score}</div>
                    <div style="color: #4477ff; font-size: 12px; font-weight: bold;">${formatMod(s.mod)}</div>
                </div>
            `;
        }
    });

    // Build Actions
    let actionsHtml = '';
    if (char.actions && char.actions.length > 0) {
        char.actions.forEach(act => {
            actionsHtml += `
                <div style="background: #1a1a24; padding: 10px; border-radius: 4px; border-left: 3px solid #ff4444; border: 1px solid #333; margin-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <strong style="color: white; font-size: 14px;">${act.name}</strong>
                        <span style="background: #222; padding: 2px 6px; border-radius: 4px; font-size: 10px; color: #aaa;">${act.type || 'Action'}</span>
                    </div>
                    ${act.attackMod ? `<span style="color: #ff4444; font-weight: bold; font-size: 14px;">${formatMod(act.attackMod)}</span> <span style="color: #888; font-size: 11px; margin-right: 8px;">to hit</span>` : ''}
                    ${act.damage ? `<span style="color: #fff; font-weight: bold; font-size: 13px;">${act.damage}</span>` : ''}
                </div>
            `;
        });
    } else {
        actionsHtml = '<p style="color: #666; font-size: 12px;">No actions imported.</p>';
    }

    // Build Features
    let featuresHtml = '';
    if (char.features && char.features.length > 0) {
        char.features.forEach(feat => {
            featuresHtml += `
                <div style="margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #222;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 2px;">
                        <strong style="color: #ffcc00; font-size: 13px;">${feat.name}</strong>
                        ${feat.uses ? `<span style="color: #4477ff; font-size: 11px;">${feat.uses}</span>` : ''}
                    </div>
                    <p style="color: #aaa; font-size: 11px; margin: 0; line-height: 1.4;">${feat.description}</p>
                </div>
            `;
        });
    }

    // ==========================================
    // 📖 MAGIC: BUILD AND SORT THE SPELLBOOK
    // ==========================================
    let spellsHtml = '';
    if (char.spells && char.spells.length > 0) {
        spellsHtml += `
            <div style="margin-top: 40px; border-top: 2px solid #4477ff; padding-top: 20px;">
                <h2 style="color: #4477ff; margin: 0 0 15px 0; font-size: 20px;">📖 Spellbook</h2>
        `;
        
        // Spellcasting Stats Header
        if (char.spellcasting) {
            spellsHtml += `
                <div style="display: flex; gap: 15px; margin-bottom: 20px; background: #111; padding: 10px 15px; border-radius: 4px; border: 1px solid #333; display: inline-flex;">
                    <div style="color: #aaa; font-size: 12px;">Ability: <strong style="color: white; text-transform: uppercase;">${char.spellcasting.ability || '--'}</strong></div>
                    <div style="color: #aaa; font-size: 12px;">Save DC: <strong style="color: #ff4444; font-size: 14px;">${char.spellcasting.saveDc || '--'}</strong></div>
                    <div style="color: #aaa; font-size: 12px;">Attack Bonus: <strong style="color: #4477ff; font-size: 14px;">${formatMod(char.spellcasting.attackBonus || 0)}</strong></div>
                </div>
            `;
        }

        // Step 1: Group spells by level
        const spellLevels = {};
        char.spells.forEach(spell => {
            const lvlName = spell.level === 0 ? "Cantrips" : `Level ${spell.level}`;
            if (!spellLevels[lvlName]) spellLevels[lvlName] = [];
            spellLevels[lvlName].push(spell);
        });

        // Step 2: Sort the levels (Cantrips first, then 1, 2, 3...)
        const sortedLevels = Object.keys(spellLevels).sort((a, b) => {
            if (a === "Cantrips") return -1;
            if (b === "Cantrips") return 1;
            return parseInt(a.replace("Level ", "")) - parseInt(b.replace("Level ", ""));
        });

        // Step 3: Render the grouped grids
        sortedLevels.forEach(lvl => {
            spellsHtml += `
                <h3 style="color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 4px; margin: 20px 0 10px 0; font-size: 16px;">${lvl}</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 10px;">
            `;
            
            spellLevels[lvl].forEach(spell => {
                spellsHtml += `
                    <div style="background: #1a1a24; padding: 10px; border-radius: 4px; border-left: 3px solid #4477ff; border: 1px solid #333; display: flex; flex-direction: column;">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                            <strong style="color: white; font-size: 13px; line-height: 1.2;">${spell.name}</strong>
                        </div>
                        <div style="font-size: 10px; color: #888; margin-bottom: 6px; display: flex; gap: 8px; flex-wrap: wrap;">
                            <span>⏱️ ${spell.castingTime || '1A'}</span>
                            <span>🎯 ${spell.range || 'Self'}</span>
                            <span>⏳ ${spell.duration || 'Inst.'}</span>
                        </div>
                        ${spell.description ? `<div style="color: #aaa; font-size: 11px; line-height: 1.3; margin-top: auto;">${spell.description}</div>` : ''}
                    </div>
                `;
            });
            spellsHtml += `</div>`; // Close grid for this level
        });

        spellsHtml += `</div>`; // Close spellbook wrapper
    }

    // Combine everything into the mega-sheet
    display.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; padding-bottom: 50px;">
            <div style="border-bottom: 1px solid #4477ff; padding-bottom: 10px; margin-bottom: 15px;">
                <h1 style="color: white; font-size: 24px; margin: 0 0 2px 0;">${char.name}</h1>
                <h3 style="color: #888; font-weight: normal; font-size: 13px; margin: 0;">${char.classLevel} • ${char.species}</h3>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px; flex-wrap: wrap;">
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 1; min-width: 70px;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Armor</div>
                    <div style="font-size: 20px; color: white; font-weight: bold;">${char.ac || '--'}</div>
                </div>
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 2; min-width: 120px;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Hit Points</div>
                    <div style="font-size: 20px; color: #44ff44; font-weight: bold;">${char.hp?.current || 0} <span style="font-size: 14px; color: #666;">/ ${char.hp?.max || 0}</span></div>
                </div>
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 1; min-width: 70px;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Speed</div>
                    <div style="font-size: 20px; color: white; font-weight: bold;">${char.speed || '--'}</div>
                </div>
                <div style="background: #1a1a24; padding: 10px; border-radius: 6px; border: 1px solid #333; text-align: center; flex: 1; min-width: 70px;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Initiative</div>
                    <div style="font-size: 20px; color: white; font-weight: bold;">${formatMod(char.initiative || 0)}</div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(70px, 1fr)); gap: 8px; margin-bottom: 20px;">
                ${statsHtml}
            </div>

            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px;">
                <div>
                    <h3 style="color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 10px; font-size: 14px;">Actions & Attacks</h3>
                    ${actionsHtml}

                    <h3 style="color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 10px; margin-top: 20px; font-size: 14px;">Proficiencies & Passives</h3>
                    <div style="background: #111; padding: 10px; border-radius: 4px; border: 1px solid #333; color: #aaa; font-size: 11px; line-height: 1.5;">
                        ${char.passives ? `<strong>Passives:</strong> Perception ${char.passives.perception}, Insight ${char.passives.insight}, Investigation ${char.passives.investigation}<br><br>` : ''}
                        ${char.proficiencies?.armor ? `<strong>Armor:</strong> ${char.proficiencies.armor}<br>` : ''}
                        ${char.proficiencies?.weapons ? `<strong>Weapons:</strong> ${char.proficiencies.weapons}<br>` : ''}
                        ${char.proficiencies?.tools ? `<strong>Tools:</strong> ${char.proficiencies.tools}<br>` : ''}
                        ${char.proficiencies?.languages ? `<strong>Languages:</strong> ${char.proficiencies.languages}` : ''}
                    </div>
                </div>

                <div>
                    <h3 style="color: #ffcc00; border-bottom: 1px solid #333; padding-bottom: 4px; margin-bottom: 10px; font-size: 14px;">Features & Traits</h3>
                    ${featuresHtml}
                </div>
            </div>

            ${spellsHtml}

        </div>
    `;
}

// --- 5. "PLAY AS" FUNCTION (THE HOOKUP) ---
function playAsCharacter(id) {
    // Save the selected character ID to your browser's local storage
    localStorage.setItem('tavernActiveCharId', id);
    
    // Render the new sidebar sheet
    renderActiveCharacterSheet();
    
    // Close the Vault and alert the player
    closePlayerScreen();
    
    // Optional: Auto-open the character sheet if it isn't open yet
    const charSidebar = document.getElementById('char-sidebar');
    if (charSidebar && (charSidebar.style.display === 'none' || charSidebar.style.display === '')) {
        toggleCharSheet(); 
    }
}

// --- 6. THE ACTIVE SIDEBAR RENDERER (NARROW EDITION) ---
function renderActiveCharacterSheet() {
    const sheetContent = document.getElementById('pc-sheet-content');
    if (!sheetContent) return;

    const activeId = localStorage.getItem('tavernActiveCharId');
    const char = vaultCharacters[activeId];

    if (!char) {
        sheetContent.innerHTML = `
            <div style="text-align: center; padding: 40px 20px; color: #888;">
                <span style="font-size: 40px;">🛡️</span><br><br>
                No active character selected.<br><br>Open the <strong>Player Screen</strong> and select a character from the Vault to play!
            </div>`;
        return;
    }

    const formatMod = (mod) => (mod >= 0 ? `+${mod}` : mod);

    // Build Attributes (3x2 Grid for narrow sidebars)
    let statsHtml = '';
    const statsOrder = ['str', 'dex', 'con', 'int', 'wis', 'cha'];
    statsOrder.forEach(stat => {
        if (char.stats && char.stats[stat]) {
            const s = char.stats[stat];
            const saveIcon = s.saveProf ? '<span title="Saving Throw Proficiency" style="color:#ffcc00;">★</span>' : '';
            statsHtml += `
                <div style="background: #111; padding: 8px 5px; border-radius: 4px; border: 1px solid #333; text-align: center;">
                    <div style="color: #aaa; font-size: 10px; font-weight: bold; margin-bottom: 2px; text-transform: uppercase;">${stat} ${saveIcon}</div>
                    <div style="color: white; font-size: 16px;">${s.score}</div>
                    <div style="color: #4477ff; font-size: 12px; font-weight: bold;">${formatMod(s.mod)}</div>
                </div>
            `;
        }
    });

    // Build Actions
    let actionsHtml = '';
    if (char.actions && char.actions.length > 0) {
        char.actions.forEach(act => {
            actionsHtml += `
                <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border-left: 3px solid #ff4444; border: 1px solid #333; margin-bottom: 6px;">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 4px;">
                        <strong style="color: white; font-size: 13px; line-height: 1.1;">${act.name}</strong>
                    </div>
                    ${act.attackMod ? `<span style="color: #ff4444; font-weight: bold; font-size: 13px;">${formatMod(act.attackMod)}</span> <span style="color: #888; font-size: 10px; margin-right: 5px;">to hit</span>` : ''}
                    ${act.damage ? `<span style="color: #fff; font-weight: bold; font-size: 12px;">${act.damage}</span>` : ''}
                </div>
            `;
        });
    }

    // Build Spells (Stacked for narrow sidebar)
    let spellsHtml = '';
    if (char.spells && char.spells.length > 0) {
        spellsHtml += `<h4 style="color: #4477ff; margin: 15px 0 5px 0; border-bottom: 1px solid #333; padding-bottom: 3px;">Spellbook</h4>`;
        
        // Group spells by level
        const spellLevels = {};
        char.spells.forEach(spell => {
            const lvlName = spell.level === 0 ? "Cantrips" : `Level ${spell.level}`;
            if (!spellLevels[lvlName]) spellLevels[lvlName] = [];
            spellLevels[lvlName].push(spell);
        });

        const sortedLevels = Object.keys(spellLevels).sort((a, b) => {
            if (a === "Cantrips") return -1;
            if (b === "Cantrips") return 1;
            return parseInt(a.replace("Level ", "")) - parseInt(b.replace("Level ", ""));
        });

        sortedLevels.forEach(lvl => {
            spellsHtml += `<div style="color: #ffcc00; font-size: 11px; font-weight: bold; margin: 10px 0 4px 0;">${lvl}</div>`;
            spellLevels[lvl].forEach(spell => {
                spellsHtml += `
                    <div style="background: #1a1a24; padding: 6px 8px; border-radius: 4px; border-left: 3px solid #4477ff; border: 1px solid #333; margin-bottom: 4px;">
                        <strong style="color: white; font-size: 12px;">${spell.name}</strong>
                        <div style="font-size: 10px; color: #888; display: flex; gap: 6px; margin-top: 2px;">
                            <span>⏱️ ${spell.castingTime || '1A'}</span>
                            <span>🎯 ${spell.range || 'Self'}</span>
                        </div>
                    </div>
                `;
            });
        });
    }

    // Build Features
    let featuresHtml = '';
    if (char.features && char.features.length > 0) {
        char.features.forEach(feat => {
            featuresHtml += `
                <div style="margin-bottom: 8px; padding-bottom: 8px; border-bottom: 1px solid #222;">
                    <strong style="color: #ffcc00; font-size: 12px;">${feat.name}</strong>
                    <div style="color: #aaa; font-size: 11px; margin-top: 2px; line-height: 1.3;">${feat.description}</div>
                </div>
            `;
        });
    }

    // --- INJECT INTO THE SIDEBAR ---
    sheetContent.innerHTML = `
        <div style="padding-bottom: 30px;">
            <div style="margin-bottom: 15px;">
                <h2 style="color: white; font-size: 20px; margin: 0 0 2px 0;">${char.name}</h2>
                <div style="color: #888; font-size: 11px;">${char.classLevel} • ${char.species}</div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-bottom: 15px;">
                <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border: 1px solid #333; text-align: center;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Armor</div>
                    <div style="font-size: 18px; color: white; font-weight: bold;">${char.ac || '--'}</div>
                </div>
                <div style="background: #1a1a24; padding: 8px; border-radius: 4px; border: 1px solid #333; text-align: center;">
                    <div style="font-size: 10px; color: #aaa; text-transform: uppercase;">Hit Points</div>
                    <div style="font-size: 18px; color: #44ff44; font-weight: bold;">${char.hp?.current || 0} <span style="font-size: 12px; color: #666;">/ ${char.hp?.max || 0}</span></div>
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-bottom: 20px;">
                ${statsHtml}
            </div>

            <h4 style="color: #ffcc00; margin: 0 0 5px 0; border-bottom: 1px solid #333; padding-bottom: 3px;">Actions & Attacks</h4>
            ${actionsHtml}
            
            ${spellsHtml}

            <h4 style="color: #ffcc00; margin: 15px 0 5px 0; border-bottom: 1px solid #333; padding-bottom: 3px;">Features & Traits</h4>
            ${featuresHtml}
            
            <h4 style="color: #ffcc00; margin: 15px 0 5px 0; border-bottom: 1px solid #333; padding-bottom: 3px;">Proficiencies</h4>
            <div style="background: #111; padding: 8px; border-radius: 4px; border: 1px solid #333; color: #aaa; font-size: 10px; line-height: 1.4;">
                ${char.proficiencies?.languages ? `<strong>Languages:</strong> ${char.proficiencies.languages}<br>` : ''}
                ${char.proficiencies?.tools ? `<strong>Tools:</strong> ${char.proficiencies.tools}` : ''}
            </div>
        </div>
    `;

    // Update the dropdown selector title to match the active character
    const sheetSelector = document.getElementById('sheet-selector');
    if(sheetSelector && sheetSelector.options.length > 0) {
        sheetSelector.options[0].text = `🛡️ ${char.name}'s Sheet`;
    }
}   