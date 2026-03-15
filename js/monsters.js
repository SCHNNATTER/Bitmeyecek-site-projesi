// ==========================================
// 🐲 DM MONSTER VAULT ENGINE
// ==========================================
const monstersRef = database.ref('monsters');
let currentMonsters = {};

// --- UI TOGGLES ---
function toggleMonsterVault() {
    let vault = document.getElementById("monster-vault");
    if (vault) vault.classList.toggle("hidden-modal");
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
    row.style.cssText = "display: flex; gap: 5px; margin-bottom: 5px;";
    
    row.innerHTML = `
        <input type="text" placeholder="Name (e.g. Multiattack)" class="mon-input" style="flex: 1;">
        <textarea placeholder="Description..." class="mon-input" style="flex: 3; resize: vertical; min-height: 35px;"></textarea>
        <button type="button" class="ui-btn" style="background: #882222; padding: 5px;" onclick="this.parentElement.remove()">✖</button>
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

    const extractRows = (containerId, targetArray) => {
        document.getElementById(containerId).querySelectorAll(".dynamic-row").forEach(row => {
            const name = row.querySelector("input").value;
            const desc = row.querySelector("textarea").value;
            if (name || desc) targetArray.push({ name, desc });
        });
    };

    extractRows("traits-container", monster.traits);
    extractRows("actions-container", monster.actions);

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
                <button class="ui-btn" style="padding: 2px 8px; font-size: 11px; background: #882222;" onclick="deleteMonster('${child.key}')">✖</button>
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
        let mod = Math.floor((parseInt(score || 10) - 10) / 2);
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
    const textBox = document.getElementById("import-json-data");
    if(textBox) textBox.value = "";
}

function closeMonsterImport() {
    document.getElementById("import-monster-modal").classList.add("hidden-modal");
}

function processMonsterImport() {
    let rawText = document.getElementById("import-json-data").value;
    rawText = rawText.replace(/```json/gi, '').replace(/```/gi, '').trim();

    try {
        let importedMonster = JSON.parse(rawText);
        if (!importedMonster.name) {
            alert("Error: The JSON is missing a 'name' field!");
            return;
        }
        monstersRef.push(importedMonster);
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
let pinnedMonsters = {};

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
    
    if (pinnedMonsters[monsterName]) {
        delete pinnedMonsters[monsterName]; 
        for(let i = 0; i < selector.options.length; i++) {
            if(selector.options[i].value === monsterName) {
                selector.remove(i);
                break;
            }
        }
        if (selector.value === monsterName || selector.value === "") {
            selector.value = "pc";
            switchSidebarSheet();
        }
        pinBtn.style.background = "#444";
        pinBtn.style.color = "white";
        pinBtn.innerText = "📌 Pin Monster";
    } else {
        pinnedMonsters[monsterName] = displayArea.innerHTML; 
        const opt = document.createElement("option");
        opt.value = monsterName;
        opt.text = "🐉 " + monsterName;
        selector.add(opt);

        pinBtn.style.background = "#ffcc00";
        pinBtn.style.color = "#000";
        pinBtn.innerText = "📌 Pinned!";
        
        selector.value = monsterName;
        switchSidebarSheet();
    }
}

// ==========================================
// 👁️ SMART DISPLAY OBSERVER
// ==========================================
const displayObserver = new MutationObserver(() => {
    displayObserver.disconnect();
    const displayArea = document.getElementById("monster-display");

    if (displayArea) makeRollable(displayArea);

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

    if (displayArea) displayObserver.observe(displayArea, { childList: true, subtree: true });
});

window.addEventListener('DOMContentLoaded', () => {
    const displayArea = document.getElementById("monster-display");
    if (displayArea) displayObserver.observe(displayArea, { childList: true, subtree: true });
});

// ==========================================
// 🎲 DYNAMIC STATBLOCK ROLLER (UPGRADED)
// ==========================================
function makeRollable(element) {
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    let node;
    
    while (node = walker.nextNode()) {
        const parentTag = node.parentNode.tagName;
        if (parentTag === 'BUTTON' || parentTag === 'A' || node.parentNode.classList.contains('rollable')) continue;

        const text = node.nodeValue;
        const hasDice = /(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi.test(text);
        // Upgraded Regex: Catches modifiers touching periods, commas, or semicolons
        const hasMod = /(^|\s|\()([+-]\d+)(?=\s|\)|$|,|\.|;|:)/g.test(text);

        if (hasDice || hasMod) nodesToReplace.push(node);
    }

    nodesToReplace.forEach(n => {
        let html = n.nodeValue
            .replace(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi, `<span class="rollable" style="color: #4477ff; cursor: pointer; font-weight: bold;" onclick="quickMonsterRoll('$1', event)" title="Send $1 to Dice Tray">$1</span>`)
            .replace(/(^|\s|\()([+-]\d+)(?=\s|\)|$|,|\.|;|:)/g, `$1<span class="rollable" style="color: #4477ff; cursor: pointer; font-weight: bold;" onclick="quickMonsterRoll('$2', event)" title="Roll 1d20$2">$2</span>`);

        const span = document.createElement('span');
        span.innerHTML = html;
        n.parentNode.replaceChild(span, n);
    });
}

function quickMonsterRoll(formula, event) {
    event.stopPropagation(); 
    let cleanFormula = formula.replace(/\s+/g, '');

    if (cleanFormula.startsWith('+') || cleanFormula.startsWith('-')) {
        cleanFormula = '1d20' + cleanFormula;
    }

    let match = cleanFormula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return;

    let numDice = parseInt(match[1]);
    let sides = parseInt(match[2]);
    let mod = match[3] ? parseInt(match[3]) : 0;

    // ADD TO THE MULTIPLAYER TRAY
    if (typeof addToPool === "function") {
        for (let i = 0; i < numDice; i++) {
            addToPool(sides);
        }
    }

    const modInput = document.getElementById('modifier-input');
    if (modInput) {
        let currentMod = parseInt(modInput.value) || 0;
        modInput.value = currentMod + mod;
    }

    let monsterName = "Monster";
    let statblock = event.target.closest('.statblock');
    if (statblock) {
        let nameEl = statblock.querySelector('.stat-name') || statblock.querySelector('h1, h2, h3');
        if (nameEl) monsterName = nameEl.innerText.trim();
    }
    
    const nameDisplay = document.getElementById('display-name');
    if (nameDisplay) {
        nameDisplay.innerText = monsterName; 
    }

    const diceSec = document.getElementById('dice-section');
    if (diceSec && diceSec.classList.contains('collapsed')) {
        if (typeof toggleDice === "function") toggleDice(); 
    }
}