//Get and Set Cookie found at https://stackoverflow.com/questions/14573223/set-cookie-and-get-cookie-with-javascript
function setCookie(name, value, days) {
    var expires = "";
    if (days) {
        var date = new Date();
        date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
        expires = "; expires=" + date.toUTCString();
    }
    document.cookie = name + "=" + (value || "") + expires + "; path=/";
}
function getCookie(name) {
    var nameEQ = name + "=";
    var ca = document.cookie.split(';');
    for (var i = 0; i < ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) == 0) return c.substring(nameEQ.length, c.length);
    }
    return null;
}

const enableSupportChat = () => {
    let support_chat_iframe = document.getElementById('support_chat_iframe');
    if (
        support_chat_iframe !== undefined &&
        support_chat_iframe !== null
    ) {
        support_chat_iframe.src = support_chat_iframe.getAttribute('data-src');
        support_chat_iframe.style.display = 'block';
    } else {
        console.log("Chat not found.");
    }
}

window.addEventListener('load', function () {
    switch (window.location.pathname) {
        case "/terms_and_conditions":
        case "/privacy_policy":
            document.getElementById('cookiesMainDiv').style.display = "none";
            break;
        default:
            let isAccepted = getCookie('cookies_policy_accept');
            if (isAccepted === true || isAccepted === "true") {
                document.getElementById('cookiesMainDiv').style.display = "none";
                enableSupportChat();
            } else {
                document.getElementById('cookiesMainDiv').style.display = "block";
            }
            document.getElementById('cookies_agree_button').addEventListener('click', () => {
                //Set cookie for only 30 days. After that, user has to agree again
                setCookie('cookies_policy_accept', true, 30);
                document.getElementById('cookiesMainDiv').style.display = "none";
                enableSupportChat();
            })

            //
            break;
    }
});