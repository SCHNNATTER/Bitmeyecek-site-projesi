// ==========================================
// 🎨 MASTER WHITEBOARD CONFIG
// ==========================================
const isUserDM = localStorage.getItem('tavernUserRole') === 'DM';
const fogColor = '#0f0f13'; 
const boardRef = database.ref('whiteboard_objects');

const canvas = new fabric.Canvas('whiteboard', { 
    selection: true,
    backgroundColor: '#18181b'
});

let currentMode = 'select';
let currentColor = '#ff4444';
let isUpdatingFromServer = false;

// Variables for Camera & Interaction
let isDragging = false;
let lastPosX, lastPosY;
let lastClickTime = 0;

// ==========================================
// 🛠️ UI & CANVAS RESIZING
// ==========================================
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

function toggleToolbar() {
    const toolbar = document.getElementById('whiteboard-toolbar');
    const tab = document.getElementById('toolbar-tab');
    toolbar.classList.toggle('collapsed');
    tab.innerHTML = toolbar.classList.contains('collapsed') ? "🛠️ Show Tools ▼" : "🛠️ Hide Tools ▲";
}

// ==========================================
// 🔄 FIREBASE SYNC ENGINE
// ==========================================
canvas.on('object:added', (options) => {
    if (isUpdatingFromServer) return;
    const obj = options.target;
    if (!obj.id) obj.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    boardRef.child(obj.id).set(obj.toJSON(['id', 'isFog', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'borderColor', 'selectable', 'evented']));
});

canvas.on('object:modified', (options) => {
    saveObjectChange(options.target);
});

function saveObjectChange(obj) {
    if (isUpdatingFromServer || !obj.id) return;
    boardRef.child(obj.id).update(obj.toJSON(['id', 'isFog', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'borderColor', 'selectable', 'evented']));
}

boardRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (canvas.getObjects().find(o => o.id === data.id)) return;
    isUpdatingFromServer = true;
    fabric.util.enlivenObjects([data], (objects) => {
        objects.forEach(obj => {
            if (obj.isFog) obj.set({ opacity: isUserDM ? 0.6 : 1.0 });
            canvas.add(obj);
        });
        isUpdatingFromServer = false;
        canvas.renderAll();
    if (data.isFog) {
    obj.set({ 
        opacity: isUserDM ? 0.4 : 1.0, // DMs see through, players don't
        selectable: (currentMode === 'fog'), // Only clickable in fog mode
        evented: (currentMode === 'fog') 
    });
}
    });
});

boardRef.on('child_changed', (snapshot) => {
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (existing) {
        isUpdatingFromServer = true;
        existing.set(data);
        if (existing.isFog) existing.set({ opacity: isUserDM ? 0.6 : 1.0 });
        existing.setCoords();
        canvas.renderAll();
        isUpdatingFromServer = false;
    }
    if (data.isFog) {
    obj.set({ 
        opacity: isUserDM ? 0.4 : 1.0, // DMs see through, players don't
        selectable: (currentMode === 'fog'), // Only clickable in fog mode
        evented: (currentMode === 'fog') 
    });
}
});

boardRef.on('child_removed', (snapshot) => {
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (existing) {
        isUpdatingFromServer = true;
        canvas.remove(existing);
        isUpdatingFromServer = false;
    }
});

