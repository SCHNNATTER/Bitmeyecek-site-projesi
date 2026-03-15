// ==========================================
// 🧝 SHARED TOKEN VAULT LOGIC
// ==========================================

const tokensRef = database.ref('token_vault');
let savedTokens = []; // Now populated by Firebase
let dropQueue = []; // Tracks which tokens you want to drop

// 1. Listen for Vault Updates in Real-Time
tokensRef.on('value', (snapshot) => {
    savedTokens = [];
    snapshot.forEach((childSnapshot) => {
        savedTokens.push({
            id: childSnapshot.key,
            image: childSnapshot.val().image
        });
    });
    renderTokens();
});

function toggleTokenVault() {
    document.getElementById('token-vault').classList.toggle('hidden-modal');
    dropQueue = []; // Empty the queue if you close/reopen the vault
    updateQueueButton();
    renderTokens(); 
}

function handleTokenUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    // Safety check: Prevent massive images from lagging the Firebase database
    if (file.size > 1024 * 1024) {
        alert("File is too large! Please keep tokens under 1MB.");
        event.target.value = ""; 
        return;
    }

    const reader = new FileReader();
    reader.onload = function(f) {
        const base64Data = f.target.result;
        // Push straight to Firebase instead of localStorage
        tokensRef.push({ image: base64Data });
    };
    reader.readAsDataURL(file);
    event.target.value = ""; 
}

// Visual updates for the Drop Button
function updateQueueButton() {
    const btn = document.getElementById('btn-drop-queue');
    if (dropQueue.length > 0) {
        btn.style.display = "block";
        btn.innerHTML = `⬇️ Drop (${dropQueue.length}) Tokens`;
    } else {
        btn.style.display = "none";
    }
}

function renderTokens() {
    const grid = document.getElementById('token-grid');
    if (!grid) return;
    grid.innerHTML = ''; 
    
    savedTokens.forEach((tokenObj) => {
        const queueCount = dropQueue.filter(t => t.id === tokenObj.id).length;

        const div = document.createElement('div');
        let borderStyle = queueCount > 0 ? "border-color: #44ff44; box-shadow: 0 0 10px rgba(68, 255, 68, 0.5);" : "border-color: #333;";
        
        div.style.cssText = `position: relative; width: 100px; height: 100px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; background: #222; transition: 0.2s; ${borderStyle}`;
        
        div.onmouseover = () => { if(queueCount === 0) div.style.borderColor = "#4477ff"; };
        div.onmouseout = () => { if(queueCount === 0) div.style.borderColor = "#333"; };
        
        div.onclick = () => {
            dropQueue.push(tokenObj);
            updateQueueButton();
            renderTokens(); 
        };
        
        const img = document.createElement('img');
        img.src = tokenObj.image;
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover; pointer-events: none; border-radius: 50%;";

        const delBtn = document.createElement('button');
        delBtn.innerHTML = "✖";
        delBtn.title = "Delete Token";
        delBtn.style.cssText = "position: absolute; top: -5px; right: -5px; background: rgba(220, 20, 60, 1); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);";
        
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            if(confirm("Delete this token from the shared vault permanently?")) {
                tokensRef.child(tokenObj.id).remove(); // Delete from Firebase
                dropQueue = dropQueue.filter(t => t.id !== tokenObj.id);
                updateQueueButton();
            }
        };

        div.appendChild(img);
        div.appendChild(delBtn);

        if (queueCount > 0) {
            const badge = document.createElement('div');
            badge.innerHTML = queueCount;
            badge.style.cssText = "position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: #44ff44; color: black; font-weight: bold; border-radius: 10px; padding: 2px 10px; font-size: 14px; z-index: 5; pointer-events: none; box-shadow: 0 2px 5px rgba(0,0,0,0.5);";
            div.appendChild(badge);
        }

        grid.appendChild(div);
    });
}

function dropQueuedTokens() {
    if (dropQueue.length === 0) return;

    // Instantly close the vaults
    const tokenVault = document.getElementById('token-vault');
    const dmScreen = document.getElementById('dm-screen');
    if (tokenVault) tokenVault.classList.add('hidden-modal');
    if (dmScreen) dmScreen.classList.add('hidden-modal');

    const center = canvas.getVpCenter();
    let dropOffset = 0;

    // Loop through every queued token and drop it
    dropQueue.forEach((tokenObj, i) => {
        fabric.Image.fromURL(tokenObj.image, function(img) {
            img.scaleToWidth(80);
            img.scaleToHeight(80);
            
            // THE OFFSET & MULTIPLAYER SYNC FIX
            img.set({
                id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000), // Required for Firebase
                selectable: true, // Required to grab it
                evented: true,    // Required to click it
                isFog: false,     // Guarantees it won't act like fog
                left: center.x + (dropOffset * 20),
                top: center.y + (dropOffset * 20),
                originX: 'center',
                originY: 'center',
                borderColor: '#ffcc00', 
                cornerColor: '#ffcc00',
                cornerSize: 8,
                transparentCorners: false
            });

            canvas.add(img);
            
            // Make the very last token in the pile the "Active" selected one
            if (i === dropQueue.length - 1) {
                canvas.setActiveObject(img);
            }
            
            canvas.renderAll();
            dropOffset++; 
            
            // Force the whiteboard to recognize the new interactive objects
            if (typeof updateInteractions === "function") {
                updateInteractions();
            }
        });
    });

    // Reset everything
    dropQueue = [];
    updateQueueButton();
    if(typeof setMode === 'function') setMode('select');
}