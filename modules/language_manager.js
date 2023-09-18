const fs = require('fs');
const path = require('path');
const { print, printError } = require('./custom_print');

const language_manager = {
    getNameFromCode: (code = "") => {
        switch (code) {
            case "en-US":
                return "English (United States)";
            default:
                return "";
        }
    },
    list: (first_element = "") => {
        let list = [
            {
                code: "en-US",
                name: "English (United States)"
            },
            {
                code: "pt-PT",
                name: "Português (Portugal)"
            }

        ];
        if (first_element === "") {
            return list;
        } else {
            let item_pos = undefined;
            for (let i = 0; i < list.length; i++) {
                if (list[i].code === first_element) {
                    item_pos = i;
                    break;
                }
            }
            let tmp = list.slice(item_pos, list.length);
            tmp = tmp.concat(list.slice(0, item_pos));

            return tmp;
        }
    },
    getAvailableLanguageCode: (language_code = "") => {
        for (let i = 0; i < language_manager.list().length; i++) {
            let language = language_manager.list()[i];
            if (language.code === language_code) {
                if (fs.existsSync(path.join(__dirname, 'languages', language.code + '.json'))) {
                    //print("Language Manager - getAvailableLanguageCode", "Got language pack '" + language.code + "'");
                    return language.code;
                }
            }
        }
        if (fs.existsSync(path.join(__dirname, 'languages', 'en-US.json'))) {
            //print("Language Manager - getAvailableLanguageCode", "Got language pack 'en-US'");
            return 'en-US';
        } else {
            throw new Error("Cannot find suitable language pack!");
        }

    },
    getLanguagePack: (language_code = "") => {
        for (let i = 0; i < language_manager.list().length; i++) {
            let language = language_manager.list()[i];
            if (language.code === language_code) {
                if (fs.existsSync(path.join(__dirname, 'languages', language.code + '.json'))) {
                    print("Language Manager", "Got language pack '" + language.code + "'");
                    return JSON.parse(fs.readFileSync(path.join(__dirname, 'languages', language.code + '.json'), 'utf-8'));
                }
            }
        }
        if (fs.existsSync(path.join(__dirname, 'languages', 'en-US.json'))) {
            print("Language Manager", "Got language pack 'en-US'");
            return JSON.parse(fs.readFileSync(path.join(__dirname, 'languages', 'en-US.json'), 'utf-8'));
        } else {
            throw new Error("Cannot find suitable language pack!");
        }

    }
}

module.exports = language_manager;