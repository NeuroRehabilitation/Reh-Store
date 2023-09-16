'use strict';
const { Socket } = require('dgram');
var express = require('express');
const path = require('path');
const { user } = require('../models/accounts');
const email = require('../models/email');
var fs = require('fs.extra');



const models_folder = path.join(__dirname, '..', 'models');
const modules_folder = path.join(__dirname, '..', 'modules');

//#region Modules
const { print, printError } = require(path.join(modules_folder, 'custom_print'));
//#endregion

//#region Models
const config_manager = require(path.join(models_folder, 'config_manager'));
const account_manager = require(path.join(models_folder, 'accounts'));
const software_manager = require(path.join(models_folder, 'software_manager'));
//#endregion

const webserver_config = config_manager.get('webserver.json');
const storage_folder_path = path.join(__dirname, '..', 'storage_system');
const software_folder_path = path.join(storage_folder_path, 'software');
const tmp_folder_path = path.join(storage_folder_path, 'tmp');

if (!fs.existsSync(storage_folder_path)) {
    fs.mkdirSync(storage_folder_path);
}
if (!fs.existsSync(software_folder_path)) {
    fs.mkdirSync(software_folder_path);
}
if (!fs.existsSync(tmp_folder_path)) {
    fs.mkdirSync(tmp_folder_path);
}

//#region API
var router = express.Router();


const parteIpFromExpress = (req, res) => {
    let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip !== undefined) {
        ip = ip.replace(/^.*:/, '');
    } else {
        printError("Express Protect", `Invalid IP: ${ip}`);
    }
    return ip;
}

//#region Software
//Check if the user is logged in, is a publisher, and has permissions to use the api
router.use((req, res, next) => {
    let ip = parteIpFromExpress(req, res);

    let token = req.fields.token || "";

    const username = req.session_manager.access_token.valid(token);
    if (username === false) {
        printError("Software API", `${+new Date()} [${ip}] - Invalid request to ${req.url} (invalid auth token)`);
        res.header(401).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }

    req.username = username;
    req.token = token;

    const permission_name = `software_${req.url.substring(1).replaceAll("/", "_")}`;
    (account_manager.permissions.users.hasPermission(username, permission_name)).then(
        //On Sucess
        (userHasPermission) => {
            if (!userHasPermission) {
                res.header(200).json({
                    result: false,
                    reason: 'Operation not allowed'
                });
                return;
            }
            //print("Software API", `${+new Date()} [${ip}] - Request to ${req.url}`);

            next();
        },
        //On Failed
        (reason) => {
            printError("Software API", reason);
            res.header(401).json({
                result: false,
                reason: reason
            });
            return;

        }
    );
});

