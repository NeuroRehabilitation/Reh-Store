const fs = require('fs');
const path = require('path');
const console_colors = require(path.join(__dirname, '..', 'modules', 'console_color'));
const { print, printError } = require(path.join(__dirname, '..', 'modules', 'custom_print'));


const config_manager = {
    get: (filename) => {
        const file_path = path.join(__dirname, '..', 'configs', filename);
        if(!fs.existsSync(file_path)){
            return undefined;
        }

        const file_data = JSON.parse(fs.readFileSync(file_path, 'utf-8'));
        return file_data;
    }
};

module.exports = config_manager;