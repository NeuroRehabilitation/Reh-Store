const streamSaver = window.streamSaver

const { useState, useEffect } = React;

/*
let webSocketClient;

const webSocketTools = {
    events: {

    },
    on: (event, callback = (message = "") => { }) => {
        webSocketTools.events[event] = callback;
    },
    connect: () => {
        webSocketClient = new WebSocket("wss://" + window.location.host + "/publisher");
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
*/

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
    const [username, setUsername] = useLocalStorage('username', '');
    const [password, setPassword] = useState('');
    const [userFeedback, setUserFeedback] = useState('');

    const handleUsername = (event) => {
        setUsername(event.target.value);
    };
    const handlePassword = (event) => {
        setPassword(event.target.value);
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        setUserFeedback('Logging in');
        const result = await api_account.login(username, password, false, true);
        if (result.result === true) {
            setUserFeedback("Logged in! Redirecting...");
            props.setUsername(username);
            props.setShowPannel(true);
            props.setShowLoginForm(false);
            props.addToast("Login", "Welcome " + username);
        } else {
            switch (result.reason) {
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
        }
    };

    return (
        <div className="container">
            <div className="row justify-content-center login_container">
                <div className="col-md-9 col-lg-12 col-xl-10">
                    <div className="card shadow-lg o-hidden border-0 my-5">
                        <div className="card-body p-0">
                            <div className="p-5">
                                <div className="text-center">
                                    <h4 className="text-dark mb-4">Reh@Store Publisher Pannel</h4>
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
    let dismissModal = (props.dismissOnConfirm === undefined) ? true : props.dismissOnConfirm;
    return (
        <div className="modal fade" id="confirmModal" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="confirmModal" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="staticBackdropLabel">{props.title}</h5>
                    </div>
                    <div className="modal-body">{props.body}</div>
                    <div className="modal-footer">
                        {(props.closeTitle !== "" && props.closeTitle !== undefined) &&
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={props.closeHandler}>{props.closeTitle}</button>
                        }
                        {dismissModal === true ?
                            (<button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={props.confirmHandler}>{props.confirmTitle}</button>)
                            :
                            (<button type="button" className="btn btn-primary" onClick={props.confirmHandler}>{props.confirmTitle}</button>)
                        }
                    </div>
                </div>
            </div>
        </div>
    );
}


const CustomTable = (props) => {
    /**
     * We never send all the list to the react interface. If we do, the browser will crash.
     * We need to tell this component what the real number of rows are. This is obtained from the server.
     * Then, the value is passed to this components propertie named "recordNumber"
     */

    /** Parametros
     * props.title
     * props.header
     * props.body
     * props.totalNumElems
     * props.onIndexChanged(var numFirst, var numLast) :return true to change index and false to not change
     * props.onRefresh()
     * props.extraButtonText
     * props.onExtraButtonClick()
     * props.onSearch(var stringValue)
     */

    const [numItemsPerList, setNumItemsPerList] = useState(5);
    useEffect(() => {
        if (Array.isArray(props.body) && props.body.length > 0) {
            let currentListIndex = subTable.getCurrent();

            const list = {
                first: subTable.element.getFirst(currentListIndex),
                last: subTable.element.getLast(currentListIndex)
            };
            props.onIndexChanged(list.first, list.last);
        }
    }, [numItemsPerList]);

    const [searchBar, setSearchBar] = useState('');

    const [firstElemList, setFirstElemList] = useState(0);

    const subTable = {
        //Get number of sub tables
        totalNumber: () => {
            return Math.ceil(props.totalNumElems / numItemsPerList);
        },
        //Get current sub table number
        getCurrent: () => {
            var index = 0;
            var firstElems = [];
            while (index < props.totalNumElems) {
                firstElems.push(index);
                index += numItemsPerList;
            }

            const arrayIndex = firstElems.indexOf(firstElemList, 0);
            return arrayIndex === -1 ? undefined : arrayIndex + 1;
        },
        element: {
            getFirst: (tableNumber = subTable.getCurrent()) => {
                return ((tableNumber - 1) * numItemsPerList) + 1;
            },
            getLast: (tableNumber = subTable.getCurrent()) => {
                const tableFirstItem = subTable.element.getFirst(tableNumber);
                let calculatedValue = tableFirstItem + numItemsPerList - 1;
                return (calculatedValue > props.totalNumElems) ? props.totalNumElems : calculatedValue;
            }
        },
        goToPrevious: () => {
            let currentListIndex = subTable.getCurrent();
            //Dont go to previous if there isn't one?
            if (currentListIndex <= 1) return;


            const previousList = {
                first: subTable.element.getFirst(currentListIndex - 1),
                last: subTable.element.getLast(currentListIndex - 1)
            };
            if (props.onIndexChanged(previousList.first, previousList.last) === true) {
                setFirstElemList(previousList.first - 1);
            }
        },
        goToNext: () => {
            let currentListIndex = subTable.getCurrent();
            //Dont go to next if there isn't one?
            if (currentListIndex >= subTable.totalNumber()) return;

            const nextList = {
                first: subTable.element.getFirst(currentListIndex + 1),
                last: subTable.element.getLast(currentListIndex + 1)
            };
            if (props.onIndexChanged(nextList.first, nextList.last) === true) {
                setFirstElemList(nextList.first - 1);
            }
        }
    }

    return (
        <div className="card shadow">
            <div className="card-header py-3 d-flex justify-content-between">
                <p className="text-primary m-0 fw-bold">{props.title}</p>

                {(props.extraButtonText !== undefined) &&
                    (<span>
                        <button type="button" className="btn btn-primary"
                            onClick={() => {
                                console.log(props.totalNumElems);
                                try { props.onExtraButtonClick(); } catch (err) { }
                            }}>{props.extraButtonText}</button>
                    </span>)
                }

                {(props.onRefresh !== undefined) &&
                    (<span>
                        <button type="button" className="btn btn-primary"
                            onClick={() => {
                                try { props.onRefresh(searchBar); } catch (err) { }
                            }}><i className="fas fa-sync"></i></button>
                    </span>)
                }
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-6 text-nowrap">
                        {props.totalNumElems > 0 &&
                            <div id="dataTable_length" className="dataTables_length" aria-controls="dataTable">
                                <label className="form-label">Show <select className="d-inline-block form-select form-select-sm" onChange={(event) => {
                                    setNumItemsPerList(parseInt(event.target.value));
                                }}
                                    defaultValue={{ label: numItemsPerList, value: numItemsPerList }}>
                                    <option value="5">5</option>
                                    <option value="10">10</option>
                                    <option value="25">25</option>
                                    <option value="50">50</option>
                                    <option value="100">100</option>
                                    <option value="1000">1000</option>
                                </select>&nbsp;
                                </label>
                            </div>
                        }
                    </div>
                    <div className={props.totalNumElems > 0 ? "col-md-6" : "col-md-12"}>
                        {props.onSearch !== undefined &&
                            <div className="text-md-end dataTables_filter" id="dataTable_filter">
                                <label className="form-label input-group input-group-sm">
                                    <button
                                        className="btn btn-outline-secondary"
                                        type="button"
                                        id="search_bar_button"
                                        onClick={() => {
                                            try { props.onSearch(searchBar); } catch (err) { }
                                        }}><i className="fas fa-search"></i></button>
                                    <input
                                        type="text"
                                        className="form-control form-control-sm"
                                        placeholder="Search"
                                        defaultValue={searchBar}
                                        aria-controls="dataTable"
                                        onChange={(event) => setSearchBar(event.target.value)}
                                        onKeyUp={(event) => {
                                            if (event.keyCode === 13) {
                                                try { props.onSearch(searchBar); } catch (err) { }
                                            }
                                        }}
                                        aria-describedby="search_bar_button" />
                                </label>
                            </div>
                        }
                    </div>
                </div>

                {(props.onSearch === undefined && props.totalNumElems <= 0) &&
                    <div className="table-responsive table mt-2" id="dataTable" role="grid" aria-describedby="dataTable_info">
                        <p>There is nothing to be shown</p>
                    </div>
                }

                {props.totalNumElems > 0 &&
                    <div className="table-responsive table mt-2" id="dataTable" role="grid" aria-describedby="dataTable_info">
                        <table className="table my-0" id="dataTable">
                            <thead>
                                <tr>
                                    {props.header.map((headElement, index) => {
                                        return (<th key={"table_head_" + index}>{headElement}</th>)
                                    })}
                                </tr>
                            </thead>
                            <tbody>
                                {props.body.map((row, index) => {
                                    return (
                                        <tr key={"row_" + index}>{row.map((column, index2) => {
                                            return (
                                                <td key={"row_" + index + "_column_" + index2}>{column}</td>
                                            )
                                        })}</tr>
                                    )
                                })}
                            </tbody>
                            <tfoot>
                                <tr>
                                    {props.header.map((headElement, index) => {
                                        return (<td key={"table_footer_" + index}><strong>{headElement}</strong></td>)
                                    })}
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                }

                {props.totalNumElems > 0 &&
                    <div className="row">
                        <div className="col-md-6 align-self-center">
                            <p id="dataTable_info" className="dataTables_info" role="status" aria-live="polite">
                                Showing {subTable.element.getFirst()} to {subTable.element.getLast()} of {props.totalNumElems}
                            </p>
                        </div>
                        <div className="col-md-6">
                            <nav className="d-lg-flex justify-content-lg-end dataTables_paginate paging_simple_numbers">
                                <ul className="pagination">
                                    <li className={(subTable.getCurrent() === 1) ? "page-item disabled" : "page-item"}>
                                        <a className="page-link" href="#" aria-label="Previous" onClick={() => { subTable.goToPrevious(); }}>
                                            <span aria-hidden="true">«</span>
                                        </a>
                                    </li>

                                    {
                                        subTable.getCurrent() > 1 && subTable.getCurrent() !== Math.ceil(props.totalNumElems / numItemsPerList) &&
                                        (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                            subTable.goToPrevious();
                                        }}>{subTable.getCurrent() - 1}</a></li>)
                                    }
                                    {
                                        (subTable.getCurrent() - 1) >= 1 && subTable.getCurrent() === Math.ceil(props.totalNumElems / numItemsPerList) ?
                                            (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                                subTable.goToPrevious();
                                            }}>{subTable.getCurrent() - 1}</a></li>)
                                            :
                                            subTable.getCurrent() !== Math.ceil(props.totalNumElems / numItemsPerList) &&
                                            (<li className="page-item active"><a className="page-link" href="#">{subTable.getCurrent()}</a></li>)
                                    }
                                    {
                                        subTable.getCurrent() === Math.ceil(props.totalNumElems / numItemsPerList) ?
                                            (<li className="page-item active"><a className="page-link" href="#">{subTable.getCurrent()}</a></li>)
                                            : (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                                subTable.goToNext();
                                            }}>{subTable.getCurrent() + 1}</a></li>)
                                    }
                                    <li className={(subTable.getCurrent() === Math.ceil(props.totalNumElems / numItemsPerList)) ? "page-item disabled" : "page-item"}>
                                        <a className="page-link" href="#" aria-label="Next" onClick={() => { subTable.goToNext(); }}>
                                            <span aria-hidden="true">»</span>
                                        </a>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    </div>
                }
            </div>
        </div>
    );
}

