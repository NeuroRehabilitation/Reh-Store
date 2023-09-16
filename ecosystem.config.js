module.exports = {
    apps: [
        {
            name: "Web Server",
            script: "./app.js",
            env: {
                NODE_ENV: "production"
            },
            env_test: {
                NODE_ENV: "test",
            },
            env_staging: {
                NODE_ENV: "staging",
            },
            env_production: {
                NODE_ENV: "production",
            }
        },
        {
            name: "SFTP Server",
            script: "./sftp_server.js",
            env: {
                NODE_ENV: "production"
            },
            env_test: {
                NODE_ENV: "test",
            },
            env_staging: {
                NODE_ENV: "staging",
            },
            env_production: {
                NODE_ENV: "production",
            }
        },
    ]
}