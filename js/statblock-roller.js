// ==========================================
// 🎲 DYNAMIC STATBLOCK ROLLER (js/statblock-roller.js)
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

    // If it's just a modifier like "+5", automatically assume it's a d20 roll
    if (cleanFormula.startsWith('+') || cleanFormula.startsWith('-')) {
        cleanFormula = '1d20' + cleanFormula;
    }

    // Parse the formula into math
    let match = cleanFormula.match(/(\d+)d(\d+)([+-]\d+)?/);
    if (!match) return;

    let numDice = parseInt(match[1]);
    let sides = parseInt(match[2]);
    let mod = match[3] ? parseInt(match[3]) : 0;

    // 1. ADD TO DICE TRAY POOL
    for (let i = 0; i < numDice; i++) {
        // This calls the exact same function your d4, d6, d20 buttons use!
        if (typeof addToPool === "function") {
            addToPool(sides);
        }
    }

    // 2. ADD TO MODIFIER INPUT
    const modInput = document.getElementById('modifier-input');
    if (modInput) {
        let currentMod = parseInt(modInput.value) || 0;
        modInput.value = currentMod + mod;
    }

    // 3. AUTO-CHANGE DM NAME TO MONSTER NAME
    let monsterName = "Monster";
    let statblock = event.target.closest('.statblock');
    if (statblock) {
        let nameEl = statblock.querySelector('.stat-name');
        if (nameEl) monsterName = nameEl.innerText;
    }
    
    const nameDisplay = document.getElementById('display-name');
    if (nameDisplay) {
        // Temporarily sets your roller name to "Bandit" or "Kraken"
        nameDisplay.innerText = monsterName; 
    }

    // 4. OPEN TRAY IF IT WAS HIDDEN
    const diceSec = document.getElementById('dice-section');
    if (diceSec && diceSec.classList.contains('collapsed')) {
        toggleDice(); // Pops the drawer open so you can see the dice you just added!
    }
}