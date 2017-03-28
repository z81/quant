const tls = require('tls');
const fs = require('fs');

const defaultConfig = { 
    requestCert: true,
    rejectUnauthorized: true,
    host: '127.0.0.1',
    port: 9125
};

class Quant {
    /**
     * Qaunt Configuration
     * @param config
     */
    constructor(config = {}) {
        this.config = Object.assign({}, defaultConfig, config);
        this._createServer();
        this.connections = new Map();
        this.clients = new Map();
        this.runningCommands = new Map();
    }

    /**
     * Logger
     * @param text
     * @private
     */
    _log(text) {
        if (this.config.debug) {
            console.log(text);
        }
    }

    /**
     * On socket datra
     * @param socket
     * @param data
     * @returns undefined
     * @private
     */
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

    /**
     * return data action
     * @param data
     * @private
     */
    _onReturn(data) {
        const task = this.runningCommands.get(data.id);
        if (task && task.command) {
            this._runCommand(data, task.returnSocket);
        }
    }

    /**
     * Disconnect event
     * @param socket
     * @private
     */
    _onEnd(socket) {
        this._log('Disconnected ', socket.clientName);
        this.connections.delete(socket);
    }

    /**
     * Auth action
     * @param name
     * @param token
     * @param socket
     * @private
     */
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

    /**
     *
     * @param command
     * @param socket
     * @returns {boolean}
     */
    isAllowedCommand(command, socket) {
        if (socket.client && socket.client.allowCommands && socket.client.allowCommands.run) {
            if (socket.client.allowCommands.run.indexOf(command) === -1) {
                console.warn(`Access denied: run ${command} / client name: ${socket.clientName}`);
                return false;
            }
        }

        return true;
    }
    /**
     * Run client action
     * @param data
     * @param returnSocket
     * @private
     */
    _onCommand(data, returnSocket) {
        if (!this.isAllowedCommand(data.command, returnSocket)) return;

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

    _sendTaskStats() {
        const data = Array.from(this.runningCommands)
            .filter(data => data[1].command !== Quant.statuses.status)
            .map(data => {

            return {
                progress: data[1].progress,
                status: data[1].status,
                command: data[1].command,
                data: data[1].data,
                done: data[1].done,
            };
        });

        //Todo: fix
        for(let [sock] of this.connections) {
            const client = sock.client;
            if (client && client.allowCommands && client.allowCommands.execute) {
                if (client.allowCommands.execute.indexOf(Quant.statuses.tasks) > -1) {
                    sock.write(JSON.stringify({
                        command: Quant.statuses.tasks,
                        data: data
                    }));
                }
            }
        }
        console.log('runung tasks', JSON.stringify(data))
    }
    /**
     * Run command on sock
     * @param command
     * @param data
     * @param id
     * @param done
     * @param sock
     * @param returnSocket
     * @private
     */
    _runCommand({ command, data, id, done, progress, status }, sock, returnSocket) {
        this._log('Run command on', command, sock.clientName);

        try {
            sock.write(JSON.stringify({ done, command, data, id, progress, status }));
            if (returnSocket) {
                console.log('return socket', data, id);
                this.runningCommands.set(id, {
                    sock,
                    command,
                    data,
                    done,
                    returnSocket,
                    progress,
                    status
                });
                this._sendTaskStats();
            }

            if (done) {
                this.runningCommands.delete(id);
            }
        } 
        catch(e) {
            console.error(e);
        }
    }

    /**
     *
     * @param name
     * @param config
     * @returns {Quant}
     */
    addClient(name, config) {
        this.clients.set(name, config);
        return this;
    }

    /**
     * Run server
     * @returns undefined
     * @private
     */
    _createServer() {
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
    'status': ':quant:status:',
    'tasks': ':quant:tasks:'
};

Quant.load = path => fs.readFileSync(path);

module.exports = Quant;