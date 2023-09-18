const {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  Menu,
  Tray,
  Notification,
  shell,
} = require("electron");
const { autoUpdater } = require("electron-updater");
const path = require("path");
const fs = require("fs-extra");
const isDev = require("./modules/isElectronDev");
const { print, printError, printDebug } = require("./modules/custom_print");
const os = require("os");
const { param } = require("jquery");
const pkgJson = require("./package.json");
const { machineIdSync } = require("node-machine-id");
var FormData = require("form-data");

//#region Modules

//File Manager
const file_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "file_manager"
));

//Window Manager
let window_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "window_manager"
));

//Inicialize Electron Remote Module
require("@electron/remote/main").initialize();

//Tray Manager
let tray_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "tray_manager"
));

//Notification Manager
let notification_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "notification_manager"
));

//Software Manager
let software_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "software_manager"
));

//Account Manager
let account_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "account_manager"
));

//Internet Manager
let internet_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "internet_manager"
));
internet_manager.debug = isDev;

//Language Manager
let language_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "language_manager"
));

//Data Backup
let data_backup_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "data_backup"
));

//Data
let data_manager = require(path.join(
  app.getAppPath(),
  "modules",
  "data_manager"
));
//#endregion

//#region Initialize modules
file_manager.start();

app.allowRendererProcessReuse = false;

//Delete expired cached data
internet_manager.deleteAllExpiredCacheEntries();

//#endregion

//App ID
const appId = "com.zlynt.rehstore";

//Global Variables
global.sharedObj = {};

//Enable URL Scheme for Reh@Store Client
if (!app.isDefaultProtocolClient("rehstore"))
  app.setAsDefaultProtocolClient("rehstore");

const gotTheLock = app.requestSingleInstanceLock();

// We need this because of https://github.com/electron/electron/issues/18214
app.commandLine.appendSwitch("disable-site-isolation-trials");

// This allows BrowserWindow.setContentProtection(true) to work on macOS.
// https://github.com/electron/electron/issues/19880
app.commandLine.appendSwitch("disable-features", "IOSurfaceCapturer");

// Enable Opus RED field trial.
app.commandLine.appendSwitch(
  "force-fieldtrials",
  "WebRTC-Audio-Red-For-Opus/Enabled/"
);

// Enable optional PipeWire support.
app.commandLine.appendSwitch("enable-features", "WebRTCPipeWireCapturer");

// Needed until robot.js is fixed: https://github.com/octalmage/robotjs/issues/580
app.allowRendererProcessReuse = false;

const generateTrayWithSoftwareList = async () => {
  const user_logged_in = await account_manager.logged_in();
  let tmp_tray_menu = [
    {
      label: global.sharedObj.language.open,
      click: async function () {
        if (await account_manager.logged_in()) {
          window_manager.open(
            1100,
            700,
            800,
            700,
            file_manager.file_list.gui.app,
            "app"
          );
        } else {
          window_manager.open(
            650,
            600,
            650,
            600,
            file_manager.file_list.gui.login,
            "login"
          );
        }
      },
    },
    {
      label: global.sharedObj.language.checkUpdates,
      click: async function () {
        if (isDev) {
          notification_manager.show(
            "",
            "You cannot check for new Reh@Store updates while in development mode"
          );
        } else {
          //Tell the update system to check for updates
          autoUpdater.checkForUpdatesAndNotify();
        }
      },
    },
  ];

  let tmp_tray_software = [];
  software_manager.listInstalled().forEach((tmp_soft_name) => {
    let tmp_soft_details = software_manager.details(tmp_soft_name);
    //Do not add non executable packages to the list
    if (
      tmp_soft_details.start_file === "" ||
      tmp_soft_details.start_file === undefined
    ) {
      return;
    }

    tmp_tray_software.push({
      label: tmp_soft_details.name,
      click: async function () {
        notification_manager.show(
          "",
          global.sharedObj.language.app_lauching.replaceAll(
            "[APP_NAME]",
            tmp_soft_details.name
          )
        );
        try {
          await software_manager.start(tmp_soft_name);
        } catch (err) {
          switch (err) {
            case "User is not allowed to use this software":
              notification_manager.show(
                "",
                global.sharedObj.language.app_launch_not_authorized.replaceAll(
                  "[APP_NAME]",
                  tmp_soft_details.name
                )
              );
              break;
            default:
              notification_manager.show(
                "",
                global.sharedObj.language.unkown_error
              );
              break;
          }
        }
      },
    });
  });

  if (user_logged_in) {
    tmp_tray_menu.push(
      {
        label: global.sharedObj.language.myApps,
        submenu: tmp_tray_software,
      },
      {
        label: global.sharedObj.language.logout,
        click: async () => {
          window_manager.closeAll();
          software_manager.closeAll();
          await account_manager.logout();
          tray_manager.setMenu(await generateTrayWithSoftwareList());
          window_manager.open(
            650,
            600,
            650,
            600,
            file_manager.file_list.gui.login,
            "login"
          );
        },
      }
    );
  }

  tmp_tray_menu.push(
    {
      label: global.sharedObj.language.about,
      click: function () {
        window_manager.open(
          300,
          300,
          300,
          300,
          file_manager.file_list.gui.about,
          "about"
        );
      },
    },
    {
      label: global.sharedObj.language.exit,
      click: function () {
        app.quit();
      },
    }
  );

  return tmp_tray_menu;
};

//#region Update and autentication
app.whenReady().then(async () => {
  //Make Reh@Store get the username and set it has a global variable
  await account_manager.getUsername();

  print("Back-end app", `Starting app...`, true);
  print(
    "Back-end app",
    "Running Reh@Store on '" +
      os.platform() +
      " " +
      os.arch() +
      " " +
      os.release() +
      "'",
    true
  );

  app.setAppUserModelId(appId);
  if (!gotTheLock) {
    print("Back-end app", "Detected a running app! Closing...");
    app.quit();
  } else {
    //Only 1 app instance is allowed
    app.on("second-instance", async (event, commandLine, workingDirectory) => {
      if (isDev) {
        if (await account_manager.logged_in()) {
          window_manager.open(
            1100,
            700,
            800,
            700,
            file_manager.file_list.gui.app,
            "app"
          );
        } else {
          window_manager.open(
            650,
            600,
            650,
            600,
            file_manager.file_list.gui.login,
            "login"
          );
        }
      } else {
        window_manager.open(
          300,
          300,
          300,
          300,
          file_manager.file_list.gui.startup,
          "startup"
        );
      }
    });
  }

  //Load language pack. If the language is not present, load by default English (from United States)
  global.sharedObj.language = language_manager.getLanguagePack(
    (await account_manager.language()) || app.getLocale()
  );
  global.sharedObj.language_list = language_manager.list();

  //Start Tray Manager
  tray_manager.start();

  tray_manager.setMenu(await generateTrayWithSoftwareList());

  if (isDev) {
    if (await account_manager.logged_in()) {
      window_manager.open(
        1100,
        700,
        800,
        700,
        file_manager.file_list.gui.app,
        "app"
      );
    } else {
      window_manager.open(
        650,
        600,
        650,
        600,
        file_manager.file_list.gui.login,
        "login"
      );
    }
  } else {
    window_manager.open(
      300,
      300,
      300,
      300,
      file_manager.file_list.gui.startup,
      "startup"
    );
  }

  print("Back-end app", `App started!`);
});

