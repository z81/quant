const tls = require('tls');
const fs = require('fs');

const defaultConfig = { 
    requestCert: true,
    rejectUnauthorized: true,
    host: '127.0.0.1',
    port: 9125
};

class Quant {
    constructor(config = {}) {
        this.config = Object.assign({}, defaultConfig, config);
        this.createServer();
        this.connections = new Map();
        this.clients = new Map();
        this.runningCommands = new Map();
    }

    _log(text) {
        if (this.config.debug) {
            console.log(text);
        }
    }

    _onData(socket, data) {
        try {
            data = JSON.parse(data.toString());
            if (data.command === Quant.statuses.auth) {
                this._auth(data.data, socket);
            }
            else {
                if (!socket.isAuth) {
                    return void socket.end();
                }
                
                if (data.command === Quant.statuses.status) {
                    socket.status = data.data;
                    data.data.clientName = socket.clientName;

                    this._onCommand(data, socket);
                }
                else if (data.command === Quant.statuses.return) {
                    this._onReturn(data);
                }
                else {
                    this._onCommand(data, socket);
                }
            }
        }
        catch(e) {
            console.error(e);
        }
    }

    _onReturn(data) {
        const { command, returnSocket } = this.runningCommands.get(data.id);
        if (command) {
            this._runCommand(data, returnSocket);
        }
    }

    _onEnd(socket) {
        this._log('Disconnected ', socket.clientName);
        this.connections.delete(socket);
    }


    _auth({ name, token }, socket) {
        const client = this.clients.get(name);
        if (client && client.token === token) {
            this._log('Auth success', name);
            socket.client = client;
            socket.clientName = name;
            socket.isAuth = true;
        }
        else {
            this._log('Auth fail', name);
            socket.end();
        }
    }

    _onCommand(data, returnSocket) {
        for(let [sock] of this.connections) {
            const client = sock.client;
            if (client && client.allowCommands && client.allowCommands.execute) {
                if (client.allowCommands.execute.indexOf(data.command) > -1) {
                    this._runCommand(data, sock, returnSocket);
                }
            }
        }
        this._log('onCommand', data.command, data.data);
    }

    _runCommand({ command, data, id, done }, sock, returnSocket) {
        this._log('run command on', sock.clientName);
        try {
            sock.write(JSON.stringify({ done, command, data, id }));
            if (returnSocket) {
                this.runningCommands.set(id, {
                    sock,
                    command,
                    data,
                    done,
                    returnSocket
                });
            }
        } 
        catch(e) {
            console.error(e);
        }
    }

    addClient(name, config) {
        this.clients.set(name, config);
        return this;
    }

    createServer() {
        this._server = tls.createServer(this.config, socket => {
            this.connections.set(socket);
            socket.on('data', this._onData.bind(this, socket));
            socket.on('end', this._onEnd.bind(this, socket));
        });

        this._server.listen(this.config.port, () => {
            this._log('Server running');
        });
    }
}

Quant.statuses = {
    'return': ':quant:return:',
    'auth': ':quant:auth:',
    'status': ':quant:status:'
};

Quant.load = path => fs.readFileSync(path);

module.exports = Quant;