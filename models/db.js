var mysql = require('mysql2');
const path = require('path');
const escapeStringRegexp = require('escape-string-regexp');

//Protection against ReDos Attack's (Denial of Service through RegEx)
var validator = require('validator');


const modules_dir = path.join(__dirname, '..', 'modules');
const models_dir = path.join(__dirname, '..', 'models');

const console_colors = require(path.join(modules_dir, 'console_color'));
const { print, printError } = require(path.join(modules_dir, 'custom_print'));
const config_manager = require(path.join(models_dir, 'config_manager'));


let query_cache = require('./query_cache');


/*
 * If the hashing algorithm is changed, be in attention that it can be vulnerable to timing attacks.
 * This implementation of bcrypt is not vulnerable for what it's author says
 */
const bcrypt = require('bcrypt');

const config = config_manager.get('db.json');
const bcryptSalt = 10;

/*
const MysqlCache = require('mysql-cache');
var pool = new MysqlCache({
    ...config,
    "caching": true,
    "TLL": 2,
    "hashing": "farmhash64",
    "verbose": true,
    "cacheProvider": "node-cache",
    "cacheProviderSetup": {
        "stdTTL": 2,
        "checkperiod": 2,
        "deleteOnExpire": true
    }
});
pool.connect(err => {
    if (err) {
        throw err // Catch any nasty errors!
    }
    print("MySQL", "Connected");
});
*/

var pool = mysql.createPool(config);



