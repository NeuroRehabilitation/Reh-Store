/**
 * Window Manager Event Emitter for Front-End
 */

 const window_manager = {
    currentWindow: {
        minimize: () => {
            currentWindow.minimize();
        },
        maximize: () => {
            if (currentWindow.isMaximized()) {
                currentWindow.unmaximize();
                currentWindow.setResizable(true);
            } else {
                currentWindow.maximize();
                currentWindow.setResizable(true);
            }
        }
    },
    close: (windowName = "") => {
        ipcRenderer.send('window-manager-close-channel', windowName);
    }
}