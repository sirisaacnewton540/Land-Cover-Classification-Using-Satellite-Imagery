# Land-Cover-Classification-Using-Satellite-Imagery

## **Project Overview**

This project implements a land cover classification system using Landsat 9 satellite imagery and a Random Forest classifier within Google Earth Engine (GEE). The classification distinguishes between three key land cover types: forests, urban areas, and barren land. The project is essential for understanding land use patterns, monitoring environmental changes, and aiding in sustainable development practices.

The process involves multiple steps including data preprocessing, feature extraction, model training, classification, and accuracy assessment, all conducted in the cloud-based GEE platform. This document outlines each step and provides detailed explanations of the code, showcasing expertise in remote sensing, machine learning, and environmental data analysis.

## **Results**
### Preparing the dataset
![Screenshot (668)](https://github.com/user-attachments/assets/0becb131-7549-432c-979e-b9cbf7e3ce53)

### Predictions
![Screenshot (669)](https://github.com/user-attachments/assets/b855cd88-63de-4311-ae00-994e1336787f)

## **Data Source**

The project utilizes the Landsat 9 Level-2 Collection, which offers high-quality surface reflectance products essential for land cover classification.

- **Dataset:** LANDSAT/LC09/C02/T1_L2
- **Time Period:** January 1, 2022 - May 30, 2022
- **Cloud Cover:** Filtered to include only images with less than 10% cloud cover.

## **Code Implementation and Explanation**

### **1. Loading Landsat 9 Data**

```javascript
var dataset = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterDate('2022-01-01', '2022-05-30')
  .filterBounds(roi)
  .filterMetadata('CLOUD_COVER', 'less_than', 10);
```

This code snippet loads the Landsat 9 image collection and filters it based on the following criteria:
- **Date Range:** Images captured between January 1, 2022, and May 30, 2022.
- **Region of Interest (ROI):** The study area defined by the variable `roi`.
- **Cloud Cover:** Images with less than 10% cloud cover are selected to minimize the impact of clouds on classification accuracy.

### **2. Applying Scale Factors**

```javascript
function applyScaleFactors(image) {
  var opticalBands = image.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
                          .multiply(0.0000275).add(-0.2); 
  var thermalBands = image.select('ST_B10').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

var rescaledDataset = dataset.map(applyScaleFactors);
```

Landsat 9 data is provided as digital numbers (DN) which need to be converted into physically meaningful units. This function `applyScaleFactors` performs the conversion:

- **Optical Bands:** Convert DN to surface reflectance using a scaling factor and offset.
- **Thermal Band:** Convert DN to brightness temperature (in Kelvin) using another scaling factor and offset.
  
The function is applied across the entire dataset using `map`, ensuring all images in the collection are rescaled.

### **3. Creating a Median Composite**

```javascript
var image = rescaledDataset.median();
```

A median composite of the rescaled dataset is generated. This composite reduces noise by taking the median value for each pixel across all images in the dataset. This step is crucial for minimizing the influence of outliers or transient artifacts like clouds.

### **4. Visualization of the Image**

```javascript
var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'], 
  min: 0.0,
  max: 0.3
};

Map.addLayer(image.clip(roi), visualization, "Landsat 9");
Map.centerObject(roi, 10);
```

Here, the RGB bands (Red, Green, Blue) are selected for visual representation. The image is clipped to the region of interest (`roi`) and then displayed on the map using GEE’s `Map.addLayer` function. The map is centered on the ROI for better visualization.

### **5. Preparing Training Data**

```javascript
var training = barren.merge(Forest).merge(urban);
```

Training data is created by merging the regions of interest (ROIs) corresponding to the three land cover classes:

- **Forest (Class 0)**
- **Urban (Class 1)**
- **Barren (Class 2)**

The merged training data represents a variety of land cover types necessary for accurate model training.

### **6. Defining the Label and Bands**

```javascript
var label = 'Class';
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7'];
```

The label 'Class' refers to the target variable that indicates the land cover type. The selected bands (features) are chosen based on their relevance to land cover classification, providing critical information on vegetation, urban areas, and barren lands.

### **7. Sampling the Input Image**

```javascript
var input = image.select(bands);

var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
}); 

print(trainImage);
```

This part of the code samples the input image at the training points defined by the `training` dataset. The `sampleRegions` function extracts pixel values corresponding to the selected bands and associates them with the land cover class (label). The scale is set to 30 meters, matching Landsat’s spatial resolution.

### **8. Splitting Data into Training and Testing Sets**

```javascript
var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8)); 
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));
```

To evaluate the model’s performance, the data is split into training and testing sets. A random column is added to facilitate this split, with 80% of the data used for training and 20% for testing.

### **9. Training the Random Forest Classifier**

```javascript
var classifier = ee.Classifier.smileRandomForest(10)
  .train({
    features: trainSet, 
    classProperty: label,
    inputProperties: bands
  });
```

A Random Forest classifier with 10 trees is trained on the training set. Random Forest is chosen for its robustness in handling large datasets and its ability to model complex interactions between features.

### **10. Classifying the Input Image**

```javascript
var classified = input.classify(classifier);

var landcoverPalette = [
  '#e31a1c', // urban (1)
  '#005a32', // forest (2)
  '#FF8000', // agri (3)
]; 

Map.addLayer(classified.clip(roi), 
  {palette: landcoverPalette, min: 0, max: 3}, 'Land Cover Classification');
```

The trained classifier is used to classify the input image, producing a thematic land cover map. The classified image is visualized with a custom color palette, making it easy to distinguish between different land cover types.

### **11. Accuracy Assessment**

```javascript
var testClassification = testSet.classify(classifier);
var confusionMatrix = testClassification.errorMatrix({
  actual: label,
  predicted: 'classification'
});

print('Confusion Matrix:', confusionMatrix); 
print('Overall Accuracy:', confusionMatrix.accuracy());
print('Producers Accuracy:', confusionMatrix.producersAccuracy()); 
print('Consumers Accuracy:', confusionMatrix.consumersAccuracy());
```

The model's accuracy is assessed by generating a confusion matrix, which compares the predicted land cover classes against the actual classes in the test set. Key metrics such as overall accuracy, producer’s accuracy (recall), and consumer’s accuracy (precision) are computed to evaluate the model’s performance.

## **Conclusion**

This project illustrates the application of remote sensing and machine learning techniques to land cover classification using Google Earth Engine. The steps outlined—from data preprocessing to accuracy assessment—demonstrate a methodical approach to solving complex environmental problems using state-of-the-art tools and techniques.

## **Future Work**

Potential future improvements and extensions include:

- **Incorporating Additional Data Sources:** Integrating data from additional sensors (e.g., Sentinel-2) or ancillary data (e.g., Digital Elevation Models) to enhance classification accuracy.
- **Temporal Analysis:** Expanding the analysis to include multiple time periods for monitoring land cover changes over time.
- **Exploring Advanced Algorithms:** Experimenting with other classification algorithms like Support Vector Machines (SVM) or Convolutional Neural Networks (CNNs) to compare their performance with the Random Forest classifier.

## **References**

- [Google Earth Engine Documentation](https://developers.google.com/earth-engine)
- [Landsat 9 Overview](https://www.usgs.gov/landsat-missions/landsat-9)

---

This README file offers a detailed explanation of the code, clarifies the methodology, and showcases the depth of knowledge required to execute such a project effectively.
