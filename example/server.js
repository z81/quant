const fs = require('fs');
const Quant = require('../server');

const quant = new Quant({
    key: Quant.load(`${__dirname}/../server/server-private-key.pem`),
    cert: Quant.load(`${__dirname}/../server/server-certificate.pem`),
    ca: [ Quant.load(`${__dirname}/../client/client-certificate.pem`) ]
});

quant.addClient('local', {
    token: "securetoken",
    priority: 9,
    allowCommands: {
        execute: ['delayed', 'sum']
    }
}).addClient('local.exec', {
    token: "123",
    priority: 9,
    allowCommands: {
        run: ['delayed', 'sum']
    }
}).addClient('stats', {
    token: "securetoken",
    allowCommands: {
        execute: [Quant.statuses.status, Quant.statuses.tasks]
    }
});