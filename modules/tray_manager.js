const { app, Tray, Menu } = require('electron');
const path = require('path');

const tray_manager = {
    tray_menu: undefined,
    start: () => {
        if (tray_manager.tray_menu === undefined) {
            tray_manager.tray_menu = new Tray(path.join(app.getAppPath(), 'icon.png'));
            tray_manager.tray_menu.setToolTip('Reh@Store');
        }
    },
    setMenu: (menu_template = []) => {
        tray_manager.tray_menu.setContextMenu(Menu.buildFromTemplate(menu_template));
    }
}

module.exports = tray_manager;