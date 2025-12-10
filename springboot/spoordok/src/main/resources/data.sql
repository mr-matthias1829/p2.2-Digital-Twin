-- Initialize building types table with data from TypeData.js

-- Clear existing data
TRUNCATE TABLE building_types;

-- Insert building types
-- Note: Colors are converted from Cesium.Color to hex format

INSERT INTO building_types (type_id, color_hex, cost, income, people, livability) VALUES
-- Testing type
('poly', '#808080', 0, 0, 0, 5),

-- Infrastructure and nature
('nature', '#008000', 150, 0, 0, 10),
('water', '#1E88E5', 300, 0, 0, 7),
('road', '#A9A9A9', 100, 5, 0, 8),
('parking space', '#78909C', 100, 10, 0, 6),
('covered parking space', '#8D6E63', 1500, 15, 0, 10),

-- Residential buildings
('detached house', '#E53935', 500, 12, 0.005, 4),
('townhouse', '#FB8C00', 400, 8, 0.01, 6),
('apartment', '#8E24AA', 300, 12, 0.006, 5),

-- Commercial buildings
('commercial building', '#039BE5', 200, 15, 0.018, 2);
