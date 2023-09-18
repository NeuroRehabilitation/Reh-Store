const { contextBridge, ipcRenderer, IpcRendererEvent } = require("electron");
const remote = require("@electron/remote");
const fs = require("fs-extra");
const path = require("path");
var AdmZip = require("adm-zip");
const archiver = require("archiver");

let session_token =
  "SESSION_TOKEN";

contextBridge.exposeInMainWorld("electron", {
  installer: {
    configure: async (software_id, type, version) => {
      console.log("!!!!!! Data: ", software_id, " ", type, " ", version);
    },
  },
  getSessionDetails: async () => {
    return new Promise((resolve, reject) => {
      ipcRenderer.send("account-manager-getUsername-channel");
      ipcRenderer.once(
        "account-manager-getUsername-channel",
        (_event, username) => {
          resolve({
            token: session_token,
            username,
          });
        }
      );
    });
  },
  setDebugToken: (token) => {
    session_token = token;
  },
  fetch: async (...params) => {
    return new Promise((resolve, reject) => {
      //Generate request id
      const randomID = Date.now() + "-" + Math.round(Math.random() * 1e9);

      ipcRenderer.send("rua-fetch", [randomID, ...params]);
      ipcRenderer.once("rua-fetch-" + randomID, (_event, args) =>
        resolve(JSON.parse(args))
      );
    });
  },
  fetchUploadFile: async (...params) => {
    return new Promise((resolve, reject) => {
      //Generate request id
      const randomID = Date.now() + "-" + Math.round(Math.random() * 1e9);

      ipcRenderer.send("rua-fetch-file-upload", [randomID, ...params]);
      ipcRenderer.once("rua-fetch-file-upload-" + randomID, (_event, args) =>
        resolve(JSON.parse(args))
      );
    });
  },
  fetchDownloadFile: async (...params) => {
    return new Promise((resolve, reject) => {
      //Generate request id
      const randomID = Date.now() + "-" + Math.round(Math.random() * 1e9);

      ipcRenderer.send("rua-fetch-file-download", [randomID, ...params]);
      ipcRenderer.once("rua-fetch-file-download-" + randomID, (_event, args) =>
        resolve()
      );
    });
  },
  file_system: {
    remove: async (target) => {
      await fs.remove(target);
      return;
    },
    ensureDir: async (directory) => {
      await fs.ensureDir(directory);
      return;
    },
    ensureFile: async (directory) => {
      await fs.ensureFile(directory);
      return;
    },
    move: async (from, to) => {
      await fs.move(from, to);
      return;
    },
    copy: async (from, to, overwrite = false) => {
      await fs.copy(from, to, { overwrite });
    },
    readJSONFile: async (directory) => {
      return await fs.readJSON(directory);
    },
    writeJSONFile: async (directory, jsonOBJ) => {
      return await fs.writeJSON(directory, jsonOBJ);
    },
    folderPrompt: async (message) => {
      let properties = ["openDirectory"];

      const result = await remote.dialog.showOpenDialog({
        title: message,
        properties,
      });
      if (result.canceled === true) return undefined;
      else return result.filePaths[0];
    },
    path: {
      //TODO: Make all paths POSIX only
      join: (...params) => {
        return path.join(...params);
      },
      softwarePath: path.join(
        remote.app.getPath("userData"),
        "app_data",
        "software"
      ),
      //Return current app installation folder
      //appPath: file_manager.directory_list.app_data,
      //Return current app documents folder
      //appDataPath: file_manager.directory_list.app_data,
    },
    writeFile: async (directory, content) => {
      return await fs.writeFile(directory, content);
    },
    readFile: async (directory) => {
      return await fs.readFile(directory);
    },
    filePrompt: async (message, multipleFiles = false, filters = []) => {
      let properties = ["openFile"];
      if (multipleFiles) properties.push("multiSelections");

      const result = await remote.dialog.showOpenDialog({
        title: message,
        properties,
        filters,
      });
      if (result.canceled === true) return undefined;
      else
        return multipleFiles === true ? result.filePaths : result.filePaths[0];
    },
    fileSavePrompt: async (message, filename, filters = []) => {
      let properties = [];

      const result = await remote.dialog.showSaveDialog({
        title: message,
        defaultPath: filename,
        properties,
        filters,
      });

      return result.filePath;
    },
    zip: {
      create: (inputFolder = "", outputFile = "") => {
        return new Promise((resolve, reject) => {
          console.log("Creating installer, please wait...");
          let outputStream = fs.createWriteStream(outputFile);
          let outputArchive = archiver("zip", {
            comment: "Created with ORI Desktop App",
            zlib: { level: 9 },
          });

          outputStream.on("close", () => {
            console.log("Installer saved at", outputFile);
            resolve(true);
          });

          outputArchive.on("error", (err) => {
            console.log("Error", err);
            reject(err);
          });

          outputArchive.pipe(outputStream);

          outputArchive.directory(inputFolder, false);

          outputArchive.finalize();
        });
      },
      extract: async (inputFile, outputFolder) => {
        return new Promise((resolve, reject) => {
          var admZipObject = new AdmZip(inputFile);

          admZipObject.extractAllToAsync(outputFolder, true, true, (error) => {
            console.log("Done!");
            if (error) reject(error);
            else resolve();
            return;
          });
        });
      },
    },
  },


  language: () => {
    return "en-US";
  },
  maximizeWindow: () => {
    var window = remote.BrowserWindow.getFocusedWindow();
    if (!window.isMaximized()) {
      window.maximize();
    } else {
      window.unmaximize();
    }
  },
  minimizeWindow: () => {
    var window = remote.getCurrentWindow();
    window.minimize();
  },
  closeWindow: () => {
    var window = remote.getCurrentWindow();
    window.close();
  },
  ipcRenderer: {
    sendMessage(channel, args) {
      ipcRenderer.send(channel, args);
    },
    on(channel, func) {
      const subscription = (_event, ...args) => func(...args);
      ipcRenderer.on(channel, subscription);

      return () => {
        ipcRenderer.removeListener(channel, subscription);
      };
    },
    once(channel, func) {
      ipcRenderer.once(channel, (_event, ...args) => func(...args));
    },
  },
});
