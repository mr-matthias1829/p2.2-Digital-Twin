// Define all types with their properties
const buildTypes = {
    DEFAULT: {
        id: "DEFAULT", // used if a type is requested but obj has no type (or fallback for non-existing property on a type)
                       // This type is filtered and not sent when prompted for all types
                       // NOTE: type 'none' IS A VALID TYPE NOT STATED IN THIS LIST AND IS NOT THIS TYPE!

        color: Cesium.Color.WHITE, // Color of the polygon
        cost: 0, // In euro, for each cubical meter
        income: 0, // % of cost as financial income per unit
        people: 0, // Amount of home owners or workers per unit
        livability: 5, // Score for livability on a scale of 1 to 10
    },
    poly: {
        id: "poly", // The testing value for stuff, should be removed later
        color: Cesium.Color.GRAY,
        // Future properties can go here: (note: they do not automatically do something)
        // height: 10,
        // texture: "concrete.png",
        // cost: 0.04,
        // etc.
    },

    nature: {
        id: "nature",
        color: Cesium.Color.GREEN,
        cost: 150,
        income: 0,
        livability: 10,
    },
    water: {
        id: "water",
        color: Cesium.Color.fromCssColorString("#1E88E5"), // Bright blue (different from commercial)
        cost: 300,
        income: 0,
        livability: 7,
    },
    road: {
        id: "road",
        color: Cesium.Color.DARKGRAY,
        cost: 100,
        income: 5,
        livability: 8,
    },
    parking: {
        id: "parking space",
        color: Cesium.Color.fromCssColorString("#78909C"), // Blue gray
        cost: 100,
        income: 10,
        livability: 6,
    },
    covered_parking: {
        id: "covered parking space",
        color: Cesium.Color.fromCssColorString("#8D6E63"), // Brown
        cost: 1500,
        income: 15,
        livability: 10,
    },

    detached_house: {
        id: "detached house",
        color: Cesium.Color.fromCssColorString("#E53935"), // Red
        cost: 500,
        income: 12,
        people: 0.005,
        livability: 4,
    },
    town_house: {
        id: "townhouse",
        color: Cesium.Color.fromCssColorString("#FB8C00"), // Deep orange
        cost: 400,
        income: 8,
        people: 0.01,
        livability: 6,
    },
    apartment: {
        id: "apartment",
        color: Cesium.Color.fromCssColorString("#8E24AA"), // Purple
        cost: 300,
        income: 12,
        people: 0.006,
        livability: 5,
    },
    commercial_building: {
        id: "commercial building",
        color: Cesium.Color.fromCssColorString("#039BE5"), // Light blue
        cost: 200,
        income: 15,
        people: 0.018,
        livability: 2,
    },
    // Add more types here easily!
};

// Helper function to get all existing type IDs (exlcuding default)
function getAllTypeIds() {
    return Object.keys(buildTypes).filter(key => key.toUpperCase() !== "DEFAULT");
}

// Helper function to add a new type dynamically
function addBuildType(id, properties) {
    buildTypes[id] = {
        id: id,
        ...properties
    };
}

// Function to fetch a property of a type
// Handy because a type might not have a certain value defined, after which it will fallback to the default type
function getTypeProperty(typeId, propertyName) {
    const type = buildTypes[typeId];

    // Case 1: Type exists AND property exists
    if (type && type[propertyName] !== undefined) {
        return type[propertyName];
    }

    // Case 1.5: Type is none, fall back to default automatically
    if (typeId === "none") {
        const fallback = buildTypes.DEFAULT[propertyName];
        if (fallback !== undefined) {
            return fallback;
        }
    }

    // Case 2: Type exists but the property is missing
    if (type) {
        const fallback = buildTypes.DEFAULT[propertyName];
        if (fallback !== undefined) {
            console.warn(
                `Type "${typeId}" is missing property "${propertyName}". Using DEFAULT fallback.`
            );
            return fallback;
        }

        console.warn(
            `Type "${typeId}" is missing property "${propertyName}", and DEFAULT also doesn't define it. Returning null.`
        );
        return null;
    }

    // Case 3: Type does NOT exist at all
    const fallback = buildTypes.DEFAULT[propertyName];
    if (fallback !== undefined) {
        console.warn(
            `Type "${typeId}" does not exist! Using DEFAULT fallback for property "${propertyName}".`
        );
        return fallback;
    }

    console.warn(
        `Type "${typeId}" does not exist AND DEFAULT does not define property "${propertyName}". Returning null.`
    );
    return null;
}

