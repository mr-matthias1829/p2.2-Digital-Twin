// Goals.js - Goal checking system for Digital Twin
//
// GOAL SYSTEM OVERVIEW:
// 1. Creates UI panel to display project goals
// 2. Collects all polygons from the 3D map
// 3. Sends data to backend for goal checking
// 4. Displays results (achieved/not achieved) with visual indicators
//
// HOW IT CONNECTS TO BACKEND:
// - Frontend collects polygon geometry (positions, types, heights)
// - Sends POST request to /api/data/goals endpoint
// - Backend calculates occupation and checks against database goals
// - Frontend displays the results with checkmarks (✓) or crosses (✗)

/**
 * INITIALIZE GOAL UI
 * 
 * Creates the visual elements for the goals panel:
 * - Toggle button in the corner
 * - Collapsible panel to show/hide goals
 * - Container for goal list
 * 
 * Called once on page load
 */
function initializeGoalsUI() {
    // Create the toggle button (🎯 icon) that opens/closes the goals panel
    const goalsToggle = document.createElement('button');
    goalsToggle.id = 'goalsToggle';
    goalsToggle.textContent = '🎯';
    goalsToggle.onclick = toggleGoals;
    document.body.appendChild(goalsToggle);

    // Create the goals info panel (initially collapsed/hidden)
    const goalsInfo = document.createElement('div');
    goalsInfo.id = 'goalsInfo';
    goalsInfo.className = 'collapsed';  // CSS class hides the panel
    goalsInfo.innerHTML = `
        <h3>Project Goals</h3>
        <div id="goalsList"></div>
    `;
    document.body.appendChild(goalsInfo);
}

/**
 * Toggle goals panel visibility
 * 
 * Shows or hides the goals panel when user clicks the 🎯 button.
 * Uses CSS classes to animate the transition.
 */
function toggleGoals() {
    const panel = document.getElementById('goalsInfo');
    const btn = document.getElementById('goalsToggle');
    panel.classList.toggle('collapsed');  // Show/hide panel
    btn.classList.toggle('open');         // Animate button
}

/**
 * Update goals display with current map data
 * 
 * Main function that:
 * 1. Collects all polygon data from the 3D map (Cesium viewer)
 * 2. Sends data to backend for goal checking
 * 3. Displays the results in the UI
 * 
 * PROCESS FLOW:
 * Step 1: Find Spoordok boundary polygon
 * Step 2: Collect all building polygons with their properties
 * Step 3: Send POST request to backend /api/data/goals
 * Step 4: Backend checks goals against database
 * Step 5: Display results with visual indicators
 * 
 * Called whenever polygons are created/edited/deleted
 * 
 * @returns {Promise<void>}
 */
