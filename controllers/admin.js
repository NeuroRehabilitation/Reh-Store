'use strict';
const { json } = require('express');
var express = require('express');
const fs = require('fs');
const path = require('path');
//OS Related Info
var os = require('os');
//Get available disk space
const checkDiskSpace = require('check-disk-space').default;

async function getStorageStatistics() {
    return new Promise((resolve, reject) => {
        function bytesToSize(bytes) {
            var sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
            if (bytes == 0) return '0 Byte';
            var i = parseInt(Math.floor(Math.log(bytes) / Math.log(1024)));
            return Math.round(bytes / Math.pow(1024, i), 2) + ' ' + sizes[i];
        }
        try {
            checkDiskSpace(path.join(
                __dirname, '..',
                'storage_system'
            )).then((diskSpace) => {
                resolve({
                    free: bytesToSize(diskSpace.free),
                    size: bytesToSize(diskSpace.size),
                    usedPercentage: Math.round(100 - ((diskSpace.free * 100) / diskSpace.size)) + '%'
                });
                return;
            });
        } catch (error) {
            reject(error);
            return;
        }
    })
}


var router = express.Router();

//#region Models
const models_folder = path.join(__dirname, '..', 'models');
const modules_folder = path.join(__dirname, '..', 'modules');
const isJsonValid = require(path.join(models_folder, 'isJsonValid'));
const account_manager = require(path.join(models_folder, 'accounts'));
const email_manager = require(path.join(models_folder, 'email'));
const config_manager = require(path.join(models_folder, 'config_manager'));
//#endregion

const { print, printError } = require(path.join(modules_folder, 'custom_print'));

const webserver_config = config_manager.get('webserver.json');

router.get('/', function (req, res) {
    res.setHeader("Content-Security-Policy",
        "default-src 'self' data: gap: https://rehstore.arditi.pt https://fonts.gstatic.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;").
        header(200).render('admin_pannel/index', { siteName: 'Reh@Store', mainPage: true });
});

router.post('/edit_user', async (req, res) => {
    let adminToken = req.fields.token;
    let old_username = req.fields.username || "";
    let new_username = req.fields.new_username || "";
    let new_email = req.fields.email || "";
    let new_first_name = req.fields.first_name || "";
    let new_last_name = req.fields.last_name || "";
    let birth_date = req.fields.birth_date || "";
    let new_language = req.fields.language || "";
    let user_groups = req.fields["user_groups[]"] || [];

    try {
        //#region Verify if the user can do the operation
        const adminUsername = req.session_manager.access_token.valid(adminToken);
        if (!adminUsername) {
            res.header(200).json({
                result: false,
                reason: "Invalid Token"
            });
            return;
        }
        const adminAccountActivated = await account_manager.user.getAccountActivation(adminUsername);
        if (!adminAccountActivated) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        if (!(await account_manager.permissions.users.hasPermission(adminUsername, 'admin_edit_user'))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }
        //#endregion

        const edition_result = await account_manager.user.edit(
            old_username,
            new_email,
            new_first_name,
            new_last_name, birth_date, new_language, ""
        );
        if (!edition_result) {
            res.header(200).json({
                result: false
            });
            return;
        }

        if (new_email !== "") {
            await account_manager.user.setAccountActivation(old_username, false);
            const confirmation_code = await account_manager.user.confirmation_code.create(old_username);
            if (confirmation_code !== "") {
                email_manager.sendconfirmationEmail(
                    old_username,
                    webserver_config.hostname + '/api/account/verify?code=' + confirmation_code
                );
            }
        }

        if (Array.isArray(user_groups)) {
            //Remove current user groups
            const current_user_groups = await account_manager.groups.users.getGroups(old_username);
            for (let i = 0; i < current_user_groups.length; i++) {
                const user_group = current_user_groups[i];
                console.log("Removing " + user_group)
                await account_manager.groups.users.remove(old_username, user_group);
            }
            //Insert the new user groups
            for (let i = 0; i < user_groups.length; i++) {
                const user_group = user_groups[i];
                console.log("Adding " + user_group)
                if ((typeof user_group) === "string") {
                    if (!(await account_manager.groups.users.hasGroup(old_username, user_group))) {
                        await account_manager.groups.users.add(old_username, user_group);
                    }
                }
            }
        } else if ((typeof user_groups) === "string") {
            //Remove current user groups
            const current_user_groups = await account_manager.groups.users.getGroups(old_username);
            for (let i = 0; i < current_user_groups.length; i++) {
                const user_group = current_user_groups[i];
                console.log("Removing " + user_group)
                await account_manager.groups.users.remove(old_username, user_group);
            }
            await account_manager.groups.users.add(old_username, user_groups);

        }

        if (new_username !== "") {
            await account_manager.user.change_username(old_username, new_username);
        }

        res.header(200).json({
            result: true
        });
    } catch (err) {
        printError("Admin API", err);
        res.header(200).json({
            result: false,
            reason: "Unkown Error"
        });
        return;
    }

})