const database = {
    /**
     * Async execute SELECT Query
     * @param {*} query 
     * @param  {...any} args 
     * @returns Array with the rows
     */
    select: async (query, ...args) => {
        return new Promise((resolve, reject) => {
            //Get escaped query
            let escaped_query = mysql.format(query, args);

            let cached_result = query_cache.get(escaped_query);

            if (cached_result) {
                //print("Cached DB", escaped_query);
                resolve(cached_result);
                return;
            }

            //By using this way we are already scaping the data in order to avoid SQL Injection
            pool.query(query, args, function (error, results, fields) {


                if (error) {
                    printError("Database", error);
                    reject(error);
                    return;
                } else {
                    let pretendedData = [];
                    results.forEach(row => {
                        pretendedData.push(JSON.parse(JSON.stringify(row)));
                    })
                    resolve(pretendedData);

                    query_cache.set(escaped_query, pretendedData, 10);
                    //printError("Cached DB", escaped_query);
                    return;
                }
            });
        });
    },

    /**
     * Async execute INSERT Query
     * @param {*} query 
     * @param  {...any} args
     * @returns JSON with the INSERT Query status  ({ affectedRows: 1, changedRows: 0 })
     */
    insert: async (query, ...args) => {
        return new Promise((resolve, reject) => {
            //By using this way we are already scaping the data in order to avoid SQL Injection
            pool.query(query, args, function (error, results, fields) {
                if (error) {
                    printError("Database", error);
                    reject(error);
                    return;
                } else {
                    let receivedResults = JSON.parse(JSON.stringify(results));
                    resolve({
                        affectedRows: receivedResults.affectedRows,
                        changedRows: receivedResults.changedRows
                    });

                    //Get escaped query
                    let escaped_query = mysql.format(query, args);
                    query_cache.delCacheFromTableInSQL(escaped_query);
                    return;
                }
            });
        });
    },

    /**
     * Async execute UPDATE Query
     * @param {*} query 
     * @param  {...any} args
     * @returns JSON with the INSERT Query status ({ affectedRows: 1, changedRows: 0 })
     */
    update: async (query, ...args) => {
        return new Promise((resolve, reject) => {
            //By using this way we are already scaping the data in order to avoid SQL Injection
            pool.query(query, args, function (error, results, fields) {
                if (error) {
                    printError("Database", error);
                    reject(error);
                    return;
                } else {
                    let receivedResults = JSON.parse(JSON.stringify(results));
                    resolve({
                        affectedRows: receivedResults.affectedRows,
                        changedRows: receivedResults.changedRows
                    });

                    //Get escaped query
                    let escaped_query = mysql.format(query, args);
                    query_cache.delCacheFromTableInSQL(escaped_query);
                    return;
                }
            });
        });
    },

    /**
     * Async execute DELETE Query
     * @param {*} query 
     * @param  {...any} args
     * @returns JSON with the DELETE Query status  ({ affectedRows: 1, changedRows: 0 })
     */
    delete: async (query, ...args) => {
        return new Promise((resolve, reject) => {
            //By using this way we are already scaping the data in order to avoid SQL Injection
            pool.query(query, args, function (error, results, fields) {
                if (error) {
                    printError("Database", error);
                    reject(error);
                    return;
                } else {
                    let receivedResults = JSON.parse(JSON.stringify(results));
                    resolve({
                        affectedRows: receivedResults.affectedRows,
                        changedRows: receivedResults.changedRows
                    });

                    //Get escaped query
                    let escaped_query = mysql.format(query, args);
                    query_cache.delCacheFromTableInSQL(escaped_query);
                    return;
                }
            });
        });
    },

    isDataAll: {
        /**
         * Check if string is only numbers from 0 to 9
         * @param {String} data 
         */
        integers: (data = "") => {
            return validator.isNumeric(data + '', {
                no_symbols: true
            });
        },

        letters: (data = "") => {
            return validator.isAlpha(data + '', 'pt-PT');
        },

        lettersAndNumbers: (data = "") => {
            return validator.isAlphanumeric(data + '', 'pt-PT');
        },

        lettersAndMinus: (data = "") => {
            let test_value = (data + '').replaceAll("-", "");
            let test_result = validator.isAlpha(test_value, 'pt-PT');
            return test_result;
        },
        lettersAndUnderscore: (data = "") => {
            let test_value = (data + '').replaceAll("_", "");
            let test_result = validator.isAlpha(test_value, 'pt-PT');
            return test_result;
        },

        /**
         * Password must be between 8 and 30 char, contain letter and number only
         * @param {*} data 
         */
        password: (data = "") => {
            let test_result = validator.isStrongPassword((data + ''), {
                minLength: 8,
                minLowercase: 0,
                minUppercase: 0,
                minNumbers: 1,
                minSymbols: 0,
                returnScore: false,
                pointsPerUnique: 1,
                pointsPerRepeat: 0.5,
                pointsForContainingLower: 10,
                pointsForContainingUpper: 10,
                pointsForContainingNumber: 10,
                pointsForContainingSymbol: 10
            });
            if ((data + '').length > 30) test_result = false;
            return test_result;
        },

        email: (data = "") => {
            return validator.isEmail((data + ''), {
                allow_display_name: false,
                require_display_name: false,
                allow_utf8_local_part: true,
                require_tld: true,
                allow_ip_domain: false,
                domain_specific_validation: true,
                blacklisted_chars: ''
            });
        },

        boolean: (data = "") => {
            return validator.isBoolean(data + '');
        },

        positiveAndnegativeIntegers: (data = "") => {
            let test_value = (data + '').replaceAll("-", "");
            return validator.isNumeric(test_value, {
                no_symbols: true
            });
        },

        date: (data = "") => {
            return validator.isDate((data + ''));
        }

    },

    password: {
        hash: (password) => {
            return bcrypt.hashSync(password, bcryptSalt);
        },

        checkHash: (password, hash) => {
            return bcrypt.compareSync(password, hash);
        }
    },

    parameter_validation: {
        account_manager: {
            //Username is only letters and numbers
            username: (username = "") => {
                if (username !== "" && database.isDataAll.lettersAndNumbers(username)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Username must be only letters and numbers"
                    };
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
                if (birth_date !== "" && database.isDataAll.date(birth_date)) {
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
            }
        },
        software_manager: {
            filename: (filename = "", checkForEmpty = true) => {
                if (!checkForEmpty && filename === "") {
                    return {
                        result: true
                    };
                }

                let test_value = (filename + '').replaceAll("_", "").replaceAll(".", "");
                let test_result = database.isDataAll.lettersAndNumbers(test_value);
                if (test_result === true) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Invalid Filename"
                    };
                }
            },
            package_id: (package_id = "", checkForEmpty = true) => {
                if (!checkForEmpty && package_id === "") {
                    return {
                        result: true
                    };
                }
                //This Regex needs to be improved
                if (validator.matches((package_id + ''), /^[a-zA-Z0-9_]+[.][a-zA-Z0-9_]+[.][a-zA-Z0-9_]+[a-zA-Z0-9_]$/)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Package id must for example com.maker.app_name. Only allowed lowercase letters, numbers, dots and underscore"
                    };//Erro ortografico, corrigir. must for -> must be for example
                }
            },
            package_name: (name = "", checkForEmpty = true) => {
                if (!checkForEmpty && name === "") {
                    return {
                        result: true
                    };
                }

                let test_value = (name + '').replaceAll(" ", "").replaceAll("@", "").replaceAll("&", "");
                let test_result = database.isDataAll.lettersAndNumbers(test_value);

                if (test_result) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Package name must only contain numbers, letters, space characters and @"
                    };
                }
            },
            branch_name: (name = "", checkForEmpty = true) => {
                if (!checkForEmpty && name === "") {
                    return {
                        result: true
                    };
                }

                if (database.isDataAll.lettersAndNumbers((name + ''))) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Branch name must only contain numbers, letters and _"
                    };
                }
            },
            description: (description = "", checkForEmpty = true) => {
                if (!checkForEmpty && description === "") {
                    return {
                        result: true
                    };
                }

                let test_value = (description + '').replaceAll(".", "").replaceAll("-", "").replaceAll(",", "").replaceAll("!", "").replaceAll("@", "").replaceAll("(", "").replaceAll(")", "").replaceAll("?", "").replaceAll(" ", "");
                let test_result = database.isDataAll.lettersAndNumbers(test_value);
                if (test_result) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Package description must only contain numbers, letters, dots, comma, exclamation, @, (, ), interrogation and space characters"
                    };
                }
            },
            version_number: (version_number = "", checkForEmpty = true) => {
                if (!checkForEmpty && version_number === "") {
                    return {
                        result: true
                    };
                }
                if (database.isDataAll.integers(version_number + '')) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Major, minor and patch are only numbers"
                    };
                }
            },
            architecture: (architecture = "", checkForEmpty = true) => {
                if (!checkForEmpty && architecture === "") {
                    return {
                        result: true
                    };
                }

                if (database.isDataAll.lettersAndNumbers(architecture)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Architecture can only be numbers and letters"
                    };
                }
            },
            platform: (platform = "", checkForEmpty = true) => {
                if (!checkForEmpty && platform === "") {
                    return {
                        result: true
                    };
                }

                if (database.isDataAll.lettersAndNumbers(platform)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Platform can only be numbers and letters"
                    };
                }
            },
            os_version: (os_version = "", checkForEmpty = true) => {
                if (!checkForEmpty && os_version === "") {
                    return {
                        result: true
                    };
                }

                if (database.isDataAll.lettersAndNumbers(os_version)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "OS version can only be numbers and letters"
                    };
                }
            },
            platform_name: (platform_name = "", checkForEmpty = true) => {
                if (!checkForEmpty && platform_name === "") {
                    return {
                        result: true
                    };
                }

                let test_value = (platform_name + '').replaceAll(" ", "");
                let test_result = database.isDataAll.lettersAndNumbers(test_value);
                if (test_result) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Platform name can only be numbers, letters and spaces"
                    };
                }
            },
            software_tag: (tag_name = "", checkForEmpty = true) => {
                if (!checkForEmpty && tag_name === "") {
                    return {
                        result: true
                    };
                }

                if (database.isDataAll.lettersAndNumbers(tag_name)) {
                    return {
                        result: true
                    };
                } else {
                    return {
                        result: false,
                        reason: "Tag name can only be numbers and letters"
                    };
                }

            }
        }
    },

    escape_string: (text = "") => {
        if (text === "") return "";

        return escapeStringRegexp(text);
    }

};

/*
//Keep Alive connection. Needed because MySQL server closes connection after some
//time being inactive. This library cannot handle this, so it is needed to ping the database manualy
setInterval(() => {
    database.select("SELECT 1;");
}, 1000 * 60 * 60) //Each hour ping database, in order to maintain connection
*/

module.exports = database;