app.on("window-all-closed", () => {
  /*if (process.platform !== 'darwin') {
      app.quit()
    }*/
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    window_manager.open(
      300,
      300,
      300,
      300,
      file_manager.file_list.gui.startup,
      "startup"
    );
  }
});

//#region ipcMain
//App itself
ipcMain.on("rehstore-quit-app", async (event, data) => {
  app.quit();
});

ipcMain.on("rehstore-set-enable-debug", async (event, data) => {
  //Enable debug mode
  if (data === true) {
    process.env.ELECTRON_IS_DEV = 1;
  } else {
    process.env.ELECTRON_IS_DEV = 0;
  }
});

ipcMain.on("rehstore-clear-cache", async (event, data) => {
  internet_manager.deleteAllCacheEntries();
  notification_manager.show("", global.sharedObj.language.cache_cleared);
});

//Detect errors on renderer process
ipcMain.on("rehstore-window-onError", function (event, data) {
  printError("Renderer", data);
});

//Tray Manager
ipcMain.on("tray-manager-update-channel", async (event, data) => {
  tray_manager.setMenu(await generateTrayWithSoftwareList());
});

//Notification Manager
ipcMain.on("notification-manager-show", (event, args) => {
  notification_manager.show(args.title, args.message);
});

//Software Manager
ipcMain.on("software-manager-search", async (event, data) => {
  let software_result;
  try {
    software_result = await software_manager.search(data);
  } catch (err) {
    printError("Software Search", err);
    switch (err) {
      case "No internet":
        notification_manager.show("", global.sharedObj.language.no_internet);
        break;
      default:
        notification_manager.show("", global.sharedObj.language.unkown_error);
        break;
    }
    software_result = [];
  }

  try {
    for (let i = 0; i < software_result.length; i++) {
      software_result[i].description = (
        await software_manager.getDetailsFromServer(
          software_result[i].package_id
        )
      ).description.replaceAll("\\", "");
      software_result[i].branches = {};
      let array_of_branches = await software_manager.getAllBranchAllowedToUse(
        software_result[i].package_id
      );
      for (let a = 0; a < array_of_branches.length; a++) {
        let tmp_branch = array_of_branches[a];
        software_result[i].branches[tmp_branch] =
          await software_manager.getAllBranchVersions(
            software_result[i].package_id,
            tmp_branch
          );
        software_result[i].branches[tmp_branch] = software_result[i].branches[
          tmp_branch
        ].map((version) => {
          return version.major + "." + version.minor + "." + version.patch;
        });
      }
    }
  } catch (err) {
    printError("Software Search", err);
    switch (err) {
      case "No internet":
        notification_manager.show("", global.sharedObj.language.no_internet);
        break;
      default:
        notification_manager.show("", global.sharedObj.language.unkown_error);
        break;
    }
    software_result = [];
  }
  event.reply("software-manager-search", software_result);
});

ipcMain.on("software-running-list", async (event, data) => {
  event.reply(
    "software-running-list",
    Object.keys(software_manager.running_list)
      .map((value, index) => {
        return software_manager.details(value);
      })
      .filter(function (element) {
        return element !== undefined;
      })
  );
});

ipcMain.on("software-backup-data", async () => {
  print("Software Manager", "Backing up data...");
  const token = file_manager.getUserToken();
  if (global.sharedObj && global.sharedObj.username) {
    data_backup_manager(global.sharedObj.username, token.token);
  } else {
    printError("Software Manager", "Data backup failed");
  }
});

ipcMain.on("software-manager-getMyPublishedSoftware", async (event, data) => {
  try {
    let packages = await software_manager.getMyPublishedSoftware();
    event.reply("software-manager-getMyPublishedSoftware", packages);
  } catch (err) {
    printError("Software Manager - getMyPublishedSoftware", err);
    switch (err) {
      default:
        event.reply(
          "software-manager-getMyPublishedSoftware",
          global.sharedObj.language.anErrorHappened
        );
        break;
    }
  }
});

ipcMain.on(
  "software-manager-getSoftwareVersionInsideBranch",
  async (event, data) => {
    try {
      let versions = await software_manager.getSoftwareVersionInsideBranch(
        data.package_id,
        data.branch
      );
      event.reply("software-manager-getSoftwareVersionInsideBranch", versions);
    } catch (err) {
      printError("Software Manager - getSoftwareVersionInsideBranch", err);
      switch (err) {
        default:
          event.reply("software-manager-getSoftwareVersionInsideBranch", []);
          break;
      }
    }
  }
);

ipcMain.on("software-manager-getAllBranchAllowedToUse", async (event, data) => {
  try {
    let branches = await software_manager.getAllBranchAllowedToUse(data);
    event.reply("software-manager-getAllBranchAllowedToUse", branches);
  } catch (err) {
    event.reply("software-manager-getAllBranchAllowedToUse", []);
  }
});

