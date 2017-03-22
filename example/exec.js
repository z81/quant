const fs = require('fs');
const Quant = require('../client');

const q = new Quant({
    name: 'local.exec',
    token: '123',
    key: fs.readFileSync(__dirname + '/../client/client-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../client/client-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../server/server-certificate.pem')  ]
});

setInterval(() => {
    const num1 = Math.round(Math.random() * 10);
    const num2 = Math.round(Math.random() * 10);

    console.log(`Sum ${num1} + ${num2} = ?`);
    q.run('sum', [num1, num2]).on('end', data => {
        console.log('=', data)
    });
}, 1000);