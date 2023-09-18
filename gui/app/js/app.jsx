'use strict';

const { useEffect, useState } = require("react");
const ReactDOM = require('react-dom');

//#region Navbar's
const LateralNavbar = (props) => {
    const [currentTab, setCurrentTab] = useState(props.currentLateralNavbarSelectedItem || '');

    let tabList = props.tabList || [];

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

    return (<nav className="navbar navbar-dark fixed-top align-items-start sidebar sidebar-dark accordion bg-gradient-primary p-0" style={{
        "color": "rgb(133, 135, 150)",
        "background": "var(--bs-blue)",
        "overflow": "hidden",
        "zIndex": "1"
    }}>
        <div className="container-fluid d-flex flex-column p-0">
            <a className="navbar-brand d-flex justify-content-center align-items-center sidebar-brand m-0" >

            </a>
            <hr className="sidebar-divider my-0" />
            <ul className="navbar-nav text-light">
                {tabList.length > 0 &&
                    tabList.map((tab, index) => {
                        return (
                            <li className={`nav-item ${currentTab === tab.text ? "current_nav" : ""}`} onClick={() => {
                                if (tab.onClick !== undefined)
                                    tab.onClick();
                                else {
                                    setCurrentTab(tab.text);
                                    props.setCurrentLateralNavbarSelectedItem(tab.text);
                                }
                            }}>
                                <a className={`nav-link ${currentTab === tab.text ? "active" : ""}`} href="#">
                                    <i className={tab.icon}></i> <span>{tab.text}</span>
                                </a>
                            </li>
                        );
                    })
                }
            </ul>
            <div className="text-center d-none d-md-inline">
                <button className="btn rounded-circle border-0" onClick={toogleSidebarHandler} id="sidebarToggle" type="button"></button>
            </div>
        </div>
    </nav>);
}
const TopNavbar = (props) => {
    const [connected, setConnected] = useState(false);

    const [downloadProgress, setDownloadProgress] = useState(0);
    useEffect(() => {
        event_emmiter.create('software-manager-download-progress', (arg) => {
            setDownloadProgress(arg === 1 ? 0 : arg * 100);
        });

        event_emmiter.create('manual-instructions-open', (arg) => {
            props.setIsLoadingTable(false);
        });

        return () => {
            event_emmiter.delete('software-manager-download-progress');
            event_emmiter.delete('manual-instructions-open');
        }
    });

    const [softwareRunningList, setSoftwareRunningList] = useState([]);
    useEffect(() => {
        event_emmiter.create('software-running-list', (arg) => {
            setSoftwareRunningList(arg);
        });
        let runningListRefreshInterval = setInterval(() => {
            event_emmiter.send('software-running-list');
        }, 1000);

        return () => {
            event_emmiter.delete('software-running-list');
            clearInterval(runningListRefreshInterval);
        }
    }, []);


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
        <nav
            className="navbar navbar-light navbar-expand fixed-top bg-white shadow mb-4 topbar static-top"
            id="navbar_top"
            style={{
                "zIndex": 1
            }}
            ref={(node) => {
                if (node) {
                    node.style.setProperty(
                        "background",
                        "linear-gradient(to right, #224abe 0% " + downloadProgress + "% , #FFFFFF " + downloadProgress + "% " + (100 - downloadProgress) + "%)",
                        "important"
                    );
                }
            }}
        >
            <div className="container-fluid">
                <button className="btn btn-link d-md-none rounded-circle me-3" type="button" onClick={toogleSidebarHandler}>
                    <i className="fas fa-bars"></i>
                </button>
                {softwareRunningList.length > 0 &&
                    <div className="badge bg-primary text-wrap">
                        {languagePack.executing_software_and_others[0]}<span class="fst-italic">'{softwareRunningList[0].name}'</span>{
                            softwareRunningList.length > 1 ? (<span>{languagePack.executing_software_and_others[1]} {softwareRunningList.length - 1}{
                                languagePack.executing_software_and_others[2]
                            }</span>) : ''}
                    </div>
                }
                <ul className="navbar-nav flex-nowrap ms-auto">
                    <li className="nav-item dropdown no-arrow mx-1">
                        <div className="nav-item dropdown no-arrow">
                            <a className="dropdown-toggle nav-link" aria-expanded="false" data-bs-toggle="dropdown" href="#">
                                <i className="fas fa-info-circle" style={{ "padding": "7px" }}></i>
                                <span className="d-none d-lg-inline me-2 text-gray-600 small">{languagePack.help}</span>
                            </a>
                            <div className="dropdown-menu shadow dropdown-menu-end animated--grow-in">
                                {props.userGroups.includes('client') &&
                                    <a className="dropdown-item" href="#" onClick={() => {
                                        props.setIsLoadingTable(true);
                                        event_emmiter.send('manual-instructions-open', 'client');
                                    }}>
                                        <i className="fas fa-book fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.client_instruction_manual}
                                    </a>
                                }
                                {props.userGroups.includes('publisher') &&
                                    <a className="dropdown-item" href="#" onClick={() => {
                                        props.setIsLoadingTable(true);
                                        event_emmiter.send('manual-instructions-open', 'publisher');
                                    }}>
                                        <i className="fas fa-book fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.publisher_instruction_manual}
                                    </a>
                                }
                                {props.userGroups.includes('admin') &&
                                    <a className="dropdown-item" href="#" onClick={() => {
                                        props.setIsLoadingTable(true);
                                        event_emmiter.send('manual-instructions-open', 'admin');
                                    }}>
                                        <i className="fas fa-book fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.administrator_instruction_manual}
                                    </a>
                                }
                            </div>
                            {/*<a className="nav-link" aria-expanded="false">
                                <span>Connection {
                                    connected ?
                                        <i className="fas fa-circle" style={{ "color": "var(--bs-green)" }}></i>
                                        :
                                        <i className="fas fa-circle" style={{ "color": "var(--bs-red)" }}></i>
                                }</span>
                            </a>
                            */}
                        </div>
                    </li>
                    <div className="d-none d-sm-block topbar-divider"></div>
                    <li className="nav-item dropdown no-arrow">
                        <div className="nav-item dropdown no-arrow">
                            <a className="dropdown-toggle nav-link" aria-expanded="false" data-bs-toggle="dropdown" href="#">
                                <span className="d-none d-lg-inline me-2 text-gray-600 small">{props.username}</span>
                                <i className="border rounded-circle fas fa-user" style={{ "padding": "7px" }}></i>
                            </a>
                            <div className="dropdown-menu shadow dropdown-menu-end animated--grow-in">
                                <a className="dropdown-item" href="#" data-bs-toggle="modal" data-bs-target="#editAccountModal" onClick={() => {
                                    props.setIsLoadingTable(true);
                                    event_emmiter.send('account-manager-getDetails-channel', "");
                                }}>
                                    <i className="fas fa-user-cog fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.my_account}
                                </a>
                                <a className="dropdown-item" href="#" onClick={() => {
                                    event_emmiter.send('software-backup-data', "");
                                }}>
                                    <i className="fas fa-cloud-upload-alt fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.backup_data_to_cloud}
                                </a>
                                <a className="dropdown-item" href="#" onClick={() => {
                                    event_emmiter.send('rehstore-clear-cache', "");
                                }}>
                                    <i className="fas fa-eraser fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.clear_cache}
                                </a>
                                <a className="dropdown-item" href="#" onClick={props.logoutHandler}>
                                    <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.logout}
                                </a>
                                <a className="dropdown-item" href="#" onClick={props.exitHandler}>
                                    <i className="fas fa-sign-out-alt fa-sm fa-fw me-2 text-gray-400"></i>&nbsp;{languagePack.exit_rehstore}
                                </a>
                            </div>
                        </div>
                    </li>
                </ul>
            </div>
        </nav>
    );
}
//#endregion