ipcMain.on("software-manager-update-package", async (event, data) => {
  try {
    const latest_version = await software_manager.getBranchLatestVersion(
      data.package_id,
      data.branch
    );
    if (latest_version === {} || JSON.stringify(latest_version) === "{}") {
      printError("ipcMain Package Update", "Received empty json");
      notification_manager.show(
        "",
        global.sharedObj.language.no_updates_available.replaceAll(
          "[APP_NAME]",
          data.name
        )
      );
      return;
    }

    let newVersionFolderName = `${data.package_id}.${data.branch}.${latest_version.major}.${latest_version.minor}.${latest_version.patch}`;

    //Verify if a new version is already installed
    if (software_manager.listInstalled().includes(newVersionFolderName)) {
      notification_manager.show(
        "",
        global.sharedObj.language.latest_version_already_installed.replaceAll(
          "[APP_NAME]",
          data.name
        )
      );
      return;
    }

    if (
      latest_version.major + "" === data.major + "" &&
      latest_version.minor + "" === data.minor + "" &&
      latest_version.patch + "" === data.patch + ""
    ) {
      notification_manager.show(
        "",
        global.sharedObj.language.no_updates_available.replaceAll(
          "[APP_NAME]",
          data.name
        )
      );
      return;
    }

    notification_manager.show(
      "",
      global.sharedObj.language.updating_app.replaceAll("[APP_NAME]", data.name)
    );

    const file_path = await software_manager.download(
      data.package_id,
      data.branch,
      latest_version.major + "",
      latest_version.minor + "",
      latest_version.patch + "",
      (progress) => {
        let app_window = window_manager.get("app");
        if (app_window !== undefined) {
          let progress_percentage = (progress / 100).toFixed(1);
          event.reply(
            "software-manager-download-progress",
            parseFloat(progress_percentage + "")
          );
          app_window.setProgressBar(parseFloat(progress_percentage + ""));
        }
      }
    );
    let app_window = window_manager.get("app");
    if (app_window !== undefined) {
      //Reset progress bar
      app_window.setProgressBar(0);
    }

    if (file_path !== false) {
      notification_manager.show(
        "",
        global.sharedObj.language.installing_app.replaceAll(
          "[APP_NAME]",
          data.name
        )
      );
      await software_manager.installPackage(file_path);
      notification_manager.show(
        "",
        global.sharedObj.language.app_installed.replaceAll(
          "[APP_NAME]",
          data.name
        )
      );
      /*await software_manager.delete(
                data.package_id + '.' + data.branch + '.' + data.major + '.' + data.minor
                + '.' + data.patch
            );*/
      //TODO: Migrate the data from one version to another
      await software_manager.deletePackage(file_path);
    } else {
      notification_manager.show("", global.sharedObj.language.anErrorHappened);
    }
  } catch (err) {
    printError("ipcMain Package Update", err);
    switch (err) {
      case "You are not allowed to access this branch":
        notification_manager.show(
          "",
          global.sharedObj.language.app_update_not_authorized
            .replaceAll("[APP_NAME]", data.name)
            .replaceAll("[BRANCH_NAME]", data.branch)
        );
        break;
      default:
        notification_manager.show(
          "",
          global.sharedObj.language.errorWhileUpdating + ": " + err
        );
        break;
    }
  }
});

ipcMain.on(
  "software-manager-download-and-install-package",
  async (event, data) => {
    //TODO: Se foi mandado a versão para aqui, instalar e não remover a "antiga". Se não foi mandado, instalar e remover a antiga versão
    let received_data = {
      package_id: data.package_id,
      branch: data.branch_name,
      version: data.version,
    };
    let delete_previous_installed_app = true;

    if (received_data.version === undefined || received_data.version === "") {
      const latest_version = await software_manager.getBranchLatestVersion(
        received_data.package_id,
        received_data.branch
      );
      if (
        latest_version !== "" &&
        latest_version !== {} &&
        latest_version !== undefined &&
        JSON.stringify(latest_version) !== "{}"
      ) {
        received_data.version = latest_version;
        printDebug("Install-Package Get latest", latest_version);
      } else {
        notification_manager.show(
          "",
          global.sharedObj.language.no_compatible_version
        );
        return;
      }
    } else {
      received_data.version = {
        major: received_data.version.split(".")[0],
        minor: received_data.version.split(".")[1],
        patch: received_data.version.split(".")[2],
      };
      delete_previous_installed_app = false;
    }
    received_data.version = {
      major: received_data.version.major + "",
      minor: received_data.version.minor + "",
      patch: received_data.version.patch + "",
    };

    printDebug("Install-Package", received_data);
    const file_path = await software_manager.download(
      received_data.package_id,
      received_data.branch,
      received_data.version.major,
      received_data.version.minor,
      received_data.version.patch,
      (progress) => {
        let app_window = window_manager.get("app");
        if (app_window !== undefined) {
          let progress_percentage = (progress / 100).toFixed(1);
          event.reply(
            "software-manager-download-progress",
            parseFloat(progress_percentage + "")
          );
          app_window.setProgressBar(parseFloat(progress_percentage + ""));
        }
      }
    );
    let app_window = window_manager.get("app");
    if (app_window !== undefined) {
      //Reset progress bar
      app_window.setProgressBar(0);
    }

    if (file_path === false) {
      notification_manager.show("", global.sharedObj.language.anErrorHappened);
      return;
    }
    if (file_path === "Not Compatible") {
      notification_manager.show(
        "",
        global.sharedObj.language.no_compatible_version
      );
      return;
    }

    notification_manager.show(
      "",
      global.sharedObj.language.installing_app.replaceAll(
        "[APP_NAME]",
        data.name
      )
    );
    await software_manager.installPackage(file_path);
    notification_manager.show(
      "",
      global.sharedObj.language.app_installed.replaceAll(
        "[APP_NAME]",
        data.name
      )
    );

    //if (delete_previous_installed_app) {
    //Delete package previously downloaded and installed
    await software_manager.deletePackage(file_path);
    //}
  }
);

ipcMain.on(
  "software-manager-getBranchVersionDetails-channel",
  async (event, data) => {
    try {
      let details = await software_manager.getBranchVersionDetails(
        data.package_id,
        data.branch,
        data.major,
        data.minor,
        data.patch
      );
      event.reply("software-manager-getBranchVersionDetails-channel", details);
    } catch (err) {
      event.reply("software-manager-getBranchVersionDetails-channel", {});
    }
  }
);

