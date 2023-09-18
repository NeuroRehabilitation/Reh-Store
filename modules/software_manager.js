var spawn = require("child_process").spawn;
const fs = require("fs-extra");
const path = require("path");
var AdmZip = require("adm-zip");
const archiver = require("archiver");
var os = require("os");
const { app, BrowserWindow, shell } = require("electron");

const file_manager = require("./file_manager");
const internet_manager = require("./internet_manager");
const account_manager = require("./account_manager");
const data_manager = require("./data_manager");
const { print, printError } = require("./custom_print");

const data_backup = require("./data_backup");

const software_folder = file_manager.directory_list.software_folder;

//#region Auxiliary methods
async function extractAllToAsyncPromise(admZipObject, output_dir) {
  return new Promise((resolve, reject) => {
    admZipObject.extractAllToAsync(output_dir, true, true, (error) => {
      console.log("Done!");
      if (error) reject(error);
      else resolve();
      return;
    });
  });
}
async function compactAsyncPromise(inputFolder, outputFolder) {
  return new Promise((resolve, reject) => {
    let outputStream = fs.createWriteStream(outputFolder);
    let outputArchive = archiver("zip", {
      comment: "Created with RehStore Desktop App",
      zlib: { level: 9 },
    });

    outputStream.on("close", () => {
      resolve(true);
    });

    outputArchive.on("error", (err) => {
      reject(err);
    });

    outputArchive.pipe(outputStream);

    outputArchive.directory(inputFolder, false);

    outputArchive.finalize();
  });
}
//#endregion

