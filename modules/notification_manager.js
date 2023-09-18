const { app, Notification } = require('electron');
const path = require('path');

const notification_manager = {
    show: (title = "Reh@Store", message = "") => {
        (new Notification({
            title: (title === '' ? 'Reh@Store' : title),
            body: message,
            icon: path.join(app.getAppPath(), 'icon.ico')
        })).show();
    }
}

module.exports = notification_manager;