'use strict';

/**
 * This code was made by hatashiro (https://github.com/hatashiro)
 * and modified by Zlynt
 * There was a need to use a more updated formidable version (due to security concerns)
 * and to modify some stuff
 */

const formidable = require('formidable');

function parse(opts, events) {
    return (req, res, next) => {
        if (req.express_formidable && req.express_formidable.parsed) {
            next();
            return;
        }

        const form = new formidable.IncomingForm(opts);

        let manageOnError = false;
        if (events) {
            events.forEach((e) => {
                manageOnError = manageOnError || e.event === 'error';
                form.on(e.event, (...parameters) => { e.action(req, res, next, ...parameters); });
            });
        }

        if (!manageOnError) {
            form.on('error', (err) => {
                next(err);
            });
        }

        form.parse(req, (err, fields, files) => {
            if (err) {
                next(err);
                return;
            }

            Object.assign(req, { fields, files, express_formidable: { parsed: true } });
            next();
        });
    };
}

module.exports = parse;
exports.parse = parse;