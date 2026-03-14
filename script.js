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

// 3. UI TOGGLES (ADV/DIS & Sidebar)
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
    document.getElementById("char-sidebar").classList.toggle("open");
}

// 4. SHOPPING CART LOGIC
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
    document.getElementById("modifier-input").value = 0;
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

rollsRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    let newRollMessage = document.createElement("li");
    newRollMessage.innerHTML = `
        <div class="player-name">${data.player}</div>
        <div class="roll-formula">${data.formula}</div>
        <div class="roll-output">
            <div class="roll-total">${data.total}</div>
            <div class="dice-grid">${data.diceHTML}</div>
        </div>
    `;
    document.getElementById("roll-history").prepend(newRollMessage);
});

// 7. D&D BEYOND INTEGRATION (USING NETLIFY PROXY)
async function importDndBeyond() {
    let charInput = prompt("Enter your D&D Beyond Character ID (or paste the full URL):");
    if (!charInput || charInput.trim() === "") return;

    let charId = charInput.split('/').pop().trim();
    document.getElementById("display-name").innerText = "Importing...";

    try {
        // THIS ONLY WORKS WHEN HOSTED ON NETLIFY
        let proxyUrl = `/api/dnd/${charId}`; 

        let response = await fetch(proxyUrl);
        if (!response.ok) throw new Error(`Netlify proxy failed! Status: ${response.status}`);
        
        let rawData = await response.json();
        if (rawData.success === false) throw new Error(rawData.message || "Sheet is Private.");

        let charData = rawData.data;

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
            statsHTML += `<button class="stat-btn" onclick="document.getElementById('modifier-input').value = ${modifier}">
                            ${statNames[i]}<br><span style="color:white; font-size:16px;">${sign}${modifier}</span>
                          </button>`;
        }
        document.getElementById("sheet-stats").innerHTML = statsHTML;

        let savesHTML = "";
        let saveSubTypes = ["strength-saving-throws", "dexterity-saving-throws", "constitution-saving-throws", "intelligence-saving-throws", "wisdom-saving-throws", "charisma-saving-throws"];
        for (let i = 0; i < 6; i++) {
            let totalSaveMod = statMods[i] + Math.floor(profBonus * getProfMultiplier(saveSubTypes[i]));
            let sign = totalSaveMod >= 0 ? "+" : "";
            savesHTML += `<button class="skill-btn" onclick="document.getElementById('modifier-input').value = ${totalSaveMod}">
                            <span>${statNames[i]}</span> <span class="skill-val">${sign}${totalSaveMod}</span>
                          </button>`;
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
            skillsHTML += `<button class="skill-btn" onclick="document.getElementById('modifier-input').value = ${totalSkillMod}">
                            <span>${skill.name}</span> <span class="skill-val">${sign}${totalSkillMod}</span>
                           </button>`;
        });
        document.getElementById("sheet-skills").innerHTML = skillsHTML;

        currentPlayerName = charData.name;
        localStorage.setItem("tavernPlayerName", currentPlayerName);
        document.getElementById("display-name").innerText = currentPlayerName;
        document.getElementById("sheet-name").innerText = charData.name;

    } catch (error) {
        console.error(error);
        alert(`Import Failed! \n${error.message}`);
        document.getElementById("display-name").innerText = currentPlayerName; 
    }
}