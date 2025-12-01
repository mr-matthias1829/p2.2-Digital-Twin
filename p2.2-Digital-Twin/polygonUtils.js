// polygonUtils.js - helpers to compute polygon area (m2) and volume (m3)
(function () {
    function _unwrapHierarchy(hierarchy) {
        if (!hierarchy) return [];
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }
        if (hierarchy instanceof Cesium.PolygonHierarchy) return hierarchy.positions || [];
        if (Array.isArray(hierarchy)) return hierarchy;
        if (hierarchy.positions) return hierarchy.positions;
        return [];
    }

    // Compute planar area in square meters using local ENU projection and shoelace formula
    function areaFromCartesianPositions(positions) {
        if (!positions || positions.length < 3) return 0;

        // compute centroid in Cartesian space
        const centroid = positions.reduce((acc, p) => {
            acc.x += p.x; acc.y += p.y; acc.z += p.z; return acc;
        }, new Cesium.Cartesian3());
        centroid.x /= positions.length; centroid.y /= positions.length; centroid.z /= positions.length;

        // transform to East-North-Up local frame at centroid
        const transform = Cesium.Transforms.eastNorthUpToFixedFrame(centroid);
        const inv = Cesium.Matrix4.inverse(transform, new Cesium.Matrix4());

        const localPts = positions.map(p => Cesium.Matrix4.multiplyByPoint(inv, p, new Cesium.Cartesian3()));

        // Use x (east) and y (north) components for 2D area
        let area = 0;
        for (let i = 0; i < localPts.length; i++) {
            const a = localPts[i];
            const b = localPts[(i + 1) % localPts.length];
            area += (a.x * b.y) - (b.x * a.y);
        }
        area = Math.abs(area) * 0.5; // in square meters
        return area;
    }

    function _getPositions(hierarchy) {
        return _unwrapHierarchy(hierarchy).map(p => {
            // If it's a Cartographic/LatLon pair, try to convert; but we expect Cartesian3
            if (p instanceof Cesium.Cartesian3) return p;
            if (p.longitude != null && p.latitude != null) {
                return Cesium.Cartesian3.fromDegrees(p.longitude, p.latitude, p.height || 0);
            }
            return p;
        });
    }

    function computeAreaFromHierarchy(hierarchy) {
        const positions = _getPositions(hierarchy);
        return areaFromCartesianPositions(positions);
    }

    function _getNumeric(val) {
        if (val == null) return undefined;
        if (typeof val === 'number') return val;
        if (val && typeof val.getValue === 'function') return val.getValue(Cesium.JulianDate.now());
        return undefined;
    }

    function computeVolumeFromEntity(entity) {
        if (!entity || !entity.polygon) return undefined;
        const positions = _getPositions(entity.polygon.hierarchy);
        if (!positions || positions.length < 3) return undefined;

        const area = areaFromCartesianPositions(positions);

        // Prefer extrudedHeight
        const extruded = _getNumeric(entity.polygon.extrudedHeight);
        const base = _getNumeric(entity.polygon.height);

        // If extruded height exists, use it as vertical measure. If not, can't compute volume reliably.
        const height = (typeof extruded === 'number') ? extruded : (typeof base === 'number' ? base : undefined);
        if (typeof height !== 'number') return undefined;

        const volume = area * height; // m^2 * m = m^3
        return { area: area, height: height, volume: volume };
    }

    window.polygonUtils = {
        computeAreaFromHierarchy: computeAreaFromHierarchy,
        computeVolumeFromEntity: computeVolumeFromEntity,
        areaFromCartesianPositions: areaFromCartesianPositions
    };
})();
