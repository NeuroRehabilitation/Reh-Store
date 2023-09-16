const database = require('./db');
const path = require('path');
const console_colors = require(path.join(__dirname, '..', 'modules', 'console_color'));
const { print, printError } = require(path.join(__dirname, '..', 'modules', 'custom_print'));

var crypto = require('crypto');

const accounts = {
    parameter_validation: {
        isBirthDateOver18: (timestamp = "") => {
            let birth_date = new Date(parseInt(timestamp + ''));
            //Check if user has more than 18 years old
            birth_date.setFullYear(birth_date.getFullYear() + 18);
            return birth_date <= new Date();
        },
        isDataAll: database.isDataAll,
        username: (username = "") => {
            if (username !== "" && database.isDataAll.lettersAndNumbers(username)) {
                return true;
            } else {
                return false;
            }
        },
        email: (email = "") => {
            if (email !== "" && database.isDataAll.email(email)) {
                return true;
            } else {
                return false;
            }
        },
        first_name: (first_name = "") => {
            if (first_name !== "" && database.isDataAll.letters(first_name)) {
                return true;
            } else {
                return false;
            }
        },
        last_name: (last_name = "") => {
            if (last_name !== "" && database.isDataAll.letters(last_name)) {
                return true;
            } else {
                return false;
            }
        },
        birth_date: (birth_date = "") => {
            if (birth_date !== "" && database.isDataAll.integers(birth_date.replaceAll("-", ""))) {
                return true;
            } else {
                return false;
            }
        },
        language: (language = "") => {
            if (language !== "" && database.isDataAll.lettersAndMinus(language)) {
                return true;
            } else {
                return false;
            }
        },
        password: (password = "") => {
            if (password !== "" && database.isDataAll.password(password)) {
                return true;
            } else {
                return false;
            }
        },
        group_name: (group_name = "") => {
            if (group_name !== "" && database.isDataAll.lettersAndNumbers(group_name)) {
                return true;
            } else {
                return false;
            }
        },
        permission_name: (permission_name = "") => {
            if (permission_name !== "" && database.isDataAll.lettersAndUnderscore(permission_name)) {
                return true;
            } else {
                return false;
            }
        },
        confirmation_code: (code = "") => {
            if (code !== "" && database.isDataAll.lettersAndNumbers(code)) {
                return true;
            } else {
                return false;
            }
        },
        reset_password_code: (code = "") => {
            if (code !== "" && database.isDataAll.lettersAndNumbers(code)) {
                return true;
            } else {
                return false;
            }
        }
    },
    users: {
        getAll: async () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const query = "SELECT username, email, first_name, last_name, birth_date, language, email_verified FROM accounts;"
                    const result = await database.select(query);
                    let response = [];
                    for (let i = 0; i < result.length; i++) {
                        const user = result[i];
                        const user_groups = await accounts.groups.users.getGroups(user.username);
                        response.push({
                            ...user,
                            user_groups: user_groups
                        });
                    }
                    resolve(response);
                    return;
                } catch (err) {
                    printError("Accounts", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },
        numberOfUsers: async () => {
            return new Promise(async (resolve, reject) => {
                try {
                    const query = "SELECT COUNT(*) AS num_users FROM accounts;"
                    const result = await database.select(query);
                    resolve(result[0].num_users);
                    return;
                } catch (err) {
                    printError("Accounts", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },

        /**
         * first_user_index -> first array position of the user
         * num_users -> Number of users to obtain
         */
        getUserList: async (first_user_index = 0, num_users = 0) => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify received data
                    if (!database.isDataAll.integers(first_user_index)) {
                        reject("Begin index number must be all numbers only");
                        return;
                    }
                    if (!database.isDataAll.integers(num_users)) {
                        reject("End index number must be all numbers only");
                        return;
                    }
                    //#endregion
                    const query = "SELECT username, email, first_name, last_name, accounts.language, birth_date, email_verified FROM accounts ORDER BY username ASC LIMIT ?,?;";
                    const result = await database.select(query, parseInt(first_user_index), parseInt(num_users));
                    let response = [];
                    for (let i = 0; i < result.length; i++) {
                        const user = result[i];
                        const user_date = new Date(result[i].birth_date);
                        user.birth_date = `${user_date.getDate()}-${user_date.getMonth() + 1}-${user_date.getFullYear()}`;
                        const user_groups = await accounts.groups.users.getGroups(user.username);
                        response.push({
                            ...user,
                            user_groups: user_groups
                        });
                    }
                    resolve(response);
                    return;
                } catch (err) {
                    printError("Accounts", err);
                    reject("Unkown Error");
                    return;
                }
            })
        }
    },
    user: {
        confirmation_code: {
            create: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        let code_already_exists = await accounts.user.confirmation_code.get(username);
                        //Code exists, no need to create a new one
                        if (code_already_exists !== "") {
                            resolve(code_already_exists);
                            return;
                        }

                        const timestamp = + new Date();
                        const confirm_code = crypto.createHash('sha256').update(username + timestamp).digest('hex');

                        const query = "INSERT INTO account_confirmation_codes(username, code) VALUES(?,?);";
                        const result = await database.insert(query, username, confirm_code);

                        if (result.affectedRows >= 1) {
                            code_already_exists = await accounts.user.confirmation_code.get(username);
                            resolve(code_already_exists);
                        } else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        reject("");
                        return;
                    }
                });
            },
            get: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT code FROM account_confirmation_codes WHERE username=BINARY ?";

                        const result = await database.select(query, username);

                        if (result.length > 0)
                            resolve(result[0].code);
                        else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve("");
                        return;
                    }
                });
            },
            remove: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "DELETE FROM account_confirmation_codes WHERE username=BINARY ?";
                        const result = await database.delete(query, username);

                        if (result.affectedRows > 0)
                            resolve(true);
                        else
                            resolve(false);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });
            },
            getUserFromCode: async (code = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.confirmation_code(code)) {
                            reject("Activation code must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT username FROM account_confirmation_codes WHERE code=BINARY ?";
                        const result = await database.select(query, code);

                        if (result.length > 0)
                            resolve(result[0].username);
                        else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve("");
                        return;
                    }
                });

            }
        },
        reset_password_code: {
            create: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        let code_already_exists = await accounts.user.reset_password_code.get(username);
                        //Code exists, no need to create a new one
                        if (code_already_exists !== "") {
                            resolve(code_already_exists);
                            return;
                        }

                        const timestamp = + new Date();
                        const confirm_code = crypto.createHash('sha256').update(username + timestamp).digest('hex');

                        const query = "INSERT INTO account_password_reset_codes(username, code) VALUES(?,?);";
                        const result = await database.insert(query, username, confirm_code);

                        if (result.affectedRows >= 1) {
                            code_already_exists = await accounts.user.reset_password_code.get(username);
                            resolve(code_already_exists);
                        } else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        reject("");
                        return;
                    }
                });
            },
            get: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT code FROM account_password_reset_codes WHERE username=BINARY ?";

                        const result = await database.select(query, username);

                        if (result.length > 0)
                            resolve(result[0].code);
                        else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve("");
                        return;
                    }
                });
            },
            remove: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "DELETE FROM account_password_reset_codes WHERE username=BINARY ?";
                        const result = await database.delete(query, username);

                        if (result.affectedRows > 0)
                            resolve(true);
                        else
                            resolve(false);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });
            },
            getUserFromCode: async (code = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.reset_password_code(code)) {
                            reject("Activation code must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT username FROM account_password_reset_codes WHERE code=BINARY ?";
                        const result = await database.select(query, code);

                        if (result.length > 0)
                            resolve(result[0].username);
                        else
                            resolve("");

                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve("");
                        return;
                    }
                });

            }
        },

        setAccountActivation: async (username = "", activation = false) => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }

                    if (!database.isDataAll.boolean(activation)) {
                        reject("Activation must be a boolean (true or false)");
                        return;
                    }
                    //#endregion

                    let activationCode = (activation || activation === "true") ? 1 : 0;

                    const query = "UPDATE accounts SET email_verified=? WHERE username=BINARY ?";
                    const result = await database.update(query, activationCode, username);

                    if (result.affectedRows > 0 && result.changedRows > 0)
                        resolve(true);
                    else
                        resolve(false);
                } catch (err) {
                    printError("Accounts", err);
                    resolve(false);
                    return;
                }
            })
        },

        getAccountActivation: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    const query = "SELECT email_verified FROM accounts WHERE username=BINARY ?";
                    const result = await database.select(query, username);

                    if (result[0].email_verified === 1)
                        resolve(true);
                    else
                        resolve(false);
                } catch (err) {
                    printError("Accounts", err);
                    resolve(false);
                    return;
                }
            })
        },

        add: async (username = "", email = "", first_name = "", last_name = "", birth_date = "", language = "", password = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }

                    if (!accounts.parameter_validation.email(email)) {
                        reject("Email is not valid");
                        return;
                    }

                    if (!accounts.parameter_validation.first_name(first_name)) {
                        reject("First name must be only letters");
                        return;
                    }

                    if (!accounts.parameter_validation.last_name(last_name)) {
                        reject("Last name must be only letters");
                        return;
                    }

                    if (!accounts.parameter_validation.birth_date(birth_date)) {
                        reject("Birth Date must be only numbers (timestamp set to midnight)");
                        return;
                    }

                    if (!accounts.parameter_validation.isBirthDateOver18(birth_date)) {
                        reject("User must be an adult.");
                        return;
                    }

                    if (!accounts.parameter_validation.language(language)) {
                        reject("Language code must be only letters and -");
                        return;
                    }

                    if (!accounts.parameter_validation.password(password)) {
                        reject("Password must be minimum 8 characters and max 30 characters, have at least one letter and one number");
                        return;
                    }
                    //#endregion


                    /**
                     * We do not verify here if the user exists in the database. We want to verify using the error code from database instead.
                     * If we verify here, we will do 2 querys and this is unecessary.
                     */

                    const hashedPassword = database.password.hash(password);
                    let processed_birth_date = new Date(parseInt(birth_date + ''));
                    processed_birth_date = processed_birth_date.getFullYear() + '-' + (processed_birth_date.getMonth() + 1) + '-' + processed_birth_date.getDate();

                    const query = 'INSERT INTO accounts (username, email, first_name, last_name, birth_date, language, password) VALUES(?,?,?,?,?,?,?);';

                    const result = await database.insert(query, username, email, first_name, last_name, processed_birth_date, language, hashedPassword);


                    if (result.affectedRows >= 1) //It should return 1 because we are only inserting 1 row into db
                        resolve(true);
                    else
                        reject("Unkown error");
                } catch (err) {
                    switch (err.errno) {
                        case 1062:
                            //If the user exists, return it
                            reject("User already exists");
                            break;
                        default:
                            reject("Unkown error");
                            break;
                    }
                }
            });
        },

        change_username: async (old_username = "", new_username = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(old_username)) {
                        reject("Old username must be only letters and numbers");
                        return;
                    }
                    if (!accounts.parameter_validation.username(new_username)) {
                        reject("New username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    //Check if user exists
                    if (!(await accounts.user.exists(old_username))) {
                        reject("User does not exist");
                        return;
                    }

                    let query = "UPDATE accounts SET username=? WHERE username=BINARY ?;"; //column1= value1 WHERE username="${username}"
                    const result = await database.update(query, new_username, old_username); //Three dots tels JavaScript that the values inside the array are parameters
                    resolve(result.affectedRows >= 1);
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    switch (err.errno) {
                        default:
                            reject("Unkown error");
                            break;
                    }
                }
            });
        },

        edit: async (username = "", email = "", first_name = "", last_name = "", birth_date = "", language = "", newPassword = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }

                    if (!database.isDataAll.email(email) && email !== "") {
                        reject("Email is not valid");
                        return;
                    }

                    if (!database.isDataAll.letters(first_name) && first_name !== "") {
                        reject("First name must be only letters");
                        return;
                    }

                    if (!database.isDataAll.letters(last_name) && last_name !== "") {
                        reject("Last name must be only letters");
                        return;
                    }

                    if (!database.isDataAll.integers(birth_date) && birth_date !== "") {
                        reject("Birth Date must be only numbers (timestamp set to midnight)");
                        return;
                    }

                    if (!database.isDataAll.lettersAndMinus(language) && language !== "") {
                        reject("Language code must be only letters and -");
                        return;
                    }

                    if (!database.isDataAll.password(newPassword) && newPassword !== "") {
                        reject("New password must be minimum 8 characters and max 30 characters, have at least one letter and one number");
                        return;
                    }
                    //#endregion

                    //Check if user exists
                    if (!(await accounts.user.exists(username))) {
                        reject("User does not exist");
                        return;
                    }

                    if (email === "" && first_name === "" && last_name === "" && birth_date === "" && language === "" && newPassword == "") {
                        resolve(true);
                        return;
                    }



                    let input = {};

                    if (email !== "") input.email = email;
                    if (first_name !== "") input.first_name = first_name;
                    if (last_name !== "") input.last_name = last_name;
                    if (birth_date !== "") {
                        input.birth_date = new Date(parseInt(birth_date + ''));
                    }

                    if (language !== "") input.language = language;
                    if (newPassword !== "") input.password = database.password.hash(newPassword);

                    let query = "UPDATE accounts SET "; //column1= value1 WHERE username="${username}"

                    let orderedQueryInput = [];
                    Object.keys(input).forEach(key => {
                        query += key + "=?, ";
                        orderedQueryInput.push(input[key]);
                    });
                    query = query.slice(0, -2);
                    query += " WHERE username=BINARY ?;";

                    const result = await database.update(query, ...orderedQueryInput, username); //Three dots tels JavaScript that the values inside the array are parameters

                    resolve(result.affectedRows >= 1);
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    switch (err.errno) {
                        default:
                            reject("Unkown error");
                            break;
                    }
                }
            });
        },

        remove: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify received data
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    if (!(await accounts.user.exists(username))) {
                        resolve(true);
                        return;
                    }

                    const query = "DELETE FROM accounts WHERE username=BINARY ?;";
                    const result = await database.delete(query, username);

                    resolve((result.affectedRows >= 1));
                    return;
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    switch (err.errno) {
                        default:
                            reject("Unkown error");
                            break;
                    }
                }
            });
        },

        exists: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //Check if username is empty
                    if (username === "") {
                        resolve(false);
                        return;
                    }
                    //#region Purify Input
                    if (!database.isDataAll.lettersAndNumbers(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    const query = "SELECT username FROM accounts WHERE username=BINARY ?";
                    const result = await database.select(query, username);

                    resolve((result.length > 0) ? true : false);
                    return;
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    reject(false);
                    return;
                }
            });
        },

        verifyPassword: async (username = "", password = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //Check if fiels are not empty
                    if (username === "" || password === "") {
                        resolve(false);
                        return;
                    }
                    //#region Purify Input
                    if (!database.isDataAll.lettersAndNumbers(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    if (!database.isDataAll.password(password)) {
                        reject("Password must be minimum 8 characters and max 30 characters, have at least one letter and one number");
                        return;
                    }
                    //#endregion

                    //Check if user exists
                    if (!accounts.user.exists(username))
                        resolve(false);

                    const query = "SELECT password FROM accounts WHERE username=BINARY ?";
                    const passwordHash = (await database.select(query, username))[0].password;

                    const isPasswordValid = database.password.checkHash(password, passwordHash);

                    resolve(isPasswordValid);
                    return;
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    resolve(false);
                    return;
                }
            });
        },

        //Melhorar este método
        getEmail: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                print("Email Server", "Processando");
                try {
                    //#region Purify Input
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    //Check if user exists
                    if (!(await accounts.user.exists(username))) {
                        reject("Username does not exist");
                        return;
                    }

                    const query = "SELECT email FROM accounts WHERE username=BINARY ?";
                    const result = await database.select(query, username);

                    if (result.length > 0) {
                        resolve(result[0].email);
                    } else {
                        reject("Unkown Error");
                    }
                    return;
                } catch (err) {
                    printError("Accounts", err);
                    reject("Unkown Error");
                    return;
                }
            });
        },

        details: async (username = "") => {
            return new Promise(async (resolve, reject) => {
                try {
                    //#region Purify received data
                    if (!accounts.parameter_validation.username(username)) {
                        reject("Username must be only letters and numbers");
                        return;
                    }
                    //#endregion

                    //Check if user does not exist
                    if (!(await accounts.user.exists(username))) {
                        resolve(undefined);
                        return;
                    }

                    const query = "SELECT email, first_name, last_name, birth_date, language FROM accounts WHERE username=BINARY ?";
                    const result = await database.select(query, username);
                    if (result) {
                        let birth_date = + new Date(result[0].birth_date);
                        let data_to_send = result[0];
                        data_to_send.birth_date = birth_date

                        resolve(data_to_send);
                        return;
                    } else {
                        resolve(undefined);
                        return;
                    }
                } catch (err) {
                    printError("Accounts", "Error: " + err);
                    switch (err.errno) {
                        default:
                            resolve(undefined);
                            break;
                    }
                }
            });
        }

    },
    groups: {
        users: {
            getGroups: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT group_name FROM account_belongs_to_group WHERE username=BINARY ?;";
                        const queryResult = await database.select(query, username);

                        let result = [];
                        queryResult.forEach(group => {
                            result.push(group.group_name);
                        });

                        resolve(result);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve([]);
                        return;
                    }
                });
            },

            hasGroup: async (username = "", group_name = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        if (!accounts.parameter_validation.group_name(group_name)) {
                            reject("Group name must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT group_name FROM account_belongs_to_group WHERE username=BINARY ? AND group_name=BINARY ?;";
                        const queryResult = await database.select(query, username, group_name);

                        resolve(queryResult.length > 0);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });
            },

            /**
             * Grants that the user is in a certain group
             * @param {*} username 
             * @param {*} group_name 
             */
            add: async (username = "", group_name = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        if (!accounts.parameter_validation.group_name(group_name)) {
                            reject("Group name must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        if (await accounts.groups.users.hasGroup(username, group_name)) {
                            resolve(true);
                            return;
                        }

                        const query = "INSERT INTO account_belongs_to_group (username, group_name) VALUES(?,?);";
                        const queryResult = await database.insert(query, username, group_name);
                        resolve(queryResult.affectedRows > 0);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });

            },

            /**
             * Grants that the user is not in the group
             * @param {*} username 
             * @param {*} group_name 
             */
            remove: async (username = "", group_name = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        if (!accounts.parameter_validation.group_name(group_name)) {
                            reject("Group name must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        if (!(await accounts.groups.users.hasGroup(username, group_name))) {
                            resolve(true);
                            return;
                        }

                        const query = "DELETE FROM account_belongs_to_group WHERE username=BINARY ? AND group_name=BINARY ?";
                        const queryResult = await database.delete(query, username, group_name);
                        resolve(queryResult.affectedRows > 0);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });
            }
        }
    },
    permissions: {
        groups: {
            /**
             * Returns a certain group permissions
             * @param {*} group_name 
             */
            get: async (group_name = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.group_name(group_name)) {
                            reject("Group name must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const query = "SELECT permission_name FROM account_group_has_permission WHERE group_name=BINARY ?";
                        const queryResult = await database.select(query, group_name);

                        let finalResults = [];
                        queryResult.forEach(permission => {
                            finalResults.push(permission.permission_name);
                        });

                        resolve(finalResults);
                        return;
                    } catch (err) {
                        printError("Accounts", err);
                        resolve([]);
                        return;
                    }
                })
            }
        },
        users: {
            /**
             * Get a certain user permissions
             * @param {*} username 
             */
            get: async (username = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        //#endregion

                        const userGroups = await accounts.groups.users.getGroups(username);

                        let permissions = [];
                        for (let a = 0; a < userGroups.length; a++) {
                            let groupPermissions = await accounts.permissions.groups.get(userGroups[a]);
                            for (let b = 0; b < groupPermissions.length; b++) {
                                if (!permissions.includes(groupPermissions[b])) {
                                    permissions.push(groupPermissions[b]);
                                }
                            }
                        }

                        resolve(permissions);
                    } catch (err) {
                        printError("Accounts", err);
                        resolve([]);
                        return;
                    }
                });
            },

            /**
             * Check if the user has a certain permission
             * @param {*} username 
             * @param {*} permission_name 
             */
            hasPermission: async (username = "", permission_name = "") => {
                return new Promise(async (resolve, reject) => {
                    try {
                        //#region Purify Input
                        if (!accounts.parameter_validation.username(username)) {
                            reject("Username must be only letters and numbers");
                            return;
                        }
                        if (!accounts.parameter_validation.permission_name(permission_name)) {
                            reject("Permission name must be only letters and underscores");
                            return;
                        }
                        //#endregion

                        const user_permissions = await accounts.permissions.users.get(username);

                        resolve(user_permissions.includes(permission_name));
                    } catch (err) {
                        printError("Accounts", err);
                        resolve(false);
                        return;
                    }
                });
            }
        }
    }
};

module.exports = accounts;