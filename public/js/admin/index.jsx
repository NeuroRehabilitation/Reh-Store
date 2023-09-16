
const { useState, useEffect } = React;

let webSocketClient;

const webSocketTools = {
    events: {

    },
    on: (event, callback = (message = "") => { }) => {
        webSocketTools.events[event] = callback;
    },
    connect: () => {
        webSocketClient = new WebSocket("wss://" + window.location.host + "/admin");
        webSocketClient.addEventListener('message', (event) => {
            try {
                const data = JSON.parse(event.data);
                if (webSocketTools.events[data.channel] === undefined) {
                    console.log("WebSocket Error: Channel '" + data.channel + "' does not exist.");
                } else {
                    webSocketTools.events[data.channel](data.data);
                }
            } catch (err) {
                console.log("WebSocket Error: " + err);
            }
        });
        webSocketClient.addEventListener('open', (event) => {
            if (webSocketTools.events.open !== undefined) {
                webSocketTools.events.open(event);
            }
        });
        webSocketClient.addEventListener('close', (event) => {
            if (webSocketTools.events.close !== undefined) {
                webSocketTools.events.close(event);
            }
        });
    },
    reconnect: () => {
        if (!webSocketTools.isConnected()) {
            webSocketTools.connect();
        }
    },
    isConnected: () => {
        return !(webSocketClient !== undefined && webSocketClient.readyState !== 1 && webSocketClient.readyState !== 0);
    },
    send: (channel = "", data = "") => {
        try {
            if (webSocketTools.isConnected()) {
                webSocketClient.send(JSON.stringify({
                    channel: channel,
                    data: data
                }));
                return true;
            } else {
                return false;
            }
        } catch (err) {
            return false;
        }
    }
}
webSocketTools.connect();

const getCurrentTime = () => {
    const time = new Date();
    return time.getHours() + ':' + time.getMinutes() + ':' + time.getSeconds();
}

const NotificationManager = (props) => {


    return (
        <div style={{ "position": "absolute", "top": "5px", "right": "5px", "zIndex": "2" }}>
            {
                Object.keys(props.toasts).map(toast_id => {
                    let toast = props.toasts[toast_id];
                    return (
                        <div className="toast show" role="alert" aria-live="assertive" aria-atomic="true" id={toast_id} key={toast_id}>
                            <div className="toast-header">
                                <img src="/img/RehLogo.png" className="rounded mr-2" alt="" width="25px" height="25px" /> <strong className="mr-auto text-center" style={{ "marginRight": "2px" }}>{toast.title.substring(0, 20)}</strong>
                                <small className="text-muted">{toast.date}</small>
                                <button type="button" style={{ fontSize: "20px", margin: "5px", padding: "0px 6px 0px 6px" }} className="btn btn-primary ml-2 mb-1 close" data-dismiss="toast" aria-label="Close" onClick={
                                    () => {
                                        if ($("#" + toast_id).hasClass("show")) {
                                            $("#" + toast_id).removeClass("show");
                                        }
                                        $("#" + toast_id).toast('hide');
                                        props.removeToast(toast_id);
                                    }
                                }>
                                    <span aria-hidden="true">&times;</span>
                                </button>
                            </div>
                            <div className="toast-body" style={{ maxWidth: 200 }}>{toast.message}</div>
                        </div>
                    )
                })
            }
        </div>
    )
}