// ==========================================
// 🖱️ MASTER MOUSE CONTROLLER (UNIFIED)
// ==========================================
canvas.on('mouse:down', function(opt) {
    const evt = opt.e;
    const pointer = canvas.getPointer(evt);
    const currentTime = new Date().getTime();

    // 1. CAMERA PANNING (Priority #1)
    if (evt.altKey || evt.button === 1) {
        isDragging = true;
        canvas.selection = false;
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        return;
    }

    // 2. DOUBLE-CLICK PING (Priority #2)
    if (currentTime - lastClickTime < 300) {
        database.ref('pings').push({ x: pointer.x, y: pointer.y, color: currentColor, timestamp: Date.now() });
        lastClickTime = 0;
        return;
    }
    lastClickTime = currentTime;

    // 3. TEXT TOOL
    if (currentMode === 'text') {
        const text = new fabric.IText('Click to Edit', {
            left: pointer.x, top: pointer.y,
            fontFamily: 'Georgia, serif', fill: currentColor,
            fontSize: 28, fontWeight: 'bold'
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setMode('select');
        return;
    }

    // 4. EMPTY SPACE DESELECT
    if (!opt.target && currentMode === 'select') {
        canvas.discardActiveObject();
        canvas.requestRenderAll();
    }
});

canvas.on('mouse:move', function(opt) {
    if (isDragging) {
        let vpt = canvas.viewportTransform;
        vpt[4] += opt.e.clientX - lastPosX;
        vpt[5] += opt.e.clientY - lastPosY;
        canvas.requestRenderAll();
        lastPosX = opt.e.clientX;
        lastPosY = opt.e.clientY;
    }
});

canvas.on('mouse:up', function() {
    if (isDragging) {
        isDragging = false;
        updateInteractions(); // Restore selectability based on mode
    }
});

canvas.on('mouse:wheel', function(opt) {
    let zoom = canvas.getZoom() * (0.999 ** opt.e.deltaY);
    if (zoom > 20) zoom = 20; if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault(); opt.e.stopPropagation();
});

// ==========================================
// 🌫️ FOG & DRAWING LOGIC
// ==========================================
canvas.on('path:created', function(opt) {
    const path = opt.path;
    if (currentMode === 'fog') {
        path.set({
            isFog: true,
            opacity: isUserDM ? 0.6 : 1.0,
            strokeLineCap: 'round', strokeLineJoin: 'round',
            selectable: false, evented: false
        });
        canvas.bringToFront(path);
        setMode('select'); 
    } else {
        path.set({ isFog: false });
        bringFogToFront();
    }
});

function bringFogToFront() {
    canvas.getObjects().forEach(obj => { if (obj.isFog) canvas.bringToFront(obj); });
    canvas.renderAll();
}

// ==========================================
// 🛠️ TOOLBAR & MODE FUNCTIONS
// ==========================================
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#whiteboard-toolbar .wb-btn').forEach(b => b.classList.remove('active'));
    if(document.getElementById('btn-' + mode)) document.getElementById('btn-' + mode).classList.add('active');

    canvas.isDrawingMode = (mode === 'draw' || mode === 'fog');
    
    if (mode === 'draw') {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = 5;
    } else if (mode === 'fog') {
        canvas.freeDrawingBrush.color = fogColor;
        canvas.freeDrawingBrush.width = 80;
    }
    
    updateInteractions();
    canvas.renderAll();
}

function updateInteractions() {
    canvas.selection = (currentMode === 'select');
    canvas.getObjects().forEach(obj => {
        if (obj.isFog) {
            // Fog can NEVER be moved, scaled, or rotated, even if selected
            obj.set({
                selectable: (currentMode === 'fog'),
                evented: (currentMode === 'fog'),
                lockMovementX: true,
                lockMovementY: true,
                lockScalingX: true,
                lockScalingY: true,
                lockRotation: true,
                hasControls: false, // Hide the square grab-handles
                strokeUniform: true
            });
            canvas.bringToFront(obj);
        } else {
            // Normal objects (Tokens)
            const isSelectMode = (currentMode === 'select');
            obj.set({
                selectable: isSelectMode,
                evented: isSelectMode
            });
        }
    });
    canvas.renderAll();
}

function setColor(swatchElement, color) {
    currentColor = color;
    document.querySelectorAll('.color-swatch').forEach(s => s.classList.remove('active'));
    swatchElement.classList.add('active');
    if (canvas.freeDrawingBrush) canvas.freeDrawingBrush.color = color;
    
    let activeObj = canvas.getActiveObject();
    if (activeObj) {
        activeObj.set(activeObj.type === 'path' ? { stroke: color } : { fill: color });
        canvas.renderAll();
        saveObjectChange(activeObj);
    }
}

// ==========================================
// 🔝 LAYER & UTILITY FUNCTIONS
// ==========================================
function bringFront() { 
    const obj = canvas.getActiveObject(); 
    if(obj) { obj.bringToFront(); bringFogToFront(); saveObjectChange(obj); } 
}
function sendBack() { 
    const obj = canvas.getActiveObject(); 
    if(obj) { obj.sendToBack(); saveObjectChange(obj); } 
}

function toggleLock() {
    const obj = canvas.getActiveObject();
    if (!obj) return;
    const isLocked = !obj.lockMovementX;
    obj.set({
        lockMovementX: isLocked, lockMovementY: isLocked,
        lockScalingX: isLocked, lockScalingY: isLocked,
        lockRotation: isLocked, hasControls: !isLocked,
        borderColor: isLocked ? '#ff4444' : '#3399ff'
    });
    canvas.renderAll();
    saveObjectChange(obj);
}

function clearBoard() {
    if(confirm("Clear for everyone?")) { boardRef.remove(); canvas.clear(); canvas.backgroundColor = '#18181b'; canvas.renderAll(); }
}

window.addEventListener('keydown', (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && e.target.tagName !== 'INPUT') {
        canvas.getActiveObjects().forEach(obj => {
            if (!obj.lockMovementX) {
                if (obj.id) boardRef.child(obj.id).remove();
                canvas.remove(obj);
            }
        });
        canvas.discardActiveObject().renderAll();
    }
});

