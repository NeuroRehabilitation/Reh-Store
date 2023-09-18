'use strict';
const electron = process.type === 'browser'
    ? require('electron')
    : require('@electron/remote');

if (typeof electron === 'string') {
    throw new TypeError('Not running in an Electron environment!');
}

const isEnvSet = 'ELECTRON_IS_DEV' in process.env;
const getFromEnv = Number.parseInt(process.env.ELECTRON_IS_DEV, 10) === 1;

module.exports = isEnvSet ? getFromEnv : !electron.app.isPackaged;
