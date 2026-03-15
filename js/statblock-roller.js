// ==========================================
// 🎲 DYNAMIC STATBLOCK ROLLER
// ==========================================

function makeRollable(element) {
    // Crawl through every piece of raw text in the statblock
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    let node;
    
    while (node = walker.nextNode()) {
        // Skip text that is already inside a button, link, or rollable span
        const parentTag = node.parentNode.tagName;
        if (parentTag === 'BUTTON' || parentTag === 'A' || node.parentNode.classList.contains('rollable')) continue;

        const text = node.nodeValue;
        
        // ENHANCED REGEX: Now catches dice and modifiers even if they are touching periods, semicolons, or colons!
        const hasDice = /(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi.test(text);
        const hasMod = /(^|\s|\()([+-]\d+)(?=\s|\)|$|,|\.|;|:)/g.test(text);

        if (hasDice || hasMod) {
            nodesToReplace.push(node);
        }
    }

    // Convert the plain text into clickable HTML spans
    nodesToReplace.forEach(n => {
        let html = n.nodeValue
            // 1. Replace Dice (e.g. 1d6 + 2)
            .replace(/(\d+d\d+(?:\s*[+-]\s*\d+)?)/gi, `<span class="rollable" style="color: #4477ff; cursor: pointer; font-weight: bold;" onclick="quickMonsterRoll('$1', event)" title="Roll $1">$1</span>`)
            // 2. Replace standalone Modifiers (e.g. +5)
            .replace(/(^|\s|\()([+-]\d+)(?=\s|\)|$|,|\.|;|:)/g, `$1<span class="rollable" style="color: #4477ff; cursor: pointer; font-weight: bold;" onclick="quickMonsterRoll('$2', event)" title="Roll 1d20$2">$2</span>`);

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
    if (typeof addToPool === "function") {
        for (let i = 0; i < numDice; i++) {
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
        // Looks for a specific class, or defaults to the biggest header it can find
        let nameEl = statblock.querySelector('.stat-name') || statblock.querySelector('h1, h2, h3');
        if (nameEl) monsterName = nameEl.innerText.trim();
    }
    
    const nameDisplay = document.getElementById('display-name');
    if (nameDisplay) {
        nameDisplay.innerText = monsterName; 
        
        // NOTE: If your dice.js pulls the roller's name directly from localStorage, 
        // you will need to uncomment this next line so Firebase knows the monster is rolling!
        // localStorage.setItem('tavernCharacterName', monsterName);
    }

    // 4. OPEN TRAY IF IT WAS HIDDEN
    const diceSec = document.getElementById('dice-section');
    if (diceSec && diceSec.classList.contains('collapsed')) {
        if (typeof toggleDice === "function") toggleDice(); 
    }
}