// ==========================================
// 🎨 MASTER WHITEBOARD CONFIG
// ==========================================
function isUserDM() {
    // A bulletproof check that handles weird localStorage formatting
    const roleStr = String(localStorage.getItem('tavernUserRole') || localStorage.getItem('role') || localStorage.getItem('userRole')).toUpperCase();
    return roleStr.includes('DM');
}

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

// Variables for Fog Shapes
let isDrawingFog = false;
let origX, origY, fogShape;
let isErasingFog = false;

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

// ==========================================
// 🛠️ WHITEBOARD TOOLBAR TOGGLE
// ==========================================
function toggleToolbar() {
    const toolbar = document.getElementById('whiteboard-toolbar');
    const tab = document.getElementById('toolbar-tab');
    
    if (!toolbar || !tab) return;

    // Toggle the animation class
    toolbar.classList.toggle('collapsed');

    // Update the text based on whether the class is there
    if (toolbar.classList.contains('collapsed')) {
        tab.innerHTML = '🛠️ Show Tools ▼';
    } else {
        tab.innerHTML = '🛠️ Hide Tools ▲';
    }
}

// ==========================================
// 🔻 DROPDOWN MENU CONTROLLERS
// ==========================================
function toggleDropdown(menuId) {
    const menu = document.getElementById(menuId);
    if (!menu) return; 
    const isShowing = menu.style.display === 'flex';
    hideDropdowns(); 
    if (!isShowing) menu.style.display = 'flex';
}

function hideDropdowns() {
    const drawMenu = document.getElementById('draw-menu');
    const fogMenu = document.getElementById('fog-menu');
    if (drawMenu) drawMenu.style.display = 'none';
    if (fogMenu) fogMenu.style.display = 'none';
}

// ==========================================
// 🔄 FIREBASE SYNC ENGINE (FORCE INJECTED)
// ==========================================
// This guarantees Fabric never strips our custom tags before sending to Firebase!
function getFirebasePayload(obj) {
    const payload = obj.toJSON(['id', 'isFog', 'lockMovementX', 'lockMovementY', 'lockScalingX', 'lockScalingY', 'lockRotation', 'hasControls', 'borderColor', 'selectable', 'evented']);
    payload.id = obj.id; 
    payload.isFog = obj.isFog === true; 
    return payload;
}

canvas.on('object:added', (options) => {
    if (isUpdatingFromServer) return;
    const obj = options.target;
    if (!obj.id) obj.id = 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000);
    boardRef.child(obj.id).set(getFirebasePayload(obj));
});

function saveObjectChange(obj) {
    if (isUpdatingFromServer || !obj.id) return;
    boardRef.child(obj.id).update(getFirebasePayload(obj));
}

boardRef.on('child_added', (snapshot) => {
    const data = snapshot.val();
    if (canvas.getObjects().find(o => o.id === data.id)) return;
    isUpdatingFromServer = true;
    
    fabric.util.enlivenObjects([data], (objects) => {
        objects.forEach(obj => {
            // Re-inject the properties immediately upon receiving
            obj.id = data.id;
            obj.isFog = data.isFog;

            if (obj.isFog) {
                obj.set({ 
                    opacity: isUserDM() ? 0.6 : 1.0, 
                    selectable: (currentMode === 'fog-select'),
                    evented: (currentMode === 'fog-select' || currentMode === 'fog-erase') 
                });
            }
            canvas.add(obj);
        });
        isUpdatingFromServer = false;
        canvas.renderAll();
    });
});

boardRef.on('child_changed', (snapshot) => {
    const data = snapshot.val();
    const existing = canvas.getObjects().find(o => o.id === data.id);
    if (existing) {
        isUpdatingFromServer = true;
        existing.set(data);
        
        existing.id = data.id;
        existing.isFog = data.isFog;
        
        if (existing.isFog) { 
            existing.set({ 
                opacity: isUserDM() ? 0.6 : 1.0,
                selectable: (currentMode === 'fog-select'),
                evented: (currentMode === 'fog-select' || currentMode === 'fog-erase') 
            }); 
        }
        
        existing.setCoords();
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
        isUpdatingFromServer = false;
    }
});

// ==========================================
// 🖱️ MASTER MOUSE CONTROLLER (UNIFIED)
// ==========================================
canvas.on('mouse:down', function(opt) {
    if (typeof hideDropdowns === 'function') hideDropdowns();
    const evt = opt.e;
    const pointer = canvas.getPointer(evt);
    const currentTime = new Date().getTime();

    // 1. FOG CREATE (Start drawing a rectangle)
    if (currentMode === 'fog-create') {
        isDrawingFog = true;
        origX = pointer.x;
        origY = pointer.y;
        
        fogShape = new fabric.Rect({
            left: origX, top: origY, width: 0, height: 0,
            fill: fogColor, isFog: true,
            opacity: isUserDM() ? 0.6 : 1.0,
            selectable: false, evented: false,
            id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000)
        });
        canvas.add(fogShape);
        return;
    }

    // 2. FOG ERASE (Laser Eraser)
    if (currentMode === 'fog-erase') {
        isErasingFog = true;
        if (opt.target && opt.target.isFog) {
            if (opt.target.id) boardRef.child(opt.target.id).remove();
            canvas.remove(opt.target);
            canvas.requestRenderAll();
        }
        return;
    }

    // 3. CAMERA PANNING
    if (evt.altKey || evt.button === 1) {
        isDragging = true;
        canvas.selection = false;
        canvas.forEachObject(obj => { obj.selectable = false; obj.evented = false; });
        lastPosX = evt.clientX;
        lastPosY = evt.clientY;
        return;
    }

    // 4. DOUBLE-CLICK PING
    if (currentTime - lastClickTime < 300) {
        database.ref('pings').push({ x: pointer.x, y: pointer.y, color: currentColor, timestamp: Date.now() });
        lastClickTime = 0;
        return;
    }
    lastClickTime = currentTime;

    // 5. TEXT TOOL
    if (currentMode === 'text') {
        const text = new fabric.IText('Click to Edit', {
            left: pointer.x, top: pointer.y, fontFamily: 'Georgia, serif', fill: currentColor, fontSize: 28, fontWeight: 'bold'
        });
        canvas.add(text);
        canvas.setActiveObject(text);
        text.enterEditing();
        text.selectAll();
        setMode('select');
        return;
    }

    // 6. BULLETPROOF DESELECT (Fixes the "Sticky Token")
    if (currentMode === 'select' || currentMode === 'fog-select') {
        // If we click true empty space, OR if we accidentally click a fog box while in select mode
        if (!opt.target || (opt.target && opt.target.isFog && currentMode === 'select')) {
            canvas.discardActiveObject();
            canvas.requestRenderAll();
        }
    }
});