const software_manager = {
  running_list: {},
  start: async (
    app_name = "",
    onReceivedMessage = () => {},
    onReceivedError = () => {},
    onProcessClosed = () => {}
  ) => {
    return new Promise(async (resolve, reject) => {
      print("Software Manager", "Starting...");

      if (app_name === "") {
        resolve(undefined);
        return;
      }

      //Mandate that user must be logged in
      const username = await account_manager.getUsername();
      if (username === undefined) {
        resolve(undefined);
        return;
      }

      const launch_parameters = data_manager.software.getInfoParams(app_name);
      if (launch_parameters === undefined) {
        resolve(undefined);
        return;
      }

      //Mandate that the user must be allowed to access the branch
      let isAllowedToUse = await software_manager.getAllBranchAllowedToUse(
        launch_parameters.id
      );
      if (
        !isAllowedToUse.includes(launch_parameters.branch) &&
        isAllowedToUse !== ""
      ) {
        reject("User is not allowed to use this software");
        return;
      }
      if (isAllowedToUse === "") {
        print("Software Manager", "Launching software (offline mode)");
      }

      const launch_file_dir = file_manager.process_custom_path(
        launch_parameters.start_file,
        app_name
      );

      if (
        !fs.existsSync(launch_file_dir) ||
        !fs.lstatSync(launch_file_dir).isFile()
      ) {
        resolve(undefined);
        return;
      }

      const launch_arguments =
        launch_parameters.launch_parameters !== "" &&
        launch_parameters.launch_parameters !== undefined
          ? file_manager.process_custom_path(
              launch_parameters.launch_parameters,
              app_name
            )
          : "";

      const working_dir =
        launch_parameters.working_dir !== "" &&
        launch_parameters.working_dir !== undefined
          ? file_manager.process_custom_path(
              launch_parameters.working_dir,
              app_name
            )
          : path.join(software_folder, app_name);

      //Restore the user slot data to the software environment
      data_manager.software.slot.restore(
        launch_parameters.id,
        launch_parameters.branch,
        launch_parameters.version,
        username
      );

      if (launch_parameters.launch_parameters.startsWith("rua")) {
        //Launch has a Reh@Store Universal App
        print("RUA", `Starting '${launch_parameters.id}'`);
        console.log(path.join(app.getAppPath(), "RUA", "preload.js"));

        const launch_rua_parameters =
          data_manager.software.getInfoRuaParams(app_name);
        let win = new BrowserWindow({
          width: 800,
          height: 600,
          minHeight: 600,
          minWidth: 800,
          fullscreen: launch_rua_parameters.fullscreen ? true : false,
          icon: file_manager.process_custom_path(
            launch_parameters.icon,
            app_name
          ),
          frame: false,
          webPreferences: {
            devTools: true, //enableDevTools,
            preload: path.join(app.getAppPath(), "RUA", "preload.js"),
            enableRemoteModule: true,
          },
        });
        win.webContents.openDevTools();
        try {
          //Not supported on macos
          win.setAppDetails({
            appId: app_name,
          });
        } catch (err) {}
        win.loadFile(launch_file_dir);
        software_manager.running_list[app_name] = win;

        win.on("close", () => {
          print("RUA", `'${launch_parameters.id}' was closed by the user.`);

          delete software_manager.running_list[app_name];
        });
      } else {
        //Run has native app
        const software_running = spawn(launch_file_dir, [launch_arguments], {
          cwd: working_dir,
        });

        software_manager.running_list[app_name] = software_running;

        data_manager.software.logs.write(
          launch_parameters.id,
          launch_parameters.branch,
          launch_parameters.version,
          username,
          "start.log",
          +new Date()
        );

        software_running.stdout.on("data", async (data) => {
          data_manager.software.logs.write(
            launch_parameters.id,
            launch_parameters.branch,
            launch_parameters.version,
            username,
            "general_log.log",
            +new Date() + " " + data.toString()
          );
          onReceivedMessage(data);
        });

        software_running.stderr.on("data", async (data) => {
          data_manager.software.logs.write(
            launch_parameters.id,
            launch_parameters.branch,
            launch_parameters.version,
            username,
            "error.log",
            +new Date() + " " + data.toString()
          );
          onReceivedError(data);
        });

        software_running.on("error", async (data) => {
          printError("Software Manager", data);
          data_manager.software.logs.write(
            launch_parameters.id,
            launch_parameters.branch,
            launch_parameters.version,
            username,
            "error.log",
            +new Date() + " " + data.toString()
          );
          onReceivedError(data);
        });

        software_running.on("close", async (code) => {
          data_manager.software.logs.write(
            launch_parameters.id,
            launch_parameters.branch,
            launch_parameters.version,
            username,
            "close.log",
            +new Date() + " Code: " + code
          );

          //Save data from the software environment into the slot
          let data_save_status = data_manager.software.slot.save(
            launch_parameters.id,
            launch_parameters.branch,
            launch_parameters.version,
            username
          );

          try {
            if (data_save_status) {
              const token = file_manager.getUserToken();
              data_backup(username, token.token);
            }
          } catch (err) {
            printError("Software Manager", err);
          }

          software_manager.running_list[app_name] = undefined;
          delete software_manager.running_list[app_name];

          onProcessClosed(code);
        });
      }

      resolve(true);
      return;
    });
  },
  close: (app_name = "") => {
    if (app_name === "") {
      return false;
    }

    try {
      if (software_manager.running_list[app_name] !== undefined) {
        software_manager.running_list[app_name].kill();
        software_manager.running_list[app_name] = undefined;
        delete software_manager.running_list[app_name];
      }
      return true;
    } catch (err) {
      printError("Software Manager", "Error: " + err);
      return false;
    }
  },
  closeAll: () => {
    Object.keys(software_manager.running_list).forEach((software) => {
      if (software_manager.running_list[software] !== undefined)
        software_manager.close(software);
    });
  },
  details: (app_name = "") => {
    if (app_name === "") {
      return undefined;
    }

    if (fs.lstatSync(path.join(software_folder, app_name)).isDirectory()) {
      const launch_parameters_file_path = path.join(
        software_folder,
        app_name,
        "app_info.json"
      );
      if (fs.existsSync(launch_parameters_file_path)) {
        const is_launch_parameter_a_file = fs
          .lstatSync(launch_parameters_file_path)
          .isFile();
        if (is_launch_parameter_a_file) {
          let launch_parameters = JSON.parse(
            fs.readFileSync(launch_parameters_file_path, "utf-8")
          );
          if (
            launch_parameters.id !== undefined &&
            launch_parameters.name !== undefined &&
            launch_parameters.description !== undefined &&
            launch_parameters.version !== undefined &&
            launch_parameters.branch !== undefined
            //&& launch_parameters.start_file !== undefined //Disabled to enable telemetry and non executable packages
          ) {
            delete launch_parameters.comment;
            return launch_parameters;
          } else {
            return undefined;
          }
        }
      }
    }
  },
  listInstalled: () => {
    let software_folders = [];
    fs.readdirSync(software_folder).forEach((folder) => {
      if (fs.lstatSync(path.join(software_folder, folder)).isDirectory()) {
        const launch_parameters_file_path = path.join(
          software_folder,
          folder,
          "app_info.json"
        );
        if (fs.existsSync(launch_parameters_file_path)) {
          const is_launch_parameter_a_file = fs
            .lstatSync(launch_parameters_file_path)
            .isFile();
          if (is_launch_parameter_a_file) {
            const launch_parameters = JSON.parse(
              fs.readFileSync(launch_parameters_file_path, "utf-8")
            );
            if (
              launch_parameters.id !== undefined &&
              launch_parameters.name !== undefined &&
              launch_parameters.description !== undefined &&
              launch_parameters.version !== undefined &&
              launch_parameters.branch !== undefined
              //&& launch_parameters.start_file !== undefined //Disabled to enable telemetry and non executable packages
            ) {
              software_folders.push(folder);
            }
          }
        }
      }
    });

    return software_folders;
  },
  delete: async (app_name = "") => {
    return new Promise((resolve, reject) => {
      if (app_name === "") {
        resolve(false);
        return;
      }

      if (!software_manager.listInstalled().includes(app_name)) {
        resolve(false);
        return;
      }

      if (software_manager.running_list[app_name] !== undefined) {
        software_manager.close(app_name);
      }

      let app_data;
      try {
        app_data = JSON.parse(
          fs.readFileSync(
            path.join(path.join(software_folder, app_name), "app_info.json"),
            "utf-8"
          )
        );
      } catch (err) {
        printError("Software Manager", "Error: " + err);
        resolve(false);
        return;
      }

      const working_dir =
        app_data.working_dir !== "" && app_data.working_dir !== undefined
          ? file_manager.process_custom_path(
              app_data.working_dir,
              app_data.id + "." + app_data.branch + "." + app_data.version
            )
          : path.join(
              software_folder,
              app_data.id + "." + app_data.branch + "." + app_data.version
            );
      if (
        app_data !== undefined &&
        app_data.before_uninstall_script !== "" &&
        app_data.before_uninstall_script !== undefined
      ) {
        const software_running = spawn(
          file_manager.process_custom_path(
            app_data.before_uninstall_script,
            app_data.id + "." + app_data.branch + "." + app_data.version
          ),
          [],
          {
            cwd: working_dir,
          }
        );
        print(
          "Software Manager",
          "Executing: " +
            file_manager.process_custom_path(
              app_data.before_uninstall_script,
              app_data.id + "." + app_data.branch + "." + app_data.version
            )
        );

        software_running.on("error", (error) => {
          printError("Software Manager", "Delete Error: " + error);
          data_manager.software.inicial_slot.remove(
            app_data.id,
            app_data.branch,
            app_data.version
          );
          fs.removeSync(path.join(software_folder, app_name));
          resolve(true);
          return;
        });

        software_running.on("close", (code) => {
          print(
            "Software Manager",
            "Script: " +
              file_manager.process_custom_path(
                app_data.before_uninstall_script,
                app_data.id + "." + app_data.branch + "." + app_data.version
              ) +
              " executed with sucess!"
          );
          data_manager.software.inicial_slot.remove(
            app_data.id,
            app_data.branch,
            app_data.version
          );
          fs.removeSync(path.join(software_folder, app_name));
          resolve(true);
          return;
        });
      } else {
        print(
          "Software Manager",
          "Deleting " + path.join(software_folder, app_name)
        );
        data_manager.software.inicial_slot.remove(
          app_data.id,
          app_data.branch,
          app_data.version
        );
        fs.removeSync(path.join(software_folder, app_name));
        resolve(true);
        return;
      }
    });
  },
  search: async (tags = []) => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "search");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve(true);
        return;
      }

      let searh_url =
        tags.length === 0
          ? internet_manager.default_domain +
            "/api/software/what_user_can_access"
          : internet_manager.default_domain + "/api/software/search";

      internet_manager
        .post(
          searh_url,
          {
            token: token.token,
            tags,
          },
          true,
          false
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.software);
            return;
          } else {
            resolve([]);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject(error);
          return;
        });
    });
  },
  //#region Web Related stuff
  getDetailsFromServer: async (package_id = "") => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getDetailsFromServer");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain + "/api/software/details",
          {
            token: token.token,
            package_id,
          },
          true,
          true
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.software);
            return;
          } else {
            print("Software Manager", res.data.reason);
            resolve("");
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          resolve("");
          return;
        });
    });
  },
  getAllBranchAllowedToUse: async (package_id = "") => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getAllBranchAllowedToUse");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain +
            "/api/software/branch/all_allowed_to_use",
          {
            token: token.token,
            package_id,
          },
          true,
          true
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.branches);
            return;
          } else {
            resolve("");
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          resolve("");
          return;
        });
    });
  },
  getBranchLatestVersion: async (package_id = "", branch_name = "") => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getBranchLatestVersion");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain +
            "/api/software/branch/version/latest",
          {
            token: token.token,
            package_id,
            branch: branch_name,
            platform: os.platform(),
            architecture: os.arch(),
            os_version: os.release().split(".")[0],
          },
          true,
          true
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.latest_version);
            return;
          } else {
            reject(res.data.reason);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject("");
          return;
        });
    });
  },
  getAllBranchVersions: async (package_id = "", branch_name = "") => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getBranchLatestVersion");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain +
            "/api/software/branch/version/all_available",
          {
            token: token.token,
            package_id,
            branch: branch_name,
          },
          true,
          true
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.versions);
            return;
          } else {
            reject(res.data.reason);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject("");
          return;
        });
    });
  },
  getBranchVersionDetails: async (
    package_id = "",
    branch_name = "",
    major = "",
    minor = "",
    patch = ""
  ) => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getBranchVersionDetails");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain +
            "/api/software/branch/version/details",
          {
            token: token.token,
            package_id,
            branch: branch_name,
            major,
            minor,
            patch,
          },
          true,
          true
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve({
              changelog: res.data.changelog,
              supportedPlatforms: res.data.supportedPlatforms,
            });
            return;
          } else {
            reject(res.data.reason);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject("");
          return;
        });
    });
  },
  getMyPublishedSoftware: async () => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getMyPublishedSoftware");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        reject("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain + "/api/software/all_published",
          {
            token: token.token,
          },
          true,
          false
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.software_list);
            return;
          } else {
            reject(res.data.reason);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject("");
          return;
        });
    });
  },
  getSoftwareVersionInsideBranch: async (package_id, branch) => {
    return new Promise((resolve, reject) => {
      print("Software Manager", "getSoftwareVersionInsideBranch");
      const token = file_manager.getUserToken();
      if (token === undefined) {
        reject("");
        return;
      }

      internet_manager
        .post(
          internet_manager.default_domain + "/api/software/branch/version/all",
          {
            token: token.token,
            package_id,
            branch,
          },
          true,
          false
        )
        .then((res) => {
          if (res.data.result === true) {
            resolve(res.data.versions);
            return;
          } else {
            reject(res.data.reason);
            return;
          }
        })
        .catch((error) => {
          print("Software Manager", error);
          reject("");
          return;
        });
    });
  },

  //TODO: Instalar app depois de descarregar
  download: async (
    package_id = "",
    branch_name = "",
    major = "0",
    minor = "0",
    patch = "0",
    onDownloadProgress = (progress) => {}
  ) => {
    return new Promise(async (resolve, reject) => {
      const token = file_manager.getUserToken();
      if (token === undefined) {
        resolve("");
        return;
      }
      print(
        "Software manager",
        "Downloading " +
          package_id +
          " for (" +
          os.platform() +
          "," +
          os.arch() +
          "," +
          os.release() +
          ")"
      );
      const file_path = path.join(
        software_folder,
        package_id +
          "." +
          branch_name +
          "." +
          major +
          "." +
          minor +
          "." +
          patch +
          ".rehstore"
      );

      try {
        await internet_manager.postFileDownload(
          internet_manager.default_domain +
            "/api/software/branch/version/download",
          {
            token: token.token,
            package_id,
            branch: branch_name,
            major,
            minor,
            patch,
            platform: os.platform(),
            architecture: os.arch(),
            os_version: os.release().split(".")[0],
          },
          file_path,
          (progress) => {
            onDownloadProgress(progress);
          }
        );

        resolve(file_path);
        return;
      } catch (err) {
        printError("Sofware Manager", err);
        if (err === "Received platform is not compatible with that version")
          return resolve("Not Compatible");
        else resolve(false);
        return;
      }
    });
  },
  //#endregion
  configurePackage: async (
    package_id = "",
    name = "",
    description = "",
    branch = "",
    version = "",
    start_file = "",
    launch_parameters = "",
    folder_path = "",
    working_dir = "",
    before_uninstall_script = "",
    after_install_script = "",
    manual = "",
    manual_pt_PT = "",
    manual_en_US = "",
    icon = ""
  ) => {
    return new Promise(async (resolve, reject) => {
      print("Software Manager", "Creating package ...");

      if (
        folder_path === "" ||
        package_id === "" ||
        branch === "" ||
        version === ""
      ) {
        printError("Software Manager", "Error: Some fields are blank");
        resolve(false);
        return;
      }

      try {
        fs.writeJson(path.join(folder_path, "app_info.json"), {
          id: package_id,
          name: name,
          description: description,
          branch: branch,
          version: version,
          start_file: start_file.replaceAll(folder_path, ":software_folder:"),
          launch_parameters: launch_parameters,
          working_dir: working_dir.replaceAll(folder_path, ":software_folder:"),
          before_uninstall_script: before_uninstall_script.replaceAll(
            folder_path,
            ":software_folder:"
          ),
          after_install_script: after_install_script.replaceAll(
            folder_path,
            ":software_folder:"
          ),
          manual: manual.replaceAll(folder_path, ":software_folder:"),
          "manual_pt-PT": manual_pt_PT.replaceAll(
            folder_path,
            ":software_folder:"
          ),
          "manual_en-US": manual_en_US.replaceAll(
            folder_path,
            ":software_folder:"
          ),
          icon: icon.replaceAll(folder_path, ":software_folder:"),
        });
        resolve(true);
      } catch (err) {
        printError("Software Manager", "Error: " + err);
        resolve(false);
        return;
      }
    });
  },
  createPackage: async (folder_path = "") => {
    return new Promise(async (resolve, reject) => {
      print("Software Manager", "Creating package ...");

      //TODO: Check if app_info and app_data are valid
      let file_name = "";
      try {
        const app_data = JSON.parse(
          fs.readFileSync(path.join(folder_path, "app_info.json"), "utf-8")
        );

        file_name =
          app_data.id +
          "." +
          app_data.branch +
          "." +
          app_data.version +
          ".rehstore";

        await compactAsyncPromise(
          folder_path,
          path.join(folder_path, "..", file_name)
        );
      } catch (err) {
        printError("Software Manager", "Error: " + err);
        resolve(false);
        return;
      }

      resolve(true);
      print("Software Manager", "Package Created!");
      return;
    });
  },
  installPackage: async (installer_location = "", deleteInstaller = true) => {
    return new Promise(async (resolve, reject) => {
      //Mandate that user must be logged in
      const username = await account_manager.getUsername();
      if (username === undefined) {
        print(
          "Software Manager - installPackage",
          "Failed to install package: Cannot get Reh@Store username"
        );
        return resolve(false);
      }

      print("Software Manager - installPackage", "Installing package...");
      var installerPackage = new AdmZip(installer_location);

      //Step 1: Try to read app_info.json file. Return error if not possible
      let app_info;
      try {
        app_info = installerPackage.getEntries().filter((packageFile) => {
          return (
            packageFile.entryName === "app_info.json" &&
            !packageFile.isDirectory
          );
        })[0];
        app_info = JSON.parse(app_info.getData().toString("utf8"));
      } catch (err) {
        printError(
          "Software Manager - installPackage",
          "Could not find app_info: " + err
        );
        return resolve(false);
      }

      //Step 2: Extract the package
      let output_dir = path.join(
        software_folder,
        app_info.id + "." + app_info.branch + "." + app_info.version
      );
      try {
        await extractAllToAsyncPromise(installerPackage, output_dir);
      } catch (err) {
        printError("Software Manager - installPackage", "Error: " + err);
        if (deleteInstaller) software_manager.deletePackage(installer_location);
        resolve(false);
        return;
      }

      //Step 3: Delete the package
      if (deleteInstaller) software_manager.deletePackage(installer_location);

      //Step 4: Run the after install script (if exists)
      const working_dir =
        app_info.working_dir !== "" && app_info.working_dir !== undefined
          ? file_manager.process_custom_path(
              app_info.working_dir,
              app_info.id + "." + app_info.branch + "." + app_info.version
            )
          : path.join(
              software_folder,
              app_info.id + "." + app_info.branch + "." + app_info.version
            );
      if (
        app_info !== undefined &&
        app_info.after_install_script !== "" &&
        app_info.after_install_script !== undefined
      ) {
        const software_running = spawn(
          file_manager.process_custom_path(
            app_info.after_install_script,
            app_info.id + "." + app_info.branch + "." + app_info.version
          ),
          [],
          {
            cwd: working_dir,
          }
        );

        software_running.on("error", (error) => {
          resolve(false);
          return;
        });

        software_running.on("close", (code) => {
          data_manager.software.inicial_slot.save(
            app_info.id,
            app_info.branch,
            app_info.version,
            username
          );
          resolve(true);
          return;
        });
      } else {
        data_manager.software.inicial_slot.save(
          app_info.id,
          app_info.branch,
          app_info.version,
          username
        );
        resolve(true);
        return;
      }
    });
  },
  extractPackage: async (installer_location = "") => {
    return new Promise(async (resolve, reject) => {
      print("Software Manager - extractPackage", "Extracting package...");
      var installerPackage = new AdmZip(installer_location);

      //Step 1: Try to read app_info.json file. Return error if not possible
      let app_info;
      try {
        app_info = installerPackage.getEntries().filter((packageFile) => {
          return (
            packageFile.entryName === "app_info.json" &&
            !packageFile.isDirectory
          );
        })[0];
        app_info = JSON.parse(app_info.getData().toString("utf8"));
      } catch (err) {
        printError(
          "Software Manager - extractPackage",
          "Could not find app_info: " + err
        );
        return resolve(false);
      }

      //Step 2: Extract the package
      let output_dir = path.join(
        installer_location,
        "..",
        app_info.id + "." + app_info.branch + "." + app_info.version
      );
      try {
        await extractAllToAsyncPromise(installerPackage, output_dir);
      } catch (err) {
        printError("Software Manager - extractPackage", "Error: " + err);
        resolve(false);
        return;
      }

      resolve(true);
      return;
    });
    return new Promise((resolve, reject) => {
      print("Software Manager", "Installing package ...");
      var zip = new AdmZip(installer_location);

      const tmp_date = +new Date();
      const tmp_path = path.join(installer_location, "..", "tmp_" + tmp_date);

      try {
        if (!fs.existsSync(installer_location)) {
          resolve(false);
          return;
        }
      } catch (err) {
        printError("Software Manager", "Error: " + err);
      }

      fs.mkdirSync(tmp_path);
      zip.extractAllTo(tmp_path);

      try {
        const app_data = JSON.parse(
          fs.readFileSync(path.join(tmp_path, "app_info.json"), "utf-8")
        );

        fs.renameSync(
          tmp_path,
          path.join(
            tmp_path,
            "..",
            app_data.id + "." + app_data.branch + "." + app_data.version
          )
        );
      } catch (err) {
        printError("Software Manager", "Error: " + err);
        try {
          fs.rmdirSync(tmp_path, {
            recursive: true,
          });
        } catch (err2) {
          printError("Software Manager", "Error: " + err2);
        }
        resolve(false);
        return;
      }

      resolve(true);
    });
  },
  deletePackage: async (installer_location = "") => {
    return new Promise((resolve, reject) => {
      print(
        "Software Manager - deletePackage",
        "Removing package at " + installer_location
      );
      try {
        fs.removeSync(installer_location);
        resolve(true);
      } catch (err) {
        printError("Software Manager - deletePackage", "Error: " + err);
        resolve(false);
      }
      return;
    });
  },
};

module.exports = software_manager;
