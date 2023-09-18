const path = require('path');
let { ipcRenderer, shell } = require('electron');
const remote = require('@electron/remote')

const { app } = remote;

window.onerror = function (error, url, line) {
    ipcRenderer.send('rehstore-window-onError', error);
};

const currentWindow = remote.BrowserWindow.getFocusedWindow();

const language_manager = require(path.join(__dirname, '..', '..', 'modules', 'language_manager'));

let languagePack = remote.getGlobal("sharedObj").language;

const updateLanguagePack = () => {
    languagePack = remote.getGlobal("sharedObj").language;
}