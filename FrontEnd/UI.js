/**
 * UI.js
 * 
 * Handles UI creation, state management, and dynamic interface updates.
 * Manages mode selection, building type selection, and connection status.
 * 
 * @module UI
 * @requires TypeData.js (via getTypeProperty, getAllTypeIds, etc.)
 * @requires ModelPreLoad.js (via getAllModelIDs)
 * @requires ObjectEditor.js (via Editor)
 * @requires polygonDataCalculations.js (via polygonDataCalculations)
 */

/**
 * Global UI state storage
 * @type {Object.<string, string>}
 */
const UIState = {};

/**
 * State change listener registry
 * @type {Object.<string, Function[]>}
 */
const stateChangeListeners = {};

/**
 * Creates information panels (polygon info, data menu, occupation stats)
 * These panels provide context-sensitive information about selected entities
 * and overall area statistics for the Spoordok boundary
 * @function createInfoPanels
 */
function createInfoPanels() {
    // Helper function to create and append panel elements
    const createPanel = (id, attrs) => {
        const el = document.createElement(attrs.tag || 'div');  // Default to div if no tag specified
        el.id = id;
        if (attrs.className) el.className = attrs.className;
        if (attrs.innerHTML) el.innerHTML = attrs.innerHTML;  // HTML content
        if (attrs.textContent) el.textContent = attrs.textContent;  // Plain text content
        if (attrs.onclick) el.onclick = attrs.onclick;  // Click handler
        // Set accessibility and custom attributes
        Object.entries(attrs.attributes || {}).forEach(([k, v]) => el.setAttribute(k, v));
        document.body.appendChild(el);  // Add to document
        return el;
    };

    // Panel for displaying selected polygon/corridor details (bottom-right)
    createPanel('polygonInfo', {attributes: {'aria-live': 'polite', 'title': 'Polygon informatie'}});
    
    // Panel for data analysis and calculations (right side)
    createPanel('dataMenu', {attributes: {'aria-live': 'polite', 'title': 'Data & Analysis'}});
    
    // Toggle button for occupation statistics panel
    createPanel('occupationToggle', {tag: 'button', textContent: '📊', onclick: toggleOccupation});
    
    // Panel showing occupation statistics (area usage breakdown)
    createPanel('occupationInfo', {
        className: 'collapsed',  // Start hidden
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

/**
 * Toggles visibility of occupation statistics panel
 * @function toggleOccupation
 */
function toggleOccupation() {
    ['occupationInfo', 'occupationToggle'].forEach(id => document.getElementById(id)?.classList.toggle(id === 'occupationInfo' ? 'collapsed' : 'open'));
}

/**
 * Main UI setup function - creates all UI components
 * @function UIsetup
 */
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

/**
 * Creates static UI elements (mode selector)
 * This UI is created once and then never again modified
 * @function createStaticUI
 */
function createStaticUI() {
    const uiContainer = document.getElementById("myUI");
    uiContainer.appendChild(createDropdown("modeSelect", ["Data", "Polygon" , "Line", "Model", "Edit", "AI"], "Mode:"));
    onUIStateChange("modeSelect", refreshDynamicUI);
    document.addEventListener('object-editor-editmode-changed', (evt) => {
        console.log("Edit mode changed (event):", evt.detail);
        refreshDynamicUI();
    });

    // Can add more cases here if needed
    // Note: try to not add cases that also activate other cases or activate on their own
}

/**
 * Refreshes dynamic UI based on current state
 * 
 * To 'refresh' this UI container, we need to clear what's already in it
 * Thus we straight up delete the dynamic container and then rebuild it
 * Of course, we use statements to check what actually should go into the container on rebuild
 * This is effectively as close as to a refresh we can get
 * 
 * This function is called whenever UI state changes (mode switch, edit mode toggle, etc.)
 * @function refreshDynamicUI
 */
function refreshDynamicUI() {
    const uiContainer = document.getElementById("myUI");
    
    // Remove existing dynamic UI elements to start fresh
    const oldDynamic = document.getElementById("dynamicUI");
    if (oldDynamic) uiContainer.removeChild(oldDynamic);

    // Create new dynamic container for mode-specific UI
    const dynamicContainer = document.createElement("div");
    dynamicContainer.id = "dynamicUI";

    // Show/hide data menu based on current mode
    if (UIState.modeSelect === "data") {
        showDataMenu();  // Data mode shows analysis panel
    } else {
        hideDataMenu();  // Other modes hide it
    }

    // Add type selector dropdown when in polygon drawing mode
    if (UIState.modeSelect === "polygon") {
        // Filter out 'poly' and include all other building types
        dynamicContainer.appendChild(createDropdown("objtype", ["none", ...getAllTypeIds().filter(id => id !== "none" && id !== "poly")], "Type:"));
    }
    
    // Add model selector dropdown when in model placement mode
    if (UIState.modeSelect === "model") {
        dynamicContainer.appendChild(createDropdown("modelselect", getAllModelIDs(), "Model:"));
    }

    // Add edit mode specific content (help text, type editors)
    editorDynamicContainerContent(dynamicContainer);
    
    // Attach the newly built dynamic UI to the main container
    uiContainer.appendChild(dynamicContainer);
}

/**
 * Creates a dropdown UI element with label and select box
 * This is created since the code uses a handful of dropdowns, and this method makes it easier to create them
 * Automatically wires up state change listeners for reactive UI updates
 * @function createDropdown
 * @param {string} id - Element ID for the select element (also used as state key)
 * @param {string[]} options - Array of option values to populate the dropdown
 * @param {string} labeltxt - Label text displayed above the dropdown
 * @returns {HTMLDivElement} Container with label and select element
 */
function createDropdown(id, options, labeltxt) {
    // Create container div for label + select
    const container = document.createElement("div");
    container.style.marginBottom = "10px";

    // Create label element
    const label = Object.assign(document.createElement("label"), {textContent: labeltxt, htmlFor: id});
    label.style.marginRight = "8px";
    label.style.display = "block";  // Stack label above dropdown
    label.style.marginBottom = "6px";

    // Create select element
    const select = Object.assign(document.createElement("select"), {id});
    
    // Populate options (value is lowercase, display text is original)
    options.forEach(opt => select.appendChild(Object.assign(document.createElement("option"), {value: opt.toLowerCase(), textContent: opt})));

    // Wire up change event to update global UI state and notify listeners
    select.addEventListener("change", () => {
        UIState[id] = select.value;  // Update global state
        console.log("UIState updated:", UIState);
        // Notify all registered listeners for this state key
        stateChangeListeners[id]?.forEach(cb => cb(select.value));
    });

    container.append(label, select);  // Add both elements to container
    return container;
}

/**
 * Registers a callback for UI state changes
 * @function onUIStateChange
 * @param {string} key - State key to listen for (e.g., "modeSelect")
 * @param {Function} callback - Function to call when state changes
 */
function onUIStateChange(key, callback) {
    if (!stateChangeListeners[key]) stateChangeListeners[key] = [];
    stateChangeListeners[key].push(callback);
}

/**
 * Updates connection status display
 * @function setConnectionStatus
 * @param {'Connected'|'Disconnected'|'Unknown'} status - Connection status
 * @param {string} [message] - Additional status message
 */
function setConnectionStatus(status, message) {
    const el = document.getElementById('connectionStatus');
    const info = document.getElementById('connectionStatusInfo');
    if (!el) return;
    el.textContent = status || 'Unknown';
    el.style.color = {'Connected': '#4CAF50', 'Disconnected': '#F44336'}[status] || '#FFA500';
    if (info) info.textContent = message || '';
}

window.setConnectionStatus = setConnectionStatus;

/**
 * Creates server connection status UI
 * @function createConnectionUI
 */
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

/**
 * Creates AI analysis/generation UI for Cesium Man
 * @function createGenerationUI
 */
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
    intervalContainer.style.display = 'flex';
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

/**
 * Adds editor-specific content to dynamic UI container
 * @function editorDynamicContainerContent
 * @param {HTMLDivElement} Con - Container element to populate
 */
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

    if (what === "line" && Editor.editMode) {
        // Corridor type selector
        const objType = createDropdown("objtype", ["road", ...getAllTypeIds().filter(id => id !== "none" && id !== "poly")], "Road Type:");

        const bt = Editor.editingEntity?.properties?.buildType;
        const currentType = typeof bt?.getValue === "function" ? bt.getValue() : bt || "road";
        objType.querySelector("select").value = currentType;

        objType.querySelector("select").onchange = (e) => {
            const newTypeId = e.target.value;
            
            if (Editor.editingEntity?.properties) {
                Editor.editingEntity.properties.buildType = newTypeId;
                console.log(`✓ Corridor type changed to: ${newTypeId}`);
                
                if (typeof updateOccupationStats === 'function') {
                    setTimeout(() => updateOccupationStats(), 100);
                }
                
                try { window.showPolygonInfo?.(Editor.editingEntity); } catch {}
            }
        };

        Con.appendChild(objType);
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

/**
 * Shows data analysis menu
 * @function showDataMenu
 */
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

/**
 * Hides data analysis menu
 * @function hideDataMenu
 */
function hideDataMenu() {
    const dataMenu = document.getElementById('dataMenu');
    if (dataMenu) {
        dataMenu.style.display = 'none';
    }
}

/**
 * Displays polygon data in the data menu
 * @async
 * @function showPolygonDataInDataMenu
 * @param {import('cesium').Entity} entity - Polygon entity to display data for
 */
async function showPolygonDataInDataMenu(entity) {
    const dataMenu = document.getElementById('dataMenu');
    if (!dataMenu) return;

    dataMenu.style.display = 'block';

    const isCorridor = !!entity.corridor;
    const isPolygon = !!entity.polygon;

    // Get properties
    const props = entity.properties || {};
    let buildType = props.buildType?.getValue ? props.buildType.getValue() : props.buildType;
    
    // For corridors, default to 'road' if no type is set
    if (isCorridor && (!buildType || buildType === 'none')) {
        buildType = 'road';
    }
    
    const name = entity.polygonName || entity.lineName || (isCorridor ? 'Unnamed Corridor' : 'Unnamed Polygon');
    const polygonId = entity.polygonId || entity.lineId || props.polygonId?.getValue?.() || null;

    // Calculate area and volume
    let area = 0;
    let volume = 0;
    let areaText = 'Calculating...';
    
    // Handle corridors
    if (isCorridor) {
        let positions = entity.corridor.positions;
        if (typeof positions?.getValue === 'function') {
            positions = positions.getValue(Cesium.JulianDate.now());
        }
        
        if (positions && positions.length >= 2) {
            // Calculate corridor length
            let length = 0;
            for (let i = 0; i < positions.length - 1; i++) {
                length += Cesium.Cartesian3.distance(positions[i], positions[i + 1]);
            }
            const width = 3.0;
            area = length * width;
            areaText = `${area.toFixed(2)} m² (${length.toFixed(2)}m × ${width}m)`;
        } else {
            areaText = 'N/A';
        }
    }
    // Handle polygons - Use polygonUtils for accurate backend calculations
    else if (entity.polygon?.hierarchy && typeof window.polygonUtils !== 'undefined') {
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
                <h4 style="margin: 0 0 8px 0; color: #b896ff; font-size: 14px; font-weight: 600;">Selected ${isCorridor ? 'Corridor' : 'Polygon'}</h4>
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

    // Fetch and display data calculations if area > 0 and type is set
    // Works for both polygons and corridors
    if (area > 0 && buildType && buildType !== 'none' && typeof polygonDataCalculations !== 'undefined') {
        // Use polygonId if available, otherwise use a temporary ID based on type
        const dataId = polygonId || `temp_${buildType}_${Date.now()}`;
        
        // Determine if we should fetch corridor or polygon data
        let dataPromise;
        if (isCorridor) {
            // For corridors, calculate length from area and width
            const width = 3.0;
            const length = area / width;
            dataPromise = polygonDataCalculations.getCorridorData(dataId, length);
        } else {
            // For polygons, use regular polygon data
            dataPromise = polygonDataCalculations.getPolygonData(dataId, area, volume);
        }
        
        dataPromise.then(data => {
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
                
                // Determine label and icon for people/parking spaces
                const isParkingType = buildType === 'parking space' || buildType === 'covered parking space';
                const peopleLabel = isParkingType ? '🅿️ Parking Spaces:' : '👥 People:';

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
                            <span style="color: #b3d4ff; font-size: 12px;">${peopleLabel}</span>
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

/**
 * Calculates polygon area from positions (frontend approximation)
 * @function calculatePolygonArea
 * @param {import('cesium').Cartesian3[]} positions - Polygon vertices
 * @returns {number} Approximate area in square meters
 */
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

// Expose functions globally
window.onUIStateChange = onUIStateChange;
window.UIsetup = UIsetup;
window.showPolygonDataInDataMenu = showPolygonDataInDataMenu;