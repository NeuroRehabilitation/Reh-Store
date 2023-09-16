var ipRangeCheck = require("ip-range-check");
const fs = require('fs');
const path = require('path');

const { print, printError } = require(path.join(__dirname, '..', 'modules', 'custom_print'));
const config_manager = require('../models/config_manager');

const black_list = config_manager.get('ip_blacklist.json');
const safe_list = config_manager.get('ip_safelist.json');


const logFolderPath = path.join(__dirname, '..', 'logs');
const logFilePath = path.join(logFolderPath, 'log.txt');

//Protect against (some) bots

const web_protector = {
    onlyAllowWhiteList: false,
    onConnection: (socket) => {
        try {
            let socket_ip = socket.remoteAddress.replace("::ffff:", "");
            let isInBlackList = ipRangeCheck(socket_ip, Object.keys(black_list));
            let isInWhiteList = ipRangeCheck(socket_ip, Object.keys(safe_list));

            if (isInBlackList) {
                socket.destroy();
                const error_date = new Date();
                const error_message = `[${error_date.valueOf()}][${socket_ip}] Ip is blacklisted`;
                try {
                    const ipGeoLocation = geoip.lookup(socket_ip);
                    printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDay()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${socket_ip}][${ipGeoLocation.country} - ${ipGeoLocation.city}] Ip is blacklisted`);
                } catch (err) {
                    printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDay()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${socket_ip}] Ip is blacklisted`);
                }
                fs.appendFileSync(logFilePath, `${error_message}\n`);
                return;
            }
            if (!isInWhiteList && web_protector.onlyAllowWhiteList) {
                socket.destroy();
                const error_date = new Date();
                const error_message = `[${error_date.valueOf()}][${socket_ip}] Ip is not on white list`;
                try {
                    const ipGeoLocation = geoip.lookup(socket_ip);
                    printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDay()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${socket_ip}][${ipGeoLocation.country} - ${ipGeoLocation.city}] Ip is not on white list`);
                } catch (err) {
                    printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDay()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${socket_ip}] Ip is not on white list`);
                }
                fs.appendFileSync(logFilePath, `${error_message}\n`);
                return;
            }
        } catch (err) {
            printError("Web Protector", "Error: " + err);
            try {
                socket.destroy();
            } catch (err2) {
                printError("Web Protector", "Error: " + err2);
            }
        }

    }
};

module.exports = web_protector;