const LoginForm = (props) => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [userFeedback, setUserFeedback] = useState('');

    const handleUsername = (event) => {
        setUsername(event.target.value);
    };
    const handlePassword = (event) => {
        setPassword(event.target.value);
    };

    const handleSubmit = (event) => {
        event.preventDefault();
        setUserFeedback('Logging in');
        $.post('/api/account/login', { username: username, password: password, forAdmin: true }, function (data) {
            switch (data.result) {
                case true:
                    setUserFeedback("Logged in! Redirecting...");
                    props.setUserToken(data.token);
                    props.setUsername(username);
                    props.setShowPannel(true);
                    props.setShowLoginForm(false);
                    props.addToast("Login", "Welcome " + username);
                    break;
                case false:
                    switch (data.reason) {
                        case "Permission denied":
                            setUserFeedback('Login failed: Permission denied');
                            break;
                        case 'Account not authorized. Please verify your account or contact the support.':
                            setUserFeedback('Account not authorized. Please verify your account or contact the support.');
                            break;
                        case 'Invalid credentials':
                            setUserFeedback('Invalid credentials');
                            break;
                        case "Password must be minimum 8 characters and max 30 characters, have at least one letter and one number":
                            setUserFeedback("Password must be minimum 8 characters and max 30 characters, have at least one letter and one number");
                            break;
                        case "Username must be only letters and numbers":
                            setUserFeedback("Username must be only letters and numbers");
                            break;
                        default:
                            setUserFeedback('Login failed due to unkown error');
                            break;
                    }
                    break;
                default:
                    setUserFeedback('Login failed due to unkown error');
                    break;
            }
        }, "json");
    };

    return (
        <div className="container">
            <div className="row justify-content-center login_container">
                <div className="col-md-9 col-lg-12 col-xl-10">
                    <div className="card shadow-lg o-hidden border-0 my-5">
                        <div className="card-body p-0">
                            <div className="p-5">
                                <div className="text-center">
                                    <h4 className="text-dark mb-4">Reh@Store Admin Pannel</h4>
                                </div>
                                <form className="user text-center" onSubmit={handleSubmit}>
                                    <div className="mb-3">
                                        <input className="form-control form-control-user" type="text"
                                            placeholder="Enter Username..." onChange={handleUsername} /></div>
                                    <div className="mb-3">
                                        <input className="form-control form-control-user" type="password"
                                            placeholder="Password" onChange={handlePassword} />
                                    </div>
                                    <small>{userFeedback}</small>
                                    <p></p>
                                    <button className="btn btn-primary d-block btn-user w-100" type="submit">Login</button>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

const ConfirmModal = (props) => {
    return (
        <div className="modal fade" id="confirmModal" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="confirmModal" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="staticBackdropLabel">{props.title}</h5>
                    </div>
                    <div className="modal-body">{props.body}</div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={props.closeHandler}>{props.closeTitle}</button>
                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={props.confirmHandler}>{props.confirmTitle}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const PannelContainer = (props) => {
    const [serverUsage, setServerUsage] = useState({
        num_total_users: '-1',
        ram: "-1%",
        disk: {
            free: '-1 MB',
            size: '-1 MB',
            usedPercentage: "-1%"
        }
    });
    const [userList, setUserList] = useState([]);
    const [userListViewSize, setUserListViewSize] = useState(10);
    const [currentView, setCurrentView] = useState(1);
    const [currentViewArrowsClasses, setCurrentViewArrowsClasses] = useState({
        previousArrow: "page-item disabled",
        nextArrow: "page-item"
    });
    const [userListSearchBar, setUserListSearchBar] = useState('');

    useEffect(() => {
        webSocketTools.on('server_statistic', (data) => {
            if (data.result) {
                setServerUsage(prevState => {
                    return {
                        ...prevState,
                        ram: data.data.ram,
                        num_total_users: data.data.num_total_users,
                        disk: data.data.disk
                    }
                })
            } else {
                console.log("Could not get server statistics usage due to: " + data.reason);
                setServerUsage(prevState => {
                    return {
                        ...prevState,
                        ram: '-1',
                        num_total_users: '-1',
                        disk: {
                            free: '-1 MB',
                            size: '-1 MB',
                            usedPercentage: "-1%"
                        }
                    }
                })
            }
        });
        webSocketTools.on('account_getUserList', (data) => {
            if (data.result) {
                setUserList(data.data);
            } else {
                console.log("Could not get server statistics usage due to: " + data.reason);
                setServerUsage([]);
            }
        });
        const interval = setInterval(() => {
            webSocketTools.send("server_statistic", JSON.stringify({
                token: props.userToken
            }));
            if (props.currentContainer === "user_management") {
                webSocketTools.send("account_getUserList", JSON.stringify({
                    token: props.userToken,
                    index: (currentView * userListViewSize) - userListViewSize,
                    length: (currentView * userListViewSize)
                }));
            } else {
                setUserList([]);
            }
        }, 1000);
        return () => {
            clearInterval(interval);
        };

    });

    const userListSizeChangeHandler = (event) => {
        const max_sub_table = Math.ceil(serverUsage.num_total_users / event.target.value);
        if (currentView > max_sub_table) setCurrentView(max_sub_table);
        if (currentView < 1) setCurrentView(1);
        setUserListViewSize(event.target.value);
    }

    const userListSearchBarHandler = (event) => {
        console.log(event.target.value);
        setUserListSearchBar(event.target.value);
    }

    const previousCurrentViewHandler = () => {
        if (currentView > 1)
            setCurrentView(prevState => { return prevState - 1; });
    }
    const nextCurrentViewHandler = () => {
        const maxViews = Math.ceil(serverUsage.num_total_users / userListViewSize);
        if (currentView < maxViews)
            setCurrentView(prevState => { return prevState + 1; });
    }

    switch (props.currentContainer) {
        case "dashboard":
            return (
                <div className="container-fluid realbody">
                    <div className="d-sm-flex justify-content-between align-items-center mb-4">
                        <h3 className="text-dark mb-0">Dashboard</h3>
                    </div>
                    <div className="row">
                        <div className="col-md-6 col-xl-3 mb-4">
                            <div className="card shadow border-start-primary py-2">
                                <div className="card-body">
                                    <div className="row align-items-center no-gutters">
                                        <div className="col me-2">
                                            <div className="text-uppercase text-primary fw-bold text-xs mb-1"><span>Number of users</span></div>
                                            <div className="text-dark fw-bold h5 mb-0"><span>{serverUsage.num_total_users}</span></div>
                                        </div>
                                        <div className="col-auto"><i className="fas fa-calendar fa-2x text-gray-300"></i></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xl-3 mb-4">
                            <div className="card shadow border-start-info py-2">
                                <div className="card-body">
                                    <div className="row align-items-center no-gutters">
                                        <div className="col me-2">
                                            <div className="text-uppercase text-info fw-bold text-xs mb-1"><span>RAM Usage</span></div>
                                            <div className="row g-0 align-items-center">
                                                <div className="col-auto">
                                                    <div className="text-dark fw-bold h5 mb-0 me-3"><span>{serverUsage.ram}</span></div>
                                                </div>
                                                <div className="col">
                                                    <div className="progress progress-sm">
                                                        <div className="progress-bar bg-info" aria-valuenow={serverUsage.ram} aria-valuemin="0" aria-valuemax="100" style={{ "width": "50%" }}><span className="visually-hidden">{serverUsage.ram}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-auto"><i className="fas fa-memory fa-2x text-gray-300"></i></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        <div className="col-md-6 col-xl-3 mb-4">
                            <div className="card shadow border-start-info py-2">
                                <div className="card-body">
                                    <div className="row align-items-center no-gutters">
                                        <div className="col me-2">
                                            <div className="text-uppercase text-info fw-bold text-xs mb-1"><span>HDD Usage</span></div>
                                            <div className="row g-0 align-items-center">
                                                <div className="col-auto">
                                                    <div className="text-dark fw-bold h5 mb-0 me-3"><span>{serverUsage.disk.usedPercentage}</span></div>
                                                </div>
                                                <div className="col">
                                                    <div className="progress progress-sm">
                                                        <div className="progress-bar bg-info" aria-valuenow={serverUsage.disk.usedPercentage} aria-valuemin="0" aria-valuemax="100" style={{ "width": "50%" }}><span className="visually-hidden">{serverUsage.disk.usedPercentage}</span></div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="col-auto"><i className="fas fa-hdd fa-2x text-gray-300"></i></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        {/*
                        <div className="col-md-6 col-xl-3 mb-4">
                            <div className="card shadow border-start-warning py-2">
                                <div className="card-body">
                                    <div className="row align-items-center no-gutters">
                                        <div className="col me-2">
                                            <div className="text-uppercase text-warning fw-bold text-xs mb-1"><span>Open Support Tickets</span></div>
                                            <div className="text-dark fw-bold h5 mb-0"><span>Not available</span></div>
                                        </div>
                                        <div className="col-auto"><i className="fas fa-comments fa-2x text-gray-300"></i></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        */}
                    </div>
                </div>
            )
        case "user_management":
            return (
                <div className="container-fluid realbody">
                    <div className="d-sm-flex justify-content-between align-items-center mb-4">
                        <h3 className="text-dark mb-0">User Management</h3>
                    </div>
                    <div className="card shadow">
                        <div className="card-header py-3">
                            <p className="text-primary m-0 fw-bold">
                                <span style={{ "marginRight": "5px" }}>User list</span>
                                <button
                                    type="button"
                                    className="btn btn-sm btn-primary"
                                    onClick={() => {
                                        window.open('/api/account/register', '_blank').focus();
                                    }}
                                >Add a new user</button>
                            </p>
                        </div>
                        <div className="card-body">
                            <div className="row">
                                <div className="col-md-6 text-nowrap">
                                    <div id="dataTable_length" className="dataTables_length" aria-controls="dataTable">
                                        <label className="form-label">Show&nbsp;
                                            <select className="d-inline-block form-select form-select-sm" onChange={userListSizeChangeHandler}
                                                defaultValue={{ label: '10', value: '10' }}>
                                                <option value="10">10</option>
                                                <option value="25">25</option>
                                                <option value="50">50</option>
                                                <option value="100">100</option>
                                                <option value="1000">1000</option>
                                            </select>&nbsp;
                                        </label>
                                    </div>
                                </div>
                                <div className="col-md-6">
                                    <div className="text-md-end dataTables_filter" id="dataTable_filter">
                                        <label className="form-label">
                                            <input type="search"
                                                className="form-control form-control-sm"
                                                aria-controls="dataTable"
                                                placeholder="Search"
                                                defaultValue={userListSearchBar}
                                                onChange={userListSearchBarHandler}
                                            />
                                        </label>
                                    </div>
                                </div>
                            </div>
                            <div className="table-responsive table mt-2" id="dataTable" role="grid" aria-describedby="dataTable_info">
                                <table className="table my-0" id="dataTable">
                                    <thead>
                                        <tr>
                                            <th>Username</th>
                                            <th>Email</th>
                                            <th>Name</th>
                                            <th>Birth Date</th>
                                            <th>Language</th>
                                            <th>User groups</th>
                                            <th>Email Verified</th>
                                            <th>Action</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {
                                            userList.map(userFromList => {
                                                if (
                                                    userFromList.username.includes(userListSearchBar) ||
                                                    userFromList.email.includes(userListSearchBar) ||
                                                    userFromList.first_name.includes(userListSearchBar) ||
                                                    userFromList.last_name.includes(userListSearchBar) ||
                                                    userFromList.birth_date.includes(userListSearchBar) ||
                                                    userFromList.language.includes(userListSearchBar)
                                                ) {
                                                    return (
                                                        <tr key={userFromList.username}>
                                                            <td>{userFromList.username}</td>
                                                            <td>{userFromList.email}</td>
                                                            <td>{userFromList.first_name} {userFromList.last_name}</td>
                                                            <td>{userFromList.birth_date}</td>
                                                            <td>{userFromList.language}</td>
                                                            <td>{
                                                                userFromList.user_groups.map(groups => {
                                                                    return (
                                                                        <span className="badge bg-secondary badge-counter" key={userFromList.username + '_group_' + groups}>
                                                                            {groups[0].toUpperCase() + groups.slice(1)}
                                                                        </span>
                                                                    )
                                                                })
                                                            }</td>
                                                            {userFromList.email_verified === 1 ? (<td>Yes</td>) : (<td>No</td>)}

                                                            <td style={{ "textAlign": "center" }}>
                                                                <a href="#"
                                                                    data-bs-toggle="modal" data-bs-target="#confirmModal"
                                                                    onClick={() => {
                                                                        props.setConfirmModal(prevState => {
                                                                            return {
                                                                                ...prevState,
                                                                                title: `Edit '${userFromList.username}' account details`,
                                                                                body: (
                                                                                    <form className="row g-3 needs-validation" noValidate id="admin_edit_user_modal_form"
                                                                                        onSubmit={
                                                                                            (event) => {
                                                                                                event.preventDefault();
                                                                                            }
                                                                                        }>
                                                                                        <div className="form-floating col-md-4 has-validation">
                                                                                            <input type="text" className="form-control" id="inputUsername"
                                                                                                name="new_username"
                                                                                                aria-describedby="inputUsernameHelp" placeholder="Username" required defaultValue={userFromList.username} />
                                                                                            <label htmlFor="inputUsername">Username</label>
                                                                                            <div className="invalid-feedback">
                                                                                                Please choose a username.
                                                                                            </div>
                                                                                            <small id="inputUsernameHelp" className="form-text text-muted">
                                                                                                Only letters and numbers are allowed in this field.
                                                                                            </small>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-4 has-validation">
                                                                                            <input type="text" className="form-control" id="inputFirstName"
                                                                                                name="first_name"
                                                                                                aria-describedby="inputFirstNameHelp" placeholder="First Name" required defaultValue={userFromList.first_name} />
                                                                                            <label htmlFor="inputFirstName">First Name</label>
                                                                                            <div className="invalid-feedback">
                                                                                                This field cannot be blank
                                                                                            </div>
                                                                                            <small id="inputFirstNameHelp" className="form-text text-muted">
                                                                                                Only letters are allowed in this field.
                                                                                            </small>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-4 has-validation">
                                                                                            <input type="text" className="form-control" id="inputLastName"
                                                                                                name="last_name"
                                                                                                aria-describedby="inputLastNameHelp" placeholder="Last Name" required defaultValue={userFromList.last_name} />
                                                                                            <label htmlFor="inputLastName">Last Name</label>
                                                                                            <div className="invalid-feedback">
                                                                                                This field cannot be blank
                                                                                            </div>
                                                                                            <small id="inputLastNameHelp" className="form-text text-muted">
                                                                                                Only letters are allowed in this field.
                                                                                            </small>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-8 has-validation">
                                                                                            <input type="email" className="form-control" id="inputEmail"
                                                                                                name="email"
                                                                                                aria-describedby="inputEmailHelp" placeholder="Email" required defaultValue={userFromList.email} />
                                                                                            <label htmlFor="inputEmail">Email</label>
                                                                                            <div className="invalid-feedback">
                                                                                                Please type a valid email.
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-8 has-validation">
                                                                                            <input type="date" className="form-control" id="inputBirthDate"
                                                                                                name="birth_date"
                                                                                                aria-describedby="inputBirthDateHelp" placeholder="Birth Date" required defaultValue={userFromList.birth_date} />
                                                                                            <label htmlFor="inputBirthDate">Birth Date</label>
                                                                                            <div className="invalid-feedback">
                                                                                                Please type a valid Birth Date.
                                                                                            </div>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-10 has-validation">
                                                                                            <select className="form-select" aria-label="multiple select example"
                                                                                                name="language"
                                                                                                id="inputLanguage" defaultValue={userFromList.language}>
                                                                                                <option value="en-US">English (United States)</option>
                                                                                                <option value="pt-PT">Portuguese (Portugal)</option>
                                                                                            </select>
                                                                                            <label htmlFor="inputBirthDate">Language</label>
                                                                                        </div>

                                                                                        <div className="form-floating col-md-4 has-validation">
                                                                                            <p>User Permissions</p>
                                                                                            <div className="form-check">
                                                                                                <input className="form-check-input" type="checkbox" value="client"
                                                                                                    defaultChecked={userFromList.user_groups.includes("client")}
                                                                                                    name="user_groups"
                                                                                                    id="userGroupClient" />
                                                                                                <label className="form-check-label" htmlFor="userGroupClient">
                                                                                                    Client
                                                                                                </label>
                                                                                            </div>
                                                                                            <div className="form-check">
                                                                                                <input className="form-check-input" type="checkbox" value="publisher"
                                                                                                    defaultChecked={userFromList.user_groups.includes("publisher")}
                                                                                                    name="user_groups"
                                                                                                    id="userGroupPublisher" />
                                                                                                <label className="form-check-label" htmlFor="userGroupPublisher">
                                                                                                    Publisher
                                                                                                </label>
                                                                                            </div>
                                                                                            <div className="form-check">
                                                                                                <input className="form-check-input" type="checkbox" value="admin"
                                                                                                    defaultChecked={userFromList.user_groups.includes("admin")}
                                                                                                    name="user_groups"
                                                                                                    id="userGroupAdmin" />
                                                                                                <label className="form-check-label" htmlFor="userGroupAdmin">
                                                                                                    Admin
                                                                                                </label>
                                                                                            </div>
                                                                                        </div>


                                                                                        <div className="col-6"></div>
                                                                                    </form>
                                                                                ),
                                                                                confirmTitle: 'Save Changes',
                                                                                confirmHandler: () => {
                                                                                    const the_form = $("#admin_edit_user_modal_form");
                                                                                    const handleTheForm = (event) => {
                                                                                        event.preventDefault();
                                                                                        const the_form_data = the_form.serializeArray();
                                                                                        let json_form_data = {};
                                                                                        json_form_data.username = userFromList.username;
                                                                                        json_form_data.token = props.userToken;
                                                                                        the_form_data.forEach(element => {
                                                                                            if (userFromList[element.name] !== element.value) {
                                                                                                switch (element.name) {
                                                                                                    case "user_groups":
                                                                                                        if (json_form_data.user_groups === undefined)
                                                                                                            json_form_data.user_groups = [];
                                                                                                        json_form_data.user_groups.push(element.value);
                                                                                                        break;
                                                                                                    case "birth_date":
                                                                                                        if (element.value !== "") {
                                                                                                            json_form_data[element.name] = +new Date(element.value);
                                                                                                        }
                                                                                                        break;
                                                                                                    case "new_username":
                                                                                                        if (element.value !== userFromList.username) {
                                                                                                            json_form_data[element.name] = element.value;
                                                                                                        }
                                                                                                    default:
                                                                                                        json_form_data[element.name] = element.value;
                                                                                                        break;
                                                                                                }
                                                                                            }
                                                                                        });
                                                                                        $.post('/admin/edit_user', json_form_data, function (data) {
                                                                                            switch (data.result) {
                                                                                                case true:
                                                                                                    props.addToast("User Management", `The user ${userFromList.username} has been edited.`);
                                                                                                    break;
                                                                                                case false:
                                                                                                    props.addToast("User Management", `The user ${userFromList.username} has not been edited.`);
                                                                                                    break;
                                                                                                default:
                                                                                                    break;
                                                                                            }
                                                                                            props.setConfirmModal({
                                                                                                title: "",
                                                                                                body: "",
                                                                                                closeTitle: "",
                                                                                                closeHandler: () => { },
                                                                                                confirmTitle: "",
                                                                                                confirmHandler: () => { }
                                                                                            })
                                                                                        }, "json");

                                                                                    }
                                                                                    the_form.on('submit', handleTheForm);
                                                                                    the_form.submit();
                                                                                },
                                                                                closeTitle: 'Cancel',
                                                                                closeHandler: () => {
                                                                                    props.setConfirmModal({
                                                                                        title: "",
                                                                                        body: "",
                                                                                        closeTitle: "",
                                                                                        closeHandler: () => { },
                                                                                        confirmTitle: "",
                                                                                        confirmHandler: () => { }
                                                                                    })
                                                                                }
                                                                            }
                                                                        });
                                                                    }}>Edit</a>
                                                                <br />
                                                                <a href="#"
                                                                    data-bs-toggle="modal" data-bs-target="#confirmModal"
                                                                    onClick={() => {
                                                                        props.setConfirmModal(prevState => {
                                                                            return {
                                                                                ...prevState,
                                                                                title: 'Delete user',
                                                                                body: `Are you sure you want to remove the user '${userFromList.username}' ?`,
                                                                                confirmTitle: 'Yes',
                                                                                confirmHandler: () => {
                                                                                    $.post('/admin/remove_user', { token: props.userToken, username: userFromList.username }, function (data) {
                                                                                        switch (data.result) {
                                                                                            case true:
                                                                                                props.addToast("User Management", `The user ${userFromList.username} has been removed.`);
                                                                                                break;
                                                                                            case false:
                                                                                                props.addToast("User Management", `The user ${userFromList.username} has not been removed.`);
                                                                                                break;
                                                                                            default:
                                                                                                break;
                                                                                        }
                                                                                    }, "json");
                                                                                },
                                                                                closeTitle: 'No',
                                                                                closeHandler: () => {
                                                                                    props.setConfirmModal({
                                                                                        title: "",
                                                                                        body: "",
                                                                                        closeTitle: "",
                                                                                        closeHandler: () => { },
                                                                                        confirmTitle: "",
                                                                                        confirmHandler: () => { }
                                                                                    })
                                                                                }
                                                                            }
                                                                        });
                                                                    }}>Delete</a>
                                                            </td>
                                                        </tr>
                                                    )
                                                }
                                            })
                                        }
                                    </tbody>
                                    <tfoot>
                                        <tr>
                                            <td><strong>Username</strong></td>
                                            <td><strong>Email</strong></td>
                                            <td><strong>Name</strong></td>
                                            <td><strong>Birth Date</strong></td>
                                            <td><strong>Language</strong></td>
                                            <td><strong>User groups</strong></td>
                                            <td><strong>Email Verified</strong></td>
                                            <td><strong>Action</strong></td>
                                        </tr>
                                    </tfoot>
                                </table>
                            </div>
                            <div className="row">
                                <div className="col-md-6 align-self-center">
                                    <p id="dataTable_info" className="dataTables_info" role="status" aria-live="polite">
                                        Showing {(currentView * userListViewSize) - userListViewSize + 1} to {(currentView * userListViewSize) > serverUsage.num_total_users ? serverUsage.num_total_users : (currentView * userListViewSize)} of {serverUsage.num_total_users}
                                    </p>
                                </div>
                                <div className="col-md-6">
                                    <nav className="d-lg-flex justify-content-lg-end dataTables_paginate paging_simple_numbers">
                                        <ul className="pagination">
                                            <li className={(currentView === 1) ? "page-item disabled" : "page-item"}>
                                                <a className="page-link" href="#" aria-label="Previous" onClick={previousCurrentViewHandler}>
                                                    <span aria-hidden="true">«</span>
                                                </a>
                                            </li>

                                            {
                                                currentView > 1 && currentView !== Math.ceil(serverUsage.num_total_users / userListViewSize) &&
                                                (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                                    setCurrentView(currentView - 1);
                                                }}>{currentView - 1}</a></li>)
                                            }
                                            {
                                                (currentView - 1) >= 1 && currentView === Math.ceil(serverUsage.num_total_users / userListViewSize) ?
                                                    (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                                        setCurrentView(currentView - 1);
                                                    }}>{currentView - 1}</a></li>)
                                                    :
                                                    currentView !== Math.ceil(serverUsage.num_total_users / userListViewSize) &&
                                                    (<li className="page-item active"><a className="page-link" href="#">{currentView}</a></li>)
                                            }
                                            {
                                                currentView === Math.ceil(serverUsage.num_total_users / userListViewSize) ?
                                                    (<li className="page-item active"><a className="page-link" href="#">{currentView}</a></li>)
                                                    : (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                                        setCurrentView(currentView + 1);
                                                    }}>{currentView + 1}</a></li>)
                                            }
                                            <li className={(currentView === Math.ceil(serverUsage.num_total_users / userListViewSize)) ? "page-item disabled" : "page-item"}>
                                                <a className="page-link" href="#" aria-label="Next" onClick={nextCurrentViewHandler}>
                                                    <span aria-hidden="true">»</span>
                                                </a>
                                            </li>
                                        </ul>
                                    </nav>
                                </div>
                            </div>
                        </div>
                    </div>
                </div >
            )
        default:
            return (
                <div className="container-fluid" style={{
                    "marginLeft": "14rem",
                    "width": "calc(100% - 14rem)",
                    "marginTop": "6rem"
                }}>

                </div>
            );
    }
}

