const fs = require('fs');
const Quant = require('../client');

const q = new Quant({
    name: 'local.exec',
    token: '123',
    key: fs.readFileSync(__dirname + '/../client/client-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../client/client-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../server/server-certificate.pem')  ]
});

setTimeout(() => {
    const task = q.run('delayed', 100);

    task.on('data', data => {
        console.log('data', data)
    });
}, 1000);