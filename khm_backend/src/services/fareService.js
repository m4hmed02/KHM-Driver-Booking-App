const FareSetting = require('../models/FareSettings');

exports.getFareSettings = async () => {
  return await FareSetting.find();
};

exports.getFareSettingByType = async (vehicleType = 'standard') => {
  let setting = await FareSetting.findOne({ vehicleType });
  if (!setting) {
    setting = { vehicleType, baseFare: 0, perKmRate: 0, perMinuteRate: 0 };
  }
  return setting;
};

// Yeh function miss ho raha hai jis ki wajah se error aa raha hai:
exports.upsertFareSetting = async (data) => {
  const { vehicleType, baseFare, perKmRate, perMinuteRate } = data;
  
  const setting = await FareSetting.findOneAndUpdate(
    { vehicleType: vehicleType || 'standard' },
    { baseFare, perKmRate, perMinuteRate },
    { new: true, upsert: true }
  );
  return setting;
};

exports.calculateRecommendedFare = async (vehicleType, distanceKm, durationMins) => {
  const setting = await this.getFareSettingByType(vehicleType);
  let totalFare = setting.baseFare + (distanceKm * setting.perKmRate) + (durationMins * setting.perMinuteRate);
  return Math.round(totalFare / 10) * 10;
};