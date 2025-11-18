window.onload = setup;

var measure;
var viewer;

function setup() {
    const west = 5.798212900532118;
    const south = 53.19304584690279;
    const east = 5.798212900532118;
    const north = 53.19304584690279;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0.0005;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;

    //Verwijderd Cesium Ion credit
    //Als je hun systemen niet gebruikt kun je dit verwijderen
    //viewer.creditDisplay.removeStaticCredit(Cesium.CreditDisplay._cesiumCredit);

    const osm = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/'
    });

    viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayerPicker: false,
        imageryProvider: false,
        infoBox: false,
        selectionIndicator: false,
        shadows: true,
        shouldAnimate: true,
    });

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(osm);

    //Improves tile quality
    viewer.scene.globe.maximumScreenSpaceError = 1;

    // console.log(viewer.scene.globe.maximumScreenSpaceError);

    const condo1 = createBox(200, 300, 50, 40, 70, 0, "building_tex.jpg");
    measure = createBox(0, 0, 3, 3, 30, 0, Cesium.Color.RED);

    var carX = 230;
    var carY = 78;

    const car = createBox(carX, carY, 5, 2, 1.5, 0, Cesium.Color.BLUE);

    function moveCar() {
        carX++;
        carY += 0.35;
        moveEntity(car, carX, carY);
        setTimeout(() => {
            moveCar();
        }, 150);
    }

    moveCar();

    createPolygonFromXYs([
        [250, 72], //linksonder-onder
        [230, 85], //linksonder-boven
        [510, 185], //midden-links-boven
        [520, 175] //midden-links-onder
    ], Cesium.Color.WHITE);

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

    createModel("strange_building.glb", latlonFromXY(240, 70), 0);

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

let drawingMode = "polygon"; //Deze kun je aanpassen als je een GUI-element hiervoor maakt.

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
        shape = viewer.entities.add({
            polygon: {
                hierarchy: positionData,
                material: new Cesium.ColorMaterialProperty(
                    Cesium.Color.RED.withAlpha(0.7),
                ),
            },
        });
    }
    return shape;
}

