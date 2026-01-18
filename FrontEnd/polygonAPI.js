// polygonAPI.js - API client for polygon CRUD operations
// This file handles all communication between the frontend and Spring Boot backend
// for polygon and corridor (road) data persistence
(function() {
    // Base URL for the Spring Boot REST API
    // This should match the backend server's address and port
    const API_BASE = 'http://localhost:8081';
    
    // Queue to prevent concurrent saves of the same polygon (prevents database deadlocks)
    // Maps polygonId -> Promise to ensure only one save operation per polygon at a time
    const saveQueue = new Map(); // polygonId -> Promise
    
    // Show sync indicator - provides visual feedback during API calls
    // Displays a loading indicator to inform user that data is being synced
    function showSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'block';
    }
    
    // Hide sync indicator - called when API operation completes (success or failure)
    function hideSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'none';
    }
    
    // Convert Cesium entity polygon to backend format
    // This transforms frontend polygon representation (Cesium entities) into
    // Data Transfer Objects (DTOs) that the backend API expects
    function entityToPolygonDTO(entity) {
        // Validate that entity has a polygon component
        if (!entity.polygon) {
            console.error('Entity does not have a polygon');
            return null;
        }
        
        // Get positions from hierarchy (handles both static and dynamic properties)
        let hierarchy = entity.polygon.hierarchy;
        
        // If hierarchy is a dynamic property, get its current value
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        // Extract positions array from various possible formats
        let positions = [];
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            positions = hierarchy.positions || [];  // Extract positions array
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;  // Already an array
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;  // Positions as property
        }
        
        // Convert Cartesian3 positions to lon/lat coordinates
        // Backend expects geographic coordinates (degrees), not 3D world coordinates
        const coordinates = positions.map(pos => {
            // Convert from Earth-Centered Earth-Fixed (ECEF) to geographic
            const cartographic = Cesium.Cartographic.fromCartesian(pos);
            return {
                longitude: Cesium.Math.toDegrees(cartographic.longitude),  // Convert radians to degrees
                latitude: Cesium.Math.toDegrees(cartographic.latitude)
            };
        });
        
        // Get height from extrudedHeight property
        // extrudedHeight determines how tall the building is (vertical extrusion)
        let height = 0.0;
        if (entity.polygon.extrudedHeight) {
            // Handle both static numbers and dynamic properties
            height = typeof entity.polygon.extrudedHeight.getValue === 'function'
                ? entity.polygon.extrudedHeight.getValue(Cesium.JulianDate.now())
                : entity.polygon.extrudedHeight;
        }
        
        // Get building type (e.g., "residential", "commercial building", "nature")
        let buildingType = null;
        if (entity.properties && entity.properties.buildType) {
            // Handle both static strings and dynamic properties
            buildingType = typeof entity.properties.buildType.getValue === 'function'
                ? entity.properties.buildType.getValue(Cesium.JulianDate.now())
                : entity.properties.buildType;
        }
        
        // Get polygon name (user-defined label)
        let name = entity.polygonName || null;
        
        // Get nature on top status (green roof feature)
        let hasNatureOnTop = entity.hasNatureOnTop || false;
        
        // Return DTO object matching backend @RequestBody expectations
        return {
            id: entity.polygonId || null,  // Include ID if updating existing polygon (null for new)
            coordinates: coordinates,       // Array of {longitude, latitude} objects
            height: height,                 // Building height in meters
            buildingType: buildingType,     // Type identifier string
            name: name,                     // Optional user-defined name
            hasNatureOnTop: hasNatureOnTop  // Green roof enabled flag
        };
    }
    
    // Convert backend polygon DTO to Cesium entity
    // This transforms database records into visual Cesium entities for rendering
    function polygonDTOToEntity(polygonDTO, viewer) {
        // Convert lon/lat coordinates to Cartesian3 positions
        // Transform from geographic coordinates (degrees) to 3D world space
        const positions = polygonDTO.coordinates.map(coord => 
            Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude)
        );
        
        // Create Cesium entity with polygon graphics
        const entity = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),  // Closed polygon shape
                material: Cesium.Color.WHITE,  // Temporary color (will be set by type system)
                extrudedHeight: polygonDTO.height || 0.0  // Vertical extrusion (building height)
            },
            properties: new Cesium.PropertyBag({
                buildType: polygonDTO.buildingType || 'none'  // Store building type for styling
            }),
            polygonId: polygonDTO.id,  // Store database ID on entity for future updates
            polygonName: polygonDTO.name || '',  // Store polygon name on entity
            hasNatureOnTop: polygonDTO.hasNatureOnTop || false  // Store green roof status
        });
        
        // Apply type-specific color and properties from TypeData system
        // This sets the correct color based on building type (residential, commercial, etc.)
        if (typeof applyTypeInitPolygon === 'function') {
            applyTypeInitPolygon(entity);
        }
        
        // Apply green roof visualization if enabled
        // This adds a green overlay on top of the building to represent vegetation
        if (entity.hasNatureOnTop && typeof updateGreenRoofVisualization === 'function') {
            updateGreenRoofVisualization(entity);
        }
        
        // Check bounds and mark if out of bounds
        // Validates that polygon is within the Spoordok boundary
        if (typeof boundsChecker !== 'undefined') {
            boundsChecker.validateAndMarkPolygon(entity, viewer);
        }
        
        return entity;
    }
    
    // Save polygon to database (create or update)
    // Uses a queue to prevent concurrent saves of the same polygon (prevents database deadlocks)
    // This is critical for edit mode where multiple rapid changes could trigger simultaneous saves
    async function savePolygon(entity) {
        const polygonId = entity.polygonId;
        
        // If there's already a save in progress for this polygon, wait for it to finish
        // This prevents database transaction conflicts from simultaneous UPDATE statements
        if (polygonId && saveQueue.has(polygonId)) {
            console.log(`⏳ Waiting for previous save to complete for polygon ${polygonId}...`);
            try {
                await saveQueue.get(polygonId);  // Wait for previous save to complete
            } catch (e) {
                // Ignore errors from previous save - we'll retry anyway
            }
        }
        
        // Create the save promise and add it to the queue
        // This reserves our "slot" in the queue before starting the actual save
        const savePromise = performSave(entity);
        if (polygonId) {
            saveQueue.set(polygonId, savePromise);  // Add to queue
        }
        
        try {
            const result = await savePromise;  // Wait for our save to complete
            return result;
        } finally {
            // Remove from queue when done (success or failure)
            // This allows next save for this polygon to proceed
            if (polygonId) {
                saveQueue.delete(polygonId);
            }
        }
    }
    
    // Actual save implementation - performs the HTTP request to backend
    // Separated from savePolygon to enable proper queue management
    async function performSave(entity) {
        showSyncIndicator();  // Show loading indicator
        try {
            // Convert Cesium entity to backend DTO format
            const polygonDTO = entityToPolygonDTO(entity);
            if (!polygonDTO) {
                throw new Error('Failed to convert entity to polygon DTO');
            }
            
            // Determine if this is a create (POST) or update (PUT) operation
            // If polygon has an ID, it exists in database and needs updating
            const url = polygonDTO.id 
                ? `${API_BASE}/api/data/polygons/${polygonDTO.id}`  // Update existing
                : `${API_BASE}/api/data/polygons`;  // Create new
            
            const method = polygonDTO.id ? 'PUT' : 'POST';
            
            // Make HTTP request to Spring Boot backend
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'  // Send JSON data
                },
                body: JSON.stringify(polygonDTO)  // Serialize DTO to JSON
            });
            
            // Check for HTTP errors
            if (!response.ok) {
                throw new Error(`Failed to save polygon: HTTP ${response.status}`);
            }
            
            // Parse response JSON to get saved polygon (includes database-assigned ID)
            const savedPolygon = await response.json();
            
            // Update entity with database ID (important for future updates)
            entity.polygonId = savedPolygon.id;
            
            console.log(`✓ Polygon ${method === 'POST' ? 'created' : 'updated'} with ID: ${savedPolygon.id}`);
            return savedPolygon;
        } catch (error) {
            console.error('Error saving polygon:', error);
            throw error;  // Re-throw to allow caller to handle
        } finally {
            hideSyncIndicator();  // Hide loading indicator (even on error)
        }
    }
    
    // Load all polygons from database
    async function loadAllPolygons(viewer) {
        showSyncIndicator();
        try {
            const response = await fetch(`${API_BASE}/api/data/polygons`);
            
            if (!response.ok) {
                throw new Error(`Failed to load polygons: HTTP ${response.status}`);
            }
            
            const polygons = await response.json();
            
            console.log(`✓ Loading ${polygons.length} polygons from database...`);
            
            const entities = [];
            for (const polygonDTO of polygons) {
                const entity = polygonDTOToEntity(polygonDTO, viewer);
                entities.push(entity);
            }
            
            console.log(`✓ Loaded ${entities.length} polygons`);
            
            // AGGRESSIVE DUPLICATE REMOVAL: Remove any polygons with identical coordinates
            setTimeout(() => {
                removeDuplicatePolygons(viewer);
            }, 200);
            
            return entities;
        } catch (error) {
            console.error('Error loading polygons:', error);
            return [];
        } finally {
            hideSyncIndicator();
        }
    }
    
    // Remove duplicate polygons based on matching coordinates
    // This prevents visual glitches and data inconsistencies from having multiple
    // polygons with identical geometry loaded from different sources
    function removeDuplicatePolygons(viewer) {
        const polygonMap = new Map(); // Key: coordinate hash, Value: entity
        const toRemove = [];
        
        // Iterate through all entities to find duplicates
        viewer.entities.values.forEach(entity => {
            // Skip entities that aren't user-created polygons
            if (!entity.polygon || entity.properties?.isSpoordok || entity.properties?.isGreenRoofOverlay) return;
            
            // Get positions and create hash
            let hierarchy = entity.polygon.hierarchy;
            if (typeof hierarchy.getValue === 'function') {
                hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
            }
            
            let positions = [];
            if (hierarchy instanceof Cesium.PolygonHierarchy) {
                positions = hierarchy.positions || [];
            } else if (Array.isArray(hierarchy)) {
                positions = hierarchy;
            }
            
            // Create coordinate hash - unique identifier for this geometry
            // Uses longitude and latitude rounded to 8 decimal places (≈1mm precision)
            const coordHash = positions.map(pos => {
                const carto = Cesium.Cartographic.fromCartesian(pos);
                return `${carto.longitude.toFixed(8)},${carto.latitude.toFixed(8)}`;
            }).sort().join('|');  // Sort to ensure consistent hash regardless of vertex order
            
            if (polygonMap.has(coordHash)) {
                // Duplicate found! Keep the one with polygonId (from database), remove the other
                const existing = polygonMap.get(coordHash);
                if (entity.polygonId && !existing.polygonId) {
                    // Current entity is from DB, remove the existing one
                    toRemove.push(existing);
                    polygonMap.set(coordHash, entity);  // Replace with DB version
                } else {
                    // Existing is from DB or current has no ID, remove current
                    toRemove.push(entity);
                }
            } else {
                // First time seeing this geometry, add to map
                polygonMap.set(coordHash, entity);
            }
        });
        
        // Remove all duplicates found
        if (toRemove.length > 0) {
            toRemove.forEach(entity => viewer.entities.remove(entity));
            console.log(`🗑️ Removed ${toRemove.length} duplicate polygon(s)`);
            
            // Update occupation stats after cleanup
            if (typeof updateOccupationStats === 'function') {
                setTimeout(() => updateOccupationStats(), 100);
            }
        }
    }
    
    // Delete polygon from database
    async function deletePolygon(entity) {
        showSyncIndicator();
        try {
            if (!entity.polygonId) {
                console.warn('Entity does not have a database ID, cannot delete');
                hideSyncIndicator();
                return false;
            }
            
            const response = await fetch(`${API_BASE}/api/data/polygons/${entity.polygonId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete polygon: HTTP ${response.status}`);
            }
            
            console.log(`✓ Polygon deleted with ID: ${entity.polygonId}`);
            return true;
        } catch (error) {
            console.error('Error deleting polygon:', error);
            throw error;
        } finally {
            hideSyncIndicator();
        }
    }
    
    // Expose API globally
    window.polygonAPI = {
        savePolygon,
        loadAllPolygons,
        deletePolygon,
        entityToPolygonDTO,
        polygonDTOToEntity,
        removeDuplicatePolygons  // Expose for manual cleanup if needed
    };

    // ========== CORRIDOR API FUNCTIONS ==========

    /**
     * Save a corridor (road/path) to the backend database
     * Creates new corridor if no lineId exists, updates if it does
     * Corridors are linear features with width (roads, paths, etc.)
     */
    async function saveCorridor(entity) {
        try {
            showSyncIndicator();  // Show loading indicator

            // Convert Cesium corridor entity to backend DTO format
            const corridorDTO = entityToCorridorDTO(entity);
            if (!corridorDTO) {
                hideSyncIndicator();
                return null;
            }

            // Determine if this is create or update based on presence of ID
            const isUpdate = !!corridorDTO.id;
            const url = isUpdate 
                ? `${API_BASE}/api/data/corridors/${corridorDTO.id}`  // Update existing
                : `${API_BASE}/api/data/corridors`;  // Create new
            const method = isUpdate ? 'PUT' : 'POST';

            // Make HTTP request to Spring Boot backend
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(corridorDTO)
            });

            if (!response.ok) {
                throw new Error(`Failed to save corridor: HTTP ${response.status}`);
            }

            // Parse response and update entity with database ID
            const savedCorridor = await response.json();
            console.log(`✓ Corridor ${isUpdate ? 'updated' : 'created'} with ID:`, savedCorridor.id);

            // Update entity with database ID for future updates
            entity.lineId = savedCorridor.id;

            return savedCorridor;
        } catch (error) {
            console.error('Error saving corridor:', error);
            throw error;
        } finally {
            hideSyncIndicator();
        }
    }

    /**
     * Convert Cesium entity corridor to backend format
     * Transforms corridor (linear road/path) representation into DTO for API
     */
    function entityToCorridorDTO(entity) {
        // Validate entity has corridor component
        if (!entity.corridor) {
            console.error('Entity does not have a corridor');
            return null;
        }

        // Get positions (handle both static and dynamic properties)
        let positions = entity.corridor.positions;
        if (typeof positions.getValue === 'function') {
            positions = positions.getValue(Cesium.JulianDate.now());
        }

        // Convert Cartesian3 positions to lon/lat coordinates with sequence order
        // Sequence order is critical for corridors to maintain path direction
        const coordinates = positions.map((pos, index) => {
            const cartographic = Cesium.Cartographic.fromCartesian(pos);
            return {
                longitude: Cesium.Math.toDegrees(cartographic.longitude),
                latitude: Cesium.Math.toDegrees(cartographic.latitude),
                altitude: cartographic.height,
                sequenceOrder: index  // Preserve order of points along the path
            };
        });

        // Get building type (default to 'road' for corridors)
        let buildingType = 'road';
        if (entity.properties && entity.properties.buildType) {
            buildingType = typeof entity.properties.buildType.getValue === 'function'
                ? entity.properties.buildType.getValue(Cesium.JulianDate.now())
                : entity.properties.buildType;
        }

        // Get corridor name (user-defined label)
        let name = entity.lineName || null;

        // Get width (default 3.0m - typical road width)
        let width = 3.0;

        // Return DTO matching backend expectations
        return {
            id: entity.lineId || null,  // Database ID (null for new corridors)
            coordinates: coordinates,    // Ordered array of path points
            width: width,                // Corridor width in meters
            buildingType: buildingType,  // Type identifier
            name: name                   // Optional user-defined name
        };
    }

    /**
     * Convert backend corridor DTO to Cesium entity
     */
    function corridorDTOToEntity(corridorDTO, viewer) {
        // Convert lon/lat coordinates to Cartesian3 positions
        const positions = corridorDTO.coordinates
            .sort((a, b) => a.sequenceOrder - b.sequenceOrder)
            .map(coord => 
                Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude, coord.altitude || 0)
            );
        
        // Create entity
        const entity = viewer.entities.add({
            corridor: {
                positions: positions,
                width: corridorDTO.width || 3.0,
                material: Cesium.Color.DARKGREY.withAlpha(0.9),
                outlineWidth: 1,
                outline: true,
                height: 0,
                extrudedHeight: 0,
                clampToGround: true,
            },
            properties: new Cesium.PropertyBag({
                buildType: corridorDTO.buildingType || 'road'
            }),
            lineId: corridorDTO.id,
            lineName: corridorDTO.name || ''
        });

        // Apply color based on type if TypeData is available
        if (typeof window.applyTypeInitLine === 'function') {
            window.applyTypeInitLine(entity);
        }

        return entity;
    }

    /**
     * Load all corridors from database
     */
    async function loadAllCorridors(viewer) {
        showSyncIndicator();
        try {
            const response = await fetch(`${API_BASE}/api/data/corridors`);
            
            if (!response.ok) {
                throw new Error(`Failed to load corridors: HTTP ${response.status}`);
            }
            
            const corridors = await response.json();
            
            console.log(`✓ Loading ${corridors.length} corridors from database...`);
            
            const entities = [];
            for (const corridorDTO of corridors) {
                const entity = corridorDTOToEntity(corridorDTO, viewer);
                entities.push(entity);
            }
            
            console.log(`✓ Loaded ${entities.length} corridors`);
            
            return entities;
        } catch (error) {
            console.error('Error loading corridors:', error);
            return [];
        } finally {
            hideSyncIndicator();
        }
    }

    /**
     * Delete corridor from database
     */
    async function deleteCorridor(entity) {
        showSyncIndicator();
        try {
            if (!entity.lineId) {
                console.warn('Entity does not have a database ID, cannot delete');
                hideSyncIndicator();
                return false;
            }
            
            const response = await fetch(`${API_BASE}/api/data/corridors/${entity.lineId}`, {
                method: 'DELETE'
            });
            
            if (!response.ok) {
                throw new Error(`Failed to delete corridor: HTTP ${response.status}`);
            }
            
            console.log(`✓ Corridor deleted with ID: ${entity.lineId}`);
            return true;
        } catch (error) {
            console.error('Error deleting corridor:', error);
            throw error;
        } finally {
            hideSyncIndicator();
        }
    }

    // Expose corridor API globally
    window.corridorAPI = {
        saveCorridor,
        loadAllCorridors,
        deleteCorridor
    };
})();
