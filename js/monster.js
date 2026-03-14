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