const Table = (props) => {
    /**
     * We never send all the list to the react interface. If we do, the browser will crash.
     * We need to tell this component what the real number of rows are. This is obtained from the server.
     * Then, the value is passed to this components propertie named "recordNumber"
     */
    const [listViewSize, setListViewSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);
    const [searchBarValue, setSearchBarValue] = useState('');

    const listSizeChangeHandler = (event) => {
        const max_sub_table = Math.ceil(props.recordNumber / event.target.value);

        if (currentPage > max_sub_table) setCurrentPage(max_sub_table);
        if (currentPage < 1) setCurrentPage(1);

        setListViewSize(event.target.value);
    }

    const searchBarHandler = (event) => {
        setSearchBarValue(event.target.value);
    }

    const previousCurrentViewHandler = () => {
        if (currentPage > 1) {
            setCurrentPage(prevState => {
                props.onIndexChange(((prevState - 1) * listViewSize) - listViewSize + 1, ((prevState - 1) * listViewSize) > props.recordNumber ? props.recordNumber : ((prevState - 1) * listViewSize));
                return prevState - 1;
            });

        }
    }
    const nextCurrentViewHandler = () => {
        const maxViews = Math.ceil(props.recordNumber / listViewSize);
        if (currentPage < maxViews)
            setCurrentPage(prevState => {
                props.onIndexChange(((prevState + 1) * listViewSize) - listViewSize + 1, ((prevState + 1) * listViewSize) > props.recordNumber ? props.recordNumber : ((prevState + 1) * listViewSize));
                return prevState + 1;
            });
    }

    const tableRowFilter = (tableData) => {
        let validRows = []

        tableData.forEach(row => {
            let isRowValid = false;
            row.forEach(column => {
                try {
                    if (column.includes(searchBarValue)) isRowValid = true;
                } catch (err) {

                }
            })
            if (isRowValid)
                validRows.push(row);
        })

        return validRows;
    }

    return (
        <div className="card shadow">
            <div className="card-header py-3 d-flex justify-content-between">
                <p className="text-primary m-0 fw-bold">{props.title}</p>

                {(props.tableTitleButtonText !== undefined) &&
                    (<span>
                        <button type="button" className="btn btn-primary"
                            onClick={() => {
                                try { props.refreshButtonOnClick(); } catch (err) { }
                            }}><i className="fas fa-sync"></i></button> <button
                                type="button" className="btn btn-primary"
                                onClick={props.tableTitleButtonOnClick}>{props.tableTitleButtonText}</button>
                    </span>)
                }
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-6 text-nowrap">
                        <div id="dataTable_length" className="dataTables_length" aria-controls="dataTable">
                            <label className="form-label">Show&nbsp;
                                <select className="d-inline-block form-select form-select-sm" onChange={listSizeChangeHandler}
                                    defaultValue={{ label: '5', value: '5' }}>
                                    <option value="5">5</option>
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
                                    defaultValue={searchBarValue}
                                    onChange={searchBarHandler}
                                />
                            </label>
                        </div>
                    </div>
                </div>
                <div className="table-responsive table mt-2" id="dataTable" role="grid" aria-describedby="dataTable_info">
                    <table className="table my-0" id="dataTable">
                        <thead>
                            <tr>
                                {props.header.map((headElement, index) => {
                                    return (<th key={"table_head_" + index}>{headElement}</th>)
                                })}
                            </tr>
                        </thead>
                        <tbody>
                            {tableRowFilter(props.body).map((row, index) => {
                                return (
                                    <tr key={"row_" + index}>{row.map((column, index2) => {
                                        return (
                                            <td key={"row_" + index + "_column_" + index2}>{column}</td>
                                        )
                                    })}</tr>
                                )
                            })}
                        </tbody>
                        <tfoot>
                            <tr>
                                {props.header.map((headElement, index) => {
                                    return (<td key={"table_footer_" + index}><strong>{headElement}</strong></td>)
                                })}
                            </tr>
                        </tfoot>
                    </table>
                </div>
                <div className="row">
                    <div className="col-md-6 align-self-center">
                        <p id="dataTable_info" className="dataTables_info" role="status" aria-live="polite">
                            Showing {(currentPage * listViewSize) - listViewSize + 1} to {(currentPage * listViewSize) > props.recordNumber ? props.recordNumber : (currentPage * listViewSize)} of {props.recordNumber}
                        </p>
                    </div>
                    <div className="col-md-6">
                        <nav className="d-lg-flex justify-content-lg-end dataTables_paginate paging_simple_numbers">
                            <ul className="pagination">
                                <li className={(currentPage === 1) ? "page-item disabled" : "page-item"}>
                                    <a className="page-link" href="#" aria-label="Previous" onClick={previousCurrentViewHandler}>
                                        <span aria-hidden="true">«</span>
                                    </a>
                                </li>

                                {
                                    currentPage > 1 && currentPage !== Math.ceil(props.recordNumber / listViewSize) &&
                                    (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                        previousCurrentViewHandler();
                                    }}>{currentPage - 1}</a></li>)
                                }
                                {
                                    (currentPage - 1) >= 1 && currentPage === Math.ceil(props.recordNumber / listViewSize) ?
                                        (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                            previousCurrentViewHandler();
                                        }}>{currentPage - 1}</a></li>)
                                        :
                                        currentPage !== Math.ceil(props.recordNumber / listViewSize) &&
                                        (<li className="page-item active"><a className="page-link" href="#">{currentPage}</a></li>)
                                }
                                {
                                    currentPage === Math.ceil(props.recordNumber / listViewSize) ?
                                        (<li className="page-item active"><a className="page-link" href="#">{currentPage}</a></li>)
                                        : (<li className="page-item"><a className="page-link" href="#" onClick={() => {
                                            nextCurrentViewHandler();
                                        }}>{currentPage + 1}</a></li>)
                                }
                                <li className={(currentPage === Math.ceil(props.recordNumber / listViewSize)) ? "page-item disabled" : "page-item"}>
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
    );
}

