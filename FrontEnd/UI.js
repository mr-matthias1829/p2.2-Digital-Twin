const UIState = {};
const stateChangeListeners = {};



function createInfoPanels() {
    const createPanel = (id, attrs) => {
        const el = document.createElement(attrs.tag || 'div');
        el.id = id;
        if (attrs.className) el.className = attrs.className;
        if (attrs.innerHTML) el.innerHTML = attrs.innerHTML;
        if (attrs.textContent) el.textContent = attrs.textContent;
        if (attrs.onclick) el.onclick = attrs.onclick;
        Object.entries(attrs.attributes || {}).forEach(([k, v]) => el.setAttribute(k, v));
        document.body.appendChild(el);
        return el;
    };

    createPanel('polygonInfo', {attributes: {'aria-live': 'polite', 'title': 'Polygon informatie'}});
    createPanel('dataMenu', {attributes: {'aria-live': 'polite', 'title': 'Data & Analysis'}});
    createPanel('occupationToggle', {tag: 'button', textContent: '📊', onclick: toggleOccupation});
    createPanel('occupationInfo', {
        className: 'collapsed',
        innerHTML: `
            <h3>Spoordok Occupation</h3>
            <div class="stat">Spoordok Area: <span id="spoordokArea">--</span> m²</div>
            <div class="stat">Occupied Area: <span id="occupiedArea">--</span> m²</div>
            <div class="percentage"><span id="occupationPercentage">--</span>%</div>
            <canvas id="pieChart"></canvas>
            <div id="typeBreakdown"></div>
        `
    });
}

function toggleOccupation() {
    ['occupationInfo', 'occupationToggle'].forEach(id => document.getElementById(id)?.classList.toggle(id === 'occupationInfo' ? 'collapsed' : 'open'));

}


function UIsetup() {



    createInfoPanels();

    const uiContainer = Object.assign(document.createElement("div"), {
        id: "myUI",
        style: "position:absolute;top:10px;left:10px;color:white;padding:14px;border-radius:12px;z-index:100;min-width:200px"
    });
    document.body.appendChild(uiContainer);


    createStaticUI();


    createConnectionUI();


    refreshDynamicUI();
}

function createStaticUI() {
    const uiContainer = document.getElementById("myUI");
    uiContainer.appendChild(createDropdown("modeSelect", ["Data", "Polygon", "Model", "Edit", "AI"], "Mode:"));
    onUIStateChange("modeSelect", refreshDynamicUI);
    document.addEventListener('object-editor-editmode-changed', (evt) => {
        console.log("Edit mode changed (event):", evt.detail);
        refreshDynamicUI();
    });

    // Can add more cases here if needed
    // Note: try to not add cases that also activate other cases or activate on their own
}

function refreshDynamicUI() {
    const uiContainer = document.getElementById("myUI");
    const oldDynamic = document.getElementById("dynamicUI");
    if (oldDynamic) uiContainer.removeChild(oldDynamic);

    const dynamicContainer = document.createElement("div");
    dynamicContainer.id = "dynamicUI";

    if (UIState.modeSelect === "data") {
        showDataMenu();
    } else {
        hideDataMenu();
    }

    if (UIState.modeSelect === "polygon") {
        dynamicContainer.appendChild(createDropdown("objtype", ["none", ...getAllTypeIds().filter(id => id !== "none" && id !== "poly")], "Type:"));
    }
    if (UIState.modeSelect === "model") {
        dynamicContainer.appendChild(createDropdown("modelselect", getAllModelIDs(), "Model:"));
    }

    editorDynamicContainerContent(dynamicContainer);
    uiContainer.appendChild(dynamicContainer);
}




function createDropdown(id, options, labeltxt) {
    const container = document.createElement("div");
    container.style.marginBottom = "10px";

    const label = Object.assign(document.createElement("label"), {textContent: labeltxt, htmlFor: id});
    label.style.marginRight = "8px";
    label.style.display = "block";
    label.style.marginBottom = "6px";

    const select = Object.assign(document.createElement("select"), {id});
    options.forEach(opt => select.appendChild(Object.assign(document.createElement("option"), {value: opt.toLowerCase(), textContent: opt})));

    select.addEventListener("change", () => {
        UIState[id] = select.value;
        console.log("UIState updated:", UIState);
        stateChangeListeners[id]?.forEach(cb => cb(select.value));
    });

    container.append(label, select);
    return container;
}

