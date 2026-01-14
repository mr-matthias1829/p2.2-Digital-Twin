document.addEventListener('DOMContentLoaded', () => {
    setup();          // mainPreSetup.js
    laterSetup();     // main.js
});

var measure;
var viewer;
var Editor;
var Server;

function setupSetups() {
    UIsetup();
    subscribeToStateChangesSetup();
    
    // Initialize goals UI
    if (typeof initializeGoalsUI === 'function') {
        initializeGoalsUI();
    }
}

function subscribeToStateChangesSetup() {
    onUIStateChange('modeSelect', (newMode) => {
        // Cut off drawing the shape to prevent issues
        if (drawingMode !== "none" && activeShapePoints.length > 0){
            terminateShape();
        }
        // Cut off editing the obj to prevent issues
        if (drawingMode == "edit" && newMode != "edit") {
           Editor.stopEditing();
        }
        drawingMode = newMode;

        modelToCreate = modelToCreateDEFAULT;
        objType = objTypeDEFAULT;
    });

    onUIStateChange('objtype', (newObj) => {
        objType = newObj;
    });

    onUIStateChange('modelselect', (newModel) => {
        modelToCreate = newModel;
    });
}


let modelToCreateDEFAULT = null; // Temporary to init the var, later set to id 0 of models
const objTypeDEFAULT = 'none';

// Make sure these are the same defaults as in UI.js to prevent offsets with UI!
let modelToCreate = modelToCreateDEFAULT;
let drawingMode = "data"; // Start in data mode by default
let objType = objTypeDEFAULT;

async function laterSetup(){
    setupSetups();

    const ids = await getAllModelIDsAsync();

    modelToCreateDEFAULT = ids[0];
    modelToCreate = modelToCreateDEFAULT;

    // Initial occupation stats update (after a short delay to ensure entities are loaded)
    setTimeout(() => {
        if (typeof updateOccupationStats === 'function') {
            updateOccupationStats();
        }
    }, 2000);
}


function createPoint(worldPosition) {
    const point = viewer.entities.add({
        position: worldPosition,
    });
    return point;
}

function drawShape(positionData) {
    let shape;

    // Line drawing mode is unused, but still here if needed later
    if (drawingMode === "line") {
        shape = viewer.entities.add({
            corridor: {
                positions: positionData,
                width: 3.0, // meters (pas aan!)
                material: Cesium.Color.ORANGE.withAlpha(0.9),
                height: 0,
                extrudedHeight: 0,
                clampToGround: true,
            },
            lineName: '',
            lineId: null
        });
    } else if (drawingMode === "polygon") {
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,
                material: Cesium.Color.WHITE, // Temporary color
                extrudedHeight: 0.0, // Set default height to avoid rendering issues
            },
            properties: {
                buildType: objType  // Store the type id (e.g., "commercial building")
            }
        });
        applyTypeInitPolygon(shape);
    }
 return shape;
}

let activeShapePoints = [];
let activeShape;
let floatingPoint;

