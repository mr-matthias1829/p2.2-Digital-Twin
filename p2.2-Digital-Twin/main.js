document.addEventListener('DOMContentLoaded', () => {
    setup();          // mainPreSetup.js
    laterSetup();     // main.js
});

var measure;
var viewer;
var Editor;

function setupSetups() {
    UIsetup();
    subscribeToStateChangesSetup();
    preloadModels();
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

const modelToCreateDEFAULT = getAllModelIDs()[0];
const objTypeDEFAULT = 'none';

// Make sure these are the same defaults as in UI.js to prevent offsets with UI!
let modelToCreate = modelToCreateDEFAULT;
let drawingMode = "none";
let objType = objTypeDEFAULT;

function laterSetup(){
    setupSetups();

    // Start connection polling to the polygons API
    startConnectionPolling();

    // Load polygons from server (if available)
    loadPolygonsFromServer();

    // Initial occupation stats update (after a short delay to ensure entities are loaded)
    setTimeout(() => {
        if (typeof updateOccupationStats === 'function') {
            updateOccupationStats();
        }
    }, 2000);
}

// Base URL for the polygons API. Can be overridden by setting `window.POLYGONS_API_BASE` before this script runs.
const POLYGONS_API_BASE = (window.POLYGONS_API_BASE && String(window.POLYGONS_API_BASE).replace(/\/$/, '')) || 'http://localhost:8081';


function createPoint(worldPosition) {
    const point = viewer.entities.add({
        position: worldPosition,
        point: {
            color: Cesium.Color.BLUE,
            pixelSize: 0,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        },
    });
    return point;
}

function drawShape(positionData) {
    let shape;

    // Line drawing mode is unused, but still here if you want to use it later anyway
    if (drawingMode === "line") {
        shape = viewer.entities.add({
            polyline: {
                positions: positionData,
                clampToGround: true,
                width: 3,
            },
        });
    } else if (drawingMode === "polygon") {
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,
                material: Cesium.Color.WHITE, // Temporary color
            },
            properties: {
                buildType: objType  // Set the type HERE first
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

    // LEFT DOWN
    handler.setInputAction(function (event) {
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
        
        // Handle drawing mode floating point
        if (!Editor.editMode && !Editor.moveMode && Cesium.defined(floatingPoint)) {
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // LEFT CLICK - Drawing mode
    handler.setInputAction(function (event) {
        if (Editor.editMode || Editor.moveMode) return;
        
        if (drawingMode !== "none") {
            const ray = viewer.camera.getPickRay(event.position);
            const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
            
            if (Cesium.defined(earthPosition)) {
    
            if (drawingMode === "model") {
                const cartographic = Cesium.Cartographic.fromCartesian(earthPosition);
                const lon = Cesium.Math.toDegrees(cartographic.longitude);
                const lat = Cesium.Math.toDegrees(cartographic.latitude);

               // createModel("Cesium_Man.glb", { lon, lat }, 0);

               // NOTE: type is automatically applied inside spawnModel already! refer to ModelPreLoad.js
                spawnModel(modelToCreate,{ lon, lat }, 0 )

                // alternate version where you can define type from the caller:
                // const building = await spawnModel("building", {lon, lat}, 0, 0, {buildType: "commercial_building"});
            }
            
            if (activeShapePoints.length === 0) {
                    floatingPoint = createPoint(earthPosition);
                    activeShapePoints.push(earthPosition);
                    const dynamicPositions = new Cesium.CallbackProperty(function () {
                        if (drawingMode === "polygon") {
                            return new Cesium.PolygonHierarchy(activeShapePoints);
                        }
                        return activeShapePoints;
                    }, false);
                    activeShape = drawShape(dynamicPositions);
                }
                activeShapePoints.push(earthPosition);
                createPoint(earthPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // DOUBLE CLICK - Start editing polygon
    handler.setInputAction(function (event) {
        Editor.handleDoubleClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);
    

    // RIGHT CLICK - Finish drawing, editing, or moving
    handler.setInputAction(function (event) {
        const editorHandled = Editor.handleRightClick(event);
        
        if (!editorHandled && activeShapePoints.length > 0) {
            terminateShape();
        }
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

function terminateShape() {
    if (activeShapePoints.length > 0) {
        activeShapePoints.pop();
        drawShape(activeShapePoints);
    }
    viewer.entities.remove(floatingPoint);
    viewer.entities.remove(activeShape);
    floatingPoint = undefined;
    activeShape = undefined;
    activeShapePoints = [];
    
    // Update occupation stats after drawing a polygon
    if (typeof updateOccupationStats === 'function') {
        setTimeout(() => updateOccupationStats(), 100);
    }
}

// x = verplaatsing in meters oost (+) / west (-)
// y = verplaatsing in meters noord (+) / zuid (-)
// reference_lon = referentie-longitude (graden)
// reference_lat = referentie-latitude (graden)

const reference_lon = 5.77465380114684;
const reference_lat = 53.194528716741345;

function latlonFromXY(xMeters, yMeters) {
    const metersPerDegLat = 111320.0;

    // bereken nieuwe latitude (in graden)
    const newLat = reference_lat + (yMeters / metersPerDegLat);

    // meters per graad longitude = ~111320 * cos(latitude_in_radians)
    const latRad = newLat * Math.PI / 180.0;
    const metersPerDegLon = 111320.0 * Math.cos(latRad);

    // voorkom deling door 0 vlak bij polen
    const newLon = reference_lon + (xMeters / (metersPerDegLon || 1e-9));

    return { lat: newLat, lon: newLon };
}

var _box = 1;

function createBox(x, y, width, depth, height, rotation, color) {
    const cords = latlonFromXY(x, y);
    return createBoxLatLon(cords, width, depth, height, rotation, color);
}

function createBoxLatLon(cords, width, depth, height, rotation, color) {
    return viewer.entities.add({
        name: "Box_" + _box++,
        position: Cesium.Cartesian3.fromDegrees(cords.lon, cords.lat, height / 2.0),
        box: {
            dimensions: new Cesium.Cartesian3(width, depth, height),
            material: color
        }
    });
}

function createBoxXYZ(position, width, depth, height, rotation, color) {
    return viewer.entities.add({
        name: "Box_" + _box++,
        position: position,
        box: {
            dimensions: new Cesium.Cartesian3(width, depth, height),
            material: color,
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND
        }
    });
}

function moveEntity(entity, x, y) {
    const cords = latlonFromXY(x, y);
    entity.position = Cesium.Cartesian3.fromDegrees(cords.lon, cords.lat, entity.box.dimensions._value.z);
}

var _polygon = 1;

function createPolygonFromXYs(xyArray, color) {
    var degreeArray = [];
    xyArray.forEach(element => {
        const cords = latlonFromXY(element[0], element[1]);
        degreeArray.push(cords.lon);
        degreeArray.push(cords.lat);
    });
}

//Werkt alleen met glTF modellen!
//Als je OBJ-modellen wilt laden, moet je ze eerst naar glTF converten. Dit kan met Blender,
//maar ook via de volgende tool van Cesium: https://github.com/CesiumGS/obj2gltf
//!Let op bij gebruik van Blender! 3D-modellen die als .blend bestand worden opgeslagen kunnen
//embedded Python-code bevatten. Pas op dat dit niet tijdens het openen automatisch uitgevoerd
//wordt, want dit is een bekende attack vector voor exploits, etc.
function createModel(url, position, height) {
    const full_position = Cesium.Cartesian3.fromDegrees(
        position.lon,
        position.lat,
        height
    );

    const heading = Cesium.Math.toRadians(135);
    const pitch = 0;
    const roll = 0;
    const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
        full_position,
        hpr,
    );

    const entity = viewer.entities.add({
        name: url,
        position: full_position,
        orientation: orientation,
        model: {
            uri: url,
            minimumPixelSize: 128,
            maximumScale: 1,
        },
    });
   // viewer.trackedEntity = entity;
}

function cartesianToLatLon(cartesianPosition) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesianPosition);
    const lon = cartographic.longitude;
    const lat = cartographic.latitude;
    return { lat, lon };
}

const gridSize = 1.1;

function snapToGrid(position) {
    const snappedX = Math.round(position.x / gridSize) * gridSize;
    const snappedZ = Math.round(position.z / gridSize) * gridSize;
    return new Cesium.Cartesian3(snappedX, position.y, snappedZ);
}

function create3DObject(basePolygon, height) {
    if (basePolygon.polygon.extrudedHeight == undefined) {
        basePolygon.polygon.extrudedHeight = height;
    } else {
        basePolygon.polygon.extrudedHeight *= 1.5;
    }
}

// Connection check and polling for API at http://localhost:8080/api/polygons
let connectionPollIntervalId = undefined;
function startConnectionPolling() {
    // Run an initial check immediately
    if (window.checkPolygonsConnection) {
        window.checkPolygonsConnection();
    } else {
        checkPolygonsConnection();
    }

    // Poll every 10 seconds
    if (connectionPollIntervalId) clearInterval(connectionPollIntervalId);
    connectionPollIntervalId = setInterval(checkPolygonsConnection, 10000);
}

async function checkPolygonsConnection(manualTrigger = false) {
    const url = POLYGONS_API_BASE + '/api/polygons';
    const timeoutMs = 4000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);

    try {
        const resp = await fetch(url, { signal: controller.signal, cache: 'no-store' });
        clearTimeout(id);
        if (!resp.ok) {
            const msg = `HTTP ${resp.status}`;
            if (window.setConnectionStatus) window.setConnectionStatus('Disconnected', msg);
            console.warn('Polygons API responded with non-OK:', resp.status);
            return false;
        }

        // try to parse and show minimal info
        let bodyText = '';
        try {
            const json = await resp.json();
            if (Array.isArray(json)) bodyText = `Items: ${json.length}`;
            else if (json && typeof json === 'object') bodyText = `Object keys: ${Object.keys(json).length}`;
            else bodyText = 'OK';
        } catch (e) {
            bodyText = 'OK (non-JSON)';
        }

        if (window.setConnectionStatus) window.setConnectionStatus('Connected', bodyText + (manualTrigger ? ' (manual)' : ''));
        return true;
    } catch (err) {
        clearTimeout(id);
        let message = '';
        if (err.name === 'AbortError') {
            message = `Timeout after ${timeoutMs}ms`;
        } else {
            message = err.message || String(err);
        }

        // If it's a network error (often CORS or server down), surface reasonable hint.
        if (window.setConnectionStatus) {
            let userMsg = message;
            if (message.toLowerCase().includes('failed to fetch') || message.toLowerCase().includes('networkrequestfailed')) {
                userMsg = message + ' — Spring Boot server not detected';
            }
            window.setConnectionStatus('Disconnected', userMsg + (manualTrigger ? ' (manual)' : ''));
        }
        console.warn('Error checking polygons API:', err);
        return false;
    }
}

// Expose to the UI button
window.checkPolygonsConnection = checkPolygonsConnection;

// Map of server polygon id -> Cesium entity (so we don't duplicate on repeated loads)
window.serverPolygonEntities = new Map();

async function loadPolygonsFromServer() {
    const url = POLYGONS_API_BASE + '/api/polygons';
    try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) {
            console.warn('Failed to load polygons from server:', resp.status, 'url=', url);
            return;
        }
        const polygons = await resp.json();
        if (!Array.isArray(polygons)) return;

        // Render or update each polygon
        polygons.forEach(p => {
            if (!p || !p.coordinates) return;
            const id = p.id != null ? p.id : Math.random();
            // If entity exists already, remove and replace to reflect server state
            if (window.serverPolygonEntities.has(id)) {
                const existing = window.serverPolygonEntities.get(id);
                try { viewer.entities.remove(existing); } catch (e) {}
                window.serverPolygonEntities.delete(id);
            }

            const degreesArray = [];
            p.coordinates.forEach(c => {
                // server uses { longitude, latitude }
                const lon = c.longitude != null ? c.longitude : c.lng || c.lon;
                const lat = c.latitude != null ? c.latitude : c.lat;
                if (lon != null && lat != null) {
                    degreesArray.push(lon);
                    degreesArray.push(lat);
                }
            });

            if (degreesArray.length < 6) return; // need at least 3 points

            const entity = viewer.entities.add({
                id: 'server-polygon-' + id,
                name: (p.type ? p.type : 'server-polygon') + (p.id ? ` (${p.id})` : ''),
                polygon: {
                    hierarchy: Cesium.Cartesian3.fromDegreesArray(degreesArray),
                    material: new Cesium.ColorMaterialProperty(Cesium.Color.fromCssColorString('#eeff00ff').withAlpha(1)),
                    extrudedHeight: (p.height && !isNaN(p.height)) ? p.height : undefined,
                    height: 0,
                    classificationType: Cesium.ClassificationType.BOTH
                },
                properties: {
                    isServerPolygon: true,
                    serverId: id
                }
            });

            window.serverPolygonEntities.set(id, entity);
        });
    } catch (err) {
        console.warn('Error fetching polygons from server:', err);
    }
}

// Expose for manual reload
// Utility: extract coordinates from a polygon entity's hierarchy
function _getPositionsFromHierarchy(hierarchy) {
    if (!hierarchy) return [];
    if (typeof hierarchy.getValue === 'function') {
        hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
    }
    if (hierarchy instanceof Cesium.PolygonHierarchy) {
        return hierarchy.positions || [];
    }
    if (Array.isArray(hierarchy)) return hierarchy;
    if (hierarchy.positions) return hierarchy.positions;
    return [];
}

// Show polygon coordinates in the bottom-right container (if present)
window.showPolygonInfo = async function (entity) {
    try {
        const el = document.getElementById('polygonInfo');
        if (!el) return;
        // Ensure the panel is visible when showing info
        el.style.display = 'block';
        if (!entity || !entity.polygon) {
            el.innerHTML = '<b>Geen polygon geselecteerd</b>';
            return;
        }

        const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
        if (!positions || positions.length === 0) {
            el.innerHTML = '<b>Geen coordinaten beschikbaar</b>';
            return;
        }

        // Compute height (prefer extrudedHeight, fallback to height)
        let extruded = entity.polygon.extrudedHeight;
        let baseHeight = entity.polygon.height;
        function _getNumeric(val) {
            if (val == null) return undefined;
            if (typeof val === 'number') return val;
            if (val && typeof val.getValue === 'function') return val.getValue(Cesium.JulianDate.now());
            return undefined;
        }
        const extrudedVal = _getNumeric(extruded);
        const baseVal = _getNumeric(baseHeight);

        let heightLine = '';
        if (typeof extrudedVal === 'number') {
            heightLine = `<small>Height: ${Number(extrudedVal).toFixed(2)} m</small>`;
        } else if (typeof baseVal === 'number') {
            heightLine = `<small>Base height: ${Number(baseVal).toFixed(2)} m</small>`;
        }

        // Compute area (always) and volume (if height present) using backend API via polygonUtils
        let areaLine = '';
        let volumeLine = '';
        try {
            if (window.polygonUtils) {
                // Show loading indicator while calculating
                el.innerHTML = `<b>Polygon coordinates</b> ${heightLine}<br/><small>(${positions.length} punten)</small><br/><i>Calculating area and volume...</i>`;
                
                if (typeof window.polygonUtils.computeAreaFromHierarchy === 'function') {
                    const area = await window.polygonUtils.computeAreaFromHierarchy(entity.polygon.hierarchy || positions);
                    if (typeof area === 'number') {
                        areaLine = `<small>Area: ${Number(area).toFixed(2)} m²</small>`;
                    }
                }
                if (typeof window.polygonUtils.computeVolumeFromEntity === 'function') {
                    const vol = await window.polygonUtils.computeVolumeFromEntity(entity);
                    if (vol && typeof vol.volume === 'number') {
                        volumeLine = `<small>Volume: ${Number(vol.volume).toFixed(2)} m³</small>`;
                    }
                }
            }
        } catch (e) {
            console.warn('polygonUtils error - backend may be unavailable:', e);
            areaLine = '<small style="color: #ff6b6b;">Area: Backend unavailable</small>';
            volumeLine = '<small style="color: #ff6b6b;">Volume: Backend unavailable</small>';
        }

        let html = `<b>Polygon coordinates</b> ${heightLine} ${areaLine} ${volumeLine}<br/><small>(${positions.length} punten)</small><hr/>`;
        positions.forEach((cartesian, i) => {
            const carto = Cesium.Cartographic.fromCartesian(cartesian);
            const lon = Cesium.Math.toDegrees(carto.longitude).toFixed(6);
            const lat = Cesium.Math.toDegrees(carto.latitude).toFixed(6);
            html += `${i + 1}: ${lat}, ${lon}<br/>`;
        });
        el.innerHTML = html;
    } catch (e) {
        console.warn('showPolygonInfo error', e);
    }
};

window.clearPolygonInfo = function () {
    const el = document.getElementById('polygonInfo');
    if (!el) return;
    // Hide the empty panel to avoid the thin visible strip when closed
    el.innerHTML = '';
    el.style.display = 'none';
};

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

        // Get all other polygons (excluding Spoordok)
        const polygonAreas = [];
        viewer.entities.values.forEach(entity => {
            if (entity.polygon && 
                (!entity.properties || !entity.properties.isSpoordok)) {
                const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
                if (positions && positions.length >= 3) {
                    polygonAreas.push({
                        positions: positions.map(p => ({
                            x: p.x,
                            y: p.y,
                            z: p.z
                        }))
                    });
                }
            }
        });

        // Call backend API
        const url = POLYGONS_API_BASE + '/api/polygons/occupation';
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

    } catch (error) {
        console.error('Error updating occupation stats:', error);
        document.getElementById('spoordokArea').textContent = 'Error';
        document.getElementById('occupiedArea').textContent = 'Error';
        document.getElementById('occupationPercentage').textContent = '--';
    }
}

// Call updateOccupationStats when polygons change
window.updateOccupationStats = updateOccupationStats;

window.loadPolygonsFromServer = loadPolygonsFromServer;