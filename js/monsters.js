// ==========================================
// 🐲 DM MONSTER VAULT ENGINE
// ==========================================
const monstersRef = database.ref('monsters');
let currentMonsters = {};

// --- UI TOGGLES ---
function toggleMonsterVault() {
    let vault = document.getElementById("monster-vault");
    if (vault) {
        vault.classList.toggle("hidden-modal");
    }
}

function openMonsterCreator() {
    document.getElementById("monster-creator-modal").classList.remove("hidden-modal");
    document.getElementById("monster-form").reset();
    document.getElementById("traits-container").innerHTML = "";
    document.getElementById("actions-container").innerHTML = "";
}

function closeMonsterCreator() {
    document.getElementById("monster-creator-modal").classList.add("hidden-modal");
}

// --- DYNAMIC FORM FIELDS ---
function addDynamicRow(containerId) {
    const container = document.getElementById(containerId);
    const row = document.createElement("div");
    row.className = "dynamic-row";
    row.style.display = "flex";
    row.style.gap = "5px";
    row.style.marginBottom = "5px";
    
    row.innerHTML = `
        <input type="text" placeholder="Name (e.g. Multiattack)" class="mon-input" style="flex: 1;">
        <textarea placeholder="Description..." class="mon-input" style="flex: 3; resize: vertical; min-height: 35px;"></textarea>
        <button type="button" class="ui-btn" style="background: #882222; padding: 5px;" onclick="this.parentElement.remove()">X</button>
    `;
    container.appendChild(row);
}

// --- SAVE MONSTER TO FIREBASE ---
function saveMonster() {
    const monster = {
        name: document.getElementById("mon-name").value || "Unnamed Monster",
        ac: document.getElementById("mon-ac").value || "10",
        hp: document.getElementById("mon-hp").value || "10",
        speed: document.getElementById("mon-speed").value || "30 ft.",
        stats: {
            str: document.getElementById("mon-str").value || "10",
            dex: document.getElementById("mon-dex").value || "10",
            con: document.getElementById("mon-con").value || "10",
            int: document.getElementById("mon-int").value || "10",
            wis: document.getElementById("mon-wis").value || "10",
            cha: document.getElementById("mon-cha").value || "10"
        },
        saves: document.getElementById("mon-saves").value || "",
        skills: document.getElementById("mon-skills").value || "",
        vulnerabilities: document.getElementById("mon-vulnerabilities").value || "",
        resistances: document.getElementById("mon-resistances").value || "",
        immunities: document.getElementById("mon-immunities").value || "",
        condImmunities: document.getElementById("mon-cond-immunities").value || "",
        senses: document.getElementById("mon-senses").value || "",
        languages: document.getElementById("mon-languages").value || "",
        challenge: document.getElementById("mon-challenge").value || "",
        traits: [],
        actions: []
    };

    const traitRows = document.getElementById("traits-container").querySelectorAll(".dynamic-row");
    traitRows.forEach(row => {
        const name = row.querySelector("input").value;
        const desc = row.querySelector("textarea").value;
        if (name || desc) monster.traits.push({ name, desc });
    });

    const actionRows = document.getElementById("actions-container").querySelectorAll(".dynamic-row");
    actionRows.forEach(row => {
        const name = row.querySelector("input").value;
        const desc = row.querySelector("textarea").value;
        if (name || desc) monster.actions.push({ name, desc });
    });

    monstersRef.push(monster);
    closeMonsterCreator();
}

// --- LOAD & RENDER MONSTERS ---
monstersRef.on('value', (snapshot) => {
    currentMonsters = {};
    const listEl = document.getElementById("monster-list");
    if (!listEl) return;
    
    listEl.innerHTML = "";
    
    snapshot.forEach((child) => {
        let mon = child.val();
        currentMonsters[child.key] = mon;
        
        let li = document.createElement("li");
        li.className = "mon-list-item";
        li.innerHTML = `
            <span>${mon.name}</span>
            <div style="display:flex; gap: 5px;">
                <button class="ui-btn" style="padding: 2px 8px; font-size: 11px;" onclick="viewMonster('${child.key}')">View</button>
                <button class="ui-btn" style="padding: 2px 8px; font-size: 11px; background: #882222;" onclick="deleteMonster('${child.key}')">X</button>
            </div>
        `;
        listEl.appendChild(li);
    });
});

