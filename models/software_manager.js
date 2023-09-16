const database = require('./db');
const path = require('path');
const console_colors = require(path.join(__dirname, '..', 'modules', 'console_color'));
const { print, printError } = require(path.join(__dirname, '..', 'modules', 'custom_print'));
const fs = require('fs');

//Where all the software is stored
const software_storage = path.join(__dirname, '..', 'storage_system', 'software');

const software_manager = {
    software: {
        create: async (username = "", package_id = "", package_name = "", description = "", tags = []) => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;
                }

                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }

                const package_name_test = database.parameter_validation.software_manager.package_name(package_name);
                if (!package_name_test.result) {
                    printError("Software Manager", package_name_test.reason);
                    reject(package_name_test.reason);
                    return;
                }

                const package_description = database.parameter_validation.software_manager.description(description, false);
                if (!package_description.result) {
                    printError("Software Manager", package_description.reason);
                    reject(package_description.reason);
                    return;
                }
                //#endregion

                if (await software_manager.software.packageExists(package_id)) {
                    reject("Package id exists");
                    printError("Software Manager", "Cannot create a new software: package id exists");
                    return;
                }

                try {
                    const query = "INSERT INTO software(package_id, name, description, owner) VALUES(?,?,?,?);";
                    const result = await database.insert(query, package_id, database.escape_string(package_name), database.escape_string(description), username);
                    if (result.affectedRows > 0) {
                        for (let i = 0; i < tags.length; i++) {
                            const tag = tags[i];
                            await software_manager.tags.add(package_id, tag);
                        }
                        resolve(true);
                        return;
                    } else {
                        printError("Software Manager", "Could not create a new software").
                            resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        packageExists: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion
                try {
                    const query = "SELECT COUNT(*) AS count FROM software WHERE package_id=BINARY ?";
                    const result = (await database.select(query, package_id))[0].count;
                    if (result > 0) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        getAllPublisherSoftware: (username = "", tags = []) => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;
                }

                if (!Array.isArray(tags)) {
                    printError("Software Manager", "Tags must be a string array");
                    reject("Tags must be a string array");
                    return;
                }

                let areAllTagsValid = true;
                let tagInvalidReason = "";
                for (let i = 0; i < tags.length; i++) {
                    const tag = tags[i];
                    let isTagValid = database.parameter_validation.software_manager.software_tag(tag);
                    if (isTagValid.result === false) {
                        areAllTagsValid = false;
                        tagInvalidReason = isTagValid.reason;
                    }
                }
                if (areAllTagsValid === false) {
                    printError("Software Manager", tagInvalidReason);
                    reject(tagInvalidReason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT package_id FROM software WHERE owner=BINARY ?";
                    const result = await database.select(query, username);
                    const packages = [];

                    /**
                     * You could just include this if inside the for cicle.
                     * But for performance reasons, lets keep the if outside the for cicle
                     * There is no need to verify in each interaction if the tags length is greater than 0
                     */
                    if (tags.length > 0) {
                        for (let i = 0; i < result.length; i++) {
                            let package = result[i];

                            if ((await software_manager.tags.getAll(package.package_id)).some(r => tags.includes(r))) {
                                packages.push(package.package_id);
                            }
                        }
                    } else {
                        result.forEach(package => {
                            packages.push(package.package_id);
                        });
                    }
                    resolve(packages);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    reject(false);
                    return;
                }
            });

        },
        isSoftwareOwner: (username = "", package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;
                }

                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT owner FROM software WHERE package_id=BINARY ?;";
                    const result = await database.select(query, package_id);

                    if (result.length <= 0) {
                        reject("Package id does not exist");
                        return;
                    }

                    if (result[0].owner === username) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    reject(false);
                    return;
                }

            });
        },
        changeSoftwareOwner: (package_id = "", new_owner = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const new_owner_test = database.parameter_validation.account_manager.username(new_owner);
                if (!new_owner_test.result) {
                    printError("Software Manager", new_owner_test.reason);
                    reject(new_owner_test.reason);
                    return;
                }

                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "UPDATE software SET owner=? WHERE package_id=BINARY ?;";
                    const result = await database.update(query, new_owner, package_id);

                    if (result.affectedRows > 0 && result.changedRows > 0) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });

        },
        details: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT name, description,owner FROM software WHERE package_id=BINARY ?";
                    const result = await database.select(query, package_id);
                    if (result.length > 0) {
                        let package_details = result[0];
                        package_details.tags = await software_manager.tags.getAll(package_id);
                        resolve(package_details);
                        return;
                    } else {
                        resolve(undefined);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        changePackageId: async (old_package_id = "", new_package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const old_package_id_test = database.parameter_validation.software_manager.package_id(old_package_id);
                if (!old_package_id_test.result) {
                    printError("Software Manager", old_package_id_test.reason);
                    reject(old_package_id_test.reason);
                    return;
                }

                const new_package_id_test = database.parameter_validation.software_manager.package_id(new_package_id);
                if (!new_package_id_test.result) {
                    printError("Software Manager", new_package_id_test.reason);
                    reject(new_package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "UPDATE software SET package_id=? WHERE package_id=BINARY ?";
                    const result = await database.update(query, new_package_id, old_package_id);
                    if (result.affectedRows > 0 && result.changedRows > 0) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        edit: async (package_id = "", new_package_id = "", package_name = "", description = "", tags = []) => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }

                const new_package_id_test = database.parameter_validation.software_manager.package_id(new_package_id, false);
                if (!new_package_id_test.result) {
                    printError("Software Manager", new_package_id_test.reason);
                    reject(new_package_id_test.reason);
                    return;
                }

                const package_name_test = database.parameter_validation.software_manager.package_name(package_name, false);
                if (!package_name_test.result) {
                    printError("Software Manager", package_name_test.reason);
                    reject(package_name_test.reason);
                    return;
                }

                const package_description = database.parameter_validation.software_manager.description(description, false);
                if (!package_description.result) {
                    printError("Software Manager", package_description.reason);
                    reject(package_description.reason);
                    return;
                }
                //#endregion

                if (!(await software_manager.software.packageExists(package_id))) {
                    reject("Package ID does not exist");
                    printError("Software Manager", "Cannot edit a software: Package ID does not exist");
                    return;
                }

                /*if (package_name === "" && description === "") {
                    resolve(false);
                    printError("Software Manager", "Package name and description cannot be both empty");
                    return;
                }*/

                const parameters = {};
                if (package_name !== "") parameters.name = database.escape_string(package_name);
                if (description !== "") parameters.description = database.escape_string(description);

                try {
                    let query = "UPDATE software SET ";
                    let orderedQueryInput = [];
                    Object.keys(parameters).forEach(param_name => {
                        query += param_name + '=?, ';
                        orderedQueryInput.push(parameters[param_name]);
                    });
                    query = query.slice(0, -2);
                    query += ' WHERE package_id = BINARY ?;';

                    const result = await database.update(query, ...orderedQueryInput, package_id);

                    let acumulative_result = (result.affectedRows > 0 && result.changedRows > 0);

                    if (tags.length > 0) {
                        await software_manager.tags.removeAll(package_id);
                        for (let i = 0; i < tags.length; i++) {
                            const tag = tags[i];
                            await software_manager.tags.add(package_id, tag);
                        }
                        acumulative_result = true;
                    } else {
                        await software_manager.tags.removeAll(package_id);
                        acumulative_result = true;
                    }

                    if (new_package_id !== "") {
                        const package_id_change_result = await software_manager.software.changePackageId(package_id, new_package_id);
                        acumulative_result = acumulative_result || package_id_change_result;
                    }


                    if (acumulative_result) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }

                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        remove: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "DELETE FROM software WHERE package_id=BINARY ?";
                    const result = await database.delete(query, package_id);

                    if (result.affectedRows > 0) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        getSoftwareAllowedToUse: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;

                }
                //#endregion
                const query1 = `
                SELECT 
                    software.package_id, software.name, software.owner 
                FROM software 
                INNER JOIN account_can_access_software_branch ON
                    software.package_id = account_can_access_software_branch.software_package_id
                    AND 
                    account_can_access_software_branch.account_username = BINARY ?
                `;
                const query2 = `
                SELECT DISTINCTROW software.package_id, software.name, software.owner FROM software 
                LEFT JOIN software_branch ON software.package_id = software_branch.package_id
                LEFT JOIN account_can_access_software_branch ON
                software_branch.package_id = account_can_access_software_branch.software_package_id AND 
                software_branch.branch_name = account_can_access_software_branch.software_branch 
                WHERE account_username IS NULL AND branch_name IS NOT NULL
                `
                const result1 = await database.select(query1, username);
                const result2 = await database.select(query2);

                let result_tmp = {};
                result1.forEach(package => {
                    result_tmp[package.package_id] = {
                        name: package.name,
                        owner: package.owner
                    }
                });
                result2.forEach(package => {
                    result_tmp[package.package_id] = {
                        name: package.name,
                        owner: package.owner
                    }
                });

                let real_result = [];
                Object.keys(result_tmp).forEach(package_id => {
                    real_result.push({
                        package_id: package_id,
                        name: result_tmp[package_id].name,
                        owner: result_tmp[package_id].owner
                    })
                })

                resolve(real_result);
                return;
            });
        },
        getAll: async () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const query = "SELECT package_id FROM software";
                    const result = await database.select(query);
                    let packages = [];
                    result.forEach(package => {
                        packages.push(package.package_id);
                    });

                    resolve(packages);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    reject(false);
                    return;
                }
            });
        },
        getCustomSoftwareList: async (first_software_index = 0, list_length = 0) => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify received data
                    if (!database.isDataAll.integers(first_software_index)) {
                        reject("Begin index must be all numbers only");
                        return;
                    }
                    if (!database.isDataAll.integers(list_length)) {
                        reject("List size must be all numbers only");
                        return;
                    }
                    //#endregion

                    const query = `SELECT package_id, name, description, owner FROM software ORDER BY package_id ASC LIMIT ?,?;`;
                    const result = await database.select(query, parseInt(first_software_index), parseInt(list_length));
                    resolve(result);
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        numberOfSoftwareInThePlatform: async () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const query = "SELECT package_id FROM software";
                    const result = await database.select(query);
                    let num_packages = 0;
                    result.forEach(package => {
                        num_packages++;
                    });

                    resolve(num_packages);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    reject(false);
                    return;
                }
            });
        },
        search: async (tags = [], username = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;
                }

                if (!Array.isArray(tags)) {
                    printError("Software Manager", "Tags must be inside an array");
                    reject("Tags must be inside an array");
                    return;
                }
                //Purify the tags
                tags.forEach(key => {
                    const tmp_tag_validation = database.parameter_validation.software_manager.software_tag(key);
                    if (!tmp_tag_validation.result) {
                        reject(tmp_tag_validation.reason);
                        return;
                    }
                });
                //#endregion

                let query = `SELECT software.package_id, name, owner 
                            FROM software
                            INNER JOIN (
                            SELECT DISTINCT software_tag.package_id 
                            FROM software_tag WHERE `;
                tags.forEach(key => { //Must be done in this interaction and not in the purification for security purposes
                    query += `tag LIKE ? OR `;
                });
                query = query.slice(0, -4);
                query += `) AS b ON software.package_id=b.package_id `;
                try {
                    let result = await database.select(query, ...tags);
                    //Remove non authorized software from the list
                    for (let i = result.length - 1; i >= 0; i--) {
                        let anyBranchAllowed = await software_manager.branch.getBranchedAllowedToUse(username, result[i].package_id);
                        if (anyBranchAllowed.length === 0) {
                            result.splice(i, 1);
                        }
                    }

                    resolve(result);
                } catch (err) {
                    printError("Software Manager", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
    },
    branch: {
        create: async (package_id = "", branch_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const branch_exists = await software_manager.branch.exists(package_id, branch_name);
                    if (branch_exists) {
                        resolve(false);
                        return;
                    }

                    const query = "INSERT INTO software_branch (package_id, branch_name) VALUES (?,?);";
                    const result = await database.insert(query, package_id, branch_name);
                    if (result.affectedRows === 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        exists: async (package_id = "", branch_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT COUNT(1) AS row_exists FROM software_branch WHERE package_id=BINARY ? AND branch_name=BINARY ?;";
                    const result = await database.select(query, package_id, branch_name);
                    if (result[0].row_exists === 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getAll: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT branch_name FROM software_branch WHERE package_id=BINARY ?";
                    const result = await database.select(query, package_id);

                    let processed_output = []
                    result.forEach(branch => {
                        processed_output.push(branch.branch_name);
                    })
                    resolve(processed_output);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getBranchedAllowedToUse: async (username = "", package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const username_test = database.parameter_validation.account_manager.username(username);
                if (!username_test.result) {
                    printError("Software Manager", username_test.reason);
                    reject(username_test.reason);
                    return;

                }
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT software_branch FROM account_can_access_software_branch WHERE account_username=BINARY ? AND software_package_id=BINARY ?";
                    const result = await database.select(query, username, package_id);

                    let processed_output = [];
                    result.forEach(software => {
                        processed_output.push(software.software_branch);
                    });
                    let all_branches = await software_manager.branch.getAll(package_id);
                    if (all_branches !== false) {
                        for (let i = 0; i < all_branches.length; i++) {
                            let branch = all_branches[i];
                            let whoCanAccessThisBranch = await software_manager.branch.access.allAllowed(package_id, branch);
                            if (whoCanAccessThisBranch !== false && whoCanAccessThisBranch.length === 0)
                                processed_output.push(branch);
                        }
                    }

                    resolve(processed_output);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        remove: async (package_id = "", branch_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "DELETE FROM software_branch WHERE package_id=BINARY ? AND branch_name=BINARY ?;";
                    const result = await database.delete(query, package_id, branch_name);
                    if (result.affectedRows === 1) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        removeAll: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion
                try {
                    const query = "DELETE FROM software_branch WHERE package_id=BINARY ?;";
                    const result = await database.delete(query, package_id);
                    if (result.affectedRows === 1) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        access: { //Enable acess to a certain branch of a software
            add: async (package_id = "", branch_name = "", username = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const username_test = database.parameter_validation.account_manager.username(username);
                    if (!username_test.result) {
                        printError("Software Manager", username_test.reason);
                        reject(username_test.reason);
                        return;

                    }
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    //#endregion

                    try {
                        const query = "INSERT INTO account_can_access_software_branch(account_username, software_package_id, software_branch) VALUES (?,?,?);";
                        const result = await database.insert(query, username, package_id, branch_name);

                        if (result.affectedRows === 1) {
                            resolve(true);
                            return;
                        } else {
                            resolve(false);
                            return;
                        }
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            isAllowed: async (package_id = "", branch_name = "", username = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const username_test = database.parameter_validation.account_manager.username(username);
                    if (!username_test.result) {
                        printError("Software Manager", username_test.reason);
                        reject(username_test.reason);
                        return;

                    }
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    //#endregion

                    try {

                        const query = "SELECT COUNT(1) AS row_exists FROM account_can_access_software_branch WHERE account_username=BINARY ? AND software_package_id=BINARY ? AND software_branch=BINARY ?;";
                        const result = await database.select(query, username, package_id, branch_name);

                        let whoCanAccessThisBranch = await software_manager.branch.access.allAllowed(package_id, branch_name);

                        if (result[0].row_exists === 1 || (whoCanAccessThisBranch !== false && whoCanAccessThisBranch.length === 0)) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                        return;
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            remove: async (package_id = "", branch_name = "", username = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const username_test = database.parameter_validation.account_manager.username(username);
                    if (!username_test.result) {
                        printError("Software Manager", username_test.reason);
                        reject(username_test.reason);
                        return;

                    }
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    //#endregion

                    try {

                        const query = "DELETE FROM account_can_access_software_branch WHERE account_username=BINARY ? AND software_package_id=BINARY ? AND software_branch=BINARY ?;";
                        const result = await database.delete(query, username, package_id, branch_name);
                        if (result.affectedRows === 1) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                        return;
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            allAllowed: async (package_id = "", branch_name = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    //#endregion

                    try {

                        const query = "SELECT account_username FROM account_can_access_software_branch WHERE software_package_id=BINARY ? AND software_branch=BINARY ?;";
                        const result = await database.select(query, package_id, branch_name);

                        let allowed_users = [];
                        result.forEach(allowed_user => {
                            allowed_users.push(allowed_user.account_username);
                        });

                        resolve(allowed_users);
                        return;
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            removeAll: async (package_id = "", branch_name = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    //#endregion

                    try {

                        const query = "DELETE FROM account_can_access_software_branch WHERE software_package_id=BINARY ? AND software_branch=BINARY ?;";
                        const result = await database.delete(query, package_id, branch_name);
                        if (result.affectedRows === 1) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                        return;
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            }
        }
    },
    tags: {
        add: async (package_id = "", tag = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }

                const tag_test = database.parameter_validation.software_manager.software_tag(tag);
                if (!tag_test.result) {
                    printError("Software Manager", tag_test.reason);
                    reject(tag_test.reason);
                    return;
                }
                //#endregion

                const query = "INSERT INTO software_tag(package_id, tag) VALUES (?,?);";
                try {
                    const result = await database.insert(query, package_id, tag);

                    if (result.affectedRows >= 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });

        },
        exists: async (package_id = "", tag = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }

                const tag_test = database.parameter_validation.software_manager.software_tag(tag);
                if (!tag_test.result) {
                    printError("Software Manager", tag_test.reason);
                    reject(tag_test.reason);
                    return;
                }
                //#endregion

                const query = "SELECT COUNT(*) AS num_tags FROM software_tag WHERE package_id=BINARY ? AND tag=BINARY ?;";
                try {
                    const result = await database.select(query, package_id, tag);

                    if (result[0].num_tags >= 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });

        },
        getAll: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                const query = "SELECT tag FROM software_tag WHERE package_id=BINARY ?;";
                try {
                    const result = await database.select(query, package_id);
                    let tags = [];
                    result.forEach(tag => {
                        tags.push(tag.tag);
                    });
                    resolve(tags);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve([]);
                    return;
                }
            });
        },
        remove: async (package_id = "", tag = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }

                const tag_test = database.parameter_validation.software_manager.software_tag(tag);
                if (!tag_test.result) {
                    printError("Software Manager", tag_test.reason);
                    reject(tag_test.reason);
                    return;
                }
                //#endregion

                const query = "DELETE FROM software_tag WHERE package_id=BINARY ? AND tag=BINARY ?;";
                try {
                    const result = await database.delete(query, package_id, tag);

                    if (result.affectedRows >= 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });

        },
        removeAll: async (package_id = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                //#endregion

                const query = "DELETE FROM software_tag WHERE package_id=BINARY ?;";
                try {
                    const result = await database.delete(query, package_id);

                    if (result.affectedRows >= 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        }
    },
    supportedPlatforms: {
        add: async (architecture = "", platform = "", os_version = "", platform_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                if (!architecture_test.result) {
                    printError("Software Manager", architecture_test.reason);
                    reject(architecture_test.reason);
                    return;
                }
                const platform_test = database.parameter_validation.software_manager.platform(platform);
                if (!platform_test.result) {
                    printError("Software Manager", platform_test.reason);
                    reject(platform_test.reason);
                    return;
                }
                const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                if (!os_version_test.result) {
                    printError("Software Manager", os_version_test.reason);
                    reject(os_version_test.reason);
                    return;
                }
                const platform_name_test = database.parameter_validation.software_manager.platform_name(platform_name);
                if (!platform_name_test.result) {
                    printError("Software Manager", platform_name_test.reason);
                    reject(platform_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    if (await software_manager.supportedPlatforms.getName(architecture, platform, os_version)) {
                        resolve(false);
                        return;
                    }

                    const query = "INSERT INTO software_platform (architecture, platform, os_version, name) VALUES(?,?,?,?);";
                    const result = await database.insert(query, architecture, platform, os_version, platform_name);

                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getName: async (architecture = "", platform = "", os_version = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                if (!architecture_test.result) {
                    printError("Software Manager", architecture_test.reason);
                    reject(architecture_test.reason);
                    return;
                }
                const platform_test = database.parameter_validation.software_manager.platform(platform);
                if (!platform_test.result) {
                    printError("Software Manager", platform_test.reason);
                    reject(platform_test.reason);
                    return;
                }
                const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                if (!os_version_test.result) {
                    printError("Software Manager", os_version_test.reason);
                    reject(os_version_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT name from software_platform WHERE architecture=BINARY ? AND platform=BINARY ? AND os_version=BINARY ?";
                    const result = await database.select(query, architecture, platform, os_version);
                    if (result.length > 0) {
                        resolve(result[0].name);
                    } else {
                        resolve(undefined);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getDetails: async (platform_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const platform_name_test = database.parameter_validation.software_manager.platform_name(platform_name);
                if (!platform_name_test.result) {
                    printError("Software Manager", platform_name_test.reason);
                    reject(platform_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT architecture, platform, os_version FROM software_platform WHERE name=BINARY ?";
                    const result = await database.select(query, platform_name);
                    if (result.length > 0) {
                        resolve(result[0]);
                    } else {
                        resolve(undefined);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getAll: async () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const query = "SELECT * from software_platform";
                    const result = await database.select(query);
                    resolve(result);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        remove: async (platform_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const platform_name_test = database.parameter_validation.software_manager.platform_name(platform_name);
                if (!platform_name_test.result) {
                    printError("Software Manager", platform_name_test.reason);
                    reject(platform_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "DELETE FROM software_platform WHERE name=BINARY ?;";
                    const result = await database.delete(query, platform_name);
                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        }
    },
    version: {
        //Changelog must be only uper case, lower case, space, comma, dot and numbers.
        create: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", changelog = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                const major_test = database.parameter_validation.software_manager.version_number(major);
                if (!major_test.result) {
                    printError("Software Manager", major_test.reason);
                    reject(major_test.reason);
                    return;
                }
                const minor_test = database.parameter_validation.software_manager.version_number(minor);
                if (!minor_test.result) {
                    printError("Software Manager", minor_test.reason);
                    reject(minor_test.reason);
                    return;
                }
                const patch_test = database.parameter_validation.software_manager.version_number(patch);
                if (!patch_test.result) {
                    printError("Software Manager", patch_test.reason);
                    reject(patch_test.reason);
                    return;
                }

                const changelog_escaped = database.escape_string(changelog);
                //#endregion

                try {
                    const query = "INSERT INTO software_version (package_id, branch_name, major, minor, patch, changelog) VALUES(?,?,?,?,?,?);";
                    const result = await database.insert(query, package_id, branch_name, major, minor, patch, changelog_escaped);
                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getAll: async (package_id = "", branch_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "SELECT major, minor, patch FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ?;";
                    const result = await database.select(query, package_id, branch_name);

                    const parsed_results = [];
                    //Never return directly the data from database, always return a parsed version. Helps to avoid leakage of data from database.
                    result.forEach(version => {
                        parsed_results.push(version);
                    })

                    resolve(parsed_results);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getLatest: async (package_id = "", branch_name = "") => {
            //SELECT major, minor, patch FROM software_version WHERE package_id="com.zlynt.demo" AND branch_name="main"
            //ORDER BY major DESC, minor DESC, patch DESC LIMIT 1;
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = `SELECT major, minor, patch FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ?
                    ORDER BY major DESC, minor DESC, patch DESC LIMIT 1;`;
                    const result = await database.select(query, package_id, branch_name);

                    resolve(result[0]);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getLatestCompatible: async (package_id = "", branch_name = "", architecture = "", platform = "", os_version = "") => {
            //SELECT major, minor, patch FROM software_version WHERE package_id="com.zlynt.demo" AND branch_name="main"
            //ORDER BY major DESC, minor DESC, patch DESC LIMIT 1;
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                if (!architecture_test.result) {
                    printError("Software Manager", architecture_test.reason);
                    reject(architecture_test.reason);
                    return;
                }
                const platform_test = database.parameter_validation.software_manager.platform(platform);
                if (!platform_test.result) {
                    printError("Software Manager", platform_test.reason);
                    reject(platform_test.reason);
                    return;
                }
                const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                if (!os_version_test.result) {
                    printError("Software Manager", os_version_test.reason);
                    reject(os_version_test.reason);
                    return;
                }
                //#endregion

                try {
                    const platform_environment = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
                    if (platform_environment === undefined || platform_environment === false) {
                        reject("Platform not suported by this store");
                    }

                    const query = `SELECT major, minor, patch FROM software_version_has_platform WHERE 
                    package_id=BINARY ? AND branch_name=BINARY ? AND platform_name=BINARY ?
                    ORDER BY major DESC, minor DESC, patch DESC LIMIT 1;`
                    const result = await database.select(query, package_id, branch_name, platform_environment);
                    if (result.length > 0)
                        resolve(result[0]);
                    else
                        resolve({});
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getChangelog: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                const major_test = database.parameter_validation.software_manager.version_number(major);
                if (!major_test.result) {
                    printError("Software Manager", major_test.reason);
                    reject(major_test.reason);
                    return;
                }
                const minor_test = database.parameter_validation.software_manager.version_number(minor);
                if (!minor_test.result) {
                    printError("Software Manager", minor_test.reason);
                    reject(minor_test.reason);
                    return;
                }
                const patch_test = database.parameter_validation.software_manager.version_number(patch);
                if (!patch_test.result) {
                    printError("Software Manager", patch_test.reason);
                    reject(patch_test.reason);
                    return;
                }
                //#endregion

                const query = "SELECT changelog FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;";
                const result = await database.select(query, package_id, branch_name, major, minor, patch);
                if (result.length <= 0) {
                    reject("Software version does not exist");
                } else {
                    resolve(result[0].changelog);
                }
                return;
            });
        },
        remove: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                const major_test = database.parameter_validation.software_manager.version_number(major);
                if (!major_test.result) {
                    printError("Software Manager", major_test.reason);
                    reject(major_test.reason);
                    return;
                }
                const minor_test = database.parameter_validation.software_manager.version_number(minor);
                if (!minor_test.result) {
                    printError("Software Manager", minor_test.reason);
                    reject(minor_test.reason);
                    return;
                }
                const patch_test = database.parameter_validation.software_manager.version_number(patch);
                if (!patch_test.result) {
                    printError("Software Manager", patch_test.reason);
                    reject(patch_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "DELETE FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;";
                    const result = await database.insert(query, package_id, branch_name, major, minor, patch);
                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        removeAll: async (package_id = "", branch_name = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                //#endregion

                try {
                    const query = "DELETE FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ?;";
                    const result = await database.insert(query, package_id, branch_name);
                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        exists: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
            return new Promise(async (resolve, reject) => {
                //#region Purify Input
                const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                if (!package_id_test.result) {
                    printError("Software Manager", package_id_test.reason);
                    reject(package_id_test.reason);
                    return;
                }
                const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                if (!branch_name_test.result) {
                    printError("Software Manager", branch_name_test.reason);
                    reject(branch_name_test.reason);
                    return;
                }
                const major_test = database.parameter_validation.software_manager.version_number(major);
                if (!major_test.result) {
                    printError("Software Manager", major_test.reason);
                    reject(major_test.reason);
                    return;
                }
                const minor_test = database.parameter_validation.software_manager.version_number(minor);
                if (!minor_test.result) {
                    printError("Software Manager", minor_test.reason);
                    reject(minor_test.reason);
                    return;
                }
                const patch_test = database.parameter_validation.software_manager.version_number(patch);
                if (!patch_test.result) {
                    printError("Software Manager", patch_test.reason);
                    reject(patch_test.reason);
                    return;
                }
                //#endregion

                try {

                    const query = "SELECT COUNT(1) AS row_exists FROM software_version WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;";
                    const result = await database.select(query, package_id, branch_name, major, minor, patch);
                    if (result[0].row_exists === 1) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        supportedPlatforms: {
            add: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", architecture = "", platform = "", os_version = "", filename = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                    if (!architecture_test.result) {
                        printError("Software Manager", architecture_test.reason);
                        reject(architecture_test.reason);
                        return;
                    }
                    const platform_test = database.parameter_validation.software_manager.platform(platform);
                    if (!platform_test.result) {
                        printError("Software Manager", platform_test.reason);
                        reject(platform_test.reason);
                        return;
                    }
                    const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                    if (!os_version_test.result) {
                        printError("Software Manager", os_version_test.reason);
                        reject(os_version_test.reason);
                        return;
                    }
                    const filename_test = database.parameter_validation.software_manager.filename(filename);
                    if (!filename_test.result) {
                        printError("Software Manager", filename_test.reason);
                        reject(filename_test.reason);
                        return;
                    }
                    //#endregion
                    try {
                        const platform_name = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
                        if (platform_name === undefined) {
                            printError("Software Manager", "Error: Cannot find a platform with the received specs.");
                            resolve(false);
                            return;
                        }

                        let query = `INSERT INTO software_version_has_platform
                        (platform_name, package_id, branch_name, major, minor, patch, filename) VALUES
                        (?,?,?,?,?,?,?);`;
                        const result = await database.insert(query,
                            platform_name, package_id, branch_name, major, minor, patch, filename);
                        if (result.affectedRows > 0) {
                            resolve(true);
                            return;
                        } else {
                            resolve(false);
                            return;
                        }
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            exists: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", architecture = "", platform = "", os_version = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                    if (!architecture_test.result) {
                        printError("Software Manager", architecture_test.reason);
                        reject(architecture_test.reason);
                        return;
                    }
                    const platform_test = database.parameter_validation.software_manager.platform(platform);
                    if (!platform_test.result) {
                        printError("Software Manager", platform_test.reason);
                        reject(platform_test.reason);
                        return;
                    }
                    const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                    if (!os_version_test.result) {
                        printError("Software Manager", os_version_test.reason);
                        reject(os_version_test.reason);
                        return;
                    }
                    //#endregion
                    try {
                        const platform_name = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
                        if (platform_name === undefined) {
                            printError("Software Manager", "Error: Cannot find a platform with the received specs.");
                            resolve(false);
                            return;
                        }

                        const query = `SELECT platform_name FROM software_version_has_platform WHERE
                        package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;`;
                        const result = await database.select(query, package_id, branch_name, major, minor, patch);
                        let platform_exists = false;
                        result.forEach(platform => {
                            if (platform_name === platform.platform_name)
                                platform_exists = true;
                        })
                        resolve(platform_exists);
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            getAll: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    //#endregion
                    try {
                        const platform_list_query = `
                        SELECT 
                            software_platform.architecture AS architecture,
                            software_platform.platform AS platform,
                            software_platform.os_version AS os_version,
                            software_version_has_platform.filename AS filename,
                            software_version_has_platform.platform_name AS name
                        FROM software_platform, software_version_has_platform
                        WHERE
                            software_version_has_platform.platform_name = software_platform.name AND
                            software_version_has_platform.package_id=BINARY ? AND 
                            software_version_has_platform.branch_name=BINARY ? AND 
                            software_version_has_platform.major=BINARY ? AND 
                            software_version_has_platform.minor=BINARY ? AND 
                            software_version_has_platform.patch=BINARY ?;`;
                        const results = await database.select(platform_list_query, package_id, branch_name, major, minor, patch);

                        let output = [];
                        for (let i = 0; i < results.length; i++) {
                            output.push({
                                name: results[i].name,
                                platform: results[i].platform,
                                version: results[i].os_version,
                                architecture: results[i].architecture,
                                filename: results[i].filename
                            });
                        }
                        resolve(output);
                        return;
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve([]);
                        return;
                    }
                });
            },
            remove: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", architecture = "", platform = "", os_version = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                    if (!architecture_test.result) {
                        printError("Software Manager", architecture_test.reason);
                        reject(architecture_test.reason);
                        return;
                    }
                    const platform_test = database.parameter_validation.software_manager.platform(platform);
                    if (!platform_test.result) {
                        printError("Software Manager", platform_test.reason);
                        reject(platform_test.reason);
                        return;
                    }
                    const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                    if (!os_version_test.result) {
                        printError("Software Manager", os_version_test.reason);
                        reject(os_version_test.reason);
                        return;
                    }
                    //#endregion
                    try {
                        const platform_name = await software_manager.supportedPlatforms.getName(architecture, platform, os_version);
                        if (platform_name === undefined) {
                            printError("Software Manager", "Error: Cannot find a platform with the received specs.");
                            resolve(false);
                            return;
                        }

                        const query = `DELETE FROM software_version_has_platform
                        WHERE platform_name=BINARY ? AND package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;`;
                        const result = await database.delete(query, platform_name, package_id, branch_name, major, minor, patch);
                        if (result.affectedRows > 0) {
                            resolve(true);
                            return;
                        } else {
                            resolve(false);
                            return;
                        }
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            },
            removeAll: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
                return new Promise(async (resolve, reject) => {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    //#endregion
                    try {
                        const query = `DELETE FROM software_version_has_platform
                        WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;`;
                        const result = await database.delete(query, package_id, branch_name, major, minor, patch);
                        if (result.affectedRows > 0) {
                            resolve(true);
                            return;
                        } else {
                            resolve(false);
                            return;
                        }
                    } catch (err) {
                        printError("Software Manager", err);
                        resolve(false);
                        return;
                    }
                });
            }
        },
    },
    files: {
        add: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", filename = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const filename_test = database.parameter_validation.software_manager.filename(filename);
                    if (!filename_test.result) {
                        printError("Software Manager", filename_test.reason);
                        reject(filename_test.reason);
                        return;
                    }
                    //#endregion

                    //Todo: Query e fazer a operação desejada
                    const query = `INSERT INTO software_file_list(package_id, branch_name, major, minor, patch, filename) VALUES(?,?,?,?,?,?)`;
                    const result = await database.insert(query, package_id, branch_name, major, minor, patch, filename);
                    if (result.affectedRows > 0) {
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        exists: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", filename = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const filename_test = database.parameter_validation.software_manager.filename(filename);
                    if (!filename_test.result) {
                        printError("Software Manager", filename_test.reason);
                        reject(filename_test.reason);
                        return;
                    }
                    //#endregion

                    //Todo: Query e fazer a operação desejada
                    const query = `SELECT COUNT(1) AS file_exists FROM software_file_list
                    WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ? AND filename=BINARY ?;`;
                    const result = await database.select(query, package_id, branch_name, major, minor, patch, filename);
                    if (result[0].file_exists > 0) {
                        if ((await software_manager.files.exists_in_file_system(filename)) === true) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        remove: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", filename = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const filename_test = database.parameter_validation.software_manager.filename(filename);
                    if (!filename_test.result) {
                        printError("Software Manager", filename_test.reason);
                        reject(filename_test.reason);
                        return;
                    }
                    //#endregion

                    //Todo: Query e fazer a operação desejada
                    const query = `DELETE FROM software_file_list 
                    WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ? AND filename=BINARY ?;`;
                    const result = await database.delete(query, package_id, branch_name, major, minor, patch, filename);

                    if (result.affectedRows > 0) {
                        if ((await software_manager.files.remove_from_file_system(filename)) === true) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    } else {
                        resolve(false);
                    }
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getAll: async (package_id = "", branch_name = "", major = "", minor = "", patch = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    //#endregion

                    //Todo: Query e fazer a operação desejada
                    const query = `SELECT filename FROM software_file_list
                    WHERE package_id=BINARY ? AND branch_name=BINARY ? AND major=BINARY ? AND minor=BINARY ? AND patch=BINARY ?;`;
                    const result = await database.select(query, package_id, branch_name, major, minor, patch);
                    let results = [];
                    for (let i = 0; i < result.length; i++) {
                        results.push(result[i].filename);
                    }
                    resolve(results);
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        exists_in_file_system: async (filename = "") => {
            return new Promise(async (resolve, reject) => {
                const installer_path = path.join(software_storage, filename);
                console.log(installer_path);

                //Check if file exists and is readable and writable
                fs.access(installer_path, fs.constants.R_OK, (notReadable) => {
                    fs.access(installer_path, fs.constants.W_OK, (notWritable) => {
                        if (notReadable || notWritable) {
                            resolve(false);
                        } else {
                            resolve(true);
                        }
                        return;
                    });
                });
            });
        },
        remove_from_file_system: async (filename = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    const file_exists = await software_manager.files.exists_in_file_system(filename);
                    if (file_exists) {
                        const installer_path = path.join(software_storage, filename);
                        fs.unlinkSync(installer_path);
                        resolve(true);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        },
        getFileName: async (package_id = "", branch_name = "", major = "", minor = "", patch = "", platform = "", architecture = "", os_version = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    const package_id_test = database.parameter_validation.software_manager.package_id(package_id);
                    if (!package_id_test.result) {
                        printError("Software Manager", package_id_test.reason);
                        reject(package_id_test.reason);
                        return;
                    }
                    const branch_name_test = database.parameter_validation.software_manager.branch_name(branch_name);
                    if (!branch_name_test.result) {
                        printError("Software Manager", branch_name_test.reason);
                        reject(branch_name_test.reason);
                        return;
                    }
                    const major_test = database.parameter_validation.software_manager.version_number(major);
                    if (!major_test.result) {
                        printError("Software Manager", major_test.reason);
                        reject(major_test.reason);
                        return;
                    }
                    const minor_test = database.parameter_validation.software_manager.version_number(minor);
                    if (!minor_test.result) {
                        printError("Software Manager", minor_test.reason);
                        reject(minor_test.reason);
                        return;
                    }
                    const patch_test = database.parameter_validation.software_manager.version_number(patch);
                    if (!patch_test.result) {
                        printError("Software Manager", patch_test.reason);
                        reject(patch_test.reason);
                        return;
                    }
                    const architecture_test = database.parameter_validation.software_manager.architecture(architecture);
                    if (!architecture_test.result) {
                        printError("Software Manager", architecture_test.reason);
                        reject(architecture_test.reason);
                        return;
                    }
                    const platform_test = database.parameter_validation.software_manager.platform(platform);
                    if (!platform_test.result) {
                        printError("Software Manager", platform_test.reason);
                        reject(platform_test.reason);
                        return;
                    }
                    const os_version_test = database.parameter_validation.software_manager.os_version(os_version);
                    if (!os_version_test.result) {
                        printError("Software Manager", os_version_test.reason);
                        reject(os_version_test.reason);
                        return;
                    }
                    //#endregion

                    const query = `
                    SELECT software_version_has_platform.filename AS filename
                    FROM software_version_has_platform, software_platform
                    WHERE
                    software_version_has_platform.platform_name = software_platform.name AND 
                    software_version_has_platform.package_id=BINARY ? AND 
                    software_version_has_platform.branch_name=BINARY ? AND 
                    software_version_has_platform.major=BINARY ? AND 
                    software_version_has_platform.minor=BINARY ? AND 
                    software_version_has_platform.patch=BINARY ? AND
                    software_platform.architecture=BINARY ? AND 
                    software_platform.platform=BINARY ? AND 
                    software_platform.os_version=BINARY ?;`;

                    const result = await database.select(query, package_id, branch_name, major, minor, patch, architecture, platform, os_version);
                    if (result.length > 0) {
                        resolve(result[0].filename);
                    } else {
                        resolve(false);
                    }
                    return;
                } catch (err) {
                    printError("Software Manager", err);
                    resolve(false);
                    return;
                }
            });
        }
    }
};

//TODO: Check every end of the day if there are files in the file system that are not in the Database

module.exports = software_manager;