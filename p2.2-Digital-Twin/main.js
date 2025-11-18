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

    createModel("Cesium_Man.glb", latlonFromXY(220,70), 0);

    createModel("strange_building.glb", latlonFromXY(240,70), 0);
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

    return viewer.entities.add({
        name: "Box_" + _box++,
        position: Cesium.Cartesian3.fromDegrees(cords.lat, cords.lon, height / 2.0),
        box: {
            dimensions: new Cesium.Cartesian3(width, depth, height),
            material: color
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