const Pannel = (props) => {
    const [currentContainer, setCurrentContainer] = useState('dashboard');

    const changeContainer = (container_name = "") => {
        setCurrentContainer(container_name);
    }

    const toogleSidebarHandler = () => {
        var sidebar = document.querySelector('.sidebar');
        if (sidebar) {
            sidebar.classList.toggle('toggled');
        }
        var topbar = document.getElementById('navbar_top');
        if (topbar) {
            topbar.classList.toggle('topbar_toggled');
        }
    }


    return (
        <div className="container">

            <nav className="navbar navbar-dark fixed-top align-items-start sidebar sidebar-dark accordion bg-gradient-primary p-0" style={{
                "color": "rgb(133, 135, 150)",
                "background": "var(--bs-blue)",
                "overflow": "hidden",
                "zIndex": "1"
            }}>
                <div className="container-fluid d-flex flex-column p-0">
                    <a className="navbar-brand d-flex justify-content-center align-items-center sidebar-brand m-0" href="#" >
                        <div className="sidebar-brand-text mx-3">
                            <span style={{ "fontFamily": "Nunito, sans-serif" }}>
                                <span style={{ "color": "rgb(249, 142, 27)" }}>Reh</span><span style={{ "color": "white" }}>@Store</span> Admin
                            </span>
                        </div>
                    </a>
                    <hr className="sidebar-divider my-0" />
                    <ul className="navbar-nav text-light">
                        <li className={`nav-item ${currentContainer === "dashboard" ? "current_nav" : ""}`}>
                            <a className={`nav-link ${currentContainer === "dashboard" ? "active" : ""}`} href="#" onClick={() => { changeContainer("dashboard") }}>
                                <i className="fas fa-tachometer-alt"></i> <span>Dashboard</span>
                            </a>
                        </li>
                        <li className={`nav-item ${currentContainer === "user_management" ? "current_nav" : ""}`}>
                            <a className={`nav-link ${currentContainer === "user_management" ? "active" : ""}`} href="#" onClick={() => { changeContainer("user_management") }}>
                                <i className="fas fa-users"></i> <span>User Management</span>
                            </a>
                        </li>
                        <li className={`nav-item`}>
                            <a className={`nav-link`} href="#" onClick={() => {
                                window.open('https://dashboard.tawk.to/login');
                            }}>
                                <i className="fas fa-headset"></i> <span>Support Ticket Pannel</span>
                            </a>
                        </li>
                    </ul>
                    <div className="text-center d-none d-md-inline">
                        <button className="btn rounded-circle border-0" onClick={toogleSidebarHandler} id="sidebarToggle" type="button"></button>
                    </div>
                </div>
            </nav>

            <div className="d-flex flex-column">
                <nav className="navbar navbar-light navbar-expand fixed-top bg-white shadow mb-4 topbar static-top" id="navbar_top" style={{ "zIndex": 1 }}>
                    <div className="container-fluid">
                        <button className="btn btn-link d-md-none rounded-circle me-3" type="button" onClick={toogleSidebarHandler}>
                            <i className="fas fa-bars"></i>
                        </button>
                        <ul className="navbar-nav flex-nowrap ms-auto">
                            <li className="nav-item dropdown no-arrow mx-1">
                                <div className="nav-item dropdown no-arrow">
                                    <a className="nav-link" aria-expanded="false" href="#">
                                        {
                                            props.websocket.connected ?
                                                <span><i className="fas fa-circle" style={{ "color": "var(--bs-green)" }}></i> Online</span>
                                                : <span><i className="fas fa-circle" style={{ "color": "var(--bs-red)" }}></i> Offline</span>
                                        }

                                    </a>
                                </div>
                            </li>
                            {/*<li className="nav-item dropdown no-arrow mx-1">
                                <div className="nav-item dropdown no-arrow">
                                    <a className="dropdown-toggle nav-link" aria-expanded="false" data-bs-toggle="dropdown" href="#">
                                        <span className="badge bg-danger badge-counter">1</span><i className="fas fa-bell fa-fw"></i>
                                    </a>
                                    <div className="dropdown-menu dropdown-menu-end dropdown-list animated--grow-in">
                                        <h6 className="dropdown-header">Notifications</h6>
                                        <a className="dropdown-item d-flex align-items-center" href="#">
                                            <div className="me-3">
                                                <div className="bg-warning icon-circle">
                                                    <i className="fas fa-exclamation-triangle text-white"></i>
                                                </div>
                                            </div>
                                            <div>
                                                <span className="small text-gray-500">March 2, 2021</span>
                                                <p>This is a sample warning notification</p>
                                            </div>
                                        </a>
                                        <a className="dropdown-item text-center small text-gray-500" href="#">
                                            Show All Alerts
                                        </a>
                                    </div>
                                </div>
                            </li>*/}
                            <div className="d-none d-sm-block topbar-divider"></div>
                            <li className="nav-item dropdown no-arrow">
                                <div className="nav-item dropdown no-arrow">
                                    <a className="dropdown-toggle nav-link" aria-expanded="false" data-bs-toggle="dropdown" href="#">
                                        <span className="d-none d-lg-inline me-2 text-gray-600 small">{props.username}</span>
                                        <i className="border rounded-circle fas fa-user" style={{ "padding": "7px" }}></i>
                                    </a>
                                    <div className="dropdown-menu shadow dropdown-menu-end animated--grow-in">
                                        <a className="dropdown-item" href="#" onClick={props.logoutHandler}>
                                            <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;Logout
                                        </a>
                                    </div>
                                </div>
                            </li>
                        </ul>
                    </div>
                </nav>
                <PannelContainer
                    currentContainer={currentContainer}
                    userToken={props.userToken}
                    setConfirmModal={props.setConfirmModal}
                    addToast={props.addToast}
                />
            </div>
        </div>
    )
}

