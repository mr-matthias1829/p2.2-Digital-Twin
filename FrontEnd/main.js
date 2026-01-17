/**
 * main.js
 * 
 * Coordinates drawing modes, state management, and all component interactions.
 * Handles polygon/line drawing, model placement, editing, and data visualization.
 * 
 * @module UrbanPlanner/Core
 * @requires module:Cesium
 * @requires module:UI
 * @requires module:ObjectEditor
 * @requires module:polygonAPI
 * @requires module:boundsChecker
 */

// Wait for the HTML document to be fully loaded before starting the application
// This ensures all HTML elements exist before we try to manipulate them
document.addEventListener('DOMContentLoaded', () => {
    setup();          // mainInit.js - Initialize Cesium viewer, load models, create Spoordok boundary
    laterSetup();     // main.js - Setup UI, load building types, initialize event handlers
});

/** @type {import('cesium').Viewer} Global Cesium viewer instance */
var viewer;

/** @type {import('./ObjectEditor.js').default} Global object editor instance */
var Editor;

/**
 * Sets up UI components and state change subscriptions
 * Called during application initialization
 * This is the main orchestrator for UI initialization
 */
function setupSetups() {
    // Create all UI elements (mode selector, dropdowns, info panels)
    UIsetup();
    
    // Set up listeners for UI state changes (mode changes, type selection, model selection)
    // These listeners update the drawing behavior when user changes modes
    subscribeToStateChangesSetup();
    
    // Initialize goals UI if the Goals.js module is loaded
    // Goals track urban planning objectives (livability, cost, etc.)
    if (typeof initializeGoalsUI === 'function') {
        initializeGoalsUI();
    }
}

/**
 * Subscribes to UI state changes and updates drawing state accordingly
 * Handles mode switching, object type changes, and model selection
 * This implements the Observer pattern for UI state management
 */
function subscribeToStateChangesSetup() {
    // Subscribe to mode changes (Data, Polygon, Line, Model, Edit, AI)
    onUIStateChange('modeSelect', (newMode) => {
        // If user was drawing a shape and switches modes, finalize the shape first
        // This prevents partial shapes from being left in an incomplete state
        if (drawingMode !== "none" && activeShapePoints.length > 0){
            terminateShape();
        }
        
        // If user was in edit mode and switches away, stop editing
        // This ensures we clean up any vertex markers and restore original colors
        if (drawingMode == "edit" && newMode != "edit") {
           Editor.stopEditing();
        }
        
        // Update the global drawing mode to match the UI selection
        drawingMode = newMode;

        // Reset model and type selection to defaults when mode changes
        // This ensures a clean state for the new mode
        modelToCreate = modelToCreateDEFAULT;
        objType = objTypeDEFAULT;
    });

    // Subscribe to building type changes (e.g., "residential", "commercial building")
    // This affects what type of polygon will be created on next draw
    onUIStateChange('objtype', (newObj) => {
        objType = newObj; // Update current object type for polygon creation
    });

    // Subscribe to 3D model selection changes (e.g., "tree", "bench", "lamp")
    // This determines which model will be placed when user clicks in Model mode
    onUIStateChange('modelselect', (newModel) => {
        modelToCreate = newModel; // Update current model to spawn
    });
}

/** @type {string|null} Default model to create when in model mode */
let modelToCreateDEFAULT = null; // Temporary to init the var, later set to id 0 of models

/** @type {string} Default object type when no type is selected */
const objTypeDEFAULT = 'none';

// Make sure these are the same defaults as in UI.js to prevent offsets with UI!
let modelToCreate = modelToCreateDEFAULT;

/** @type {('polygon'|'line'|'model'|'edit'|'data'|'ai'|'none')} Current drawing mode */
let drawingMode = "data"; // Start in data mode by default

/** @type {string} Current object type for polygon creation */
let objType = objTypeDEFAULT;

/**
 * Performs asynchronous setup after initial page load
 * Fetches available models and sets up occupation stats
 * @async
 */
