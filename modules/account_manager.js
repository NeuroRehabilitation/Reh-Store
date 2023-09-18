const path = require('path');
const { app } = require('electron');
const fs = require('fs');
const { data } = require('jquery');
const { print, printError } = require('./custom_print');
const languageManager = require('./language_manager');

const internet_manager = require('./internet_manager');


//File Manager
const file_manager = require(path.join(app.getAppPath(), 'modules', 'file_manager'));

account_manager = {
    login: async (username = "", password = "") => {
        print("Account Manager - login", "login");
        return new Promise((resolve, reject) => {
            if (username === "" || password === "") {
                resolve(false);
                return;
            }

            internet_manager.post(internet_manager.default_domain + '/api/account/login', {
                username: username,
                password: password
            }, true, false).then(res => {
                const result = (res.data);
                if (result.result) {
                    const user_token = result.token;

                    fs.writeFileSync(file_manager.file_list.user_token, JSON.stringify({
                        token: user_token,
                        username: username
                    }));

                    global.sharedObj.username = username;
                    resolve(true);
                    return;
                } else {
                    if (result !== "404") {
                        print("Account Manager", "Login: " + result.reason);
                        resolve(result.reason);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                }
            }).catch(error => {
                print("Account Manager - login", error);
                reject(error);
                return;
            });
        });
    },
    logged_in: async () => {
        print("Account Manager - logged_in", "logged_in");
        return new Promise((resolve, reject) => {
            const token = file_manager.getUserToken();
            if (token === undefined) {
                resolve(false);
                return;
            }

            internet_manager.post(internet_manager.default_domain + '/api/account/logged_in', {
                token: token.token
            }, true, false).then(res => {
                const received = (res.data);

                if (received.result === true || received.result === "true") {
                    if (received.logged_in) {
                        resolve(true)
                        return;
                    } else {
                        fs.unlinkSync(file_manager.file_list.user_token);
                        resolve(false)
                        return;
                    }

                } else {
                    print("Account Manager - logged_in", `Logged in: ${received.reason}`);
                }

            }).catch(error => {
                switch (error) {
                    case "No internet":
                        print("Account Manager - logged_in", "Returning the available offline value");
                        if (token.token !== undefined && token.username !== undefined) {
                            return resolve(true);
                        } else {
                            return resolve(false);
                        }
                    default:
                        printError("Account Manager - logged_in", error);
                        return resolve(undefined);
                }
            });
        });
    },
    logout: async () => {
        print("Account Manager", "logout");
        return new Promise((resolve, reject) => {
            const token = file_manager.getUserToken();
            if (token === undefined) {
                resolve(true);
                return;
            }

            internet_manager.post(internet_manager.default_domain + '/api/account/logout', {
                token: token.token
            }, true, false).then(res => {
                const result = (res.data);
                if (result.result) {
                    fs.unlinkSync(file_manager.file_list.user_token);
                    delete global.sharedObj.username;
                    internet_manager.deleteAllCacheEntries();
                    resolve(true);
                    return;
                } else {
                    resolve(false);
                    return;
                }

            }).catch(error => {
                print("Account Manager", error);
                resolve(false);
                return;
            });
        });
    },
    edit: async (new_email = "", current_password = "", new_password = "", first_name = "", last_name = "", language = "") => {
        print("Account Manager", "edit");
        return new Promise(async (resolve, reject) => {
            if (current_password === "") {
                reject("Current password cannot be blank");
                return;
            }

            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                print("Account Manager", "Error: User is not logged in.");
                reject("User not logged in");
                return;
            }

            const user_token = file_manager.getUserToken().token;
            const data_to_sent = { token: user_token };
            if (current_password !== "")
                data_to_sent.current_password = current_password;
            if (new_email !== "")
                data_to_sent.email = new_email;
            if (new_password !== "")
                data_to_sent.password = new_password;
            if (first_name !== "")
                data_to_sent.first_name = first_name;
            if (last_name !== "")
                data_to_sent.last_name = last_name;
            if (language !== "")
                data_to_sent.language = language;

            internet_manager.post(internet_manager.default_domain + '/api/account/edit', data_to_sent, true, false).then(res => {
                const result = (res.data);
                print("Account Manager", result);
                if (result.result === true || result.result === "true") {
                    internet_manager.deleteAllCacheEntries();
                    resolve({
                        result: true
                    });
                    return;
                } else {
                    resolve({
                        result: false,
                        reason: result.reason
                    });
                    return;
                }

            }).catch(error => {
                print("Account Manager", error);
                resolve({
                    result: false,
                    reason: error
                });
                return;
            });
        });
    },
    remove: async (current_password = "") => {
        print("Account Manager", "remove");
        return new Promise(async (resolve, reject) => {
            if (current_password === "") {
                reject("Current password cannot be blank");
                return;
            }

            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                print("[Account Manager", "Error: User is not logged in.");
                resolve(false);
                return;
            }

            const user_token = file_manager.getUserToken().token;

            internet_manager.post(internet_manager.default_domain + '/api/account/remove', {
                token: user_token,
                password: current_password
            }, true, false).then(res => {
                const result = (res.data);
                if (result.result === true || result.result === "true") {
                    resolve(true);
                    return;
                } else {
                    print("Account Manager", "Could not remove the account: " + result.reason);
                    resolve(false);
                    return;
                }

            }).catch(error => {
                print("Account Manager", error);
                resolve(false);
                return;
            });
        });
    },
    details: async () => {
        print("Account Manager - details", "details");
        return new Promise(async (resolve, reject) => {
            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                printError("Account Manager - details", "Error: User is not logged in.");
                resolve(undefined);
                return;
            }

            const user_token = file_manager.getUserToken().token;

            internet_manager.post(internet_manager.default_domain + '/api/account/view_details', {
                token: user_token
            }, true, true).then(res => { //30 Seconds Cache
                const result = (res.data);
                if (result.result === true || result.result === "true") {
                    let dados = JSON.parse(JSON.stringify(result));
                    delete dados.result;
                    //Set received username
                    global.sharedObj.username = dados.username;
                    resolve(dados);
                    return;
                } else {
                    print("Account Manager - details", "View Account Details: " + result.reason);
                    resolve(undefined);
                    return;
                }

            }).catch(error => {
                switch (error) {
                    case "No internet":
                        print("Account Manager - details", "Returned fake user details");
                        try {
                            if (global.sharedObj.username !== undefined)
                                return resolve({
                                    "email": "",
                                    "first_name": "",
                                    "last_name": "",
                                    "birth_date": 0,
                                    "language": languageManager.getAvailableLanguageCode(app.getLocale()),
                                    "username": global.sharedObj.username,
                                    "groups": ["client"]
                                });
                        } catch (err) {
                        }
                        printError("Account Manager - details", error);
                        return resolve(undefined);
                    default:
                        printError("Account Manager - details", error);
                        return resolve(undefined);
                }
            });
        });
    },
    language: async () => {
        print("Account Manager - language", "language");
        return new Promise(async (resolve, reject) => {
            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                print("Account Manager", "Error: User is not logged in.");
                resolve(undefined);
                return;
            }

            const user_token = file_manager.getUserToken().token;

            internet_manager.post(internet_manager.default_domain + '/api/account/language', {
                token: user_token
            }, true, true).then(res => {
                const result = (res.data);
                if (result.result === true || result.result === "true") {
                    resolve(result.language);
                    return;
                } else {
                    print("Account Manager - language", "Get Language: " + result.reason);
                    resolve(undefined);
                    return;
                }

            }).catch(error => {
                switch (error) {
                    case "No internet":
                        print("Account Manager - language", "Could not reach internet. Language was determined by using computer language");
                        return resolve(languageManager.getAvailableLanguageCode(app.getLocale()));
                    default:
                        printError("Account Manager - language", error);
                        return resolve(undefined);

                }
            });
        });
    },
    getGroups: async () => {
        print("Account Manager - getGroups", "getGroups");
        return new Promise(async (resolve, reject) => {
            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                print("Account Manager", "Error: User is not logged in.");
                reject("User not logged in");
                return;
            }

            const user_token = file_manager.getUserToken().token;

            internet_manager.post(internet_manager.default_domain + '/api/account/groups/all', {
                token: user_token
            }, true, true).then(res => {
                const result = (res.data);
                if (result.result === true || result.result === "true") {
                    resolve(result.groups);
                    return;
                } else {
                    print("Account Manager - getGroups", "Get Account Groups: " + result.reason);
                    resolve(undefined);
                    return;
                }

            }).catch(error => {
                switch (error) {
                    case "No internet":
                        print("Account Manager - getGroups", "Returned fake value");
                        return resolve(["client"]);
                    default:
                        printError("Account Manager - getGroups", error);
                        return resolve(undefined);
                }
            });
        });
    },
    getUsername: async () => {
        print("Account Manager - getUsername", "getUsername");
        return new Promise(async (resolve, reject) => {
            const user_logged_in = await account_manager.logged_in();
            if (!user_logged_in) {
                print("Account Manager - getUsername", "Error: User is not logged in.");
                resolve(undefined);
                return;
            }

            const user_token = file_manager.getUserToken().token;

            internet_manager.post(internet_manager.default_domain + '/api/account/username', {
                token: user_token
            }, true, true).then(res => {
                const result = (res.data);
                if (result.result === true || result.result === "true") {
                    let dados = JSON.parse(JSON.stringify(result));
                    global.sharedObj.username = dados.username;
                    resolve(dados.username);
                    return;
                } else {
                    print("Account Manager - getUsername", "View Account Details: " + result.reason);
                    resolve(undefined);
                    return;
                }

            }).catch(error => {
                switch (error) {
                    case "No internet":
                        try {
                            if (global.sharedObj.username !== undefined) {
                                print("Account Manager - getUsername", "Returned last gotten username from server");
                                return resolve(global.sharedObj.username);
                            }
                        } catch (err) {

                        }

                        try {
                            let possibleUsername = JSON.parse(fs.readFileSync(file_manager.file_list.user_token, 'utf8')).username;
                            global.sharedObj.username = possibleUsername;

                            print("Account Manager - getUsername", "Returned last gotten username from server");
                            return resolve(possibleUsername);
                        } catch (err) {
                            print("Account Manager - getUsername", error);
                            return resolve(undefined);
                        }
                    default:
                        print("Account Manager - getUsername", error);
                        return resolve(undefined);
                }
            });
        });
    }
}

module.exports = account_manager;