async function updateGoalsDisplay() {
    try {
        // STEP 1: Find the Spoordok polygon (boundary area)
        // This is the outer boundary that contains all buildings
        const spoordokEntity = viewer.entities.values.find(e =>
            e.properties && e.properties.isSpoordok && e.polygon
        );

        if (!spoordokEntity) {
            console.warn('Spoordok polygon not found for goals check');
            return;
        }

        // Extract Spoordok boundary vertices and convert to plain objects
        const spoordokPositions = _getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);
        const spoordokData = spoordokPositions.map(p => ({
            x: p.x,  // Cartesian3 coordinates
            y: p.y,
            z: p.z
        }));

        // STEP 2: Collect all building polygons from the 3D map
        // Loop through all entities (shapes) in the Cesium viewer
        const polygonAreas = [];
        viewer.entities.values.forEach(entity => {
            // Filter: Include only polygons that are NOT Spoordok or green roof overlays
            if (entity.polygon &&
                (!entity.properties || !entity.properties.isSpoordok) &&
                (!entity.properties || !entity.properties.isGreenRoofOverlay)) {
                
                // Extract polygon vertices
                const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
                if (positions && positions.length >= 3) {  // Need at least 3 points
                    
                    // Get building type (detached house, apartment, commercial, etc.)
                    let type = 'unknown';
                    if (entity.properties && entity.properties.buildType) {
                        const bt = entity.properties.buildType;
                        type = typeof bt.getValue === 'function' ? bt.getValue() : bt;
                    }
                    
                    // Get building height for volume calculations
                    // Height determines how many people can live/work in the building
                    let height = 0;
                    if (entity.polygon.extrudedHeight) {
                        const h = entity.polygon.extrudedHeight;
                        height = typeof h.getValue === 'function' ? h.getValue(Cesium.JulianDate.now()) : h;
                    }
                    
                    // Check if building has green roof (nature on top)
                    // This counts towards nature percentage in goals
                    const hasNatureOnTop = entity.hasNatureOnTop || false;
                    
                    // Add polygon data to array for backend
                    polygonAreas.push({
                        positions: positions.map(p => ({
                            x: p.x,  // 3D position coordinates
                            y: p.y,
                            z: p.z
                        })),
                        type: type,              // Building type
                        height: height,          // Building height in meters
                        hasNatureOnTop: hasNatureOnTop  // Green roof flag
                    });
                }
            }
        });

        // STEP 3: Send polygon data to backend for goal checking
        // Backend will:
        // 1. Calculate area and volume for each polygon
        // 2. Calculate occupation percentages by type
        // 3. Fetch goals from database
        // 4. Check if current values meet goal targets
        const url = 'http://localhost:8081/api/data/goals';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spoordokPositions: spoordokData,  // Boundary polygon
                polygonAreas: polygonAreas         // All building polygons
            })
        });

        if (!response.ok) {
            throw new Error(`Backend goals API failed: HTTP ${response.status}`);
        }

        // STEP 4: Parse response from backend
        // Response contains array of goals with:
        // - id: goal identifier
        // - description: human-readable text
        // - achieved: true/false
        // - currentValue: actual measured value
        // - targetValue: goal target from database
        const result = await response.json();

        // STEP 5: Display goals in the UI with visual indicators
        displayGoals(result.goals);

    } catch (error) {
        // Handle any errors (network issues, backend down, etc.)
        console.error('Error updating goals:', error);
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = '<div class="goal-item error">Error loading goals</div>';
        }
    }
}

/**
 * Display goals in UI with visual indicators
 * 
 * Takes goal data from backend and creates visual elements:
 * - Green checkmark (✓) for achieved goals
 * - Red cross (✗) for unachieved goals
 * - Goal description and current/target values
 * 
 * @param {Array<Object>} goals - Array of goal objects from backend
 * @param {string} goals[].id - Goal identifier (e.g., "nature_min")
 * @param {string} goals[].description - Human-readable description
 * @param {boolean} goals[].achieved - Whether goal is met
 * @param {number} goals[].currentValue - Current measured value
 * @param {number} goals[].targetValue - Target value from database
 */
function displayGoals(goals) {
    const goalsList = document.getElementById('goalsList');
    if (!goalsList || !goals) return;

    // Clear previous goal display
    goalsList.innerHTML = '';
    
    // Create visual element for each goal
    goals.forEach(goal => {
        // Container for this goal (CSS class determines color: green or red)
        const goalItem = document.createElement('div');
        goalItem.className = `goal-item ${goal.achieved ? 'achieved' : 'not-achieved'}`;
        
        // Checkmark or cross icon
        const checkmark = goal.achieved ? '✓' : '✗';  // ✓ = achieved, ✗ = not achieved
        const icon = document.createElement('span');
        icon.className = 'goal-icon';
        icon.textContent = checkmark;
        
        // Goal description from database (e.g., "Minimum 20% nature")
        const description = document.createElement('span');
        description.className = 'goal-description';
        description.textContent = goal.description;
        
        // Current vs target value display
        const value = document.createElement('span');
        value.className = 'goal-value';
        
        // Format display based on goal type
        if (goal.id === 'people_min' || goal.id === 'residents_min' || goal.id === 'workers_min') {
            // People goals: Show as numbers (e.g., "2500 / 3000")
            value.textContent = `(${Math.round(goal.currentValue)} / ${Math.round(goal.targetValue)})`;
        } else {
            // Percentage goals: Show as % (e.g., "25.3%")
            value.textContent = `(${goal.currentValue.toFixed(1)}%)`;
        }
        
        // Assemble the goal item: [icon] [description] [value]
        goalItem.appendChild(icon);
        goalItem.appendChild(description);
        goalItem.appendChild(value);
        
        // Add to goals list in the panel
        goalsList.appendChild(goalItem);
    });
}

// Export functions to global scope so they can be called from other files
// - initializeGoalsUI() called on page load (main.js or mainInit.js)
// - updateGoalsDisplay() called when polygons change (create/edit/delete)
window.initializeGoalsUI = initializeGoalsUI;
window.updateGoalsDisplay = updateGoalsDisplay;
