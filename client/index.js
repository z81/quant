const crypto = require('crypto');
const tls = require('tls');
const fs = require('fs');
const os = require('os');

const defaultConfig = {
    reconnectTimeout: 500,
    updStatusTime: 5000,
    host: '127.0.0.1',
    port: 9125
};

class Quant {
    /**
     * Quant configuration
     * @param config
     */
    constructor(config = {}) {
        this.actions = new Map();
        this.runingCommands = new Map();
        this.socket = null;
        this.config = Object.assign({}, defaultConfig, config);
        if (!this.config.checkServerIdentity) {
             this.config.checkServerIdentity = () => undefined;
        }

        this.connect();
        this.registerSystemStatusWatcher();
    }

    /**
     * Connect to server
     */
    connect() {
        const config = this.config;
        this.socket = tls.connect(config.port, config);
        this.socket.on('connect', this._onConnect.bind(this));
        this.socket.on('error', this._onError.bind(this));
        this.socket.on('data', this._onData.bind(this))
    }

    /**
     * Error event
     * @param err
     * @private
     */
    _onError(err) {
        console.error('Error: ', err.message);
        this._log('Reconnecting');
        setTimeout(this.connect.bind(this), this.config.reconnectTimeout);
    }

    /**
     * onData event
     * @param data
     * @private
     */
    _onData(data) {
        try {
            data = JSON.parse(data.toString());
            const action = this.actions.get(data.command);
            if (action) {
                this.makeTask(action, data);
            }
            else if (this.runingCommands.has(data.id)) {
                const events = this.runingCommands.get(data.id).events;
                if (data.done) {
                    if (events.end) events.end(data.data);
                    if (events.done) events.done(data.data);
                    if (events.success) events.success(data.data);
                }

                if (data.progress && events.progress) {
                    events.progress(data.progress);
                }

                if (data.status && events.status) {
                    events.status(data.status);
                }

                if (events.data) {
                    events.data(data.data);
                }
            }
        }
        catch(e) {
            console.error(e);
        }
    }

    /**
     * Create task
     * @param action
     * @param data
     */
    makeTask(action, data) {
        const send = params => {
            this.send(Object.assign({}, {
                command: Quant.statuses.return,
                id: data.id
            }, params));
        };

        const command = {
            setStatus: (status, progress) => send({ status, progress }),
            setProgress: (progress, status) => send({ progress, status }),
            success: data => send({ data, done: true }),
            end: data => send({ data, done: true }),
            done: data => send({ data, done: true }),
        };

        action(data.data, command);
    }

    /**
     * Create system status sender
     */
    registerSystemStatusWatcher() {
        setInterval(() => {
            this.fire(Quant.statuses.status, {
                totalmem: os.totalmem(),
                freemem: os.freemem(),
                loadavg: os.loadavg(),
                uptime: os.uptime()
            });
        }, this.config.updStatusTime);
    }

    /**
     * Server connect vent
     * @private
     */
    _onConnect() {
        this._log('Connected to server success');
        this.fire(Quant.statuses.auth, {
            name: this.config.name,
            token: this.config.token
        });
    }

    /**
     * run action
     * @param name
     * @param data
     * @returns events
     */
    run(name, data) {
        const id = crypto.randomBytes(64).toString('hex');
        this._log('Task started ', name, data);
        this.fire(name, data, id);
        this.runingCommands.set(id, {
            events: {}
        });

        return {
            on: this._onTaskEvent.bind(this, id)
        };
    }

    /**
     * Event task event
     * @param id
     * @param name
     * @param clb
     * @private
     */
    _onTaskEvent(id, name, clb) {
        this.runingCommands.get(id).events[name] = clb; 
    }

    /**
     * send json to server
     * @param data
     */
    send(data) {
        try {
            this.socket.write(JSON.stringify(data));
        }
        catch(e) {
            console.error(e);
        }
    }

    /**
     * send command to server
     * @param command
     * @param data
     * @param id
     */
    fire(command, data, id) {
        this.send({ command, data, id });
    }

    /**
     * register task
     * @param name
     * @param clb
     */
    register(name, clb) {
        this.actions.set(name, clb);
    }

    /**
     * Logger
     * @param text
     * @private
     */
    _log(text) {
        if (this.config.debug) {
            console.log(text)
        }
    }
}

Quant.statuses = {
    'return': ':quant:return:',
    'auth': ':quant:auth:',
    'status': ':quant:status:'
};

Quant.load = path => fs.readFileSync(path);

module.exports = Quant;