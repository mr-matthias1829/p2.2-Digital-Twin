// polygonUtils.js - API client for backend polygon area (m²) and volume (m³) calculations
(function () {

    // Convert different input formats into an array of Cartesian3 positions
    function getPositions(hierarchy) {
        if (!hierarchy) return [];

        // If dynamic CallbackProperty, get current value
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }

        // Extract positions depending on type
        if (hierarchy instanceof Cesium.PolygonHierarchy) return hierarchy.positions || [];
        if (Array.isArray(hierarchy)) return hierarchy;
        if (hierarchy.positions) return hierarchy.positions;
        return [];
    }

    // Convert any position-like object into Cartesian3
    function toCartesian3(pos) {
        if (pos instanceof Cesium.Cartesian3) return pos;
        if (pos.longitude != null && pos.latitude != null) {
            return Cesium.Cartesian3.fromDegrees(pos.longitude, pos.latitude, pos.height || 0);
        }
        return pos; // assume already Cartesian3
    }
    

    // Helper: extract numeric value from number or Cesium Property
    function getNumeric(val) {
        if (val == null) return undefined;
        if (typeof val === 'number') return val;
        if (val.getValue) return val.getValue(Cesium.JulianDate.now());
    }

    // Track server connectivity status
    let serverConnected = true;

    /**
     * Call backend API to compute area and volume
     * The backend performs the actual geometric calculations:
     * 1. Area: Uses shoelace formula on ENU (East-North-Up) projected coordinates
     * 2. Volume: Multiplies area by height (simple extrusion volume)
     * 
     * @param {Array<Cesium.Cartesian3>} positions - Array of 3D polygon vertices
     * @param {number|null} height - Optional height for volume calculation (meters)
     * @returns {Promise<{area: number, volume: number|null, height: number|null}>} Calculation results
     */
    async function callBackendCalculation(positions, height) {
        const API_BASE = (window.POLYGONS_API_BASE && String(window.POLYGONS_API_BASE).replace(/\/$/, '')) || 'http://localhost:8081';
        const url = API_BASE + '/api/data/calculate';
        
        // Convert Cartesian3 positions to plain objects for JSON
        const positionData = positions.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z
        }));

        // Send polygon vertices and optional height to backend
        const requestBody = {
            positions: positionData,  // Array of 3D points (x, y, z)
            height: height            // Optional: height for volume calculation
        };

        try {
            // POST request to backend calculation endpoint
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody),
                signal: AbortSignal.timeout(1200) // 1200ms timeout for faster failure
            });

            if (!response.ok) {
                throw new Error(`Backend calculation failed: HTTP ${response.status}`);
            }

            // Backend returns calculated area (always) and volume (if height provided)
            const result = await response.json();
            serverConnected = true; // Mark server as connected on success
            return result; // { area: number, volume: number|null, height: number|null }
        } catch (error) {
            serverConnected = false; // Mark server as disconnected on error
            console.error('Error calling backend calculation API:', error);
            const serverError = new Error('SERVER_DISCONNECTED');
            serverError.originalError = error;
            throw serverError;
        }
    }

    /**
     * Check if server is currently connected
     * @returns {boolean} True if last request succeeded, false if failed
     */
    function isServerConnected() {
        return serverConnected;
    }

    /**
     * Public function: compute polygon area from hierarchy (calls backend)
     * AREA CALCULATION PROCESS:
     * 1. Extract polygon vertices from the hierarchy
     * 2. Convert to Cartesian3 coordinates (3D positions on Earth)
     * 3. Send to backend for calculation (no height = area only)
     * 4. Backend projects points to local flat plane and uses shoelace formula
     * 
     * @param {Cesium.PolygonHierarchy|Array} hierarchy - Polygon geometry hierarchy
     * @returns {Promise<number|null>} Area in square meters (m²), or null if invalid
     */
    async function computeAreaFromHierarchy(hierarchy) {
        const positions = getPositions(hierarchy).map(toCartesian3);
        if (positions.length < 3) return null;  // Need at least 3 points for a polygon

        try {
            const result = await callBackendCalculation(positions, null);  // null height = area only
            return result.area;  // Return area in square meters (m²)
        } catch (error) {
            console.error('Failed to compute area from backend:', error);
            return null;
        }
    }

    /**
     * Compute area and volume from entity (calls backend)
     * VOLUME CALCULATION PROCESS:
     * 1. Extract polygon vertices from entity
     * 2. Convert to Cartesian3 coordinates
     * 3. Get building height from entity properties
     * 4. Send to backend with height parameter
     * 5. Backend calculates: area × height = volume (m³)
     * 
     * @param {Cesium.Entity} entity - Cesium entity with polygon geometry
     * @returns {Promise<{area: number, height: number, volume: number}|undefined>} Calculation results or undefined if invalid
     */
    async function computeVolumeFromEntity(entity) {
        if (!entity?.polygon) return undefined;

        const positions = getPositions(entity.polygon.hierarchy).map(toCartesian3);
        if (positions.length < 3) return undefined;  // Need at least 3 points

        // Get building height (extruded height or regular height)
        const height = getNumeric(entity.polygon.extrudedHeight) ?? getNumeric(entity.polygon.height);
        

        if (typeof height !== 'number') return undefined;  // Volume requires valid height

        try {
            // Backend calculates both area and volume when height is provided
            const result = await callBackendCalculation(positions, height);
            return { 
                area: result.area,      // Base area in m²
                height: result.height,  // Building height in meters
                volume: result.volume   // Volume in m³ (area × height)
            };
        } catch (error) {
            console.error('Failed to compute volume from backend:', error);
            return undefined;
        }
    }

    // Expose simplified utilities
    window.polygonUtils = {
        computeAreaFromHierarchy,
        computeVolumeFromEntity,
        isServerConnected
    };
})();

