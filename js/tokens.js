// ==========================================
// 🧝 TOKEN VAULT LOGIC (js/tokens.js)
// ==========================================

let savedTokens = JSON.parse(localStorage.getItem('dndTokens')) || [];
let dropQueue = []; // This tracks which tokens you want to drop

function toggleTokenVault() {
    document.getElementById('token-vault').classList.toggle('hidden-modal');
    dropQueue = []; // Empty the queue if you close/reopen the vault
    updateQueueButton();
    renderTokens(); 
}

function handleTokenUpload(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        const base64Data = f.target.result;
        savedTokens.push(base64Data);
        localStorage.setItem('dndTokens', JSON.stringify(savedTokens));
        renderTokens();
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
    grid.innerHTML = ''; 
    
    savedTokens.forEach((tokenData, index) => {
        const queueCount = dropQueue.filter(t => t === tokenData).length;

        const div = document.createElement('div');
        let borderStyle = queueCount > 0 ? "border-color: #44ff44; box-shadow: 0 0 10px rgba(68, 255, 68, 0.5);" : "border-color: #333;";
        
        // FIX 1: Removed "overflow: hidden;" so buttons can pop out of the circle
        div.style.cssText = `position: relative; width: 100px; height: 100px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; background: #222; transition: 0.2s; ${borderStyle}`;
        
        div.onmouseover = () => { if(queueCount === 0) div.style.borderColor = "#4477ff"; };
        div.onmouseout = () => { if(queueCount === 0) div.style.borderColor = "#333"; };
        
        div.onclick = () => {
            dropQueue.push(tokenData);
            updateQueueButton();
            renderTokens(); 
        };
        
        const img = document.createElement('img');
        img.src = tokenData;
        
        // FIX 2: Added "border-radius: 50%;" directly to the image so it stays round
        img.style.cssText = "width: 100%; height: 100%; object-fit: cover; pointer-events: none; border-radius: 50%;";

        // FIX 3: Swapped to a clean "✖", added a drop shadow, and pushed it slightly outside the circle
        const delBtn = document.createElement('button');
        delBtn.innerHTML = "✖";
        delBtn.title = "Delete Token";
        delBtn.style.cssText = "position: absolute; top: -5px; right: -5px; background: rgba(220, 20, 60, 1); color: white; border: none; border-radius: 50%; width: 28px; height: 28px; font-size: 14px; font-weight: bold; cursor: pointer; display: flex; justify-content: center; align-items: center; z-index: 10; box-shadow: 0 2px 5px rgba(0,0,0,0.5);";
        delBtn.onclick = (e) => {
            e.stopPropagation(); 
            if(confirm("Delete this token permanently?")) {
                savedTokens.splice(index, 1);
                localStorage.setItem('dndTokens', JSON.stringify(savedTokens));
                dropQueue = dropQueue.filter(t => t !== tokenData);
                updateQueueButton();
                renderTokens();
            }
        };

        div.appendChild(img);
        div.appendChild(delBtn);

        if (queueCount > 0) {
            const badge = document.createElement('div');
            badge.innerHTML = queueCount;
            // The green badge will also pop out over the edge nicely now!
            badge.style.cssText = "position: absolute; bottom: -5px; left: 50%; transform: translateX(-50%); background: #44ff44; color: black; font-weight: bold; border-radius: 10px; padding: 2px 10px; font-size: 14px; z-index: 5; pointer-events: none; box-shadow: 0 2px 5px rgba(0,0,0,0.5);";
            div.appendChild(badge);
        }

        grid.appendChild(div);
    });
}

function dropQueuedTokens() {
    if (dropQueue.length === 0) return;

    // 1. Instantly close the vaults
    document.getElementById('token-vault').classList.add('hidden-modal');
    document.getElementById('dm-screen').classList.add('hidden-modal');

    const center = canvas.getVpCenter();
    let dropOffset = 0;

    // 2. Loop through every queued token and drop it
    dropQueue.forEach((base64Image, i) => {
        fabric.Image.fromURL(base64Image, function(img) {
            img.scaleToWidth(80);
            img.scaleToHeight(80);
            
            // 3. THE OFFSET: Moves each token 20 pixels down and to the right!
            img.set({
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
            dropOffset++; // Increase the offset so the next token drops further down
        });
    });

    // 4. Reset everything
    dropQueue = [];
    updateQueueButton();
    if(typeof setMode === 'function') setMode('select');
}