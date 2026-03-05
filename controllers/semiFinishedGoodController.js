const SemiFinishedGood = require('../models/SemiFinishedGood');

exports.getAll = async (req, res) => {
  try {
    const items = await SemiFinishedGood.find({ userId: req.user.userId }).populate('ingredients.inventoryId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await SemiFinishedGood.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