const TagInput = (props) => {
    const [tags, setTags] = useState(props.defaultTags || []);

    const addTag = (tag) => {
        if (!tags.includes(tag))
            setTags(prevState => {
                return [...prevState, tag];
            })
    };

    const removeTag = (tag) => {
        setTags(prevState => {
            return prevState.filter(prevTag => prevTag !== tag);
        })
    };

    return (

        <div className="form-floating col-md-11">
            <input
                type="text"
                className="form-control"
                aria-describedby="fakeTagInputHelp"
                placeholder=""
                defaultValue=""
                onKeyUp={(event) => {
                    event.target.value = event.target.value.replaceAll(/[^a-zA-Z0-9]/g, '')
                }}
                onKeyDown={(event) => {
                    if (event.keyCode == 32) { //space
                        event.preventDefault();
                    }
                    if (event.key === 'Enter') {
                        addTag(event.target.value);
                        event.target.value = "";
                    }
                }}
            />
            <label htmlFor="fakeTagInput">Insert Tag (press enter to insert)</label>
            <small className="form-text text-muted">
                Tags can only be numbers and letters. They are keywords used by the user to find your software
            </small>

            <p>Tag List</p>
            <select multiple size="1" value={tags} className="tagInputSelect" name="tags" size={tags.length} readOnly>{tags.map(tag => {
                return (<option key={"tag_" + tag} className="btn" value={tag} onClick={() => {
                    removeTag(tag);
                }}>
                    {tag}
                </option>);
            })}</select>
            <small className="form-text text-muted">
                To remove a tag from the list, just click on it
            </small>
        </div >

    );
}

const SoftwareFormLayout = (props) => {
    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_form_layout"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <div className="form-floating col-md-6 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="package_id"
                    aria-describedby="package_idHelp"
                    placeholder="com.maker.app_name" required
                    defaultValue={props.package_id} />
                <label htmlFor="package_id">Package ID <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please choose a Package ID.
                </div>
                <small id="package_idHelp" className="form-text text-muted">
                    Lowercase letters, numbers, dots and underscore (Ex: com.maker.app_name)
                </small>
            </div>
            <div className="form-floating col-md-5 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="name"
                    aria-describedby="nameHelp"
                    placeholder="com.maker.app_name" required
                    defaultValue={props.name} />
                <label htmlFor="name">Name <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please choose a Name.
                </div>
                <small id="nameHelp" className="form-text text-muted">
                    Must only contain numbers, letters and space characters
                </small>
            </div>
            <div className="form-floating col-md-11 has-validation">
                <textarea
                    className="form-control"
                    name="description"
                    aria-describedby="descriptionHelp"
                    defaultValue={props.description}
                ></textarea>
                <label htmlFor="description">Description <span class="badge bg-secondary">Opcional</span></label>
                <small id="descriptionHelp" className="form-text text-muted">
                    Numbers, letters, dots, comma, exclamation, interrogation and space characters
                </small>
            </div>
            <TagInput defaultTags={props.tags} />
        </form>
    )
}

const SoftwareBranchFormLayout = (props) => {
    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_branch_form_layout"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <input type="text" hidden value={props.package_id} name="package_id" readOnly />
            <div className="form-floating col-md-5 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="name"
                    aria-describedby="nameHelp"
                    placeholder="Branch name" required
                    defaultValue={props.name} />
                <label htmlFor="name">Name <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please choose a Name.
                </div>
                <small id="nameHelp" className="form-text text-muted">
                    Must only contain numbers, letters and _
                </small>
            </div>
        </form>
    )
}

const SoftwareBranchAllowedUsersInput = (props) => {
    const [users, setUsers] = useState(props.allowedUsers || []);

    const addUser = (user) => {
        if (!users.includes(user))
            setUsers(prevState => {
                return [...prevState, user];
            })
    };

    const removeUser = (user) => {
        setUsers(prevState => {
            return prevState.filter(prevUser => prevUser !== user);
        })
    };

    return (

        <div className="form-floating col-md-11">
            <input
                type="text"
                className="form-control"
                aria-describedby="fakeTagInputHelp"
                placeholder=""
                defaultValue=""
                onKeyUp={(event) => {
                    event.target.value = event.target.value.replaceAll(/[^a-zA-Z0-9]/g, '')
                }}
                onKeyDown={async (event) => {
                    if (event.keyCode == 32) { //Disable space insertion
                        event.preventDefault();
                    }
                    if (event.key === 'Enter') {
                        const user_exists = await api_account.user.exists(event.target.value);
                        if (user_exists === true)
                            addUser(event.target.value);

                        event.target.value = "";
                    }
                }}
            />
            <label htmlFor="fakeTagInput">Allow Users (press enter to insert)</label>
            <small id="fakeTagInputHelp" className="form-text text-muted">
                Username must be only letters and numbers
            </small>
            <p className="mt-1 mb-0">Allowed users:</p>
            {
                users.length === 0 ? (
                    <div className="border rounded p-1">
                        Anyone can access this branch
                    </div>
                ) : (

                    <div className="border rounded p-1">
                        <select multiple size="1" value={users} className="tagInputSelect" name="allowedUsers" size={users.length} readOnly>{users.map(user => {
                            return (<option key={"user_" + user} className="btn" value={user} onClick={() => {
                                removeUser(user);
                            }}>
                                {user}
                            </option>);
                        })}</select>

                    </div>
                )
            }
        </div >

    );
}
const SoftwareBranchAccessPermissionsFormLayout = (props) => {
    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_branch_access_permissions_form_layout"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <SoftwareBranchAllowedUsersInput
                allowedUsers={props.allowedUsers}
            />
        </form>
    )
}

const SoftwareBranchVersionFormLayout = (props) => {
    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_branch_version_form_layout"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <div className="form-floating col-md-4 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="major"
                    aria-describedby="majorHelp"
                    placeholder="Major" required
                    defaultValue={props.major} />
                <label htmlFor="major">Major <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please insert a number
                </div>
                <small id="majorHelp" className="form-text text-muted">
                    Only numbers are allowed
                </small>
            </div>
            <div className="form-floating col-md-4 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="minor"
                    aria-describedby="minorHelp"
                    placeholder="Minor" required
                    defaultValue={props.minor} />
                <label htmlFor="minor">Minor <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please insert a number
                </div>
                <small id="minorHelp" className="form-text text-muted">
                    Only numbers are allowed
                </small>
            </div>
            <div className="form-floating col-md-4 has-validation">
                <input
                    type="text"
                    className="form-control"
                    name="patch"
                    aria-describedby="patchHelp"
                    placeholder="Patch" required
                    defaultValue={props.patch} />
                <label htmlFor="patch">Patch <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please insert a number
                </div>
                <small id="patchHelp" className="form-text text-muted">
                    Only numbers are allowed
                </small>
            </div>

            <div className="form-floating col-md-11 has-validation">
                <textarea
                    className="form-control"
                    name="changelog"
                    aria-describedby="changelogHelp"
                    defaultValue={props.changelog}
                ></textarea>
                <label htmlFor="changelog">Changelog <span class="badge bg-secondary">Opcional</span></label>
            </div>
        </form>
    )
}

