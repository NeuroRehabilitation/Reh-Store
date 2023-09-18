const https = require('https');
const node_url = require('url');
const { print, printError } = require('./custom_print');
const notification_manager = require('./notification_manager');
const file_manager = require('./file_manager');
const fs = require('fs-extra');
const path = require('path');
var crypto = require('crypto');

//Ensure necessary folders exist
fs.ensureDirSync(file_manager.directory_list.internet_cache_folder);

const internet_manager = {
    app_update_url: "https://[SERVER_URL]/app/update",
    default_domain: "https://[SERVER_URL]",
    data_backup_server: "[SERVER_URL]",
    debug: false,
    post: async (url = "", data = {}, process_json = true, cacheData = false) => {
        return internet_manager.request('POST', url, data, process_json, cacheData);
    },
    get: async (url = "", data = {}, process_json = true, cacheData = false) => {
        return internet_manager.request('GET', url, data, process_json, cacheData);
    },
    request: async (method = 'GET', url = "", data = {}, process_json = true, cacheData = false) => {
        const filepath = path.normalize(path.join(
            file_manager.directory_list.internet_cache_folder,
            crypto.createHash('sha256').update(
                Buffer.from(JSON.stringify({
                    url,
                    data,
                    method
                })).toString('base64')).digest('hex')
        ));

        return new Promise((resolve, reject) => {
            const stringified_data = JSON.stringify(data);
            const processed_url = node_url.parse(url, true);

            //Check if cached data exists
            if (cacheData) {
                try {
                    let cached_data = fs.readJsonSync(filepath, { throws: true });
                    if (
                        (cached_data.date + 3600000) >= (+new Date()) //Cache is only valid for 1 hour
                    ) {
                        resolve({
                            ...cached_data,
                            cached: true
                        });
                        return;
                    } else {
                        fs.removeSync(filepath);
                    }
                } catch (err_cache) { }
            }

            const options = {
                hostname: processed_url.hostname,
                port: processed_url.port,
                path: processed_url.pathname,
                method,
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': stringified_data.length
                }
            }

            const req = https.request(options, res => {
                let data_to_return = '';

                res.on('data', d => {
                    data_to_return += d;
                });

                res.on('end', function () {
                    try {
                        if (process_json) {
                            data_to_return = JSON.parse(data_to_return);
                        }

                        let response = {
                            status: res.statusCode,
                            url,
                            params: data,
                            data: data_to_return,
                            date: +(new Date())
                        }
                        if (cacheData) {
                            fs.ensureDirSync(file_manager.directory_list.internet_cache_folder);
                            fs.writeJsonSync(filepath, response);
                        }

                        resolve({
                            ...response,
                            cached: false
                        });
                        return;
                    } catch (err) {
                        printError("Internet Manager", "Error: " + err);
                        if (cacheData) {
                            try {
                                let cached_data = fs.readJsonSync(filepath, { throws: true });
                                resolve({
                                    ...cached_data,
                                    cached: true
                                });
                            } catch (err_cache) {
                                reject(err);
                            }
                        } else {
                            reject(err);
                        }
                        return;
                    }
                });
            })

            req.on('error', error => {
                switch (error.toString()) {
                    case "Error: connect ECONNREFUSED 89.109.64.174:443":
                        if (cacheData) {
                            try {
                                let cached_data = fs.readJsonSync(filepath, { throws: true });
                                resolve({
                                    ...cached_data,
                                    cached: true
                                });
                            } catch (err_cache) {
                                reject("Server refused connection");
                            }
                        } else {
                            reject("Server refused connection");
                        }
                        break;
                    case "Error: unable to verify the first certificate":
                        if (cacheData) {
                            try {
                                let cached_data = fs.readJsonSync(filepath, { throws: true });
                                resolve({
                                    ...cached_data,
                                    cached: true
                                });
                            } catch (err_cache) {
                                reject("No secure connection");
                            }
                        } else {
                            reject("No secure connection");
                        }
                        break;
                    default:
                        //printError("Internet Manager", `'${url}' ` + error);
                        if (cacheData) {
                            try {
                                let cached_data = fs.readJsonSync(filepath, { throws: true });
                                resolve({
                                    ...cached_data,
                                    cached: true
                                });
                            } catch (err_cache) {
                                //printError("Internet Manager", `'${url}' Invalid cache entry`);
                                reject("No internet");
                            }
                        } else {
                            reject("No internet");
                        }
                        break;
                }
                return;
            });

            req.write(stringified_data);
            req.end();
        });
    },
    postFileDownload: async (url = "", data = "", filePath = "", onProgress = (percentage) => { }) => {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            const stringified_data = JSON.stringify(data);
            const processed_url = node_url.parse(url, true);
            const options = {
                hostname: processed_url.hostname,
                port: processed_url.port,
                path: processed_url.pathname,
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': stringified_data.length
                }
            }

            const req = https.request(options, res => {
                const file_size = parseInt(res.headers['content-length'], 10);
                let current_downloaded_file = 0;

                res.pipe(file);

                res.on('data', (chunk) => {
                    current_downloaded_file += chunk.length;
                    onProgress((100.0 * current_downloaded_file / file_size).toFixed(2));
                })

                res.on('end', function () {
                    if (internet_manager.debug) {
                        print("Internet Manager", `Received ${url}`);
                    }
                    if (res.headers.error === undefined) {
                        resolve(true);
                    } else {
                        reject(res.headers.error);
                    }
                    return;
                });
            })

            req.on('error', error => {
                printError("Internet Manager", error)
                //reject("No internet");
                return;
            });

            if (internet_manager.debug) {
                print("Internet Manager", `Requesting ${url}`);
            }
            req.write(stringified_data);
            req.end();

        });
    },
    getFileDownload: async (url = "", data = "", filePath = "") => {
        return new Promise((resolve, reject) => {
            const file = fs.createWriteStream(filePath);
            const stringified_data = JSON.stringify(data);
            const processed_url = node_url.parse(url, true);
            const options = {
                hostname: processed_url.hostname,
                port: processed_url.port,
                path: processed_url.pathname,
                method: 'GET',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': stringified_data.length
                }
            }

            const req = https.request(options, res => {

                res.pipe(file);

                res.on('end', function () {
                    if (internet_manager.debug) {
                        print("Internet Manager", `Received ${url}`);
                    }
                    resolve(true);
                    return;
                });
            })

            req.on('error', error => {
                printError("Internet Manager", error)
                //reject("No internet");
                return;
            });

            if (internet_manager.debug) {
                print("Internet Manager", `Requesting ${url}`);
            }
            req.write(stringified_data);
            req.end();

        });
    },
    //Delete all cache entries that have expired
    deleteAllExpiredCacheEntries: async () => {
        print("Internet Manager", "Deleting expired cache entries...");
        fs.readdir(file_manager.directory_list.internet_cache_folder, (err, files) => {
            files.forEach(file => {
                try {
                    let filePath = path.join(
                        file_manager.directory_list.internet_cache_folder,
                        file
                    );
                    let cached_data = fs.readJsonSync(filePath, { throws: true });
                    if (
                        (cached_data.date + 3600000) < (+new Date()) //Cache is only valid for 1 hour
                    ) {
                        fs.remove(filePath);
                    }
                } catch (err) { }
            });
        });
    },
    //Delete all cache entries
    deleteAllCacheEntries: async () => {
        print("Internet Manager", "Deleting all cache entries...");
        fs.emptyDir(file_manager.directory_list.internet_cache_folder);
    }
}
module.exports = internet_manager;