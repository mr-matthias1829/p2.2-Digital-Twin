function UIsetup() {
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
    button.style.marginRight = "5px";

    const label = document.createElement("span");
    label.textContent = "Text";

    // 3️⃣ Attach logic to the button
    button.addEventListener("click", () => {
        alert("Button clicked!");
    });

    // 4️⃣ Add elements to the container
    uiContainer.appendChild(button);
    uiContainer.appendChild(label);

    // 5️⃣ Add the container to the body
    document.body.appendChild(uiContainer);
}