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

    // Build initial dynamic UI
    refreshDynamicUI();
}

function createStaticUI() {
    const uiContainer = document.getElementById("myUI");

    // Example: always present button
    const button = document.createElement("button");
    button.textContent = "Button";
    button.style.marginRight = "25px";
    uiContainer.appendChild(button);


    // Mode select
    const modeDropdown = createDropdown("modeSelect", ["None", "Line", "Polygon", "Model", "Edit"], "Mode:");
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
if (UIState.modeSelect === "edit") {
    const txt = document.createElement("div");
    
    // Enable \n formatting
    txt.style.whiteSpace = "pre-line";
    
    // Make it a small box
    txt.style.padding = "8px 10px";
    txt.style.background = "rgba(0,0,0,0.55)";
    txt.style.border = "1px solid rgba(255,255,255,0.2)";
    txt.style.borderRadius = "6px";
    
    // Size constraints
    txt.style.maxWidth = "260px";
    txt.style.maxHeight = "160px";
    txt.style.overflowY = "auto";
    
    // Smaller text
    txt.style.fontSize = "12px";
    txt.style.lineHeight = "1.3";
    txt.style.color = "white";

    txt.textContent =
        "Click on a polygon to start editing\n" +
        "Drag the selected polygon to move it\n" +
        "Drag the vertices to reshape the polygon\n" +
        "Press R to rotate 90°; arrows rotate freely\n" +
        "Press Delete to remove hovered vertex\n" +
        "Double click an edge to add a vertex\n" +
        "Press Esc or right-click to stop editing";

    newDynamicContainer.appendChild(txt);
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
