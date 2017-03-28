const fs = require('fs');
const Quant = require('../client');

const q = new Quant({
    name: 'local',
    token: 'securetoken',
    key: fs.readFileSync(__dirname + '/../client/client-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../client/client-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../server/server-certificate.pem')  ]
});

q.register('sum', ([num1, num2], task) => {
    task.setProgress(50, 'calc');
    setTimeout(() => {
        task.done(num1 + num2);
    }, 1200);
});