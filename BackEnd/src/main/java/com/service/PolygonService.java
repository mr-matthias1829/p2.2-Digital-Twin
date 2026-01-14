package com.service;

import com.model.Polygon;
import java.util.List;

/**
 * Service for managing polygons in the digital twin.
 * Provides operations to create, read, update, and delete polygon structures.
 */
public interface PolygonService {
    /**
     * Saves a new polygon or updates an existing one.
     *
     * @param polygon the polygon to save
     * @return the saved polygon
     */
    Polygon savePolygon(Polygon polygon);
    
    /**
     * Retrieves all polygons from the database.
     *
     * @return list of all polygons
     */
    List<Polygon> getAllPolygons();
    
    /**
     * Finds a polygon by its ID.
     *
     * @param id the polygon ID
     * @return the polygon if found, null otherwise
     */
    Polygon getPolygonById(Long id);
    
    /**
     * Deletes a polygon by its ID.
     *
     * @param id the polygon ID to delete
     */
    void deletePolygon(Long id);
    
    /**
     * Deletes all polygons from the database.
     */
    void deleteAllPolygons();
}