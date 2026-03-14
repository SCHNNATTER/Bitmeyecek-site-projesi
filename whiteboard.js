// 1. Initialize the Fabric Canvas
const canvas = new fabric.Canvas('whiteboard', { selection: true });

// --- FIREBASE SYNC SETUP ---
const boardRef = database.ref('whiteboard_objects');
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

canvas.freeDrawingBrush.color = '#ff4444';
canvas.freeDrawingBrush.width = 3;

// --- THE NEW OBJECT-BASED SYNC ENGINE ---

// When something is added (like a drawing path or an image)
canvas.on('object:added', (options) => {
    if (isUpdatingFromServer) return;
    const obj = options.target;
    
    // Give every object a unique ID so we can track it
    if (!obj.id) {
        obj.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }

    // Send only THIS object to Firebase
    boardRef.child(obj.id).set(obj.toJSON(['id']));
});

// When an object is moved or resized
canvas.on('object:modified', (options) => {
    if (isUpdatingFromServer) return;
    const obj = options.target;
    if (obj.id) {
        boardRef.child(obj.id).update(obj.toJSON(['id']));
    }
});

// Listen for new objects from other players
boardRef.on('child_added', (snapshot) => {
    if (isUpdatingFromServer) return;
    const data = snapshot.val();
    
    // Check if we already have this object
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (!existing) {
        isUpdatingFromServer = true;
        fabric.util.enlivenObjects([data], (objects) => {
            objects.forEach(obj => {
                canvas.add(obj);
            });
            canvas.renderAll();
            isUpdatingFromServer = false;
        });
    }
});

// Listen for movements from other players
boardRef.on('child_changed', (snapshot) => {
    if (isUpdatingFromServer) return;
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    
    if (existing) {
        isUpdatingFromServer = true;
        existing.set(data);
        existing.setCoords(); // Refresh the bounding box
        canvas.renderAll();
        isUpdatingFromServer = false;
    }
});

// Listen for deletions
boardRef.on('child_removed', (snapshot) => {
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (existing) {
        isUpdatingFromServer = true;
        canvas.remove(existing);
        canvas.renderAll();
        isUpdatingFromServer = false;
    }
});

// 3. Toolbar Logic
function setMode(mode) {
    canvas.isDrawingMode = (mode === 'draw');
    document.getElementById('btn-draw').classList.toggle('active', mode === 'draw');
    document.getElementById('btn-select').classList.toggle('active', mode === 'select');
}

// 4. Add Images
function addImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            if (img.width > canvas.width) img.scaleToWidth(canvas.width * 0.5);
            canvas.add(img);
            canvas.viewportCenterObject(img);
            canvas.setActiveObject(img);
        });
    };
    reader.readAsDataURL(file);
}

// 5. Clear Board
function clearBoard() {
    if(confirm("Clear for everyone?")) {
        boardRef.remove(); // This triggers 'child_removed' for everyone
        canvas.clear();
    }
}

// 6. Delete Key
window.addEventListener('keydown', (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && e.target.tagName !== 'INPUT') {
        canvas.getActiveObjects().forEach(obj => {
            if (obj.id) boardRef.child(obj.id).remove();
            canvas.remove(obj);
        });
        canvas.discardActiveObject().renderAll();
    }
});

// --- CAMERA (LOCAL ONLY) ---
canvas.on('mouse:wheel', function(opt) {
    let delta = opt.e.deltaY;
    let zoom = canvas.getZoom() * (0.999 ** delta);
    if (zoom > 20) zoom = 20; if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault(); opt.e.stopPropagation();
});

let isDragging = false; let lastPosX; let lastPosY;
canvas.on('mouse:down', function(opt) {
    if (opt.e.altKey || opt.e.button === 1) {
        isDragging = true; canvas.selection = false;
        lastPosX = opt.e.clientX; lastPosY = opt.e.clientY;
    }
});
canvas.on('mouse:move', function(opt) {
    if (isDragging) {
        let vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPosX; vpt[5] += opt.e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = opt.e.clientX; lastPosY = opt.e.clientY;
    }
});
canvas.on('mouse:up', () => { isDragging = false; canvas.selection = true; });