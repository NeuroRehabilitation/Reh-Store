const crypto = require('crypto');
const path = require('path');

const modules_dir = path.join(__dirname, '..', 'modules');
const models_dir = path.join(__dirname, '..', 'models');

const console_colors = require(path.join(modules_dir, 'console_color'));
const { print, printWarning, printError } = require(path.join(modules_dir, 'custom_print'));


let query_cache = {
    maxEntries: -1,
    cache_data: {},
    set: (sql = "", result = "", ttl = 1) => { //TTL in seconds
        if (
            query_cache.maxEntries >= 0 &&
            Object.keys(query_cache.cache_data).length > query_cache.maxEntries
        ) {
            //printError("DB Cache", "Value not set: Cache is full");
            return false;
        }

        //Get hashed query
        let sql_hash = crypto.createHash('sha256').update(sql).digest('hex');
        //Get Table
        let table = query_cache.toolbox.getTableFromQuery(sql);

        query_cache.cache_data[sql_hash] = {
            data: JSON.stringify(result),
            expireDate: +(new Date()) + ttl * 1000,
            table
        };

        setTimeout(() => {
            //print("DB Cache", "Deleted expired entry from cache");
            query_cache.del(sql);
        }, ttl * 1000);

        //print("DB Cache Saved", sql_hash);
        return true;
    },
    get: (sql = "") => {
        //Get hashed query
        let sql_hash = crypto.createHash('sha256').update(sql).digest('hex');

        if (query_cache.cache_data[sql_hash] === undefined) return undefined;

        return JSON.parse(query_cache.cache_data[sql_hash].data);
    },
    del: (sql = "") => {
        //Get hashed query
        let sql_hash = crypto.createHash('sha256').update(sql).digest('hex');

        delete query_cache.cache_data[sql_hash];
    },
    delCacheFromTableInSQL: (sql = "") => {
        //Get Table
        let table = query_cache.toolbox.getTableFromQuery(sql);

        let deleted = 0;

        Object.keys(query_cache.cache_data).forEach(elem => {
            if ((query_cache.cache_data[elem].table + '') === (table + '')) {
                delete query_cache.cache_data[elem];
                deleted++;
            }
        });
        //printWarning("DB Cache", "Deleted " + deleted + " entries");
    },

    toolbox: {
        getTableFromQuery: (sql = "") => {
            return sql.match(/(UPDATE|FROM|JOIN|from|join|INTO|into)\s+(\w+)/g).map(e => e.split(' ')[1]);
        }
    }
}

module.exports = query_cache;