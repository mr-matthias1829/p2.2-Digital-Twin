window.onload = setup;

var measure;
var viewer;
var polygonEditor; // New: polygon editor instance

function setupSetups() {
    UIsetup();
    subscribeToStateChangesSetup();
}

function subscribeToStateChangesSetup() {
    onUIStateChange('modeSelect', (newMode) => {
        if (drawingMode !== "none" && activeShapePoints.length > 0){
            terminateShape();
        }
        drawingMode = newMode;
    });

    onUIStateChange('color', (color) => {
        stringColor = color;
    });
}

let stringColor = "#ffffff";
let drawingMode = "none";

function setup() {
    const west = 5.798212900532118;
    const south = 53.19304584690279;
    const east = 5.798212900532118;
    const north = 53.19304584690279;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0.0005;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;

    const osm = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
    });

    viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayerPicker: false,
        imageryProvider: false,
        infoBox: false,
        selectionIndicator: false,
        shadows: false,
        shouldAnimate: false,
    });

    setupSetups();

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(osm);

    viewer.scene.globe.maximumScreenSpaceError = 1;

    const condo1 = createBox(200, 300, 50, 40, 70, 0, "RICKMOCK.png");
    measure = createBox(0, 0, 3, 3, 30, 0, Cesium.Color.RED);
    
    const redPolygon = viewer.entities.add({
        name: "Spoordok",
        polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray([
                5.787759928698073, 53.197831145908,
                5.789123554275904, 53.19763995957844,
                5.788934967759822, 53.19602353198474,
                5.776937964005922, 53.194528716741345,
                5.774587885853288, 53.196901277127026,
                5.774703939093954, 53.1976225789762,
                5.786410809746187, 53.19704032421097,
            ]),
            material: Cesium.Color.LIGHTGRAY,
        },
    });
    
    createModel("Cesium_Man.glb", latlonFromXY(220, 70), 0);

    // Initialize polygon editor
    polygonEditor = new PolygonEditor(viewer);

    setupInputActions();
}

function createPoint(worldPosition) {
    const point = viewer.entities.add({
        position: worldPosition,
        point: {
            color: Cesium.Color.BLUE,
            pixelSize: 5,
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
        polygonEditor.handleLeftDown(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOWN);

    // LEFT UP
    handler.setInputAction(function (event) {
        polygonEditor.handleLeftUp(event);
    }, Cesium.ScreenSpaceEventType.LEFT_UP);

    // MOUSE MOVE
    handler.setInputAction(function (event) {
        // Let polygon editor handle its move logic first
        polygonEditor.handleMouseMove(event);
        
        // Handle drawing mode floating point
        if (!polygonEditor.editMode && !polygonEditor.moveMode && Cesium.defined(floatingPoint)) {
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
        if (polygonEditor.editMode || polygonEditor.moveMode) return;
        
        if (drawingMode !== "none") {
            const ray = viewer.camera.getPickRay(event.position);
            const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
            
            if (Cesium.defined(earthPosition)) {
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
        const handled = polygonEditor.handleCtrlClick(event);
        
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
        polygonEditor.handleAltClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.ALT);

    // SHIFT+Click - Start moving polygon
    handler.setInputAction(function (event) {
        polygonEditor.handleShiftClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.SHIFT);

    // DOUBLE CLICK - Start editing polygon
    handler.setInputAction(function (event) {
        polygonEditor.handleDoubleClick(event);
    }, Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK);

    // RIGHT CLICK - Finish drawing, editing, or moving
    handler.setInputAction(function (event) {
        const editorHandled = polygonEditor.handleRightClick(event);
        
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

const top_right_lat = 5.77465380114684;
const top_left_lon = 53.194528716741345;

function latlonFromXY(xMeters, yMeters) {
    const metersPerDegLat = 111320.0;
    const newLat = top_right_lat + (xMeters / metersPerDegLat);
    const latRad = newLat * Math.PI / 180.0;
    const metersPerDegLon = 111320.0 * Math.cos(latRad);
    const newLon = top_left_lon + (yMeters / (metersPerDegLon || 1e-9));
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
        position: Cesium.Cartesian3.fromDegrees(cords.lat, cords.lon, height / 2.0),
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
    entity.position = Cesium.Cartesian3.fromDegrees(cords.lat, cords.lon, entity.box.dimensions._value.z);
}

var _polygon = 1;

function createPolygonFromXYs(xyArray, color) {
    var degreeArray = [];
    xyArray.forEach(element => {
        const cords = latlonFromXY(element[0], element[1]);
        degreeArray.push(cords.lat);
        degreeArray.push(cords.lon);
    });
}

function createModel(url, position, height) {
    const full_position = Cesium.Cartesian3.fromDegrees(
        position.lat,
        position.lon,
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
    viewer.trackedEntity = entity;
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