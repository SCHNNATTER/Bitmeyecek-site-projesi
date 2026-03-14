// ==========================================
// IDENTITY & ROLES
// ==========================================
let currentPlayerName = "Mysterious Stranger";
let userRole = "player"; 
let isSecretRoll = false;

function initializeIdentity() {
    let savedName = localStorage.getItem("tavernPlayerName");
    if (savedName) currentPlayerName = savedName;
    else {
        let newName = prompt("Welcome! What is your character's name?");
        if (newName && newName.trim() !== "") {
            currentPlayerName = newName.trim();
            localStorage.setItem("tavernPlayerName", currentPlayerName);
        }
    }

    let savedRole = localStorage.getItem("tavernUserRole");
    if (savedRole) {
        userRole = savedRole;
        applyRoleStyling(userRole);
    } else {
        document.getElementById("role-modal").classList.remove("hidden-modal");
    }
    
    document.getElementById("display-name").innerText = currentPlayerName;
    if (savedRole) applyRoleStyling(savedRole);
}

function selectRole(role) {
    userRole = role;
    localStorage.setItem("tavernUserRole", role); 
    document.getElementById("role-modal").classList.add("hidden-modal");
    applyRoleStyling(role);
}

function applyRoleStyling(role) {
    const roleText = (role === 'dm') ? "👑 DM" : "🛡️ Player";
    const nameEl = document.getElementById("display-name");
    if (nameEl && !nameEl.innerText.includes("DM") && !nameEl.innerText.includes("Player")) {
        nameEl.innerText = `${currentPlayerName} (${roleText})`;
    }
    const dmBtn = document.getElementById("btn-dm-screen");
    if (dmBtn) dmBtn.style.display = (role === 'dm') ? "block" : "none";
}

function changeName() {
    let newName = prompt("What is your character's name?");
    if (newName && newName.trim() !== "") {
        currentPlayerName = newName.trim();
        localStorage.setItem("tavernPlayerName", currentPlayerName);
        document.getElementById("display-name").innerText = currentPlayerName;
        applyRoleStyling(userRole);
    }
}

initializeIdentity();

// UI Toggles
function toggleAdvDis(type) {
    let advBtn = document.getElementById("btn-adv");
    let disBtn = document.getElementById("btn-dis");
    if (type === 'adv') {
        if (advBtn.classList.contains('active')) advBtn.classList.remove('active');
        else { advBtn.classList.add('active'); disBtn.classList.remove('active'); }
    } else {
        if (disBtn.classList.contains('active')) disBtn.classList.remove('active');
        else { disBtn.classList.add('active'); advBtn.classList.remove('active'); }
    }
}

function toggleSecret() {
    isSecretRoll = !isSecretRoll;
    document.getElementById("btn-secret").classList.toggle("active", isSecretRoll);
}

function toggleCharSheet() {
    let sheet = document.getElementById("char-sidebar");
    if(sheet) sheet.classList.toggle("open");
}

function toggleDmScreen() {
    let screen = document.getElementById("dm-screen");
    if(screen) screen.classList.toggle("hidden-modal");
}