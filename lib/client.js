'use strict';
const net = require('net');
const dns = require('dns');
const util = require('util');
const WebSocket = require('ws');
const Cipher = require('./cipher');
const socks = require('./socks');

const TIMEWAIT = 10000;

class Client {
    constructor(options) {
        this.host = options.host;
        this.port = options.port;
        const port = this.port;
        const key = options.key;
        const rhost = options.remote_host;
        const rport = options.remote_port;

        this.server = new net.Server({allowHalfOpen: true});

        this.server.on('connection', function(socket) {
            const peer = socket.remoteAddress + ':' + socket.remotePort;
            console.log('%s -- :%d @ connected', peer, port);

            socket.on('end', function() {
                console.log('%s |- :%d @ end', peer, port);
                const tmsg = util.format('%s -| :%d @ end via timer', peer, port);
                setTimeout(s => {
                        console.log(s);
                        socket.end();
                    }, TIMEWAIT, tmsg
                );
            });

            socket.once('data', function(raw) {
                console.log('%s ->[%d] :%d @ negotiation: %s', peer, raw.length, port, raw.toString('hex'));
                var res = socks.parseNegotiation(raw);
                if (!res.ok) {
                    if (res.msg) {
                        console.log('%s <-[%d] :%d @ refuse: %s', peer, res.msg.length, port, res.msg.toString('hex'));
                        socket.write(res.msg);
                    }
                    socket.end();
                    return;
                }
                var request;
                socket.once('data', function(raw) {
                    console.log('%s ->[%d] :%d @ request', peer, raw.length, port);
                    console.log('%s', JSON.stringify(socks.parseRequest(raw)));
                    request = Buffer.from(raw);
                });
                console.log('%s <-[%d] :%d @ OK: %s', peer, res.msg.length, port, res.msg.toString('hex'));
                socket.write(res.msg);

                dns.lookup(rhost, (err, addr, family) => {
                    //console.log('IPv%d: %s', family, addr);
                    var cipher = new Cipher(key);
                    const ws = new WebSocket(util.format('ws://%s:%d', addr, rport));

                    ws.on('open', _ => {
                        const local = ws._socket.address().address + ':' + ws._socket.address().port;
                        console.log('%s -- :%d @ %s ~~ %s:%d established', peer, port, local, addr, rport);

                        socket.on('error', function(err) {
                            console.log('%s ?- :%d @ %s ~~ %s:%d %s', peer, port, local, addr, rport, err.toString());
                            ws.close();
                        });

                        socket.on('close', function(had_err) {
                            console.log('%s -X :%d @ %s ~~ %s:%d close (%s)', peer, port, local, addr, rport, had_err.toString());
                            ws.close();
                        });

                        socket.on('data', function(raw) {
                            console.log('%s ->[%d] :%d @ %s ~~ %s:%d', peer, raw.length, port, local, addr, rport);
                            //console.log(raw.toString('hex'));
                            const msg = cipher.encrypt(raw);
                            console.log('%s -- :%d @ %s [%d]~> %s:%d', peer, port, local, msg.length, addr, rport);
                            ws.send(msg);
                        });

                        //request ? ws.send(cipher.encrypt(request)) : _=>{};
                        if (request) {
                            let msg = cipher.encrypt(request);
                            console.log('%s -- :%d @ %s [%d]~> %s:%d', peer, port, local, msg.length, addr, rport);
                            ws.send(msg);
                        }
                    });

                    ws.on('error', err => {
                        const local = ws._socket ? ws._socket.address().address + ':' + ws._socket.address().port : null;
                        console.log('%s -- :%d @ %s ~? %s:%d %s', peer, port, local, addr, rport, err.toString());
                        socket.end();
                    });

                    ws.on('close', (code, reason) => {
                        const local = ws._socket ? ws._socket.address().address + ':' + ws._socket.address().port : null;
                        console.log('%s -- :%d @ %s X~ %s:%d close (%d) %s', peer, port, local, addr, rport, code, reason);
                        socket.end();
                    });

                    ws.on('message', msg => {
                        const local = ws._socket.address().address + ':' + ws._socket.address().port;
                        console.log('%s -- :%d @ %s [%d]<~ %s:%d', peer, port, local, msg.length, addr, rport);
                        try {
                            raw = cipher.decrypt(msg);
                        } catch (e) {
                            console.log(e.toString());
                            socket.end();
                            ws.close();
                            return;
                        }
                        //console.log(raw.toString('hex'));
                        if (!socket.destroyed) {
                            console.log('%s <-[%d] :%d @ %s ~~ %s:%d', peer, raw.length, port, local, addr, rport);
                            socket.write(raw);
                        } else {
                            console.log('%s X-[%d] :%d @ %s ~~ %s:%d destroyed', peer, raw.length, port, local, addr, rport);
                            //ws.close();
                        }
                    });
                });
            });
        });
    }

    run() {
        const host = this.host;
        const port = this.port;
        this.server.listen(this.port, this.host, function() {
            console.log(`Client listening on %s:${port}`, host ? host : '');
        });
    }
}

module.exports = Client;