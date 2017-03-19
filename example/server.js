const fs = require('fs');
const Quant = require('../server');

const quant = new Quant({
    key: fs.readFileSync(__dirname + '/../server/server-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../server/server-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../client/client-certificate.pem') ]
});

quant.addClient('local', {
    token: "securetoken",
    priority: 9,
    allowCommands: {
        execute: ['delayed']
    }
});

quant.addClient('local.exec', {
    token: "123",
    priority: 9,
    allowCommands: {
        run: ['delayed']
    }
});