ipcMain.on("software-manager-configure-package", async (event, data) => {
  let parameters = {
    package_id: data.package_id,
    branch: data.branch,
    version: data.version,
  };
  parameters.parameters =
    data.packageParameters === undefined ? "" : data.packageParameters;

  let app_details = await software_manager.getDetailsFromServer(
    parameters.package_id
  );
  parameters.name = app_details.name;
  parameters.description = app_details.description;

  event.reply(
    "software-manager-configure-package",
    global.sharedObj.language.creating_package
  );

  const project_folder = await dialog.showOpenDialog({
    title: "Select your project folder",
    properties: ["openDirectory"],
  });
  if (project_folder.canceled === true) {
    event.reply(
      "software-manager-configure-package",
      global.sharedObj.language.package_setup_failed
    );
    printError(
      "Ipc Software Manager Create Package",
      "Project folder is missing"
    );
    return;
  } else {
    parameters.project_folder = project_folder.filePaths[0];
  }

  const working_dir = await dialog.showOpenDialog({
    title: "Select your working directory",
    properties: ["openDirectory"],
  });
  if (working_dir.canceled === true) {
    event.reply(
      "software-manager-configure-package",
      global.sharedObj.language.package_setup_failed
    );
    printError(
      "Ipc Software Manager Create Package",
      "Working directory is missing"
    );
    return;
  } else {
    parameters.working_dir = working_dir.filePaths[0];
  }

  const start_file = await dialog.showOpenDialog({
    title: "Select your file to run",
    properties: ["openFile"],
  });
  if (start_file.canceled === true) {
    event.reply(
      "software-manager-configure-package",
      global.sharedObj.language.package_setup_failed
    );
    printError("Ipc Software Manager Create Package", "Start File is missing");
    return;
  } else {
    parameters.start_file = start_file.filePaths[0];
  }

  const manual_pdf = await dialog.showOpenDialog({
    title: `Select the package's main manual pdf`,
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  parameters.manual =
    manual_pdf.canceled === true ? "" : manual_pdf.filePaths[0];

  const manual_pdf_pt_PT = await dialog.showOpenDialog({
    title: `Select the package's manual pdf transation to pt-PT`,
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  parameters.manual_pt_PT =
    manual_pdf_pt_PT.canceled === true ? "" : manual_pdf_pt_PT.filePaths[0];

  const manual_pdf_en_US = await dialog.showOpenDialog({
    title: `Select the package's manual pdf transation to en-US`,
    properties: ["openFile"],
    filters: [{ name: "PDF", extensions: ["pdf"] }],
  });
  parameters.manual_en_US =
    manual_pdf_en_US.canceled === true ? "" : manual_pdf_en_US.filePaths[0];

  const icon = await dialog.showOpenDialog({
    title: "Select the package icon",
    properties: ["openFile"],
    filters: [{ name: "PNG", extensions: ["png"] }],
  });
  parameters.icon =
    icon.canceled === true ? ":software_folder:\\icon.png" : icon.filePaths[0];

  const before_uninstall_script = await dialog.showOpenDialog({
    title: "Select the before uninstall script",
    properties: ["openFile"],
  });
  parameters.before_uninstall_script =
    before_uninstall_script.canceled === true
      ? ""
      : before_uninstall_script.filePaths[0];

  const after_install_script = await dialog.showOpenDialog({
    title: "Select the after install script",
    properties: ["openFile"],
  });
  parameters.after_install_script =
    after_install_script.canceled === true
      ? ""
      : after_install_script.filePaths[0];

  try {
    if (
      (await software_manager.configurePackage(
        parameters.package_id,
        parameters.name,
        parameters.description,
        parameters.branch,
        parameters.version,
        parameters.start_file,
        parameters.parameters,
        parameters.project_folder,
        parameters.working_dir,
        parameters.before_uninstall_script,
        parameters.after_install_script,
        parameters.manual,
        parameters.manual_pt_PT,
        parameters.manual_en_US,
        parameters.icon
      )) === true
    )
      event.reply(
        "software-manager-configure-package",
        global.sharedObj.language.package_setup_sucess
      );
    else
      event.reply(
        "software-manager-configure-package",
        global.sharedObj.language.package_setup_failed
      );
  } catch (err) {
    event.reply(
      "software-manager-configure-package",
      global.sharedObj.language.package_setup_failed
    );
    printError("Ipc Software Manager Create Package", err);
  }
});

ipcMain.on("software-manager-create-package", async (event, data) => {
  event.reply(
    "software-manager-create-package",
    global.sharedObj.language.creating_package
  );
  const dialog_result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  if (dialog_result.canceled === false) {
    software_manager
      .createPackage(dialog_result.filePaths[0])
      .then((isPackageCreated) => {
        if (isPackageCreated)
          event.reply(
            "software-manager-create-package",
            global.sharedObj.language.package_created
          );
        else
          event.reply(
            "software-manager-create-package",
            global.sharedObj.language.package_creation_failed
          );
      })
      .catch((err) => {
        event.reply(
          "software-manager-create-package",
          global.sharedObj.language.package_creation_failed
        );
        printError("Ipc Software Manager Create Package", err);
      });
  } else {
    event.reply(
      "software-manager-create-package",
      global.sharedObj.language.none
    );
  }
});

ipcMain.on("software-manager-install-package", async (event, data) => {
  event.reply(
    "software-manager-create-package",
    global.sharedObj.language.installing_package
  );
  const dialog_result = await dialog.showOpenDialog({
    filters: [{ name: "Reh@Store Install Package", extensions: ["rehstore"] }],
    properties: ["openFile"],
  });
  if (dialog_result.canceled === false) {
    try {
      if (
        (await software_manager.installPackage(
          dialog_result.filePaths[0],
          false
        )) === true
      )
        event.reply(
          "software-manager-install-package",
          global.sharedObj.language.package_installed
        );
      else
        event.reply(
          "software-manager-install-package",
          global.sharedObj.language.package_install_failed
        );
    } catch (err) {
      event.reply(
        "software-manager-install-package",
        global.sharedObj.language.package_install_failed
      );
      printError("Ipc Software Manager Install Package", err);
    }
  } else {
    event.reply(
      "software-manager-install-package",
      global.sharedObj.language.none
    );
  }
});

ipcMain.on("software-manager-extract-package", async (event, data) => {
  event.reply(
    "software-manager-create-package",
    global.sharedObj.language.extracting_package
  );
  const dialog_result = await dialog.showOpenDialog({
    filters: [{ name: "Reh@Store Install Package", extensions: ["rehstore"] }],
    properties: ["openFile"],
  });
  if (dialog_result.canceled === false) {
    try {
      if (
        (await software_manager.extractPackage(dialog_result.filePaths[0])) ===
        true
      )
        event.reply(
          "software-manager-extract-package",
          global.sharedObj.language.package_extracted
        );
      else
        event.reply(
          "software-manager-extract-package",
          global.sharedObj.language.package_extract_failed
        );
    } catch (err) {
      event.reply(
        "software-manager-extract-package",
        global.sharedObj.language.package_extract_failed
      );
      printError("Ipc Software Manager Extract Package", err);
    }
  } else {
    event.reply(
      "software-manager-extract-package",
      global.sharedObj.language.none
    );
  }
});

ipcMain.on("software-manager-delete-channel", async (event, data) => {
  notification_manager.show(
    "",
    global.sharedObj.language.uninstalling_app.replaceAll("[APP_NAME]", data)
  );
  let result = await software_manager.delete(data);
  if (result === true) {
    notification_manager.show(
      "",
      global.sharedObj.language.app_uninstalled.replaceAll("[APP_NAME]", data)
    );
  }
  event.reply("software-manager-delete-channel", result);
});

ipcMain.on("software-manager-listInstalled-channel", async (event, data) => {
  let userLanguage = (await account_manager.language()) || app.getLocale();

  let tmp_software_list = [];

  software_manager.listInstalled().forEach((tmp_software) => {
    let tmp_software_details = software_manager.details(tmp_software);

    let icon_path =
      tmp_software_details.icon === undefined
        ? path.join(
            file_manager.directory_list.software_folder,
            tmp_software,
            "icon.png"
          )
        : file_manager.process_custom_path(
            tmp_software_details.icon,
            tmp_software
          );

    if (!fs.existsSync(icon_path)) {
      icon_path = "";
    }

    let usingDataFolder = fs.existsSync(
      path.join(
        file_manager.directory_list.software_folder,
        tmp_software,
        "app_data.json"
      )
    );

    tmp_software_list.push({
      icon_path: icon_path,
      package_id: tmp_software_details.id,
      name: tmp_software_details.name,
      branch: tmp_software_details.branch,
      version: tmp_software_details.version,
      folder_path: tmp_software,
      usingDataFolder,
      executable:
        tmp_software_details.start_file === "" ||
        tmp_software_details.start_file === undefined
          ? false
          : true,
      manual:
        tmp_software_details["manual_" + userLanguage] === undefined ||
        tmp_software_details["manual_" + userLanguage] === ""
          ? tmp_software_details.manual === undefined ||
            tmp_software_details.manual === ""
            ? ""
            : tmp_software_details.manual
          : tmp_software_details["manual_" + userLanguage],
    });
  });

  event.reply(
    "software-manager-listInstalled-channel",
    JSON.stringify(tmp_software_list)
  );
});

ipcMain.on("software-manager-startApp-channel", async (event, data) => {
  const software_name = software_manager.details(data);
  notification_manager.show(
    "",
    global.sharedObj.language.app_lauching.replaceAll(
      "[APP_NAME]",
      software_name.name
    )
  );
  try {
    await software_manager.start(data);
  } catch (err) {
    switch (err) {
      case "User is not allowed to use this software":
        notification_manager.show(
          "",
          global.sharedObj.language.app_launch_not_authorized.replaceAll(
            "[APP_NAME]",
            software_name.name
          )
        );
        break;
      default:
        notification_manager.show("", global.sharedObj.language.unkown_error);
        break;
    }
  }
});

ipcMain.on("software-open-folder", async (event, data) => {
  const { package_id, branch, version } = data;

  let software_path = path.join(
    file_manager.directory_list.software_folder,
    `${package_id}.${branch}.${version}`
  );

  shell.openPath(software_path);
});

ipcMain.on("software-open-folder-data", async (event, data) => {
  const { package_id, branch, version } = data;

  let software_details = software_manager.details(
    `${package_id}.${branch}.${version}`
  );
  let params = data_manager.software.getDataParams(package_id, branch, version);

  try {
    let username = await account_manager.getUsername();

    let softwareFolder = path.join(
      file_manager.directory_list.data_folder,
      username,
      `${package_id}`,
      params.slot_name,
      machineIdSync()
    );

    shell.openPath(softwareFolder);
  } catch (err) {
    console.log(err);
  }
});

//Language Manager
ipcMain.on("language-manager-all-channel", async (event, data) => {
  event.reply("language-manager-all-channel", global.sharedObj.language_list);
});

ipcMain.on("language-manager-changeLanguage-channel", (event, data) => {
  global.sharedObj.language = language_manager.getLanguagePack(data);
  event.reply("language-manager-changeLanguage-channel", "");
});

//Admin and publisher pannels
ipcMain.on("admin-pannel-open", (event, data) => {
  window_manager.open(
    600,
    600,
    800,
    500,
    file_manager.file_list.gui.admin_pannel,
    "admin_pannel",
    false,
    true
  );
  //shell.openExternal(internet_manager.default_domain + '/admin');
});

ipcMain.on("pannel-get-user-token", async (event, data) => {
  let token = file_manager.getUserToken();

  let win = window_manager.get(data);
  const rehstoreEmbeds = win.webContents.mainFrame.frames.filter((frame) => {
    try {
      const url = new URL(frame.url);
      return url.host === "rehstore.arditi.pt";
    } catch {
      return false;
    }
  })[0];
  rehstoreEmbeds.executeJavaScript(
    `localStorage.setItem("username", "${token.username}");`
  );
  rehstoreEmbeds.executeJavaScript(
    `localStorage.setItem("sessionToken", "${token.token}");`
  );
});

ipcMain.on("publisher-pannel-open", (event, data) => {
  window_manager.open(
    600,
    600,
    800,
    500,
    file_manager.file_list.gui.publisher_pannel,
    "publisher_pannel",
    false,
    true
  );

  //shell.openExternal(internet_manager.default_domain + '/publisher');
});

//Open Remote Support Pannel
ipcMain.on("remote-support-pannel-open", (event, data) => {
  //window_manager.open(600, 600, 800, 500, file_manager.file_list.gui.support_chat, "support_chat");
  shell.openExternal("https://tawk.to/chat/60f1bf3d649e0a0a5ccc9159/1fao5621r");
});

ipcMain.on("jitsi-meet-open", (event, data) => {
  window_manager.open(
    1100,
    700,
    800,
    700,
    file_manager.file_list.gui.jitsi,
    "jitsi"
  );
});

ipcMain.on("manual-instructions-open", async (event, data) => {
  let userLanguage = (await account_manager.language()) || app.getLocale();

  print(
    "Reh@Store manual for " + data,
    "Searching " + userLanguage + " manual"
  );

  let manual_folder_location = path.join(
    app.getAppPath(),
    "modules",
    "manuals"
  );

  let current_language_manual = `${data}_${userLanguage}.pdf`;
  let current_language_manual_location = path.join(
    manual_folder_location,
    current_language_manual
  );

  let alternative_language_manual = `${data}_pt-PT.pdf`;
  let alternative_language_manual_location = path.join(
    manual_folder_location,
    alternative_language_manual
  );

  //Try to get the manual for the main language
  if (
    fs.existsSync(current_language_manual_location) &&
    fs.statSync(current_language_manual_location).isFile()
  ) {
    window_manager.open(
      1100,
      700,
      800,
      700,
      file_manager.file_list.gui.manual_reader,
      "manual_reader"
    );
    let manual_window = window_manager.get("manual_reader");
    manual_window.webContents.on("did-finish-load", function () {
      //Wait for the window to be loaded
      manual_window.webContents.executeJavaScript(
        //We must send via base64 because electron is not sending "/" char or "\" to renderer
        `document.getElementById('pdf_reader').src = atob('${Buffer.from(
          "./pdf_reader/web/viewer.html?file=" +
            current_language_manual_location
        ).toString("base64")}');`
      );
    });
    return event.reply("manual-instructions-open", true);
  }

  //If not found, show the default manual
  if (
    fs.existsSync(alternative_language_manual_location) &&
    fs.statSync(alternative_language_manual_location).isFile()
  ) {
    window_manager.open(
      1100,
      700,
      800,
      700,
      file_manager.file_list.gui.manual_reader,
      "manual_reader"
    );
    let manual_window = window_manager.get("manual_reader");
    manual_window.webContents.on("did-finish-load", function () {
      //Wait for the window to be loaded
      manual_window.webContents.executeJavaScript(
        //We must send via base64 because electron is not sending "/" char or "\" to renderer
        `document.getElementById('pdf_reader').src = atob('${Buffer.from(
          "./pdf_reader/web/viewer.html?file=" +
            alternative_language_manual_location
        ).toString("base64")}');`
      );
    });
    return event.reply("manual-instructions-open", true);
  }

  //If none of the manuals were found, warn the user
  notification_manager.show(
    "",
    global.sharedObj.language.could_not_find_instruction_manual
  );
  return event.reply("manual-instructions-open", true);
});

ipcMain.on("manual-reader-pannel-open", (event, data) => {
  window_manager.open(
    1100,
    700,
    800,
    700,
    file_manager.file_list.gui.manual_reader,
    "manual_reader"
  );
  let manual_window = window_manager.get("manual_reader");
  manual_window.webContents.on("did-finish-load", function () {
    //Wait for the window to be loaded
    let manual_path = file_manager.process_custom_path(
      data.manual,
      data.package_id + "." + data.branch + "." + data.version
    );
    manual_window.webContents.executeJavaScript(
      //We must send via base64 because electron is not sending "/" char or "\" to renderer
      `document.getElementById('pdf_reader').src = atob('${Buffer.from(
        "./pdf_reader/web/viewer.html?file=" + manual_path
      ).toString("base64")}');`
    );
  });
});

//Account Manager
ipcMain.on(
  "account-manager-open-account-forgot-password-page",
  (event, data) => {
    shell.openExternal(
      internet_manager.default_domain + "/api/account/forgot_password"
    );
  }
);

ipcMain.on("account-manager-open-account-registration-page", (event, data) => {
  shell.openExternal(internet_manager.default_domain + "/api/account/register");
});

ipcMain.on("account-manager-getUsername-channel", async (event, data) => {
  let username = await account_manager.getUsername();
  if (username !== undefined) {
    event.reply("account-manager-getUsername-channel", username);
  }
});

ipcMain.on("account-manager-logged_in-channel", async (event, data) => {
  event.reply(
    "account-manager-logged_in-channel",
    await account_manager.logged_in()
  );
});

ipcMain.on("account-manager-logout-channel", async (event, data) => {
  software_manager.closeAll();
  await account_manager.logout();
  tray_manager.setMenu(await generateTrayWithSoftwareList());
  window_manager.closeAll();
  window_manager.open(
    650,
    600,
    650,
    600,
    file_manager.file_list.gui.login,
    "login"
  );
});

ipcMain.on("account-manager-getDetails-channel", async (event, data) => {
  let account_details = await account_manager.details();
  if (account_details !== undefined) {
    event.reply("account-manager-getDetails-channel", account_details);
  }
});

ipcMain.on("account-manager-edit-channel", async (event, data) => {
  let old_account_details = await account_manager.details();
  let args = JSON.parse(data);

  //#region Remove values that already exist in the account details
  if (args.first_name === old_account_details.first_name) args.first_name = "";

  if (args.last_name === old_account_details.last_name) args.last_name = "";

  if (args.new_email === old_account_details.email) args.new_email = "";

  if (args.language === old_account_details.language) args.language = "";

  if (args.new_password === args.current_password) args.new_password = "";

  let all_args_are_empty = true;
  Object.keys(args).forEach((argument) => {
    if (argument !== "current_password" && args[argument] !== "") {
      all_args_are_empty = false;
    }
  });
  if (all_args_are_empty) {
    notification_manager.show(
      "",
      global.sharedObj.language
        .notification_account_not_edited_because_received_no_fields
    );
    event.reply("account-manager-edit-channel", "");
    return;
  }
  //#endregion
  try {
    if (args.current_password === "") {
      notification_manager.show(
        "",
        global.sharedObj.language.notification_account_details_not_saved +
          global.sharedObj.language.password_cannot_be_blank
      );
      return;
    }

    const result = await account_manager.edit(
      args.new_email,
      args.current_password,
      args.new_password,
      args.first_name,
      args.last_name,
      args.language
    );
    if (result.result) {
      notification_manager.show(
        "",
        global.sharedObj.language.notification_account_edited
      );
      if (args.new_email !== "") {
        notification_manager.show(
          "",
          global.sharedObj.language.notification_email_verification_required
        );
      }
      if (args.language !== "") {
        global.sharedObj.language = language_manager.getLanguagePack(
          (await account_manager.language()) || app.getLocale()
        );
        tray_manager.setMenu(await generateTrayWithSoftwareList());
        notification_manager.show(
          "",
          global.sharedObj.language.restart_app_to_apply_changes
        );
      }
      event.reply("account-manager-edit-channel", "");
    } else {
      let current_reason = "";
      switch (result.reason) {
        case "Current password is incorrect":
          current_reason =
            global.sharedObj.language.current_password_is_incorrect;
          break;
        case "Server refused connection":
          current_reason = global.sharedObj.language.server_refused_connection;
          break;
        case "No secure connection":
          current_reason = global.sharedObj.language.no_secure_connection;
          break;
        case "No internet":
          current_reason = global.sharedObj.language.no_internet;
          break;
        default:
          current_reason = global.sharedObj.language.unkown_error;
          break;
      }
      notification_manager.show(
        "",
        global.sharedObj.language.notification_account_details_not_saved +
          current_reason
      );
    }
  } catch (err) {
    switch (result.reason) {
      case "Server refused connection":
        current_reason = global.sharedObj.language.server_refused_connection;
        break;
      case "No secure connection":
        current_reason = global.sharedObj.language.no_secure_connection;
        break;
      case "No internet":
        current_reason = global.sharedObj.language.no_internet;
        break;
      default:
        current_reason = global.sharedObj.language.unkown_error;
        break;
    }
    notification_manager.show(
      "",
      global.sharedObj.language.notification_account_details_not_saved +
        current_reason
    );
    event.reply("account-manager-edit-channel", "");
    print("Account Manager Event Handler", err);
  }
});

ipcMain.on("account-manager-getGroups-channel", async (event, data) => {
  try {
    let groups = await account_manager.getGroups();
    if (groups !== undefined) {
      event.reply("account-manager-getGroups-channel", JSON.stringify(groups));
    }
  } catch (err) {
    switch (err) {
      case "User not logged in":
        software_manager.closeAll();
        await account_manager.logout();
        tray_manager.setMenu(await generateTrayWithSoftwareList());
        window_manager.closeAll();
        window_manager.open(
          650,
          600,
          650,
          600,
          file_manager.file_list.gui.login,
          "login"
        );
        break;
      default:
        break;
    }
  }
});

ipcMain.on("account-manager-login-channel", async (event, data) => {
  let window_operation = JSON.parse(data);
  //TODO: Renderer Software manager API
  event.reply(
    "account-manager-login-channel",
    global.sharedObj.language.loggingIn
  );
  try {
    const logged_in = await account_manager.login(
      window_operation.username,
      window_operation.password
    );

    if (logged_in === true) {
      event.reply(
        "account-manager-login-channel",
        global.sharedObj.language.loggedIn
      );
      event.reply(
        "account-manager-login-channel",
        global.sharedObj.language.startingTheApp
      );

      global.sharedObj.language = language_manager.getLanguagePack(
        (await account_manager.language()) || app.getLocale()
      );
      tray_manager.setMenu(await generateTrayWithSoftwareList());

      if (!isDev) {
        //Check for updates. This is useful if you wanna force a critical software update
        autoUpdater.checkForUpdatesAndNotify();
      } else {
        print(
          "Update Manager",
          "Not checking update because it is running in dev mode"
        );
      }

      window_manager.open(
        1100,
        600,
        800,
        600,
        file_manager.file_list.gui.app,
        "app"
      );

      window_manager.close("login");
      //enableTrayIcon(true);
    } else {
      switch (logged_in) {
        case "Operation not allowed":
          event.reply(
            "account-manager-login-channel",
            global.sharedObj.language.credentialsWrong + ". "
          );
          break;
        case "Invalid credentials":
          event.reply(
            "account-manager-login-channel",
            global.sharedObj.language.credentialsWrong + ". "
          );
          break;
        case "Account not authorized. Please verify your account or contact the support.":
          event.reply(
            "account-manager-login-channel",
            global.sharedObj.language.accountNotAuthorized + ". "
          );
          break;
        default:
          event.reply(
            "account-manager-login-channel",
            global.sharedObj.language.anErrorHappened +
              ". " +
              global.sharedObj.language.tryAgainLater +
              "."
          );
          break;
      }
    }
  } catch (err) {
    switch (err) {
      case "Server refused connection":
        event.reply(
          "account-manager-login-channel",
          global.sharedObj.language.server_refused_connection
        );
        break;
      case "No secure connection":
        event.reply(
          "account-manager-login-channel",
          global.sharedObj.language.no_secure_connection
        );
        break;
      case "No internet":
        event.reply(
          "account-manager-login-channel",
          global.sharedObj.language.no_internet
        );
        break;
      default:
        event.reply(
          "account-manager-login-channel",
          global.sharedObj.language.anErrorHappened +
            ". " +
            global.sharedObj.language.tryAgainLater +
            "."
        );
        break;
    }
  }
});

//Window Manager
ipcMain.on("window-manager-close-channel", function (event, data) {
  window_manager.close(data);
});

//Check update on startup
ipcMain.on("update-channel", function (event, data) {
  if (!isDev) {
    //Tell the update system to check for updates
    autoUpdater.checkForUpdatesAndNotify();
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.checkingUpdates
      );
  }
});

//RUA Engine
const axios = require("axios");
ipcMain.on("rua-fetch-file-upload", async function (event, data) {
  const callID = data[0];
  const url = data[1];
  const params = data[2];
  const headers = params.headers;
  const method = params.method;
  const body = JSON.parse(params.body);

  const FormData = require("form-data");

  console.log(
    "\n============================Uploading file details============================\n"
  );
  console.log(
    "Method:",
    method,
    "\nUrl:",
    url,
    "\nHeaders:",
    headers,
    "\nFile location:",
    body.file,
    " (exists?",
    fs.existsSync(body.file),
    ")",
    "\nBody parameters:",
    body,
    "\n\n============================Uploading file details============================\n"
  );

  console.log(
    "\n============================FILE UPLOAD PROCESS============================\n"
  );

  //Generate form
  const form = new FormData();

  Object.keys(body).forEach((bodyKey) => {
    console.log(`Entry "${bodyKey}" contains "${body[bodyKey]}"`);
    if (bodyKey === "" || bodyKey === "file") return;
    form.append(bodyKey, body[bodyKey]);
  });
  if (body.file) {
    if (!fs.existsSync(body.file))
      throw new Error("File does not exist!", body.file);
    form.append("file", fs.createReadStream(body.file));
  }

  //Generate headers
  const config = {
    headers: {
      ...headers,
      ...form.getHeaders(),
    },
  };

  console.log("Generated config:", config);
  console.log("Generated form:", form);

  //Sent the response
  try {
    let response;
    if (method === "POST") response = await axios.post(url, form, config);
    if (method === "GET") response = await axios.get(url, form, config);

    console.log("Response:", response);

    return event.reply(
      "rua-fetch-file-upload-" + callID,
      JSON.stringify(response)
    );
  } catch (error) {
    if (error.response) console.log("Error:", error.response.data);
    else console.log("Error:", error.cause);

    try {
      return event.reply(
        "rua-fetch-file-upload-" + callID,
        JSON.stringify(error.response.data)
      );
    } catch (err) {
      return event.reply(
        "rua-fetch-file-upload-" + callID,
        JSON.stringify({
          success: false,
          reason: "Unkown Error",
        })
      );
    }
  }

  console.log(
    "\n============================FILE UPLOAD PROCESS============================\n"
  );
  return;
});
ipcMain.on("rua-fetch", async function (event, data) {
  const callID = data[0];
  const url = data[1];
  const params = data[2];
  const body = params.body ? JSON.parse(params.body) : params.body;
  const method = params.method;
  const header = params.headers;

  let axiosParams = {
    method: method,
    url: url,
    headers: {
      ...header,
    },
  };
  if (body) axiosParams.data = body;

  try {
    const response = (await axios(axiosParams)).data;
    return event.reply("rua-fetch-" + callID, JSON.stringify(response));
  } catch (err) {
    try {
      return event.reply(
        "rua-fetch-" + callID,
        JSON.stringify(error.response.data)
      );
    } catch (err) {
      return event.reply(
        "rua-fetch-" + callID,
        JSON.stringify({
          success: false,
          reason: "Unkown Error",
        })
      );
    }
  }
  /*axios(axiosParams)
    .then((response) => {
      event.reply("rua-fetch", JSON.stringify(response.data));
    })
    .catch((error) => {
      try {
        event.reply("rua-fetch", JSON.stringify(error.response.data));
      } catch (err) {
        event.reply("rua-fetch", JSON.stringify({
          success: false,
          reason: "Unkown Error",
        }));
      }
    });
    */
});
ipcMain.on("rua-fetch-file-download", async function (event, data) {
  const callID = data[0];
  const url = data[1];
  const params = data[2];
  const body = params.body ? JSON.parse(params.body) : params.body;
  const method = params.method;
  const header = params.headers;

  console.log("callID:", callID);
  console.log("url:", url);
  console.log("params:", params);
  console.log("body:", body);
  console.log("method:", method);
  console.log("header:", header);

  const fileWriter = fs.createWriteStream(params.saveFileToLocation);

  let axiosParams = {
    method: method,
    url: url,
    headers: {
      ...header,
    },
    responseType: "stream",
  };
  if (body) axiosParams.data = body;

  console.log(axiosParams);

  try {
    const response = await axios(axiosParams);
    response.data.pipe(fileWriter);
    let error = null;
    fileWriter.on("error", (err) => {
      error = err;
      fileWriter.close();
      event.reply(
        "rua-fetch-file-download-" + callID,
        JSON.stringify(error.response.data)
      );
    });
    fileWriter.on("close", () => {
      console.log("File download finished!");
      if (!error) {
        event.reply("rua-fetch-file-download-" + callID, true);
      }
      //no need to call the reject here, as it will have been called in the
      //'error' stream;
    });
  } catch (err) {
    try {
      return event.reply(
        "rua-fetch-" + callID,
        JSON.stringify(error.response.data)
      );
    } catch (err) {
      return event.reply(
        "rua-fetch-" + callID,
        JSON.stringify({
          success: false,
          reason: "Unkown Error",
        })
      );
    }
  }
});
//#endregion

//#region Update system
const server = internet_manager.app_update_url;
const updaterFeedURL = `${server}/${process.platform}-${process.arch}`;

autoUpdater.setFeedURL(updaterFeedURL);

autoUpdater.on("checking-for-update", () => {
  if (window_manager.get("startup") !== undefined) {
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.checkingUpdates
      );
  }
});

autoUpdater.on("update-available", () => {
  if (window_manager.get("startup") !== undefined) {
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.updateAvailable
      );
  } else {
    notification_manager.show(
      "",
      global.sharedObj.language.rehstore_downloading_latest_client_version
    );
  }
});

autoUpdater.on("update-not-available", async () => {
  print("Update Manager", "No update was found");

  if (window_manager.get("startup") !== undefined) {
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.runningLastestVersion
      );

    if (await account_manager.logged_in()) {
      window_manager.open(
        1100,
        700,
        800,
        700,
        file_manager.file_list.gui.app,
        "app"
      );
      //enableTrayIcon(true);
    } else {
      window_manager.open(
        650,
        600,
        650,
        600,
        file_manager.file_list.gui.login,
        "login"
      );
    }
    window_manager.close("startup");
  } else {
    notification_manager.show(
      "",
      global.sharedObj.language.runningLastestVersion
    );
  }
});

