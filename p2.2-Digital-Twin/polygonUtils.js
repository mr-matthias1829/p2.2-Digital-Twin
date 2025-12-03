// polygonUtils.js - simplified helpers to compute polygon area (m²) and volume (m³)
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

    // Compute planar polygon area in m² using local ENU projection and 2D shoelace formula
    function areaFromCartesianPositions(positions) {
        if (!positions || positions.length < 3) return 0;

        // Compute centroid to reduce distortion in local ENU frame
        const centroid = positions.reduce((acc, p) => {
            acc.x += p.x; acc.y += p.y; acc.z += p.z; return acc;
        }, new Cesium.Cartesian3());
        centroid.x /= positions.length;
        centroid.y /= positions.length;
        centroid.z /= positions.length;

        // Transform global points to local East-North-Up coordinates
        const inv = Cesium.Matrix4.inverse(Cesium.Transforms.eastNorthUpToFixedFrame(centroid), new Cesium.Matrix4());
        const local = positions.map(p => Cesium.Matrix4.multiplyByPoint(inv, p, new Cesium.Cartesian3()));

        // Shoelace formula on XY plane
        let area = 0;
        for (let i = 0; i < local.length; i++) {
            const a = local[i], b = local[(i + 1) % local.length];
            area += (a.x * b.y - b.x * a.y);
        }
        return Math.abs(area) * 0.5; // final area in m²
    }

    // Public function: compute polygon area from hierarchy (any input format)
    function computeAreaFromHierarchy(hierarchy) {
        const positions = getPositions(hierarchy).map(toCartesian3);
        return areaFromCartesianPositions(positions);
    }

    // Helper: extract numeric value from number or Cesium Property
    function getNumeric(val) {
        if (val == null) return undefined;
        if (typeof val === 'number') return val;
        if (val.getValue) return val.getValue(Cesium.JulianDate.now());
    }

    // Compute approximate volume (m³) as area * height (simple prism)
    function computeVolumeFromEntity(entity) {
        if (!entity?.polygon) return undefined;

        const positions = getPositions(entity.polygon.hierarchy).map(toCartesian3);
        if (positions.length < 3) return undefined;

        const area = areaFromCartesianPositions(positions);
        const height = getNumeric(entity.polygon.extrudedHeight) ?? getNumeric(entity.polygon.height);

        
        if (typeof height !== 'number') return undefined;

        return { area, height, volume: area * height };
    }

    // Expose simplified utilities
    window.polygonUtils = {
        computeAreaFromHierarchy,
        computeVolumeFromEntity,
        areaFromCartesianPositions
    };
})();