function onUIStateChange(key, callback) {
    if (!stateChangeListeners[key]) stateChangeListeners[key] = [];
    stateChangeListeners[key].push(callback);
}


function setConnectionStatus(status, message) {
    const el = document.getElementById('connectionStatus');
    const info = document.getElementById('connectionStatusInfo');
    if (!el) return;
    el.textContent = status || 'Unknown';
    el.style.color = {'Connected': '#4CAF50', 'Disconnected': '#F44336'}[status] || '#FFA500';
    if (info) info.textContent = message || '';
}

window.setConnectionStatus = setConnectionStatus;


function createConnectionUI() {
    const conn = Object.assign(document.createElement('div'), {
        id: 'connectionUI',
        style: 'position:absolute;top:40px;right:1px;color:white;padding:14px;border-radius:12px;z-index:150;min-width:200px'
    });

    conn.innerHTML = `
        <div style="font-weight:600;margin-bottom:8px;font-size:14px;letter-spacing:0.5px;color:#e0e0e0">STATUS</div>
        <div style="display:flex;align-items:center;gap:8px">
            <span style="font-size:12px;color:#b0b0b0">Server:</span>
            <span id="connectionStatus" style="font-weight:bold;color:#FFA500">Unknown</span>
        </div>
        <div id="connectionStatusInfo" style="font-size:11px;margin-top:8px;color:#999"></div>
    `;
    document.body.appendChild(conn);
}

function createGenerationUI() {
    const gen = document.createElement('div');
    gen.id = 'generationUI';
    gen.style.position = 'fixed';
    gen.style.top = '50%';
    gen.style.right = '50%';
    gen.style.transform = 'translate(50%, 20%)';
    gen.style.backgroundColor = 'rgba(32,32,32,0.85)';
    gen.style.color = 'white';
    gen.style.padding = '10px';
    gen.style.borderRadius = '5px';
    gen.style.zIndex = '150';
    gen.style.minWidth = '200px';
    gen.style.display = 'none';

    const titleContainer = document.createElement('div');
    titleContainer.style.display = 'flex';
    titleContainer.style.justifyContent = 'space-between';
    titleContainer.style.alignItems = 'center';
    titleContainer.style.marginBottom = '10px';

    const title = document.createElement('div');
    title.textContent = 'Input Response';
    title.style.fontWeight = '600';
    titleContainer.appendChild(title);

    const closeButton = document.createElement('button');
    closeButton.textContent = 'x';
    closeButton.style.background = 'none';
    closeButton.style.border = 'none';
    closeButton.style.color = 'white';
    closeButton.style.fontSize = '24px';
    closeButton.style.cursor = 'pointer';
    closeButton.style.padding = '0';
    closeButton.style.width = '24px';
    closeButton.style.height = '24px';
    closeButton.onclick = () => {
        gen.style.display = 'none';
        ollamaAnalyzer.stopTracking();
        if (ollamaAnalyzer.isRunning) {
            ollamaAnalyzer.stop();
        }
    };
    titleContainer.appendChild(closeButton);

    const modelContainer = document.createElement('div');
    modelContainer.style.display = 'flex';
    modelContainer.style.alignItems = 'center';

    const modelType = createDropdown("modelSelect", ollamaAnalyzer.models, "Models:");
    modelType.style.marginTop = '10px';
    modelContainer.appendChild(modelType);

    const modelTypeSelect = modelType.querySelector('select');

    const analyseContainer = document.createElement('div');
    analyseContainer.style.display = 'flex';
    analyseContainer.style.alignItems = 'center';

    const analyseType = createDropdown("analyseType", ["once", "repeadetly"], "Run:");
    analyseType.style.marginRight = '8px';
    analyseContainer.appendChild(analyseType);

    const analyseTypeSelect = analyseType.querySelector('select');

    const intervalContainer = document.createElement('div');
    intervalContainer.style.display = 'none';
    intervalContainer.style.alignItems = 'center';

    const intervalLabel = document.createElement('span');
    intervalLabel.textContent = 'Interval (s):';
    intervalLabel.style.marginRight = '8px';


    const intervalInput = document.createElement('input');
    intervalInput.type = 'number';
    intervalInput.id = 'analyseInterval';
    intervalInput.value = '120';
    intervalInput.min = '60';
    intervalInput.style.width = '50px';

    intervalContainer.appendChild(intervalLabel);
    intervalContainer.appendChild(intervalInput);
    analyseContainer.appendChild(intervalContainer);

    const confirmContainer = document.createElement('div');
    confirmContainer.style.marginTop = '10px';
    confirmContainer.style.textAlign = 'right';

    const confirmButton = document.createElement('button');
    confirmButton.textContent = 'Confirm';
    confirmContainer.appendChild(confirmButton);

    analyseTypeSelect.addEventListener('change', (e) => {
        if (analyseTypeSelect.value === 'repeadetly'){
            intervalContainer.style.display = 'flex';
        }
        else {
            intervalContainer.style.display = 'none';
        }
    });

    confirmButton.addEventListener('click', () => {
        if (analyseTypeSelect.value === 'once'){
            ollamaAnalyzer.model = modelTypeSelect.value;
            ollamaAnalyzer.analyzeWithOllama();
        }
        else if (analyseTypeSelect.value === 'repeadetly'){
            ollamaAnalyzer.model = modelTypeSelect.value;
            ollamaAnalyzer.interval = intervalInput.value * 1000;
            ollamaAnalyzer.start();
        }
    });

    gen.appendChild(titleContainer);
    gen.appendChild(modelContainer);
    gen.appendChild(analyseContainer);
    gen.appendChild(confirmContainer);

    document.body.appendChild(gen);
}

