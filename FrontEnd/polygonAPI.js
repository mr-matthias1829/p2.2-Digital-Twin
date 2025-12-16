// polygonAPI.js - API client for polygon CRUD operations
(function() {
    const API_BASE = 'http://localhost:8081';
    
    // Show/hide sync indicator
    function showSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'block';
    }
    
    function hideSyncIndicator() {
        const indicator = document.getElementById('syncIndicator');
        if (indicator) indicator.style.display = 'none';
    }
    
    // Convert Cesium entity polygon to backend format
    function entityToPolygonDTO(entity) {
        if (!entity.polygon) {
            console.error('Entity does not have a polygon');
            return null;
        }
        
        // Get positions from hierarchy
        let hierarchy = entity.polygon.hierarchy;
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        
        let positions = [];
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            positions = hierarchy.positions || [];
        } else if (Array.isArray(hierarchy)) {
            positions = hierarchy;
        } else if (hierarchy.positions) {
            positions = hierarchy.positions;
        }
        
        // Convert Cartesian3 positions to lon/lat coordinates
        const coordinates = positions.map(pos => {
            const cartographic = Cesium.Cartographic.fromCartesian(pos);
            return {
                longitude: Cesium.Math.toDegrees(cartographic.longitude),
                latitude: Cesium.Math.toDegrees(cartographic.latitude)
            };
        });
        
        // Get height from extrudedHeight
        let height = 0.0;
        if (entity.polygon.extrudedHeight) {
            height = typeof entity.polygon.extrudedHeight.getValue === 'function'
                ? entity.polygon.extrudedHeight.getValue(Cesium.JulianDate.now())
                : entity.polygon.extrudedHeight;
        }
        
        // Get building type
        let buildingType = null;
        if (entity.properties && entity.properties.buildType) {
            buildingType = typeof entity.properties.buildType.getValue === 'function'
                ? entity.properties.buildType.getValue(Cesium.JulianDate.now())
                : entity.properties.buildType;
        }
        
        return {
            id: entity.polygonId || null,  // Include ID if updating existing polygon
            coordinates: coordinates,
            height: height,
            buildingType: buildingType
        };
    }
    
    // Convert backend polygon DTO to Cesium entity
    function polygonDTOToEntity(polygonDTO, viewer) {
        // Convert lon/lat coordinates to Cartesian3 positions
        const positions = polygonDTO.coordinates.map(coord => 
            Cesium.Cartesian3.fromDegrees(coord.longitude, coord.latitude)
        );
        
        // Create entity
        const entity = viewer.entities.add({
            polygon: {
                hierarchy: new Cesium.PolygonHierarchy(positions),
                material: Cesium.Color.WHITE,  // Will be set by type system
                extrudedHeight: polygonDTO.height || 0.0
            },
            properties: new Cesium.PropertyBag({
                buildType: polygonDTO.buildingType || 'none'
            }),
            polygonId: polygonDTO.id  // Store database ID on entity
        });
        
        // Apply type styling
        if (typeof applyTypeInitPolygon === 'function') {
            applyTypeInitPolygon(entity);
        }
        
        return entity;
    }
    
    // Save polygon to database (create or update)
    async function savePolygon(entity) {
        showSyncIndicator();
        try {
            const polygonDTO = entityToPolygonDTO(entity);
            if (!polygonDTO) {
                throw new Error('Failed to convert entity to polygon DTO');
            }
            
            const url = polygonDTO.id 
                ? `${API_BASE}/api/data/polygons/${polygonDTO.id}`
                : `${API_BASE}/api/data/polygons`;
            
            const method = polygonDTO.id ? 'PUT' : 'POST';
            
            const response = await fetch(url, {
                method: method,
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(polygonDTO)
            });
            
            if (!response.ok) {
                throw new Error(`Failed to save polygon: HTTP ${response.status}`);
            }
            
            const savedPolygon = await response.json();
            
            // Update entity with database ID
            entity.polygonId = savedPolygon.id;
            
            console.log(`✓ Polygon ${method === 'POST' ? 'created' : 'updated'} with ID: ${savedPolygon.id}`);
            return savedPolygon;
        } catch (error) {
            console.error('Error saving polygon:', error);
            throw error;
        } finally {
            hideSyncIndicator();
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
            
            // Remove ALL existing polygon entities (not just ones with polygonId)
            // This ensures we don't have duplicates or orphaned polygons
            const entitiesToRemove = [];
            viewer.entities.values.forEach(entity => {
                // Remove any polygon that's not the protected Spoordok
                if (entity.polygon && !entity.properties?.isSpoordok) {
                    entitiesToRemove.push(entity);
                }
            });
            entitiesToRemove.forEach(entity => viewer.entities.remove(entity));
            console.log(`Removed ${entitiesToRemove.length} existing polygons before loading from database`);
            
            const entities = [];
            for (const polygonDTO of polygons) {
                const entity = polygonDTOToEntity(polygonDTO, viewer);
                entities.push(entity);
            }
            
            console.log(`✓ Loaded ${entities.length} polygons`);
            return entities;
        } catch (error) {
            console.error('Error loading polygons:', error);
            return [];
        } finally {
            hideSyncIndicator();
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
        polygonDTOToEntity
    };
})();
