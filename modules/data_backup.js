const internet_manager = require('./internet_manager');
const file_manager = require('./file_manager');
const { print, printError } = require('./custom_print');
const fs = require('fs-extra');
const { machineIdSync } = require('node-machine-id');
const console = require('hus-console');
const sftpBackup = require('../custom_node_modules/SFTP_Sync');

//Notification Manager
let notification_manager = require('./notification_manager');

const { deploy } = require('sftp-sync-deploy');
const path = require('path');



module.exports = async (username, password) => {
    fs.ensureDirSync(path.normalize(path.join(file_manager.directory_list.data_folder, username)));
    let config = {
        host: internet_manager.data_backup_server,            // Required.
        port: 8444,                       // Optional, Default to 22.
        username: username,               // Required.
        password: password,           // Optional.
        localDir: path.normalize(path.join(file_manager.directory_list.data_folder, username)),               // Required, Absolute or relative to cwd.
        remoteDir: '/' + username      // Required, Absolute path only.
    };

    /*let options = {
        dryRun: false,                  // Enable dry-run mode. Default to false
        exclude: [                      // exclude patterns (glob)
        ],
        excludeMode: 'remove',          // Behavior for excluded files ('remove' or 'ignore'), Default to 'remove'.
        forceUpload: true,             // Force uploading all files, Default to false(upload only newer files).
        concurrency: 50                // Max number of SFTP tasks processed concurrently. Default to 100.
    };*/

    print("Data Cloud", "Backing up data to cloud...");
    notification_manager.show(
        '',
        global.sharedObj.language.backing_up_data_to_cloud
    );
    try {
        let backup_list = [];
        for (const software of fs.readdirSync(config.localDir)) {
            let software_dir = path.join(config.localDir, software);
            for (const slot of fs.readdirSync(software_dir)) {
                let software_slot_dir = path.join(software_dir, slot);
                for (const slot_device_id of fs.readdirSync(software_slot_dir)) {
                    if (slot_device_id === machineIdSync()) {
                        backup_list.push({
                            from: path.join(software_slot_dir, slot_device_id),
                            to: (path.join('/', username, software, slot, slot_device_id) + '').replace(/\\/g, '/') //Force Unix path style
                        });
                    }
                }
            }
        }

        await sftpBackup(config.host, config.port, username, password, backup_list);
        print("Data Cloud", "All files have been saved to the cloud!");
        //print("Data Cloud", "Backup List:");
        //console.log(backup_list);
        notification_manager.show(
            '',
            global.sharedObj.language.backed_up_data_to_cloud
        );
    } catch (err) {
        printError("Data Cloud", err);
        notification_manager.show(
            '',
            global.sharedObj.language.not_backed_up_data_to_cloud
        );
    };
    /**deploy(config, options).then(() => {
        print("Data Cloud", "All files have been saved to the cloud!");
        notification_manager.show(
            '',
            global.sharedObj.language.backed_up_data_to_cloud
        );
    }).catch(err => {
        printError("Data Cloud", err);
        notification_manager.show(
            '',
            global.sharedObj.language.not_backed_up_data_to_cloud
        );
    });**/
}