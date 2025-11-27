// Store preloaded Model primitives
const modelCache = {};
const preloadPromises = {};

function preloadModels() {
    preloadModel("man", "./Cesium_Man.glb");
    preloadModel("building", "./strange_building.glb");
}




function preloadModel(key, uri) {
    if (preloadPromises[key]) return preloadPromises[key];

    preloadPromises[key] = Cesium.Model.fromGltfAsync({
        url: uri,
        modelMatrix: Cesium.Matrix4.IDENTITY,
        minimumPixelSize: 128,
        maximumScale: 1
    }).then(model => {

        model.show = false; // hide preload instance
        viewer.scene.primitives.add(model);

        modelCache[key] = { model, uri };
        console.log(`Model '${key}' preloaded!`);

        return model;
    });

    return preloadPromises[key];
}

// Spawn model from cache
async function spawnModel(key, position, height = 0) {
    await preloadPromises[key]; // ensure preloaded

    const pos = Cesium.Cartesian3.fromDegrees(position.lon, position.lat, height);
    const hpr = Cesium.Transforms.headingPitchRollQuaternion(
        pos,
        new Cesium.HeadingPitchRoll(0, 0, 0)
    );

    const clone = await Cesium.Model.fromGltfAsync({
        url: modelCache[key].uri,     // SAME URI = GPU resources reused
        modelMatrix: Cesium.Matrix4.fromTranslationQuaternionRotationScale(
            pos,
            hpr,
            new Cesium.Cartesian3(1, 1, 1)
        ),
        minimumPixelSize: 128,
        maximumScale: 1,
        asynchronous: true,          // important for performance
        allowPicking: true,
        deferAnimation: true          // no animation pipeline lag
    });

    viewer.scene.primitives.add(clone);
    return clone;
}