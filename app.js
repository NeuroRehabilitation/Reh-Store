//#region External dependencies

//Express
let express = require('express');


//Express server's protection
let helmet = require('helmet');

//EJS for Express
let ejs = require('ejs');

//HTTPS
let https = require('https');

//fs
let fs = require('fs');
const fse = require('fs-extra');

//Path
const path = require('path');

//IP Location
var geoip = require('geoip-lite');

//Compression
var compression = require('compression');

//Cluster
const cluster = require('cluster');

let { fork } = require('child_process');

//Session Manager
const session = require('./models/session');


//Console colors
const console_colors = require(path.join(__dirname, 'modules', 'console_color'));

//Custom print
const { print, printError } = require(path.join(__dirname, 'modules', 'custom_print'));
const config_manager = require(path.join(__dirname, 'models', 'config_manager'));
//#endregion

//Server settings
const web_server_settings = config_manager.get('webserver.json');


//Try to protect against some attack's from bots
//const web_protector = require('./midleware/web_protector');
const { IpFilter, IpDeniedError } = require('express-ipfilter');
const ipfilterBlackList = Object.keys(config_manager.get('ip_blacklist.json'));

/*
//Set onlyAllowWhiteList to false
if (process.env.NODE_ENV === "production")
    web_protector.onlyAllowWhiteList = web_server_settings.onlyAllowWhiteList;
else
    web_protector.onlyAllowWhiteList = false;
*/

//Express
let app = express();



const chain_certificates_path = path.join(__dirname, 'certificates', 'chain_certificates');
//Make sure chain certificate chain path exists
fse.ensureDirSync(chain_certificates_path);

let certificates = {
    key: fs.readFileSync(path.join(__dirname, 'certificates', web_server_settings.certificates.privateKey), 'utf8'),
    cert: fs.readFileSync(path.join(__dirname, 'certificates', web_server_settings.certificates.cert), 'utf8'),
    requestCert: true,
    rejectUnauthorized: false
}

fs.readdirSync(chain_certificates_path).forEach(chain_cert => {
    if (certificates.ca === undefined) certificates.ca = [];

    let chain_path = path.normalize(path.join(chain_certificates_path, chain_cert));
    certificates.ca.push(fs.readFileSync(chain_path, 'utf-8'));
});


const https_web_server = https.createServer(certificates, app);

/* //Custom protector disable - cannot handle too much trafic
//Ban IP's from bots
https_web_server.on('connection', (sock) => {
    web_protector.onConnection(sock);
});
*/

//Websocket server
var expressWs = require('express-ws')(app, https_web_server);

fse.removeSync(path.join(__dirname, 'storage_system', 'tmp'));


//#region Server configuration

//Server port
const serverPort = web_server_settings.https_port;
const httpPort = web_server_settings.http_port;

//#endregion

//#region Express Configuration

app.disable('x-powered-by');

//Use helmet middleware in express
app.use(helmet());

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

//Compress static content
app.use(compression());

//Servir os ficheiros HTML
app.use(express.static(path.join(__dirname, 'public')));


//Inject Session Manager into Express
app.use((req, res, next) => {
    req.session_manager = session;
    next();
})

//#endregion

//#region Router
const router = require(path.join(__dirname, 'routes', 'router'));

//#region Very Basic Protection against direct ip access
const logFolderPath = path.join(__dirname, 'logs');
const logFilePath = path.join(logFolderPath, 'log.txt');
if (!fs.existsSync(logFilePath)) {
    fs.writeFileSync(logFilePath, '');
}

const parteIpFromExpress = (req, res) => {
    let ip = req.headers['cf-connecting-ip'] || req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (ip !== undefined) {
        ip = ip.replace(/^.*:/, '');
    } else {
        printError("Express Protect", `Invalid IP: ${ip}`);
        /**
         * We must kill a worker if it has happened a critical error like this.
         * This makes the server more stable
         */
        process.disconnect();
    }
    return ip;
}

