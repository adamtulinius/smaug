/**
 * @file: This file instantiates the sequelize models.
 */

export default function Models(sequelize, forceDBSync) {
  const models = {};
  const modelsToLoad = [
    'Client',
    'Token'
  ];

  modelsToLoad.forEach(model => {
    const Model = require(`./${model}.model.js`).default;
    models[model] = Model(sequelize, models);
    models[model].sync({force: forceDBSync});
  });

  return models;
}
