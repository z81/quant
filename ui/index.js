const fs = require('fs');
const humanize = require('humanize');
const humanizeDuration = require('humanize-duration');
const Quant = require('../client');

const q = new Quant({
    name: 'stats',
    token: 'securetoken',
    key: fs.readFileSync(__dirname + '/../client/client-private-key.pem'),
    cert: fs.readFileSync(__dirname + '/../client/client-certificate.pem'),
    ca: [ fs.readFileSync(__dirname + '/../server/server-certificate.pem')  ]
});

const statuses = new Map();
let tasks = [];
q.register(Quant.statuses.status, (data, task) => {
    if (data.clientName === 'stats') return;

    statuses.set(data.clientName, data);
});

q.register(Quant.statuses.tasks, (data, task) => {
    tasks = data;
});

setInterval(() => {
    for(let [name, status] of statuses) {
        const cpu = Math.round( status.loadavg[2]),
            freeMem = humanize.filesize(status.freemem),
            totalMem = humanize.filesize(status.totalmem),
            percentMem = Math.round(100 / status.totalmem * status.freemem),
            uptime = humanizeDuration(status.uptime * 1000);

        console.log('Name:', name, `| Uptime: ${uptime} | CPU: ${cpu} % | Mem free: ${percentMem}% / ${freeMem} of ${totalMem}`);
    }

    console.log('Running tasks');
    for(let task of tasks) {
        console.log(`Name: ${task.command} | Args: `,task.data);
    }
}, 1000);
