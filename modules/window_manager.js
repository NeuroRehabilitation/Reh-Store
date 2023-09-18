const { app, BrowserWindow, shell } = require("electron");
/*const {
    setupScreenSharingMain
} = require("@jitsi/electron-sdk");*/
const path = require("path");

let aux = {
  UpsertKeyValue: function (obj, keyToChange, value) {
    const keyToChangeLower = keyToChange.toLowerCase();
    for (const key of Object.keys(obj)) {
      if (key.toLowerCase() === keyToChangeLower) {
        // Reassign old key
        obj[key] = value;
        // Done
        return;
      }
    }
    // Insert at end instead
    obj[keyToChange] = value;
  },
};

const window_manager = {
  window_list: {},
  window_icon: undefined,
  open: (
    width = 800,
    height = 800,
    minWidth = 800,
    minHeight = 800,
    filePath,
    window_name = "",
    enableDevTools = false,
    disableXFrameOption = false,
    corsDomains = undefined
  ) => {
    if (window_name === "") {
      return false;
    }
    //Don't allow 2 same windows openned at same time
    if (window_manager.window_list[window_name] !== undefined) {
      try {
        if (window_manager.window_list[window_name].isMinimized())
          window_manager.window_list[window_name].restore();
        window_manager.window_list[window_name].focus();
        return true;
      } catch (err) {
        return false;
      }
    }

    let win;

    let browserWindowSettings = {
      width: width,
      height: height,
      minHeight: minHeight,
      minWidth: minWidth,
      icon: path.join(app.getAppPath(), "icon.ico"),
      frame: false,
      transparent: true,
      webPreferences: {
        devTools: true, //enableDevTools,
        //preload: path.join(app.getAppPath(), 'preload.js'),
        nodeIntegrationInSubFrames: true,
        nodeIntegration: true,
        contextIsolation: false,
        enableRemoteModule: true,
      },
      //Enable transparent background
      backgroundColor: "#0000ffff",
    };
    if (window_name.includes("jitsi")) {
      browserWindowSettings.webPreferences.nativeWindowOpen = true;
    }
    win = new BrowserWindow(browserWindowSettings);
    if (window_name.includes("jitsi")) {
      //setupScreenSharingMain(win);
    }

    win.webContents.session.webRequest.onHeadersReceived(
      (details, callback) => {
        let { responseHeaders } = details;

        if (disableXFrameOption) {
          responseHeaders = Object.fromEntries(
            Object.entries(responseHeaders).filter(
              (header) => !/x-frame-options/i.test(header[0])
            )
          );
        }

        if (corsDomains) {
          aux.UpsertKeyValue(
            responseHeaders,
            "Access-Control-Allow-Origin",
            corsDomains
          );
          //aux.UpsertKeyValue(responseHeaders, 'Access-Control-Allow-Credentials', 'true');
        }

        callback({ responseHeaders });
      }
    );

    win.loadFile(filePath);
    win.webContents.on("new-window", (event, url, frameName) => {
      event.preventDefault();
      shell.openExternal(url);
    });

    if (enableDevTools) win.webContents.openDevTools();

    win.on("close", () => {
      delete window_manager.window_list[window_name];
    });

    window_manager.window_list[window_name] = win;
    return true;
  },
  close: (window_name = "") => {
    if (window_name === "" || window_name === undefined) {
      return false;
    }

    window_manager.window_list[window_name].close();
    delete window_manager.window_list[window_name];
  },
  closeAll: () => {
    Object.keys(window_manager.window_list).forEach((window) => {
      console.log(window);
      if (window !== undefined) window_manager.close(window);
    });
  },
  list: () => {
    return Object.keys(window_manager.window_list);
  },
  get: (window_name = "") => {
    return window_manager.window_list[window_name];
  },
};

module.exports = window_manager;
