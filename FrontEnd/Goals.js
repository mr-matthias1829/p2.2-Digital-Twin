// Goals.js - Goal checking system for Digital Twin

// Initialize goal UI on page load
function initializeGoalsUI() {
    // Create the toggle button for goals panel
    const goalsToggle = document.createElement('button');
    goalsToggle.id = 'goalsToggle';
    goalsToggle.textContent = '🎯';
    goalsToggle.onclick = toggleGoals;
    document.body.appendChild(goalsToggle);

    // Create the goals info panel
    const goalsInfo = document.createElement('div');
    goalsInfo.id = 'goalsInfo';
    goalsInfo.className = 'collapsed';
    goalsInfo.innerHTML = `
        <h3>Project Goals</h3>
        <div id="goalsList"></div>
    `;
    document.body.appendChild(goalsInfo);
}

function toggleGoals() {
    const panel = document.getElementById('goalsInfo');
    const btn = document.getElementById('goalsToggle');
    panel.classList.toggle('collapsed');
    btn.classList.toggle('open');
}

// Update goals display with data from backend
async function updateGoalsDisplay() {
    try {
        // Find the Spoordok polygon
        const spoordokEntity = viewer.entities.values.find(e =>
            e.properties && e.properties.isSpoordok && e.polygon
        );

        if (!spoordokEntity) {
            console.warn('Spoordok polygon not found for goals check');
            return;
        }

        // Get Spoordok positions
        const spoordokPositions = _getPositionsFromHierarchy(spoordokEntity.polygon.hierarchy);
        const spoordokData = spoordokPositions.map(p => ({
            x: p.x,
            y: p.y,
            z: p.z
        }));

        // Get all other polygons with their types
        const polygonAreas = [];
        viewer.entities.values.forEach(entity => {
            if (entity.polygon &&
                (!entity.properties || !entity.properties.isSpoordok) &&
                (!entity.properties || !entity.properties.isGreenRoofOverlay)) {  // Skip green roof overlays
                const positions = _getPositionsFromHierarchy(entity.polygon.hierarchy);
                if (positions && positions.length >= 3) {
                    let type = 'unknown';
                    if (entity.properties && entity.properties.buildType) {
                        const bt = entity.properties.buildType;
                        type = typeof bt.getValue === 'function' ? bt.getValue() : bt;
                    }
                    
                    // Get height for volume-based calculations
                    let height = 0;
                    if (entity.polygon.extrudedHeight) {
                        const h = entity.polygon.extrudedHeight;
                        height = typeof h.getValue === 'function' ? h.getValue(Cesium.JulianDate.now()) : h;
                    }
                    
                    // Get hasNatureOnTop status for green roof feature
                    const hasNatureOnTop = entity.hasNatureOnTop || false;
                    
                    polygonAreas.push({
                        positions: positions.map(p => ({
                            x: p.x,
                            y: p.y,
                            z: p.z
                        })),
                        type: type,
                        height: height,
                        hasNatureOnTop: hasNatureOnTop
                    });
                }
            }
        });

        // Call backend API for goal checking
        const url = 'http://localhost:8081/api/data/goals';
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                spoordokPositions: spoordokData,
                polygonAreas: polygonAreas
            })
        });

        if (!response.ok) {
            throw new Error(`Backend goals API failed: HTTP ${response.status}`);
        }

        const result = await response.json();

        // Display goals in UI
        displayGoals(result.goals);

    } catch (error) {
        console.error('Error updating goals:', error);
        const goalsList = document.getElementById('goalsList');
        if (goalsList) {
            goalsList.innerHTML = '<div class="goal-item error">Error loading goals</div>';
        }
    }
}

// Display individual goals with checkmarks
function displayGoals(goals) {
    const goalsList = document.getElementById('goalsList');
    if (!goalsList || !goals) return;

    goalsList.innerHTML = '';
    
    goals.forEach(goal => {
        const goalItem = document.createElement('div');
        goalItem.className = `goal-item ${goal.achieved ? 'achieved' : 'not-achieved'}`;
        
        const checkmark = goal.achieved ? '✓' : '✗';
        const icon = document.createElement('span');
        icon.className = 'goal-icon';
        icon.textContent = checkmark;
        
        const description = document.createElement('span');
        description.className = 'goal-description';
        description.textContent = goal.description;
        
        const value = document.createElement('span');
        value.className = 'goal-value';
        
        // Format value based on goal type
        if (goal.id === 'people_min' || goal.id === 'residents_min' || goal.id === 'workers_min') {
            // Show actual numbers for people/residents/workers goals
            value.textContent = `(${Math.round(goal.currentValue)} / ${Math.round(goal.targetValue)})`;
        } else {
            // Show percentage for other goals
            value.textContent = `(${goal.currentValue.toFixed(1)}%)`;
        }
        
        goalItem.appendChild(icon);
        goalItem.appendChild(description);
        goalItem.appendChild(value);
        
        goalsList.appendChild(goalItem);
    });
}

// Expose globally
window.initializeGoalsUI = initializeGoalsUI;
window.updateGoalsDisplay = updateGoalsDisplay;