function editorDynamicContainerContent(Con) {
    const what = Editor.editingWhat();


    if (what === "polygon" && Editor.editMode) {
        // Don't show type dropdown for protected polygons (like Spoordok)
        const isProtected = Editor.editingEntity && Editor.isProtectedEntity(Editor.editingEntity);

        if (!isProtected) {
            const objType = createDropdown("objtype", ["none", ...getAllTypeIds().filter(id => id !== "none" && id !== "poly")], "Type:");

            const bt = Editor.editingEntity?.properties?.buildType;
            const currentTypeKey = typeof bt?.getValue === "function" ? bt.getValue() : bt || "DEFAULT";
            objType.querySelector("select").value = buildTypes[currentTypeKey]?.id || "none";

            objType.querySelector("select").onchange = (e) => {

            const newTypeId = e.target.value;

            const newTypeKey = getTypeById(newTypeId);
            
            if (Editor.editingEntity?.properties && newTypeKey) {
                Editor.editingEntity.properties.buildType = newTypeId;
                console.log(`✓ Polygon type changed to: ${newTypeId} (key: ${newTypeKey})`);
                

                applyTypeToEntity(Editor.editingEntity);
                

                if (Editor.editingEntity.polygonId && typeof polygonAPI !== 'undefined') {
                    polygonAPI.savePolygon(Editor.editingEntity)
                        .then(() => {
                            console.log('✓ Type change saved to database');
                            if (typeof updateOccupationStats === 'function') updateOccupationStats();
                        })
                        .catch(err => console.error('Failed to save type change:', err));
                }
                
                try { window.showPolygonInfo?.(Editor.editingEntity); } catch {}
            }
        };

            Con.appendChild(objType);
        }
    }


    if (UIState.modeSelect === "edit") {
        const helpTexts = {
            base: "Double click on an object to start editing\nPress Esc or right-click to stop editing",
            polygon: "\n\nEditing polygon:\nDrag the selected polygon to move it\nDrag the vertices to reshape the polygon\nPress R to rotate 90°; arrows rotate freely\nPress Delete to remove hovered vertex\nDouble click an edge to add a vertex\n",
            model: "\n\nEditing model:\nDrag the selected model to move it\nPress R to rotate 90°; arrows rotate freely\n"
        };

        const txt = Object.assign(document.createElement("div"), {
            textContent: helpTexts.base + (helpTexts[what] || ''),
            style: 'white-space:pre-line;padding:12px 14px;background:linear-gradient(135deg,rgba(40,40,60,0.7) 0%,rgba(30,30,50,0.7) 100%);backdrop-filter:blur(8px);border:1px solid rgba(100,150,255,0.2);border-radius:8px;max-width:260px;max-height:180px;overflow-y:auto;font-size:12px;line-height:1.5;color:#e8e8e8;box-shadow:0 4px 16px rgba(0,0,0,0.3),0 0 0 1px rgba(255,255,255,0.05) inset'
        });
        Con.appendChild(txt);
    }
}

