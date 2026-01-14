/**
 * mainInit.js - Initializes the Cesium viewer and sets up the application
 * 
 * This function handles:
 * 1. Cesium viewer creation and configuration
 * 2. Base map setup (OpenStreetMap)
 * 3. Spoordok boundary polygon creation
 * 4. Building type loading and polygon synchronization
 * 5. Input handlers and editor setup
 * 6. Ollama analyzer initialization
 * 
 * Split from main.js to keep initialization logic separate
 * 
 * @function setup
 * @global
 * @async
 * @requires Cesium
 * @requires ModelPreLoad.js
 * @requires ObjectEditor.js
 * @requires OllamaAnalyzer.js
 * @requires polygonAPI.js
 * 
 * @example
 * // Called automatically on DOMContentLoaded of main.js
 * // Can also be called manually for re-initialization, though unused for now
 * setup();
 * 
 * @sideeffects
 * - Creates global viewer, Editor, Server, ollamaAnalyzer objects
 * - Modifies Cesium.Camera defaults
 * - Sets up screen space event handlers
 * - Clears existing polygons (if any, somehow) except Spoordok
 * - Starts polygon loading from database
 * 
 * @throws {Error} If Cesium fails to load or viewer creation fails
 * @throws {Error} If OpenStreetMap tiles are unavailable
 */
function setup() {
    preloadModels();
    
    const west = 5.798212900532118;
    const south = 53.19304584690279;
    const east = 5.798212900532118;
    const north = 53.19304584690279;

    var rectangle = Cesium.Rectangle.fromDegrees(west, south, east, north);

    Cesium.Camera.DEFAULT_VIEW_FACTOR = 0.0005;
    Cesium.Camera.DEFAULT_VIEW_RECTANGLE = rectangle;

    const osm = new Cesium.OpenStreetMapImageryProvider({
        url: 'https://tile.openstreetmap.org/',
        maximumLevel: 19,
    });

    viewer = new Cesium.Viewer("cesiumContainer", {
        baseLayerPicker: false,
        imageryProvider: false,
        infoBox: false,
        selectionIndicator: false,
        shadows: false,
        shouldAnimate: false,
    });

    viewer.imageryLayers.removeAll();
    viewer.imageryLayers.addImageryProvider(osm);

    viewer.scene.globe.maximumScreenSpaceError = 1;
    
    const dokPolygon = viewer.entities.add({
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
        properties: {
            isSpoordok: true
        },
    });

    // Load building types from API
    loadBuildingTypesFromAPI().then(() => {
        console.log('Building types loaded, ready for use');
        
        // FIRST: Remove ALL user-created polygons (keep only protected Spoordok)
        const polygonsToRemove = [];
        viewer.entities.values.forEach(entity => {
            if (entity.polygon && !entity.properties?.isSpoordok) {
                polygonsToRemove.push(entity);
            }
        });
        polygonsToRemove.forEach(entity => viewer.entities.remove(entity));
        console.log(`Cleared ${polygonsToRemove.length} polygons before database load`);
        
        // THEN: Load polygons from database
        if (typeof polygonAPI !== 'undefined') {
            polygonAPI.loadAllPolygons(viewer)
                .then(() => {
                    console.log('\u2713 Polygons loaded from database');
                    // Update occupation stats after loading polygons
                    if (typeof updateOccupationStats === 'function') {
                        setTimeout(() => updateOccupationStats(), 500);
                    }
                })
                .catch(err => console.error('Failed to load polygons:', err));
        }
    });

    setupInputActions();

    
    ollamaAnalyzer = new OllamaAnalyzer(viewer, {
        ollamaUrl: 'http://localhost:11434',
        model: 'gemma3:4b',
        interval: 30000,
        prompt: "You are a citizen giving an opinion about the environment. This image is your Point of view. Describe what you see and give your opinion about it in 2-3 sentences. Dont do startup talk like: 'here is a perspective of cesium man.' after finishing those 2-3 sentences give a final score of 1-10 with a last small explanation of 1-2 sentences (decimal scores are allowed but only in .5's). Also dont prepare that you're going to talk just talk.",
    });

    // TODO: maybe get rid of these? they were used back when the ai was console only, but that changed recently? perfably move them out of console since these commands do still work
    console.log('Ollama analyzer ready! Use these commands:');
    console.log('  ollamaAnalyzer.start()  - Start analysis');
    console.log('  ollamaAnalyzer.stop()   - Stop analysis');
    console.log('  ollamaAnalyzer.analyzeWithOllama() - Run once');
    console.log('  ollamaAnalyzer.setInterval(ms) - Change interval');
    console.log('  ollamaAnalyzer.listCesiumMen() - List all Cesium Men on the map');
    console.log('  ollamaAnalyzer.selectCesiumMan(id) - Select Cesium Man by ID and track it');
    console.log('  ollamaAnalyzer.trackSelectedMan() - Tracks selected Cesium Man');
    console.log('  ollamaAnalyzer.stopTracking() = Stops tracking selected Cesium Man');
    

    // Create object editor
    Editor = new ObjectEditor(viewer);
    // Create server poller
    Server = new serverPoller();
}


    window.setup = setup;