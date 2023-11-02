<p align="center">

<img style="float: right;" width="100px" src="https://raw.githubusercontent.com/Zlynt/Reh-Store/master/docs/images/logo_rehstore.svg">
<h1 align="center">Reh@Store</h1>

***<p align="center">An Open-Source Framework for Enhancing ICT-Based Health Interventions with Distribution, Maintenance, and Data Collection</p>***
</p>

# Compiling requirements
> 1) Node.js V15.10.0
> 2) node-gyp
> 3) CMAKE (Only if node-gyp asks)

# How to run in development mode
> **npm run test**

# How to "compile"

First install all the dependencies by running the following command:
> **npm i**

Then install all the development dependencies by running the following command:
> **npm i -D**

Compile the modules for the electron
> **npm run rebuild**

If an error shows, you can alternatively compile the modules for the electron by running:
> **./node_modules/.bin/electron-rebuild**

Before compiling, go to the folder modules/internet_manager.js and modifify the "app_update_url" and the "default_domain" to point to your own domain. Also, modify all occurences of "rehstore.arditi.pt" to your own domain (Visual Studio Code can replace them all at once), in order for this client application to use your server.

After the installation of the dependencies and configuration of the url's, compile the code by running:
> **npm run make**

# Used technology

> 1) Node.js
> 2) Electron
> 3) electron-builder
> 4) React
> 5) jQuery
