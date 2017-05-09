1. Sign up(upload files into MongoDB, MongoDB check if username exists); 
   Sign in(MongoDB check whether username exists and username+password match);
   Homepage
2. Server js is `index.js` in routers dir
3. modules required include mongodb, monk, express-fileupload, etc. view use `ejs`
4. Initiate use `express LightHouse0.1 --view=ejs`
5. Use the command ./mongod --dbpath /YOUR_DATA_PATH and ./mongo to run Mongodb
6. `npm install` first to get node_modules and use `npm start` to start
