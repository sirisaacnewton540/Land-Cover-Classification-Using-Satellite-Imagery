// Load Landsat 9 data
var dataset = ee.ImageCollection('LANDSAT/LC09/C02/T1_L2')
  .filterDate('2022-01-01', '2022-05-30')
  .filterBounds(roi)
  .filterMetadata('CLOUD_COVER', 'less_than', 10);

// Applies scaling factors
function applyScaleFactors(image) {
  var opticalBands = image.select(['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B6', 'SR_B7'])
                          .multiply(0.0000275).add(-0.2); 
  var thermalBands = image.select('ST_B10').multiply(0.00341802).add(149.0);
  return image.addBands(opticalBands, null, true)
              .addBands(thermalBands, null, true);
}

// Apply the scale factors to the dataset
var rescaledDataset = dataset.map(applyScaleFactors);

// Get the median of the rescaled dataset
var image = rescaledDataset.median();

// Visualization settings
var visualization = {
  bands: ['SR_B4', 'SR_B3', 'SR_B2'], // Using the Red, Green, Blue bands
  min: 0.0,
  max: 0.3
};

// Display the image on the map
Map.addLayer(image.clip(roi), visualization, "Landsat 9");
Map.centerObject(roi, 10);

// Create Training Data by merging the classes
var training = barren.merge(Forest).merge(urban);
print(training);

// Define the label and the bands to use for classification
var label = 'Class';
var bands = ['SR_B1', 'SR_B2', 'SR_B3', 'SR_B4', 'SR_B5', 'SR_B7']; // Updated bands

// Select the input bands
var input = image.select(bands);

// Sample the input image at the training points
var trainImage = input.sampleRegions({
  collection: training,
  properties: [label],
  scale: 30
}); 

print(trainImage);

// Randomly split the data into training and testing sets
var trainingData = trainImage.randomColumn();
var trainSet = trainingData.filter(ee.Filter.lessThan('random', 0.8)); 
var testSet = trainingData.filter(ee.Filter.greaterThanOrEquals('random', 0.8));

// Make a Random Forest classifier and train it
var classifier = ee.Classifier.smileRandomForest(10)
  .train({
    features: trainSet, 
    classProperty: label,
    inputProperties: bands
  });

// Classify the input image using the trained classifier
var classified = input.classify(classifier);

// Define a palette for the classification
var landcoverPalette = [
  '#e31a1c', // urban (1)
  '#005a32', // forest (2)
  '#FF8000', // agri (3)
]; 

// Display the classified map
Map.addLayer(classified.clip(roi), 
  {palette: landcoverPalette, min: 0, max: 3}, 'Land Cover Classification');

// Accuracy Assessment

// Classify the test set and get a confusion matrix
var testClassification = testSet.classify(classifier);
var confusionMatrix = testClassification.errorMatrix({
  actual: label,
  predicted: 'classification'
});

print('Confusion Matrix:', confusionMatrix); 
print('Overall Accuracy:', confusionMatrix.accuracy());
print('Producers Accuracy:', confusionMatrix.producersAccuracy()); 
print('Consumers Accuracy:', confusionMatrix.consumersAccuracy());
