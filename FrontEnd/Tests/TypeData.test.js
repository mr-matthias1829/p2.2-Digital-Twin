import { describe, it, expect, beforeEach, vi } from 'vitest';


import '../TypeData.js';
const { getAllType, getAllTypeIds, addBuildType, getTypeProperty, getTypeById } = global;

describe('TypeData', () => {
  describe('getAllTypes', () => {
    it('returns nothing as there are no types yet', () => {
        // 1: keys
      let result = getAllType();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);

      // 2: ids
      result = getAllTypeIds();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual([]);
      expect(result.length).toBe(0);
    });

    it('create and return the type', () => {
      addBuildType('testing_type', 'testing type', {test_property: 'testing_value'});

        // 1: keys
      let result = getAllType();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['testing_type']);
      expect(result.length).toBe(1);

        // 2: ids
      result = getAllTypeIds();
      expect(Array.isArray(result)).toBe(true);
      expect(result).toEqual(['testing type']);
      expect(result.length).toBe(1);
    });
  });

  describe('getTypeProperty', () => {
    it('create and use the type', () => {
      addBuildType('testing_type', 'testing type', {test_property: 'testing_value'});
      let result = getTypeProperty('testing_type', 'test_property');
      expect (result).toBe('testing_value');
    });

    it('ask for non-existent property and type', () => {
        // 1: no type exists
      let result = getTypeProperty('testing_type2', 'test_property');
      expect (result).toBe(null);

        // 2: type exists but property does not
      addBuildType('testing_type2', 'testing type 2', {test_property: 'testing_value'});
      result = getTypeProperty('testing_type2', 'not_a_property');
      expect (result).toBe(null);

        // 3: ask for a property that only exists in DEFAULT
      addBuildType('testing_type2', 'testing type 2', {test_property: 'testing_value'});
      result = getTypeProperty('testing_type2', 'default');
      expect (result).toBe('default');
    });
  });

  describe('getTypeById', () => {
    it('returns the correct type object', () => {
      addBuildType('testing_type', 'testing type', {test_property: 'testing_value'});
      let result = getTypeById('testing type');
      expect(result).toEqual('testing_type');
    });

    it('returns null for non-existent type ID', () => {
      let result = getTypeById('non_existent_type');
      expect(result).toBeNull();
    });
  });
});

// TODO: add more tests for types onto test objects