const fs = require('fs-extra');
const path = require('path');

const { machineIdSync } = require('node-machine-id');

const file_manager = require('./file_manager');
const { print, printError } = require('./custom_print');

const data_folder = file_manager.directory_list.data_folder;
const software_folder = file_manager.directory_list.software_folder;
const inicial_data_folder = file_manager.directory_list.inicial_data_folder;

const data_manager = {
    software: {
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
                printError("Data Manager - software.getInfoParams", "Cannot get package info parameters: " + err);
                return undefined;
            }
        },
        getInfoRuaParams: (app_name = "") => {
            //app_name -> package_id + '.' + branch + '.' + version;
            const app_info_parameters_filepath = path.join(software_folder, app_name, 'rua_settings.json');
            try {
                const app_info_parameters = JSON.parse(fs.readFileSync(app_info_parameters_filepath, 'utf-8'));
                    return app_info_parameters;
            } catch (err) {
                printError("Data Manager - software.getInfoParams", "Cannot get package info parameters: " + err);
                return undefined;
            }
        },
        getDataParams: (package_id = "", branch = "", version = "") => {
            const app_name = package_id + '.' + branch + '.' + version;
            const app_data_parameters_filepath = path.join(software_folder, app_name, 'app_data.json');
            try {
                const app_data_parameters = JSON.parse(fs.readFileSync(app_data_parameters_filepath, 'utf-8'));
                if (
                    app_data_parameters.slot_name !== "" &&
                    app_data_parameters.slot_name !== undefined &&
                    app_data_parameters.files !== undefined &&
                    Array.isArray(app_data_parameters.files)
                ) {
                    return app_data_parameters;
                }
            } catch (err) {
                printError("Data Manager - software.getDataParams", "Cannot get package data parameters: " + err, true);
                return undefined;
            }
        },
        logs: {
            write: (package_id = "", branch = "", version = "", username = "", filename = "", data = "") => {
                print("Data Manager - logs.write", `[${package_id}] Wrote ${filename}`);
                let params = data_manager.software.getDataParams(package_id, branch, version);
                if (params === undefined) {
                    printError("Data Manager - logs.write", `[${package_id}] Log data could not be saved: Bad app_data.json file.`, true);
                    return;
                }

                let software_log_dir = path.normalize(path.join(
                    file_manager.directory_list.data_folder,
                    username,
                    package_id,
                    params.slot_name, machineIdSync(),
                    'Telemetry'
                ));
                fs.ensureDirSync(software_log_dir);

                fs.appendFileSync(path.join(software_log_dir, filename), data + "\n", 'utf-8');
            }
        },
        slot: {
            /**
             * Auxiliary to save and restore functions
             * @param {*} folder Folder to save/restore the files to/from
             * @param {*} paramsList List of files declared in the package
             * @param {*} operation "save" -> Save files from app_data.json; "restore" -> Restore files to app_data.json
             * @param {*} package_id ID of the software package
             * @param {*} branch Branch of the software
             * @param {*} version Version of the software
             * @returns 
             */
            auxiliaryCopy: (
                folder = "", paramsList = {}, operation = "",
                package_id = "", branch = "", version = "",
                username = ""
            ) => {
                if (
                    folder === "" || paramsList === "" || operation === "" ||
                    package_id === "" || branch === "" || version === "" || username === ""
                ) {
                    printError("Data Manager - slot.auxiliaryCopy", "Received empty fields");
                    return false;
                }

                //Ensure the "folder" directory exists
                fs.ensureDirSync(folder);

                let folderList1 = []; //Location of saved files/folders
                let folderList2 = []; //Location of files/folders in runtime
                let dataType = [];
                paramsList.forEach(content => {
                    //Prepare the file/directory location
                    let folderList1Content = file_manager.process_custom_pathAux(
                        content.location,
                        package_id + '.' + branch + '.' + version,
                        username,
                        path.join(folder, 'Software_Folder'),
                        path.join(folder, 'User_Personal_Folder'),
                        path.join(folder, 'Home_User_Dir')
                    );
                    folderList1.push(folderList1Content);

                    let folderList2Content = file_manager.process_custom_path(
                        content.location,
                        package_id + '.' + branch + '.' + version
                    );
                    folderList2.push(folderList2Content);

                    //Save data type
                    dataType.push(content.type);
                });

                let fromFolder, toFolder;
                switch (operation) {
                    case "restore":
                        fromFolder = folderList1;
                        toFolder = folderList2;
                        break;
                    case "save":
                        fromFolder = folderList2;
                        toFolder = folderList1;
                        break;
                    default: return false;
                }
                dataType.forEach((value, index) => {
                    switch (value) {
                        case "folder":
                            //Delete folder
                            //This is necessary. If a file is deleted during runtime
                            //We must save the data without the deleted file because
                            //In the next time the software is used, the file is restored
                            fs.removeSync(toFolder[index]);
                            fs.ensureDirSync(toFolder[index]);
                            fs.copySync(fromFolder[index], toFolder[index], {
                                overwrite: true
                            });
                            break;
                        case "file":
                            fs.removeSync(toFolder[index]);
                            fs.ensureDirSync(path.join(toFolder[index], '..'));
                            fs.copySync(fromFolder[index], toFolder[index], {
                                overwrite: true
                            });
                            break;
                        default: break;
                    }
                });
                return true;
            },
            //Save data from the software environment into the slot
            save: (package_id = "", branch = "", version = "", username = "") => {
                let params = data_manager.software.getDataParams(package_id, branch, version);
                if (params === undefined) {
                    printError("Data Manager - slot.save", `[${package_id}] Slot data could not be saved: Bad app_data.json file.`);
                    return false;
                }

                //Get the folder location
                let folder = path.join(
                    file_manager.directory_list.data_folder,
                    username,
                    package_id,
                    params.slot_name, machineIdSync(),
                    'Saved_Data'
                );

                print("Data Manager - slot.save", `[${package_id}] Saving slot data from user ${username}`);

                //Request data transfer between folders
                return data_manager.software.slot.auxiliaryCopy(
                    folder,
                    params.files,
                    "save",
                    package_id,
                    branch,
                    version,
                    username
                );
            },
            //Restore data form the slot into the software environment
            restore: (package_id = "", branch = "", version = "", username = "") => {
                let params = data_manager.software.getDataParams(package_id, branch, version);
                if (params === undefined) {
                    printError("Data Manager - slot.restore", `[${package_id}] Slot data could not be restored: Bad app_data.json file.`);
                    return false;
                }

                //Get the folder location
                let folder = path.join(
                    file_manager.directory_list.data_folder,
                    username,
                    package_id,
                    params.slot_name, machineIdSync(),
                    'Saved_Data'
                );

                print("Data Manager - slot.restore", `[${package_id}] Restoring slot data from user ${username}`);

                if (fs.existsSync(folder) && fs.statSync(folder).isDirectory()) {
                    //Request data transfer between folders
                    return data_manager.software.slot.auxiliaryCopy(
                        folder,
                        params.files,
                        "restore",
                        package_id,
                        branch,
                        version,
                        username
                    );
                } else {
                    return data_manager.software.inicial_slot.restore(
                        package_id, branch, version, username
                    );
                }
            },

            //Delete all user data stored in the computer (Not implemented)
            //TODO: Implement this method only if needed
            deleteAll: (username = "") => {
                print("Data Manager - slot.delete", `[${package_id}] Deleting all the user '${username}' slot's relate data from this device`);
            },
        },
        //Inicial Slot
        inicial_slot: {
            //Save the data from the software environment into inicial slot dir
            save: (package_id = "", branch = "", version = "", username) => {
                let params = data_manager.software.getDataParams(package_id, branch, version);
                if (params === undefined) {
                    printError("Data Manager - inicial_slot.save", `[${package_id}] Inicial Slot data could not be saved: Bad app_data.json file.`);
                    return false;
                }

                //Get the folder location
                let folder = path.join(
                    file_manager.directory_list.inicial_data_folder,
                    package_id,
                    params.slot_name
                );

                print("Data Manager - inicial_slot.save", `[${package_id}] Saving inicial slot data`);

                //Request data transfer between folders
                return data_manager.software.slot.auxiliaryCopy(
                    folder,
                    params.files,
                    "save",
                    package_id,
                    branch,
                    version,
                    username
                );
            },
            //Restore the inicial slot data into the software running environment
            restore: (package_id, branch = "", version = "", username) => {
                let params = data_manager.software.getDataParams(package_id, branch, version);
                if (params === undefined) {
                    printError("Data Manager - inicial_slot.restore", `[${package_id}] Inicial Slot data could not be restored: Bad app_data.json file.`);
                    return false;
                }

                //Get the folder location
                let folder = path.join(
                    file_manager.directory_list.inicial_data_folder,
                    package_id,
                    params.slot_name
                );

                print("Data Manager - inicial_slot.restore", `[${package_id}] Restoring inicial slot data`);

                //Request data transfer between folders
                return data_manager.software.slot.auxiliaryCopy(
                    folder,
                    params.files,
                    "restore",
                    package_id,
                    branch,
                    version,
                    username
                );
            },

            //Delete the inicial slot folder from the device
            remove: (package_id = "", branch = "", version = "") => {
                let params = data_manager.software.getDataParams(package_id, branch, version);

                if (params === undefined) {
                    printError("Data Manager - inicial_slot.remove", `[${package_id}] Inicial slot data could not be deleted: Bad app_data.json file.`);
                    return;
                }
                print("Data Manager - inicial_slot.remove", `[${package_id}] Deleting inicial slot data`);

                const inicial_slot_dir = path.normalize(path.join(
                    file_manager.directory_list.inicial_data_folder,
                    package_id,
                    params.slot_name
                ))

                fs.removeSync(inicial_slot_dir);
            }
        }
    }
}

module.exports = data_manager;