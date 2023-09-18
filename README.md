<p align="center">

<img style="float: right;" width="100px" src="https://raw.githubusercontent.com/Zlynt/Reh-Store/master/docs/images/logo_rehstore.svg">
<h1 align="center">Reh@Store</h1>

***<p align="center">An Open-Source Framework for Enhancing ICT-Based Health Interventions with Distribution, Maintenance, and Data Collection</p>***
<p/>


## How to setup the server

First install the latest LTS Node.js version and then MariaDB

Insert the database schema into MariaDB and configure the server with the desired settings.

Then create a systemd service to run the Reh@Store 24/7. This service must execute the script "start.sh" located in the root of this directory.

After creating the service, redirect the ports 8443 and 8080 to 443 and 80 respectively on your firewall. For security reasons, this server must never be run with elevated permissions.

## How to stop/start Reh@Store

Just interact with the created system service

## Server logs

Server logs are located inside the folder "logs" in the root of this directory

## Package storage

The uploaded installers are located inside the "software_storage" folder in the root of this directory. Inside of this folder, there are 3 folders. The "tmp" is where the files are being sent while the upload process is being done. After the upload is completed, they are renamed and sent to the folder "software".