autoUpdater.on("error", (err) => {
  if (window_manager.get("startup") !== undefined) {
    printError("Update System", err);
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.errorWhileUpdating
      );

    setTimeout(async () => {
      //Start the Reh@Store if it is offline
      if (window_manager.get("startup") !== undefined) {
        if (await account_manager.logged_in()) {
          window_manager.open(
            1100,
            700,
            800,
            700,
            file_manager.file_list.gui.app,
            "app"
          );
          //enableTrayIcon(true);
        } else {
          window_manager.open(
            650,
            600,
            650,
            600,
            file_manager.file_list.gui.login,
            "login"
          );
        }
        window_manager.close("startup");
      }
    }, 500);
  }
});

autoUpdater.on("download-progress", (progressObj) => {
  if (window_manager.get("startup") !== undefined) {
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        `${
          global.sharedObj.language.downloading
        }: ${progressObj.percent.toFixed(2)}`
      );
  }
});

autoUpdater.on("update-downloaded", (event, releaseNotes, releaseName) => {
  if (window_manager.get("startup") !== undefined) {
    window_manager
      .get("startup")
      .webContents.send(
        "update-channel",
        global.sharedObj.language.applicationUpdating
      );
    setTimeout(() => {
      autoUpdater.quitAndInstall(true, true);
    }, 3000);
  } else {
    notification_manager.show(
      "",
      global.sharedObj.language.close_rehstore_to_update
    );
  }
});

