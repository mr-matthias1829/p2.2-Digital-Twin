/**
 * mainInit.js - Initializes the Cesium viewer and sets up the application
 * 
 * This is the PRIMARY initialization function that runs on page load.
 * It handles the complete application startup sequence:
 * 1. Cesium viewer creation and configuration
 * 2. Base map setup (OpenStreetMap tiles)
 * 3. Spoordok boundary polygon creation (the main area boundary)
 * 4. Building type loading from backend API
 * 5. Polygon and corridor synchronization from database
 * 6. Input handlers and editor setup
 * 7. Ollama analyzer initialization (AI features)
 * 
 * Split from main.js to keep initialization logic separate from drawing/editing logic
 * 
 * @function setup
 * @global
 * @async
 * @requires Cesium - 3D globe library
 * @requires ModelPreLoad.js - Preloads 3D models (trees, benches, etc.)
 * @requires ObjectEditor.js - Enables polygon/model editing
 * @requires OllamaAnalyzer.js - AI analysis features
 * @requires polygonAPI.js - Backend communication for polygon data
 * 
 * @example
 * // Called automatically on DOMContentLoaded in main.js
 * // Can also be called manually for re-initialization (though unused for now)
 * setup();
 * 
 * @sideeffects
 * - Creates global viewer, Editor, Server, ollamaAnalyzer objects
 * - Modifies Cesium.Camera defaults for initial view
 * - Sets up screen space event handlers for user interaction
 * - Clears existing polygons (if any) except Spoordok
 * - Starts polygon loading from database
 * 
 * @throws {Error} If Cesium fails to load or viewer creation fails
 * @throws {Error} If OpenStreetMap tiles are unavailable
 */
function setup() {
    // Start loading all 3D models in the background
    // This ensures models are ready when user switches to Model mode
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
    
    // Create the Spoordok boundary polygon
    // This is the main area boundary that constrains where users can place buildings
    // The coordinates define the actual Spoordok area in Groningen, Netherlands
    const dokPolygon = viewer.entities.add({
        name: "Spoordok",  // Used for identification
        polygon: {
            // Define boundary vertices in counter-clockwise order
            // Coordinates are [longitude, latitude] pairs in degrees
            hierarchy: Cesium.Cartesian3.fromDegreesArray([
                5.787759928698073, 53.197831145908,    // Northwest corner
                5.789123554275904, 53.19763995957844,  // Northeast corner
                5.788934967759822, 53.19602353198474,  // East side
                5.776937964005922, 53.194528716741345, // Southeast corner
                5.774587885853288, 53.196901277127026, // Southwest corner
                5.774703939093954, 53.1976225789762,   // West side
                5.786410809746187, 53.19704032421097,  // North side
            ]),
            material: Cesium.Color.LIGHTGRAY,  // Light gray fill
        },
        properties: {
            isSpoordok: true  // Mark as protected (cannot be edited or deleted)
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
        
        // THEN: Load polygons and corridors from database
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
        
        // Load corridors from database
        if (typeof corridorAPI !== 'undefined') {
            corridorAPI.loadAllCorridors(viewer)
                .then(() => {
                    console.log('\u2713 Corridors loaded from database');
                })
                .catch(err => console.error('Failed to load corridors:', err));
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