function deleteMonster(id) {
    if(confirm("Delete this monster forever?")) {
        monstersRef.child(id).remove();
        document.getElementById("monster-display").innerHTML = "<p style='color:#888;'>Select a monster to view its stats.</p>";
    }
}

// --- DISPLAY THE STATBLOCK ---
function viewMonster(id) {
    const mon = currentMonsters[id];
    if (!mon) return;

    function calcMod(score) {
        let mod = Math.floor((parseInt(score) - 10) / 2);
        return mod >= 0 ? `+${mod}` : mod;
    }

    let traitsHTML = mon.traits ? mon.traits.map(t => `<p><strong>${t.name}.</strong> ${t.desc}</p>`).join("") : "";
    let actionsHTML = mon.actions ? mon.actions.map(a => `<p><strong>${a.name}.</strong> ${a.desc}</p>`).join("") : "";

    let detailsHTML = "";
    if (mon.saves) detailsHTML += `<p><strong>Saving Throws</strong> ${mon.saves}</p>`;
    if (mon.skills) detailsHTML += `<p><strong>Skills</strong> ${mon.skills}</p>`;
    if (mon.vulnerabilities) detailsHTML += `<p><strong>Damage Vulnerabilities</strong> ${mon.vulnerabilities}</p>`;
    if (mon.resistances) detailsHTML += `<p><strong>Damage Resistances</strong> ${mon.resistances}</p>`;
    if (mon.immunities) detailsHTML += `<p><strong>Damage Immunities</strong> ${mon.immunities}</p>`;
    if (mon.condImmunities) detailsHTML += `<p><strong>Condition Immunities</strong> ${mon.condImmunities}</p>`;
    if (mon.senses) detailsHTML += `<p><strong>Senses</strong> ${mon.senses}</p>`;
    if (mon.languages) detailsHTML += `<p><strong>Languages</strong> ${mon.languages}</p>`;
    if (mon.challenge) detailsHTML += `<p><strong>Challenge</strong> ${mon.challenge}</p>`;

    const display = document.getElementById("monster-display");
    display.innerHTML = `
        <div class="statblock">
            <h1 class="stat-name">${mon.name}</h1>
            <div class="stat-red-line"></div>
            <p><strong>Armor Class</strong> ${mon.ac}</p>
            <p><strong>Hit Points</strong> ${mon.hp}</p>
            <p><strong>Speed</strong> ${mon.speed}</p>
            <div class="stat-red-line"></div>
            
            <div class="stat-scores">
                <div><strong>STR</strong><br>${mon.stats.str} (${calcMod(mon.stats.str)})</div>
                <div><strong>DEX</strong><br>${mon.stats.dex} (${calcMod(mon.stats.dex)})</div>
                <div><strong>CON</strong><br>${mon.stats.con} (${calcMod(mon.stats.con)})</div>
                <div><strong>INT</strong><br>${mon.stats.int} (${calcMod(mon.stats.int)})</div>
                <div><strong>WIS</strong><br>${mon.stats.wis} (${calcMod(mon.stats.wis)})</div>
                <div><strong>CHA</strong><br>${mon.stats.cha} (${calcMod(mon.stats.cha)})</div>
            </div>
            <div class="stat-red-line"></div>

            ${detailsHTML ? `<div class="stat-section">${detailsHTML}</div><div class="stat-red-line"></div>` : ""}

            ${traitsHTML ? `<div class="stat-section">${traitsHTML}</div>` : ""}
            ${actionsHTML ? `<h3 style="border-bottom: 1px solid #882222; color: #882222; margin-top: 15px; margin-bottom: 5px;">Actions</h3><div class="stat-section">${actionsHTML}</div>` : ""}
        </div>
    `;
}
// ==========================================
// 🤖 AI JSON IMPORTER
// ==========================================

