// app.js
const CARD_W = 600;
const CARD_H = 1000;

// Define tus categorías (carpetas dentro de /assets)
const CATEGORIES = [
    { key: "bodies", label: "Figuras" },
    { key: "heads", label: "Cabezas" },
    { key: "hands", label: "Mans" },
    { key: "objects", label: "Obxectos" },
    { key: "creatures", label: "Criaturas" },
    { key: "ornaments", label: "Ornamentos" },
];

// En web estático no podemos listar carpetas sin servidor.
// Solución rápida: rellena estos arrays con tus PNGs (nombres de archivo).
// Luego solo metes los PNGs en assets/<categoria>/.
const ASSET_INDEX = {
    background: [
        "background.png",
    ],
    bodies: [ "body_1.png", "body_2.png" ],
    heads: [ "head_1.png" ],
    hands: [ "h_blessing.png", "h_grabing.png", "h_open.png", "h_signing.png"],
    objects: [ "o_crown.png", "o_scepter.png", "o_aureole.png" ],
    creatures: [ "a_lion.png", "a_beast.png" ],
    ornaments: [ "ornament_1.png" ],
};

// ---------- UI ----------
const tabsEl = document.getElementById("tabs");
const gridEl = document.getElementById("assetGrid");
const titleInput = document.getElementById("titleInput");
const numberInput = document.getElementById("numberInput");
const flipXBtn = document.getElementById("flipXBtn");
const flipYBtn = document.getElementById("flipYBtn");
const exportBtn = document.getElementById("exportBtn");
const deleteBtn = document.getElementById("deleteBtn");
const clearBtn = document.getElementById("clearBtn");
const bringFrontBtn = document.getElementById("bringFrontBtn");
const sendBackBtn = document.getElementById("sendBackBtn");
const moveUpBtn = document.getElementById("moveUpBtn");
const moveDownBtn = document.getElementById("moveDownBtn");

// ---------- Konva Stage ----------
const stage = new Konva.Stage({
    container: "stage",
    width: CARD_W,
    height: CARD_H
});

function fitStageIntoParent() {
    const wrap = document.querySelector(".canvasWrap");
    if (!wrap) return;

    const containerWidth = Math.max(1, wrap.clientWidth - 32);
    const containerHeight = Math.max(1, wrap.clientHeight - 32);

    let scale = Math.min(containerWidth / CARD_W, containerHeight / CARD_H, 1);

    // evita “desaparecer”
    scale = Math.max(0.12, scale);

    stage.scale({ x: scale, y: scale });
    stage.width(CARD_W * scale);
    stage.height(CARD_H * scale);
    stage.draw();
}

// Mejor que window.resize: observa cambios reales del contenedor
const ro = new ResizeObserver(() => fitStageIntoParent());
ro.observe(document.querySelector(".canvasWrap"));

// Primer encaje
fitStageIntoParent();

const layerBg = new Konva.Layer();
const layerMain = new Konva.Layer();
const layerUi = new Konva.Layer(); // título + transformer

stage.add(layerBg);
stage.add(layerMain);
stage.add(layerUi);

// Background (se cambia con select)
let bgNode = null;

function setBackground(filename) {
    const url = `assets/background/${filename}`;
    Konva.Image.fromURL(url, (imgNode) => {
        imgNode.setAttrs({ x: 0, y: 0, width: CARD_W, height: CARD_H, listening: false });
        if (bgNode) bgNode.destroy();
        bgNode = imgNode;
        layerBg.add(bgNode);
        layerBg.draw();
    }, (err) => console.error("BG load error:", err));
}

// Title
const TITLE_BAND_HEIGHT = 90;   // aprox. para cartas Marsella
const TITLE_OFFSET = CARD_H - TITLE_BAND_HEIGHT + 10;
const titleNode = new Konva.Text({
    x: 0,
    y: TITLE_OFFSET,
    width: CARD_W,
    align: "center",
    text: "",
    fontSize: 36,
    fontFamily: "Cormorant Unicase",
    fill: "#171711",
    listening: false,
    fontWeight: 700,
});
layerUi.add(titleNode);

const numberNode = new Konva.Text({
    x: 0,
    y: 55,
    width: CARD_W,
    align: "center",
    text: "",
    fontSize: 32,
    fontFamily: "Cormorant Unicase",
    fill: "#111",
    listening: false,
    fontWeight: "bold",
});
layerUi.add(numberNode);

// Transformer (handles)
const tr = new Konva.Transformer({
    rotateEnabled: true,
    enabledAnchors: [
        "top-left", "top-right", "bottom-left", "bottom-right",
        "middle-left", "middle-right", "top-center", "bottom-center"
    ],
    boundBoxFunc: (oldBox, newBox) => {
        // evita que se haga microscópico
        if (newBox.width < 20 || newBox.height < 20) return oldBox;
        return newBox;
    }
});
layerUi.add(tr);

let selectedNode = null;
function selectNode(node) {
    selectedNode = node;
    tr.nodes(node ? [node] : []);
    layerUi.draw();
}

stage.on("click tap", (e) => {
    // click vacío: deselecciona
    if (e.target === stage || e.target === bgNode) {
        selectNode(null);
        return;
    }
    // selecciona cualquier nodo arrastrable
    selectNode(e.target);
});

