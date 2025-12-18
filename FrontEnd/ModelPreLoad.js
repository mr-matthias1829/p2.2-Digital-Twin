const modelCache = {};
const modelOrder = [];
const preloadPromises = {};
let preloadAllPromise = null;

// Preload models in this method
// Use ID's to reference them later
const Folder = "Models";
async function preloadModels() {

    const models = [
        ["man", "Cesium_Man.glb", { scale: 1.0, buildType: "nature" }],
        ["building", "strange_building.glb", { scale: 3, buildType: "detached_house" }],
        ["tree", "tree.glb", { scale: 0.65, buildType: "nature" }],
        ["tree2", "Tree2.glb", { scale: 0.65, buildType: "nature" }],
        ["lamp", "Lamp.glb", { scale: 0.45, buildType: "road" }],
        ["bush", "Bush.glb", { scale: 0.37, buildType: "nature" }]
    ];

    // Record order exactly as written
    for (const [key] of models) {
        if (!modelOrder.includes(key)) {
            modelOrder.push(key);
        }
    }

    // Create the shared promise once per model
    if (!preloadAllPromise) {
        preloadAllPromise = Promise.all(
            models.map(([key, uri, options]) =>
                preloadModel(key, uri, options)
            )
        ).then(() => {
            console.log("✓ All models preloaded");
        });
    }

    return preloadAllPromise;
}

// This function is like... used in one case
// Only used for a small bug fix in the code currently
async function getAllModelIDsAsync() {
    if (preloadAllPromise) {
        await preloadAllPromise;
    }
    return modelOrder.slice();
}

// Returns all model id's that are already pre-loaded and ready for use
function getAllModelIDs() {
    return modelOrder.filter(key => key in modelCache);
}


// Preload a model with configuration
// Options is a dictionary to prevent too many arguments (is also optional, but very recommended)
function preloadModel(key, uri, options = {}) {
    if (preloadPromises[key]) return preloadPromises[key];

    console.log(`Preloading: ./${Folder}/${uri}`);
    
    // Default options
    const defaultOptions = {
        scale: 1.0,
        buildType: "DEFAULT"
        // Add more options here if any new ones are added
    };
    
    const config = { ...defaultOptions, ...options };
    
    preloadPromises[key] = Cesium.Model.fromGltfAsync({
        url: `./${Folder}/${uri}`,
        modelMatrix: Cesium.Matrix4.IDENTITY,
        maximumScale: config.scale
    }).then(model => {
        model.show = false; // hide preload instance
        viewer.scene.primitives.add(model);
        
        // Store the cached configuration
        modelCache[key] = { 
            model, 
            uri,
            scale: config.scale,
            buildType: config.buildType
        };
        
        console.log(`✓ Model '${key}' preloaded (scale: ${config.scale}, type: '${config.buildType}')`);
        return model;
    }).catch(err => {
        console.error(`✗ Failed to preload model '${key}':`, err);
        throw err;
    });
    
    return preloadPromises[key];
}

// Spawn model from cache
async function spawnModel(key, position, height = 0, rotationDegrees = 0, overrideOptions = {}) {
    // Ensure the model is preloaded
    await preloadPromises[key];
    
    if (!modelCache[key]) {
        console.error(`Model '${key}' not found in cache!`);
        return null;
    }
    
    // Get cached config and allow overrides
    const cachedConfig = modelCache[key];
    const scale = overrideOptions.scale !== undefined ? overrideOptions.scale : cachedConfig.scale;
    const buildType = overrideOptions.buildType !== undefined ? overrideOptions.buildType : cachedConfig.buildType;
    
    // Create position
    const pos = Cesium.Cartesian3.fromDegrees(position.lon, position.lat, height);
    
    // Convert rotation to radians for heading
    const heading = Cesium.Math.toRadians(rotationDegrees);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    // Create the model instance
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
    clone.isEditableModel = true;
    
    // Goes through to TypeData.js
    setEntityType(clone, buildType);
    
    viewer.scene.primitives.add(clone);
    console.log(`✓ Spawned '${key}' at ${rotationDegrees}° (scale: ${scale}, type: '${buildType}')`);
    
    return clone;
}

// Update a spawned model's position
function updateModelPosition(model, newPosition, newHeight) {
    if (!model.isEditableModel) {
        console.warn("Cannot update position: not an editable model");
        return;
    }
    
    model.modelPosition = newPosition;
    model.modelHeight = newHeight;
    
    const pos = Cesium.Cartesian3.fromDegrees(
        newPosition.lon, 
        newPosition.lat, 
        newHeight
    );
    
    const heading = Cesium.Math.toRadians(model.modelRotation);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    model.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
        pos,
        orientation,
        new Cesium.Cartesian3(model.modelScale, model.modelScale, model.modelScale)
    );
    
    console.log(`Updated position to (${newPosition.lon}, ${newPosition.lat}, ${newHeight})`);
}

// Update a spawned model's rotation
function updateModelRotation(model, newRotationDegrees) {
    if (!model.isEditableModel) {
        console.warn("Cannot update rotation: not an editable model");
        return;
    }
    
    model.modelRotation = newRotationDegrees;
    
    const pos = Cesium.Cartesian3.fromDegrees(
        model.modelPosition.lon, 
        model.modelPosition.lat, 
        model.modelHeight
    );
    
    const heading = Cesium.Math.toRadians(newRotationDegrees);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    model.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
        pos,
        orientation,
        new Cesium.Cartesian3(model.modelScale, model.modelScale, model.modelScale)
    );
    
    console.log(`Updated rotation to ${newRotationDegrees}°`);
}

// Updating model scale
function updateModelScale(model, newScale) {
    if (!model.isEditableModel) {
        console.warn("Cannot update scale: not an editable model");
        return;
    }
    
    model.modelScale = newScale;
    
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
    
    console.log(`Updated scale to ${newScale}`);
}

// Helper function to update buildType of a already existing model
function updateModelType(model, newType) {
    if (!model.isEditableModel) {
        console.warn("Cannot update type: not an editable model");
        return;
    }
    
    // Goes through to TypeData.js
    setEntityType(model, newType);
    console.log(`Updated buildType to '${newType}'`);
}

function getModelInfo(model) {
    if (!model.isEditableModel) {
        return null;
    }
    
    return {
        key: model.modelKey,
        position: model.modelPosition,
        height: model.modelHeight,
        rotation: model.modelRotation,
        scale: model.modelScale,
        buildType: model.buildType || "DEFAULT"
    };
}

// Expose functions globally
window.preloadModels = preloadModels;
window.preloadModel = preloadModel;
window.spawnModel = spawnModel;
window.getAllModelIDs = getAllModelIDs;
window.updateModelPosition = updateModelPosition;
window.updateModelRotation = updateModelRotation;
window.updateModelScale = updateModelScale;
window.updateModelType = updateModelType;
window.getModelInfo = getModelInfo;