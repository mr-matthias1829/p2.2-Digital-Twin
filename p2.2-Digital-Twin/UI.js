const UIState = {};
const stateChangeListeners = {};

function UIsetup() {
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
    const modeDropdown = createDropdown("modeSelect", ["None", "Line", "Polygon", "Model"], "Mode:");
    uiContainer.appendChild(modeDropdown);

    // Refresh dynamic UI on mode change
    onUIStateChange("modeSelect", refreshDynamicUI);
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

    // Show color picker only if drawing polygon (since color only applies to polygons)
    if (UIState.modeSelect === "polygon") {
        const colorPicker = createColorPicker("color", "Color:");
        newDynamicContainer.appendChild(colorPicker);
    }

    if (UIState.modeSelect === "model") {
        const modeDropdown = createDropdown("modelselect", ["Man", "building"], "Model:");
        newDynamicContainer.appendChild(modeDropdown);
    }

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

function createColorPicker(id, labeltxt) {
    const container = document.createElement("div");
    container.style.marginBottom = "5px";

    const colorLabel = document.createElement("label");
    colorLabel.textContent = labeltxt;
    colorLabel.htmlFor = id;
    colorLabel.style.marginRight = "5px";

    const input = document.createElement("input");
    input.type = "color";
    input.id = id;
    input.value = "#ffffff";

    input.addEventListener("input", () => {
        UIState[id] = input.value;
        console.log("UIState updated:", UIState);

        if (stateChangeListeners[id]) {
            stateChangeListeners[id].forEach(callback => callback(input.value));
        }
    });

    container.appendChild(colorLabel);
    container.appendChild(input);
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
    conn.style.top = '10px';
    conn.style.right = '10px';
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
