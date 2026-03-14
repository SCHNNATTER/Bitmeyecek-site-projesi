// 1. Initialize the Fabric Canvas
const canvas = new fabric.Canvas('whiteboard', { selection: true });

// --- FIREBASE SYNC SETUP ---
// We tap into the existing Firebase database from script.js
const boardRef = database.ref('whiteboard_state');
let isUpdatingFromServer = false;

// 2. Make the canvas fit its container
function resizeCanvas() {
    const container = document.getElementById('canvas-container');
    if(container) {
        canvas.setWidth(container.clientWidth);
        canvas.setHeight(container.clientHeight);
        canvas.renderAll();
    }
}
window.addEventListener('resize', resizeCanvas);
setTimeout(resizeCanvas, 100); 

// Brush Setup
canvas.freeDrawingBrush.color = '#ff4444';
canvas.freeDrawingBrush.width = 3;

// --- THE SYNC ENGINE ---

// Send our board to Firebase
function saveBoardState() {
    // If we are currently drawing what a friend sent, don't echo it back!
    if (isUpdatingFromServer) return; 
    
    // Convert the entire canvas (drawings and images) into a neat JSON string
    const jsonState = JSON.stringify(canvas.toJSON());
    boardRef.set(jsonState);
}

// Listen for updates from friends
boardRef.on('value', (snapshot) => {
    const state = snapshot.val();
    
    if (state) {
        isUpdatingFromServer = true; // Turn on the mute button
        canvas.loadFromJSON(state, function() {
            canvas.renderAll();
            isUpdatingFromServer = false; // Turn off the mute button
        });
    } else {
        // Someone cleared the board!
        isUpdatingFromServer = true;
        canvas.clear();
        canvas.backgroundColor = null;
        canvas.renderAll();
        isUpdatingFromServer = false;
    }
});

// Trigger a save whenever we finish drawing a line or moving an object
canvas.on('path:created', saveBoardState);
canvas.on('object:modified', saveBoardState);


// 3. Toolbar Logic
function setMode(mode) {
    let btnSelect = document.getElementById('btn-select');
    let btnDraw = document.getElementById('btn-draw');

    if (mode === 'draw') {
        canvas.isDrawingMode = true;
        btnDraw.classList.add('active');
        btnSelect.classList.remove('active');
    } else {
        canvas.isDrawingMode = false;
        btnSelect.classList.add('active');
        btnDraw.classList.remove('active');
    }
}

// 4. Add Images (Maps & Tokens)
function addImage(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(f) {
        const data = f.target.result;
        fabric.Image.fromURL(data, function(img) {
            if (img.width > canvas.width) img.scaleToWidth(canvas.width * 0.8);
            canvas.add(img);
            canvas.viewportCenterObject(img);
            canvas.setActiveObject(img);
            setMode('select'); 
            
            // Sync the new image to everyone!
            saveBoardState();
        });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; 
}

// 5. Clear the Board
function clearBoard() {
    if(confirm("Are you sure you want to clear the entire map FOR EVERYONE?")) {
        canvas.clear();
        canvas.backgroundColor = null; 
        
        // Sync the destruction!
        saveBoardState();
    }
}

// 6. Delete Selected Item
window.addEventListener('keydown', function(e) {
    if (e.key === "Delete" || e.key === "Backspace") {
        if (e.target.tagName.toLowerCase() === 'input') return; 
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            canvas.discardActiveObject();
            activeObjects.forEach(function(object) { canvas.remove(object); });
            
            // Sync the deletion!
            saveBoardState();
        }
    }
});

// --- CAMERA CONTROLS: ZOOM & PAN (THESE DO NOT SYNC) ---
canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom();
    zoom *= 0.999 ** delta;
    if (zoom > 20) zoom = 20; 
    if (zoom < 0.1) zoom = 0.1; 
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault();
    opt.e.stopPropagation();
});

let isDragging = false;
let lastPosX; let lastPosY;

canvas.on('mouse:down', function(opt) {
    let evt = opt.e;
    if (evt.altKey || evt.button === 1) {
        isDragging = true;
        canvas.selection = false;
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
    }
});

canvas.on('mouse:move', function(opt) {
    if (isDragging) {
        let e = opt.e;
        let vpt = canvas.viewportTransform;
        vpt[4] += e.clientX - lastPosX;
        vpt[5] += e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = e.clientX;
        lastPosY = e.clientY;
    }
});

canvas.on('mouse:up', function(opt) {
    canvas.setViewportTransform(canvas.viewportTransform);
    isDragging = false;
    canvas.selection = true;
});