function openMonsterImport() {
    document.getElementById("import-monster-modal").classList.remove("hidden-modal");
    // Clear the box for a fresh paste
    const textBox = document.getElementById("import-json-data");
    if(textBox) textBox.value = "";
}

function closeMonsterImport() {
    document.getElementById("import-monster-modal").classList.add("hidden-modal");
}

function processMonsterImport() {
    let rawText = document.getElementById("import-json-data").value;
    
    // Auto-clean markdown formatting that AIs like to add (```json ... ```)
    rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
        // Parse the text into a JavaScript Object
        let importedMonster = JSON.parse(rawText);
        
        // Basic validation: make sure it at least has a name
        if (!importedMonster.name) {
            alert("Error: The JSON is missing a 'name' field!");
            return;
        }

        // Push to Firebase!
        monstersRef.push(importedMonster);
        
        // Close modal and show success
        closeMonsterImport();
        alert(`Successfully imported: ${importedMonster.name}!`);
        
    } catch (error) {
        console.error("JSON Parsing Error:", error);
        alert("Invalid JSON format. Please make sure the AI generated valid code.");
    }
}
// ==========================================
// 📌 SIDEBAR MULTI-SHEET LOGIC
// ==========================================

let pinnedMonsters = {}; // This dictionary remembers your open monster sheets

function switchSidebarSheet() {
    const selector = document.getElementById("sheet-selector");
    const pcContent = document.getElementById("pc-sheet-content");
    const monsterContent = document.getElementById("monster-sheet-content");

    if (selector.value === "pc") {
        pcContent.style.display = "block";
        monsterContent.style.display = "none";
    } else {
        pcContent.style.display = "none";
        monsterContent.style.display = "block";
        monsterContent.innerHTML = pinnedMonsters[selector.value];
    }
}

// Toggles the Pin state of the currently viewed monster
function pinCurrentMonster() {
    const displayArea = document.getElementById("monster-display");
    const nameEl = displayArea.querySelector('.stat-name');
    
    if (!nameEl) {
        alert("Please select a monster from the list first!");
        return;
    }
    
    const monsterName = nameEl.innerText;
    const pinBtn = document.getElementById("btn-pin-monster");
    const selector = document.getElementById("sheet-selector");
    
    // IF ALREADY PINNED -> UNPIN IT
    if (pinnedMonsters[monsterName]) {
        delete pinnedMonsters[monsterName]; // Remove from memory
        
        // Remove it from the dropdown menu
        for(let i = 0; i < selector.options.length; i++) {
            if(selector.options[i].value === monsterName) {
                selector.remove(i);
                break;
            }
        }
        
        // If the sidebar was actively showing this removed monster, switch back to PC
        if (selector.value === monsterName || selector.value === "") {
            selector.value = "pc";
            switchSidebarSheet();
        }
        
        // Update Button to "Inactive" state
        pinBtn.style.background = "#444";
        pinBtn.style.color = "white";
        pinBtn.innerText = "📌 Pin Monster";
        
    } 
    // IF NOT PINNED -> PIN IT
    else {
        const statblockHTML = displayArea.innerHTML;
        pinnedMonsters[monsterName] = statblockHTML; // Save to memory

        // Add to dropdown
        const opt = document.createElement("option");
        opt.value = monsterName;
        opt.text = "🐉 " + monsterName;
        selector.add(opt);

        // Update Button to "Active" state
        pinBtn.style.background = "#ffcc00";
        pinBtn.style.color = "#000";
        pinBtn.innerText = "📌 Pinned!";
        
        // Update the sidebar in the background
        selector.value = monsterName;
        switchSidebarSheet();
    }
}

