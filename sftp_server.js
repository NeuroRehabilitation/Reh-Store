var fs = require('fs-extra');
const path = require('path');
var SFTPServer = require("./midleware/node-sftp-server");
//var Git = require("./midleware/git-wrapper");
const simpleGit = require('simple-git');
var resolvePath = require('resolve-path');
const { execSync } = require('child_process');

const { print, printError } = require(path.join(__dirname, 'modules', 'custom_print'));
const config_manager = require(path.join(__dirname, 'models', 'config_manager'));
const account_manager = require(path.join(__dirname, 'models', 'accounts'));
const software_manager = require(path.join(__dirname, 'models', 'software_manager'));

//Session Manager
const session_manager = require('./models/session');

//Server settings
const sftp_settings = config_manager.get('sftp_server.json');

const storage_path = path.normalize(path.join(__dirname, 'storage_system'));
const data_cloud_path = path.normalize(path.join(__dirname, 'storage_system', 'software_data'));
const files_tmp_dir = path.normalize(path.join(__dirname, 'storage_system', 'tmp'));

fs.ensureDirSync(data_cloud_path);
fs.ensureDirSync(files_tmp_dir);

var sftpServer = new SFTPServer({
    privateKeyFile: path.join(__dirname, 'certificates', sftp_settings.certificates.privateKey),
    debug: false
});


const git = simpleGit({ baseDir: storage_path });
/*
var git = new Git({
    cwd: storage_path,
    'git-dir': path.join(storage_path, '.git')
});
*/


