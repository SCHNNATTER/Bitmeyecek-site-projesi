// ==========================================
// ⚔️ INITIATIVE & RESIZER ENGINE
// ==========================================
const initRef = database.ref('initiative');
const turnRef = database.ref('initiative_turn');

let currentTurnId = null;

// --- INITIALIZE RESIZING ---
function initResizableTracker() {
    const tracker = document.getElementById('initiative-tracker');
    const resizer = document.getElementById('init-resizer');
    
    if (!tracker || !resizer) return;

    // Load saved height when you open the page
    const savedHeight = localStorage.getItem('initTrackerHeight');
    if (savedHeight) tracker.style.height = savedHeight + 'px';

    // 1. The function that resizes the box
    function handleMouseMove(e) {
        const rect = tracker.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        
        // Don't let it get smaller than 150px or bigger than 80% of the screen
        if (newHeight > 150 && newHeight < (window.innerHeight * 0.8)) {
            tracker.style.height = newHeight + 'px';
        }
    }

    // 2. The function that FORCES the mouse to let go
    function handleMouseUp() {
        // TELL THE BROWSER TO STOP LISTENING
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
        
        // Reset the resizer's color and save the new height
        resizer.style.background = ""; 
        localStorage.setItem('initTrackerHeight', tracker.offsetHeight);
    }

    // 3. The function that STARTS the drag when you click the handle
    resizer.addEventListener('mousedown', (e) => {
        e.preventDefault(); // This stops text from accidentally highlighting while you drag
        resizer.style.background = "#4477ff"; // Turn blue to show it's grabbed
        
        // Start listening to the mouse anywhere on the screen
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    });
}

// --- CORE INITIATIVE LOGIC ---
function openInitiativeModal() { document.getElementById("init-modal").classList.remove("hidden-modal"); }
function closeInitiativeModal() { document.getElementById("init-modal").classList.add("hidden-modal"); }

function addInitiative() {
    const name = document.getElementById("init-name").value;
    const score = parseInt(document.getElementById("init-score").value);
    if (name && !isNaN(score)) {
        initRef.push({ name: name, score: score });
        document.getElementById("init-name").value = "";
        document.getElementById("init-score").value = "";
        closeInitiativeModal();
    }
}

function deleteInitiative(id) { initRef.child(id).remove(); }
function clearInitiative() { if(confirm("Clear initiative for everyone?")) { initRef.remove(); turnRef.remove(); } }

function nextTurn() {
    initRef.once('value', (snapshot) => {
        let combatants = [];
        snapshot.forEach((child) => { combatants.push({ id: child.key, ...child.val() }); });
        if (combatants.length === 0) return;
        combatants.sort((a, b) => b.score - a.score); 
        let currentIndex = combatants.findIndex(c => c.id === currentTurnId);
        let nextIndex = (currentIndex + 1) >= combatants.length ? 0 : currentIndex + 1;
        turnRef.set(combatants[nextIndex].id);
    });
}

// --- REAL-TIME UPDATES ---
turnRef.on('value', (snapshot) => {
    currentTurnId = snapshot.val();
    document.querySelectorAll('.init-item').forEach(item => {
        item.style.borderLeft = (item.id === 'init-' + currentTurnId) ? "4px solid #ffcc00" : "none";
        item.style.background = (item.id === 'init-' + currentTurnId) ? "rgba(255,204,0,0.1)" : "transparent";
    });
});

initRef.on('value', (snapshot) => {
    const listEl = document.getElementById("init-list");
    if(!listEl) return;
    listEl.innerHTML = "";
    let combatants = [];
    snapshot.forEach((child) => { combatants.push({ id: child.key, ...child.val() }); });
    combatants.sort((a, b) => b.score - a.score);

    combatants.forEach((c) => {
        const li = document.createElement("li");
        li.id = 'init-' + c.id;
        li.className = "init-item";
        li.style.cssText = "display: flex; justify-content: space-between; padding: 8px; border-bottom: 1px solid #333; align-items: center;";
        li.innerHTML = `
            <span style="font-weight: bold; color: #ffcc00; width: 30px;">${c.score}</span>
            <span style="flex: 1; margin-left: 10px;">${c.name}</span>
            <button class="ui-btn" style="background: #882222; padding: 2px 6px;" onclick="deleteInitiative('${c.id}')">×</button>
        `;
        listEl.appendChild(li);
    });
});

// Start resizer after DOM loads
document.addEventListener('componentsLoaded', () => {
    initResizableTracker();
});