// ==========================================
// 👁️ SMART DISPLAY OBSERVER
// ==========================================
const displayObserver = new MutationObserver(() => {
    // 1. Pause the observer temporarily so we don't trap the app in an infinite loop
    displayObserver.disconnect();

    const displayArea = document.getElementById("monster-display");

    // 2. RUN THE AUTO-PARSER (Makes text clickable)
    if (displayArea) {
        makeRollable(displayArea);
    }

    // 3. UPDATE THE PIN BUTTON
    const nameEl = document.querySelector('#monster-display .stat-name');
    const pinBtn = document.getElementById("btn-pin-monster");
    
    if (nameEl && pinBtn) {
        const monsterName = nameEl.innerText;
        if (pinnedMonsters[monsterName]) {
            pinBtn.style.background = "#ffcc00";
            pinBtn.style.color = "#000";
            pinBtn.innerText = "📌 Pinned!";
        } else {
            pinBtn.style.background = "#444";
            pinBtn.style.color = "white";
            pinBtn.innerText = "📌 Pin Monster";
        }
    }

    // 4. Resume watching for the next monster
    if (displayArea) {
        displayObserver.observe(displayArea, { childList: true, subtree: true });
    }
});

// Start watching the display area as soon as the page loads
window.addEventListener('DOMContentLoaded', () => {
    const displayArea = document.getElementById("monster-display");
    if (displayArea) {
        displayObserver.observe(displayArea, { childList: true, subtree: true });
    }
});
// ==========================================
// 🎲 DYNAMIC STATBLOCK ROLLER
// ==========================================

function makeRollable(element) {
    // Crawl through every piece of raw text in the statblock
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    let node;
    
    while (node = walker.nextNode()) {
        // Skip text that is already inside a button or rollable span
        if (node.parentNode.tagName === 'BUTTON' || node.parentNode.classList.contains('rollable')) continue;

        const text = node.nodeValue;
        // Check if the text contains a dice format (1d6 + 2) or a modifier (+5)
        const hasDice = /(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi.test(text);
        const hasMod = /(^|\s|\()([+-]\d+)(?=\s|\)|$|,)/g.test(text);

        if (hasDice || hasMod) {
            nodesToReplace.push(node);
        }
    }

    // Convert the plain text into clickable HTML spans
    nodesToReplace.forEach(n => {
        let html = n.nodeValue
            // 1. Replace Dice (e.g. 1d6 + 2)
            .replace(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi, `<span class="rollable" onclick="quickMonsterRoll('$1', event)">$1</span>`)
            // 2. Replace standalone Modifiers (e.g. +5)
            .replace(/(^|\s|\()([+-]\d+)(?=\s|\)|$|,)/g, `$1<span class="rollable" onclick="quickMonsterRoll('$2', event)">$2</span>`);

        const span = document.createElement('span');
        span.innerHTML = html;
        n.parentNode.replaceChild(span, n);
    });
}

function quickMonsterRoll(formula, event) {
    event.stopPropagation(); // Stops the click from triggering things behind it
    let cleanFormula = formula.replace(/\s+/g, '');

    // If it's just a modifier like "+5", automatically attach a d20 to it
    if (cleanFormula.startsWith('+') || cleanFormula.startsWith('-')) {
        cleanFormula = '1d20' + cleanFormula;
    }

    // Parse the formula into math
    let match = cleanFormula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return;

    let numDice = parseInt(match[1]);
    let sides = parseInt(match[2]);
    let mod = match[3] ? parseInt(match[3]) : 0;

    let total = 0;
    let rolls = [];
    for (let i = 0; i < numDice; i++) {
        let r = Math.floor(Math.random() * sides) + 1;
        rolls.push(r);
        total += r;
    }
    total += mod;

    // Figure out which monster we are rolling for
    let monsterName = "Monster";
    let statblock = event.target.closest('.statblock');
    if (statblock) {
        let nameEl = statblock.querySelector('.stat-name');
        if (nameEl) monsterName = nameEl.innerText;
    }

    // Send it directly to the Roll History
    const historyList = document.getElementById('roll-history');
    const li = document.createElement('li');
    li.innerHTML = `
        <div class="player-name">${monsterName}</div>
        <div class="roll-formula">Rolled ${cleanFormula}</div>
        <div class="roll-output">
            <span class="roll-total">${total}</span>
            <div class="dice-grid">
                ${rolls.map(r => `<span class="mini-die">${r}</span>`).join('')}
                ${mod !== 0 ? `<span style="color:#aaa; font-size:12px; padding-top:4px;">${mod > 0 ? '+' : ''}${mod}</span>` : ''}
            </div>
        </div>
    `;
    historyList.prepend(li);
}