const FinishedGood = require('../models/FinishedGood');

exports.getAll = async (req, res) => {
  try {
    const items = await FinishedGood.find({})
      .populate({
        path: 'recipeId',
        select: 'title sellingPrice departmentId',
        populate: {
          path: 'departmentId',
          select: 'name code'
        }
      })
      .populate('ingredients.inventoryId');
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

exports.delete = async (req, res) => {
  try {
    await FinishedGood.findByIdAndDelete(req.params.id);
    res.status(204).send();
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
