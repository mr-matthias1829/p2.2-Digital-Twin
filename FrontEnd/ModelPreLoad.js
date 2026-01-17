/**
 * ModelPreLoad.js - 3D model loading and management system
 * 
 * Handles preloading, caching, and spawning of 3D models
 * Manages model configurations (scale, type) and provides editing utilities
 * 
 * @module ModelLoader
 * @requires Cesium
 * @requires TypeData.js (via setEntityType)
 */

/** @type {Object.<string, {model: Cesium.Model, uri: string, scale: number, buildType: string}>} */
const modelCache = {};

/** @type {string[]} Maintains original loading order of models */
const modelOrder = [];

/** @type {Object.<string, Promise>} Tracks preload promises to prevent duplicates */
const preloadPromises = {};

/** @type {Promise|null} Global promise for all model preloading */
let preloadAllPromise = null;

// Preload models in this method
// Use ID's to reference them later
const Folder = "Models";

/**
 * Preloads all application models asynchronously
 * Models are cached for instant spawning later (avoids loading delays during gameplay)
 * 
 * Preloading happens once at application startup and stores models in memory.
 * This improves user experience by eliminating loading delays when placing models.
 * 
 * @async
 * @function preloadModels
 * @returns {Promise<void>} Resolves when all models are loaded and cached
 * 
 * @example
 * await preloadModels();
 * // Now models can be spawned instantly
 * spawnModel('man', {lon: 5.79, lat: 53.19});
 * spawnModel('tree', {lon: 5.79, lat: 53.19});
 * // The method only needs to be called once - models stay cached until page reload
 */
async function preloadModels() {
    // Define all models to preload
    // Format: [id, file name, {scale, buildtype}]
    const models = [
        // The id is used later to fetch the model, also known as the key
        // The file name is used to find the model in the Models folder
        // Scale and buildtype are properties of the model
        ["man", "Cesium_Man.glb", { scale: 1.0, buildType: "nature" }],
        ["building", "strange_building.glb", { scale: 3, buildType: "detached_house" }],
        ["tree", "tree.glb", { scale: 0.65, buildType: "nature" }],
        ["tree2", "Tree2.glb", { scale: 0.65, buildType: "nature" }],
        ["tree3", "Tree3.glb", { scale: 0.80, buildType: "nature" }],
        ["lamp", "Lamp.glb", { scale: 0.45, buildType: "road" }],
        ["bench", "Bench.glb", { scale: 0.5, buildType: "road" }],
        ["bush", "Bush.glb", { scale: 0.37, buildType: "nature" }]
        // Some models spawn in oversized. Scales stated here are set to get them to a reasonable size
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

/**
 * Returns all model IDs (waits for preloading if needed)
 * @async
 * @function getAllModelIDsAsync
 * @returns {Promise<string[]>} Array of model IDs in loading order
 */
async function getAllModelIDsAsync() {
    if (preloadAllPromise) {
        await preloadAllPromise;
    }
    return modelOrder.slice();
}

/**
 * Returns IDs of already-loaded models
 * @function getAllModelIDs
 * @returns {string[]} Array of preloaded model IDs
 */
function getAllModelIDs() {
    return modelOrder.filter(key => key in modelCache);
}

/**
 * Preloads a single model with configuration
 * @async
 * @function preloadModel
 * @param {string} key - Unique identifier for the model (also known as the id)
 * @param {string} uri - GLB/GLTF file name
 * @param {Object} [options={}] - Model configuration
 * @param {number} [options.scale=1.0] - Default scale factor
 * @param {string} [options.buildType="DEFAULT"] - Building type category
 * @returns {Promise<Cesium.Model>} The loaded model primitive
 */
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

/**
 * Spawns a preloaded model at the specified location
 * @async
 * @function spawnModel
 * @param {string} key - Model identifier from preload
 * @param {Object} position - Geographic position
 * @param {number} position.lon - Longitude in degrees
 * @param {number} position.lat - Latitude in degrees
 * @param {number} [height=0] - Height in meters
 * @param {number} [rotationDegrees=0] - Rotation in degrees
 * @param {Object} [overrideOptions={}] - Override cached configuration
 * @param {number} [overrideOptions.scale] - Override scale
 * @param {string} [overrideOptions.buildType] - Override building type
 * @returns {Promise<Cesium.Model|null>} The spawned model or null if failed
 */
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

/**
 * Updates position of an editable model
 * @function updateModelPosition
 * @param {Cesium.Model} model - Model primitive with isEditableModel flag
 * @param {Object} newPosition - New geographic position
 * @param {number} newPosition.lon - Longitude in degrees
 * @param {number} newPosition.lat - Latitude in degrees
 * @param {number} newHeight - New height in meters
 */
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
    
    const heading = Cesium.Math.toDegrees(model.modelRotation);
    const hpr = new Cesium.HeadingPitchRoll(heading, 0, 0);
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(pos, hpr);
    
    model.modelMatrix = Cesium.Matrix4.fromTranslationQuaternionRotationScale(
        pos,
        orientation,
        new Cesium.Cartesian3(model.modelScale, model.modelScale, model.modelScale)
    );
    
    console.log(`Updated position to (${newPosition.lon}, ${newPosition.lat}, ${newHeight})`);
}

/**
 * Updates rotation of an editable model
 * @function updateModelRotation
 * @param {Cesium.Model} model - Model primitive with isEditableModel flag
 * @param {number} newRotationDegrees - New rotation in degrees
 */
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

/**
 * Updates scale of an editable model
 * @function updateModelScale
 * @param {Cesium.Model} model - Model primitive with isEditableModel flag
 * @param {number} newScale - New scale factor
 */
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

/**
 * Updates building type of an editable model
 * @function updateModelType
 * @param {Cesium.Model} model - Model primitive with isEditableModel flag
 * @param {string} newType - New building type identifier
 */
function updateModelType(model, newType) {
    if (!model.isEditableModel) {
        console.warn("Cannot update type: not an editable model");
        return;
    }
    
    // Goes through to TypeData.js
    setEntityType(model, newType);
    console.log(`Updated buildType to '${newType}'`);
}

/**
 * Gets metadata about an editable model
 * @function getModelInfo
 * @param {Cesium.Model} model - Model primitive with isEditableModel flag
 * @returns {Object|null} Model information or null if not editable
 * @property {string} key - Model identifier
 * @property {Object} position - Geographic position
 * @property {number} position.lon - Longitude
 * @property {number} position.lat - Latitude
 * @property {number} height - Height in meters
 * @property {number} rotation - Rotation in degrees
 * @property {number} scale - Scale factor
 * @property {string} buildType - Building type category
 */
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