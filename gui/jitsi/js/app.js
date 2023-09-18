console.log("Jitsi Reh@Store integration");

//Remote control disabled due to security issues related to Jitsi.
/*
const {
    //RemoteControl,
    setupScreenSharingRender
} = require("@jitsi/electron-sdk");
*/
let username = '' + (+new Date());

event_emmiter.create('account-manager-getUsername-channel', (name) => { username = name; });
event_emmiter.send('account-manager-getUsername-channel', '');
const startMeeting = (roomID = "") => {

    const domain = 'meet.jit.si';
    const options = {
        roomName: 'Rehstore Meeting at ' + roomID,
        parentNode: document.querySelector('#root'),
        userInfo: {
            displayName: username
        }
    };
    const api = new JitsiMeetExternalAPI(domain, options);

    // api - The Jitsi Meet iframe api object.
    //setupScreenSharingRender(api); //TODO: Fix bug and then uncoment this
    //const alwaysOnTop = setupAlwaysOnTopRender(api);

    //alwaysOnTop.on('will-close', handleAlwaysOnTopClose);
    //RemoteControl(api);
}

document.getElementById('meetingIDTitle').innerHTML = languagePack.meeting_id;

document.getElementById('startMeeting').addEventListener('click', () => {
    let meetingID = document.getElementById('meetingID').value;
    document.getElementById('root').innerHTML = '';
    startMeeting(meetingID);
})

//startMeeting(prompt("ID"));