router.post('/remove_user', async (req, res) => {
    const adminToken = req.fields.token || "";
    const userToBeRemoved = req.fields.username || "";

    try {
        const adminUsername = req.session_manager.access_token.valid(adminToken);
        if (!adminUsername) {
            res.header(200).json({
                result: false,
                reason: "Invalid Token"
            });
            return;
        }
        const adminAccountActivated = await account_manager.user.getAccountActivation(adminUsername);
        if (!adminAccountActivated) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        if (!(await account_manager.permissions.users.hasPermission(adminUsername, 'admin_remove_user'))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const remove_result = await account_manager.user.remove(userToBeRemoved);

        if (remove_result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: "Unkown Error"
            });
            return;
        }
    } catch (err) {
        printError("Admin API", err);
        res.header(200).json({
            result: false,
            reason: "Unkown Error"
        });
        return;
    }
});

router.ws('/', function (ws, req) {
    print("Admin Pannel Socket", "A client connected");
    ws.on('message', async (msg) => {
        try {

            if (!isJsonValid(msg)) {
                ws.close();
                return;
            }
            const json_data = JSON.parse(msg);
            const channel = json_data.channel;
            if (!isJsonValid(json_data.data)) {
                ws.close();
                return;
            }
            const request = JSON.parse(json_data.data);

            const username = req.session_manager.access_token.valid(request.token);
            if (!username) {
                printError("Admin Socket", "Got invalid Username from channel " + channel);
                ws.send(JSON.stringify({
                    channel: channel,
                    data: {
                        result: false,
                        reason: 'Invalid Token'
                    }
                }));
                ws.close();
                return;
            }

            //In this websocket url, each channel has it's own permissions to acess it
            //The permission name is the same has the channel name
            if (!(await account_manager.permissions.users.hasPermission(username, "admin_" + channel))) {
                ws.send(JSON.stringify({
                    channel: channel,
                    data: {
                        result: false,
                        reason: 'No permissions'
                    }
                }));
                return;
            }

            if (!(await account_manager.user.getAccountActivation(username))) {
                ws.send(JSON.stringify({
                    channel: channel,
                    data: {
                        result: false,
                        reason: 'Account not activated'
                    }
                }));
                return;
            }

            switch (channel) {
                case "server_statistic":

                    const num_total_users = await account_manager.users.numberOfUsers();
                    ws.send(JSON.stringify({
                        channel: channel,
                        data: {
                            result: true,
                            data: {
                                ram: Math.round(100 - ((os.freemem() * 100) / os.totalmem())) + '%',
                                num_total_users: num_total_users,
                                disk: await getStorageStatistics()
                            }
                        }
                    }));
                    return;
                case "account_getUserList":
                    if (!account_manager.parameter_validation.isDataAll.integers(request.index)) {
                        ws.send(JSON.stringify({
                            channel: channel,
                            data: {
                                result: false,
                                reason: 'Min number not a valid number'
                            }
                        }));
                        return;
                    }
                    if (!account_manager.parameter_validation.isDataAll.integers(request.length)) {
                        ws.send(JSON.stringify({
                            channel: channel,
                            data: {
                                result: false,
                                reason: 'Min number not a valid number'
                            }
                        }));
                        return;
                    }
                    const req_index = request.index >= 0 ? request.index : 0;
                    const req_length = request.length >= 0 ? request.length : 0;
                    const user_list = await account_manager.users.getUserList(req_index, req_length);
                    ws.send(JSON.stringify({
                        channel: channel,
                        data: {
                            result: true,
                            data: user_list
                        }
                    }));
                    return;

                default:
                    break;
            }
        } catch (err) {
            printError("Admin Socket", err);
        }
    });
});



module.exports = router;