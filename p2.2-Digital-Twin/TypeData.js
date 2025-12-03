// Define all types with their properties
const buildTypes = {
    poly: {
        id: "poly", // The testing value for stuff, should be removed later
        color: Cesium.Color.GRAY,
        // Future properties can go here: (note: they do not automatically do something)
        // height: 10,
        // texture: "concrete.png",
        // cost: 0.04,
        // etc.
    },
    house: {
        id: "house",
        color: Cesium.Color.PINK,
    },
    nature: {
        id: "nature",
        color: Cesium.Color.GREEN,
    },
    water: {
        id: "water",
        color: Cesium.Color.BLUE,
    },
    road: {
        id: "road",
        color: Cesium.Color.DARKGRAY,
    },
    // Add more types here easily!

    //TODO: maybe add a default type, or default values if a type doesnt have the value defined?
};

// Helper function to get a type's property
function getTypeProperty(typeId, propertyName) {
    if (buildTypes[typeId] && buildTypes[typeId][propertyName] !== undefined) {
        return buildTypes[typeId][propertyName];
    }
    return null;
}

// Helper function to get all existing type IDs
function getAllTypeIds() {
    return Object.keys(buildTypes);
}

// Helper function to add a new type dynamically
function addBuildType(id, properties) {
    buildTypes[id] = {
        id: id,
        ...properties
    };
}

function applyTypeInit(obj) {
    // Capture the initial color when the function is called
    let initialColor = Cesium.Color.WHITE; // fallback
    
    if (obj.polygon && obj.polygon.material) {
        const mat = obj.polygon.material;
        // Try to get the color from the existing material
        if (mat instanceof Cesium.Color) {
            initialColor = mat.clone();
        } else if (mat instanceof Cesium.ColorMaterialProperty) {
            const col = mat.color;
            if (col instanceof Cesium.Color) {
                initialColor = col.clone();
            } else if (typeof col.getValue === 'function') {
                initialColor = col.getValue(Cesium.JulianDate.now()).clone();
            }
        } else if (typeof mat.getValue === 'function') {
            const val = mat.getValue(Cesium.JulianDate.now());
            if (val && val.color) {
                initialColor = val.color.clone();
            }
        }
    }
    
    return new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
            let type = "poly"; // default
            
            if (obj.properties && obj.properties.buildType) {
                const buildTypeProp = obj.properties.buildType;
                type = (typeof buildTypeProp.getValue === 'function') 
                    ? buildTypeProp.getValue() 
                    : buildTypeProp;
            }
            
            // Look up the color from buildTypes
            const typeColor = getTypeProperty(type, 'color');
            return typeColor ? typeColor : initialColor;
        }, false)
    );
}

// Expose helper functions globally if needed
window.buildTypes = buildTypes;
window.getTypeProperty = getTypeProperty;
window.getAllTypeIds = getAllTypeIds;
window.addBuildType = addBuildType;