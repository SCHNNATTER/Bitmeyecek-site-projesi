const canvas = new fabric.Canvas('whiteboard', { selection: true });

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
        });
    };
    reader.readAsDataURL(file);
    event.target.value = ''; 
}

function clearBoard() {
    if(confirm("Are you sure you want to clear the entire map?")) {
        canvas.clear();
        canvas.backgroundColor = null; 
    }
}

window.addEventListener('keydown', function(e) {
    if (e.key === "Delete" || e.key === "Backspace") {
        if (e.target.tagName.toLowerCase() === 'input') return; 
        const activeObjects = canvas.getActiveObjects();
        if (activeObjects.length) {
            canvas.discardActiveObject();
            activeObjects.forEach(function(object) { canvas.remove(object); });
        }
    }
});

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