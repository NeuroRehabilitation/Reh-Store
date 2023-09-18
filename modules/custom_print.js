const console_colors = require('./console_color');
const isDev = require('../modules/isElectronDev');
const path = require('path');
const file_manager = require('./file_manager');
const fs = require('fs-extra');
const { machineIdSync } = require('node-machine-id');
const electron = process.type === 'browser'
    ? require('electron')
    : require('@electron/remote');
const { app } = electron;
var appVersion = app.getVersion();


const software_folder = file_manager.directory_list.software_folder;

const adapted_data_manager = {
    getInfoParams: (app_name = "") => {
        //app_name -> package_id + '.' + branch + '.' + version;
        const app_info_parameters_filepath = path.join(software_folder, app_name, 'app_info.json');
        try {
            const app_info_parameters = JSON.parse(fs.readFileSync(app_info_parameters_filepath, 'utf-8'));
            if (
                //Mandatory
                app_info_parameters.id !== "" &&
                app_info_parameters.id !== undefined &&
                //Mandatory
                app_info_parameters.name !== "" &&
                app_info_parameters.name !== undefined &&
                //Opcional
                app_info_parameters.description !== undefined &&
                //Mandatory
                app_info_parameters.version !== "" &&
                app_info_parameters.version !== undefined &&
                //Mandatory
                app_info_parameters.branch !== "" &&
                app_info_parameters.branch !== undefined &&
                //Mandatory
                //app_info_parameters.start_file !== "" && //Disabled to enable telemetry and non executable packages
                //app_info_parameters.start_file !== undefined && //Disabled to enable telemetry and non executable packages
                //Opcional
                app_info_parameters.launch_parameters !== undefined &&
                //Mandatory
                app_info_parameters.working_dir !== "" &&
                app_info_parameters.working_dir !== undefined &&
                //Opcional
                app_info_parameters.after_install_script !== undefined &&
                //Opcional
                app_info_parameters.before_uninstall_script !== undefined
            ) {
                return app_info_parameters;
            }
        } catch (err) {
            custom_print.printError("Telemetry - software.getInfoParams", "Cannot get package info parameters: " + err, true);
            return undefined;
        }
    },
    write: (package_id = "", branch = "", version = "", username = "", filename = "", data = "") => {
        custom_print.print("Telemetry - logs.write", `[${package_id}] Wrote ${filename}`);
        let params = adapted_data_manager.getInfoParams(package_id + '.' + branch + '.' + version);
        if (params === undefined) {
            custom_print.printError("Telemetry - logs.write", `[${package_id}] Log data could not be saved: Bad app_info.json file.`, true);
            return;
        }

        let software_log_dir = path.normalize(path.join(
            file_manager.directory_list.data_folder,
            username,
            package_id,
            appVersion,
            machineIdSync()
        ));
        fs.ensureDirSync(software_log_dir);

        fs.appendFile(path.join(software_log_dir, filename), data + "\n", 'utf-8');
    }
}

const custom_print = {
    /**
     * 
     * @param {*} module_name 
     * @param {*} message 
     * @param {*} enableDataLog Enables printed data to be sent do Telemetry
     */
    print: (module_name, message, enableDataLog = false) => {
        let header = `${console_colors.FgGreen}`;
        if (global.sharedObj && global.sharedObj.username) {
            if (!isDev && enableDataLog) {
                let package_id = "com.zlynt.telemetry";
                let branch = "main";
                let version = "1.0.0";
                let filename = 'general_log.log';
                let data = `${+ new Date()} [${module_name}] ${message}`;

                //Save the errors
                adapted_data_manager.write(
                    package_id,
                    branch,
                    version,
                    global.sharedObj.username,
                    filename,
                    data
                );
                return;
            }

            header += '[' + global.sharedObj.username + ']';
        }
        header += `[${module_name}]${console_colors.Reset}`;

        console.log(`${header}`, message);
    },
    /**
     * Print an error on console
     * @param {*} module_name 
     * @param {*} message 
     * @param {*} disableDataLog Makes printed data not be sent do Telemetry
     * @returns 
     */
    printError: async (module_name, message, disableDataLog = false) => {
        let header = `${console_colors.FgRed}`;
        if (global.sharedObj && global.sharedObj.username) {
            if (!isDev && !disableDataLog) {
                let package_id = "com.zlynt.telemetry";
                let branch = "main";
                let version = "1.0.0";
                let filename = 'error.log';
                let data = `${+ new Date()} [${module_name}] ${message}`;

                //Save the errors
                adapted_data_manager.write(
                    package_id,
                    branch,
                    version,
                    global.sharedObj.username,
                    filename,
                    data
                );
                return;
            }

            header += '[' + global.sharedObj.username + ']';
        }
        header += `[${module_name}]${console_colors.Reset}`;

        console.log(`${header}`, message);
    },
    printDebug: (module_name, message) => {
        if (isDev)
            console.log(`${console_colors.FgYellow}[${module_name}]${console_colors.Reset}`, message);
    },
};

module.exports = custom_print;