// Teclas borrar
window.addEventListener("keydown", (e) => {
    if ((e.key === "Delete" || e.key === "Backspace") && selectedNode) {
        selectedNode.destroy();
        selectNode(null);
        layerMain.draw();
    }
});

// Add asset to canvas
function addAsset(category, filename) {
    const url = `assets/${category}/${filename}`;
    Konva.Image.fromURL(url, (imgNode) => {
        imgNode.setAttrs({
            x: CARD_W / 2 - 150,
            y: CARD_H / 2 - 150,
            draggable: true,
        });

        // Ajuste inicial de tamaño manteniendo proporción
        const maxW = 300;
        const maxH = 300;
        const scale = Math.min(maxW / imgNode.width(), maxH / imgNode.height(), 1);
        imgNode.scale({ x: scale, y: scale });

        // mejora interacción
        imgNode.on("mouseover", () => (document.body.style.cursor = "move"));
        imgNode.on("mouseout", () => (document.body.style.cursor = "default"));

        layerMain.add(imgNode);
        layerMain.draw();
        selectNode(imgNode);
    }, (err) => console.error("Asset load error:", err));
}

// Render tabs
let activeCategory = CATEGORIES[0].key;

function renderTabs() {
    tabsEl.innerHTML = "";
    for (const c of CATEGORIES) {
        const btn = document.createElement("div");
        btn.className = "tab" + (c.key === activeCategory ? " active" : "");
        btn.textContent = c.label;
        btn.onclick = () => {
            activeCategory = c.key;
            renderTabs();
            renderGrid();
        };
        tabsEl.appendChild(btn);
    }
}

function renderGrid() {
    gridEl.innerHTML = "";
    const items = ASSET_INDEX[activeCategory] || [];
    if (!items.length) {
        const p = document.createElement("p");
        p.style.gridColumn = "1 / -1";
        p.style.color = "#666";
        p.style.fontSize = "13px";
        p.textContent = "Añade nombres de PNG a ASSET_INDEX en app.js (o mete algunos de ejemplo).";
        gridEl.appendChild(p);
        return;
    }

    for (const file of items) {
        const card = document.createElement("div");
        card.className = "asset";
        const img = document.createElement("img");
        img.src = `assets/${activeCategory}/${file}`;
        img.alt = file;
        card.appendChild(img);
        card.onclick = () => addAsset(activeCategory, file);
        gridEl.appendChild(card);
    }
}

numberInput.addEventListener("input", () => {
    numberNode.text(numberInput.value.toUpperCase());
    layerUi.draw();
});

// Title input
titleInput.addEventListener("input", () => {
    titleNode.text(titleInput.value);
    layerUi.draw();
});

// Export
exportBtn.onclick = () => {
    selectNode(null); // oculta transformer

    // guarda estado responsive actual
    const oldScale = stage.scaleX();
    const oldW = stage.width();
    const oldH = stage.height();

    // pon el stage a tamaño real para export
    stage.scale({ x: 1, y: 1 });
    stage.width(CARD_W);
    stage.height(CARD_H);
    stage.draw();

    const dataURL = stage.toDataURL({ pixelRatio: 2 });

    // restaura estado responsive
    stage.scale({ x: oldScale, y: oldScale });
    stage.width(oldW);
    stage.height(oldH);
    stage.draw();

    const a = document.createElement("a");
    a.href = dataURL;
    a.download = (titleInput.value || "tarot").trim().replace(/\s+/g, "_") + ".png";
    a.click();
};

// Delete selected
deleteBtn.onclick = () => {
    if (!selectedNode) return;
    selectedNode.destroy();
    selectNode(null);
    layerMain.draw();
};

// Clear all (except bg + title)
clearBtn.onclick = () => {
    layerMain.destroyChildren();
    selectNode(null);
    layerMain.draw();
};

flipXBtn.onclick = () => {
    if (!selectedNode) return;
    const scaleX = selectedNode.scaleX();
    selectedNode.scaleX(scaleX * -1);
    layerMain.draw();
};

flipYBtn.onclick = () => {
    if (!selectedNode) return;
    const scaleY = selectedNode.scaleY();
    selectedNode.scaleY(scaleY * -1);
    layerMain.draw();
};

function redrawAfterZChange() {
    // El transformer está en layerUi, así que solo redibujamos main y ui
    layerMain.draw();
    layerUi.draw();
}

bringFrontBtn.onclick = () => {
    if (!selectedNode) return;
    selectedNode.moveToTop();      // dentro de layerMain
    redrawAfterZChange();
};

sendBackBtn.onclick = () => {
    if (!selectedNode) return;
    selectedNode.moveToBottom();
    redrawAfterZChange();
};

moveUpBtn.onclick = () => {
    if (!selectedNode) return;
    selectedNode.moveUp();         // sube 1 posición
    redrawAfterZChange();
};

moveDownBtn.onclick = () => {
    if (!selectedNode) return;
    selectedNode.moveDown();       // baja 1 posición
    redrawAfterZChange();
};

// Init
renderTabs();
renderGrid();
setBackground(ASSET_INDEX.background[0]); 
titleNode.text("");
layerUi.draw();