// Get the buildType from an entity's properties
function getEntityType(entity) {
    if (!entity.properties || !entity.properties.buildType) {
        return "DEFAULT";
    }
    
    const buildTypeProp = entity.properties.buildType;
    return (typeof buildTypeProp.getValue === 'function') 
        ? buildTypeProp.getValue() 
        : buildTypeProp;
}

// Set the type on an entity and update visuals
function setEntityType(entity, typeId) {
    // Validate the type exists
    if (!buildTypes[typeId] && typeId !== "none") {
        console.warn(`Type "${typeId}" does not exist. Using DEFAULT.`);
        typeId = "DEFAULT";
    }
    
    // Save the type to the entity's properties
    if (!entity.properties) {
        entity.properties = new Cesium.PropertyBag();
    }
    entity.properties.buildType = typeId;
    
    // Apply the visual updates
    applyTypeToEntity(entity);
}

// Apply type initialization for POLYGONS (modifies entity directly)
function applyTypeInitPolygon(entity) {
    if (!entity.polygon) {
        console.warn("applyTypeInitPolygon called on entity without polygon");
        return;
    }
    
    // Capture the initial color when the function is called
    let initialColor = Cesium.Color.WHITE; // fallback
    
    if (entity.polygon.material) {
        const mat = entity.polygon.material;
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
    
    // Set the dynamic material directly on the entity
    entity.polygon.material = new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
            const type = getEntityType(entity);
            const typeColor = getTypeProperty(type, 'color');
            return typeColor ? typeColor : initialColor;
        }, false)
    );
}

// Apply type initialization for MODELS (modifies entity directly)
function applyTypeInitModel(entity) {
    if (!entity.model) {
        console.warn("applyTypeInitModel called on entity without model");
        return;
    }
    
    // Capture initial values
    let initialColor = Cesium.Color.WHITE;
    let initialUri = null;
    let initialScale = 1.0;
    
    // Try to get existing model properties
    if (entity.model.color) {
        const col = entity.model.color;
        if (col instanceof Cesium.Color) {
            initialColor = col.clone();
        } else if (typeof col.getValue === 'function') {
            initialColor = col.getValue(Cesium.JulianDate.now()).clone();
        }
    }
    if (entity.model.uri && typeof entity.model.uri.getValue === 'function') {
        initialUri = entity.model.uri.getValue(Cesium.JulianDate.now());
    }
    if (entity.model.scale && typeof entity.model.scale === 'number') {
        initialScale = entity.model.scale;
    }
    
    // Set dynamic properties directly on the entity
    entity.model.color = new Cesium.CallbackProperty(() => {
        const type = getEntityType(entity);
        const typeColor = getTypeProperty(type, 'color');
        return typeColor ? typeColor : initialColor;
    }, false);
    
    entity.model.uri = new Cesium.CallbackProperty(() => {
        const type = getEntityType(entity);
        const typeUri = getTypeProperty(type, 'uri');
        return typeUri ? typeUri : initialUri;
    }, false);
    
    entity.model.scale = new Cesium.CallbackProperty(() => {
        const type = getEntityType(entity);
        const typeScale = getTypeProperty(type, 'scale');
        return typeScale !== null ? typeScale : initialScale;
    }, false);
}

// Unified function to apply type initialization to any entity
function applyTypeToEntity(entity) {
    if (entity.polygon) {
        applyTypeInitPolygon(entity);
    }
    
    if (entity.model) {
        applyTypeInitModel(entity);
    }
}

// Expose helper functions globally if needed
window.buildTypes = buildTypes;
window.getTypeProperty = getTypeProperty;
window.getAllTypeIds = getAllTypeIds;
window.addBuildType = addBuildType;
window.getEntityType = getEntityType;
window.setEntityType = setEntityType;
window.applyTypeInitPolygon = applyTypeInitPolygon;
window.applyTypeInitModel = applyTypeInitModel;
window.applyTypeToEntity = applyTypeToEntity;