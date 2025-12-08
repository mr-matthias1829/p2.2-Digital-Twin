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

    // Call backend API to compute area and volume
    async function callBackendCalculation(positions, height) {
        const API_BASE = (window.POLYGONS_API_BASE && String(window.POLYGONS_API_BASE).replace(/\/$/, '')) || 'http://localhost:8081';
        const url = API_BASE + '/api/polygons/calculate';
        
        // Convert Cartesian3 positions to plain objects for JSON
        const positionData = positions.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z
        }));

        const requestBody = {
            positions: positionData,
            height: height
        };

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            });

            if (!response.ok) {
                throw new Error(`Backend calculation failed: HTTP ${response.status}`);
            }

            const result = await response.json();
            return result; // { area: number, volume: number|null, height: number|null }
        } catch (error) {
            console.error('Error calling backend calculation API:', error);
            throw error;
        }
    }

    // Public function: compute polygon area from hierarchy (calls backend)
    async function computeAreaFromHierarchy(hierarchy) {
        const positions = getPositions(hierarchy).map(toCartesian3);
        if (positions.length < 3) return null;

        try {
            const result = await callBackendCalculation(positions, null);
            return result.area;
        } catch (error) {
            console.error('Failed to compute area from backend:', error);
            return null;
        }
    }

    // Compute area and volume from entity (calls backend)
    async function computeVolumeFromEntity(entity) {
        if (!entity?.polygon) return undefined;

        const positions = getPositions(entity.polygon.hierarchy).map(toCartesian3);
        if (positions.length < 3) return undefined;


        const height = getNumeric(entity.polygon.extrudedHeight) ?? getNumeric(entity.polygon.height);
        

        if (typeof height !== 'number') return undefined;

        try {
            const result = await callBackendCalculation(positions, height);
            return { 
                area: result.area, 
                height: result.height, 
                volume: result.volume 
            };
        } catch (error) {
            console.error('Failed to compute volume from backend:', error);
            return undefined;
        }
    }

    // Expose simplified utilities
    window.polygonUtils = {
        computeAreaFromHierarchy,
        computeVolumeFromEntity
    };
})();

