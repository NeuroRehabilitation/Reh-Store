'use strict';
var express = require('express');
var router = express.Router();

const path = require('path');
const config_manager = require(path.join(__dirname, '..', 'models', 'config_manager'));


//Server settings
const web_server_settings = config_manager.get('webserver.json');


router.get('/', function (req, res) {

    res.header(200).setHeader(
        "Content-Security-Policy", " frame-src https://tawk.to; "
    ).render('index', {
        siteName: 'Reh@Store',
        mainPage: true,
        support_email: web_server_settings.support_email,
        hostname: web_server_settings.hostname
    });
});

router.get('/terms_and_conditions', function (req, res) {
    res.header(200).render('terms_and_conditions', {
        siteName: 'Reh@Store',
        mainPage: false,
        support_email: web_server_settings.support_email,
        hostname: web_server_settings.hostname
    });
});

router.get('/privacy_policy', function (req, res) {
    res.header(200).render('privacy_policy', {
        siteName: 'Reh@Store',
        mainPage: false,
        support_email: web_server_settings.support_email,
        hostname: web_server_settings.hostname
    });
});

module.exports = router;