function setupInputActions() {
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    // LEFT DOWN - Edit mode has priority
    handler.setInputAction(function (event) {
        // Editor handles its own logic
        Editor.handleLeftDown(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // LEFT UP
    handler.setInputAction(function (event) {
        Editor.handleLeftUp(event);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // MOUSE MOVE
    handler.setInputAction(function (event) {
        // Let polygon editor handle its move logic first
        Editor.handleMouseMove(event);
        
        // Only handle drawing mode floating point if NOT in edit mode
        if (!Editor.editMode && Cesium.defined(floatingPoint)) {
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
                
                // Real-time bounds checking during drawing
                if (drawingMode === "polygon" && activeShape && typeof boundsChecker !== 'undefined') {
                    const spoordokEntity = boundsChecker.getSpoordokEntity(viewer);
                    if (spoordokEntity) {
                        const spoordokPositions = boundsChecker.getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);
                        const isWithinBounds = boundsChecker.isPolygonInsideBounds(activeShapePoints, spoordokPositions);
                        
                        // Update outline during drawing
                        if (activeShape.polygon) {
                            if (!isWithinBounds) {
                                activeShape.polygon.outlineColor = Cesium.Color.RED;
                                activeShape.polygon.outline = true;
                                activeShape.polygon.outlineWidth = 3.0;
                            } else {
                                activeShape.polygon.outline = false;
                            }
                        }
                    }
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // LEFT CLICK - Drawing mode (only when NOT editing)
    handler.setInputAction(function (event) {
        // CRITICAL: Block all drawing actions if in edit mode
        if (Editor.editMode) return;
        
        // Only proceed if in a drawing mode
        if (drawingMode === "none" || drawingMode === "edit") return;
        
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        handleClickToDraw(earthPosition);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // DOUBLE CLICK - Start editing (or add vertex if already editing) OR show data in Data mode
    handler.setInputAction(function (event) {
        // If in Data mode, show polygon data instead of editing
        if (drawingMode === "data") {
            const picked = viewer.scene.pick(event.position);
            if (Cesium.defined(picked) && picked.id?.polygon && !picked.id.properties?.isVertex) {
                // If clicked on green roof overlay, use parent entity instead
                let targetEntity = picked.id;
                if (picked.id.properties?.isGreenRoofOverlay && picked.id._parentEntity) {
                    targetEntity = picked.id._parentEntity;
                }
                showPolygonDataInDataMenu(targetEntity);
                return;
            }
        }
        
        // Let the editor handle all double-click logic (for Edit mode)
        const handled = Editor.handleDoubleClick(event);
        
        // If editor didn't handle it and we're drawing, do nothing
        // (prevents accidental polygon selection while drawing)
        if (drawingMode !== "none" && drawingMode !== "edit") {
            console.log("Double-click ignored - currently in drawing mode");
        }

        const pickedObject = viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && 
            pickedObject.primitive && 
            pickedObject.primitive.isEditableModel && 
            pickedObject.primitive.modelKey === "man" &&
            drawingMode === "ai") {
        
            // Found a Cesium Man! Open the UI
            const cesiumMan = pickedObject.primitive;
            openCesiumManUI(cesiumMan);
            return;
        }

    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // RIGHT CLICK - Finish drawing, editing, or moving
    handler.setInputAction(function (event) {
        // Editor gets first priority
        const editorHandled = Editor.handleRightClick(event);
        
        // If editor didn't handle it and we're drawing, check if we can finish
        if (!editorHandled && activeShapePoints.length > 0) {
            // Validate minimum points for polygon (subtract 1 for floating point)
            if (drawingMode === "polygon" && activeShapePoints.length < 4) {
                const pointsNeeded = 4 - activeShapePoints.length;
                alert(`Cannot create polygon: You need to add ${pointsNeeded} more point${pointsNeeded > 1 ? 's' : ''} (minimum 3 points required).`);
                console.log(`⚠ Need ${pointsNeeded} more point${pointsNeeded > 1 ? 's' : ''} for a polygon`);
                return;
            }
            terminateShape();
        }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    function handleClickToDraw(earthPosition) { // Split into a function so the code can be tested
        
        if (!Cesium.defined(earthPosition)) return;
        
        // Handle model placement
        if (drawingMode === "model") {
            const cartographic = Cesium.Cartographic.fromCartesian(earthPosition);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            
            spawnModel(modelToCreate, { lon, lat }, 0);
            return; // Exit after placing model
        }
        
        // Handle polygon/line drawing
        if (drawingMode === "polygon" || drawingMode === "line") {
            // Prevent polygon drawing if type is "none"
            if (drawingMode === "polygon" && objType === "none") {
                console.log("⚠ Please select a type before drawing a polygon");
                return;
            }
            
            if (activeShapePoints.length === 0) {
                // First click: create a fixed point and add position
                createPoint(earthPosition);
                activeShapePoints.push(earthPosition);
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    if (drawingMode === "polygon") {
                        return new Cesium.PolygonHierarchy(activeShapePoints);
                    }
                    return activeShapePoints;
                }, false);
                activeShape = drawShape(dynamicPositions);
                // Now create the floating point for subsequent positions
                floatingPoint = createPoint(earthPosition);
                activeShapePoints.push(earthPosition);
            } else {
                // Subsequent clicks: replace floating point with fixed point
                activeShapePoints.pop(); // Remove floating point position
                createPoint(earthPosition); // Create fixed point
                activeShapePoints.push(earthPosition); // Add new fixed position
                // Recreate floating point at same location
                floatingPoint = createPoint(earthPosition);
                activeShapePoints.push(earthPosition);
            }
        }
    }

    // RIGHT CLICK - Finish drawing, editing, or moving
    handler.setInputAction(function (event) {
        // Editor gets first priority
        const editorHandled = Editor.handleRightClick(event);
        
        // If editor didn't handle it and we're drawing, finish the shape
        if (!editorHandled && activeShapePoints.length > 0) {
            terminateShape();
        }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function openCesiumManUI(cesiumManPrimitive) {
    let genUI = document.getElementById('generationUI');

    if (!genUI) {
        createGenerationUI();
        genUI = document.getElementById('generationUI');
    }

    genUI.style.display = 'block';

    const allMen = ollamaAnalyzer.findAllCesiumMen();
    const index = allMen.indexOf(cesiumManPrimitive);

    if (index !== -1) {
        ollamaAnalyzer.selectCesiumMan(index);
    }
}



// Terminate the current shape drawing

function terminateShape() {
    if (activeShapePoints.length === 0) return;
    
    activeShapePoints.pop(); // Remove the floating point
    
    // Need at least 3 points for a polygon
    if (drawingMode === "polygon" && activeShapePoints.length < 3) {
        console.log("⚠ Need at least 3 points for a polygon");
        // Clean up
        viewer.entities.remove(floatingPoint);
        viewer.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
        return;
    }
    
    // Create the final shape with proper hierarchy
    let finalShape;
    if (drawingMode === "polygon") {
        finalShape = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(activeShapePoints),
                material: Cesium.Color.WHITE,
                extrudedHeight: 0.0,
            },
            properties: new Cesium.PropertyBag({
                buildType: objType
            }),
            polygonName: '',  // Initialize with empty name
            hasNatureOnTop: false  // Initialize green roof as disabled
        });
        applyTypeInitPolygon(finalShape);
        
        // Check bounds and mark if out of bounds
        if (typeof boundsChecker !== 'undefined') {
            const isWithinBounds = boundsChecker.validateAndMarkPolygon(finalShape, viewer);
            if (!isWithinBounds) {
                console.log('⚠️ Polygon placed outside valid boundary');
            }
        }
        
        // Auto-save polygon to database
        if (typeof polygonAPI !== 'undefined') {
            polygonAPI.savePolygon(finalShape)
                .then(() => console.log('✓ Polygon saved to database'))
                .catch(err => console.error('Failed to save polygon:', err));
        }
        
        console.log(`✓ Polygon created with ${activeShapePoints.length} vertices`);
    } else if (drawingMode === "line") {
        finalShape = drawShape(activeShapePoints);
        console.log(`✓ Line created with ${activeShapePoints.length} points`);
    }
    
    // Clean up drawing state
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];

    // Update occupation stats after drawing a polygon
    if (drawingMode === "polygon" && typeof updateOccupationStats === 'function') {
        setTimeout(() => updateOccupationStats(), 100);
    }
}

// Update occupation statistics by calling backend
async function updateOccupationStats() {
    try {
        // Find the Spoordok polygon
        const spoordokEntity = viewer.entities.values.find(e =>
            e.properties && e.properties.isSpoordok && e.polygon
        );

        if (!spoordokEntity) {
            console.warn('Spoordok polygon not found');
            return;
        }

        // Get Spoordok positions
        const spoordokPositions = _getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);
        const spoordokData = spoordokPositions.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z
        }));

        // Get all other polygons (excluding Spoordok) with their types
        const polygonAreas = [];
        viewer.entities.values.forEach(entity => {
            if (entity.polygon &&
                (!entity.properties || !entity.properties.isSpoordok) &&
                (!entity.properties || !entity.properties.isGreenRoofOverlay)) {  // Skip green roof overlays
                const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
                if (positions && positions.length >= 3) {
                    // Get polygon type
                    let type = 'unknown';
                    if (entity.properties && entity.properties.buildType) {
                        const bt = entity.properties.buildType;
                        type = typeof bt.getValue === 'function' ? bt.getValue() : bt;
                    }
                    
                    polygonAreas.push({
                        positions: positions.map(p => ({
                            x: p.x,
                            y: p.y,
                            z: p.z
                        })),
                        type: type
                    });
                }
            }
        });

        // Call backend API
        const url = 'http://localhost:8081/api/data/occupation';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spoordokPositions: spoordokData,
                polygonAreas: polygonAreas
            })
        });

        if (!response.ok) {
            throw new Error(`Backend occupation API failed: HTTP ${response.status}`);
        }

        const result = await response.json();

        // Update UI
        document.getElementById('spoordokArea').textContent = result.spoordokArea.toFixed(2);
        document.getElementById('occupiedArea').textContent = result.occupiedArea.toFixed(2);
        document.getElementById('occupationPercentage').textContent = result.occupationPercentage.toFixed(1);

        // Draw pie chart and type breakdown
        if (result.typeBreakdown) {
            drawPieChart(result.typeBreakdown);
            displayTypeBreakdown(result.typeBreakdown);
        } else {
            // Empty pie chart if no data
            drawPieChart({ unoccupied: { area: result.spoordokArea, percentage: 100 } });
            displayTypeBreakdown({ unoccupied: { area: result.spoordokArea, percentage: 100 } });
        }
        
        // Also update goals display
        if (typeof updateGoalsDisplay === 'function') {
            updateGoalsDisplay();
        }

    } catch (error) {
        console.error('Error updating occupation stats:', error);
        document.getElementById('spoordokArea').textContent = 'Error';
        document.getElementById('occupiedArea').textContent = 'Error';
        document.getElementById('occupationPercentage').textContent = '--';
    }
}

function drawPieChart(typeBreakdown) {
    const canvas = document.getElementById('pieChart');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = Math.min(centerX, centerY) - 10;
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Get types and their percentages
    const types = Object.keys(typeBreakdown);
    if (types.length === 0) return;
    
    let currentAngle = -Math.PI / 2; // Start at top
    
    types.forEach(type => {
        const data = typeBreakdown[type];
        const sliceAngle = (data.percentage / 100) * 2 * Math.PI;
        
        // Get color for this type from TypeData
        const color = getTypeColor(type);
        
        // Draw slice
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.arc(centerX, centerY, radius, currentAngle, currentAngle + sliceAngle);
        ctx.closePath();
        ctx.fillStyle = color;
        ctx.fill();
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        currentAngle += sliceAngle;
    });
}

function displayTypeBreakdown(typeBreakdown) {
    const container = document.getElementById('typeBreakdown');
    if (!container) return;
    
    container.innerHTML = '';
    
    const types = Object.keys(typeBreakdown).sort((a, b) => 
        typeBreakdown[b].percentage - typeBreakdown[a].percentage
    );
    
    types.forEach(type => {
        const data = typeBreakdown[type];
        const color = getTypeColor(type);
        
        const item = document.createElement('div');
        item.className = 'type-item';
        item.innerHTML = `
            <div class="type-color" style="background-color: ${color}"></div>
            <span>${type}: ${data.percentage.toFixed(1)}%</span>
        `;
        container.appendChild(item);
    });
}

function getTypeColor(typeId) {
    // Special case for unoccupied area
    if (typeId === 'unoccupied') {
        return 'rgba(200, 200, 200, 0.5)'; // Light gray, semi-transparent
    }
    
    // Convert type ID to type key for lookup (e.g., "commercial building" -> "commercial_building")
    const typeKey = typeof getTypeById === 'function' ? getTypeById(typeId) : null;
    
    // Get color from TypeData using the type key
    if (typeKey && typeof getTypeProperty === 'function') {
        const cesiumColor = getTypeProperty(typeKey, 'color');
        if (cesiumColor) {
            // Convert Cesium.Color to CSS rgba
            return `rgba(${Math.floor(cesiumColor.red * 255)}, ${Math.floor(cesiumColor.green * 255)}, ${Math.floor(cesiumColor.blue * 255)}, ${cesiumColor.alpha})`;
        }
    }
    // Fallback colors
    return '#888888';
}

// Call updateOccupationStats when polygons change
window.updateOccupationStats = updateOccupationStats;


    window.handleClickToDraw = handleClickToDraw;
    window.terminateShape = terminateShape;
    window.drawShape = drawShape;
    window.createPoint = createPoint;
    window.setupInputActions = setupInputActions;
    window.laterSetup = laterSetup;
    window.setupSetups = setupSetups;
    window.subscribeToStateChangesSetup = subscribeToStateChangesSetup;
    window.updateOccupationStats = updateOccupationStats;
    window.drawPieChart = drawPieChart;
    window.displayTypeBreakdown = displayTypeBreakdown;
    window.getTypeColor = getTypeColor;

if (typeof global !== 'undefined') {

    //global._getPositionsFromHierarchy = _getPositionsFromHierarchy;
    
    // Expose variables with getters/setters
    Object.defineProperty(global, 'drawingMode', {
      get: () => drawingMode,
      set: (val) => { drawingMode = val; }
    });
    
    Object.defineProperty(global, 'objType', {
      get: () => objType,
      set: (val) => { objType = val; }
    });
    
    Object.defineProperty(global, 'modelToCreate', {
      get: () => modelToCreate,
      set: (val) => { modelToCreate = val; }
    });
    
    Object.defineProperty(global, 'activeShapePoints', {
      get: () => activeShapePoints,
      set: (val) => { activeShapePoints = val; }
    });
    
    Object.defineProperty(global, 'activeShape', {
      get: () => activeShape,
      set: (val) => { activeShape = val; }
    });
    
    Object.defineProperty(global, 'floatingPoint', {
      get: () => floatingPoint,
      set: (val) => { floatingPoint = val; }
    });
    
    Object.defineProperty(global, 'viewer', {
      get: () => viewer,
      set: (val) => { viewer = val; }
    });
    
    Object.defineProperty(global, 'Editor', {
      get: () => Editor,
      set: (val) => { Editor = val; }
    });
}