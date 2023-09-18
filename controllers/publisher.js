'use strict';
var express = require('express');
var router = express.Router();


router.get('/', function (req, res) {
    res.setHeader("Content-Security-Policy",
        "default-src 'self' data: gap: https://rehstore.arditi.pt https://fonts.gstatic.com 'unsafe-inline'; style-src 'self' 'unsafe-inline'; media-src *; img-src 'self' data: content:;").
        header(200).render('publisher/index', { siteName: 'Reh@Store Publisher', mainPage: true });
});

module.exports = router;