const UIState = {};
const stateChangeListeners = {};

function injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
        #polygonInfo {
            position: fixed;
            right: 16px;
            bottom: 16px;
            width: 420px;
            min-width: 300px;
            max-height: 60vh;
            overflow: auto;
            background: rgba(0, 0, 0, 0.85);
            color: #e6e6e6;
            padding: 12px 14px;
            font-family: monospace;
            font-size: 15px;
            line-height: 1.4;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            display: none;
        }
        #occupationInfo {
            position: fixed;
            right: 1px;
            top: 130px;
            width: 280px;
            background: rgba(0, 0, 0, 0.85);
            color: #e6e6e6;
            padding: 12px 14px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            transition: transform 0.3s ease;
        }
        #occupationInfo.collapsed {
            transform: translateX(calc(100% + 16px));
        }
        #occupationInfo h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 600;
            color: #4CAF50;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #occupationToggle {
            position: fixed;
            right: 1px;
            top: 130px;
            background: rgba(0, 0, 0, 0.85);
            color: #4CAF50;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            transition: transform 0.3s ease;
        }
        #occupationToggle.open {
            transform: translateX(calc(-296px));
        }
        #occupationToggle:hover {
            background: rgba(0, 0, 0, 0.95);
        }
        #occupationInfo .stat {
            margin: 6px 0;
        }
        #occupationInfo .percentage {
            font-size: 24px;
            font-weight: bold;
            color: #4CAF50;
            margin: 10px 0;
        }
        #pieChart {
            width: 300px;
            height: 150px;
            margin: 15px auto;
            display: block;
        }
        #typeBreakdown {
            margin-top: 10px;
            font-size: 12px;
        }
        .type-item {
            display: flex;
            align-items: center;
            margin: 4px 0;
        }
        .type-color {
            width: 12px;
            height: 12px;
            border-radius: 2px;
            margin-right: 8px;
        }
        #goalsInfo {
            position: fixed;
            right: 1px;
            top: 430px;
            width: 280px;
            background: rgba(0, 0, 0, 0.85);
            color: #e6e6e6;
            padding: 12px 14px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 14px;
            line-height: 1.5;
            border-radius: 8px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            transition: transform 0.3s ease;
        }
        #goalsInfo.collapsed {
            transform: translateX(calc(100% + 16px));
        }
        #goalsInfo h3 {
            margin: 0 0 10px 0;
            font-size: 16px;
            font-weight: 600;
            color: #FF9800;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        #goalsToggle {
            position: fixed;
            right: 1px;
            top: 430px;
            background: rgba(0, 0, 0, 0.85);
            color: #FF9800;
            border: none;
            padding: 8px 12px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 20px;
            z-index: 10000;
            box-shadow: 0 4px 12px rgba(0,0,0,0.45);
            transition: transform 0.3s ease;
        }
        #goalsToggle.open {
            transform: translateX(calc(-296px));
        }
        #goalsToggle:hover {
            background: rgba(0, 0, 0, 0.95);
        }
        .goal-item {
            display: flex;
            align-items: center;
            margin: 8px 0;
            padding: 6px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.05);
        }
        .goal-item.achieved {
            background: rgba(76, 175, 80, 0.2);
        }
        .goal-item.not-achieved {
            background: rgba(244, 67, 54, 0.2);
        }
        .goal-icon {
            font-size: 18px;
            margin-right: 10px;
            min-width: 20px;
        }
        .goal-item.achieved .goal-icon {
            color: #4CAF50;
        }
        .goal-item.not-achieved .goal-icon {
            color: #F44336;
        }
        .goal-description {
            flex: 1;
            font-size: 13px;
        }
        .goal-value {
            font-size: 12px;
            color: #AAA;
            margin-left: 8px;
        }
        .goal-item.error {
            color: #F44336;
            justify-content: center;
        }
    `;
    document.head.appendChild(style);
}

function createInfoPanels() {
    // Create polygon info panel
    const polygonInfo = document.createElement('div');
    polygonInfo.id = 'polygonInfo';
    polygonInfo.setAttribute('aria-live', 'polite');
    polygonInfo.setAttribute('title', 'Polygon informatie');
    document.body.appendChild(polygonInfo);

    // Create occupation toggle button
    const occupationToggle = document.createElement('button');
    occupationToggle.id = 'occupationToggle';
    occupationToggle.textContent = '📊';
    occupationToggle.onclick = toggleOccupation;
    document.body.appendChild(occupationToggle);

    // Create occupation info panel
    const occupationInfo = document.createElement('div');
    occupationInfo.id = 'occupationInfo';
    occupationInfo.className = 'collapsed';
    occupationInfo.innerHTML = `
        <h3>Spoordok Occupation</h3>
        <div class="stat">Spoordok Area: <span id="spoordokArea">--</span> m²</div>
        <div class="stat">Occupied Area: <span id="occupiedArea">--</span> m²</div>
        <div class="percentage"><span id="occupationPercentage">--</span>%</div>
        <canvas id="pieChart"></canvas>
        <div id="typeBreakdown"></div>
    `;
    document.body.appendChild(occupationInfo);
}

function toggleOccupation() {
    const panel = document.getElementById('occupationInfo');
    const btn = document.getElementById('occupationToggle');
    panel.classList.toggle('collapsed');
    btn.classList.toggle('open');
}

function UIsetup() {
    // Inject CSS styles first
    injectStyles();

    // Create info panels
    createInfoPanels();

    const uiContainer = document.createElement("div");
    uiContainer.id = "myUI";
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "10px";
    uiContainer.style.left = "10px";
    uiContainer.style.backgroundColor = "rgba(42, 42, 42, 0.8)";
    uiContainer.style.color = "white";
    uiContainer.style.padding = "10px";
    uiContainer.style.borderRadius = "5px";
    uiContainer.style.zIndex = "100";

    document.body.appendChild(uiContainer);

    // Build static UI
    createStaticUI();

    // Create separate top-right connection/status panel
    createConnectionUI();

    // Build initial dynamic UI
    refreshDynamicUI();
}

function createStaticUI() {
    const uiContainer = document.getElementById("myUI");

    
    // Mode select
    const modeDropdown = createDropdown("modeSelect", ["None", "Polygon", "Model", "Edit"], "Mode:");
    uiContainer.appendChild(modeDropdown);

    // Refresh dynamic UI on mode change
    onUIStateChange("modeSelect", refreshDynamicUI);
    document.addEventListener('object-editor-editmode-changed', (evt) => {
    const info = evt.detail;
    console.log("Edit mode changed (event):", info);

    // Call UI refresh
    refreshDynamicUI();
    });

    // Can add more cases here if needed
    // Note: try to not add cases that also activate other cases or activate automatically
}

function refreshDynamicUI() {
    const uiContainer = document.getElementById("myUI");

    // Remove old dynamic UI elements
    const dynamicContainer = document.getElementById("dynamicUI");
    if (dynamicContainer) uiContainer.removeChild(dynamicContainer);

    // Create a new container for dynamic UI
    const newDynamicContainer = document.createElement("div");
    newDynamicContainer.id = "dynamicUI";

    if (UIState.modeSelect === "polygon") {
        const Types = ["none", ...getAllTypeIds()]; // Dynamically grabs all types

        const objType = createDropdown("objtype", Types, "Type:");
        newDynamicContainer.appendChild(objType);
    }
    if (UIState.modeSelect === "model") {
        const modeDropdown = createDropdown("modelselect", getAllModelIDs(), "Model:");
        newDynamicContainer.appendChild(modeDropdown);
    }

    
    // Editor tab of the dynamic ui got a bit big...
    editorDynamicContainerContent(newDynamicContainer);

    uiContainer.appendChild(newDynamicContainer);
}


// Below are methods that make individual UI components easy
// TODO: The appends are currently very hardcoded per method, could be it's own dynamic method

function createDropdown(id, options, labeltxt) {
    const container = document.createElement("div");
    container.style.marginBottom = "5px";

    const dropLabel = document.createElement("label");
    dropLabel.textContent = labeltxt;
    dropLabel.htmlFor = id;
    dropLabel.style.marginRight = "5px";

    const select = document.createElement("select");
    select.id = id;

    options.forEach(opt => {
        const option = document.createElement("option");
        option.value = opt.toLowerCase();
        option.textContent = opt;
        select.appendChild(option);
    });

    select.addEventListener("change", () => {
        UIState[id] = select.value;
        console.log("UIState updated:", UIState);

        if (stateChangeListeners[id]) {
            stateChangeListeners[id].forEach(callback => callback(select.value));
        }
    });

    container.appendChild(dropLabel);
    container.appendChild(select);
    return container;
}

function onUIStateChange(key, callback) {
    if (!stateChangeListeners[key]) stateChangeListeners[key] = [];
    stateChangeListeners[key].push(callback);
}

// Update the connection status UI from other scripts.
function setConnectionStatus(status, message) {
    const el = document.getElementById('connectionStatus');
    const info = document.getElementById('connectionStatusInfo');
    if (!el) return;
    el.textContent = status || 'Unknown';
    // colour coding
    if (status === 'Connected') {
        el.style.color = '#4CAF50'; // green
    } else if (status === 'Disconnected') {
        el.style.color = '#F44336'; // red
    } else {
        el.style.color = '#FFA500'; // orange
    }
    if (info) info.textContent = message || '';
}

window.setConnectionStatus = setConnectionStatus;

// Create a separate top-right connection/status panel.
function createConnectionUI() {
    const conn = document.createElement('div');
    conn.id = 'connectionUI';
    conn.style.position = 'absolute';
    conn.style.top = '40px';
    conn.style.right = '1px';
    conn.style.backgroundColor = 'rgba(32,32,32,0.85)';
    conn.style.color = 'white';
    conn.style.padding = '10px';
    conn.style.borderRadius = '5px';
    conn.style.zIndex = '150';
    conn.style.minWidth = '180px';

    const title = document.createElement('div');
    title.textContent = 'Status';
    title.style.fontWeight = '600';
    title.style.marginBottom = '6px';
    conn.appendChild(title);

    const statusContainer = document.createElement('div');
    statusContainer.style.display = 'flex';
    statusContainer.style.alignItems = 'center';

    const statusLabel = document.createElement('span');
    statusLabel.textContent = 'Server:';
    statusLabel.style.marginRight = '8px';
    statusContainer.appendChild(statusLabel);

    const statusValue = document.createElement('span');
    statusValue.id = 'connectionStatus';
    statusValue.textContent = 'Unknown';
    statusValue.style.fontWeight = 'bold';
    statusValue.style.color = '#FFA500';
    statusContainer.appendChild(statusValue);

    // No manual check button: the client auto-checks periodically.

    conn.appendChild(statusContainer);

    const statusInfo = document.createElement('div');
    statusInfo.id = 'connectionStatusInfo';
    statusInfo.style.fontSize = '11px';
    statusInfo.style.marginTop = '6px';
    conn.appendChild(statusInfo);

    document.body.appendChild(conn);
}

function editorDynamicContainerContent(Con){
    const what = Editor.editingWhat();

    // ONLY show the polygon dropdown while EDITING a polygon
    if (what === "polygon" && Editor.editMode) {
        const Types = ["none", ...getAllTypeIds()]; // dynamically grab all type IDs
        const objType = createDropdown("objtype", Types, "Type:");

        // Preselect the current polygon type
        let currentTypeKey = "DEFAULT";
        if (Editor.editingEntity && Editor.editingEntity.properties?.buildType) {
            const bt = Editor.editingEntity.properties.buildType;
            currentTypeKey = typeof bt.getValue === "function" ? bt.getValue() : bt;
        }
        
        // Convert key to ID for display
        const currentTypeId = buildTypes[currentTypeKey]?.id || "none";
        objType.querySelector("select").value = currentTypeId;

        // Update polygon type when user changes dropdown
        objType.querySelector("select").onchange = (e) => {
            const newTypeId = e.target.value;
            // Convert ID back to key for internal lookup
            const newTypeKey = getTypeById(newTypeId);
            
            if (Editor.editingEntity && Editor.editingEntity.properties && newTypeKey) {
                Editor.editingEntity.properties.buildType = newTypeId;  // Store the id, not the key
                console.log(`✓ Polygon type changed to: ${newTypeId} (key: ${newTypeKey})`);
                
                // Force visual update
                applyTypeToEntity(Editor.editingEntity);
                
                // Optional: refresh info panel
                if (window.showPolygonInfo) {
                    try { window.showPolygonInfo(Editor.editingEntity); } catch {}
                }
            }
        };

        Con.appendChild(objType);
    }

    // Keep the existing info text box for EDIT mode
    if (UIState.modeSelect === "edit") {
        const txt = document.createElement("div");
        txt.style.whiteSpace = "pre-line";
        txt.style.padding = "8px 10px";
        txt.style.background = "rgba(0,0,0,0.55)";
        txt.style.border = "1px solid rgba(255,255,255,0.2)";
        txt.style.borderRadius = "6px";
        txt.style.maxWidth = "260px";
        txt.style.maxHeight = "160px";
        txt.style.overflowY = "auto";
        txt.style.fontSize = "12px";
        txt.style.lineHeight = "1.3";
        txt.style.color = "white";

        txt.textContent = "Double click on an object to start editing\nPress Esc or right-click to stop editing";

        if (what === 'polygon') {
            txt.textContent += 
                "\n\nEditing polygon:\n" +
                "Drag the selected polygon to move it\n" +
                "Drag the vertices to reshape the polygon\n" +
                "Press R to rotate 90°; arrows rotate freely\n" +
                "Press Delete to remove hovered vertex\n" +
                "Double click an edge to add a vertex\n";
        } else if (what === 'model') {
            txt.textContent += 
                "\n\nEditing model:\n" +
                "Drag the selected model to move it\n" +
                "Press R to rotate 90°; arrows rotate freely\n";
        }

        Con.appendChild(txt);
    }
}
