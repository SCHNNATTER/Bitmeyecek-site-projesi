// ==========================================
// 📖 COMPENDIUM MANAGER (MASTER DATABASE)
// ==========================================

const Compendium = {
    spells: [],
    races: [],
    classes: [],
    items: [],
    feats: [],
    monsters: []
};

async function loadCompendiums() {
    try {
        console.log("Loading Compendium Databases...");
        
        // Fetch everything simultaneously! If a file is missing, it skips it safely.
        const [spellsRes, racesRes, classesRes, itemsRes, featsRes, monstersRes] = await Promise.all([
            fetch('data/spells.json').catch(() => null),
            fetch('data/races.json').catch(() => null),
            fetch('data/classes.json').catch(() => null),
            fetch('data/equipment.json').catch(() => null),
            fetch('data/feats.json').catch(() => null),
            fetch('data/monsters.json').catch(() => null)
        ]);

        // Parse them if they exist
        if (spellsRes && spellsRes.ok) Compendium.spells = await spellsRes.json();
        if (racesRes && racesRes.ok) Compendium.races = await racesRes.json();
        if (classesRes && classesRes.ok) Compendium.classes = await classesRes.json();
        if (itemsRes && itemsRes.ok) Compendium.items = await itemsRes.json();
        // 🚨 THE UNWRAPPER: Translating the GitHub format to our format
        if (featsRes && featsRes.ok) {
            const rawFeats = await featsRes.json();
            const featList = [];
            
            // Look inside the main "Feats" wrapper
            if (rawFeats.Feats) {
                for (const [featName, featData] of Object.entries(rawFeats.Feats)) {
                    // Skip the general "content" rule text at the top of the file
                    if (featName === "content") continue; 

                    // Flatten their messy array of arrays into a clean HTML string
                    let cleanDescription = "No description available.";
                    if (featData.content) {
                        cleanDescription = featData.content.map(line => {
                            // If it's a sub-list (like bullet points), add bullets
                            if (Array.isArray(line)) return line.map(bullet => "• " + bullet).join("<br>");
                            return line;
                        }).join("<br><br>");
                    }

                    // Push it into our system as a clean, standardized object!
                    featList.push({
                        id: featName.toLowerCase().replace(/\s+/g, '_'),
                        name: featName,
                        description: cleanDescription
                    });
                }
            }
            Compendium.feats = featList;
        }
        if (monstersRes && monstersRes.ok) Compendium.monsters = await monstersRes.json();

        console.log(`✅ Database Online!`);
        console.log(`- ${Compendium.spells.length} Spells`);
        console.log(`- ${Compendium.feats.length} Feats`);

    } catch (error) {
        console.error("Compendium Load Error:", error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    loadCompendiums();
});

function getCompendiumItem(category, id) {
    if (!Compendium[category]) return null;
    // Some GitHub JSONs use "name" instead of "id", so we check both!
    return Compendium[category].find(item => item.id === id || item.name === id);
}

// ==========================================
// 📖 UI CONTROLS & RENDERING
// ==========================================

function openCompendium() {
    const modal = document.getElementById('compendium-modal');
    if (modal) {
        modal.classList.remove('hidden-modal');
        renderCompendiumList();
    }
}

function closeCompendium() {
    const modal = document.getElementById('compendium-modal');
    if (modal) modal.classList.add('hidden-modal');
}

function renderCompendiumList() {
    const listDiv = document.getElementById('comp-list');
    const searchStr = document.getElementById('comp-search').value.toLowerCase();
    const category = document.getElementById('comp-category').value;
    
    if (!listDiv || !Compendium[category]) return;

    const filteredItems = Compendium[category].filter(item => {
        if (!item.name) return false;
        return item.name.toLowerCase().includes(searchStr);
    });

    let html = '';
    filteredItems.forEach(item => {
        // Use item.id if it has one, otherwise use its name (useful for GitHub JSONs)
        const identifier = item.id ? item.id : item.name.replace(/'/g, "\\'");
        
        let subtitle = "";
        if (category === 'spells') subtitle = item.level === 0 ? 'Cantrip' : `Level ${item.level} ${item.school}`;
        
        html += `
            <div style="background: #1a1a24; border: 1px solid #333; padding: 10px; border-radius: 4px; cursor: pointer; transition: 0.1s; margin-bottom: 5px;" onmouseover="this.style.borderColor='#4477ff'" onmouseout="this.style.borderColor='#333'" onclick="viewCompendiumItem('${category}', '${identifier}')">
                <strong style="color: white; display: block; font-size: 14px;">${item.name}</strong>
                <span style="color: #888; font-size: 11px;">${subtitle}</span>
            </div>
        `;
    });

    if (filteredItems.length === 0) {
        html = `<div style="color: #666; text-align: center; margin-top: 20px; font-size: 12px;">No results found.</div>`;
    }

    listDiv.innerHTML = html;
}

function viewCompendiumItem(category, id) {
    const displayDiv = document.getElementById('comp-display');
    const item = getCompendiumItem(category, id);
    if (!displayDiv || !item) return;

    let html = ``;

    if (category === 'spells') {
        html = `
            <div style="max-width: 700px; margin: 0 auto; padding-bottom: 40px;">
                <div style="display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #4477ff; padding-bottom: 5px; margin-bottom: 5px;">
                    <h1 style="color: white; margin: 0;">${item.name}</h1>
                    <button class="ui-btn" style="background: #44ff44; color: #000; font-weight: bold; padding: 5px 15px;" onclick="addSpellToActiveCharacter('${item.id || item.name}')">➕ Add to Sheet</button>
                </div>
                <div style="color: #ffcc00; font-size: 13px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase;">
                    ${item.level === 0 ? 'Cantrip' : 'Level ' + item.level} • ${item.school}
                </div>
                <div style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    ${item.description || item.desc || "No description available."}
                </div>
            </div>
        `;
    } else {
        // Fallback for everything else (Feats, Races, etc.) until we style them!
        html = `
            <div style="max-width: 700px; margin: 0 auto; padding-bottom: 40px;">
                <h1 style="color: white; border-bottom: 2px solid #4477ff; padding-bottom: 5px; margin-bottom: 20px;">${item.name}</h1>
                <div style="color: #ccc; font-size: 14px; line-height: 1.6;">
                    ${item.desc || item.description || "Details coming soon..."}
                </div>
            </div>
        `;
    }

    displayDiv.innerHTML = html;
}

// ==========================================
// ➕ ADD TO CHARACTER LOGIC (Placeholder)
// ==========================================
function addSpellToActiveCharacter(spellId) {
    alert("Add to sheet logic goes here!");
}