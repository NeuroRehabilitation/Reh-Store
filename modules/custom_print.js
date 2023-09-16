const console_colors = require('./console_color');

module.exports = {
    print: (module_name, message) => {
        console.log(`${console_colors.FgGreen}[${module_name}]${console_colors.Reset} `, message);
    },
    printWarning: (module_name, message) => {
        console.log(`${console_colors.FgYellow}[${module_name}]${console_colors.Reset} `, message);
    },
    printError: (module_name, message) => {
        console.log(`${console_colors.FgRed}[${module_name}]${console_colors.Reset} `, message);
    }
};