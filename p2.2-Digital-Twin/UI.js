const UIState = {};



function UIsetup(onChangeCallback) {
    // 1️⃣ Create a container div for your UI
    const uiContainer = document.createElement("div");
    uiContainer.id = "myUI";
    uiContainer.style.position = "absolute";
    uiContainer.style.top = "10px";
    uiContainer.style.left = "10px";
    uiContainer.style.backgroundColor = "rgba(42, 42, 42, 0.8)";
    uiContainer.style.color = "white";
    uiContainer.style.padding = "10px";
    uiContainer.style.borderRadius = "5px";
    uiContainer.style.zIndex = "100"; // Make sure it appears above Cesium

    // 2️⃣ Add content (buttons, labels, etc.)
    const button = document.createElement("button");
    button.textContent = "Button";
    button.style.marginRight = "25px";


   const dropdowns = [
    createDropdown("modeSelect", ["None", "Line", "Polygon"], "Mode:")
];
dropdowns.forEach(dd => uiContainer.appendChild(dd));



    // Append elements
    uiContainer.appendChild(button);

    // 5️⃣ Add the container to the body
    document.body.appendChild(uiContainer);

    if (onChangeCallback) {
        modeSelect.addEventListener("change", () => {
            onChangeCallback(modeSelect.value);
        });
    }
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
        handleUIChange(id, select.value);
    });

    container.appendChild(dropLabel);
    container.appendChild(select);

    return container; // returns the full wrapper
}