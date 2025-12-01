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
        if (drawingMode !== "none" && activeShapePoints.length > 0){
            terminateShape();
        }
        if (drawingMode == "edit" && newMode != "edit") {
           Editor.stopEditingPolygon();
        }
        drawingMode = newMode;
    });
    onUIStateChange('color', (newColor) => {
        stringColor = newColor;
    });

    onUIStateChange('modelselect', (newModel) => {
        modelToCreate = newModel;
    });
}


// Make sure these are the same defaults as in UI.js to prevent offsets with UI!
let modelToCreate = "man";
let stringColor = "#ffffff";
let drawingMode = "none";

function laterSetup(){
    setupSetups();
}


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
    if (drawingMode === "line") {
        shape = viewer.entities.add({
            polyline: {
                positions: positionData,
                clampToGround: true,
                width: 3,
            },
        });
    } else if (drawingMode === "polygon") {
        let cesiumColor = Cesium.Color.fromCssColorString(stringColor);
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,
                material: new Cesium.ColorMaterialProperty(cesiumColor),
            },
        });
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
                spawnModel(modelToCreate,{ lon, lat }, 0 )
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

    // CTRL+Click - Add vertex or extrude
    handler.setInputAction(function (event) {
        // Let polygon editor try to handle it first
        const handled = Editor.handleCtrlClick(event);
        
        if (!handled) {
            // Original extrude functionality when not in edit mode
            var pickedObject = viewer.scene.pick(event.position);
            if (Cesium.defined(pickedObject) && pickedObject.id) {
                const entity = pickedObject.id;
                if (entity.polygon && !entity.properties?.isVertex) {
                    create3DObject(entity, 20);
                    console.log("Extruded:", entity.name || entity.id);
                }
            }
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.CTRL);

    // ALT+Click - Start editing polygon vertices
    handler.setInputAction(function (event) {
        Editor.handleAltClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.ALT);

    // SHIFT+Click - Start moving polygon
    handler.setInputAction(function (event) {
        Editor.handleShiftClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.SHIFT);

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
    const url = 'http://localhost:8080/api/polygons';
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
    const url = 'http://localhost:8080/api/polygons';
    try {
        const resp = await fetch(url, { cache: 'no-store' });
        if (!resp.ok) {
            console.warn('Failed to load polygons from server:', resp.status);
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
window.loadPolygonsFromServer = loadPolygonsFromServer;