app.use(IpFilter(ipfilterBlackList, {
    mode: 'deny',
    log: false,
    detectIp: parteIpFromExpress
}));
app.use('*', (err, req, res, next) => {
    let ip = parteIpFromExpress(req, res);
    let hostname = req.headers.host;
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl;

    if (
        (err instanceof IpDeniedError) ||
        (hostname !== web_server_settings.hostname && process.env.NODE_ENV === "production")
    ) { //Only allow acess to website if correct hostanme is passed in the header http field
        const error_date = new Date();
        const error_message = `[${error_date.valueOf()}][${ip}] Non authorized request to ${fullUrl}`;
        try {
            const ipGeoLocation = geoip.lookup(ip);
            printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDate()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${ip}][${ipGeoLocation.country} - ${ipGeoLocation.city}] Non authorized request to ${fullUrl}`);
        } catch (err) {
            printError("HTTPS Server", `[${error_date.getFullYear()}/${error_date.getMonth()}/${error_date.getDate()} ${error_date.getHours()}:${error_date.getMinutes()}:${error_date.getSeconds()}:${error_date.getMilliseconds()}][${ip}] Non authorized request to ${fullUrl}`);
        }
        fs.appendFileSync(logFilePath, `${error_message}\n`);
        req.client.destroy();
        return;

    }
    next();
});


const formidableMiddleware = require('./midleware/express-formidable');
app.use(formidableMiddleware({
    encoding: 'utf-8',
    uploadDir: path.join(__dirname, 'storage_system', 'tmp'),
    multiples: true, // req.files to be arrays of files
    maxFileSize: 50 * 1000 * 1024 * 1024, //Allow at maximum 50gb package size upload
    maxFieldsSize: 50 * 1000 * 1024 * 1024 //Allow at maximum 50gb package size upload
}));

//#endregion

app.use('/', router.index);
app.use('/api/account', router.accounts);
app.use('/admin', router.admin);
app.use('/publisher', router.publisher);
app.use('/api/software', router.software);

app.get('/ping', (req, res) => {
    res.header(200).end('pong');
});

app.use('*', router.not_found);

//Do not show error messages to the exterior
app.use(function (err, req, res, next) {
    printError("Express.js", err.stack);
    res.status(500).send('Internal Error. Try again later');
})



//#endregion

const numCPUs = require('os').cpus().length;
if (cluster.isMaster) {

    console.log(`${console_colors.BgBlue}                      \n                      `);
    console.log(`${console_colors.BgBlue}  ${console_colors.Bright} Reh@Store Server ${console_colors.BgBlue}  ${console_colors.Reset}`);
    console.log(`${console_colors.BgBlue}                      \n                      `);
    console.log(`${console_colors.Reset}\n`);


    console.clear();
    print("Master Process", `Master thread started.`);
    //#region Redirect from http to https
    var http = express();

    // set up a route to redirect http to https
    http.get('*', function (req, res) {
        res.redirect('https://' + req.headers.host + req.url);
    });

    // have it listen on 8080
    http.listen(httpPort, () => {
        const start_message = `Started on port ${httpPort} (${process.env.NODE_ENV === "production" ? "production" : "development"} mode)`;
        fs.appendFileSync(logFilePath, `[${new Date().valueOf()}] [HTTP Server] ${start_message}\n`);
        print('HTTP Server', `${start_message}`);
    });
    //#endregion

    //#region SFTP Server
    //SFTP Server is causing all the problems with this Web Server
    //So, We let PM2 manage the SFTP Server instead of this Web Server
    /*
    let sftp_server;
    function start_sftp_server() {
        sftp_server = fork('./sftp_server');
        sftp_server.on('message', function (response) {
            switch (response) {
                case "restart":
                    setTimeout(() => {
                        start_sftp_server();
                    }, 10000);
                    break;
                default: break;
            }
        });
        sftp_server.on("close", (code) => {
            print("SFTP Server", `Server closed (code ${code})`);
            setTimeout(() => {
                start_sftp_server();
            }, 10000);
        });
    }
    start_sftp_server();
    */
    //#endregion

    // Fork workers.
    print("Master Process", `Creating https server threads...`);

    let worker_settings = {
        //number_of_workers: require('os').cpus().length*2
        //number_of_workers: Math.floor((require('os').cpus().length+20)/2)
        //number_of_workers: Math.floor((require('os').cpus().length+30)/2)
        //number_of_workers: Math.floor((require('os').cpus().length+40)/2)
        number_of_workers: require('os').cpus().length
    }
    worker_settings.tmp_number_of_workers = worker_settings.number_of_workers;
    //Create a certain number of workers
    const clusterLoop = () => {
        if (worker_settings.tmp_number_of_workers >= 0) {
            print("Workers", `Worker ${worker_settings.number_of_workers - worker_settings.tmp_number_of_workers
                } of ${worker_settings.number_of_workers
                } is online.`);
            let proc = cluster.fork();
            worker_settings.tmp_number_of_workers--;
            proc.on('message', function (message) {
                if (message.status !== undefined && message.status === 'ready') {
                    clusterLoop();
                }
            });
        } else {
            //print("Workers", "All workers are ready!");
            setTimeout(() => {
                clusterLoop();
            }, 1000);
        }
    }
    clusterLoop();


    // This event is firs when worker died
    cluster.on('exit', (worker, code, signal) => {
        print("Master Process", `Worker ${worker.process.pid} died.`);
        worker_settings.tmp_number_of_workers++;
    });
}

// For Worker
else {
    https_web_server.listen(serverPort, () => {
        const start_message = `Started on port ${serverPort} (${process.env.NODE_ENV === "production" ? "production" : "development"} mode)`;
        fs.appendFileSync(logFilePath, `[${new Date().valueOf()}] [HTTPS Server] ${start_message}\n`);
        //print('HTTPS Server', start_message + ` (Worker ${process.pid})`);
        process.send({
            status: 'ready'
        });
    });
}

