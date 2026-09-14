const fareService = require('../services/fareService');

exports.getAllSettings = async (req, res) => {
  try {
    const settings = await fareService.getFareSettings();
    res.status(200).json(settings);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.updateSettings = async (req, res) => {
  try {

    const setting = await fareService.upsertFareSetting(req.body);
    res.status(200).json(setting);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

exports.calculateFare = async (req, res) => {
  try {

    const { vehicleType = 'standard', distanceKm, durationMins } = req.body;
    
    if (distanceKm === undefined || durationMins === undefined) {
      return res.status(400).json({ message: 'distanceKm and durationMins are required' });
    }

    const recommendedFare = await fareService.calculateRecommendedFare(vehicleType, distanceKm, durationMins);
    
    res.status(200).json({ 
      recommendedFare, 
      vehicleType, 
      distanceKm, 
      durationMins 
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};