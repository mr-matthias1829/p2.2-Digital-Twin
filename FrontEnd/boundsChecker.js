// boundsChecker.js - Check if polygons are within the Spoordok boundary
(function() {
    
    // Track entities that are out of bounds
    let outOfBoundsEntities = new Set();
    
    /**
     * Check if a point is inside a polygon using ray casting algorithm
     * @param {Object} point - {x, y, z} Cartesian3 coordinates
     * @param {Array} polygonPositions - Array of Cartesian3 positions
     * @returns {boolean} - true if point is inside polygon
     */
    function isPointInsidePolygon(point, polygonPositions) {
        if (!point || !polygonPositions || polygonPositions.length < 3) {
            return false;
        }

        let intersections = 0;
        const n = polygonPositions.length;

        for (let i = 0; i < n; i++) {
            const p1 = polygonPositions[i];
            const p2 = polygonPositions[(i + 1) % n];

            // Check if the ray from point to the right intersects the edge
            if ((p1.y > point.y) !== (p2.y > point.y)) {
                const xIntersection = (p2.x - p1.x) * (point.y - p1.y) / (p2.y - p1.y) + p1.x;
                if (point.x < xIntersection) {
                    intersections++;
                }
            }
        }

        // Odd number of intersections means the point is inside
        return (intersections % 2) === 1;
    }

    /**
     * Check if all vertices of a polygon are inside the Spoordok boundary
     * @param {Array} polygonPositions - Array of Cartesian3 positions to check
     * @param {Array} spoordokPositions - Array of Cartesian3 positions of Spoordok boundary
     * @returns {boolean} - true if all vertices are inside Spoordok
     */
    function isPolygonInsideBounds(polygonPositions, spoordokPositions) {
        if (!polygonPositions || polygonPositions.length < 3) {
            return false;
        }
        if (!spoordokPositions || spoordokPositions.length < 3) {
            return false;
        }

        // All vertices must be inside the Spoordok for the polygon to be valid
        for (const point of polygonPositions) {
            if (!isPointInsidePolygon(point, spoordokPositions)) {
                return false;
            }
        }
        return true;
    }

    /**
     * Get the Spoordok boundary entity from the viewer
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @returns {Object|null} - The Spoordok entity or null if not found
     */
    function getSpoordokEntity(viewer) {
        if (!viewer || !viewer.entities) return null;
        
        return viewer.entities.values.find(e =>
            e.properties && e.properties.isSpoordok && e.polygon
        );
    }

    /**
     * Get positions from a polygon hierarchy
     * @param {*} hierarchy - Polygon hierarchy (can be various formats)
     * @returns {Array} - Array of Cartesian3 positions
     */
    function getPositionsFromHierarchy(hierarchy) {
        if (!hierarchy) return [];

        // If dynamic CallbackProperty, get current value
        if (typeof hierarchy.getValue === 'function') {
            hierarchy = hierarchy.getValue(Cesium.JulianDate.now());
        }

        // Extract positions depending on type
        if (hierarchy instanceof Cesium.PolygonHierarchy) {
            return hierarchy.positions || [];
        }
        if (Array.isArray(hierarchy)) {
            return hierarchy;
        }
        if (hierarchy.positions) {
            return hierarchy.positions;
        }
        return [];
    }

    /**
     * Check if a polygon entity is within bounds
     * @param {Object} entity - Polygon entity to check
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @returns {boolean} - true if polygon is within bounds
     */
    function checkEntityBounds(entity, viewer) {
        if (!entity || !entity.polygon) return false;

        const spoordokEntity = getSpoordokEntity(viewer);
        if (!spoordokEntity) {
            console.warn('Spoordok boundary not found - cannot check bounds');
            return true; // Allow placement if boundary not found
        }

        const polygonPositions = getPositionsFromHierarchy(entity.polygon.hierarchy);
        const spoordokPositions = getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);

        return isPolygonInsideBounds(polygonPositions, spoordokPositions);
    }

    /**
     * Apply visual feedback to an out-of-bounds polygon
     * @param {Object} entity - Polygon entity
     */
    function markPolygonOutOfBounds(entity) {
        if (!entity || !entity.polygon) return;

        // Store original material if not already stored
        if (!entity._originalMaterial) {
            const currentMaterial = entity.polygon.material;
            if (currentMaterial && currentMaterial.getValue) {
                entity._originalMaterial = currentMaterial.getValue(Cesium.JulianDate.now());
            } else {
                entity._originalMaterial = currentMaterial || Cesium.Color.WHITE;
            }
        }

        // Set red outline
        entity.polygon.outlineColor = Cesium.Color.RED;
        entity.polygon.outline = true;
        entity.polygon.outlineWidth = 3.0;
        
        // Store flag and add to tracking set
        entity._outOfBounds = true;
        outOfBoundsEntities.add(entity);
    }

    /**
     * Remove out-of-bounds visual feedback from a polygon
     * @param {Object} entity - Polygon entity
     */
    function clearPolygonOutOfBounds(entity) {
        if (!entity || !entity.polygon) return;

        // Restore original outline (typically none or based on type)
        entity.polygon.outline = false;
        entity.polygon.outlineColor = Cesium.Color.WHITE;
        entity.polygon.outlineWidth = 0;
        
        // Clear flag and remove from tracking set
        entity._outOfBounds = false;
        outOfBoundsEntities.delete(entity);
    }

    /**
     * Update the warning message based on current out-of-bounds count
     */
    function updateBoundsWarning() {
        const count = outOfBoundsEntities.size;
        
        if (count > 0) {
            const message = count === 1 
                ? '⚠️ 1 polygon is outside the valid area! Move it inside the boundary.'
                : `⚠️ ${count} polygons are outside the valid area! Move them inside the boundary.`;
            showBoundsWarning(message);
        } else {
            hideBoundsWarning();
        }
    }

    /**
     * Show warning message at top middle of screen
     * @param {string} message - Warning message to display
     */
    function showBoundsWarning(message) {
        let warningDiv = document.getElementById('boundsWarning');
        
        if (!warningDiv) {
            warningDiv = document.createElement('div');
            warningDiv.id = 'boundsWarning';
            warningDiv.style.position = 'fixed';
            warningDiv.style.top = '20px';
            warningDiv.style.left = '50%';
            warningDiv.style.transform = 'translateX(-50%)';
            warningDiv.style.backgroundColor = 'rgba(145, 18, 18, 0.95)';
            warningDiv.style.color = 'white';
            warningDiv.style.padding = '12px 24px';
            warningDiv.style.borderRadius = '8px';
            warningDiv.style.fontSize = '16px';
            warningDiv.style.fontWeight = 'bold';
            warningDiv.style.zIndex = '10000';
            warningDiv.style.boxShadow = '0 4px 6px rgba(0, 0, 0, 0.3)';
            warningDiv.style.transition = 'opacity 0.3s';
            document.body.appendChild(warningDiv);
        }

        warningDiv.textContent = message;
        warningDiv.style.opacity = '1';
        warningDiv.style.display = 'block';
    }

    /**
     * Hide the bounds warning message
     */
    function hideBoundsWarning() {
        const warningDiv = document.getElementById('boundsWarning');
        if (warningDiv) {
            warningDiv.style.opacity = '0';
            setTimeout(() => {
                if (warningDiv) {
                    warningDiv.style.display = 'none';
                }
            }, 300);
        }
    }

    /**
     * Check and update bounds status for a polygon
     * @param {Object} entity - Polygon entity to check
     * @param {Cesium.Viewer} viewer - The Cesium viewer instance
     * @returns {boolean} - true if within bounds, false if out of bounds
     */
    function validateAndMarkPolygon(entity, viewer) {
        if (!entity || !entity.polygon) return true;
        
        // Skip Spoordok itself
        if (entity.properties && entity.properties.isSpoordok) return true;

        const isWithinBounds = checkEntityBounds(entity, viewer);

        if (!isWithinBounds) {
            markPolygonOutOfBounds(entity);
        } else {
            clearPolygonOutOfBounds(entity);
        }
        
        // Update warning message based on current count
        updateBoundsWarning();
        
        return isWithinBounds;
    }

    /**
     * Remove an entity from tracking (e.g., when deleted)
     * @param {Object} entity - Entity to remove from tracking
     */
    function removeEntityFromTracking(entity) {
        if (entity && outOfBoundsEntities.has(entity)) {
            outOfBoundsEntities.delete(entity);
            updateBoundsWarning();
        }
    }

    // Export functions to global scope
    window.boundsChecker = {
        isPointInsidePolygon,
        isPolygonInsideBounds,
        getSpoordokEntity,
        getPositionsFromHierarchy,
        checkEntityBounds,
        markPolygonOutOfBounds,
        clearPolygonOutOfBounds,
        showBoundsWarning,
        hideBoundsWarning,
        validateAndMarkPolygon,
        updateBoundsWarning,
        removeEntityFromTracking
    };

})();
