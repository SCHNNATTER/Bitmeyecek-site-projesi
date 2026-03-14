// 1. Initialize the Fabric Canvas
const canvas = new fabric.Canvas('whiteboard', { 
    selection: true,
    backgroundColor: '#18181b' // Sets the grayer background
});

const boardRef = database.ref('whiteboard_objects');
let isUpdatingFromServer = false;

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

// --- LAYER & LOCK FUNCTIONS ---

function bringFront() {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.bringToFront();
        saveObjectChange(activeObj);
    }
}

function sendBack() {
    const activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.sendToBack();
        saveObjectChange(activeObj);
    }
}

function toggleLock() {
    const activeObj = canvas.getActiveObject();
    if (!activeObj) return;

    // Toggle the locked state
    const isLocked = !activeObj.lockMovementX;

    activeObj.set({
        lockMovementX: isLocked,
        lockMovementY: isLocked,
        lockScalingX: isLocked,
        lockScalingY: isLocked,
        lockRotation: isLocked,
        hasControls: !isLocked, // Hide the "grab handles" if locked
        hoverCursor: isLocked ? 'default' : 'move'
    });

    // Visual feedback: change border color if locked
    activeObj.borderColor = isLocked ? '#ff4444' : '#3399ff';

    canvas.renderAll();
    saveObjectChange(activeObj);
}

// Helper to update Firebase when we change layers/locks
function saveObjectChange(obj) {
    if (isUpdatingFromServer) return;
    if (obj.id) {
        boardRef.child(obj.id).update(obj.toJSON(['id', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'borderColor']));
    }
}

// --- SYNC ENGINE ---

canvas.on('object:added', (options) => {
    if (isUpdatingFromServer) return;
    const obj = options.target;
    if (!obj.id) {
        obj.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    }
    boardRef.child(obj.id).set(obj.toJSON(['id', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'borderColor']));
});

canvas.on('object:modified', (options) => {
    saveObjectChange(options.target);
});

boardRef.on('child_added', (snapshot) => {
    if (isUpdatingFromServer) return;
    const data = snapshot.val();
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

boardRef.on('child_changed', (snapshot) => {
    if (isUpdatingFromServer) return;
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (existing) {
        isUpdatingFromServer = true;
        existing.set(data);
        existing.setCoords();
        // If it's a re-layering (z-index change), we need to sort the canvas
        canvas.sortObjects(); 
        canvas.renderAll();
        isUpdatingFromServer = false;
    }
});

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

// --- TOOLBAR & CAMERA (REST OF CODE) ---

function setMode(mode) {
    canvas.isDrawingMode = (mode === 'draw');
    document.getElementById('btn-draw').classList.toggle('active', mode === 'draw');
    document.getElementById('btn-select').classList.toggle('active', mode === 'select');
}

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

function clearBoard() {
    if(confirm("Clear for everyone?")) {
        boardRef.remove();
        canvas.clear();
        canvas.backgroundColor = '#18181b';
        canvas.renderAll();
    }
}

window.addEventListener('keydown', (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && e.target.tagName !== 'INPUT') {
        canvas.getActiveObjects().forEach(obj => {
            // Only allow deleting if it's NOT locked!
            if (!obj.lockMovementX) {
                if (obj.id) boardRef.child(obj.id).remove();
                canvas.remove(obj);
            }
        });
        canvas.discardActiveObject().renderAll();
    }
});

// CAMERA CONTROLS
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