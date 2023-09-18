console.log("Jisti Reh@Store Mod");
/*
<div class="chat-message-group remote">
<div class="chatmessage-wrapper" tabindex="-1">
<div class="chatmessage ">
<div class="replywrapper">
<div class="messagecontent">
<div aria-hidden="true" class="display-name">
Zlynt2
</div>
<div class="usermessage"><span class="sr-only">Zlynt2 says:</span>Demo</div>
</div></div></div><div class="timestamp">18:52</div></div></div>
*/
const {
    setupScreenSharingRender
} = require("jitsi-meet-electron-utils");


const domain = 'meet.jit.si';
const options = {
    roomName: 'RehStore - sadnduiqw2839h',
    parentNode: document.querySelector('#root')
};
const api = new JitsiMeetExternalAPI(domain, options);

// api - The Jitsi Meet iframe api object.
setupScreenSharingRender(api);
