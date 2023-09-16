/**
 * This API is incomplete. There is no need in implementing all the functions
 * if some of them will never be used
 */

const api_account = {
    userToken: (() => localStorage.getItem("sessionToken") || undefined)(),
    login: async (username = "", password = "", isAdmin = false, isPublisher = false) => {
        return new Promise((resolve, reject) => {
            $.post('/api/account/login', { username: username, password: password, forAdmin: isAdmin, forPublisher: isPublisher }, function (data) {
                if (data.result === true) {
                    api_account.userToken = data.token;
                    localStorage.setItem("sessionToken", data.token);
                    customPrint("ACCOUNT", "Login success!");
                } else {
                    customPrint("ACCOUNT", "Login failed! (" + data.reason + ")");
                }
                resolve(data);
                return;
            }, "json");
        })
    },
    loggedIn: async () => {
        return new Promise((resolve, reject) => {
            if (api_account.userToken !== undefined) {
                $.post('/api/account/logged_in', { token: api_account.userToken }, function (data) {
                    if (data.logged_in) {
                        resolve(true);
                        return;
                    } else {
                        resolve(false);
                        return;
                    }
                }, "json");
            } else {
                resolve(false);
                return;
            }
        });
    },
    logout: async () => {
        return new Promise((resolve, reject) => {
            if (api_account.userToken !== undefined) {
                $.post('/api/account/logout', { token: api_account.userToken }, function (data) {
                    if (data.result) {
                        api_account.userToken = data.token;
                        localStorage.setItem("sessionToken", data.token);
                        customPrint("ACCOUNT", "Logout success!");
                        api_account.userToken = undefined;
                        localStorage.removeItem("sessionToken");
                        resolve(true);
                        return;
                    } else {
                        customPrint("ACCOUNT", "Logout failed!");
                        resolve(false);
                        return;
                    }
                }, "json");
            } else {
                resolve(true);
                return;
            }
        });
    },
    user: {
        exists: async (username = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/account/exists', { token: api_account.userToken, username: username }, function (data) {
                    if (data.result) {
                        resolve(data.exists);
                    } else {
                        customPrint("ACCOUNT", "Failed to check if the user exists (" + data.reason + ")");
                        resolve(false);
                    }
                    return;
                }, "json");
            });
        }
    }

}