//#region Bootstrap Based Components
const ConfirmModal = (props) => {
    return (
        <div className="modal fade" id="confirmModal" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="confirmModal" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="staticBackdropLabel">{props.settings.title}</h5>
                    </div>
                    <div className="modal-body">{props.settings.body}</div>
                    <div className="modal-footer">
                        {(props.settings.closeButton.text !== "" &&
                            <button type="button" className="btn btn-secondary" data-bs-dismiss="modal" onClick={props.settings.closeButton.onClick}>{props.settings.closeButton.text}</button>
                        )}
                        {(props.settings.confirmButton.text !== "" &&
                            <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={props.settings.confirmButton.onClick}>{props.settings.confirmButton.text}</button>
                        )}
                    </div>
                </div>
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
                            <label className="form-label">{languagePack.show} <select className="d-inline-block form-select form-select-sm" onChange={listSizeChangeHandler}
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
                                    placeholder={languagePack.search}
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
                            {languagePack.showing} {(currentPage * listViewSize) - listViewSize + 1} {languagePack.to} {(currentPage * listViewSize) > props.recordNumber ? props.recordNumber : (currentPage * listViewSize)} {languagePack.of} {props.recordNumber}
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
const CustomTableBak = (props) => {
    /**
     * We never send all the list to the react interface. If we do, the browser will crash.
     * We need to tell this component what the real number of rows are. This is obtained from the server.
     * Then, the value is passed to this components propertie named "recordNumber"
     */
    const [listViewSize, setListViewSize] = useState(5);
    const [currentPage, setCurrentPage] = useState(1);

    const listSizeChangeHandler = (event) => {
        const max_sub_table = Math.ceil(props.recordNumber / event.target.value);

        if (currentPage > max_sub_table) setCurrentPage(max_sub_table);
        if (currentPage < 1) setCurrentPage(1);

        setListViewSize(event.target.value);
    }

    const searchBarHandler = (event) => {
        props.setSearchBar(event.target.value);
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
                            }}><i className="fas fa-sync"></i></button>
                    </span>)
                }
            </div>
            <div className="card-body">
                <div className="row">
                    <div className="col-md-6 text-nowrap">
                        <div id="dataTable_length" className="dataTables_length" aria-controls="dataTable">
                            <label className="form-label">{languagePack.show} <select className="d-inline-block form-select form-select-sm" onChange={listSizeChangeHandler}
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
                            <label className="form-label input-group input-group-sm">
                                <button
                                    className="btn btn-outline-secondary"
                                    type="button"
                                    id="search_bar_button"
                                    onClick={() => {
                                        try { props.searchBarButton(); } catch (err) { }
                                    }}><i className="fas fa-search"></i></button>
                                <input
                                    type="text"
                                    className="form-control form-control-sm"
                                    placeholder={languagePack.search}
                                    defaultValue=""
                                    aria-controls="dataTable"
                                    onChange={searchBarHandler}
                                    onKeyUp={(event) => {
                                        if (event.keyCode === 13) {
                                            try { props.searchBarButton(); } catch (err) { }
                                        }
                                    }}
                                    aria-describedby="search_bar_button" />
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
                            {languagePack.showing} {(currentPage * listViewSize) - listViewSize + 1} {languagePack.to} {(currentPage * listViewSize) > props.recordNumber ? props.recordNumber : (currentPage * listViewSize)} {languagePack.of} {props.recordNumber}
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
                                <label className="form-label">{languagePack.show} <select className="d-inline-block form-select form-select-sm" onChange={(event) => {
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
                                        placeholder={languagePack.search}
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
                                {languagePack.showing} {subTable.element.getFirst()} {languagePack.to} {subTable.element.getLast()} {languagePack.of} {props.totalNumElems}
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
//#endregion


const AppGrid = (props) => {

    const [isMouseHoverSyncButton, setIsMouseHoverSyncButton] = useState(false);
    return (
        <div className="card" style={{ "width": "12rem" }}>

            {props.iconPath !== '' &&
                <img src={props.iconPath} className="card-img-top" alt="..."
                    style={{
                        borderRadius: '10px'
                    }} />
            }
            <div className="card-body text-center">
                <h5 className="card-title">{props.name}</h5>
                <p className="card-text"
                ><span>{props.branch}</span>.<span>{props.version}</span></p>
                {props.executable &&
                    <i className="fas fa-play btn"
                        style={{ "marginRight": "1rem", "cursor": "pointer" }}
                        onClick={() => {
                            event_emmiter.send('software-manager-startApp-channel', props.folder_path);
                        }}
                    ></i>
                }
                {props.manual !== '' &&
                    <i className="fas fa-book"
                        style={{ "marginRight": "1rem", "cursor": "pointer" }}
                        onClick={() => {
                            event_emmiter.send('manual-reader-pannel-open', {
                                manual: props.manual,
                                package_id: props.package_id,
                                branch: props.branch,
                                version: props.version
                            });
                        }}
                    ></i>
                }
                {(!props.userGroups.includes('publisher') && !props.userGroups.includes('admin')) &&
                    <i
                        className={"fas fa-sync-alt btn " + (isMouseHoverSyncButton ? "fa-spin" : '')}
                        onMouseEnter={() => { setIsMouseHoverSyncButton(true); }}
                        onMouseLeave={() => { setIsMouseHoverSyncButton(false); }}
                        onClick={() => {
                            event_emmiter.send("software-manager-update-package", {
                                name: props.name,
                                package_id: props.package_id,
                                branch: props.branch,
                                major: props.version.split(".")[0],
                                minor: props.version.split(".")[1],
                                patch: props.version.split(".")[2]
                            })
                        }}
                    ></i>
                }
                <i
                    className="fas fa-trash-alt btn"
                    style={{ "marginLeft": "1rem", "cursor": "pointer" }}
                    data-bs-toggle="modal" data-bs-target="#confirmModal"
                    onClick={() => {
                        props.openConfirmationModal(
                            languagePack.delete_app, `${languagePack.delete} ${props.name}?`,
                            languagePack.cancel, () => { },
                            languagePack.delete, () => {
                                software_manager.delete(props.folder_path);
                                props.resetConfirmModal();
                            }
                        )
                    }}
                ></i>
            </div>
        </div>
    );
}

const AppList = (props) => {

    const [isMouseHoverSyncButton, setIsMouseHoverSyncButton] = useState(false);
    return (
        <tr>
            <td className="text-center">
                {props.iconPath !== '' &&
                    <img src={props.iconPath} className="card-img-top" alt="..."
                        style={{
                            height: '2em',
                            width: '2em',
                            borderRadius: '10px'
                        }}
                    />
                }
            </td>
            <td className="text-start">{props.name}</td>
            <td className="text-center"><span>{props.branch}</span>.<span>{props.version}</span></td>
            <td className="text-end">
                <div className="dropdown">
                    <button className="btn btn-secondary btn-sm dropdown-toggle" type="button" id="dropdownMenuButton1" data-bs-toggle="dropdown" aria-expanded="false">
                        <i className="fas fa-ellipsis-v"></i>
                    </button>
                    <ul className="dropdown-menu text-center" aria-labelledby="dropdownMenuButton1">
                        {props.executable &&
                            <li><a className="dropdown-item" href="#" onClick={() => {
                                event_emmiter.send('software-manager-startApp-channel', props.folder_path);
                            }}>
                                <i className="fas fa-play btn"></i> {languagePack.start}</a>
                            </li>
                        }
                        {props.manual !== '' &&
                            <li><a className="dropdown-item" href="#" onClick={() => {
                                event_emmiter.send('manual-reader-pannel-open', {
                                    manual: props.manual,
                                    package_id: props.package_id,
                                    branch: props.branch,
                                    version: props.version
                                });
                            }}>
                                <i className="fas fa-book btn"></i> {languagePack.read_manual}</a>
                            </li>
                        }
                        {(!props.userGroups.includes('publisher') && !props.userGroups.includes('admin')) &&
                            <li><a className="dropdown-item" href="#"
                                onMouseEnter={() => { setIsMouseHoverSyncButton(true); }}
                                onMouseLeave={() => { setIsMouseHoverSyncButton(false); }}
                                onClick={() => {
                                    event_emmiter.send("software-manager-update-package", {
                                        name: props.name,
                                        package_id: props.package_id,
                                        branch: props.branch,
                                        major: props.version.split(".")[0],
                                        minor: props.version.split(".")[1],
                                        patch: props.version.split(".")[2]
                                    })
                                }}>
                                <i className={"fas fa-sync-alt btn " + (isMouseHoverSyncButton ? "fa-spin" : '')}></i> {languagePack.update}</a>
                            </li>
                        }

                        {props.usingDataFolder &&
                            <li><a className="dropdown-item" href="#" onClick={() => {
                                event_emmiter.send('software-open-folder-data', {
                                    package_id: props.package_id,
                                    branch: props.branch,
                                    version: props.version
                                });
                            }}>
                                <i className="fas fa-folder-open btn"></i> {languagePack.open_data_folder}</a>
                            </li>
                        }

                        {(props.userGroups.includes('publisher') || props.userGroups.includes('admin')) &&
                            <li><a className="dropdown-item" href="#" onClick={() => {
                                event_emmiter.send('software-open-folder', {
                                    package_id: props.package_id,
                                    branch: props.branch,
                                    version: props.version
                                });
                            }}>
                                <i className="fas fa-folder-open btn"></i> {languagePack.open_software_folder}</a>
                            </li>
                        }


                        <li><a className="dropdown-item" href="#"
                            data-bs-toggle="modal" data-bs-target="#confirmModal"
                            onClick={() => {
                                props.openConfirmationModal(
                                    languagePack.delete_app, `${languagePack.delete} ${props.name}?`,
                                    languagePack.cancel, () => { },
                                    languagePack.delete, () => {
                                        software_manager.delete(props.folder_path);
                                        props.resetConfirmModal();
                                    }
                                )
                            }}>
                            <i className="fas fa-trash-alt btn"></i> {languagePack.uninstall}</a>
                        </li>
                    </ul>
                </div>
            </td>
        </tr>
    );
}

const EditAccountModal = (props) => {
    const [username, setUsername] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [language, setLanguage] = useState('');
    const [birthDate, setBirthDate] = useState('');
    const [groups, setGroups] = useState([]);
    const [password, setPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');

    useEffect(() => {
        event_emmiter.create('account-manager-getDetails-channel', (arg) => {
            props.setIsLoadingTable(false);
            setUsername(arg.username);
            setFirstName(arg.first_name);
            setLastName(arg.last_name);
            setEmail(arg.email);
            setLanguage(arg.language);
            let tmp_date = new Date(arg.birth_date);
            tmp_date = `${tmp_date.getFullYear()}-${(tmp_date.getMonth() + 1)}-${tmp_date.getDate()}`;
            setBirthDate(tmp_date);
            setGroups(arg.groups);
            setPassword('');
            setNewPassword('');
        });

        props.setIsLoadingTable(true);
        event_emmiter.send('account-manager-getDetails-channel', "");

        event_emmiter.create('account-manager-edit-channel', (arg) => {
            console.log(arg);
        });

        return () => {
            event_emmiter.delete('account-manager-getDetails-channel');
            event_emmiter.delete('account-manager-edit-channel');
        };

    }, []);

    return (
        <div className="modal fade" id="editAccountModal" data-bs-backdrop="static" data-bs-keyboard="false" tabIndex="-1" aria-labelledby="editAccountModal" aria-hidden="true">
            <div className="modal-dialog">
                <div className="modal-content">
                    <div className="modal-header">
                        <h5 className="modal-title" id="staticBackdropLabel">{languagePack.my_account}</h5>
                    </div>
                    <div className="modal-body">
                        <form
                            className="row g-3 needs-validation"
                            noValidate id="account_edit_form"
                            onSubmit={
                                (event) => {
                                    event.preventDefault();
                                }
                            }>
                            <div className="form-floating col-md-5 has-validation">
                                <input
                                    type="text"
                                    className="form-control"
                                    name="username"
                                    placeholder={languagePack.username} readOnly
                                    value={username} />
                                <label htmlFor="username">{languagePack.username}</label>
                            </div>
                            <div className="form-floating col-md-7 has-validation">
                                <select
                                    onChange={(e) => { setLanguage(e.target.value); }}
                                    className="form-control"
                                    name="language"
                                    aria-describedby="languageHelp"
                                    value={language}>
                                    {
                                        language_manager.list(language).map(languaceChoice => {
                                            return (<option value={languaceChoice.code}>{languaceChoice.name}</option>);
                                        })
                                    }
                                </select>
                                <label htmlFor="language">{languagePack.language}</label>
                                <div className="invalid-feedback">
                                    Please choose a {languagePack.language}.
                                </div>
                            </div>
                            <div className="form-floating col-md-6 has-validation">
                                <input
                                    onChange={(e) => { setFirstName(e.target.value); }}
                                    type="text"
                                    className="form-control"
                                    name="firstName"
                                    aria-describedby="firstNameHelp"
                                    placeholder={languagePack.first_name} required
                                    value={firstName} />
                                <label htmlFor="firstName">{languagePack.first_name}</label>
                                <div className="invalid-feedback">
                                    Please choose a {languagePack.first_name}.
                                </div>
                                <small id="firstNameHelp" className="form-text text-muted">
                                    {languagePack.only_letters_are_allowed}
                                </small>
                            </div>
                            <div className="form-floating col-md-6 has-validation">
                                <input
                                    onChange={(e) => { setLastName(e.target.value); }}
                                    type="text"
                                    className="form-control"
                                    name="lastName"
                                    aria-describedby="lastNameHelp"
                                    placeholder={languagePack.last_name} required
                                    value={lastName} />
                                <label htmlFor="lastName">{languagePack.last_name}</label>
                                <div className="invalid-feedback">
                                    Please choose a {languagePack.last_name}.
                                </div>
                                <small id="lastNameHelp" className="form-text text-muted">
                                    {languagePack.only_letters_are_allowed}
                                </small>
                            </div>
                            <div className="form-floating col-md-12 has-validation">
                                <input
                                    onChange={(e) => { setEmail(e.target.value); }}
                                    type="text"
                                    className="form-control"
                                    name="email"
                                    aria-describedby="emailHelp"
                                    placeholder={languagePack.email} required
                                    value={email} />
                                <label htmlFor="email">{languagePack.email}</label>
                                <div className="invalid-feedback">
                                    Please insert a valid {languagePack.email}.
                                </div>
                            </div>
                            <div className="form-floating col-md-6 has-validation">
                                <input
                                    type="text"
                                    className="form-control"
                                    name="birthDate"
                                    placeholder={languagePack.birth_date} readOnly
                                    value={birthDate} />
                                <label htmlFor="username">{languagePack.birth_date}</label>
                            </div>
                            <div className="form-floating col-md-6 has-validation">
                                <input
                                    onChange={(e) => { setPassword(e.target.value); }}
                                    type="password"
                                    className="form-control"
                                    name="password"
                                    aria-describedby="passwordHelp"
                                    placeholder={languagePack.current_password}
                                    value={password} required />
                                <label htmlFor="password">{languagePack.current_password}</label>
                            </div>
                            <div className="form-floating col-md-6 has-validation">
                                <input
                                    onChange={(e) => { setNewPassword(e.target.value); }}
                                    type="password"
                                    className="form-control"
                                    name="newPassword"
                                    aria-describedby="newPasswordHelp"
                                    placeholder={languagePack.new_password}
                                    value={newPassword} />
                                <label htmlFor="newPassword">{languagePack.new_password}</label>
                            </div>
                            <div className="col-md-6">
                                <p>{languagePack.account_type}:</p>
                                <p>
                                    {
                                        groups.map((group_type) => {
                                            switch (group_type) {
                                                case "client":
                                                    return (
                                                        <span className="badge bg-secondary" style={{ marginRight: "0.5rem" }}>{languagePack.client}</span>
                                                    )
                                                case "admin":
                                                    return (
                                                        <span className="badge bg-secondary" style={{ marginRight: "0.5rem" }}>{languagePack.admin}</span>
                                                    )
                                                case "publisher":
                                                    return (
                                                        <span className="badge bg-secondary" style={{ marginRight: "0.5rem" }}>{languagePack.publisher}</span>
                                                    )
                                                default:
                                                    break;
                                            }
                                        })
                                    }
                                </p>
                            </div>
                        </form>
                    </div>
                    <div className="modal-footer">
                        <button type="button" className="btn btn-secondary" data-bs-dismiss="modal">{languagePack.cancel}</button>
                        <button type="button" className="btn btn-primary" data-bs-dismiss="modal" onClick={() => {
                            event_emmiter.send('account-manager-edit-channel', JSON.stringify({
                                new_email: email,
                                current_password: password,
                                new_password: newPassword,
                                first_name: firstName,
                                last_name: lastName,
                                language: language
                            }));
                        }}>{languagePack.change}</button>
                    </div>
                </div>
            </div>
        </div>
    );
}

//#region Each Division Option
const InstalledAppsComponent = (props) => {
    const [installedList, setInstalledList] = useState([]);
    useEffect(() => {
        event_emmiter.create('software-manager-listInstalled-channel', (arg) => {
            setInstalledList(JSON.parse(arg));
        });

        event_emmiter.send('software-manager-listInstalled-channel', "");

        let updateAppListInterval = setInterval(() => {
            event_emmiter.send('software-manager-listInstalled-channel', "");
        }, 3000);

        return () => {
            clearInterval(updateAppListInterval);
        }

    }, []);

    const [gridList, setGridList] = useState(false);

    return (
        <div className="container-fluid realbody">
            <div className="d-sm-flex justify-content-between align-items-center mb-4">
                <h3 className="text-dark mb-0">{languagePack.list_of_installed_apps}</h3>
                <span>
                    <i className="fas fa-th-large installedAppsButton" onClick={() => {
                        setGridList(true);
                    }}
                    ></i> <i className="fas fa-list-alt installedAppsButton" onClick={() => {
                        setGridList(false);
                    }}
                    ></i>
                </span>
            </div>
            {gridList ? (<div className="row gx-3 gy-3">
                {
                    installedList.map(installedApp => {
                        return (
                            <div className="col">
                                <AppGrid
                                    iconPath={installedApp.icon_path}
                                    package_id={installedApp.package_id}
                                    name={installedApp.name}
                                    branch={installedApp.branch}
                                    version={installedApp.version}
                                    folder_path={installedApp.folder_path}
                                    openConfirmationModal={props.openConfirmationModal}
                                    resetConfirmModal={props.resetConfirmModal}
                                    manual={installedApp.manual}
                                    userGroups={props.userGroups}
                                    executable={installedApp.executable}
                                />
                            </div>
                        );
                    })
                }
            </div>) :
                (<table className="table">
                    <thead>
                        <tr>
                            <th scope="col"></th>
                            <th scope="col" className="text-start">{languagePack.name}</th>
                            <th scope="col" className="text-center">{languagePack.branch_and_version}</th>
                            <th scope="col" className="text-end">{languagePack.action}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {
                            installedList.map(installedApp => {
                                return (
                                    <AppList
                                        iconPath={installedApp.icon_path}
                                        package_id={installedApp.package_id}
                                        name={installedApp.name}
                                        branch={installedApp.branch}
                                        version={installedApp.version}
                                        folder_path={installedApp.folder_path}
                                        openConfirmationModal={props.openConfirmationModal}
                                        resetConfirmModal={props.resetConfirmModal}
                                        manual={installedApp.manual}
                                        userGroups={props.userGroups}
                                        executable={installedApp.executable}
                                        usingDataFolder={installedApp.usingDataFolder}
                                    />
                                );
                            })
                        }
                    </tbody>
                </table>)
            }
        </div>
    )
}

const PublisherToolsComponentConfigModal = (props) => {
    const [setupPackageId, setSetupPackageId] = useState([]);
    const [selectedPackageId, setSelectedPackageId] = useState('');
    useEffect(() => {
        console.log(setupPackageId);
        event_emmiter.create('software-manager-getMyPublishedSoftware', (arg) => {
            props.setIsLoadingTable(false);

            if (Array.isArray(arg))
                setSetupPackageId(arg);
            else
                setSetupPackageId([]);

            setSelectedPackageId('');

            setSetupBranch([]);
            setSelectedBranch('');

            setSetupVersion([]);
            setSelectedVersion('');
        })
        return () => {
            event_emmiter.delete('software-manager-getMyPublishedSoftware');
        };
    });

    const [setupBranch, setSetupBranch] = useState([]);
    const [selectedBranch, setSelectedBranch] = useState('');
    useEffect(() => {
        event_emmiter.create('software-manager-getAllBranchAllowedToUse', (arg) => {
            props.setIsLoadingTable(false);

            if (Array.isArray(arg))
                setSetupBranch(arg);
            else
                setSetupBranch([]);

            setSelectedBranch('');

            setSetupVersion([]);
            setSelectedVersion('');
        })
        return () => {
            event_emmiter.delete('software-manager-getAllBranchAllowedToUse');
        };
    }, [setupPackageId]);

    const [setupVersion, setSetupVersion] = useState([]);
    const [selectedVersion, setSelectedVersion] = useState('');
    useEffect(() => {
        event_emmiter.create('software-manager-getSoftwareVersionInsideBranch', (arg) => {
            props.setIsLoadingTable(false);
            console.log(arg);


            if (Array.isArray(arg))
                setSetupVersion(arg);
            else
                setSetupVersion([]);
            setSelectedVersion('');
        })
        return () => {
            event_emmiter.delete('software-manager-getSoftwareVersionInsideBranch');
        };
    }, [setupBranch]);

    return (<form
        className="row g-3 needs-validation"
        noValidate id="form_configure_package"
        onSubmit={
            (event) => {
                event.preventDefault();
            }
        }>
        <div className="form-floating col-md-8 has-validation">
            <select
                className="form-select"
                aria-describedby="package_id"
                value={selectedPackageId}
                onChange={(event) => {
                    props.setIsLoadingTable(true);
                    setSelectedPackageId(event.target.value);
                    event_emmiter.send('software-manager-getAllBranchAllowedToUse', event.target.value);
                }}
                name="package_id" required>
                <option value=''>Select</option>
                {
                    setupPackageId.map(setupPackageIdItem => {
                        return <option value={setupPackageIdItem}>{setupPackageIdItem}</option>
                    })
                }
            </select>
            <label htmlFor="package_id">Package ID <span className="badge bg-danger">Required</span></label>
            <div className="invalid-feedback">
                Please select a package ID
            </div>
        </div>
        <div className="form-floating col-md-8 has-validation">
            <select
                className="form-select"
                aria-describedby="branch"
                value={selectedBranch}
                name="branch" required
                onChange={(event) => {
                    props.setIsLoadingTable(true);
                    setSelectedBranch(event.target.value);

                    event_emmiter.send('software-manager-getSoftwareVersionInsideBranch', {
                        package_id: selectedPackageId,
                        branch: event.target.value
                    });
                }}>
                <option value=''>Select</option>
                {
                    setupBranch.map(setupBranchItem => {
                        return <option value={setupBranchItem}>{setupBranchItem}</option>
                    })
                }
            </select>
            <label htmlFor="branch">Branch <span className="badge bg-danger">Required</span></label>
            <div className="invalid-feedback">
                Please select a branch
            </div>
        </div>
        <div className="form-floating col-md-8 has-validation">
            <select
                className="form-select"
                aria-describedby="version"
                value={selectedVersion}
                name="version" required
                onChange={(event) => {
                    setSelectedVersion(event.target.value);
                }}>
                <option value=''>Select</option>
                {
                    setupVersion.map(setupVersionItem => {
                        let setupVersionItemValue = setupVersionItem.major + '.' + setupVersionItem.minor + '.' + setupVersionItem.patch;
                        return <option value={setupVersionItemValue}>{setupVersionItemValue}</option>
                    })
                }
            </select>
            <label htmlFor="version">Version <span className="badge bg-danger">Required</span></label>
            <div className="invalid-feedback">
                Please select a version
            </div>
        </div>
        <div className="form-floating col-md-8 has-validation">
            <input
                className="form-control"
                aria-describedby="packageParameters"
                defaultValue=''
                name="packageParameters" required />
            <label htmlFor="packageParameters">Launch Parameters <span className="badge bg-secondary">Opcional</span></label>
        </div>
    </form>)
}

const PublisherToolsComponent = (props) => {
    const [publisherToolsFeedback, setPublisherToolsFeedback] = useState(languagePack.none);
    useEffect(() => {
        event_emmiter.create('software-manager-create-package', (arg) => {
            setPublisherToolsFeedback(arg);
        });
        event_emmiter.create('software-manager-install-package', (arg) => {
            setPublisherToolsFeedback(arg);
        });
        event_emmiter.create('software-manager-extract-package', (arg) => {
            setPublisherToolsFeedback(arg);
        });
        event_emmiter.create('software-manager-configure-package', (arg) => {
            setPublisherToolsFeedback(arg);
        });

        return () => {
            event_emmiter.delete('software-manager-create-package');
            event_emmiter.delete('software-manager-install-package');
            event_emmiter.delete('software-manager-extract-package');
            event_emmiter.delete('software-manager-configure-package');
        };
    }, []);

    const [setupBranch, setSetupBranch] = useState('');
    const [version, setVersion] = useState('');



    return (
        <div className="container-fluid realbody">
            <div className="d-sm-flex justify-content-between align-items-center mb-4">
                <h3 className="text-dark mb-0">{languagePack.publisher_toolkit}</h3>
            </div>
            <div className="row gx-3 gy-3">
                <p className="text-dark mb-0">{languagePack.current_operation}: <span>{publisherToolsFeedback}</span></p>
                <div className="col">
                    <div className="card bg-light mb-2 text-center" style={{ "maxWidth": "10rem" }}>
                        <div className="card-header">
                            <button className="btn btn-primary"
                                data-bs-toggle="modal" data-bs-target="#confirmModal"
                                onClick={
                                    () => {
                                        props.setIsLoadingTable(true);
                                        event_emmiter.send('software-manager-getMyPublishedSoftware', '');
                                        props.openConfirmationModal(
                                            languagePack.package_create,
                                            <PublisherToolsComponentConfigModal
                                                setIsLoadingTable={props.setIsLoadingTable}
                                            />,
                                            languagePack.cancel, () => {
                                                props.resetConfirmModal();
                                            },
                                            languagePack.create,
                                            () => {

                                                const the_form = $("#form_configure_package");
                                                const handleTheForm = async (event) => {
                                                    event.preventDefault();
                                                    event.stopImmediatePropagation();

                                                    const the_form_data = the_form.serializeArray();

                                                    let package_id, branch, version, packageParameters;
                                                    for (let i = 0; i < the_form_data.length; i++) {
                                                        const field = the_form_data[i];
                                                        switch (field.name) {
                                                            case "package_id":
                                                                package_id = field.value;
                                                                break;
                                                            case "branch":
                                                                branch = field.value;
                                                                break;
                                                            case "version":
                                                                version = field.value;
                                                                break;
                                                            case "packageParameters":
                                                                packageParameters = field.value;
                                                                break;
                                                            default:
                                                                break;
                                                        }
                                                    }
                                                    event_emmiter.send('software-manager-configure-package', {
                                                        package_id, branch, version, packageParameters
                                                    });
                                                }
                                                the_form.on('submit', handleTheForm);
                                                the_form.submit();
                                            }
                                        );
                                    }
                                }>{languagePack.open_package_setup}</button>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{languagePack.open_package_setup_info}</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card bg-light mb-2 text-center" style={{ "maxWidth": "10rem" }}>
                        <div className="card-header">
                            <button className="btn btn-primary"
                                onClick={
                                    () => {
                                        event_emmiter.send('software-manager-create-package', '');
                                    }}>{languagePack.package_create}</button>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{languagePack.package_create_info}</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card bg-light mb-2 text-center" style={{ "maxWidth": "10rem" }}>
                        <div className="card-header">
                            <button className="btn btn-primary" onClick={
                                () => {
                                    event_emmiter.send('software-manager-install-package', '');
                                }
                            }>{languagePack.package_install}</button>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{languagePack.package_install_info}</p>
                        </div>
                    </div>
                </div>
                <div className="col">
                    <div className="card bg-light mb-2 text-center" style={{ "maxWidth": "10rem" }}>
                        <div className="card-header">
                            <button className="btn btn-primary" onClick={
                                () => {
                                    event_emmiter.send('software-manager-extract-package', '');
                                }
                            }>{languagePack.package_extract}</button>
                        </div>
                        <div className="card-body">
                            <p className="card-text">{languagePack.package_extract_info}</p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

const DownloadAppsComponentDownloadPrompt = (props) => {
    let [selectBranch, setSelectBranch] = useState(Object.keys(props.branches)[0]);
    let [selectVersion, setSelectVersion] = useState(props.branches[Object.keys(props.branches)[0]][0]);
    let [selectedVersionChangelog, setSelectedVersionChangelog] = useState('');
    useEffect(() => {
        //If it is publisher or admin
        if (
            props.userGroups.includes('publisher') ||
            props.userGroups.includes('admin')
        ) {
            let current_version = props.branches[Object.keys(props.branches)[0]][0];
            event_emmiter.send('software-manager-getBranchVersionDetails-channel', {
                package_id: props.package_id,
                branch: Object.keys(props.branches)[0],
                major: current_version.split(".")[0],
                minor: current_version.split(".")[1],
                patch: current_version.split(".")[2]
            });
            setSelectedVersionChangelog((
                <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Loading...</span>
                </div>
            ));
            event_emmiter.create('software-manager-getBranchVersionDetails-channel', (arg) => {
                console.log("Received: ", arg);
                setSelectedVersionChangelog(arg.changelog);
            });
        }
        return () => {
            //If it is publisher or admin
            if (
                props.userGroups.includes('publisher') ||
                props.userGroups.includes('admin')
            ) {
                event_emmiter.delete('software-manager-getBranchVersionDetails-channel');
            }
        }
    }, []);

    return (
        <div>
            {languagePack.please_select_branch}
            <select
                className="form-control"
                name="setBranchToDownload"
                aria-describedby="setBranchToDownloadHelp"
                value={selectBranch}
                id="setBranchToDownload"
                onChange={(event) => {
                    setSelectBranch(event.target.value);
                    //If it is publisher or admin
                    if (Object.keys(props.branches[selectBranch]).length > 0 &&
                        (
                            props.userGroups.includes('publisher') ||
                            props.userGroups.includes('admin')
                        )
                    ) {
                        let current_version = props.branches[event.target.value][0];
                        event_emmiter.send('software-manager-getBranchVersionDetails-channel', {
                            package_id: props.package_id,
                            branch: event.target.value,
                            major: current_version.split(".")[0],
                            minor: current_version.split(".")[1],
                            patch: current_version.split(".")[2]
                        });
                        setSelectedVersionChangelog((
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Loading...</span>
                            </div>
                        ));
                    }
                }}
            >
                {
                    Object.keys(props.branches).map(branch => {
                        return (<option value={branch}>{branch}</option>);
                    })
                }
            </select>
            <br />
            {(
                Object.keys(props.branches[selectBranch]).length > 0 &&
                (
                    props.userGroups.includes('publisher') ||
                    props.userGroups.includes('admin')
                )
            ) &&

                <span>
                    {languagePack.please_select_version}
                    <select
                        className="form-control"
                        name="setBranchVersionToDownload"
                        value={selectVersion}
                        id="setBranchVersionToDownload"
                        onChange={(event) => {
                            console.log("Set sel: " + event.target.value);
                            setSelectVersion(event.target.value);
                            event_emmiter.send('software-manager-getBranchVersionDetails-channel', {
                                package_id: props.package_id,
                                branch: selectBranch,
                                major: event.target.value.split(".")[0],
                                minor: event.target.value.split(".")[1],
                                patch: event.target.value.split(".")[2]
                            })
                            setSelectedVersionChangelog((
                                <div className="spinner-border text-primary" role="status">
                                    <span className="visually-hidden">Loading...</span>
                                </div>
                            ));
                        }}
                    >
                        {
                            props.branches[selectBranch].map(version => {
                                return (<option value={version}>{version}</option>);
                            })
                        }
                    </select>
                    {(selectedVersionChangelog !== '' && selectedVersionChangelog !== undefined) &&
                        <span>
                            <br />
                            <div className="shadow-sm p-3 mb-5 bg-white rounded" style={{ whiteSpace: 'pre-wrap' }}>
                                <p className="text-center">About this version</p>
                                <figure className="text-begin">
                                    <figcaption className="blockquote">
                                        {selectedVersionChangelog}
                                    </figcaption>
                                </figure>
                            </div>
                        </span>
                    }
                </span>
            }

        </div>
    );
}

const DownloadAppsComponent = (props) => {
    const [searchResultFirstIndex, setSearchResultFirstIndex] = useState(1);
    const [searchResultLastIndex, setSearchResultLastIndex] = useState(5);

    const [searchResult, setSearchResult] = useState([]);


    const openInfoPrompt = (name, description) => {
        props.openConfirmationModal(
            languagePack.get_app_info_title.replaceAll("[APP_NAME]", name),
            (<pre>{description}</pre>),
            languagePack.close, () => {
                props.resetConfirmModal();
            },
            '', () => {
            }
        )
    }

    const openDownloadPrompt = (package_id, name, branches) => {
        if (Object.keys(branches).length > 0) {
            console.log("Set: " + Object.keys(branches)[0]);
            console.log(branches);
            props.openConfirmationModal(
                languagePack.download_prompt.replaceAll("[APP_NAME]", name),
                <DownloadAppsComponentDownloadPrompt
                    package_id={package_id}
                    branches={branches}
                    userGroups={props.userGroups}
                />,
                languagePack.cancel, () => {
                    props.resetConfirmModal();
                },
                languagePack.install, () => {
                    /**
                     * It is not wise to get the value from an ID.
                     * It should be from a state. But... React is not getting the value from
                     * the state (maybe a React bug?)
                     */
                    let setBranchVersionToDownloadExists = $("#setBranchVersionToDownload").val();
                    if (!setBranchVersionToDownloadExists) {
                        console.log("Branch version not received! set to latest version!");
                        event_emmiter.send('software-manager-download-and-install-package', {
                            package_id: package_id,
                            branch_name: $("#setBranchToDownload").val(),
                            name
                        })
                    } else {
                        console.log("Branch version set to " + setBranchVersionToDownloadExists);
                        event_emmiter.send('software-manager-download-and-install-package', {
                            package_id: package_id,
                            branch_name: $("#setBranchToDownload").val(),
                            version: setBranchVersionToDownloadExists,
                            name
                        })
                    }
                    props.resetConfirmModal();

                }
            );
        } else {
            event_emmiter.send("notification-manager-show", {
                title: '',
                message: languagePack.cannot_download_no_branches.replaceAll("[APP_NAME]", name)
            })
        }
    }

    useEffect(() => {
        event_emmiter.create('software-manager-search', (arg) => {
            let searchResultTmp = [];
            arg.forEach(package_info => {
                console.log(package_info);
                searchResultTmp.push([
                    package_info.package_id,
                    package_info.name,
                    package_info.owner,
                    (
                        <span>
                            {(Object.keys(package_info.branches).length > 0) ?
                                <a href="#"
                                    data-bs-toggle="modal" data-bs-target="#confirmModal"
                                    style={{ "textDecoration": "none" }}
                                    onClick={() => {
                                        openDownloadPrompt(package_info.package_id, package_info.name, package_info.branches)
                                    }}><i className="fas fa-download"></i> {languagePack.install}</a>
                                :
                                <a href="#"
                                    style={{ "textDecoration": "none" }}
                                    onClick={() => {
                                        openDownloadPrompt(package_info.package_id, package_info.name, package_info.branches)
                                    }}><i className="fas fa-download"></i> {languagePack.install}</a>
                            }
                            {package_info.description.length > 0 &&
                                <span> / </span>
                            }
                            {package_info.description.length > 0 &&
                                <a href="#"
                                    data-bs-toggle="modal" data-bs-target="#confirmModal"
                                    style={{ "textDecoration": "none" }}
                                    onClick={() => {
                                        openInfoPrompt(package_info.name, package_info.description);
                                    }}
                                ><i className="fas fa-info-circle"></i> {languagePack.description}</a>
                            }
                        </span >
                    )
                ])
            })
            setSearchResult(searchResultTmp);
            props.setIsLoadingTable(false);
        });
        requestSearchData('');

        return () => {
            event_emmiter.delete('software-manager-search');
        };
    }, []);

    const requestSearchData = (value) => {
        props.setIsLoadingTable(true);
        event_emmiter.send("software-manager-search", value.length === 0 ? [] : value.split(" "));
    }

    /** Parametros da Custom Table
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
    return (
        <div className="container-fluid realbody">
            <div className="d-sm-flex justify-content-between align-items-center mb-4">
                <h3 className="text-dark mb-0">{languagePack.download_new_apps}</h3>
            </div>


            <CustomTable
                title={languagePack.software_list}
                header={
                    (props.userGroups.includes('publisher') || props.userGroups.includes('admin')) ?
                        [languagePack.package_id, languagePack.name, languagePack.maintainer, languagePack.action]
                        :
                        [languagePack.name, languagePack.maintainer, languagePack.action]
                }
                body={searchResult.slice(searchResultFirstIndex - 1, searchResultLastIndex).map((value) => {
                    return (props.userGroups.includes('publisher') || props.userGroups.includes('admin')) ?
                        value : value.slice(1);
                })}
                totalNumElems={searchResult.length}
                onIndexChanged={(nextFirstElem, nextLastElem) => {
                    console.log("Changed to " + nextFirstElem + " - " + nextLastElem);
                    setSearchResultFirstIndex(nextFirstElem);
                    setSearchResultLastIndex(nextLastElem);
                    return true;
                }}
                onRefresh={async (value) => {
                    requestSearchData(value);
                }}
                onSearch={requestSearchData}
            />
        </div>
    );
}
//#endregion

const Container = (props) => {
    //#region Username
    const [username, setUsername] = useState('');
    useEffect(() => {
        event_emmiter.create('account-manager-getUsername-channel', (arg) => {
            setUsername(arg);
        });
        event_emmiter.send('account-manager-getUsername-channel', "");
        return () => {
            event_emmiter.delete('account-manager-getUsername-channel');
        };
    }, []);
    //#endregion

    //#region User Groups
    const [userGroups, setUserGroups] = useState([]);
    useEffect(() => {
        event_emmiter.create('account-manager-getGroups-channel', (arg) => {
            setUserGroups(JSON.parse(arg));
        });
        event_emmiter.send('account-manager-getGroups-channel', "");

        let groupRefreshInterval = setInterval(() => {
            event_emmiter.send('account-manager-getGroups-channel', "");
        }, 10000);

        return () => {
            event_emmiter.delete('account-manager-getGroups-channel');
            clearInterval(groupRefreshInterval);
        };
    }, []);
    //#endregion

    //#region Loading Animation
    const [isLoadingTable, setIsLoadingTable] = useState(false);
    //#endregion

    //#region Multi Purpose Confirmation Modal
    const [confirmationModal, setConfirmationModal] = useState({
        title: '',
        body: '',
        closeButton: {
            text: '',
            onClick: () => {
            }
        },
        confirmButton: {
            text: '',
            onClick: () => {
            }
        }
    })
    const openConfirmationModal = (
        title = '', body = '',
        closeButtonText = '', closeButtonOnClick = () => { },
        confirmButtonText = '', confirmButtonOnClick = () => { }
    ) => {
        setConfirmationModal(prevState => {
            return {
                ...prevState,
                title,
                body,
                closeButton: {
                    text: closeButtonText,
                    onClick: closeButtonOnClick
                },
                confirmButton: {
                    text: confirmButtonText,
                    onClick: confirmButtonOnClick
                }
            }
        });
    };
    const resetConfirmModal = () => {
        setConfirmationModal(prevState => {
            return {
                title: '',
                body: '',
                closeButton: {
                    text: '',
                    onClick: () => {
                    }
                },
                confirmButton: {
                    text: '',
                    onClick: () => {
                    }
                }
            };
        });
    }
    //#endregion

    //Current selected lateral navbar option
    const [currentLateralNavbarSelectedItem, setCurrentLateralNavbarSelectedItem] = useState(languagePack.list_of_installed_apps);

    //#region Lateral Bar Tab List
    const [tabList, setTabList] = useState([
        {
            icon: 'fas fa-download',
            text: languagePack.download_new_apps,
            permissions: ['client']
        },
        {
            icon: 'fas fa-list-ul',
            text: languagePack.list_of_installed_apps,
            permissions: ['client']
        },
        {
            icon: 'fas fa-tachometer-alt',
            text: languagePack.open_admin_pannel,
            onClick: () => { event_emmiter.send('admin-pannel-open', ''); },
            permissions: ['admin']
        },
        {
            icon: 'fas fa-layer-group',
            text: languagePack.open_publisher_pannel,
            onClick: () => { event_emmiter.send('publisher-pannel-open', ''); },
            permissions: ['publisher']
        },
        {
            icon: 'fas fa-toolbox',
            text: languagePack.publisher_toolkit,
            permissions: ['publisher']
        },
        {
            icon: 'fas fa-headset',
            text: languagePack.remote_support,
            onClick: () => { event_emmiter.send('remote-support-pannel-open', ''); },
            permissions: ['client', 'publisher']
        },
        {
            icon: 'fas fa-phone',
            text: languagePack.video_conference,
            onClick: () => { event_emmiter.send('jitsi-meet-open', ''); },
            permissions: ['client', 'publisher']
        }
    ]);
    //#endregion

    return (
        <div className="container" style={{ zIndex: 0 }}>

            {isLoadingTable &&
                (<div className="loading_table_background">
                    <div className="loading_table_animation">
                    </div>
                </div>)
            }

            <ConfirmModal
                settings={confirmationModal}
            />
            <EditAccountModal setIsLoadingTable={setIsLoadingTable} />

            <LateralNavbar
                tabList={
                    tabList.filter(tab => {
                        return tab.permissions.some(perm => userGroups.includes(perm));
                    })
                }
                currentLateralNavbarSelectedItem={currentLateralNavbarSelectedItem}
                setCurrentLateralNavbarSelectedItem={setCurrentLateralNavbarSelectedItem}
            />
            <div className="d-flex flex-column">
                <TopNavbar
                    username={username}
                    userGroups={userGroups}
                    setIsLoadingTable={setIsLoadingTable}
                    logoutHandler={() => {
                        ipcRenderer.send('account-manager-logout-channel', "");
                    }}
                    exitHandler={() => {
                        ipcRenderer.send('rehstore-quit-app', "");
                    }} />
                {
                    (() => {
                        switch (currentLateralNavbarSelectedItem) {
                            case languagePack.download_new_apps:
                                return <DownloadAppsComponent
                                    setIsLoadingTable={setIsLoadingTable}
                                    openConfirmationModal={openConfirmationModal}
                                    resetConfirmModal={resetConfirmModal}
                                    userGroups={userGroups}
                                />
                                break;
                            case languagePack.list_of_installed_apps:
                                return <InstalledAppsComponent
                                    openConfirmationModal={openConfirmationModal}
                                    resetConfirmModal={resetConfirmModal}
                                    userGroups={userGroups}
                                />;
                            case languagePack.publisher_toolkit:
                                return <PublisherToolsComponent
                                    openConfirmationModal={openConfirmationModal}
                                    resetConfirmModal={resetConfirmModal}
                                    setIsLoadingTable={setIsLoadingTable}
                                />;
                            default:
                                break;
                        }
                    })()
                }
            </div>
        </div>
    );
}

ReactDOM.render(
    <Container />,
    document.getElementById('root')
);