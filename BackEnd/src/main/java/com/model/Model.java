package com.model;

/**
 * Represents a 3D model instance in the digital twin visualization.
 * <p>
 * This class defines a positioned 3D model (such as a tree, building decoration, or person)
 * with its geographic location, height, orientation, and scale. Models are rendered in the
 * 3D city visualization to add detail and context to the environment.
 * </p>
 * <p>
 * The modelKey references a preloaded 3D model asset that is rendered at the specified location.
 * </p>
 *
 * @author Digital Twin Development Team
 * @version 1.0
 * @since 1.0
 */
public class Model {
    /**
     * Unique identifier for this model instance.
     */
    private Long id;
    
    /**
     * Longitude value in decimal degrees.
     * Represents the east-west position where the model is placed.
     */
    private Double longitude;
    
    /**
     * Latitude value in decimal degrees.
     * Represents the north-south position where the model is placed.
     */
    private Double latitude;
    
    /**
     * Height above ground level in meters.
     * Determines the vertical position of the model.
     */
    private Double height;
    
    /**
     * Rotation angle in degrees.
     * Controls the orientation of the model around its vertical axis.
     */
    private Double rotation;
    
    /**
     * Scale factor for the model.
     * A value of 1.0 represents the original size; values greater than 1.0 enlarge the model.
     */
    private Double scale;
    
    /**
     * Type classification for the model.
     * Used to categorize models for filtering or processing.
     */
    private String type;
    
    /**
     * Reference key to a preloaded 3D model asset.
     * Examples: "tree", "building", "man", "car"
     */
    private String modelKey;

    /**
     * Default constructor with sensible default values.
     * Initializes height and rotation to 0.0, scale to 1.0, and type to "DEFAULT".
     */
    public Model() {
        this.height = 0.0;
        this.rotation = 0.0;
        this.scale = 1.0;
        this.type = "DEFAULT";
    }

    /**
     * Constructs a Model with all properties specified.
     *
     * @param longitude the longitude in decimal degrees
     * @param latitude the latitude in decimal degrees
     * @param height the height above ground in meters
     * @param rotation the rotation angle in degrees
     * @param scale the scale factor
     * @param type the type classification
     * @param modelKey the reference to the preloaded model asset
     */
    public Model(Double longitude, Double latitude, Double height, Double rotation,
                 Double scale, String type, String modelKey) {
        this.longitude = longitude;
        this.latitude = latitude;
        this.height = height;
        this.rotation = rotation;
        this.scale = scale;
        this.type = type;
        this.modelKey = modelKey;
    }

    /**
     * Gets the unique identifier.
     *
     * @return the id
     */
    public Long getId() {
        return id;
    }

    /**
     * Sets the unique identifier.
     *
     * @param id the id to set
     */
    public void setId(Long id) {
        this.id = id;
    }

    /**
     * Gets the longitude value.
     *
     * @return the longitude in decimal degrees
     */
    public Double getLongitude() {
        return longitude;
    }

    /**
     * Sets the longitude value.
     *
     * @param longitude the longitude in decimal degrees to set
     */
    public void setLongitude(Double longitude) {
        this.longitude = longitude;
    }

    /**
     * Gets the latitude value.
     *
     * @return the latitude in decimal degrees
     */
    public Double getLatitude() {
        return latitude;
    }

    /**
     * Sets the latitude value.
     *
     * @param latitude the latitude in decimal degrees to set
     */
    public void setLatitude(Double latitude) {
        this.latitude = latitude;
    }

    /**
     * Gets the height above ground.
     *
     * @return the height in meters
     */
    public Double getHeight() {
        return height;
    }

    /**
     * Sets the height above ground.
     *
     * @param height the height in meters to set
     */
    public void setHeight(Double height) {
        this.height = height;
    }

    /**
     * Gets the rotation angle.
     *
     * @return the rotation in degrees
     */
    public Double getRotation() {
        return rotation;
    }

    /**
     * Sets the rotation angle.
     *
     * @param rotation the rotation in degrees to set
     */
    public void setRotation(Double rotation) {
        this.rotation = rotation;
    }

    /**
     * Gets the scale factor.
     *
     * @return the scale factor
     */
    public Double getScale() {
        return scale;
    }

    /**
     * Sets the scale factor.
     *
     * @param scale the scale factor to set
     */
    public void setScale(Double scale) {
        this.scale = scale;
    }

    /**
     * Gets the type classification.
     *
     * @return the type
     */
    public String getType() {
        return type;
    }

    /**
     * Sets the type classification.
     *
     * @param type the type to set
     */
    public void setType(String type) {
        this.type = type;
    }

    /**
     * Gets the model key reference.
     *
     * @return the model key
     */
    public String getModelKey() {
        return modelKey;
    }

    /**
     * Sets the model key reference.
     *
     * @param modelKey the model key to set
     */
    public void setModelKey(String modelKey) {
        this.modelKey = modelKey;
    }

    /**
     * Returns a string representation of the Model.
     *
     * @return a string containing all field values
     */
    @Override
    public String toString() {
        return "Model{" +
                "id=" + id +
                ", longitude=" + longitude +
                ", latitude=" + latitude +
                ", height=" + height +
                ", rotation=" + rotation +
                ", scale=" + scale +
                ", type='" + type + '\'' +
                ", modelKey='" + modelKey + '\'' +
                '}';
    }
}