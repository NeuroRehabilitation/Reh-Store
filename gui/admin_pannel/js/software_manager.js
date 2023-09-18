/**
 * Software Manager Event Emitter for Front-End
 */

const software_manager = {
  delete: (app_path = "") => {
    if (app_path === "") return;
    ipcRenderer.send('software-manager-delete-channel', app_path);
  }

};