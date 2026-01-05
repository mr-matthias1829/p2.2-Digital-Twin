// polygonDataCalculations.js - Service for fetching polygon data calculations
(function() {
    const API_BASE = 'http://localhost:8081';
    
    /**
     * Fetch calculated data for a polygon (cost, income, people, livability)
     * @param {Number} polygonId - The database ID of the polygon
     * @param {Number} area - The area of the polygon in m²
     * @param {Number} volume - The volume of the polygon in m³ (optional)
     * @returns {Promise<Object>} Object containing cost, income, people, livability, measurement, and calculationBase
     */
    async function getPolygonData(polygonId, area, volume) {
        if (!polygonId) {
            console.warn('No polygon ID provided for data calculation');
            return null;
        }
        
        if (!area || area === 0) {
            console.warn('No area provided for data calculation');
            return null;
        }
        
        try {
            let url = `${API_BASE}/api/data/polygons/${polygonId}/data?area=${area}`;
            if (volume && volume > 0) {
                url += `&volume=${volume}`;
            }
            
            const response = await fetch(url);
            
            if (!response.ok) {
                throw new Error(`Failed to fetch polygon data: HTTP ${response.status}`);
            }
            
            const data = await response.json();
            
            console.log(`✓ Polygon data fetched for ID ${polygonId}:`, data);
            return data;
        } catch (error) {
            console.error('Error fetching polygon data:', error);
            return null;
        }
    }
    
    /**
     * Format currency value to euros
     * @param {Number} value - The value in euros
     * @returns {String} Formatted string like "€1,234.56"
     */
    function formatCurrency(value) {
        if (value == null || isNaN(value)) return '€0.00';
        return '€' + value.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    /**
     * Format number with commas
     * @param {Number} value - The value to format
     * @param {Number} decimals - Number of decimal places (default: 0)
     * @returns {String} Formatted string like "1,234.56"
     */
    function formatNumber(value, decimals = 0) {
        if (value == null || isNaN(value)) return '0';
        return value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
    }
    
    // Export functions to global scope
    window.polygonDataCalculations = {
        getPolygonData: getPolygonData,
        formatCurrency: formatCurrency,
        formatNumber: formatNumber
    };
    
    console.log('✓ Polygon data calculations service loaded');
})();