function showDataMenu() {
    const dataMenu = document.getElementById('dataMenu');
    if (dataMenu) {
        dataMenu.style.display = 'block';
        dataMenu.innerHTML = `
            <div class="data-menu-header">
                <h3>Data & Analysis</h3>
                <button class="data-menu-close" onclick="hideDataMenu()" title="Close">✕</button>
            </div>
            <div class="data-menu-content">
                <p style="text-align: center; color: #b0b0b0; font-size: 13px; padding: 20px;">
                    Double-click a polygon to view its data
                </p>
            </div>
        `;
    }
}

function hideDataMenu() {
    const dataMenu = document.getElementById('dataMenu');
    if (dataMenu) {
        dataMenu.style.display = 'none';
    }
}

async function showPolygonDataInDataMenu(entity) {
    const dataMenu = document.getElementById('dataMenu');
    if (!dataMenu) return;

    dataMenu.style.display = 'block';

    // Get polygon properties
    const props = entity.properties || {};
    const buildType = props.buildType?.getValue ? props.buildType.getValue() : props.buildType;
    const name = entity.polygonName || 'Unnamed Polygon';
    const polygonId = entity.polygonId || props.polygonId?.getValue?.() || null;

    // Calculate area and volume using the same method as polygonInfoDisplay (backend calculations)
    let area = 0;
    let volume = 0;
    let areaText = 'Calculating...';
    
    // Use polygonUtils for accurate backend calculations
    if (entity.polygon?.hierarchy && typeof window.polygonUtils !== 'undefined') {
        try {
            // Get accurate area from backend
            const areaResult = await window.polygonUtils.computeAreaFromHierarchy(entity.polygon.hierarchy);
            if (typeof areaResult === 'number') {
                area = areaResult;
                areaText = `${area.toFixed(2)} m²`;
            }
            
            // Get accurate volume from backend
            const volResult = await window.polygonUtils.computeVolumeFromEntity(entity);
            if (volResult && typeof volResult.volume === 'number') {
                volume = volResult.volume;
            }
        } catch (e) {
            console.warn('Error calculating area/volume:', e);
            areaText = 'N/A';
        }
    } else {
        areaText = 'N/A';
    }

    // Initial HTML with loading state for calculations
    dataMenu.innerHTML = `
        <div class="data-menu-header">
            <h3>Data & Analysis</h3>
            <button class="data-menu-close" onclick="hideDataMenu()" title="Close">✕</button>
        </div>
        <div class="data-menu-content">
            <div style="margin-bottom: 16px; padding: 12px; background: rgba(255,255,255,0.05); border-radius: 8px; border-left: 3px solid #b896ff;">
                <h4 style="margin: 0 0 8px 0; color: #b896ff; font-size: 14px; font-weight: 600;">Selected Polygon</h4>
                <div style="font-size: 12px; line-height: 1.8;">
                    <div><strong>Name:</strong> ${name}</div>
                    <div><strong>ID:</strong> ${polygonId || 'N/A'}</div>
                    <div><strong>Type:</strong> ${buildType || 'none'}</div>
                    <div><strong>Area:</strong> ${areaText}</div>
                </div>
            </div>
            <div id="calculationResults" style="padding: 12px; background: rgba(255,255,255,0.03); border-radius: 8px;">
                <h4 style="margin: 0 0 8px 0; color: #9e9e9e; font-size: 13px; font-weight: 600;">Backend Calculations</h4>
                <p style="text-align: center; color: #b0b0b0; font-size: 12px; padding: 12px 0;">
                    <span style="display: inline-block; animation: pulse 1.5s ease-in-out infinite;">⏳</span>
                    Loading calculations...
                </p>
            </div>
        </div>
        <style>
            @keyframes pulse {
                0%, 100% { opacity: 0.4; transform: scale(1); }
                50% { opacity: 1; transform: scale(1.1); }
            }
        </style>
    `;

    // Fetch and display polygon data calculations if polygon has an ID
    if (polygonId && area > 0 && typeof polygonDataCalculations !== 'undefined') {
        polygonDataCalculations.getPolygonData(polygonId, area, volume)
            .then(data => {
                const resultsContainer = document.getElementById('calculationResults');
                if (!resultsContainer) return;

                if (!data || buildType === 'none') {
                    resultsContainer.innerHTML = `
                        <h4 style="margin: 0 0 8px 0; color: #9e9e9e; font-size: 13px; font-weight: 600;">Backend Calculations</h4>
                        <p style="text-align: center; color: #b0b0b0; font-size: 12px; padding: 12px 0;">
                            ${buildType === 'none' ? 'Assign a building type to see calculations' : 'No data available'}
                        </p>
                    `;
                    return;
                }

                // Debug log to check values
                console.log('Polygon data - Area:', area, 'Volume:', volume, 'Backend measurement:', data.measurement, 'Base:', data.calculationBase);
                
                const costFormatted = polygonDataCalculations.formatCurrency(data.cost);
                const incomeFormatted = polygonDataCalculations.formatCurrency(data.income);
                const peopleFormatted = polygonDataCalculations.formatNumber(data.people, 0);
                const measurementFormatted = polygonDataCalculations.formatNumber(data.measurement, 2);
                const measurementUnit = data.calculationBase === 'area' ? 'm²' : 'm³';

                resultsContainer.innerHTML = `
                    <h4 style="margin: 0 0 12px 0; color: #9e9e9e; font-size: 13px; font-weight: 600;">Backend Calculations</h4>
                    <div style="display: grid; gap: 8px;">
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(255,100,100,0.1); border-radius: 6px; border-left: 3px solid #ff6b6b;">
                            <span style="color: #ffb3b3; font-size: 12px;">💰 Cost:</span>
                            <span style="color: #fff; font-size: 12px; font-weight: 600;">${costFormatted}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(100,255,100,0.1); border-radius: 6px; border-left: 3px solid #4caf50;">
                            <span style="color: #b3ffb3; font-size: 12px;">💵 Income:</span>
                            <span style="color: #fff; font-size: 12px; font-weight: 600;">${incomeFormatted}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(100,150,255,0.1); border-radius: 6px; border-left: 3px solid #64a0ff;">
                            <span style="color: #b3d4ff; font-size: 12px;">👥 People:</span>
                            <span style="color: #fff; font-size: 12px; font-weight: 600;">${peopleFormatted}</span>
                        </div>
                        <div style="display: flex; justify-content: space-between; padding: 8px; background: rgba(255,200,100,0.1); border-radius: 6px; border-left: 3px solid #ffa726;">
                            <span style="color: #ffd8b3; font-size: 12px;">⭐ Livability:</span>
                            <span style="color: #fff; font-size: 12px; font-weight: 600;">${data.livability.toFixed(1)}/10</span>
                        </div>
                        <div style="margin-top: 4px; padding: 6px; text-align: center; font-size: 11px; color: #888;">
                            Based on ${measurementFormatted} ${measurementUnit}
                        </div>
                    </div>
                `;
            })
            .catch(err => {
                console.error('Error displaying polygon data:', err);
                const resultsContainer = document.getElementById('calculationResults');
                if (resultsContainer) {
                    resultsContainer.innerHTML = `
                        <h4 style="margin: 0 0 8px 0; color: #9e9e9e; font-size: 13px; font-weight: 600;">Backend Calculations</h4>
                        <p style="text-align: center; color: #ff6b6b; font-size: 12px; padding: 12px 0;">
                            ⚠️ Error loading calculations
                        </p>
                    `;
                }
            });
    } else {
        // No polygon ID - show message
        const resultsContainer = document.getElementById('calculationResults');
        if (resultsContainer) {
            resultsContainer.innerHTML = `
                <h4 style="margin: 0 0 8px 0; color: #9e9e9e; font-size: 13px; font-weight: 600;">Backend Calculations</h4>
                <p style="text-align: center; color: #b0b0b0; font-size: 12px; padding: 12px 0;">
                    Save polygon to database to see calculations
                </p>
            `;
        }
    }
}

function calculatePolygonArea(positions) {
    if (!positions || positions.length < 3) return 0;

    const ellipsoid = Cesium.Ellipsoid.WGS84;
    let area = 0;

    for (let i = 0; i < positions.length; i++) {
        const j = (i + 1) % positions.length;
        const cart1 = ellipsoid.cartesianToCartographic(positions[i]);
        const cart2 = ellipsoid.cartesianToCartographic(positions[j]);
        area += (cart2.longitude - cart1.longitude) * (2 + Math.sin(cart1.latitude) + Math.sin(cart2.latitude));
    }

    area = Math.abs(area * ellipsoid.maximumRadius * ellipsoid.maximumRadius / 2.0);
    return area;
}
