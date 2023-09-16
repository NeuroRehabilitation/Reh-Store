'use strict';
var express = require('express');
const path = require('path');
const email = require('../models/email');

const models_folder = path.join(__dirname, '..', 'models');
const modules_folder = path.join(__dirname, '..', 'modules');

//#region Modules
const { print, printError } = require(path.join(modules_folder, 'custom_print'));
//#endregion

//#region Models
const config_manager = require(path.join(models_folder, 'config_manager'));
const account_manager = require(path.join(models_folder, 'accounts'));
const email_manager = require(path.join(models_folder, 'email'));
//#endregion

const webserver_config = config_manager.get('webserver.json');

//#region API
var router = express.Router();

router.use((req, res, next) => {
    let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    ip = ip.replace(/^.*:/, '');
    //print("Account API", `${+new Date()} [${ip}] - Request to ${req.url}`);
    next();
});

router.get('/forgot_password', async (req, res) => {
    res.header(200).render('accounts/forgot_password', { siteName: 'Reh@Store', mainPage: false });
    return;
});

router.get('/reset_password', async (req, res) => {
    let code = req.query.code || "";

    try {
        const user_to_change_password = await account_manager.user.reset_password_code.getUserFromCode(code);

        if (user_to_change_password === "") {
            res.header(200).render('accounts/reset_password_invalid_code', { siteName: 'Reh@Store', mainPage: false });
            return;
        }

        res.header(200).render('accounts/reset_password', { siteName: 'Reh@Store', mainPage: false });
        return;
    } catch (err) {
        printError("Accounts API", err);
        res.header(200).render('accounts/reset_password_unkown_error', { siteName: 'Reh@Store', mainPage: false });
        return;

    }
});

router.post('/reset_password', async (req, res) => {
    let code = req.fields.code || "";
    const password = req.fields.password || "";

    try {
        const user_to_change_password = await account_manager.user.reset_password_code.getUserFromCode(code);

        if (user_to_change_password === "") {
            res.header(200).json({
                result: false,
                reason: "Invalid password reset request code"
            });
            return;
        }

        const edition_result = await account_manager.user.edit(
            user_to_change_password, "", "", "", "", "", password);
        if (!edition_result) {
            res.header(200).json({
                result: false,
                reason: 'Unkown error'
            });
            return;
        }

        const code_remove = await account_manager.user.reset_password_code.remove(user_to_change_password);
        await email_manager.sendResetPasswordWarning(user_to_change_password);
        res.header(200).json({
            result: true
        });
        return;
    } catch (err) {
        printError("Accounts API", err);
        switch (err) {
            case "New password must be minimum 8 characters and max 30 characters, have at least one letter and one number":
                res.header(200).json({
                    result: false,
                    reason: "New password must be minimum 8 characters and max 30 characters, have at least one letter and one number"
                });
                break;
            default:
                res.header(200).json({
                    result: false,
                    reason: "Unkown error"
                });
                break;
        }
        return;

    }
});

router.post('/request_password_reset', async (req, res) => {
    let username = req.fields.username;
    try {
        if (!(await account_manager.user.exists(username))) {
            printError("Account API", "Received password reset request for a user that does not exist: " + username);
            /**
             * We should return true here.
             * This is to avoid someone guessing what username's exists in this platform.
             */
            res.header(200).json({
                result: true
            });
            return;
        }
        //print("Account API", "Received password reset request for the user " + username);

        let reset_password_code = await account_manager.user.reset_password_code.get(username);
        if (reset_password_code !== "") {
            await account_manager.user.reset_password_code.remove(username);
        }

        reset_password_code = await account_manager.user.reset_password_code.create(username);
        if (reset_password_code !== "") {
            await email_manager.sendResetPasswordEmail(
                username,
                webserver_config.hostname + '/api/account/reset_password?code=' + reset_password_code
            );
            res.header(200).json({
                result: true
            });
            return;
        } else {
            res.header(200).json({
                result: false,
                reason: "Unkown error"
            });
            return;
        }
    } catch (err) {
        res.header(200).json({
            result: false,
            reason: "Unkown error"
        });
        return;
    }
})

