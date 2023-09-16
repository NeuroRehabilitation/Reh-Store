const api_software = {
    software: {
        create: async (package_id = "", name = "", description = "", tags = []) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/create',
                    {
                        token: api_account.userToken,
                        package_id,
                        name,
                        description,
                        tags
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        getAll: async (tags = []) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/all_published',
                    {
                        token: api_account.userToken,
                        tags
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        details: async (package_id = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/details',
                    {
                        token: api_account.userToken,
                        package_id
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        getPublishedSoftwareList: async (tags = []) => {
            return new Promise(async (resolve, reject) => {
                const software_list_request = await api_software.software.getAll(tags);
                if (software_list_request.result === true) {
                    let software_list = [];
                    for (let i = 0; i < software_list_request.software_list.length; i++) {
                        const package_id = software_list_request.software_list[i];
                        const software_details_request = await api_software.software.details(package_id);
                        software_list.push({
                            package_id,
                            ...software_details_request.software
                        });
                    }
                    resolve(software_list);
                } else {
                    customPrint("Software API", "Error: " + software_list_request.reason);
                    reject(software_list_request.reason);
                }
            });
        },
        remove: async (package_id = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/remove',
                    {
                        token: api_account.userToken,
                        package_id
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        edit: async (package_id = "", new_package_id = "", name = "", description = "", tags = []) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/edit',
                    {
                        token: api_account.userToken,
                        package_id,
                        new_package_id,
                        name,
                        description,
                        tags
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        }
    },
    branch: {
        create: async (package_id = "", branch_name = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/create',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });

        },
        remove: async (package_id = "", branch_name = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/remove',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        getAll: async (package_id = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/all',
                    {
                        token: api_account.userToken,
                        package_id
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        permissions: {
            setAllowedUsers: async (package_id = "", branch_name = "", clientList = []) => {
                console.log(branch_name);
                return new Promise((resolve, reject) => {
                    $.post('/api/software/branch/set_all_allowed_clients',
                        {
                            token: api_account.userToken,
                            package_id,
                            branch: branch_name,
                            clients: clientList
                        }, (data) => {
                            resolve(data);
                            return;
                        },
                        "json");
                });
            },
            getAllowedUsers: async (package_id = "", branch_name = "") => {
                console.log(branch_name);
                return new Promise((resolve, reject) => {
                    $.post('/api/software/branch/allowed_clients',
                        {
                            token: api_account.userToken,
                            package_id,
                            branch: branch_name,
                        }, (data) => {
                            resolve(data);
                            return;
                        },
                        "json");
                });
            }
        }
    },
    version: {
        create: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0, changelog = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/add',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch,
                        changelog
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        getAll: async (package_id = "", branch_name = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/all',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });

        },
        remove: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/remove',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        details: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/publisher_details',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        }
    },
    files: {
        getAll: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0) => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/all_files',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        remove: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0, filename = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/delete_file',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch,
                        filename
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
    },
    platform: {
        add: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0, platform = "", architecture = "", version = "", filename = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/add_platform',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch,
                        platform,
                        architecture,
                        os_version: version,
                        filename
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        },
        remove: async (package_id = "", branch_name = "", major = 0, minor = 0, patch = 0, platform = "", architecture = "", version = "") => {
            return new Promise((resolve, reject) => {
                $.post('/api/software/branch/version/remove_platform',
                    {
                        token: api_account.userToken,
                        package_id,
                        branch: branch_name,
                        major,
                        minor,
                        patch,
                        platform,
                        architecture,
                        os_version: version
                    }, (data) => {
                        resolve(data);
                        return;
                    },
                    "json");
            });
        }
    },
    getAllPlatforms: async () => {
        return new Promise((resolve, reject) => {
            $.post('/api/software/branch/version/all_platforms',
                {
                    token: api_account.userToken
                }, (data) => {
                    resolve(data);
                    return;
                },
                "json");
        });
    }
};