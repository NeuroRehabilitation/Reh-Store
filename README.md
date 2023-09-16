# Reh@Store server

The Reh@Store is a software distribution service for research projects maintained by the [NeuroRehabLab](https://neurorehabilitation.m-iti.org/lab/). It was developed by [Ivan Teixeira](https://pt.linkedin.com/in/zlynt) for his master's degree in Informatics Engineering.


## How to setup

First install the latest secure Node.js version (in 03/05/2021 it is Node.js version 16)

Then create a systemd service to run the Reh@Store 24/7. This service must execute the script "start.sh" located in the root of this directory.

After creating the service, redirect the ports 8443 and 8080 to 443 and 80 respectively on your firewall. For security reasons, this server must never be run with elevated permissions.

## How to stop/start Reh@Store

Just interact with the created system service

## Server logs

Server logs are located inside the folder "logs" in the root of this directory

## Package storage

The uploaded installers are located inside the "software_storage" folder in the root of this directory. Inside of this folder, there are 3 folders. The "tmp" is where the files are being sent while the upload process is being done. After the upload is completed, they are renamed and sent to the folder "software".

## Admin account

Default username: admin

Default password: admin123

Please change this credentials as fast as possible after the Reh@Store is online. If possible, create a new account with all priviledges and delete this account.