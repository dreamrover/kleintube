'use strict';
const net = require('net');
const dns = require('dns');
const util = require('util');
const WebSocket = require('ws');
const Cipher = require('./cipher');
const socks = require('./socks');

const TIMEOUT = 60000;
const TIMEWAIT = 10000;

class Server {
    constructor(options) {
        this.key = options.key;
        this.port = options.port;
        this.server = new WebSocket.Server({ host: options.host, port: options.port });

        this.server.on('error', err => {
            console.log(err.toString());
        });

        this.server.on('close', () => {
            console.log('server close');
            this.server.clients.forEach(function each(client) {
                if (client.readyState === WebSocket.OPEN) {
                    client.destroy();
                }
            });
        });
    }

    run() {
        const key = this.key;
        const port = this.port;

        this.server.on('connection', (ws, req) => {
            const peer = req.connection.remoteAddress + ':' + req.connection.remotePort;
            console.log('%s ~~ :%d $ connected', peer, port);
            var cipher = new Cipher(key);

            ws.once('message', msg => {
                console.log('%s ~>[%d] :%d $', peer, msg.length, port);
                var raw;
                try {
                    raw = cipher.decrypt(msg);
                } catch (e) {
                    console.log(e.toString());
                    setTimeout(()=>ws.close(), Math.random()*TIMEOUT);
                    return;
                }
                var res = socks.parseRequest(raw);
                console.log(JSON.stringify(res));
                if (!res.ok) {
                    if (res.msg) {
                        let rmsg = cipher.encrypt(res.msg);
                        console.log('%s <~[%d] :%d $', peer, rmsg.length, port);
                        ws.send(rmsg);
                    }
                    setTimeout(()=>ws.close(), Math.random()*TIMEOUT);
                    return;
                }

                dns.lookup(res.host, (err, addr, family) => {
                    console.log('IPv%d: %s', family, addr);
                    var target = new net.Socket({allowHalfOpen: true});

                    target.on('error', function(err) {
                        const local = target.address().address + ':' + target.address().port;
                        console.log('%s ~~ :%d $ %s =? %s:%d %s', peer, port, local, addr, res.port, err.toString());
                        //ws.close();
                    });

                    target.on('end', function() {
                        const local = target.address().address + ':' + target.address().port;
                        console.log('%s ~~ :%d $ %s =| %s:%d end', peer, port, local, addr, res.port);
                        const tmsg = util.format('%s ~~ :%d $ %s |= %s:%d end via timer', peer, port, local, addr, res.port);
                        setTimeout(s => {
                                console.log(s);
                                target.end();
                            }, TIMEWAIT, tmsg
                        );
                    });

                    target.on('close', function(had_err) {
                        const local = target.address().address + ':' + target.address().port;
                        console.log('%s ~~ :%d $ %s X= %s:%d close (%s)', peer, port, local, addr, res.port, had_err.toString());
                        ws.close();
                    });

                    target.connect(res.port, addr, function() {
                        const local = target.address().address + ':' + target.address().port;
                        console.log('%s ~~ :%d $ %s == %s:%d established', peer, port, local, addr, res.port);

                        ws.on('error', err => {
                            console.log('%s ?~ :%d $ %s == %s:%d %s', peer, port, local, addr, res.port, err.toString());
                            target.end();
                        });

                        ws.on('close', (code, reason) => {
                            console.log('%s ~X :%d $ %s == %s:%d close (%d) %s', peer, port, local, addr, res.port, code, reason);
                            target.end();
                        });

                        ws.on('message', msg => {
                            console.log('%s ~>[%d] :%d $ %s == %s:%d', peer, msg.length, port, local, addr, res.port);
                            //console.log(raw.toString());
                            try {
                                raw = cipher.decrypt(msg);
                            } catch (e) {
                                console.log(e.toString());
                                ws.close();
                                return;
                            }
                            console.log('%s ~~ :%d $ %s [%d]=> %s:%d', peer, port, local, raw.length, addr, res.port);
                            target.write(raw);
                        });

                        const rep = cipher.encrypt(socks.generateReply());
                        console.log('%s <~[%d] :%d $ %s == %s:%d', peer, rep.length, port, local, addr, res.port);
                        ws.send(rep);
                    });

                    target.on('data', function(raw) {
                        const local = target.address().address + ':' + target.address().port;
                        console.log('%s ~~ :%d $ %s [%d]<= %s:%d', peer, port, local, raw.length, addr, res.port);
                        //console.log(raw.toString());
                        const msg = cipher.encrypt(raw);
                        console.log('%s <~[%d] :%d $ %s == %s:%d', peer, msg.length, port, local, addr, res.port);
                        ws.send(msg);
                    });
                });
            });
        });
    }
}

module.exports = Server;