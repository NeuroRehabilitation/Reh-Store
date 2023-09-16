'use strict';
var express = require('express');
var router = express.Router();


router.get('*', function(req, res) {
    res.header(404).render('not_found', {siteName: 'Reh@Store', mainPage: false});
});

router.post('*', function(req, res) {
    res.header(404).end('404');
});

module.exports = router;