// ==========================================
// 🎯 MAP PING SYSTEM
// ==========================================
database.ref('pings').limitToLast(1).on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (Date.now() - data.timestamp < 5000) playPingAnimation(data.x, data.y, data.color);
});

function playPingAnimation(x, y, color) {
    let pingRing = new fabric.Circle({
        left: x, top: y, originX: 'center', originY: 'center',
        radius: 0, fill: 'transparent', stroke: color, strokeWidth: 4,
        selectable: false, evented: false
    });
    canvas.add(pingRing);
    pingRing.animate('radius', 60, { onChange: canvas.renderAll.bind(canvas), duration: 1000, easing: fabric.util.ease.easeOutCubic });
    pingRing.animate('opacity', 0, { 
        onChange: canvas.renderAll.bind(canvas), duration: 1000, 
        onComplete: () => canvas.remove(pingRing) 
    });
}
// ==========================================
// 🖼️ IMAGE UPLOAD HANDLER
// ==========================================
function addImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            // 1. Scale to fit if the image is massive
            if (img.width > canvas.width) img.scaleToWidth(canvas.width * 0.5);
            
            // 2. Set IDs and properties for the Firebase Sync Engine
            img.set({
                id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                selectable: true,
                evented: true,
                borderColor: '#3399ff',
                cornerColor: '#3399ff',
                cornerSize: 8,
                transparentCorners: false
            });

            // 3. Add to board and center it in the user's view
            canvas.add(img);
            canvas.viewportCenterObject(img);
            canvas.setActiveObject(img);
            
            // 4. Force a render so it shows up immediately
            canvas.renderAll();
            
            // 5. Ensure the "Select" logic knows this new object exists
            if (typeof updateInteractions === "function") {
                updateInteractions();
            }
        });
    };
    reader.readAsDataURL(file);
    
    // Reset the input so you can re-upload the same file if you delete/add it again
    event.target.value = "";
}
canvas.on('mouse:over', function(e) {
    if (currentMode === 'fog' && e.target && e.target.isFog) {
        e.target.set('stroke', '#ff0000'); // Turn red when hovering in Fog Mode
        canvas.renderAll();
    }
});

canvas.on('mouse:out', function(e) {
    if (e.target && e.target.isFog) {
        e.target.set('stroke', fogColor); // Return to black
        canvas.renderAll();
    }
});