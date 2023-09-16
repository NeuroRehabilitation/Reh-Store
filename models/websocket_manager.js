//Websocket Server
const WebSocket = require('ws');

//Websocket server
const websocket_manager = {
    channels: {},
    server: undefined,
    start: (web_server = undefined) => {
        if (web_server === undefined)
            throw new Error("Web server is not defined.");

        websocket_manager.server = new WebSocket.Server({ server: web_server });
        websocket_manager.server.on('connection', (ws, req) => {
            if (websocket_manager.channels.connection !== undefined) {
                websocket_manager.channels.connection(ws, req);
            }
        });
        websocket_manager.server.on('close', (ws, req) => {
            if (websocket_manager.channels.close !== undefined) {
                websocket_manager.channels.close(ws, req);
            }
        });
        websocket_manager.server.on('message', (message) => {
            
        })
    },
    on: (channel = "", callback = (message = "") => { }) => {
        switch (channel) {
            case "close":
                websocket_manager.channels[channel] = callback;
                break;
            case "connection":
                websocket_manager.channels[channel] = callback;
                break;
            default:
                websocket_manager.channels["message_" + channel] = callback;
                break;
        }
    }
}

module.exports = websocket_manager;