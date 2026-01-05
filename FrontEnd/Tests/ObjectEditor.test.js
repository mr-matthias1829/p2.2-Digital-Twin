import { describe, it, expect, beforeEach, vi } from 'vitest';

// Load the ObjectEditor class
import '../ObjectEditor.js';
const { ObjectEditor } = global;


// The actual tests are here:
describe('ObjectEditor', () => {
  let mockViewer;
  let editor;

  beforeEach(() => {
    // Create a mock Cesium viewer
    mockViewer = {
      entities: {
        add: vi.fn(),
        remove: vi.fn()
      },
      scene: {
        screenSpaceCameraController: {
          enableRotate: true,
          enableTranslate: true
        },
        pick: vi.fn(),
        globe: {
          pick: vi.fn()
        }
      },
      camera: {
        getPickRay: vi.fn()
      }
    };

    editor = new ObjectEditor(mockViewer);
  });

global.getEntityType = vi.fn(() => 'BUILDING');
global.setEntityType = vi.fn();
global.getTypeById = vi.fn((id) => ({ id, name: 'MockType' }));
global.updateModelRotation = vi.fn();
global.updateModelScale = vi.fn();
global.updateModelPosition = vi.fn();
global.updateModelType = vi.fn();








  describe('constructor', () => {
    it('initializes with correct default values', () => {
      expect(editor.viewer).toBe(mockViewer);
      expect(editor.editMode).toBe(false);
      expect(editor.editingEntity).toBe(null);
      expect(editor.editingModel).toBe(null);
      expect(editor.vertexEntities).toEqual([]);
    });
  });

  describe('isProtectedEntity', () => {
    it('returns false for null entity', () => {
      expect(editor.isProtectedEntity(null)).toBe(false);
    });

    it('returns true for entity with isSpoordok property', () => {
      const entity = {
        properties: { isSpoordok: true }
      };
      expect(editor.isProtectedEntity(entity)).toBe(true);
    });

    it('returns true for entity named Spoordok', () => {
      const entity = { name: 'Spoordok' };
      expect(editor.isProtectedEntity(entity)).toBe(true);
    });

    it('returns false for regular entity', () => {
      const entity = { name: 'Regular Building' };
      expect(editor.isProtectedEntity(entity)).toBe(false);
    });
  });

  describe('editingWhat', () => {
    it('returns null when not editing', () => {
      expect(editor.editingWhat()).toBe(null);
    });

    it('returns "model" when editing a model', () => {
      editor.editingModel = { modelMatrix: {} };
      expect(editor.editingWhat()).toBe('model');
    });

    it('returns "polygon" when editing a polygon', () => {
      editor.editingEntity = { polygon: {} };
      expect(editor.editingWhat()).toBe('polygon');
    });
  });

  describe('stopEditing', () => {
    it('does nothing when not in edit mode', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      editor.stopEditing();
      expect(consoleSpy).not.toHaveBeenCalledWith(expect.stringContaining('EDIT MODE OFF'));
    });

    it('cleans up vertex entities when stopping polygon edit', () => {
      editor.editMode = true;
      editor.editingEntity = { polygon: { material: {} } };
      editor.vertexEntities = [
        { id: 'vertex1' },
        { id: 'vertex2' }
      ];

      editor.stopEditing();

      expect(editor.editMode).toBe(false);
      expect(editor.editingEntity).toBe(null);
      expect(editor.vertexEntities).toEqual([]);
      expect(mockViewer.entities.remove).toHaveBeenCalledTimes(2);
    });

    it('restores model appearance when stopping model edit', () => {
      const mockModel = {
        _originalColor: { red: 1, green: 0, blue: 0 },
        _originalSilhouette: { red: 0, green: 1, blue: 0 },
        _originalSilhouetteSize: 2,
        color: { red: 1, green: 1, blue: 0 },
        silhouetteColor: { red: 1, green: 1, blue: 0 },
        silhouetteSize: 3
      };

      editor.editMode = true;
      editor.editingModel = mockModel;

      editor.stopEditing();

      expect(mockModel.color).toEqual({ red: 1, green: 0, blue: 0 });
      expect(mockModel.silhouetteColor).toEqual({ red: 0, green: 1, blue: 0 });
      expect(mockModel.silhouetteSize).toBe(2);
      expect(editor.editingModel).toBe(null);
    });
  });

  describe('getPositions', () => {
    it('extracts positions from PolygonHierarchy', () => {
      const mockPositions = [
        { x: 1, y: 2, z: 3 },
        { x: 4, y: 5, z: 6 }
      ];
      
      // Mock Cesium.PolygonHierarchy
      const hierarchy = {
        positions: mockPositions
      };
      hierarchy.constructor = { name: 'PolygonHierarchy' };

      const result = editor.getPositions(hierarchy);
      expect(result).toEqual(mockPositions);
    });

    it('handles array of positions directly', () => {
      const positions = [{ x: 1, y: 2, z: 3 }];
      expect(editor.getPositions(positions)).toEqual(positions);
    });
  });

  describe('deleteVertex', () => {
    it('prevents deletion when only 3 vertices remain', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      editor.editMode = true;
      editor.vertexEntities = [
        { id: 'v1' },
        { id: 'v2' },
        { id: 'v3' }
      ];

      editor.deleteVertex(editor.vertexEntities[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('minimum 3 vertices')
      );
        expect(editor.vertexEntities.length).toBe(3);
    });

    it('prevents deletion on protected entity', () => {
      const consoleSpy = vi.spyOn(console, 'log');
      editor.editMode = true;
      editor.editingEntity = { properties: { isSpoordok: true } };
      editor.vertexEntities = [
        { id: 'v1' },
        { id: 'v2' },
        { id: 'v3' },
        { id: 'v4' }
      ];

      editor.deleteVertex(editor.vertexEntities[0]);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Protected polygon')
      );
      expect(mockViewer.entities.remove).not.toHaveBeenCalled();
    });
  });
});