router.post('/admin_all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const first_software_index = req.fields.first_software_index || 0;
    const list_length = req.fields.list_length || 0;

    try {
        const result = await software_manager.software.getCustomSoftwareList(first_software_index, list_length);
        res.header(200).json({
            result: true,
            software_list: result
        });
        return;
    } catch (err) {
        printError("Software Manager", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/number_of_software', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    try {
        const result = await software_manager.software.numberOfSoftwareInThePlatform();
        if (result === false) {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        } else {
            res.header(200).json({
                result: true,
                number_of_software_in_the_platform: result
            });
            return;
        }
    } catch (err) {
        printError("Software Manager", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/what_user_can_access', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    try {
        const what_can_user_access = await software_manager.software.getSoftwareAllowedToUse(username);
        res.header(200).json({
            result: true,
            software: what_can_user_access
        });
        return;
    } catch (err) {
        printError("Software Manager", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/create', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const req_package_id = req.fields.package_id || "";
    const req_name = req.fields.name || "";
    const req_description = req.fields.description || "";
    let req_tags = req.fields.tags || req.fields["tags[]"] || [];

    if ((typeof req_tags) === "string") {
        /**
         * Instead of spliting like we do it in the interface, we leave it
         * like this for security reasons. 
         * If the make new_tags = new_tags.split(" ") and if the attacker sends a string which the
         * majority of the chars are empty spaces, it can cause non desirable effects on the parsing
         * of the tags and could lead to a potencial vulnerability
         */
        req_tags = [req_tags];
    }


    try {
        //Make sure that the next lines have for granted an array, nothing else
        if (!Array.isArray(req_tags)) {
            res.header(200).json({
                result: false,
                reason: 'Received invalid tags array'
            });
            return;
        }

        let result;
        if (req_tags === []) {
            result = await software_manager.software.create(
                username,
                req_package_id,
                req_name,
                req_description
            );
        } else {
            result = await software_manager.software.create(
                username,
                req_package_id,
                req_name,
                req_description,
                req_tags
            );
        }
        if (result === true) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software Manager", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;
    const req_package_id = req.fields.package_id || "";

    try {
        const isPackageOwner = await software_manager.software.isSoftwareOwner(username, req_package_id);
        if (!isPackageOwner) {
            printError("Software API", `The user '${username}' tried to delete someone elses software`);
            res.header(401).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const result = await software_manager.software.remove(req_package_id);

        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }

    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router.post('/admin_remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;
    const req_package_id = req.fields.package_id || "";

    try {
        const result = await software_manager.software.remove(req_package_id);

        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }

    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router.post('/all_published', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;
    let new_tags = req.fields.tags || req.fields["tags[]"] || [];

    if ((typeof new_tags) === "string") {
        /**
         * Instead of spliting like we do it in the interface, we leave it
         * like this for security reasons. 
         * If the make new_tags = new_tags.split(" ") and if the attacker sends a string which the
         * majority of the chars are empty spaces, it can cause non desirable effects on the parsing
         * of the tags and could lead to a potencial vulnerability
         */
        new_tags = [new_tags];
    }

    try {
        //Make sure that the next lines have for granted an array, nothing else
        if (!Array.isArray(new_tags)) {
            res.header(200).json({
                result: false,
                reason: 'Received invalid tags array'
            });
            return;
        }

        const user_software_list = await software_manager.software.getAllPublisherSoftware(username, new_tags);
        res.header(200).json({
            result: true,
            software_list: user_software_list
        });
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/edit', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const new_package_id = req.fields.new_package_id || "";
    const new_name = req.fields.name || "";
    const new_description = req.fields.description || "";
    let new_tags = req.fields.tags || req.fields["tags[]"] || [];

    if ((typeof new_tags) === "string") {
        /**
         * Instead of spliting like we do it in the interface, we leave it
         * like this for security reasons. 
         * If the make new_tags = new_tags.split(" ") and if the attacker sends a string which the
         * majority of the chars are empty spaces, it can cause non desirable effects on the parsing
         * of the tags and could lead to a potencial vulnerability
         */
        new_tags = [new_tags];
    }

    try {
        //Make sure that the next lines have for granted an array, nothing else
        if (!Array.isArray(new_tags)) {
            res.header(200).json({
                result: false,
                reason: 'Received invalid tags array'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        const result = await software_manager.software.edit(package_id, new_package_id, new_name, new_description, new_tags);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router.post('/admin_edit', async (req, res) => {
    /**
     * There is no need to verify if it is admin or not. Only the admins have the
     * permission to use this API call. (software_admin_edit permission)
     */

    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const new_package_id = req.fields.new_package_id || "";
    const new_name = req.fields.name || "";
    const new_description = req.fields.description || "";
    let new_tags = req.fields.tags || req.fields["tags[]"] || [];

    if ((typeof new_tags) === "string") {
        /**
         * Instead of spliting like we do it in the interface, we leave it
         * like this for security reasons. 
         * If the make new_tags = new_tags.split(" ") and if the attacker sends a string which the
         * majority of the chars are empty spaces, it can cause non desirable effects on the parsing
         * of the tags and could lead to a potencial vulnerability
         */
        new_tags = [new_tags];
    }

    try {
        //Make sure that the next lines have for granted an array, nothing else
        if (!Array.isArray(new_tags)) {
            res.header(200).json({
                result: false,
                reason: 'Received invalid tags array'
            });
            return;
        }

        const result = await software_manager.software.edit(package_id, new_package_id, new_name, new_description, new_tags);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router.post('/search', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    let tags = req.fields.tags || req.fields["tags[]"] || [];

    if ((typeof tags) === "string") {
        /**
         * Instead of spliting like we do it in the interface, we leave it
         * like this for security reasons. 
         * If the make new_tags = new_tags.split(" ") and if the attacker sends a string which the
         * majority of the chars are empty spaces, it can cause non desirable effects on the parsing
         * of the tags and could lead to a potencial vulnerability
         */
        tags = [tags];
    }

    try {
        //Make sure that the next lines have for granted an array, nothing else
        if (!Array.isArray(tags)) {
            res.header(200).json({
                result: false,
                reason: 'Received invalid tags array'
            });
            return;
        }

        const software = await software_manager.software.search(tags, username);
        res.header(200).json({
            result: true,
            software: software
        });
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.post('/details', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";

    try {
        const package_details = await software_manager.software.details(package_id);
        if (package_details === undefined) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }
        res.header(200).json({
            result: true,
            software: package_details
        });
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router.post('/admin_change_owner', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const new_owner = req.fields.owner || "";

    try {
        if (!(await account_manager.user.exists(new_owner))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid new owner (does not exist)'
            });
            return;
        }

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        const result = await software_manager.software.changeSoftwareOwner(package_id, new_owner);
        if (result) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

//#endregion

//#region Software Tags
var router_software_tags = express.Router();

router_software_tags.post('/add', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const tag = req.fields.tag || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (await software_manager.tags.exists(package_id, tag)) {
            res.header(200).json({
                result: false,
                reason: 'Tag already exists'
            });
            return;
        }

        const result = await software_manager.tags.add(package_id, tag);
        if (result) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_tags.post('/all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        const result = await software_manager.tags.getAll(package_id);
        res.header(200).json({
            result: true,
            tags: result
        });
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_tags.post('/remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const tag = req.fields.tag || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.tags.exists(package_id, tag))) {
            res.header(200).json({
                result: false,
                reason: 'Tag does not exist'
            });
            return;
        }

        const result = await software_manager.tags.remove(package_id, tag);
        if (result) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_tags.post('/remove_all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const tag = req.fields.tag || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        const result = await software_manager.tags.removeAll(package_id);
        if (result) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router.use('/tags', router_software_tags);
//#endregion

//#region Software Branch
var router_software_branch = express.Router();

router_software_branch.post('/create', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";


    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Package id does not exist'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if ((await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Branch name already exists'
            });
            return;
        }

        const result = await software_manager.branch.create(package_id, branch_name);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";


    try {
        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Branch does not exist'
            });
            return;
        }

        const result = await software_manager.branch.remove(package_id, branch_name);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/admin_remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch_name || "";


    try {

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Branch does not exist'
            });
            return;
        }

        const result = await software_manager.branch.remove(package_id, branch_name);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";

    try {
        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        const result = await software_manager.branch.getAll(package_id);
        res.header(200).json({
            result: true,
            branches: result
        });
    } catch (err) {
        printError("Software", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/all_allowed_to_use', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";

    try {

        const result = await software_manager.branch.getBranchedAllowedToUse(username, package_id);
        res.header(200).json({
            result: true,
            branches: result
        });
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/allow_client_access', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const client_username = req.fields.client_username || "";
    const branch_name = req.fields.branch || "";

    try {
        if (!(await account_manager.user.exists(client_username))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid client username (does not exist)'
            });
            return;
        }

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (await software_manager.branch.access.isAllowed(package_id, branch_name, username)) {
            res.header(200).json({
                result: false,
                reason: 'Client already has access to that branch'
            });
            return;
        }

        const result = await software_manager.branch.access.add(package_id, branch_name, client_username);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/disallow_client_access', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const client_username = req.fields.client_username || "";
    const branch_name = req.fields.branch || "";

    try {
        if (!(await account_manager.user.exists(client_username))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid client username (does not exist)'
            });
            return;
        }

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.access.isAllowed(package_id, branch_name, username))) {
            res.header(200).json({
                result: false,
                reason: 'Client already does not have access to that branch'
            });
            return;
        }

        const result = await software_manager.branch.access.remove(package_id, branch_name, client_username);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/allowed_clients', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const result = await software_manager.branch.access.allAllowed(package_id, branch_name);
        if (result.length > 0) {
            res.header(200).json({
                result: true,
                allowed: result
            });
            return;
        } else {
            res.header(200).json({
                result: true,
                allowed: 'everyone'
            });
            return;
        }
    } catch (err) {
        printError("Software", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch.post('/set_all_allowed_clients', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    const allowed_clients_list = req.fields.clients || req.fields["clients[]"] || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (allowed_clients_list === "") {
            await software_manager.branch.access.removeAll(package_id, branch_name);
            res.header(200).json({
                result: true
            });
            return;
        } else if ((typeof allowed_clients_list) === "string") {
            if (!(await account_manager.user.exists(allowed_clients_list))) {
                res.header(200).json({
                    result: false,
                    reason: `Invalid client username "${client_that_does_not_exist}" (does not exist)`
                });
                return;
            }

            await software_manager.branch.access.removeAll(package_id, branch_name);
            let operation_result = await software_manager.branch.access.add(package_id, branch_name, allowed_clients_list);
            if (operation_result === true) { //Javascript sometimes makes confusion between "Object exists" and "value is true". For this reason, Insert true
                res.header(200).json({
                    result: true
                });
                return;
            } else {
                res.header(200).json({
                    result: false,
                    reason: 'Unkown Error'
                });
                return;
            }
        } else if (!Array.isArray(allowed_clients_list)) {
            res.header(200).json({
                result: false,
                reason: 'Allowed clients list must be an array list or a string containing only 1 user'
            });
            return;
        }

        let all_clients_exists = true;
        let client_that_does_not_exist = '';
        for (let i = 0; i < allowed_clients_list.length; i++) {
            let client_username = allowed_clients_list[i];
            if (!(await account_manager.user.exists(client_username))) {
                all_clients_exists = false;
                client_that_does_not_exist = client_username;
            }
        }

        if (all_clients_exists === false) {
            res.header(200).json({
                result: false,
                reason: `Invalid client username "${client_that_does_not_exist}" (does not exist)`
            });
            return;
        }

        await software_manager.branch.access.removeAll(package_id, branch_name);

        let result = true;
        for (let i = 0; i < allowed_clients_list.length; i++) {
            let client_username = allowed_clients_list[i];
            let operation_result = await software_manager.branch.access.add(package_id, branch_name, client_username);
            result = result && operation_result; //Check if all operations have executed with success
        }

        if (result === true) { //Javascript sometimes makes confusion between "Object exists" and "value is true". For this reason, Insert true
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

//#region Software Branch Version
var router_software_branch_version = express.Router();

router_software_branch_version.post('/latest', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    const platform = req.fields.platform || "";
    const architecture = req.fields.architecture || "";
    const os_version = req.fields.os_version || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const branches_allowed_to_access = await software_manager.branch.access.isAllowed(package_id, branch_name, username);
        const clients_allowed_to_access = await software_manager.branch.access.allAllowed(package_id, branch_name);
        if (clients_allowed_to_access.length > 0 && !branches_allowed_to_access) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }

        const result = await software_manager.version.getLatestCompatible(package_id, branch_name, architecture, platform, os_version);
        if (result !== false) {
            res.header(200).json({
                result: true,
                latest_version: result
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/add', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const changelog = req.fields.changelog || "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }


        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (await software_manager.version.exists(package_id, branch_name, major, minor, patch)) {
            res.header(200).json({
                result: false,
                reason: 'Version already exists for that branch of that package'
            });
            return;
        }

        const result = software_manager.version.create(package_id, branch_name, major, minor, patch, changelog);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/remove', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        const result = software_manager.version.remove(package_id, branch_name, major, minor, patch);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/remove_all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const result = software_manager.version.removeAll(package_id, branch_name);
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/all', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const result = await software_manager.version.getAll(package_id, branch_name);
        res.header(200).json({
            result: true,
            versions: result
        });
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/all_available', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const branches_allowed_to_access = await software_manager.branch.access.isAllowed(package_id, branch_name, username);
        const clients_allowed_to_access = await software_manager.branch.access.allAllowed(package_id, branch_name);
        if (clients_allowed_to_access.length > 0 && !branches_allowed_to_access) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }

        const result = await software_manager.version.getAll(package_id, branch_name);
        res.header(200).json({
            result: true,
            versions: result
        });
        return;
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/details', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        const branches_allowed_to_access = await software_manager.branch.access.isAllowed(package_id, branch_name, username);
        const clients_allowed_to_access = await software_manager.branch.access.allAllowed(package_id, branch_name);
        if (clients_allowed_to_access.length > 0 && !branches_allowed_to_access) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }

        const changelog = await software_manager.version.getChangelog(package_id, branch_name, major, minor, patch);
        const supportedPlatforms = await software_manager.version.supportedPlatforms.getAll(
            package_id, branch_name, major, minor, patch
        )
        res.header(200).json({
            result: true,
            changelog: changelog,
            supportedPlatforms: supportedPlatforms
        });
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/admin_details', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        const changelog = await software_manager.version.getChangelog(package_id, branch_name, major, minor, patch);
        const supportedPlatforms = await software_manager.version.supportedPlatforms.getAll(
            package_id, branch_name, major, minor, patch
        );
        res.header(200).json({
            result: true,
            changelog: changelog,
            supportedPlatforms: supportedPlatforms
        });
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/publisher_details', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    try {

        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this software'
            });
            return;
        }

        const changelog = await software_manager.version.getChangelog(package_id, branch_name, major, minor, patch);
        const supportedPlatforms = await software_manager.version.supportedPlatforms.getAll(
            package_id, branch_name, major, minor, patch
        );
        res.header(200).json({
            result: true,
            changelog: changelog,
            supportedPlatforms: supportedPlatforms
        });
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/add_platform', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const architecture = req.fields.architecture || "";
    const platform = req.fields.platform || "";
    const os_version = req.fields.os_version || "";
    const file_name = req.fields.filename || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this software'
            });
            return;
        }

        if ((await software_manager.files.exists(package_id, branch_name, major, minor, patch, file_name)) === false) {
            res.header(200).json({
                result: false,
                reason: 'File does not exist'
            });
            return;
        }

        const platform_exist_test = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
        if (platform_exist_test === undefined || platform_exist_test === false) {
            res.header(200).json({
                result: false,
                reason: 'Platform you are trying to add does not exist in this store'
            });
            return;
        }


        if ((await software_manager.version.supportedPlatforms.exists(package_id, branch_name, major, minor, patch, architecture, platform, os_version))) {
            res.header(200).json({
                result: false,
                reason: 'Platform you are trying to add is already added'
            });
            return;
        }

        const result = await software_manager.version.supportedPlatforms.add(package_id, branch_name, major, minor, patch, architecture, platform, os_version, file_name)
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/remove_platform', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const architecture = req.fields.architecture || "";
    const platform = req.fields.platform || "";
    const os_version = req.fields.os_version || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(200).json({
                result: false,
                reason: 'You are not allowed to access this software'
            });
            return;
        }

        if (!(await software_manager.version.supportedPlatforms.exists(package_id, branch_name, major, minor, patch, architecture, platform, os_version))) {
            res.header(200).json({
                result: false,
                reason: 'Platform you are trying to remove does not exist'
            });
            return;
        }

        const result = await software_manager.version.supportedPlatforms.remove(package_id, branch_name, major, minor, patch, architecture, platform, os_version)
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/admin_remove_platform', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const architecture = req.fields.architecture || "";
    const platform = req.fields.platform || "";
    const os_version = req.fields.os_version || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if (!(await software_manager.version.supportedPlatforms.exists(package_id, branch_name, major, minor, patch, architecture, platform, os_version))) {
            res.header(200).json({
                result: false,
                reason: 'Platform you are trying to remove does not exist'
            });
            return;
        }

        const result = await software_manager.version.supportedPlatforms.remove(package_id, branch_name, major, minor, patch, architecture, platform, os_version)
        if (result) {
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        }
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }
});

router_software_branch_version.post('/all_platforms', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    try {
        const result = await software_manager.supportedPlatforms.getAll();
        if (result === false) {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
            return;
        } else {
            res.header(200).json({
                result: true,
                supported_platforms: result
            });
            return;
        }
    } catch (err) {
        printError("Software API", err);
        res.header(200).json({
            result: false,
            reason: err
        });
        return;
    }

})

router_software_branch_version.post('/download', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const architecture = req.fields.architecture || "";
    const platform = req.fields.platform || "";
    const os_version = req.fields.os_version || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.set("error", 'Invalid package id (does not exist)');
            res.header(404).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.set("error", 'Invalid branch name (does not exist)');
            res.header(404).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        const branches_allowed_to_access = await software_manager.branch.access.isAllowed(package_id, branch_name, username);
        const clients_allowed_to_access = await software_manager.branch.access.allAllowed(package_id, branch_name);
        if (clients_allowed_to_access.length > 0 && !branches_allowed_to_access) {
            res.set("error", 'You are not allowed to access this branch');
            res.header(403).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.set("error", 'Version does not exist for that branch of that package');
            res.header(404).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        const platform_exist_test = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
        if (platform_exist_test === undefined || platform_exist_test === false) {
            res.set("error", 'Platform does not exist in this store');
            res.header(404).json({
                result: false,
                reason: 'Platform does not exist in this store'
            });
            return;
        }

        if (!(await software_manager.version.supportedPlatforms.exists(package_id, branch_name, major, minor, patch, architecture, platform, os_version))) {
            res.set("error", 'Received platform is not compatible with that version');
            res.header(404).json({
                result: false,
                reason: 'Received platform is not compatible with that version'
            });
            return;
        }

        let filename = await software_manager.files.getFileName(package_id, branch_name, major, minor, patch, platform, architecture, os_version);

        if (filename === false) {
            res.set("error", 'Installer not found');
            res.header(404).json({
                result: false,
                reason: 'Installer not found'
            });
            return;
        }

        let file_path = path.join(software_folder_path, filename);

        if (!fs.existsSync(file_path)) {
            res.set("error", 'Installer not found');
            res.header(404).json({
                result: false,
                reason: 'Installer not found'
            });
            return;
        }

        res.sendFile(file_path);
        return;
    } catch (err) {
        printError("Software API", err);
        res.set("error", err);
        res.header(502).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/download_file', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;


    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const file_name = req.fields.filename || "";


    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }


        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            res.header(403).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if ((await software_manager.files.exists(package_id, branch_name, major, minor, patch, file_name)) === false) {
            res.header(200).json({
                result: false,
                reason: 'File does not exist'
            });
            return;
        }

        let file_path = path.join(software_folder_path, file_name);

        if (!fs.existsSync(file_path)) {
            res.set("error", 'Installer not found');
            res.header(404).json({
                result: false,
                reason: 'Installer not found'
            });
            return;
        }

        res.sendFile(file_path);
        return;
    } catch (err) {
        printError("Software API", err);
        res.set("error", err);
        res.header(502).json({
            result: false,
            reason: err
        });
        return;
    }

});


router_software_branch_version.post('/upload', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    if (req.files.package_file === undefined) {
        printError("Software API", 'User has not sent a package file to the correct field');
        res.header(502).json({
            result: false,
            reason: 'You need to send the package file'
        });
        return;
    }

    // Purify uploaded file path
    const uploaded_file_path = path.normalize(path.join(req.files.package_file.filepath));

    try {
        // Check if software ID Exists
        if (!(await software_manager.software.packageExists(package_id))) {
            fs.unlinkSync(uploaded_file_path);
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }
        // Check if software branch exists
        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            fs.unlinkSync(uploaded_file_path);
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }
        // Check if I am the owner of software
        if (!(await software_manager.software.isSoftwareOwner(username, package_id))) {
            fs.unlinkSync(uploaded_file_path);
            res.header(403).json({
                result: false,
                reason: 'You are not allowed to access this branch'
            });
            return;
        }
        // Check if software version exists
        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            fs.unlinkSync(uploaded_file_path);
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        const new_file_name = package_id + '.' + branch_name + '.' + major + '.' + minor + '.' + patch + '.' + (+new Date()) + '.rehstore';
        if (req.files.package_file.size <= 0) {
            fs.unlinkSync(uploaded_file_path);
            res.header(502).json({
                result: false,
                reason: 'Package size must be higher than zero'
            });
            return;
        }
        await (async () => {
            return new Promise((resolve, reject) => {
                fs.copy(uploaded_file_path, path.join(software_folder_path, new_file_name), { replace: false }, function (err) {
                    if (err) {
                        printError("Software API", "Package already exists or can't write to directory")
                        reject(err);
                    } else {
                        resolve(true);
                    }
                    return;
                });
            })
        })();

        const file_add_db_result = await software_manager.files.add(package_id, branch_name, major, minor, patch, new_file_name);
        if (file_add_db_result === true) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(502).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(502).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/all_files', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }


        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        let files_list = await software_manager.files.getAll(package_id, branch_name, major, minor, patch);
        res.header(200).json({
            result: true,
            fileList: files_list
        });
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(502).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch_version.post('/delete_file', async (req, res) => {
    //The username and token are already purified. Just need to purify the others
    const username = req.username;
    const token = req.token;

    const package_id = req.fields.package_id || "";
    const branch_name = req.fields.branch || "";
    let major = req.fields.major || "";
    major += ""; //Force string type
    let minor = req.fields.minor || "";
    minor += "";
    let patch = req.fields.patch || "";
    patch += "";
    const file_name = req.fields.filename || "";

    try {
        if (!(await software_manager.software.packageExists(package_id))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid package id (does not exist)'
            });
            return;
        }

        if (!(await software_manager.branch.exists(package_id, branch_name))) {
            res.header(200).json({
                result: false,
                reason: 'Invalid branch name (does not exist)'
            });
            return;
        }

        if (
            !(await software_manager.software.isSoftwareOwner(username, package_id)) &&
            !(await account_manager.groups.users.hasGroup(username, 'admin'))
        ) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed: You are not the owner of this software'
            });
            return;
        }

        if (!(await software_manager.version.exists(package_id, branch_name, major, minor, patch))) {
            res.header(200).json({
                result: false,
                reason: 'Version does not exist for that branch of that package'
            });
            return;
        }

        if ((await software_manager.files.exists(package_id, branch_name, major, minor, patch, file_name)) === false) {
            res.header(200).json({
                result: false,
                reason: 'File does not exist'
            });
            return;
        }
        let isFileDeleted = await software_manager.files.remove(package_id, branch_name, major, minor, patch, file_name);
        if (isFileDeleted) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: 'Unkown Error'
            });
        }
        return;
    } catch (err) {
        printError("Software API", err);
        res.header(502).json({
            result: false,
            reason: err
        });
        return;
    }

});

router_software_branch.use('/version', router_software_branch_version);
//#endregion

router.use('/branch', router_software_branch);
//#endregion

//#endregion

module.exports = router;