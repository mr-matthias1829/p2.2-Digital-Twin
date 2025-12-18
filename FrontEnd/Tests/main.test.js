import { describe, it, expect, beforeEach, vi } from 'vitest';


import '../main.js';
import '../mainInit.js';
const { handleClickToDraw } = global;

describe('main', () => {
  describe('handleClickToDraw', () => {
  beforeEach(() => {
    activeShapePoints = [];
    drawingMode = "polygon";
    objType = "commercial";
  });
  
  it('should add first point on first click', () => {
    const pos = new Cesium.Cartesian3(10, 20, 30);
    const result = handleClickToDraw(pos);
    
    expect(result).toBe(true);
    expect(activeShapePoints.length).toBe(2); // point + floating
  });
  
  it('should reject when objType is none', () => {
    objType = "none";
    const pos = new Cesium.Cartesian3(10, 20, 30);
    const result = handleClickToDraw(pos);
    
    expect(result).toBe(false);
    expect(activeShapePoints.length).toBe(0);
  });
});

  
});