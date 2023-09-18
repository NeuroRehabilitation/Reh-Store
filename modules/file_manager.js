const path = require('path');
const fs = require('fs-extra');
const electron = process.type === 'browser'
    ? require('electron')
    : require('@electron/remote');
const { app } = electron;
var os = require('os');

let package_dir = app.getAppPath();
let userDataFolder = app.getPath('userData');
let userDocumentsFolder = app.getPath('documents');

const file_manager = {
    directory_list: {
        languages_dir: path.join(package_dir, 'gui', 'languages'),
        app_data: path.join(userDataFolder, 'app_data'),
        software_folder: path.join(userDataFolder, 'app_data', 'software'),
        data_folder: path.join(userDocumentsFolder, 'RehStore'),
        old_data_folder: path.join(userDataFolder, 'app_data', 'data'),
        inicial_data_folder: path.join(userDataFolder, 'app_data', 'inicial_data'),
        software_logs: path.join(userDataFolder, 'app_data', 'software_logs'),
        internet_cache_folder: path.join(userDataFolder, 'app_data', 'internet_cache'),
        gui: path.join(package_dir, 'gui')
    },
    file_list: {
        icon: path.join(package_dir, 'icon.ico'),
        user_token: path.join(userDataFolder, 'app_data', 'user_token.json'),
        gui: {
            app: path.join(package_dir, 'gui', 'app', 'index.html'),
            login: path.join(package_dir, 'gui', 'login', 'index.html'),
            startup: path.join(package_dir, 'gui', 'startup', 'index.html'),
            about: path.join(package_dir, 'gui', 'about', 'index.html'),
            jitsi: path.join(package_dir, 'gui', 'jitsi', 'index.html'),
            support_chat: path.join(package_dir, 'gui', 'support_chat', 'index.html'),
            publisher_pannel: path.join(package_dir, 'gui', 'publisher_pannel', 'index.html'),
            admin_pannel: path.join(package_dir, 'gui', 'admin_pannel', 'index.html'),
            manual_reader: path.join(package_dir, 'gui', 'manual_reader', 'index.html')
        }
    },
    /**
     * Transform a relative RehaStore path format into an absolute one
     * @param {*} custom_path 
     * @param {*} app_name (Opcional)
     * @param {*} rehstore_username (Opcional)
     * @returns 
     */
    process_custom_path: (custom_path = "", app_name = "", rehstore_username = "") => {
        return file_manager.process_custom_pathAux(
            custom_path, app_name, rehstore_username,
            path.join(file_manager.directory_list.software_folder, app_name),
            os.userInfo().username,
            os.homedir()
        );
    },
    process_custom_pathAux: (
        custom_path = "",
        app_name = "",
        rehstore_username = "",
        software_folder_location = "",
        system_username = "",
        user_home_dir_location = ""
    ) => {
        let output_path = custom_path + ''; //Make sure it is a string
        output_path = output_path.replaceAll(":software_folder:",
            software_folder_location
        );
        output_path = output_path.replaceAll(":rehstore_username:", rehstore_username);
        output_path = output_path.replaceAll(":system_username:", system_username);
        output_path = output_path.replaceAll(":user_home_dir:", user_home_dir_location);
        output_path = path.normalize(output_path);

        if (os.platform() === "linux") {
            output_path = output_path.replaceAll("\\", "/");
        }
        return output_path;
    },

    start: () => {
        //Make sure the app_data exists
        fs.ensureDirSync(file_manager.directory_list.app_data);

        //Make sure software folder exists
        fs.ensureDirSync(file_manager.directory_list.software_folder);

        //Make sure data folder exists
        fs.ensureDirSync(file_manager.directory_list.data_folder);

    },

    getUserToken: () => {
        try {
            if (fs.lstatSync(file_manager.file_list.user_token).isFile()) {
                return JSON.parse(fs.readFileSync(file_manager.file_list.user_token, 'utf-8'));
            } else {
                return undefined;
            }
        } catch (err) {
            return undefined;
        }
    }
}

module.exports = file_manager;