const SoftwareBranchVersionPlatformFormLayout = (props) => {
    const [selectedPlatform, setSelectedPlatform] = useState('');
    const [selectedOS, setSelectedOS] = useState('');

    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_branch_version_platform_form_layout"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <div className="form-floating col-md-5 has-validation">
                <select
                    className="form-select"
                    aria-describedby="platformHelp"
                    name="platform" required
                    onChange={(event) => {
                        setSelectedPlatform(event.target.value);
                    }}
                    defaultValue="Select" >
                    <option>Select</option>
                    {
                        (() => {
                            let platform_array = [];
                            let platform_result = [];
                            props.availablePlatforms.map((data, index) => {
                                if (!platform_array.includes(data.platform)) {
                                    platform_result.push((<option key={"platform_option_" + index}>{data.platform}</option>));
                                    platform_array.push(data.platform);
                                }
                            });
                            return platform_result;
                        })()
                    }
                </select>
                <label htmlFor="platform">Platform <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please select a platform
                </div>
            </div>
            <div className="form-floating col-md-5 has-validation">
                <select
                    className="form-select"
                    aria-describedby="osVersionHelp"
                    name="osVersion" required
                    onChange={(event) => {
                        setSelectedOS(event.target.value);
                    }}
                    defaultValue="Select">
                    <option>Select</option>
                    {
                        (() => {
                            let osVersion_array = [];
                            let osVersion_result = [];
                            props.availablePlatforms.map((data, index) => {
                                if (!osVersion_array.includes(data.os_version) && data.platform === selectedPlatform) {
                                    osVersion_result.push((<option key={"osVersion_option_" + index}>{data.os_version}</option>));
                                    osVersion_array.push(data.os_version);
                                }
                            });
                            return osVersion_result;
                        })()
                    }
                </select>
                <label htmlFor="osVersion">OS version <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please select an OS version
                </div>
            </div>
            <div className="form-floating col-md-5 has-validation">
                <select
                    className="form-select"
                    aria-describedby="architectureHelp"
                    name="architecture" required
                    defaultValue="Select">
                    <option>Select</option>
                    {
                        (() => {
                            let architecture_array = [];
                            let architecture_result = [];
                            props.availablePlatforms.map((data, index) => {
                                if (!architecture_array.includes(data.architecture) && data.platform === selectedPlatform && data.os_version === selectedOS) {
                                    architecture_result.push((<option key={"osVersion_option_" + index}>{data.architecture}</option>));
                                    architecture_array.push(data.architecture);
                                }
                            });
                            return architecture_result;
                        })()
                    }
                </select>
                <label htmlFor="architecture">Architecture <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please select an architecture
                </div>
            </div>

            <div className="form-floating col-md-5 has-validation">
                <select
                    className="form-select"
                    aria-describedby="filenameHelp"
                    name="filename" required
                    defaultValue="Select">
                    <option>Select</option>
                    {
                        props.fileList.map((fileName, index) => {
                            return (<option key={"file_name_" + index}>{fileName}</option>)
                        })
                    }
                </select>
                <label htmlFor="filename">Package <span class="badge bg-danger">Required</span></label>
                <div className="invalid-feedback">
                    Please select a package
                </div>
            </div>
        </form>
    )
}

const SoftwareBranchVersionFileUploadFormLayout = (props) => {

    return (
        <form
            className="row g-3 needs-validation"
            noValidate id="software_manager_software_branch_version_file_upload_form_layout"
            encType="multipart/form-data"
            onSubmit={
                (event) => {
                    event.preventDefault();
                }
            }>
            <input type="hidden" value={api_account.userToken} name="token" />
            <input type="hidden" value={props.package_id} name="package_id" />
            <input type="hidden" value={props.branch_name} name="branch" />
            <input type="hidden" value={props.major} name="major" />
            <input type="hidden" value={props.minor} name="minor" />
            <input type="hidden" value={props.patch} name="patch" />
            <div className="form-floating col-md-12 has-validation">
                <input
                    type="file"
                    className="form-label"
                    aria-describedby="package_file_help"
                    name="package_file"
                    required
                />
                <div className="progress">
                    <div className="progress-bar progress-bar-striped" role="progressbar" id="package_upload_progrees_bar" aria-valuenow="0" aria-valuemin="0" aria-valuemax="100"></div>
                </div>
            </div>
        </form>
    )
}



