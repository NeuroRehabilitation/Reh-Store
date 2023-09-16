const path = require('path');

const routes = {
    index: require(path.join(__dirname, '..', 'controllers', 'index')),
    not_found: require(path.join(__dirname, '..', 'controllers', 'not_found')),
    //API
    accounts: require(path.join(__dirname, '..', 'controllers', 'accounts')),
    software: require(path.join(__dirname, '..', 'controllers', 'software')),
    //Admin Pannel
    admin: require(path.join(__dirname, '..', 'controllers', 'admin')),
    //Publisher Pannel
    publisher: require(path.join(__dirname, '..', 'controllers', 'publisher'))
}

module.exports = routes;