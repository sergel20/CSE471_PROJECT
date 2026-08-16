const Cart = require('../models/Cart');
const BloodInventory = require('../models/BloodInventory');

async function totalReservedElsewhere(bloodUnitId, excludingUserId) {
  const result = await Cart.aggregate([
    { $match: { user: { $ne: excludingUserId } } },
    { $unwind: '$items' },
    { $match: { 'items.bloodUnit': bloodUnitId } },
    { $group: { _id: null, total: { $sum: '$items.quantity' } } },
  ]);
  return result[0]?.total || 0;
}

const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.bloodUnit');
    res.status(200).json(cart || { user: req.user.id, items: [] });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching cart', error: error.message });
  }
};

const addToCart = async (req, res) => {
  try {
    const { bloodUnitId, quantity } = req.body;
    const qty = Number(quantity);

    if (!bloodUnitId || !Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ message: 'A valid blood unit and quantity of at least 1 are required.' });
    }

    const unit = await BloodInventory.findById(bloodUnitId);
    if (!unit) return res.status(404).json({ message: 'Blood unit not found.' });
    if (unit.status !== 'Available') {
      return res.status(409).json({ message: 'This blood unit is no longer available.' });
    }
    if (new Date(unit.expiryDate) < new Date()) {
      return res.status(409).json({ message: 'This blood unit has expired.' });
    }

    let cart = await Cart.findOne({ user: req.user.id });
    if (!cart) cart = new Cart({ user: req.user.id, items: [] });

    const existingItem = cart.items.find((item) => item.bloodUnit.toString() === bloodUnitId);
    const alreadyInThisCart = existingItem ? existingItem.quantity : 0;
    const reservedByOthers = await totalReservedElsewhere(unit._id, req.user.id);
    const remainingAvailable = unit.quantity - reservedByOthers - alreadyInThisCart;

    if (qty > remainingAvailable) {
      return res.status(409).json({
        message: `Only ${Math.max(remainingAvailable, 0)} unit(s) are available to reserve.`,
      });
    }

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.items.push({ bloodUnit: bloodUnitId, quantity: qty });
    }

    await cart.save();
    const populated = await cart.populate('items.bloodUnit');
    res.status(200).json(populated);
  } catch (error) {
    res.status(400).json({ message: 'Error adding to cart', error: error.message });
  }
};

const updateCartItem = async (req, res) => {
  try {
    const { quantity } = req.body;
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 1) {
      return res.status(400).json({ message: 'Quantity must be at least 1.' });
    }

    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found.' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Cart item not found.' });

    const unit = await BloodInventory.findById(item.bloodUnit);
    if (!unit) return res.status(404).json({ message: 'Blood unit no longer exists.' });

    const reservedByOthers = await totalReservedElsewhere(unit._id, req.user.id);
    const remainingAvailable = unit.quantity - reservedByOthers;
    if (qty > remainingAvailable) {
      return res.status(409).json({
        message: `Only ${Math.max(remainingAvailable, 0)} unit(s) are available to reserve.`,
      });
    }

    item.quantity = qty;
    await cart.save();
    const populated = await cart.populate('items.bloodUnit');
    res.status(200).json(populated);
  } catch (error) {
    res.status(400).json({ message: 'Error updating cart item', error: error.message });
  }
};

const removeFromCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id });
    if (!cart) return res.status(404).json({ message: 'Cart not found.' });

    const item = cart.items.id(req.params.itemId);
    if (!item) return res.status(404).json({ message: 'Cart item not found.' });

    item.deleteOne();
    await cart.save();
    res.status(200).json({ message: 'Item removed from cart.' });
  } catch (error) {
    res.status(500).json({ message: 'Error removing cart item', error: error.message });
  }
};

const checkout = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.id }).populate('items.bloodUnit');
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Your cart is empty.' });
    }

    for (const item of cart.items) {
      const unit = item.bloodUnit;
      if (!unit || unit.status !== 'Available') {
        return res.status(409).json({ message: `A cart item is no longer available.` });
      }
      if (new Date(unit.expiryDate) < new Date()) {
        return res.status(409).json({ message: `${unit.bloodGroup} ${unit.componentType} in your cart has expired.` });
      }
      if (item.quantity > unit.quantity) {
        return res.status(409).json({
          message: `Only ${unit.quantity} unit(s) of ${unit.bloodGroup} ${unit.componentType} remain in stock.`,
        });
      }
    }

    for (const item of cart.items) {
      const unit = await BloodInventory.findById(item.bloodUnit._id);
      unit.quantity -= item.quantity;
      if (unit.quantity <= 0) {
        unit.quantity = 0;
        unit.status = 'Used';
      }
      await unit.save();
    }

    cart.items = [];
    await cart.save();

    res.status(200).json({ message: 'Checkout successful. Blood units reserved for you.' });
  } catch (error) {
    res.status(500).json({ message: 'Error during checkout', error: error.message });
  }
};

module.exports = { getCart, addToCart, updateCartItem, removeFromCart, checkout };