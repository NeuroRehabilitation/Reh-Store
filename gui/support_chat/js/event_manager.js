const event_emmiter = {
    create: (event_name = "", __callback = (arg) => { }) => {
        ipcRenderer.on(event_name, (event, arg) => {
            __callback(arg);
        });
    },
    delete: (event_name = "") => {
        ipcRenderer.removeAllListeners(event_name);
    },
    send: (event_name = "", arg = "") => {
        ipcRenderer.send(event_name, arg);
    }
};