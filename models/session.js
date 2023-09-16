var jwt = require('jsonwebtoken');
const path = require('path');
const fs = require('fs-extra');

const console_colors = require(path.join(__dirname, '..', 'modules', 'console_color'));
const { print, printError } = require(path.join(__dirname, '..', 'modules', 'custom_print'));
const account_manager = require('./accounts');
const config_manager = require('./config_manager');

//Protection against ReDos Attack's (Denial of Service through RegEx)
var validator = require('validator');

const config = config_manager.get('session.json');

//Where all the software is stored
const session_storage = path.join(__dirname, '..', 'storage_system', 'session_storage');

fs.ensureDirSync(session_storage);

const session = {
    access_token: {
        regex_valid: (token = "") => {
            return validator.isJWT((token + ''));
        },
        create: (username = "") => {
            if (!account_manager.parameter_validation.username(username)) {
                return undefined;
            }

            const access_token = jwt.sign(
                { username: username },
                config.secret_key,
                { expiresIn: 1000 * 60 * 60 * 24 } //1 day
            );

            fs.writeFileSync(path.normalize(path.join(session_storage, access_token)), '');

            return access_token;
        },
        valid: (token = "") => {
            if (token === "") return false;

            let possibleTokenPath = path.normalize(path.join(session_storage, token + ''));

            if (!session.access_token.regex_valid(token)) {
                fs.removeSync(possibleTokenPath);
                return false;
            }

            try {
                const decoded = jwt.verify(token, config.secret_key);


                if (fs.existsSync(possibleTokenPath) && fs.statSync(possibleTokenPath).isFile()) {
                    return decoded.username;
                } else {
                    fs.removeSync(possibleTokenPath);
                    return false;
                }
            } catch (err) {
                printError("Session", err);
                return false;
            }
        },
        logout: (token = "") => {
            if (!session.access_token.regex_valid(token))
                return false;

            try {
                const decoded = jwt.verify(token, config.secret_key);

                let possibleTokenPath = path.normalize(path.join(session_storage, token));

                if (fs.existsSync(possibleTokenPath) && fs.statSync(possibleTokenPath).isFile()) {
                    fs.removeSync(possibleTokenPath);
                    return true;
                } else {
                    return true;
                }
            } catch (err) {
                printError("Session", err);
                return false;
            }
        }
    }
};

module.exports = session;