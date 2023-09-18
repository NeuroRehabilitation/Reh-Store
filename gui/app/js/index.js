
const topbar_minimize = document.getElementById('topbar_minimize');
topbar_minimize.addEventListener('click', () => {
    window_manager.currentWindow.minimize();
});
const topbar_maximize = document.getElementById('topbar_maximize');
topbar_maximize.addEventListener('click', () => {
    window_manager.currentWindow.maximize();
});
const topbar_close = document.getElementById('topbar_close');
topbar_close.addEventListener('click', () => {
    window_manager.close("app");
});