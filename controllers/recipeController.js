const Recipe = require('../models/Recipe');

exports.getAll = async (req, res) => {
  const recipes = await Recipe.find();
  res.json(recipes);
};

exports.getOne = async (req, res) => {
  const recipe = await Recipe.findById(req.params.id);
  res.json(recipe);
};

exports.create = async (req, res) => {
  const recipe = await Recipe.create({ ...req.body, userId: req.user.userId });
  res.status(201).json(recipe);
};

exports.update = async (req, res) => {
  const recipe = await Recipe.findByIdAndUpdate(req.params.id, req.body, { new: true });
  res.json(recipe);
};

exports.delete = async (req, res) => {
  await Recipe.findByIdAndDelete(req.params.id);
  res.status(204).send();
};
