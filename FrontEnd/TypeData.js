// Building types object - will be populated from API
// Keep only DEFAULT as fallback
const buildTypes = {
    DEFAULT: {
        id: "DEFAULT", // used if a type is requested but obj has no type (or fallback for non-existing property on a type)
                       // This type is filtered and not sent when prompted for all types
                       // NOTE: type 'none' IS A VALID TYPE NOT STATED IN THIS LIST AND IS NOT THIS TYPE!

        default: 'default',
        color: Cesium.Color.WHITE, // Color of the polygon
        cost: 0, // In euro, for each cubical meter
        income: 0, // % of cost as financial income per unit
        people: 0, // Amount of home owners or workers per unit
        livability: 5, // Score for livability on a scale of 1 to 10
    },
    // All other types are loaded from the database via API
    // See loadBuildingTypesFromAPI() function below
};

// Function to load building types from the API
async function loadBuildingTypesFromAPI() {
    try {
        const response = await fetch('http://localhost:8081/api/data/building-types');
        if (!response.ok) {
            console.warn('Failed to load building types from API, using hardcoded types');
            return false;
        }
        
        const apiTypes = await response.json();
        
        // Convert API types to internal format
        apiTypes.forEach(apiType => {
            // Convert type ID to key format (e.g., "commercial building" -> "commercial_building")
            const key = apiType.typeId.replace(/\s+/g, '_');
            
            // Convert hex color to Cesium.Color
            const color = Cesium.Color.fromCssColorString(apiType.colorHex);
            
            // Add or update the type in buildTypes
            buildTypes[key] = {
                id: apiType.typeId,
                color: color,
                cost: apiType.cost,
                income: apiType.income,
                people: apiType.people,
                livability: apiType.livability
            };
        });
        
        console.log(`✓ Loaded ${apiTypes.length} building types from API`);
        return true;
    } catch (error) {
        console.warn('Error loading building types from API:', error);
        console.log('Using hardcoded building types as fallback');
        return false;
    }
}

// Helper function to get all existing type (no id)
function getAllType() {
    return Object.keys(buildTypes).filter(key => key.toUpperCase() !== "DEFAULT");
}

// Helper function to get all existing type IDs (exlcuding default)
function getAllTypeIds() {
    return Object.values(buildTypes)
        .filter(type => type.id.toUpperCase() !== "DEFAULT")
        .map(type => type.id);
}

// Helper function to add a new type dynamically
function addBuildType(key, id, properties) {
    buildTypes[key] = {
        id: id,
        ...properties
    };
}

// Function to fetch a property of a type
// Handy because a type might not have a certain value defined, after which it will fallback to the default type
function getTypeProperty(key, propertyName) {
    const type = buildTypes[key];

    // Case 1: Type exists AND property exists
    if (type && type[propertyName] !== undefined) {
        return type[propertyName];
    }

    // Case 1.5: Type is none, fall back to default automatically
    if (key === "none") {
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
                `Type "${key}" is missing property "${propertyName}". Using DEFAULT fallback.`
            );
            return fallback;
        }

        console.warn(
            `Type "${key}" is missing property "${propertyName}", and DEFAULT also doesn't define it. Returning null.`
        );
        return null;
    }

    // Case 3: Type does NOT exist at all
    const fallback = buildTypes.DEFAULT[propertyName];
    if (fallback !== undefined) {
        console.warn(
            `Type "${key}" does not exist! Using DEFAULT fallback for property "${propertyName}".`
        );
        return fallback;
    }

    console.warn(
        `Type "${key}" does not exist AND DEFAULT does not define property "${propertyName}". Returning null.`
    );
    return null;
}

// Get the buildType from an entity's properties
// Returns the object key for internal use (e.g., "commercial_building")
function getEntityType(entity) {
    if (!entity.properties || !entity.properties.buildType) {
        return "DEFAULT";
    }
    
    const buildTypeProp = entity.properties.buildType;
    const typeId = (typeof buildTypeProp.getValue === 'function') 
        ? buildTypeProp.getValue() 
        : buildTypeProp;
    
    // Convert id to key for internal lookup (e.g., "commercial building" -> "commercial_building")
    const typeKey = getTypeById(typeId);
    return typeKey || typeId;  // Fallback to original if not found
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
    
    // Update occupation stats after type change
    if (typeof updateOccupationStats === 'function') {
        setTimeout(() => updateOccupationStats(), 100);
    }
}

// Apply type initialization for POLYGONS (modifies entity directly)
function applyTypeInitPolygon(entity) {
    if (!entity.polygon) {
        console.warn("applyTypeInitPolygon called on entity without polygon");
        return;
    }
    
    // Get the building type to determine color
    const type = getEntityType(entity);
    const typeColor = getTypeProperty(type, 'color');
    const finalColor = typeColor || Cesium.Color.WHITE;
    
    console.log(`Applying type ${type} with color to polygon`);
    
    // Set the dynamic material - this creates a callback that will always return the correct color
    entity.polygon.material = new Cesium.ColorMaterialProperty(
        new Cesium.CallbackProperty(() => {
            const currentType = getEntityType(entity);
            const currentColor = getTypeProperty(currentType, 'color');
            return currentColor || finalColor;
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

// Function to get the object key for a build type by its id
function getTypeById(searchId) {
    if (!searchId) return null;

    for (const [key, type] of Object.entries(buildTypes)) {
        if (type.id === searchId) {
            return key; // Return the object key as a string
        }
    }

    console.warn(`No build type found with id "${searchId}"`);
    return null;
}

// Expose helper functions globally if needed
window.buildTypes = buildTypes;
window.getTypeProperty = getTypeProperty;
window.getAllTypeIds = getAllTypeIds;
window.getTypeById = getTypeById;
window.getAllType = getAllType;
window.addBuildType = addBuildType;
window.getEntityType = getEntityType;
window.setEntityType = setEntityType;
window.applyTypeInitPolygon = applyTypeInitPolygon;
window.applyTypeInitModel = applyTypeInitModel;
window.applyTypeToEntity = applyTypeToEntity;