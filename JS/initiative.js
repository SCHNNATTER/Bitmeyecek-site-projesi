// ==========================================
// INITIATIVE TRACKER
// ==========================================
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
function clearInitiative() { if(confirm("Clear initiative for everyone?")) initRef.remove(); }

initRef.on('value', (snapshot) => {
    const listEl = document.getElementById("init-list");
    if(listEl) listEl.innerHTML = "";
    
    let combatants = [];
    snapshot.forEach((child) => { combatants.push({ id: child.key, ...child.val() }); });
    combatants.sort((a, b) => b.score - a.score);

    combatants.forEach((c) => {
        const li = document.createElement("li");
        li.className = "init-item";
        li.innerHTML = `<span class="init-score">${c.score}</span><span class="init-name">${c.name}</span><span class="init-delete" onclick="deleteInitiative('${c.id}')">×</span>`;
        if(listEl) listEl.appendChild(li);
    });
});