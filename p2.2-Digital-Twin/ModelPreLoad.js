// Store preloaded Model primitives
const modelCache = {};
const preloadPromises = {};

// Preload models in this method
// Use ID's to reference them later
const Folder = "Models";
function preloadModels() {
    preloadModel("man", "Cesium_Man.glb", {
        scale: 1.0,
        buildType: "nature"
    });
    preloadModel("building", "strange_building.glb", {
        scale: 3,
        buildType: "house"
    });
    preloadModel("tree", "tree.glb", {
        scale: 0.65,
        buildType: "nature"
    });
}

// Returns all model id's that are already pre-loaded and ready for use
function getAllModelIDs() {
    return Object.keys(modelCache);
}




// In general: this script doesn't work very effectievely
// but it does help slightly and allows easy id's per model
// sooo.... ¯\_(ツ)_/¯


function preloadModel(key, uri, options = {}) {
    if (preloadPromises[key]) return preloadPromises[key];

    console.log(`./${Folder}/${uri}`);
    
    // Default options
    const defaultOptions = {
        scale: 1.0,
        buildType: "DEFAULT"
    };
    
    const config = { ...defaultOptions, ...options };
    
    preloadPromises[key] = Cesium.Model.fromGltfAsync({
        url: `./${Folder}/${uri}`,
        modelMatrix: Cesium.Matrix4.IDENTITY,
        maximumScale: config.scale
    }).then(model => {
        model.show = false; // hide preload instance
        viewer.scene.primitives.add(model);
        modelCache[key] = { 
            model, 
            uri,
            scale: config.scale,
            buildType: config.buildType
        };
        console.log(`Model '${key}' preloaded with scale ${config.scale} and type '${config.buildType}'!`);
        return model;
    });
    return preloadPromises[key];
}


// Spawn model from cache
async function spawnModel(key, position, height = 0, rotationDegrees = 0, overrideOptions = {}) {
    await preloadPromises[key]; // ensure preloaded
    
    // Get cached config and allow overrides
    const cachedConfig = modelCache[key];
    const scale = overrideOptions.scale !== undefined ? overrideOptions.scale : cachedConfig.scale;
    const buildType = overrideOptions.buildType !== undefined ? overrideOptions.buildType : cachedConfig.buildType;
    
    const pos = Cesium.Cartesian3.fromDegrees(position.lon, position.lat, height);
    
    // Convert rotation to radians for heading
    const heading = Cesium.Math.toRadians(rotationDegrees);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    const clone = await Cesium.Model.fromGltfAsync({
        url: `./${Folder}/${cachedConfig.uri}`,
        modelMatrix: Cesium.Matrix4.fromTranslationQuaternionRotationScale(
            pos,
            orientation,
            new Cesium.Cartesian3(scale, scale, scale)
        ),
        maximumScale: scale,
        asynchronous: true,
        allowPicking: true,
        deferAnimation: true
    });
    
    // Store metadata for editing
    clone.modelKey = key;
    clone.modelRotation = rotationDegrees;
    clone.modelPosition = position;
    clone.modelHeight = height;
    clone.modelScale = scale;
    clone.buildType = buildType;
    clone.isEditableModel = true;
    
    viewer.scene.primitives.add(clone);
    console.log(`Spawned ${key} at rotation ${rotationDegrees}° with scale ${scale} and type '${buildType}'`);
    return clone;
}

// Helper function to update a spawned model's scale
function updateModelScale(model, newScale) {
    if (!model.isEditableModel) return;
    
    const pos = Cesium.Cartesian3.fromDegrees(
        model.modelPosition.lon, 
        model.modelPosition.lat, 
        model.modelHeight
    );
    
    const heading = Cesium.Math.toRadians(model.modelRotation);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    model.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
        pos,
        orientation,
        new Cesium.Cartesian3(newScale, newScale, newScale)
    );
    
    model.modelScale = newScale;
    console.log(`Updated scale to ${newScale}`);
}

// Helper function to update a spawned model's buildType
function updateModelType(model, newType) {
    if (!model.isEditableModel) return;
    
    model.buildType = newType;
    console.log(`Updated buildType to '${newType}'`);
    
    // If you want to apply color from buildTypes:
    if (window.getTypeProperty) {
        const typeColor = getTypeProperty(newType, 'color');
        if (typeColor) {
            model.color = typeColor;
        }
    }
}