router.post('/create', async (req, res) => {
    const username = req.fields.username || "";
    const email = req.fields.email || "";
    const password = req.fields.password || "";
    const first_name = req.fields.first_name || "";
    const last_name = req.fields.last_name || "";
    let birth_date = req.fields.birth_date || "";
    birth_date += '';
    const language_code = req.fields.language_code || "";

    try {
        const operation_result = await account_manager.user.add(username, email, first_name, last_name, birth_date, language_code, password);
        if (operation_result === true) {
            const confirmation_code = await account_manager.user.confirmation_code.create(username);
            if (confirmation_code !== "") {
                await account_manager.groups.users.add(username, "client");
                email_manager.sendconfirmationEmail(username, webserver_config.hostname + '/api/account/verify?code=' + confirmation_code);
                res.header(200).json({
                    result: true,
                });
                return;
            }
        }

        res.header(200).json({
            result: false,
            reason: "Unkown error"
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

router.get('/verify', async (req, res) => {
    let code = req.query.code;

    try {
        const user_to_verify = await account_manager.user.confirmation_code.getUserFromCode(code);

        if (user_to_verify === "") {
            res.header(200).render('accounts/invalid_code', { siteName: 'Reh@Store', mainPage: false });
            return;
        }

        const verify_operation = await account_manager.user.setAccountActivation(user_to_verify, true);

        if (verify_operation) { //If account validated status has changed, proceed
            const code_remove = await account_manager.user.confirmation_code.remove(user_to_verify);
            if (code_remove)
                res.header(200).render('accounts/valid_code', { siteName: 'Reh@Store', mainPage: false });
            else
                res.header(200).render('accounts/activation_error', { siteName: 'Reh@Store', mainPage: false });
        } else {
            res.header(200).render('accounts/invalid_code', { siteName: 'Reh@Store', mainPage: false });
        }
        return;
    } catch (err) {
        printError("Accounts API", err);
        res.header(200).render('accounts/activation_error', { siteName: 'Reh@Store', mainPage: false });
        return;
    }
});

router.get('/register', (req, res) => {
    res.header(200).render('accounts/register', { siteName: 'Reh@Store', mainPage: false });
    return;
});

router.post('/login', async (req, res) => {
    let username = req.fields.username || "";
    let password = req.fields.password || "";
    let loginForAdmin = req.fields.forAdmin || false;
    let loginForPublisher = req.fields.forPublisher || false;

    try {

        if (await account_manager.user.verifyPassword(username, password)) {

            if (!(await account_manager.permissions.users.hasPermission(username, 'account_login'))) {
                res.header(200).json({
                    result: false,
                    reason: 'Operation not allowed'
                });
                return;
            }

            const account_activated = await account_manager.user.getAccountActivation(username);
            if (account_activated) {
                const session_token = req.session_manager.access_token.create(username);
                if (loginForAdmin === "true" || loginForAdmin === true) {
                    const isUserAdmin = await account_manager.groups.users.hasGroup(username, "admin");
                    if (isUserAdmin) {
                        res.header(200).json({
                            result: true,
                            token: session_token
                        });
                        return;
                    } else {
                        res.header(200).json({
                            result: false,
                            reason: 'Permission denied'
                        });
                        return;
                    }
                } else if (loginForPublisher === "true" || loginForPublisher === true) {
                    const isUserPublisher = await account_manager.groups.users.hasGroup(username, "publisher");
                    if (isUserPublisher) {
                        res.header(200).json({
                            result: true,
                            token: session_token
                        });
                        return;
                    } else {
                        res.header(200).json({
                            result: false,
                            reason: 'Permission denied'
                        });
                        return;
                    }
                } else {
                    res.header(200).json({
                        result: true,
                        token: session_token
                    });
                    return;
                }
            } else {
                res.header(200).json({
                    result: false,
                    reason: 'Account not authorized. Please verify your account or contact the support.'
                });
                return;
            }
        } else {
            res.header(200).json({
                result: false,
                reason: 'Invalid credentials'
            });
            return;
        }
    } catch (err) {
        printError("Accounts", err);
        switch (err) {
            case "Username must be only letters and numbers":
                res.header(200).json({
                    result: false,
                    reason: "Username must be only letters and numbers"
                });
                break;

            case "Password must be minimum 8 characters and max 30 characters, have at least one letter and one number":
                res.header(200).json({
                    result: false,
                    reason: "Password must be minimum 8 characters and max 30 characters, have at least one letter and one number"
                });
                break;

            default:
                res.header(200).json({
                    result: false,
                    reason: "Unkown error"
                });
                break;
        }
        return;
    }

});

router.post('/logged_in', async (req, res) => {
    let token = req.fields.token;

    const username = req.session_manager.access_token.valid(token);
    if (username) {

        if (!(await account_manager.permissions.users.hasPermission(username, 'account_logged_in'))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        if (await account_manager.user.getAccountActivation(username)) {
            res.header(200).json({
                result: true,
                logged_in: true
            });
        } else {
            res.header(200).json({
                result: true,
                logged_in: false
            });
        }
    } else {
        res.header(200).json({
            result: true,
            logged_in: false
        });
    }
    return;
});

router.post('/logout', async (req, res) => {
    let token = req.fields.token;

    const username = req.session_manager.access_token.valid(token);
    if (username) {
        if (req.session_manager.access_token.logout(token)) {
            res.header(200).json({
                result: true
            });
        } else {
            res.header(200).json({
                result: false,
                reason: "Unkown Error"
            });
        }
    } else {
        res.header(200).json({
            result: false,
            reason: "Invalid token"
        });
    }
    return;
});

router.post('/edit', async (req, res) => {
    let token = req.fields.token;
    let new_email = req.fields.email || "";
    let new_password = req.fields.password || "";
    let current_password = req.fields.current_password || "";
    let new_first_name = req.fields.first_name || "";
    let new_last_name = req.fields.last_name || "";
    let new_language = req.fields.language || "";

    const username = req.session_manager.access_token.valid(token);
    if (!username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }

    try {
        try {
            let password_correct = await account_manager.user.verifyPassword(username, current_password);
            if (!password_correct) {
                res.header(200).json({
                    result: false,
                    reason: 'Current password is incorrect'
                });
                return;
            }
        } catch (err) {
            res.header(200).json({
                result: false,
                reason: 'Current password is incorrect'
            });
            return;
        }

        if (!(await account_manager.permissions.users.hasPermission(username, 'account_edit'))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const edition_result = await account_manager.user.edit(username, new_email, new_first_name, new_last_name, "", new_language, new_password);
        if (!edition_result) {
            res.header(200).json({
                result: false
            });
            return;
        }

        if (new_email === "") {
            res.header(200).json({
                result: true
            });
            return;
        }

        await account_manager.user.setAccountActivation(username, false);
        const confirmation_code = await account_manager.user.confirmation_code.create(username);
        if (confirmation_code !== "") {
            email_manager.sendconfirmationEmail(username, webserver_config.hostname + '/api/account/verify?code=' + confirmation_code);
            res.header(200).json({
                result: true,
                reason: 'Account is locked until email verification'
            });
            return;
        }

    } catch (err) {
        printError("Account API", err);
        res.header(200).json({
            result: false,
            reason: "Unkown Error"
        });
        return;
    }

});

router.post('/remove', async (req, res) => {
    let current_password = req.fields.password || "";
    let token = req.fields.token || "";

    const username = req.session_manager.access_token.valid(token);
    if (!username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }

    try {
        try {
            let password_correct = await account_manager.user.verifyPassword(username, current_password);
            if (!password_correct) {
                res.header(200).json({
                    result: false,
                    reason: 'Current password is incorrect'
                });
                return;
            }
        } catch (err) {
            res.header(200).json({
                result: false,
                reason: 'Current password is incorrect'
            });
            return;
        }

        if (!(await account_manager.permissions.users.hasPermission(username, 'account_remove'))) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const account_activated = await account_manager.user.getAccountActivation(username);
        if (!account_activated) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const remove_result = await account_manager.user.remove(username);

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
        printError("Account API", err);
        res.header(200).json({
            result: false,
            reason: "Unkown Error"
        });
        return;
    }
});

router.post('/view_details', async (req, res) => {
    let token = req.fields.token || "";
    let requested_username = req.fields.username || ""; //Only receive this if the user from the token is an admin

    const token_user_username = req.session_manager.access_token.valid(token);
    if (!token_user_username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }

    if (!(await account_manager.permissions.users.hasPermission(token_user_username, 'account_view_details'))) {
        res.header(200).json({
            result: false,
            reason: 'Operation not allowed'
        });
        return;
    }

    const token_user_groups = await account_manager.groups.users.getGroups(token_user_username);

    let user_to_be_searched;
    if (token_user_groups.includes("admin") && requested_username !== "") {
        user_to_be_searched = requested_username;
    } else {
        user_to_be_searched = token_user_username;
    }

    let user_details = await account_manager.user.details(user_to_be_searched);
    if (user_details !== undefined) {
        user_details.username = user_to_be_searched;
        user_details.groups = await account_manager.groups.users.getGroups(user_to_be_searched);
        user_details.result = true;
        res.header(200).json(user_details);
    } else {
        res.header(200).json({
            result: false,
            reason: "User not found"
        });
        return;
    }


});

router.post('/groups/all', async (req, res) => {
    let token = req.fields.token || "";
    let requested_username = req.fields.username || ""; //Only receive this if the user from the token is an admin

    const token_user_username = req.session_manager.access_token.valid(token);
    if (!token_user_username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }


    if (!(await account_manager.permissions.users.hasPermission(token_user_username, 'account_groups_all'))) {
        res.header(200).json({
            result: false,
            reason: 'Operation not allowed'
        });
        return;
    }

    try {
        const token_user_groups = await account_manager.groups.users.getGroups(token_user_username);
        res.header(200).json({
            result: true,
            groups: token_user_groups
        });
        return;
    } catch (err) {
        printError("Accounts API", err);
        res.header(200).json({
            result: false,
            reason: 'Unkown Error'
        });
        return;
    }
});

router.post('/language', async (req, res) => {
    let token = req.fields.token || "";
    let requested_username = req.fields.username || ""; //Only receive this if the user from the token is an admin

    const token_user_username = req.session_manager.access_token.valid(token);
    if (!token_user_username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }


    if (!(await account_manager.permissions.users.hasPermission(token_user_username, 'account_language'))) {
        res.header(200).json({
            result: false,
            reason: 'Operation not allowed'
        });
        return;
    }

    let user_details = await account_manager.user.details(token_user_username);
    if (user_details !== undefined) {
        res.header(200).json({
            result: true,
            language: user_details.language
        });
    } else {
        res.header(200).json({
            result: false,
            reason: "User not found"
        });
        return;
    }


});

router.post('/username', async (req, res) => {
    let token = req.fields.token || "";

    const token_user_username = req.session_manager.access_token.valid(token);
    if (!token_user_username) {
        res.header(200).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }


    if (!(await account_manager.permissions.users.hasPermission(token_user_username, 'account_username'))) {
        res.header(200).json({
            result: false,
            reason: 'Operation not allowed'
        });
        return;
    }

    let user_exists = await account_manager.user.exists(token_user_username);
    if (user_exists !== undefined) {
        res.header(200).json({
            result: true,
            username: token_user_username
        });
    } else {
        res.header(200).json({
            result: false,
            reason: "User not found"
        });
        return;
    }


});

router.post('/exists', async (req, res) => {
    let token = req.fields.token || "";
    let requested_username = req.fields.username || "";

    //Check if the user is logged in
    const username = req.session_manager.access_token.valid(token);
    if (username === false) {
        res.header(401).json({
            result: false,
            reason: "Invalid Token"
        });
        return;
    }

    try {
        const permission_name = `account_${req.url.substring(1).replaceAll("/", "_")}`;
        const user_has_permission = await account_manager.permissions.users.hasPermission(username, permission_name);
        if (user_has_permission === false) {
            res.header(200).json({
                result: false,
                reason: 'Operation not allowed'
            });
            return;
        }

        const user_exists = await account_manager.user.exists(requested_username);
        res.header(200).json({
            result: true,
            exists: user_exists
        });
        return;

    } catch (err) {
        printError("Account API", err);
        res.header(401).json({
            result: false,
            reason: err
        });
        return;
    }

})
//#endregion

module.exports = router;