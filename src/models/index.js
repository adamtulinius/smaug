'use strict';

import fs from 'fs';
import path from 'path';
import Sequelize from 'sequelize';
import {log} from '../utils';

export default function models(config) {
  const basename = path.basename(module.filename);
  const sequelize = new Sequelize(process.env.DATABASE_URI || config.uri, {logging: log.debug});

  const db = {};

  fs
    .readdirSync(__dirname)
    .filter(function(file) {
      return (file.indexOf('.') !== 0) && (file !== basename) && (file.slice(-3) === '.js');
    })
    .forEach(function(file) {
      const model = sequelize['import'](path.join(__dirname, file));
      db[model.name] = model;
    });

  Object.keys(db).forEach(function(modelName) {
    if (db[modelName].associate) {
      db[modelName].associate(db);
    }
  });

  db.sequelize = sequelize;
  db.Sequelize = Sequelize;

  return db;
}
