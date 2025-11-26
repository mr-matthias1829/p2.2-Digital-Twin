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

    const button = document.createElement("button");
    button.textContent = "Button";
    button.style.marginRight = "25px";

    const dropdowns = [
        createDropdown("modeSelect", ["None", "Line", "Polygon"], "Mode:")
    ];
    dropdowns.forEach(dd => uiContainer.appendChild(dd));

    const colorPickers = [
        createColorPicker("color", "Color:")
    ];
    colorPickers.forEach(cp => uiContainer.appendChild(cp));

    uiContainer.appendChild(button);
    document.body.appendChild(uiContainer);
}





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
        
        // Notify all listeners for this state key
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
    input.value = "#ffffff"; // default color

    // Update UIState and notify listeners
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

// Subscribe to state changes
function onUIStateChange(key, callback) {
    if (!stateChangeListeners[key]) {
        stateChangeListeners[key] = [];
    }
    stateChangeListeners[key].push(callback);
}


