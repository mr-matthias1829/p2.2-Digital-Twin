// polygonUtils.js - helpers to compute polygon area (m²) and volume (m³)
(function () {
    // Normalize different polygon hierarchy representations into an array of positions.
    // Handles CallbackProperty, Cesium.PolygonHierarchy, plain arrays and objects with a `.positions` field.
    function _unwrapHierarchy(hierarchy) {
        if (!hierarchy) return [];
        // CallbackProperty used by Cesium for dynamic hierarchies
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        if (hierarchy instanceof Cesium.PolygonHierarchy) return hierarchy.positions || [];
        if (Array.isArray(hierarchy)) return hierarchy;
        if (hierarchy.positions) return hierarchy.positions;
        return [];
    }

    // Compute planar area in square meters using a local East-North-Up (ENU) projection
    // followed by the 2D shoelace formula. This is accurate for small-to-medium polygons
    // (does not compute geodesic area on the ellipsoid).
    function areaFromCartesianPositions(positions) {
        if (!positions || positions.length < 3) return 0; // need at least a triangle

        // Compute centroid in Cartesian coordinates by simple averaging. This is used
        // as the origin for a local ENU frame to reduce distortion for the planar area calc.
        const centroid = positions.reduce((acc, p) => {
            acc.x += p.x; acc.y += p.y; acc.z += p.z; return acc;
        }, new Cesium.Cartesian3());
        centroid.x /= positions.length; centroid.y /= positions.length; centroid.z /= positions.length;

        // Build transformation matrix from WGS84 to a local East-North-Up frame at the centroid.
        // We invert it to convert global Cartesian points into local coordinates.
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(centroid);
        const inv = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());

        // Transform all points into the local frame. In that frame x ~ east (meters) and y ~ north (meters).
        const localPts = positions.map(p => Cesium.Matrix4.multiplyByPoint(inv, p, new Cesium.Cartesian3()));

        // Apply the shoelace formula on the (x,y) plane. The result is in square meters because
        // the ENU frame uses meters for x/y.
        let area = 0;
        for (let i = 0; i < localPts.length; i++) {
            const a = localPts[i];
            const b = localPts[(i + 1) % localPts.length];
            area += (a.x * b.y) - (b.x * a.y);
        }
        area = Math.abs(area) * 0.5; // absolute value, half the cross-sum yields area
        return area;
    }

    // Convert possible input formats to Cartesian3 positions. If the input already contains
    // Cartesian3 instances we pass them through; if they are simple lon/lat objects we convert.
    function _getPositions(hierarchy) {
        return _unwrapHierarchy(hierarchy).map(p => {
            // If it's already a Cartesian3, return as-is
            if (p instanceof Cesium.Cartesian3) return p;
            // If it's an object with longitude/latitude, convert to Cartesian3 (height defaults to 0)
            if (p.longitude != null && p.latitude != null) {
                return Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0);
            }
            // Otherwise return the original value (caller should ensure positions are Cartesian3)
            return p;
        });
    }

    function computeAreaFromHierarchy(hierarchy) {
        const positions = _getPositions(hierarchy);
        return areaFromCartesianPositions(positions);
    }

    // Helper to read either a raw number or a Cesium Property (with getValue).
    function _getNumeric(val) {
        if (val == null) return undefined;
        if (typeof val === 'number') return val;
        if (val && typeof val.getValue === 'function') return val.getValue(Cesium.JulianDate.now());
        return undefined;
    }

    // Compute volume (m^3) for an entity by multiplying computed planar area with
    // a vertical height. We prefer `extrudedHeight` (typical for extruded polygons)
    // and fall back to `height`. If neither is present we return undefined.
    // Note: this assumes the height is expressed in meters and is compatible with the
    // planar area (i.e. a simple prism approximation). For sloped roofs or variable
    // heights this is only an approximation.
    function computeVolumeFromEntity(entity) {
        if (!entity || !entity.polygon) return undefined;
        const positions = _getPositions(entity.polygon.hierarchy);
        if (!positions || positions.length < 3) return undefined;

        const area = areaFromCartesianPositions(positions);

        // Read heights (could be a Property or a plain number)
        const extruded = _getNumeric(entity.polygon.extrudedHeight);
        const base = _getNumeric(entity.polygon.height);

        // Use extrudedHeight if available (represents extrusion amount). If it's absent but
        // a base `height` is present we use that as the vertical measure. If neither exist
        // the volume cannot be determined.
        const height = (typeof extruded === 'number') ? extruded : (typeof base === 'number' ? base : undefined);
        if (typeof height !== 'number') return undefined;

        const volume = area * height; // m^2 * m = m^3 (prism approximation)
        return { area: area, height: height, volume: volume };
    }

    // Expose utilities under `window.polygonUtils` for other scripts to use.
    window.polygonUtils = {
        computeAreaFromHierarchy: computeAreaFromHierarchy,
        computeVolumeFromEntity: computeVolumeFromEntity,
        areaFromCartesianPositions: areaFromCartesianPositions
    };
})();