async function laterSetup(){
    // Initialize UI and event listeners
    setupSetups();

    // Wait for all 3D models to be preloaded, then get their IDs
    // This ensures models are ready for instant placement
    const ids = await getAllModelIDsAsync();

    // Set the first model as the default selection in Model mode
    // Typically this will be the "man" model
    modelToCreateDEFAULT = ids[0];
    modelToCreate = modelToCreateDEFAULT;

    // Initial occupation stats update (after a short delay to ensure entities are loaded)
    // Delay gives time for polygons to load from database before calculating stats
    setTimeout(() => {
        if (typeof updateOccupationStats === 'function') {
            updateOccupationStats(); // Calculate area occupation within Spoordok boundary
        }
    }, 2000);
}

/**
 * Creates a point entity at the specified world position
 * @param {import('cesium').Cartesian3} worldPosition - Position in 3D world coordinates
 * @returns {import('cesium').Entity} The created point entity
 */
function createPoint(worldPosition) {
    const point = viewer.entities.add({
        position: worldPosition,
    });
    return point;
}

/**
 * Draws a shape (line or polygon) based on current drawing mode
 * This creates a temporary "live" shape that updates as the user moves their mouse
 * @param {import('cesium').PolygonHierarchy|import('cesium').Cartesian3[]} positionData 
 * - For polygon mode: Cesium.PolygonHierarchy object
 * - For line mode: Array of Cesium.Cartesian3 positions
 * @returns {import('cesium').Entity} The created shape entity
 * @throws {Error} If drawingMode is not 'line' or 'polygon'
 * @note Line mode is currently unused but kept for future features
 */
function drawShape(positionData) {
    let shape;

    // LINE MODE: Create a corridor (road-like shape with width)
    if (drawingMode === "line") {
        shape = viewer.entities.add({
            corridor: {  // Corridor is Cesium's line-with-width primitive
                positions: positionData,  // Dynamic array that updates as user clicks
                width: 3.0, // Fixed width in meters (represents road width)
                material: Cesium.Color.DARKGREY,  // Default gray color for roads
                outlineWidth: 1,
                outline: true,
                height: 0,  // Ground level
                extrudedHeight: 0,  // No vertical extrusion
                clampToGround: true,  // Follow terrain elevation
            },
            properties: {
                buildType: 'road' // Default type for corridors/roads
            },
            lineName: '',  // Will be set later if user names the corridor
            lineId: null   // Will be assigned by database after saving
        });
    } 
    // POLYGON MODE: Create a 2D/3D extruded polygon (building footprint)
    else if (drawingMode === "polygon") {
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,  // Dynamic polygon hierarchy that updates as user clicks
                material: Cesium.Color.WHITE, // Temporary color (will be replaced by type color)
                extrudedHeight: 0.0, // Set default height to avoid rendering issues
            },
            properties: {
                buildType: objType  // Store the selected building type (e.g., "residential")
            }
        });
        // Apply type-specific color and properties immediately
        applyTypeInitPolygon(shape);
    }
 return shape;
}

/** @type {import('cesium').Cartesian3[]} Array of points for the currently active shape */
let activeShapePoints = [];

/** @type {import('cesium').Entity|null} Currently active shape being drawn */
let activeShape;

/** @type {import('cesium').Entity|null} Floating point that follows mouse during drawing */
let floatingPoint;

/**
 * Sets up Cesium screen space event handlers for drawing and editing
 * Configures mouse click, move, and double-click interactions
 * This is the main input controller that routes events to appropriate handlers
 */
