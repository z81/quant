const fs = require('fs');
const Quant = require('../client');

const q = new Quant({
    name: 'local',
    token: 'securetoken',
    key: fs.readFileSync(__dirname + '/../client/client-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../client/client-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../server/server-certificate.pem')  ]
});

const wait1 = (time, data) => (new Promise((resolve => {
    setTimeout(() => resolve(data), time);
})))

q.register('delayed', (data, task) => {
    console.log('delayed');
    
    let i = 0;
    const timer = setInterval(() => {
        if (i === 100) {
            task.end('end ');
        }
        else {
            task.setStatus('status', i++);
        }
    }, 1000);
    //task.success('success');
});