const toolbox = {
    getPurifiedPath: (sftp_path = "") => {
        try {
            if (sftp_path === ".") return data_cloud_path;

            let tmpPath = sftp_path.replace(/\\/g, "/");

            tmpPath = path.normalize(tmpPath);

            if (tmpPath.split("/")[0] === "") tmpPath = tmpPath.replace("/", "");


            tmpPath = tmpPath.replace(/\/\.\.\//g, "");

            if (tmpPath === "") return data_cloud_path;

            let resolvedPath = resolvePath(data_cloud_path, tmpPath);

            if (!(resolvedPath + '').includes(data_cloud_path)) return "";

            return resolvedPath;
        } catch (err) {
            printError("SFTP Server", err);
            return "";
        }
    },
    isPathAbsolute: (sftp_path) => {
        return !(sftp_path.includes('/../') || sftp_path.split("/")[sftp_path.split("/").length - 1] === "..");
    },
    userFolderHasPackageFile: (username = "", package_id = "") => {
        let thePath = toolbox.getPurifiedPath("/" + path.join(username, package_id));
        if (thePath === "") return false;

        return fs.existsSync(thePath) && fs.statSync(thePath).isDirectory();
    }
};
async function updateUserInfo(username) {
    return new Promise(async (resolve, reject) => {
        let user = {
            username: username,
            groups: await account_manager.groups.users.getGroups(username)
        };
        if (user.groups.includes('admin'))
            user.higherPermissionGroup = 'admin';
        else if (user.groups.includes('publisher'))
            user.higherPermissionGroup = 'publisher';
        else if (user.groups.includes('client')) {
            user.higherPermissionGroup = 'client';
        }


        if (user.groups.includes('publisher')) {
            user.publishedSoftware = await software_manager.software.getAllPublisherSoftware(user.username);
        }
        resolve(user);
    });
};

function handleUserRequest(auth, info, session, user) {
    print("SFTP Server", `User '${user.username}' has connected.`);

    setInterval(async () => {
        user = await updateUserInfo(user.username);
        //print("SFTP Server", `Updated ${user.username} info.`);
    }, 1000);

    //Make sure the user folder exists    
    fs.ensureDirSync(path.normalize(path.join(data_cloud_path, user.username)));

    session.on('stat', function (received_sftp_path, statkind, responder) {
        //print("SFTP Server - stat", `'${user.username}' - ${received_sftp_path}`);


        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - stat", `'${user.username}' sent invalid path`);
            return responder.nofile();
        }

        if (user.higherPermissionGroup === "client" && sftp_path.split("/")[1] !== user.username) {
            printError("Stat", `'${user.username}' tried to access "${sftp_path}" (not authorized client)`);
            return responder.nofile();
        }
        if (user.higherPermissionGroup === "publisher" && sftp_path.split("/")[1] !== user.username) {
            if (
                sftp_path.split("/").length >= 2 &&
                !user.publishedSoftware.includes(sftp_path.split("/")[2]) &&
                sftp_path.split("/")[2] !== "" &&
                sftp_path.split("/")[1] !== ""
            ) {
                printError("Stat", `'${user.username}' tried to access "${sftp_path}" (not the creator of the package)`);
                return responder.nofile();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);
        if (thePath === "" || thePath === undefined) {
            printError("Stat", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return responder.nofile();
        }

        if (!fs.existsSync(thePath)) {
            printError("Stat", `'${user.username}' path not found: "${sftp_path}" (${thePath})`);
            return responder.nofile();
        }
        //#endregion



        let pathStatSync = fs.statSync(thePath);
        if (pathStatSync.isDirectory()) {
            responder.is_directory();
        }
        if (pathStatSync.isFile()) {
            responder.is_file();      // Tells responder that we're describing a directory.
        }

        responder.permissions = 0o755; // Octal permissions, like what you'd send to a chmod command
        responder.uid = 1;             // User ID that owns the file.
        responder.gid = 1;             // Group ID that owns the file.
        responder.size = pathStatSync.size;            // File size in bytes.
        responder.atime = pathStatSync.atime;      // Created at (unix style timestamp in seconds-from-epoch).
        responder.mtime = pathStatSync.mtime;      // Modified at (unix style timestamp in seconds-from-epoch).

        return responder.file();   // Tells the statter to actually send the values above down the wire.

    });

    session.on('readdir', function (received_sftp_path, responder) {
        //print("SFTP Server - readdir", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - readdir", `'${user.username}' sent invalid path`);
            return responder.nofile();
        }

        if (user.higherPermissionGroup === "client" && sftp_path.split("/")[1] !== user.username) {
            printError("Read Dir", `'${user.username}' tried to access "${sftp_path}" (not authorized)`);
            return responder.nofile();
        }
        if (user.higherPermissionGroup === "publisher" && sftp_path.split("/")[1] !== user.username) {
            if (
                sftp_path.split("/").length >= 2 &&
                !user.publishedSoftware.includes(sftp_path.split("/")[2]) &&
                sftp_path.split("/")[1] !== ""
            ) {
                printError("Read Dir", `'${user.username}' tried to access "${sftp_path}" (not authorized)`);
                return responder.nofile();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);
        if (thePath === "") {
            printError("Read Dir", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return responder.nofile();
        }

        if (!fs.existsSync(thePath)) {
            return responder.nofile();
        }
        //#endregion

        if (!fs.statSync(thePath).isDirectory()) {
            return responder.nofile();
        }

        let dirList = fs.readdirSync(thePath);
        let dirListIndex = 0;

        responder.on("dir", function () {
            if (dirList[dirListIndex]) {
                //console.warn("Returning directory: " + dirList[dirListIndex]);
                try {
                    let ftstatFile = fs.statSync(path.normalize(path.join(thePath, dirList[dirListIndex])));
                    responder.file(dirList[dirListIndex], {
                        'mode':
                            ftstatFile.isDirectory() ?
                                fs.constants.S_IFDIR :
                                fs.constants.S_IFREG | 0o644, 	// Bit mask of file type and permissions 
                        'permissions': 0o644, 					// Octal permissions, like what you'd send to a chmod command
                        'uid': 1, 								// User ID that owns the file.
                        'gid': 1, 								// Group ID that owns the file.
                        'size': ftstatFile.size, 							// File size in bytes.
                        'atime': ftstatFile.atime, 						// Created at (unix style timestamp in seconds-from-epoch).
                        'mtime': ftstatFile.mtime 						// Modified at (unix style timestamp in seconds-from-epoch).
                    });
                } catch (err) {
                    printError("Read Dir", "Error while obtaining " + dirList[dirListIndex]);
                }
                return dirListIndex++;
            } else {
                return responder.end();
            }
        });
        return responder.on("end", function () {
            return; //console.warn("Terminated operation read dir for user ", user.username);
        });
    });
    session.on("mkdir", async function (received_sftp_path, callback) {
        //print("SFTP Server - mkdir", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - mkdir", `'${user.username}' sent invalid path`);
            return callback.fail();
        }
        if (user.higherPermissionGroup === "client" || user.higherPermissionGroup === "publisher") {
            if (sftp_path.split("/")[1] !== user.username) {
                printError("Make Dir", `'${user.username}' tried to create "${sftp_path}" (not authorized)`);
                return callback.fail();
            }
            if (sftp_path.replace(/\\/g, '/') === `/${user.username}`) { //Check if the user is trying to create its own personal folder
                fs.ensureDirSync(toolbox.getPurifiedPath(`/${user.username}`));
                return callback.ok();
            }

            try {
                if ((await software_manager.branch.getBranchedAllowedToUse(user.username, sftp_path.split("/")[2])).length === 0) {
                    printError("Make Dir", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                    return callback.fail();
                }
            } catch (err) {
                printError("Make Dir", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                printError("Make Dir", err);
                return callback.fail();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);
        if (thePath === "") {
            printError("Make Dir", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return callback.fail();
        }
        //#endregion

        fs.ensureDirSync(thePath);
        return callback.ok();
    });
    session.on("rmdir", async function (received_sftp_path, callback) {
        //print("SFTP Server - rmdir", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - rmdir", `'${user.username}' sent invalid path`);
            return callback.fail();
        }
        if (user.higherPermissionGroup === "client" || user.higherPermissionGroup === "publisher") {
            if (sftp_path.split("/")[1] !== user.username) {
                printError("Remove Dir", `'${user.username}' tried to create "${sftp_path}" (not authorized)`);
                return callback.fail();
            }
            try {
                if ((await software_manager.branch.getBranchedAllowedToUse(user.username, sftp_path.split("/")[2])).length === 0) {
                    printError("Remove Dir", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                    return callback.fail();
                }
            } catch (err) {
                printError("Remove Dir", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                printError("Remove Dir", err);
                return callback.fail();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);
        if (thePath === "") {
            printError("Remove Dir", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return callback.fail();
        }
        //#endregion

        fs.removeSync(thePath);
        return callback.ok();
    });

    session.on("delete", async function (received_sftp_path, callback) {
        //print("SFTP Server - delete", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - delete", `'${user.username}' sent invalid path`);
            return callback.fail();
        }
        if (user.higherPermissionGroup === "client" || user.higherPermissionGroup === "publisher") {
            if (sftp_path.split("/")[1] !== user.username) {
                printError("Delete File", `'${user.username}' tried to create "${sftp_path}" (not authorized)`);
                return callback.fail();
            }
            try {
                if ((await software_manager.branch.getBranchedAllowedToUse(user.username, sftp_path.split("/")[2])).length === 0) {
                    printError("Delete File", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                    return callback.fail();
                }
            } catch (err) {
                printError("Delete File", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                printError("Delete File", err);
                return callback.fail();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);
        if (thePath === "") {
            printError("Delete File", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return callback.fail();
        }
        //#endregion

        fs.removeSync(thePath);
        return callback.ok();
    });
    session.on("readfile", async function (received_sftp_path, writestream) {
        //print("SFTP Server - readfile", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - readfile", `'${user.username}' sent invalid path`);
            return writestream.close();
        }
        if (user.higherPermissionGroup === "client" || user.higherPermissionGroup === "publisher") {
            if (sftp_path.split("/")[1] !== user.username) {
                printError("Read File", `'${user.username}' tried to create "${sftp_path}" (not authorized)`);
                return writestream.close();
            }
            try {
                if ((await software_manager.branch.getBranchedAllowedToUse(user.username, sftp_path.split("/")[2])).length === 0) {
                    printError("Read File", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                    return writestream.close();
                }
            } catch (err) {
                printError("Read File", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                printError("Read File", err);
                return writestream.close();
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);

        if (!fs.existsSync(thePath)) {
            printError("SFTP Server - readfile", `'${user.username}' tried to read non existing file`);
            return writestream.close();
        }

        let pathStatSync = fs.statSync(thePath);
        if (!pathStatSync.isFile()) {
            printError("SFTP Server - readfile", `'${user.username}' tried to read non existing file`);
            return writestream.close();
        }

        if (thePath === "") {
            printError("Read File", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return writestream.close();
        }
        //#endregion

        return fs.createReadStream(thePath).pipe(writestream);
    });
    session.on("writefile", async function (received_sftp_path, readstream) {
        //print("SFTP Server - writefile", `'${user.username}' - '${received_sftp_path}'`);

        //#region Permissions and path validation
        let sftp_path = path.normalize(received_sftp_path);
        if (!toolbox.isPathAbsolute(sftp_path)) {
            printError("SFTP Server - writefile", `'${user.username}' sent invalid path`);
            return;
        }
        if (user.higherPermissionGroup === "client" || user.higherPermissionGroup === "publisher") {
            if (sftp_path.split("/")[1] !== user.username) {
                printError("Write File", `'${user.username}' tried to create "${sftp_path}" (not authorized)`);
                return;
            }
            try {
                if ((await software_manager.branch.getBranchedAllowedToUse(user.username, sftp_path.split("/")[2])).length === 0) {
                    printError("Write File", `'${user.username}' tried to write to "${sftp_path}" (do not have permission to use software)`);
                    return;
                }
            } catch (err) {
                printError("Write File", `'${user.username}' tried to create "${sftp_path}" (do not have permission to use software)`);
                printError("Write File", err);
                return;
            }
        }

        let thePath = toolbox.getPurifiedPath(sftp_path);

        if (thePath === "") {
            printError("Write File", `'${user.username}' error happened when trying to access "${sftp_path}"`);
            return;
        }
        //#endregion


        readstream.on("end", function () {
            //print("SFTP Server - writefile", `'${user.username}' - File '${received_sftp_path}' was created`);
        });
        return readstream.pipe(fs.createWriteStream(thePath));
    });

    session.on("error", (error) => {
        printError("SFTP Server", "Fatal Error: " + error);
        session.closeSession();
    });

}

sftpServer.on('connect', async function (auth, info) {
    if (auth.method !== "password") return auth.reject(['password'], false);

    try {
        if (
            session_manager.access_token.valid(auth.password) === auth.username ||
            (await account_manager.user.verifyPassword(auth.username, auth.password))
        ) {

            let user = await updateUserInfo(auth.username);

            print("SFTP Server", `User ${auth.username} logged in`);
            return auth.accept(function (session) {
                return handleUserRequest(auth, info, session, user);
            });
        } else {
            printError("SFTP Server", `User ${auth.username} failed to login`);
            return auth.reject(['password'], false);
        }
    } catch (err) {
        printError("SFTP Server", err);
        return auth.reject(['Unkown Error']);
    }
});

sftpServer.on("error", function () {
    printError("SFTP Server", "An error happened");
    return;
});
sftpServer.on("end", async function () {
    print("SFTP Server", "User disconnected");
    try {
        await git.add('.');
        await git.commit("Automatic Backup");
        print("SFTP Server", "Data has been backed up");
    } catch (err) {
        printError("SFTP Server - Backup Versioning", err);
    }
    /*
    git.exec('add', {}, ['.'], (err, msg) => {
        if (err !== null) {
            printError("SFTP Server - Backup Versioning", err);
        } else {
            print("SFTP Server - Backup Versioning", msg);
        }
        git.exec('commit', {}, ['-m "Automatic Backup"'], (err, msg) => {
            if (err !== null) {
                printError("SFTP Server - Backup Versioning", err);
            } else {
                print("SFTP Server - Backup Versioning", msg);
            }
        });
    });
    */
    return;
});



process.on('uncaughtException', function (e) {
    printError("SFTP Server Crash", e);
    process.send('restart');
});

process.on('message', function (message) {
    /*
    switch (message) {
        case "listen":
            sftpServer.listen(sftp_settings.port);
            print("SFTP Server", `Started at port ${sftp_settings.port}`);
            break;
        default: break;
    }
    */
});

if (process.send === undefined) {
    sftpServer.listen(sftp_settings.port);
    print("SFTP Server", `Started at port ${sftp_settings.port}`);
} else {
    sftpServer.listen(sftp_settings.port);
    print("SFTP Server", `Started at port ${sftp_settings.port} (fork mode)`);
}

//module.exports = () => {
//}