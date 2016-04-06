'use strict';

import {hostname} from 'os';
import process from 'process';
import {name, version} from '../package.json';


/**
 * @returns current log level
 */

function getCurrentLogLevel() {
  return process.env.LOG_LEVEL || 'INFO'; // eslint-disable-line no-process-env
}

/**
 * Convert a log level name to a corresponding numerical value
 *
 * @param logLevel log level to convert
 * @returns numerical log level
 */

function getNumericalLogLevel(logLevel) {
  var logLevels = {
    OFF: 0,
    ERROR: 1,
    WARN: 2,
    WARNING: 2,
    INFO: 3,
    DEBUG: 4
  };

  var numericalLogLevel = logLevels[logLevel.toUpperCase()];
  return numericalLogLevel;
}

/**
 * Log as JSON to stdout
 *
 * @param level log level
 * @param msg message to log
 * @param args map of additional key/values to log
 */
function doLog(level, msg, args) {
  var currentNumericalLogLevel = getNumericalLogLevel(getCurrentLogLevel());
  var targetNumericalLogLevel = getNumericalLogLevel(level);

  var blob = {
    '@timestamp': (new Date()).toISOString(),
    '@version': 1,
    app: name,
    version: version,
    level: level.toUpperCase(),
    host: hostname(),
    pid: process.pid,
    msg: msg
  };

  if (currentNumericalLogLevel >= targetNumericalLogLevel) {
    console.log(JSON.stringify(Object.assign(blob, args))); // eslint-disable-line no-console
  }
}

export const log = {
  log: doLog,
  info: (msg, args) => doLog('info', msg, args),
  warn: (msg, args) => doLog('warn', msg, args),
  error: (msg, args) => doLog('error', msg, args),
  debug: (msg, args) => doLog('debug', msg, args)
};


export function userEncode(libraryId, userId) {
  return (userId || '') + '@' + (libraryId || '');
}

export function userDecode(username) {
  var splitPoint = username.lastIndexOf('@');
  var userId = username.substring(0, splitPoint);
  var libraryId = username.substring(splitPoint+1, username.length);
  var user = {libraryId: libraryId};

  if (userId) {
    user.id = userId;
  }

  return user;
}
