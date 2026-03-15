// ==========================================
// 🔑 IDENTITY & ROLES
// ==========================================

// Initial defaults
let currentPlayerName = "Mysterious Stranger";
let userRole = "player"; 

function initializeIdentity() {
    // UNIFIED: Using 'tavernCharacterName' to match character.js and dice.js
    let savedName = localStorage.getItem("tavernCharacterName");
    if (savedName) {
        currentPlayerName = savedName;
    } else {
        let newName = prompt("Welcome! What is your character's name?");
        if (newName && newName.trim() !== "") {
            currentPlayerName = newName.trim();
            localStorage.setItem("tavernCharacterName", currentPlayerName);
        }
    }

    let savedRole = localStorage.getItem("tavernUserRole");
    if (savedRole) {
        userRole = savedRole;
        applyRoleStyling(userRole);
    } else {
        const roleModal = document.getElementById("role-modal");
        if (roleModal) roleModal.classList.remove("hidden-modal");
    }
    
    updateDisplayNameUI();
}

function selectRole(role) {
    userRole = role;
    localStorage.setItem("tavernUserRole", role); 
    const roleModal = document.getElementById("role-modal");
    if (roleModal) roleModal.classList.add("hidden-modal");
    applyRoleStyling(role);
    
    // Refresh the page or trigger a re-render of the whiteboard 
    // so the DM sees the fog transparency immediately!
    if (typeof updateInteractions === 'function') updateInteractions();
    location.reload(); 
}

function applyRoleStyling(role) {
    updateDisplayNameUI();
    const dmBtn = document.getElementById("btn-dm-screen");
    if (dmBtn) dmBtn.style.display = (role === 'dm') ? "block" : "none";
}

function updateDisplayNameUI() {
    const nameEl = document.getElementById("display-name");
    if (!nameEl) return;

    const roleTag = (userRole === 'dm') ? "👑 DM" : "🛡️ Player";
    // Clean update: prevents the name from stacking like "Name (DM) (DM)"
    nameEl.innerText = `${currentPlayerName} (${roleTag})`;
}

function changeName() {
    let newName = prompt("What is your character's name?");
    if (newName && newName.trim() !== "") {
        currentPlayerName = newName.trim();
        localStorage.setItem("tavernCharacterName", currentPlayerName);
        updateDisplayNameUI();
    }
}

// --- UI TOGGLES ---

function toggleAdvDis(type) {
    const advBtn = document.getElementById("btn-adv");
    const disBtn = document.getElementById("btn-dis");
    if (!advBtn || !disBtn) return;

    if (type === 'adv') {
        const isActive = advBtn.classList.contains('active');
        advBtn.classList.toggle('active', !isActive);
        disBtn.classList.remove('active');
    } else {
        const isActive = disBtn.classList.contains('active');
        disBtn.classList.toggle('active', !isActive);
        advBtn.classList.remove('active');
    }
}

// Use the new name we established in dice.js to avoid the crash!
function toggleSecret() {
    if (typeof isSecretState !== 'undefined') {
        isSecretState = !isSecretState;
        const secretBtn = document.getElementById("btn-secret");
        if (secretBtn) secretBtn.classList.toggle("active", isSecretState);
    }
}

function toggleCharSheet() {
    const sheet = document.getElementById("char-sidebar");
    if(sheet) sheet.classList.toggle("open");
}

function toggleDmScreen() {
    const screen = document.getElementById("dm-screen");
    if(screen) screen.classList.toggle("hidden-modal");
}

// --- THE STARTING PISTOL ---
document.addEventListener('componentsLoaded', () => {
    initializeIdentity();
});