function setupInputActions() {
    // Disable Cesium's default double-click to zoom behavior
    // We need double-click for edit mode and data display instead
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    // Create a new event handler for all input actions
    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    // LEFT MOUSE DOWN - Used for vertex dragging in edit mode
    // Edit mode has priority over other interactions
    handler.setInputAction(function (event) {
        // Pass event to Editor which will handle vertex selection and drag start
        Editor.handleLeftDown(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // LEFT MOUSE UP - Completes vertex dragging or other mouse interactions
    handler.setInputAction(function (event) {
        // Pass event to Editor which will handle drag completion and vertex updates
        Editor.handleLeftUp(event);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // MOUSE MOVE - Updates floating point position and provides real-time feedback
    handler.setInputAction(function (event) {
        // Let polygon editor handle its move logic first (vertex highlighting, dragging)
        Editor.handleMouseMove(event);
        
        // Only handle drawing mode floating point if NOT in edit mode
        // The floating point shows where the next vertex will be placed
        if (!Editor.editMode && Cesium.defined(floatingPoint)) {
            // Cast a ray from camera through mouse position to find ground intersection
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            
            if (Cesium.defined(newPosition)) {
                // Update the floating point to follow the mouse cursor
                floatingPoint.position.setValue(newPosition);
                
                // Update the last point in the active shape to match floating point
                // This creates the "rubber band" effect as user moves mouse
                activeShapePoints.pop();  // Remove old floating point position
                activeShapePoints.push(newPosition);  // Add new floating point position
                
                // Real-time bounds checking during drawing
                // This gives immediate visual feedback if polygon goes out of bounds
                if (drawingMode === "polygon" && activeShape && typeof boundsChecker !== 'undefined') {
                    const spoordokEntity = boundsChecker.getSpoordokEntity(viewer);
                    if (spoordokEntity) {
                        // Get Spoordok boundary positions for validation
                        const spoordokPositions = boundsChecker.getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);
                        
                        // Check if all polygon vertices are within the Spoordok boundary
                        const isWithinBounds = boundsChecker.isPolygonInsideBounds(activeShapePoints, spoordokPositions);
                        
                        // Update outline during drawing to show validation status
                        if (activeShape.polygon) {
                            if (!isWithinBounds) {
                                // Red outline = out of bounds (invalid)
                                activeShape.polygon.outlineColor = Cesium.Color.RED;
                                activeShape.polygon.outline = true;
                                activeShape.polygon.outlineWidth = 3.0;
                            } else {
                                // No outline = within bounds (valid)
                                activeShape.polygon.outline = false;
                            }
                        }
                    }
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // LEFT CLICK - Drawing mode (only when NOT editing)
    // This adds vertices to the current shape being drawn
    handler.setInputAction(function (event) {
        // CRITICAL: Block all drawing actions if in edit mode
        // Edit mode uses left click for vertex manipulation, not drawing
        if (Editor.editMode) return;
        
        // Only proceed if in a drawing mode (polygon, line, or model)
        // "none" and "edit" modes don't use left click for drawing
        if (drawingMode === "none" || drawingMode === "edit") return;
        
        // Cast ray from camera through click position to find ground intersection
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        
        // Pass the 3D world position to the drawing handler
        handleClickToDraw(earthPosition);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // DOUBLE CLICK - Dual purpose: Start editing (Edit mode) OR show data (Data mode)
    // This is a critical interaction point that behaves differently based on current mode
    handler.setInputAction(function (event) {
        // If in Data mode, show polygon/corridor data instead of editing
        // Data mode is for viewing properties without modifying geometry
        if (drawingMode === "data") {
            // Check what was clicked on (polygon, corridor, etc.)
            const picked = viewer.scene.pick(event.position);
            if (Cesium.defined(picked) && picked.id) {
                // Handle polygons (building footprints)
                if (picked.id.polygon && !picked.id.properties?.isVertex) {
                    // If clicked on green roof overlay, use parent entity instead
                    // Green roof overlay is a visual effect, not the actual polygon
                    let targetEntity = picked.id;
                    if (picked.id.properties?.isGreenRoofOverlay && picked.id._parentEntity) {
                        targetEntity = picked.id._parentEntity;  // Get actual building polygon
                    }
                    // Display polygon data in the data menu panel
                    showPolygonDataInDataMenu(targetEntity);
                    return;
                }
                // Handle corridors (roads/paths)
                if (picked.id.corridor && !picked.id.properties?.isVertex) {
                    // Display corridor data in the data menu panel
                    showPolygonDataInDataMenu(picked.id);
                    return;
                }
            }
        }
        
        // Let the editor handle all double-click logic (for Edit mode)
        // This will start vertex editing if a polygon/corridor was clicked
        const handled = Editor.handleDoubleClick(event);
        
        // If editor didn't handle it and we're drawing, do nothing
        // (prevents accidental polygon selection while drawing)
        if (drawingMode !== "none" && drawingMode !== "edit") {
            console.log("Double-click ignored - currently in drawing mode");
        }

        // Special case: AI mode with Cesium Man interaction
        // Check if user double-clicked on a Cesium Man model to open AI dialog
        const pickedObject = viewer.scene.pick(event.position);
        if (Cesium.defined(pickedObject) && 
            pickedObject.primitive && 
            pickedObject.primitive.isEditableModel && 
            pickedObject.primitive.modelKey === "man" &&
            drawingMode === "ai") {
        
            // Found a Cesium Man in AI mode - open the AI interaction UI
            const cesiumMan = pickedObject.primitive;
            openCesiumManUI(cesiumMan);
            return;
        }

    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // RIGHT CLICK - Finish drawing, editing, or moving
    // Right-click is the universal "complete action" button
    handler.setInputAction(function (event) {
        // Editor gets first priority (for finishing vertex moves, rotations, etc.)
        const editorHandled = Editor.handleRightClick(event);
        
        // If editor didn't handle it and we're drawing, check if we can finish the shape
        if (!editorHandled && activeShapePoints.length > 0) {
            // Validate minimum points for polygon (subtract 1 for floating point)
            // Polygons need at least 3 fixed vertices to form a closed shape
            if (drawingMode === "polygon" && activeShapePoints.length < 4) {
                // Calculate how many more points are needed (account for floating point)
                const pointsNeeded = 4 - activeShapePoints.length;
                alert(`Cannot create polygon: You need to add ${pointsNeeded} more point${pointsNeeded > 1 ? 's' : ''} (minimum 3 points required).`);
                console.log(`⚠ Need ${pointsNeeded} more point${pointsNeeded > 1 ? 's' : ''} for a polygon`);
                return;  // Don't terminate - let user continue drawing
            }
            // Finalize the shape (remove floating point, create permanent entity)
            terminateShape();
        }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);

    // Note: The RIGHT_CLICK handler appears twice in the code above, so we keep only one
    // The second instance was likely a duplicate from refactoring
}

    /**
     * Handles click events for drawing based on current mode
     * This is the core drawing logic that adds vertices or places models
     * @param {import('cesium').Cartesian3} earthPosition - Click position in world coordinates
     */
    function handleClickToDraw(earthPosition) { // Split into a function so the code can be tested
        
        // If click didn't hit the ground, ignore it
        if (!Cesium.defined(earthPosition)) return;
        
        // Handle model placement (trees, benches, lamps, etc.)
        if (drawingMode === "model") {
            // Convert 3D world position to longitude/latitude coordinates
            const cartographic = Cesium.Cartographic.fromCartesian(earthPosition);
            const lon = Cesium.Math.toDegrees(cartographic.longitude);
            const lat = Cesium.Math.toDegrees(cartographic.latitude);
            
            // Place the selected model at the clicked location
            // spawnModel creates a 3D model primitive at the specified coordinates
            spawnModel(modelToCreate, { lon, lat }, 0);
            return; // Exit after placing model - no further drawing needed
        }
        
        // Handle polygon/line drawing (multi-click process)
        if (drawingMode === "polygon" || drawingMode === "line") {
            // Prevent polygon drawing if type is "none"
            // User must select a building type before drawing
            if (drawingMode === "polygon" && objType === "none") {
                console.log("⚠ Please select a type before drawing a polygon");
                return;
            }
            
            // FIRST CLICK: Initialize the drawing process
            if (activeShapePoints.length === 0) {
                // Create a fixed point at the click location (first vertex)
                createPoint(earthPosition);
                activeShapePoints.push(earthPosition);
                
                // Create a dynamic shape that updates in real-time as user moves mouse
                // CallbackProperty allows the shape to be "live" and reactive
                const dynamicPositions = new Cesium.CallbackProperty(function () {
                    if (drawingMode === "polygon") {
                        // For polygons, return a hierarchy (closed shape)
                        return new Cesium.PolygonHierarchy(activeShapePoints);
                    }
                    // For lines, return array of positions (open path)
                    return activeShapePoints;
                }, false);
                
                // Create the visual shape entity
                activeShape = drawShape(dynamicPositions);
                
                // Create a floating point that will follow the mouse cursor
                // This shows where the next vertex will be placed
                floatingPoint = createPoint(earthPosition);
                activeShapePoints.push(earthPosition);  // Add floating point to array
            } 
            // SUBSEQUENT CLICKS: Add more vertices to the shape
            else {
                // Replace floating point with fixed point at current location
                activeShapePoints.pop(); // Remove old floating point position
                createPoint(earthPosition); // Create new fixed point marker
                activeShapePoints.push(earthPosition); // Add new fixed position
                
                // Recreate floating point at same location
                // This will continue following mouse after this click
                floatingPoint = createPoint(earthPosition);
                activeShapePoints.push(earthPosition);  // Add new floating point
            }
        }
    }

/**
 * Opens the generation UI for interacting with a Cesium Man entity
 * @param {Object} cesiumManPrimitive - The Cesium Man primitive to interact with
 */
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

/**
 * Finalizes the current shape being drawn
 * Creates a permanent entity, validates bounds, and cleans up drawing state
 * This is called when user right-clicks to complete the shape
 * @param {boolean} [saveToAPI=true] - Whether to save the polygon to the backend
 */
function terminateShape() {
    // Early exit if no shape is being drawn
    if (activeShapePoints.length === 0) return;
    
    // Remove the floating point (last position that follows mouse)
    activeShapePoints.pop();
    
    // Validate minimum vertices for polygon
    // Need at least 3 points to form a closed polygon shape
    if (drawingMode === "polygon" && activeShapePoints.length < 3) {
        console.log("⚠ Need at least 3 points for a polygon");
        // Clean up temporary entities
        viewer.entities.remove(floatingPoint);
        viewer.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
        return;  // Don't create polygon - invalid
    }
    
    // Create the final permanent shape
    let finalShape;
    if (drawingMode === "polygon") {
        // Create a permanent polygon entity with fixed hierarchy
        finalShape = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(activeShapePoints),  // Fixed vertex positions
                material: Cesium.Color.WHITE,  // Temporary color (will be updated by type)
                extrudedHeight: 0.0,  // Ground-level polygon initially
            },
            properties: new Cesium.PropertyBag({
                buildType: objType  // Store selected building type (e.g., "residential")
            }),
            polygonName: '',  // Initialize with empty name (can be edited later)
            hasNatureOnTop: false  // Initialize green roof as disabled
        });
        
        // Apply type-specific color and properties from TypeData
        applyTypeInitPolygon(finalShape);
        
        // Check bounds and mark if out of bounds
        // Validates that polygon is within the Spoordok boundary
        if (typeof boundsChecker !== 'undefined') {
            const isWithinBounds = boundsChecker.validateAndMarkPolygon(finalShape, viewer);
            if (!isWithinBounds) {
                console.log('⚠️ Polygon placed outside valid boundary');
            }
        }
        
        // Auto-save polygon to database
        // This persists the polygon so it loads on next session
        if (typeof polygonAPI !== 'undefined') {
            polygonAPI.savePolygon(finalShape)
                .then(() => console.log('✓ Polygon saved to database'))
                .catch(err => console.error('Failed to save polygon:', err));
        }
        
        console.log(`✓ Polygon created with ${activeShapePoints.length} vertices`);
    } else if (drawingMode === "line") {
        // Create a permanent corridor (road) entity
        finalShape = drawShape(activeShapePoints);
        
        // Auto-save corridor to database
        if (typeof corridorAPI !== 'undefined' && finalShape) {
            corridorAPI.saveCorridor(finalShape)
                .then(() => console.log('✓ Corridor saved to database'))
                .catch(err => console.error('Failed to save corridor:', err));
        }
        
        console.log(`✓ Line created with ${activeShapePoints.length} points`);
    }
    
    // Clean up drawing state - remove temporary entities
    viewer.entities.remove(floatingPoint);  // Remove floating point marker
    viewer.entities.remove(activeShape);     // Remove dynamic shape
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];  // Reset points array

    // Update occupation stats after drawing a polygon or line
    // This recalculates area usage within Spoordok boundary
    if ((drawingMode === "polygon" || drawingMode === "line") && typeof updateOccupationStats === 'function') {
        setTimeout(() => updateOccupationStats(), 100);  // Small delay to ensure entity is fully added
    }
}

/**
 * Calculates the length of a corridor by summing distances between consecutive positions
 * Used for calculating road/path lengths and their approximate areas
 * @param {Cesium.Cartesian3[]} positions - Array of positions defining the corridor center line
 * @returns {number} Total length in meters
 */
function calculateCorridorLength(positions) {
    // Early exit if not enough points
    if (!positions || positions.length < 2) return 0;
    
    let totalLength = 0;
    
    // Sum up distances between consecutive points
    // Each segment's length is calculated using Euclidean distance in 3D space
    for (let i = 0; i < positions.length - 1; i++) {
        const distance = Cesium.Cartesian3.distance(positions[i], positions[i + 1]);
        totalLength += distance;  // Distance is in meters
    }
    
    return totalLength;
}

/**
 * Calculates and updates occupation statistics by calling backend API
 * Shows area breakdown by building type and updates pie chart
 * @async
 */
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
            // Handle polygons
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
            
            // Handle corridors (roads) - calculate area as length * 3m width
            if (entity.corridor) {
                let positions = entity.corridor.positions;
                if (typeof positions?.getValue === 'function') {
                    positions = positions.getValue(Cesium.JulianDate.now());
                }
                
                if (positions && positions.length >= 2) {
                    // Get corridor type (default to 'road')
                    let type = 'road';
                    if (entity.properties && entity.properties.buildType) {
                        const bt = entity.properties.buildType;
                        type = typeof bt.getValue === 'function' ? bt.getValue() : bt;
                    }
                    
                    // Calculate corridor length
                    const length = calculateCorridorLength(positions);
                    const width = 3.0; // Fixed width in meters
                    const area = length * width;
                    
                    // Pass all corridor positions so backend can check if corridor is inside Spoordok
                    polygonAreas.push({
                        positions: positions.map(p => ({
                            x: p.x,
                            y: p.y,
                            z: p.z
                        })),
                        type: type,
                        corridorArea: area // Pass pre-calculated area
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

/**
 * Draws a pie chart visualizing area breakdown by building type
 * @param {Object} typeBreakdown - Object mapping type IDs to area/percentage data
 * @param {Object.<string, {area: number, percentage: number}>} typeBreakdown
 */
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

/**
 * Displays a textual breakdown of area by building type
 * @param {Object} typeBreakdown - Object mapping type IDs to area/percentage data
 * @param {Object.<string, {area: number, percentage: number}>} typeBreakdown
 */
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

/**
 * Gets the color associated with a building type
 * @param {string} typeId - The building type identifier
 * @returns {string} CSS color string (rgba format)
 */
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

// Expose functions globally for testing and debugging
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
    // Expose variables with getters/setters for testing
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