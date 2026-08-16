const BloodInventory = require('../models/BloodInventory');

const LOW_STOCK_THRESHOLD = 5; // units, per bloodGroup + componentType
const EXPIRY_WARNING_DAYS = 7;

const addBloodUnit = async (req, res) => {
  try {
    const { bloodGroup, componentType, quantity, collectionDate, expiryDate, hospital } = req.body;

    if (quantity === undefined || quantity < 0) {
      return res.status(400).json({ message: 'Quantity must be zero or greater.' });
    }
    if (
      !collectionDate ||
      !expiryDate ||
      Number.isNaN(Date.parse(collectionDate)) ||
      Number.isNaN(Date.parse(expiryDate))
    ) {
      return res.status(400).json({ message: 'Valid collection and expiry dates are required.' });
    }

    const unit = await BloodInventory.create({
      bloodGroup,
      componentType,
      quantity,
      collectionDate,
      expiryDate,
      hospital,
      addedBy: req.user.id,
    });

    res.status(201).json(unit);
  } catch (error) {
    res.status(400).json({ message: 'Error adding blood unit', error: error.message });
  }
};

const getInventory = async (req, res) => {
  try {
    const { bloodGroup, componentType, status, hospital } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (componentType) filter.componentType = componentType;
    if (status) filter.status = status;
    if (hospital) filter.hospital = hospital;

    const inventory = await BloodInventory.find(filter)
      .populate('addedBy', 'name email')
      .sort({ expiryDate: 1 });

    res.status(200).json(inventory);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching inventory', error: error.message });
  }
};

const getInventoryById = async (req, res) => {
  try {
    const unit = await BloodInventory.findById(req.params.id).populate('addedBy', 'name email');
    if (!unit) return res.status(404).json({ message: 'Blood unit not found.' });
    res.status(200).json(unit);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching blood unit', error: error.message });
  }
};

const updateBloodUnit = async (req, res) => {
  try {
    const unit = await BloodInventory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!unit) return res.status(404).json({ message: 'Blood unit not found.' });
    res.status(200).json(unit);
  } catch (error) {
    res.status(400).json({ message: 'Error updating blood unit', error: error.message });
  }
};

const deleteBloodUnit = async (req, res) => {
  try {
    const unit = await BloodInventory.findByIdAndDelete(req.params.id);
    if (!unit) return res.status(404).json({ message: 'Blood unit not found.' });
    res.status(200).json({ message: 'Blood unit deleted successfully.' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting blood unit', error: error.message });
  }
};

const getLowStockAlerts = async (req, res) => {
  try {
    const results = await BloodInventory.aggregate([
      { $match: { status: 'Available' } },
      {
        $group: {
          _id: { bloodGroup: '$bloodGroup', componentType: '$componentType' },
          totalQuantity: { $sum: '$quantity' },
        },
      },
      { $match: { totalQuantity: { $lt: LOW_STOCK_THRESHOLD } } },
      { $sort: { totalQuantity: 1 } },
    ]);

    res.status(200).json(results);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching low stock alerts', error: error.message });
  }
};

const getExpiryAlerts = async (req, res) => {
  try {
    const warningDate = new Date();
    warningDate.setDate(warningDate.getDate() + EXPIRY_WARNING_DAYS);

    const expiringSoon = await BloodInventory.find({
      status: 'Available',
      expiryDate: { $lte: warningDate, $gte: new Date() },
    }).sort({ expiryDate: 1 });

    const alreadyExpired = await BloodInventory.find({
      status: 'Available',
      expiryDate: { $lt: new Date() },
    }).sort({ expiryDate: 1 });

    res.status(200).json({ expiringSoon, alreadyExpired });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching expiry alerts', error: error.message });
  }
};

module.exports = {
  addBloodUnit,
  getInventory,
  getInventoryById,
  updateBloodUnit,
  deleteBloodUnit,
  getLowStockAlerts,
  getExpiryAlerts,
};