function setupInputActions() {
    viewer.cesiumWidget.screenSpaceEventHandler.removeInputAction(
        Cesium.ScreenSpaceEventType.LEFT_DOUBLE_CLICK,
    );

    //Deze variabelen worden binnen deze functie gedeclareerd. Dit is vreemd, want je zou zeggen dat
    //wanneer de functie voorbij is, de variabelen uit het geheugen worden verwijderd. Dit is in dit
    //geval niet zo, omdat de variabelen worden gebruikt in de inline functies hieronder. Daardoor
    //blijven ze bestaan. Op zich is dit handig, omdat de variabelen nu niet vanuit de globale
    //scope bereikbaar zijn. Wel moet je letten op leesbaarheid. Soms is het handiger om de variabelen
    //wel globaal te zetten.
    let activeShapePoints = [];
    let activeShape;
    let floatingPoint;

    const handler = new Cesium.ScreenSpaceEventHandler(viewer.canvas);

    handler.setInputAction(function (event) {
        // We use `viewer.scene.globe.pick here instead of `viewer.camera.pickEllipsoid` so that
        // we get the correct point when mousing over terrain.
        const ray = viewer.camera.getPickRay(event.position);
        const earthPosition = viewer.scene.globe.pick(ray, viewer.scene);
        // `earthPosition` will be undefined if our mouse is not over the globe.
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
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK);

    // Set an action for when the left mouse button is clicked while holding the CTRL key
    handler.setInputAction(function (event) {
        var pickedObject = viewer.scene.pick(event.position); // For hover effect
        if (Cesium.defined(pickedObject)) {
            const entity = viewer.entities.getById(pickedObject.id.id);
            // entity.polygon.material.color = Cesium.Color.YELLOW;
            create3DObject(entity, 20);
            console.log(entity);
            // Optionally, highlight the polygon or show any other UI feedback
        }
    }, Cesium.ScreenSpaceEventType.LEFT_CLICK, Cesium.KeyboardEventModifier.CTRL);

    handler.setInputAction(function (event) {
        if (Cesium.defined(floatingPoint)) {
            const ray = viewer.camera.getPickRay(event.endPosition);
            const newPosition = viewer.scene.globe.pick(ray, viewer.scene);
            if (Cesium.defined(newPosition)) {
                floatingPoint.position.setValue(newPosition);
                activeShapePoints.pop();
                activeShapePoints.push(newPosition);
            }
        }
    }, Cesium.ScreenSpaceEventType.MOUSE_MOVE);

    // Redraw the shape so it's not dynamic and remove the dynamic shape.
    function terminateShape() {
        activeShapePoints.pop();
        drawShape(activeShapePoints);
        viewer.entities.remove(floatingPoint);
        viewer.entities.remove(activeShape);
        floatingPoint = undefined;
        activeShape = undefined;
        activeShapePoints = [];
    }
    handler.setInputAction(function (event) {
        terminateShape();
    }, Cesium.ScreenSpaceEventType.RIGHT_CLICK);
}

// x = verplaatsing in meters noord (+) / zuid (-)
// y = verplaatsing in meters oost (+) / west (-)
// top_right_lat = referentie-latitude (graden)
// top_left_lon = referentie-longitude (graden)

const top_right_lat = 5.77465380114684;
const top_left_lon = 53.194528716741345;

function latlonFromXY(xMeters, yMeters) {
    // gemiddelde meters per graad latitude ~111320
    const metersPerDegLat = 111320.0;

    // bereken nieuwe latitude (in graden)
    const newLat = top_right_lat + (xMeters / metersPerDegLat);

    // meters per graad longitude = ~111320 * cos(latitude_in_radians)
    const latRad = newLat * Math.PI / 180.0;
    const metersPerDegLon = 111320.0 * Math.cos(latRad);

    // voorkom deling door 0 vlak bij polen
    const newLon = top_left_lon + (yMeters / (metersPerDegLon || 1e-9));

    return { lat: newLat, lon: newLon };
}

var _box = 1;

//Color kan ook een pad zijn naar een afbeelding
//Let wel op dat afbeeldingen niet via UV-mapping gaan, en dat de afbeelding
//dus op elk vlak herhaald zal worden. Dit ziet er niet super uit.
//De oplossing is om een eigen model te maken met textures. Dit kan vrij
//simpel via Blender. Zie de volgende tutorial: https://www.youtube.com/watch?v=mURA2g1rOSc
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
            heightReference: Cesium.HeightReference.CLAMP_TO_GROUND //IMPORTANT
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

    const redPolygon = viewer.entities.add({
        name: "Polygon_" + _polygon++,
        polygon: {
            hierarchy: Cesium.Cartesian3.fromDegreesArray(degreeArray),
            material: color,
        },
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

// Function to convert Cartesian coordinates to latitude and longitude
function cartesianToLatLon(cartesianPosition) {
    const cartographic = Cesium.Cartographic.fromCartesian(cartesianPosition);
    // Convert radians to degrees
    const lon = cartographic.longitude;
    const lat = cartographic.latitude;

    return { lat, lon };
}

// Define grid size
const gridSize = 1.1; // Adjust this to your desired grid size

// Function to snap coordinates to the grid
function snapToGrid(position) {
    const snappedX = Math.round(position.x / gridSize) * gridSize;
    const snappedZ = Math.round(position.z / gridSize) * gridSize;

    return new Cesium.Cartesian3(snappedX, position.y, snappedZ);
}

function handleMouseClick(event) {
    const mousePosition = new Cesium.Cartesian2(event.clientX, event.clientY);
    //const ray = viewer.camera.getPickRay(mousePosition);
    const hitPosition = viewer.scene.pickPosition(mousePosition);

    // Check if the ray intersects the globe
    if (hitPosition) {
        var snappedPosition = snapToGrid(hitPosition);

        createBoxXYZ(snappedPosition, 1, 1, 1, 0, Cesium.Color.RED);
    }
}

function create3DObject(basePolygon, height) {
    if (basePolygon.polygon.extrudedHeight == undefined) {
        basePolygon.polygon.extrudedHeight = height;
    }

    //Deze extrudedHeight komt heel goed van pas
    basePolygon.polygon.extrudedHeight *= 1.5;
}