canvas.on('mouse:move', function(opt) {
    const pointer = canvas.getPointer(opt.e);

    if (isDrawingFog && fogShape) {
        if (origX > pointer.x) { fogShape.set({ left: pointer.x }); }
        if (origY > pointer.y) { fogShape.set({ top: pointer.y }); }
        fogShape.set({ width: Math.abs(origX - pointer.x), height: Math.abs(origY - pointer.y) });
        canvas.requestRenderAll();
        return;
    }

    if (currentMode === 'fog-erase' && isErasingFog) {
        if (opt.target && opt.target.isFog) {
            if (opt.target.id) boardRef.child(opt.target.id).remove();
            canvas.remove(opt.target);
            canvas.requestRenderAll();
        }
        return;
    }

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
    isErasingFog = false;
    
    // Force dragging to end unconditionally so tokens never stick!
    if (isDragging) {
        isDragging = false;
        updateInteractions(); 
    }

    if (isDrawingFog) {
        isDrawingFog = false;
        if (fogShape) {
            fogShape.setCoords();
            saveObjectChange(fogShape); 
            fogShape = null;
        }
    }
});

canvas.on('mouse:wheel', function(opt) {
    let zoom = canvas.getZoom() * (0.999 ** opt.e.deltaY);
    if (zoom > 20) zoom = 20; if (zoom < 0.1) zoom = 0.1;
    canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
    opt.e.preventDefault(); opt.e.stopPropagation();
});

// ==========================================
// 🛠️ TOOLBAR & MODE FUNCTIONS
// ==========================================
function setMode(mode) {
    currentMode = mode;
    document.querySelectorAll('#whiteboard-toolbar .wb-btn').forEach(b => b.classList.remove('active'));
    
    if (mode.startsWith('fog')) document.getElementById('btn-fog').classList.add('active');
    else if (document.getElementById('btn-' + mode)) document.getElementById('btn-' + mode).classList.add('active');

    canvas.isDrawingMode = (mode === 'draw');
    if (mode === 'draw') {
        canvas.freeDrawingBrush.color = currentColor;
        canvas.freeDrawingBrush.width = 5;
    }
    
    updateInteractions();
    
    const palette = document.getElementById('color-palette');
    if (palette) palette.style.display = (mode === 'draw' || mode === 'text') ? 'flex' : 'none';
    
    canvas.renderAll();
}

function updateInteractions() {
    canvas.selection = (currentMode === 'select' || currentMode === 'fog-select');
    
    canvas.getObjects().forEach(obj => {
        if (obj.isFog) {
            const canModifyFog = (currentMode === 'fog-select');
            obj.set({
                selectable: canModifyFog,
                evented: (canModifyFog || currentMode === 'fog-erase'),
                lockMovementX: !canModifyFog, lockMovementY: !canModifyFog,
                lockScalingX: !canModifyFog, lockScalingY: !canModifyFog,
                lockRotation: true, hasControls: canModifyFog,
                strokeUniform: true
            });
            canvas.bringToFront(obj);
        } else {
            const isSelectMode = (currentMode === 'select');
            obj.set({ selectable: isSelectMode, evented: isSelectMode });
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

function bringFront() { 
    const obj = canvas.getActiveObject(); 
    if(obj) { obj.bringToFront(); canvas.getObjects().forEach(o => { if(o.isFog) canvas.bringToFront(o); }); saveObjectChange(obj); } 
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
// 🖼️ IMAGE UPLOAD HANDLER
// ==========================================
function addImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = function(f) {
        fabric.Image.fromURL(f.target.result, function(img) {
            if (img.width > canvas.width) img.scaleToWidth(canvas.width * 0.5);
            
            img.set({
                id: 'obj_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
                selectable: true, evented: true,
                borderColor: '#3399ff', cornerColor: '#3399ff',
                cornerSize: 8, transparentCorners: false
            });

            canvas.add(img);
            canvas.viewportCenterObject(img);
            canvas.setActiveObject(img);
            canvas.renderAll();
            
            if (typeof updateInteractions === "function") updateInteractions();
        });
    };
    reader.readAsDataURL(file);
    event.target.value = "";
}

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
    pingRing.animate('opacity', 0, { onChange: canvas.renderAll.bind(canvas), duration: 1000, onComplete: () => canvas.remove(pingRing) });
}