const PannelContainer = (props) => {
    //#region Software Management
    const [currentSoftware, setCurrentSoftware] = useState('');
    const [currentSoftwareBranch, setCurrentSoftwareBranch] = useState('');
    const [currentSoftwareBranchVersion, setCurrentSoftwareBranchVersion] = useState('');
    const [currentSoftwareBranchVersionPlatforms, setCurrentSoftwareBranchVersionPlatforms] = useState(false);
    const [currentSoftwareBranchVersionFiles, setCurrentSoftwareBranchVersionFiles] = useState(false);

    const [softwareList, setSoftwareList] = useState([]);
    const [softwareListFirstIndex, setSoftwareListFirstIndex] = useState(1);
    const [softwareListLastIndex, setSoftwareListLastIndex] = useState(5);


    const [softwareBranchList, setSoftwareBranchList] = useState([]);
    const [softwareBranchListFirstIndex, setSoftwareBranchListFirstIndex] = useState(1);
    const [softwareBranchListLastIndex, setSoftwareBranchListLastIndex] = useState(5);

    const [softwareBranchVersionList, setSoftwareBranchVersionList] = useState([]);
    const [softwareBranchVersionListFirstIndex, setSoftwareBranchVersionListFirstIndex] = useState(1);
    const [softwareBranchVersionListLastIndex, setSoftwareBranchVersionListLastIndex] = useState(5);

    const [softwareBranchVersionPlatformList, setSoftwareBranchVersionPlatformList] = useState([]);
    const [softwareBranchVersionPlatformListFirstIndex, setSoftwareBranchVersionPlatformListFirstIndex] = useState(1);
    const [softwareBranchVersionPlatformListLastIndex, setSoftwareBranchVersionPlatformListLastIndex] = useState(5);

    const [softwareBranchVersionFileList, setSoftwareBranchVersionFileList] = useState([]);
    const [softwareBranchVersionFileListFirstIndex, setSoftwareBranchVersionFileListFirstIndex] = useState(1);
    const [softwareBranchVersionFileListLastIndex, setSoftwareBranchVersionFileListLastIndex] = useState(5);

    const [isLoadingTable, setIsLoadingTable] = useState(false);


    //#endregion

    const breadcrumbMenu = {
        openRoot: () => {
            setCurrentSoftware('');
            setSoftwareList([]);
            setSoftwareListFirstIndex(1);
            setSoftwareListLastIndex(5);

            setCurrentSoftwareBranch('');
            setSoftwareBranchList([]);
            setSoftwareBranchListFirstIndex(1);
            setSoftwareBranchListLastIndex(5);


            setCurrentSoftwareBranchVersion('');
            setSoftwareBranchVersionList([]);
            setSoftwareBranchVersionListFirstIndex(1);
            setSoftwareBranchVersionListLastIndex(5);

            setCurrentSoftwareBranchVersionPlatforms(false);
            setCurrentSoftwareBranchVersionFiles(false);

            updateSoftwareListHandler();
        },
        openSoftwareBranch: () => {
            setCurrentSoftwareBranch('');
            setCurrentSoftwareBranchVersion('');
            setCurrentSoftwareBranchVersionPlatforms(false);
            setCurrentSoftwareBranchVersionFiles(false);

            updateSoftwareBranchListHandler(currentSoftware);
        },
        openSoftwareBranchVersion: () => {
            updateSoftwareBranchVersionListHandler(currentSoftware, currentSoftwareBranch);
        }
    }

    const updateSoftwareBranchVersionFileListHandler = async (softwarePackageId, branch_name, major, minor, patch) => {
        setIsLoadingTable(true);
        const published_software_branches__version_files_response = await api_software.files.getAll(
            softwarePackageId, branch_name, major, minor, patch
        );

        let tmp_software_branch_version_file_list = [];
        if (published_software_branches__version_files_response.result === true) {
            published_software_branches__version_files_response.fileList.forEach(filename => {
                tmp_software_branch_version_file_list.push([filename,
                    (<span>
                        <a href="#" onClick={async () => {

                            fetch("/api/software/branch/version/download_file", {
                                method: 'POST',
                                headers: {
                                    'Content-Type': 'application/json'
                                },
                                body: JSON.stringify({
                                    token: api_account.userToken,
                                    package_id: softwarePackageId,
                                    branch: branch_name,
                                    major: major + '',
                                    minor: minor + '',
                                    patch: patch + '',
                                    filename
                                })
                            })
                                .then(response => {

                                    let contentDisposition = response.headers.get('Content-Disposition');

                                    // These code section is adapted from an example of the StreamSaver.js
                                    // https://jimmywarting.github.io/StreamSaver.js/examples/fetch.html

                                    // If the WritableStream is not available (Firefox, Safari), take it from the ponyfill
                                    if (!window.WritableStream) {
                                        streamSaver.WritableStream = WritableStream;
                                        window.WritableStream = WritableStream;
                                    }

                                    const fileStream = streamSaver.createWriteStream(filename);
                                    const readableStream = response.body;

                                    // More optimized
                                    if (readableStream.pipeTo) {
                                        return readableStream.pipeTo(fileStream);
                                    }

                                    window.writer = fileStream.getWriter();

                                    const reader = response.body.getReader();
                                    const pump = () => reader.read()
                                        .then(res => res.done
                                            ? writer.close()
                                            : writer.write(res.value).then(pump));

                                    pump();
                                })
                                .catch(error => {
                                    console.log(error);
                                });;

                        }}
                        >Download</a> <a href="#" data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={async () => {
                                props.setConfirmModal({
                                    title: "Delete file?",
                                    body: `Are you sure you want to delete the file ${filename}?`,
                                    closeTitle: "No",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Yes",
                                    confirmHandler: async () => {
                                        //TODO: Adapt this to deleting file
                                        const version_file_removal_result = await api_software.files.remove(softwarePackageId, branch_name, major, minor, patch, filename);
                                        if (version_file_removal_result.result === true) {
                                            props.addToast("File deletion", `The file "${filename}" was deleted!`);
                                        } else {
                                            props.addToast("File deletion", `The file "${filename}" was not deleted due to: ${version_file_removal_result.reason}`);
                                        }
                                        updateSoftwareBranchVersionFileListHandler(softwarePackageId, branch_name, major, minor, patch);
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    }
                                })
                            }}>Delete</a>
                    </span>)
                ]);
            });
        } else {
            props.addToast("Software Package File List", `Could not get the file list due to: ${published_software_branches__version_files_response.reason}`);
        }
        setSoftwareBranchVersionFileList(tmp_software_branch_version_file_list);
        setSoftwareBranchVersionFileListFirstIndex(1);
        setSoftwareBranchVersionFileListLastIndex(tmp_software_branch_version_file_list.length > 5 ? 5 : tmp_software_branch_version_file_list.length);

        setIsLoadingTable(false);
    };

    //TODO: Retornar tambem o ficheiro associado a aquela plataforma
    const updateSoftwareBranchVersionPlatformListHandler = async (softwarePackageId, branch_name, major, minor, patch) => {
        setIsLoadingTable(true);
        let tmp_software_branch_version_platform_list = [];
        const published_software_branches__version_platform_response = await api_software.version.details(softwarePackageId, branch_name, major, minor, patch);
        if (published_software_branches__version_platform_response.result === true) {
            published_software_branches__version_platform_response.supportedPlatforms.forEach(supportedPlatform => {
                tmp_software_branch_version_platform_list.push([
                    supportedPlatform.platform,
                    supportedPlatform.version,
                    supportedPlatform.architecture,
                    supportedPlatform.filename,
                    (<span>
                        <a href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={async () => {
                                props.setConfirmModal({
                                    title: "Delete version platform?",
                                    body: `Are you sure you want to delete the platform ${supportedPlatform.platform}-${supportedPlatform.architecture}-${supportedPlatform.version}?`,
                                    closeTitle: "No",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Yes",
                                    confirmHandler: async () => {
                                        const platform_removal_result = await api_software.platform.remove(softwarePackageId, branch_name, major, minor, patch, supportedPlatform.platform, supportedPlatform.architecture, supportedPlatform.version);
                                        if (platform_removal_result.result === true) {
                                            props.addToast("Remove Platform", `Platform "${supportedPlatform.platform}-${supportedPlatform.architecture}-${supportedPlatform.version}" removed from the version "${major + "." + minor + "." + patch}"!`);
                                        } else {
                                            props.addToast("Remove Platform", `Platform "${supportedPlatform.platform}-${supportedPlatform.architecture}-${supportedPlatform.version}" was not removed due to: ${platform_removal_result.reason}`);
                                        }
                                        updateSoftwareBranchVersionPlatformListHandler(softwarePackageId, branch_name, major, minor, patch);
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    }
                                })
                            }}>Delete</a>
                    </span>)
                ]);
            });
            setSoftwareBranchVersionPlatformList(tmp_software_branch_version_platform_list);
            setSoftwareBranchVersionPlatformListFirstIndex(1);
            setSoftwareBranchVersionPlatformListLastIndex(tmp_software_branch_version_platform_list.length > 5 ? 5 : tmp_software_branch_version_platform_list.length);
        } else {
            props.addToast("Version Platforms", `Could not get the version platform's due to: ${published_software_branches__version_platform_response.reason}`);
        }
        setIsLoadingTable(false);
    }

    const updateSoftwareBranchVersionListHandler = async (softwarePackageId, branch_name) => {
        setIsLoadingTable(true);
        let tmp_software_branch_version_list = [];
        const published_software_branch_versions_response = await api_software.version.getAll(softwarePackageId, branch_name);
        if (published_software_branch_versions_response.result === true) {
            published_software_branch_versions_response.versions.forEach(version => {
                tmp_software_branch_version_list.push([
                    version.major + "." + version.minor + "." + version.patch,
                    (<span>
                        <a href="#" onClick={() => {
                            setCurrentSoftwareBranchVersion(version.major + "." + version.minor + "." + version.patch);
                            updateSoftwareBranchVersionFileListHandler(softwarePackageId, branch_name, version.major, version.minor, version.patch);
                            setCurrentSoftwareBranchVersionFiles(true);
                        }}>Files</a>
                        <span> / </span>
                        <a href="#" onClick={() => {
                            setCurrentSoftwareBranchVersion(version.major + "." + version.minor + "." + version.patch);
                            updateSoftwareBranchVersionPlatformListHandler(softwarePackageId, branch_name, version.major, version.minor, version.patch);
                            setCurrentSoftwareBranchVersionPlatforms(true);
                        }}>Platforms</a>
                        <span> / </span>

                        <a href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={async () => {
                                props.setConfirmModal({
                                    title: "Delete version " + version.major + "." + version.minor + "." + version.patch + "?",
                                    body: `Are you sure you want to delete the version "${version.major + "." + version.minor + "." + version.patch}"?`,
                                    closeTitle: "No",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Yes",
                                    confirmHandler: async () => {
                                        const software_branch_version_removal_response = await api_software.version.remove(softwarePackageId, branch_name, version.major, version.minor, version.patch);
                                        if (software_branch_version_removal_response.result === true) {
                                            props.addToast("Remove Version", `Version "${version.major + "." + version.minor + "." + version.patch}" was removed!`);
                                        } else {
                                            props.addToast("Remove Version", `Version "${version.major + "." + version.minor + "." + version.patch}" was not removed due to: ${software_branch_version_removal_response.reason}`);
                                        }
                                        updateSoftwareBranchVersionListHandler(softwarePackageId, branch_name);
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    }
                                })
                            }}>Delete</a>
                    </span>)
                ]);
            })
            setSoftwareBranchVersionList(tmp_software_branch_version_list);
            setSoftwareBranchVersionListFirstIndex(1);
            setSoftwareBranchVersionListLastIndex(tmp_software_branch_version_list.length > 5 ? 5 : tmp_software_branch_version_list.length);
        } else {
            props.addToast("Software Branch Version", `Could not get the desired versions due to: ${published_software_branch_versions_response.reason}`);
        }
        setIsLoadingTable(false);
    }


    const updateSoftwareBranchListHandler = async (softwarePackageId) => {
        setIsLoadingTable(true);
        let tmp_software_branch_list = [];
        const published_software_branches_response = await api_software.branch.getAll(softwarePackageId);
        if (published_software_branches_response.result === true) {
            published_software_branches_response.branches.forEach(branch => {
                tmp_software_branch_list.push([
                    branch,
                    (<span>
                        <a href="#" onClick={() => {
                            setCurrentSoftwareBranch(branch);
                            updateSoftwareBranchVersionListHandler(softwarePackageId, branch);
                        }}>Versions</a>
                        <span> / </span>
                        <a href="#" data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={async () => {
                                const who_can_access_branch_request = await api_software.branch.permissions.getAllowedUsers(softwarePackageId, branch);

                                props.setConfirmModal({
                                    title: `Edit access permissions to branch "${branch}"`,
                                    body: <SoftwareBranchAccessPermissionsFormLayout
                                        allowedUsers={
                                            (who_can_access_branch_request.result === true) ?
                                                (who_can_access_branch_request.allowed === "everyone") ?
                                                    [] : who_can_access_branch_request.allowed
                                                : []
                                        }
                                    />,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Save Changes",
                                    confirmHandler: async () => {
                                        const the_form = $("#software_manager_software_branch_access_permissions_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            const the_form_data = the_form.serializeArray();

                                            let package_id = softwarePackageId, branch_name = branch, clientList = [];
                                            for (let i = 0; i < the_form_data.length; i++) {
                                                const field = the_form_data[i];
                                                switch (field.name) {
                                                    case "allowedUsers":
                                                        clientList.push(field.value);
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                            const branch_access_permissions_update_response = await api_software.branch.permissions.setAllowedUsers(
                                                package_id,
                                                branch_name,
                                                clientList
                                            );
                                            if (branch_access_permissions_update_response.result === true) {
                                                props.addToast("Edit Branch Access Permissions", `${branch_name} access permissions was updated!`);
                                            } else {
                                                props.addToast("Edit Branch Access Permissions", `${branch_name} access permissions were not updated due to: ${branch_access_permissions_update_response.reason}`);
                                            }
                                            updateSoftwareBranchListHandler(package_id);
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                dismissOnConfirm: true,
                                                closeTitle: "",
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            })

                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}>Access Permissions</a>
                        <span> / </span>
                        <a href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={async () => {
                                props.setConfirmModal({
                                    title: "Delete branch " + branch + "?",
                                    body: `Are you sure you want to delete the branch "${branch}"?`,
                                    closeTitle: "No",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Yes",
                                    confirmHandler: async () => {
                                        const software_branch_removal_response = await api_software.branch.remove(softwarePackageId, branch);
                                        if (software_branch_removal_response.result === true) {
                                            props.addToast("Remove Branch", `Branch "${branch}" was removed!`);
                                        } else {
                                            props.addToast("Remove Branch", `Branch "${branch}" was not removed due to: ${software_branch_removal_response.reason}`);
                                        }
                                        updateSoftwareBranchListHandler(softwarePackageId);
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    }
                                })
                            }}>Delete</a>
                    </span>)
                ]);
            });
            setSoftwareBranchList(tmp_software_branch_list);
            setSoftwareBranchListFirstIndex(1);
            setSoftwareBranchListLastIndex(tmp_software_branch_list.length > 5 ? 5 : tmp_software_branch_list.length);
        } else {
            props.addToast("Software Branch", `Could not get ${softwarePackageId} branches due to: ${published_software_branches_response.reason}`);
        }
        setIsLoadingTable(false);
    }

    const [updateSoftwareListHandlerParam, setUpdateSoftwareListHandlerParam] = useState('');
    const updateSoftwareListHandler = async (softwareSearchBarVal = undefined) => {
        const softwareSearchBar = softwareSearchBarVal === undefined ? updateSoftwareListHandlerParam : softwareSearchBarVal;
        if (softwareSearchBarVal !== undefined) setUpdateSoftwareListHandlerParam(softwareSearchBarVal);

        setIsLoadingTable(true);
        let tmp_software_list = [];
        try {
            const published_software = await api_software.software.getPublishedSoftwareList(softwareSearchBar.split(" "));
            published_software.forEach(software => {
                tmp_software_list.push([
                    software.package_id,
                    software.name,
                    (<span>
                        <a href="#" onClick={() => {
                            setCurrentSoftware(software.package_id);
                            updateSoftwareBranchListHandler(software.package_id);
                        }}>Branches</a>
                        <span> / </span>
                        <a href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={() => {
                                props.setConfirmModal({
                                    title: "Edit " + software.name,
                                    body: <SoftwareFormLayout
                                        package_id={software.package_id}
                                        name={software.name}
                                        description={software.description}
                                        tags={software.tags}
                                    />,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Save Changes",
                                    confirmHandler: () => {
                                        const the_form = $("#software_manager_software_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            const the_form_data = the_form.serializeArray();

                                            let old_package_id = software.package_id, new_package_id, new_name, new_description, tags = [];
                                            for (let i = 0; i < the_form_data.length; i++) {
                                                const field = the_form_data[i];
                                                switch (field.name) {
                                                    case "package_id":
                                                        new_package_id = field.value;
                                                        break;
                                                    case "name":
                                                        new_name = field.value;
                                                        break;
                                                    case "description":
                                                        new_description = field.value;
                                                        break;
                                                    case "tags":
                                                        tags.push(field.value);
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                            const software_change_response = await api_software.software.edit(
                                                old_package_id,
                                                new_package_id,
                                                new_name,
                                                new_description,
                                                tags
                                            );
                                            if (software_change_response.result === true) {
                                                props.addToast("Edit Software", `${old_package_id} was updated!`);
                                            } else {
                                                props.addToast("Edit Software", `${old_package_id} was not updated due to: ${software_change_response.reason}`);
                                            }
                                            updateSoftwareListHandler();
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                dismissOnConfirm: true,
                                                closeTitle: "",
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            })

                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}>Edit</a>
                        <span> / </span>
                        <a href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={() => {
                                props.setConfirmModal({
                                    title: "Delete " + software.name + "?",
                                    body: `Are you sure you want to delete the "${software.name}"?`,
                                    closeTitle: "No",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Yes",
                                    confirmHandler: async () => {
                                        const software_removal_response = await api_software.software.remove(software.package_id);
                                        if (software_removal_response.result === true) {
                                            props.addToast("Remove Software", `${software.package_id} was removed!`);
                                        } else {
                                            props.addToast("Remove Software", `${software.package_id} was not removed due to: ${software_removal_response.reason}`);
                                        }
                                        updateSoftwareListHandler();
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    }
                                })
                            }}>Delete</a>
                    </span>)
                ]);
            });
        } catch (err) {
            props.addToast("Edit Software", `An error happened`);
        }
        setSoftwareList(tmp_software_list);
        setSoftwareListFirstIndex(1);
        setSoftwareListLastIndex(tmp_software_list.length > 5 ? 5 : tmp_software_list.length);
        setIsLoadingTable(false);

    }

    useEffect(() => {
        updateSoftwareListHandler();

        return () => {

        };

    }, []);

    switch (props.currentContainer) {
        case "dashboard":
            return (
                <div className="container-fluid realbody">
                    <div className="d-sm-flex justify-content-between align-items-center mb-4">
                        <h3 className="text-dark mb-0">Welcome</h3>
                    </div>
                    <div className="row">
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

        case "software_management":
            return (
                <div className="container-fluid realbody">
                    <nav aria-label="breadcrumb">
                        <ol className="breadcrumb">
                            <li className="breadcrumb-item"><a href="#"></a></li>
                            <li className="breadcrumb-item active"><a href="#" onClick={() => {
                                breadcrumbMenu.openRoot();
                            }}>Software List</a></li>
                            {(currentSoftware !== "") &&
                                (<li className="breadcrumb-item active"><a href="#" onClick={() => {
                                    breadcrumbMenu.openSoftwareBranch()
                                }}>
                                    {currentSoftware}
                                </a></li>)
                            }

                            {(currentSoftwareBranch !== "") &&
                                (<li className="breadcrumb-item active"><a href="#" onClick={() => {
                                    setCurrentSoftwareBranchVersion('');
                                    setCurrentSoftwareBranchVersionPlatforms(false);
                                    setCurrentSoftwareBranchVersionFiles(false);
                                }}>
                                    {currentSoftwareBranch}
                                </a></li>)
                            }

                            {(currentSoftwareBranchVersion !== "") &&
                                (<li className="breadcrumb-item active"><a href="#" onClick={() => {
                                    breadcrumbMenu.openSoftwareBranchVersion();
                                }}>
                                    {currentSoftwareBranchVersion}
                                </a></li>)
                            }
                        </ol>
                    </nav>
                    <div className="d-sm-flex justify-content-between align-items-center mb-4">
                        <h3 className="text-dark mb-0">Software Management</h3>
                    </div>
                    {isLoadingTable &&
                        (<div className="loading_table_background">
                            <div className="loading_table_animation">
                            </div>
                        </div>)
                    }
                    {(currentSoftware === "") &&
                        <CustomTable
                            title="Software List"
                            header={['Package ID', 'Name', 'Action']}
                            body={softwareList.slice(softwareListFirstIndex - 1, softwareListLastIndex)}
                            totalNumElems={softwareList.length}
                            onIndexChanged={(numFirst, numLast) => {
                                setSoftwareListFirstIndex(numFirst);
                                setSoftwareListLastIndex(numLast >
                                    softwareList.length ? softwareList.length :
                                    numLast
                                );
                                return true;
                            }}
                            onRefresh={async () => {
                                await updateSoftwareListHandler();
                            }}
                            extraButtonText={<span><i className="fas fa-laptop-code"></i> New Software</span>}
                            onExtraButtonClick={() => {
                                $('#confirmModal').modal('toggle');
                                props.setConfirmModal({
                                    title: "Create a new Software",
                                    body: <SoftwareFormLayout
                                    />,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Create",
                                    confirmHandler: () => {
                                        const the_form = $("#software_manager_software_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            const the_form_data = the_form.serializeArray();

                                            let package_id, new_name, new_description, tags = [];
                                            for (let i = 0; i < the_form_data.length; i++) {
                                                const field = the_form_data[i];
                                                switch (field.name) {
                                                    case "package_id":
                                                        package_id = field.value;
                                                        break;
                                                    case "name":
                                                        new_name = field.value;
                                                        break;
                                                    case "description":
                                                        new_description = field.value;
                                                        break;
                                                    case "tags":
                                                        tags.push(field.value);
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                            const software_creation_response = await api_software.software.create(
                                                package_id,
                                                new_name,
                                                new_description,
                                                tags
                                            );
                                            if (software_creation_response.result === true) {
                                                props.addToast("Edit Software", `${package_id} was created!`);
                                            } else {
                                                props.addToast("Edit Software", `${package_id} was not created due to: ${software_creation_response.reason}`);
                                            }
                                            updateSoftwareListHandler();
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                closeTitle: "",
                                                dismissOnConfirm: true,
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            })

                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}
                            onSearch={async (value) => {
                                await updateSoftwareListHandler(value);
                            }}
                        />
                    }
                    {
                        (currentSoftwareBranch === "" && currentSoftware !== "") &&
                        <CustomTable
                            title="Branch List"
                            header={['Branch', 'Action']}
                            body={softwareBranchList.slice(softwareBranchListFirstIndex - 1, softwareBranchListLastIndex)}
                            totalNumElems={softwareBranchList.length}
                            onIndexChanged={(numFirst, numLast) => {
                                setSoftwareBranchListFirstIndex(numFirst);
                                setSoftwareBranchListLastIndex(numLast >
                                    softwareBranchList.length ? softwareBranchList.length :
                                    numLast
                                );
                                return true;
                            }}
                            onRefresh={async () => {
                                await updateSoftwareBranchListHandler(currentSoftware);
                            }}
                            extraButtonText={<span><i className="fas fa-code-branch"></i> New Branch</span>}
                            onExtraButtonClick={() => {
                                $('#confirmModal').modal('toggle');
                                props.setConfirmModal({
                                    title: "Create a new Branch",
                                    body: <SoftwareBranchFormLayout
                                        package_id={currentSoftware}
                                    />,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Create",
                                    confirmHandler: () => {
                                        const the_form = $("#software_manager_software_branch_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            const the_form_data = the_form.serializeArray();

                                            let package_id, branch_name;
                                            for (let i = 0; i < the_form_data.length; i++) {
                                                const field = the_form_data[i];
                                                switch (field.name) {
                                                    case "package_id":
                                                        package_id = field.value;
                                                        break;
                                                    case "name":
                                                        branch_name = field.value;
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                            const software_branch_creation_response = await api_software.branch.create(
                                                package_id,
                                                branch_name
                                            );
                                            if (software_branch_creation_response.result === true) {
                                                props.addToast("Edit Software", `Branch ${branch_name} was created!`);
                                            } else {
                                                props.addToast("Edit Software", `Branch ${branch_name} was not created due to: ${software_branch_creation_response.reason}`);
                                            }
                                            updateSoftwareBranchListHandler(package_id);
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                closeTitle: "",
                                                dismissOnConfirm: true,
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            })

                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}
                        />
                    }

                    {
                        (currentSoftwareBranchVersion === "" && currentSoftwareBranch !== "" && currentSoftware !== "") &&
                        <CustomTable
                            title="Version List"
                            header={['Version', 'Action']}
                            body={softwareBranchVersionList.slice(softwareBranchVersionListFirstIndex - 1, softwareBranchVersionListLastIndex)}
                            totalNumElems={softwareBranchVersionList.length}
                            onIndexChanged={(numFirst, numLast) => {
                                setSoftwareBranchVersionListFirstIndex(numFirst);
                                setSoftwareBranchVersionListLastIndex(numLast >
                                    softwareBranchVersionList.length ? softwareBranchVersionList.length :
                                    numLast
                                );
                                return true;
                            }}
                            onRefresh={async () => {
                                await updateSoftwareBranchVersionListHandler(currentSoftware, currentSoftwareBranch);
                            }}
                            extraButtonText={<span><i className="fas fa-laptop-code"></i> New Version</span>}
                            onExtraButtonClick={() => {
                                $('#confirmModal').modal('toggle');
                                props.setConfirmModal({
                                    title: "Create a new Version",
                                    body: <SoftwareBranchVersionFormLayout />,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            closeTitle: "",
                                            dismissOnConfirm: true,
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Create",
                                    confirmHandler: () => {
                                        const the_form = $("#software_manager_software_branch_version_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            const the_form_data = the_form.serializeArray();

                                            let package_id = currentSoftware, branch_name = currentSoftwareBranch, major, minor, patch, changelog;
                                            for (let i = 0; i < the_form_data.length; i++) {
                                                const field = the_form_data[i];
                                                switch (field.name) {
                                                    case "major":
                                                        major = field.value;
                                                        break;
                                                    case "minor":
                                                        minor = field.value;
                                                        break;
                                                    case "patch":
                                                        patch = field.value;
                                                        break;
                                                    case "changelog":
                                                        changelog = field.value;
                                                        break;
                                                    default:
                                                        break;
                                                }
                                            }
                                            const software_branch_version_creation_response = await api_software.version.create(
                                                package_id,
                                                branch_name,
                                                major,
                                                minor,
                                                patch,
                                                changelog
                                            );
                                            if (software_branch_version_creation_response.result === true) {
                                                props.addToast("Create Version", `Version ${major}.${minor}.${patch} was created!`);
                                            } else {
                                                props.addToast("Create Version", `Version ${major}.${minor}.${patch} was not created due to: ${software_branch_version_creation_response.reason}`);
                                            }
                                            updateSoftwareBranchVersionListHandler(package_id, branch_name);
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                dismissOnConfirm: true,
                                                closeTitle: "",
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            })

                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}
                        />
                    }

                    {
                        (currentSoftwareBranchVersionPlatforms === true && currentSoftwareBranchVersion !== "" && currentSoftwareBranch !== "" && currentSoftware !== "") &&
                        <CustomTable
                            title="Platform List"
                            header={['Platform', 'OS Version', 'Architecture', 'Filename', 'Action']}
                            body={softwareBranchVersionPlatformList.slice(softwareBranchVersionPlatformListFirstIndex - 1, softwareBranchVersionPlatformListLastIndex)}
                            totalNumElems={softwareBranchVersionPlatformList.length}
                            onIndexChanged={(numFirst, numLast) => {
                                setSoftwareBranchVersionPlatformListFirstIndex(numFirst);
                                setSoftwareBranchVersionPlatformListLastIndex(numLast >
                                    softwareBranchVersionPlatformList.length ? softwareBranchVersionPlatformList.length :
                                    numLast
                                );
                                return true;
                            }}
                            onRefresh={async () => {
                                await updateSoftwareBranchVersionPlatformListHandler(currentSoftware, currentSoftwareBranch, currentSoftwareBranchVersion.split(".")[0], currentSoftwareBranchVersion.split(".")[1], currentSoftwareBranchVersion.split(".")[2]);
                            }}
                            extraButtonText={<span><i className="fas fa-laptop"></i> Add Platform</span>}
                            onExtraButtonClick={async () => {
                                setIsLoadingTable(true);
                                const availablePlatformsOnTheSystem = await api_software.getAllPlatforms();
                                const availableFilesFromSoftwareVersion = await api_software.files.getAll(currentSoftware, currentSoftwareBranch, currentSoftwareBranchVersion.split(".")[0], currentSoftwareBranchVersion.split(".")[1], currentSoftwareBranchVersion.split(".")[2]);
                                setIsLoadingTable(false);
                                if (availablePlatformsOnTheSystem.result === true && availableFilesFromSoftwareVersion.result === true) {
                                    $('#confirmModal').modal('toggle');
                                    props.setConfirmModal({
                                        title: "Add a platform",
                                        body: <SoftwareBranchVersionPlatformFormLayout
                                            availablePlatforms={availablePlatformsOnTheSystem.supported_platforms}
                                            fileList={availableFilesFromSoftwareVersion.fileList}
                                        />,
                                        closeTitle: "Cancel",
                                        closeHandler: () => {
                                            props.setConfirmModal({
                                                title: "",
                                                body: "",
                                                dismissOnConfirm: true,
                                                closeTitle: "",
                                                closeHandler: () => { },
                                                confirmTitle: "",
                                                confirmHandler: () => { }
                                            });
                                        },
                                        confirmTitle: "Add",
                                        confirmHandler: () => {
                                            const the_form = $("#software_manager_software_branch_version_platform_form_layout");
                                            const handleTheForm = async (event) => {
                                                event.preventDefault();
                                                const the_form_data = the_form.serializeArray();

                                                let package_id = currentSoftware,
                                                    branch_name = currentSoftwareBranch,
                                                    major = currentSoftwareBranchVersion.split(".")[0],
                                                    minor = currentSoftwareBranchVersion.split(".")[1],
                                                    patch = currentSoftwareBranchVersion.split(".")[2],
                                                    platform, architecture, os_version, filename
                                                for (let i = 0; i < the_form_data.length; i++) {
                                                    const field = the_form_data[i];
                                                    switch (field.name) {
                                                        case "filename":
                                                            filename = field.value;
                                                            break;
                                                        case "osVersion":
                                                            os_version = field.value;
                                                            break;
                                                        case "platform":
                                                            platform = field.value;
                                                            break;
                                                        case "architecture":
                                                            architecture = field.value;
                                                            break;
                                                        default:
                                                            break;
                                                    }
                                                }
                                                const software_branch_version_creation_response = await api_software.platform.add(
                                                    package_id,
                                                    branch_name,
                                                    major,
                                                    minor,
                                                    patch,
                                                    platform,
                                                    architecture,
                                                    os_version,
                                                    filename
                                                );
                                                if (software_branch_version_creation_response.result === true) {
                                                    props.addToast("Add a Platform", `Platform ${platform}-${architecture}-${os_version} was added!`);
                                                } else {
                                                    props.addToast("Add a Platform", `Platform ${platform}-${architecture}-${os_version} was not added due to: ${software_branch_version_creation_response.reason}`);
                                                }
                                                updateSoftwareBranchVersionPlatformListHandler(
                                                    package_id, branch_name,
                                                    major, minor, patch
                                                );
                                                props.setConfirmModal({
                                                    title: "",
                                                    body: "",
                                                    dismissOnConfirm: true,
                                                    closeTitle: "",
                                                    closeHandler: () => { },
                                                    confirmTitle: "",
                                                    confirmHandler: () => { }
                                                })

                                            }
                                            the_form.on('submit', handleTheForm);
                                            the_form.submit();
                                        }
                                    })
                                } else {
                                    props.addToast("Add a Platform", `Version ${major}.${minor}.${patch} was not created due to: ${software_branch_version_creation_response.reason}`);
                                }
                            }}
                        />
                    }

                    {
                        (currentSoftwareBranchVersionFiles === true && currentSoftwareBranchVersion !== "" && currentSoftwareBranch !== "" && currentSoftware !== "") &&
                        <CustomTable
                            title="File List"
                            header={['Filename', 'Action']}
                            body={softwareBranchVersionFileList.slice(softwareBranchVersionFileListFirstIndex - 1, softwareBranchVersionFileListLastIndex)}
                            totalNumElems={softwareBranchVersionFileList.length}
                            onIndexChanged={(numFirst, numLast) => {
                                setSoftwareBranchVersionFileListFirstIndex(numFirst);
                                setSoftwareBranchVersionFileListLastIndex(numLast >
                                    softwareBranchVersionFileList.length ? softwareBranchVersionFileList.length :
                                    numLast
                                );
                                return true;
                            }}
                            onRefresh={async () => {
                                await updateSoftwareBranchVersionFileListHandler(currentSoftware, currentSoftwareBranch, currentSoftwareBranchVersion.split(".")[0], currentSoftwareBranchVersion.split(".")[1], currentSoftwareBranchVersion.split(".")[2]);
                            }}
                            extraButtonText={<span><i className="fas fa-laptop"></i> Upload Package</span>}
                            onExtraButtonClick={async () => {
                                $('#confirmModal').modal('toggle');
                                props.setConfirmModal({
                                    title: "Upload package",
                                    body: <SoftwareBranchVersionFileUploadFormLayout
                                        package_id={currentSoftware}
                                        branch_name={currentSoftwareBranch}
                                        major={currentSoftwareBranchVersion.split(".")[0]}
                                        minor={currentSoftwareBranchVersion.split(".")[1]}
                                        patch={currentSoftwareBranchVersion.split(".")[2]}
                                    />,
                                    dismissOnConfirm: false,
                                    closeTitle: "Cancel",
                                    closeHandler: () => {
                                        props.setConfirmModal({
                                            title: "",
                                            body: "",
                                            dismissOnConfirm: true,
                                            closeTitle: "",
                                            closeHandler: () => { },
                                            confirmTitle: "",
                                            confirmHandler: () => { }
                                        });
                                    },
                                    confirmTitle: "Upload",
                                    confirmHandler: () => {
                                        const the_form = $("#software_manager_software_branch_version_file_upload_form_layout");
                                        const handleTheForm = async (event) => {
                                            event.preventDefault();
                                            console.log("Uploading...");
                                            var formData = new FormData(document.getElementById('software_manager_software_branch_version_file_upload_form_layout'));

                                            props.setConfirmModal(prevState => {
                                                return {
                                                    ...prevState,
                                                    confirmTitle: 'Uploading...',
                                                    closeTitle: ''
                                                }
                                            });
                                            $.ajax({
                                                url: '/api/software/branch/version/upload',
                                                data: formData,
                                                cache: false,
                                                contentType: false,
                                                processData: false,
                                                method: 'POST',
                                                type: 'POST', // For jQuery < 1.9
                                                xhr: function () {
                                                    var xhr = $.ajaxSettings.xhr();
                                                    xhr.upload.onprogress = function (e) {
                                                        // For uploads
                                                        if (e.lengthComputable) {
                                                            let progress = Math.round((e.loaded / e.total) * 100);
                                                            console.log("Uploaded " + ((e.loaded / e.total) * 100) + " of " + e.total);
                                                            $("#package_upload_progrees_bar").attr('aria-valuenow', progress).css('width', progress + '%');
                                                            $("#package_upload_progrees_bar").html(progress + '%');

                                                        }
                                                    };
                                                    return xhr;
                                                },
                                                success: function (data) {
                                                    if (data.result === true) {
                                                        props.addToast("Package Upload", `Package uploaded!`);
                                                    } else {
                                                        props.addToast("Package Upload", `Package not uploaded due to: ${data.reason}`);
                                                    }
                                                    $("#confirmModal").modal('toggle');
                                                    updateSoftwareBranchVersionFileListHandler(currentSoftware, currentSoftwareBranch, currentSoftwareBranchVersion.split(".")[0], currentSoftwareBranchVersion.split(".")[1], currentSoftwareBranchVersion.split(".")[2]);
                                                    props.setConfirmModal({
                                                        title: "",
                                                        body: "",
                                                        dismissOnConfirm: true,
                                                        closeTitle: "",
                                                        closeHandler: () => { },
                                                        confirmTitle: "",
                                                        confirmHandler: () => { }
                                                    });
                                                }
                                            });
                                        }
                                        the_form.on('submit', handleTheForm);
                                        the_form.submit();
                                    }
                                })
                            }}
                        />
                    }
                </div >
            );
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
    const [currentContainer, setCurrentContainer] = useState('software_management');

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
                                <span style={{ "color": "rgb(249, 142, 27)" }}>Reh</span><span style={{ "color": "white" }}>@Store</span>
                            </span>
                        </div>
                    </a>
                    <hr className="sidebar-divider my-0" />
                    <ul className="navbar-nav text-light">
                        {/*
                        <li className={`nav-item ${currentContainer === "dashboard" ? "current_nav" : ""}`}>
                            <a className={`nav-link ${currentContainer === "dashboard" ? "active" : ""}`} href="#" onClick={() => { changeContainer("dashboard") }}>
                                <i className="fas fa-tachometer-alt"></i> <span>Dashboard</span>
                            </a>
                        </li>
                        */}
                        <li className={`nav-item ${currentContainer === "software_management" ? "current_nav" : ""}`}>
                            <a className={`nav-link ${currentContainer === "software_management" ? "active" : ""}`} href="#" onClick={() => { changeContainer("software_management") }}>
                                <i className="fas fa-laptop-code"></i> <span>Software Management</span>
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
                            {/*
                            <li className="nav-item dropdown no-arrow mx-1">
                                <div className="nav-item dropdown no-arrow">
                                    <a className="nav-link" aria-expanded="false" href="#">
                                        {
                                            props.websocket.connected ? <i className="fas fa-circle" style={{ "color": "var(--bs-green)" }}></i>
                                                : <i className="fas fa-circle" style={{ "color": "var(--bs-red)" }}></i>
                                        }

                                    </a>
                                </div>
                            </li>
                            <li className="nav-item dropdown no-arrow mx-1">
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

const Container = (props) => {
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
        connected: true
    });
    const [confirmModal, setConfirmModal] = useState({
        title: "",
        body: "",
        dismissOnConfirm: true,
        closeTitle: "",
        closeHandler: () => { },
        confirmTitle: "",
        confirmHandler: () => { }
    })


    const handlers = {
        logout: async () => {
            await api_account.logout();
            setUsername('');
            setShowPannel(false);
            setShowLoginForm(true);
            handlers.addToast("Logout", "Logged out!");
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
                dismissOnConfirm={confirmModal.dismissOnConfirm}
                confirmHandler={confirmModal.confirmHandler}
            />
            <NotificationManager toasts={toasts} removeToast={handlers.removeToast} />
            {showLoginForm &&
                <LoginForm
                    addToast={handlers.addToast}
                    setShowPannel={setShowPannel}
                    setShowLoginForm={setShowLoginForm}
                    setUsername={setUsername}
                />
            }
            {
                showPannel &&
                <Pannel
                    username={username}
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