//Check for updates (daily)
setInterval(() => {
  print("Update Manager", "Checking for updates...");
  if (!isDev) {
    autoUpdater.checkForUpdatesAndNotify();
  }
}, 1000 * 60 * 60 * 24);

//#endregion

//#endregion

/***********************************************
 * 大井 大井 大井 大井 待って待って!             *
 * Why did I do this? ¯\_(ツ)_/¯               *
 * Maybe I was bored. Engineer's get bored too *
 * Here, have this nice unicorn instead        *
 * Cheers! - Ivan Teixeira                     *
 * https://github.com/Zlynt                    *
 ***********************************************

\.
 \\      .
  \\ _,.+;)_
  .\\;~%:88%%.
 (( a   `)9,8;%.
 /`   _) ' `9%%%?
(' .-' j    '8%%'
 `"+   |    .88%)+._____..,,_   ,+%$%.
       :.   d%9`             `-%*'"'~%$.
    ___(   (%C                 `.   68%%9
  ."        \7                  ;  C8%%)`
  : ."-.__,'.____________..,`   L.  \86' ,
  : L    : :            `  .'\.   '.  %$9%)
  ;  -.  : |             \  \  "-._ `. `~"
   `. !  : |              )  >     ". ?
     `'  : |            .' .'       : |
         ; !          .' .'         : |
        ,' ;         ' .'           ; (
       .  (         j  (            `  \
       """'          ""'             `""


 */
