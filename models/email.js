const path = require('path');
const fs = require('fs');
const nodemailer = require('nodemailer');
const accounts = require('./accounts');

const modules_dir = path.join(__dirname, '..', 'modules');
const models_dir = path.join(__dirname, '..', 'models');

const console_colors = require(path.join(modules_dir, 'console_color'));
const { print, printError } = require(path.join(modules_dir, 'custom_print'));
const config_manager = require(path.join(models_dir, 'config_manager'));

const config = config_manager.get('email.json');
const email_files_path = path.join(__dirname, '..', 'email');
const files = {
    email_confirmation_layout: fs.readFileSync(path.join(email_files_path, 'account_verification', 'index.html'), 'utf-8'),
    password_reset_request_layout: fs.readFileSync(path.join(email_files_path, 'account_password_reset', 'index.html'), 'utf-8'),
    password_reset_warning_layout: fs.readFileSync(path.join(email_files_path, 'account_password_reset', 'password_reset_url.html'), 'utf-8')
}

const email = {
    server: nodemailer.createTransport({
        host: config.host,
        port: config.port,
        secure: config.useTLS, // use TLS
        auth: {
            user: config.user,
            pass: config.password
        },
        tls: {rejectUnauthorized: config.useTLS}
    }),
    //Verificar melhor esta função, falta melhorar os mecanismos de proteção
    sendResetPasswordEmail: async (username, resetCodeUrl) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!(await accounts.parameter_validation.username(username))) {
                    reject("Username must be only letters and numbers");
                    return;
                }

                const user_email = await accounts.user.getEmail(username);

                email.server.verify(function (error, success) {
                    if (error) {
                        printError("Email Server", error);
                        reject("Unkown Error");
                        return;
                    } else {
                        var mailOptions = {
                            from: '"Reh@Store" <' + config.email + '>',
                            to: user_email,
                            subject: 'Reh@Store password reset request',
                            text: 'Reset url: ' + resetCodeUrl,
                            html: files.password_reset_request_layout.replaceAll("[RESET_URL_HERE]", resetCodeUrl).replaceAll("[USERNAME]", username),
                            attachments: [{   // stream as an attachment
                                filename: 'logo.png',
                                content: fs.createReadStream(path.join(__dirname, '..', 'public', 'img', 'RehLogo.png')),
                                cid: 'logo'
                            }]
                        };
                        email.server.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            print("Email Server", "Password reset email was sent to " + user_email);
                            resolve(true);
                            return;
                        });
                    }
                });
            } catch (err) {
                printError("Email Server", "Error: " + err);
                resolve(false);
                return;
            }
        });
    },
    sendResetPasswordWarning: async (username) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!(await accounts.parameter_validation.username(username))) {
                    reject("Username must be only letters and numbers");
                    return;
                }

                const user_email = await accounts.user.getEmail(username);

                email.server.verify(function (error, success) {
                    if (error) {
                        printError("Email Server", error);
                        reject("Unkown Error");
                        return;
                    } else {
                        var mailOptions = {
                            from: '"Reh@Store" <' + config.email + '>',
                            to: user_email,
                            subject: 'Reh@Store account password changed',
                            text: `Your account password just got reset. If you didn't reset it, please contact us`,
                            html: files.password_reset_warning_layout.replaceAll("[USERNAME]", username),
                            attachments: [{   // stream as an attachment
                                filename: 'logo.png',
                                content: fs.createReadStream(path.join(__dirname, '..', 'public', 'img', 'RehLogo.png')),
                                cid: 'logo'
                            }]
                        };
                        email.server.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            print("Email Server", "Sent password reset warning to " + user_email);
                            resolve(true);
                            return;
                        });
                    }
                });
            } catch (err) {
                printError("Email Server", "Error: " + err);
                resolve(false);
                return;
            }
        });
    },
    //Verificar melhor esta função, falta melhorar os mecanismos de proteção
    sendconfirmationEmail: async (username, confirmationUrl) => {
        return new Promise(async (resolve, reject) => {
            try {
                if (!(await accounts.parameter_validation.username(username))) {
                    reject("Username must be only letters and numbers");
                    return;
                }

                const user_email = await accounts.user.getEmail(username);

                email.server.verify(function (error, success) {
                    if (error) {
                        printError("Email Server", error);
                        reject("Unkown Error");
                        return;
                    } else {
                        var mailOptions = {
                            from: '"Reh@Store" <' + config.email + '>',
                            to: user_email,
                            subject: 'Reh@Store email confirmation',
                            text: 'Confirmation url: ' + confirmationUrl,
                            html: files.email_confirmation_layout.replaceAll("[CONFIRMATION_URL_HERE]", confirmationUrl).replaceAll("[USERNAME]", username),
                            attachments: [{   // stream as an attachment
                                filename: 'logo.png',
                                content: fs.createReadStream(path.join(__dirname, '..', 'public', 'img', 'RehLogo.png')),
                                cid: 'logo'
                            }]
                        };
                        email.server.sendMail(mailOptions, (error, info) => {
                            if (error) {
                                return console.log(error);
                            }
                            print("Email Server", "Confirmation email was sent to " + user_email);
                            resolve(true);
                            return;
                        });
                    }
                });
            } catch (err) {
                printError("Email Server", "Error: " + err);
                resolve(false);
                return;
            }
        });
    }

}

module.exports = email;