function getStorageValue(key, defaultValue) {
    // getting stored value
    const saved = localStorage.getItem(key);
    return saved || defaultValue;
}
const useLocalStorage = (key, defaultValue) => {
    const [value, setValue] = useState(() => {
        return getStorageValue(key, defaultValue);
    });

    useEffect(() => {
        let firedEvent = () => {
            setValue(getStorageValue(key, ''));
        };
        window.addEventListener("useLocalStorage_" + key, firedEvent);

        return () => {
            window.removeEventListener("useLocalStorage_" + key, firedEvent);
        };
    }, [])

    useEffect(() => {
        localStorage.setItem(key, value);

        window.dispatchEvent(new Event("useLocalStorage_" + key));

    }, [key, value]);

    return [value, setValue];
}

/**
 * 
 * 
                    props.setUserToken(data.token);
                    props.setUsername(username);
                    props.setShowPannel(true);
                    props.setShowLoginForm(false);
 */

const Container = (props) => {
    const [userToken, setUserToken] = useLocalStorage('sessionToken', undefined);
    const [showLoginForm, setShowLoginForm] = useState(
        (localStorage.getItem("sessionToken") && localStorage.getItem("username")) === null ||
        (localStorage.getItem("sessionToken") === '' || localStorage.getItem("username") === '')
    );
    const [showPannel, setShowPannel] = useState(
        (localStorage.getItem("sessionToken") && localStorage.getItem("username")) !== null &&
        (localStorage.getItem("sessionToken") !== '' && localStorage.getItem("username") !== '')
    );
    const [username, setUsername] = useLocalStorage('username', '');
    const [toasts, setToasts] = useState({});
    useEffect(() => {
        let toast_update_interval = setInterval(() => {
            let currentTime = new Date();
            Object.keys(toasts).forEach(toast_key => {
                let toast_time = new Date(parseInt(toast_key.replace("toast_", "")));
                toast_time.setSeconds(toast_time.getSeconds() + 8);
                if (toast_time < currentTime) {
                    handlers.removeToast(toast_key);
                }
            });
        }, 1000);
        return () => {
            clearInterval(toast_update_interval);
        }
    });

    const [websocket, setWebsocket] = useState({
        connected: false
    });
    const [confirmModal, setConfirmModal] = useState({
        title: "",
        body: "",
        closeTitle: "",
        closeHandler: () => { },
        confirmTitle: "",
        confirmHandler: () => { }
    })

    useEffect(() => {
        webSocketTools.on("open", () => {
            setWebsocket(prevState => {
                return {
                    ...prevState,
                    connected: true
                }
            })
        });
        webSocketTools.on("close", () => {
            setWebsocket(prevState => {
                return {
                    ...prevState,
                    connected: false
                }
            });
            setTimeout(() => {
                console.log("Trying to reconnect to web socket server...");
                webSocketTools.reconnect();
            }, 10000);
        });
    })


    const handlers = {
        logout: () => {
            $.post('/api/account/logout', { token: userToken }, function (data) {
                switch (data.result) {
                    case true:
                        setUserToken('');
                        setUsername('');
                        setShowPannel(false);
                        setShowLoginForm(true);
                        handlers.addToast("Logout", "Logged out!");
                        break;
                    default:
                        handlers.addToast("Logout", "Logout failed due to unkown error. Please try again.");
                        break;
                }
            }, "json");
        },
        removeToast: (toast_id) => {
            setToasts(prevState => {
                let tmp_state_data = { ...prevState };
                delete tmp_state_data[toast_id];
                return tmp_state_data;
            });

        },
        addToast: (title = "", message = "", date = getCurrentTime()) => {
            const toast_date = (+new Date());
            const toast_id = "toast_" + toast_date;
            const toast = {
                title,
                date,
                message
            }
            setToasts(prevState => {
                return {
                    ...prevState,
                    [toast_id]: toast
                };
            });
        }
    };


    return (
        <div className="react_container" style={{ "zIndex": "0" }}>
            <ConfirmModal
                title={confirmModal.title}
                body={confirmModal.body}
                closeTitle={confirmModal.closeTitle}
                closeHandler={confirmModal.closeHandler}
                confirmTitle={confirmModal.confirmTitle}
                confirmHandler={confirmModal.confirmHandler}
            />
            <NotificationManager
                toasts={toasts}
                removeToast={handlers.removeToast}
            />
            {showLoginForm &&
                <LoginForm
                    addToast={handlers.addToast}
                    setShowPannel={setShowPannel}
                    setShowLoginForm={setShowLoginForm}
                    setUserToken={setUserToken}
                    setUsername={setUsername}
                />
            }
            {
                showPannel &&
                <Pannel
                    username={username}
                    userToken={userToken}
                    logoutHandler={handlers.logout}
                    websocket={websocket}
                    setConfirmModal={setConfirmModal}
                    addToast={handlers.addToast}
                />
            }
        </div >
    )
}

ReactDOM.render(
    <Container />,
    document.getElementById('root')
)

