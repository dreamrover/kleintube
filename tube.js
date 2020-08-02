#!/usr/bin/env node
'use strict';
//require('console-stamp')(console, '[HH:MM:ss.l]');
const fs = require('fs');
const klein = require('./lib/klein');

const cfgfile = process.argv[2] ? process.argv[2] : 'config.json';

try {
    var n = 0;
    const cfg = JSON.parse(fs.readFileSync(cfgfile));
    if (cfg.server) {
        const servers = cfg.server[0] ? cfg.server : [cfg.server];
        servers.forEach(node => {
            if (!node.port || !node.key) {
                throw new Error('Server format incorrect in %s.', cfgfile);
            }
            new klein.Server(node).run();
            n++;
        });
    }
    if (cfg.client) {
        const clients = cfg.client[0] ? cfg.client : [cfg.client];
        clients.forEach(node => {
            if (!node.port || !node.key || !node.remote_host || !node.remote_port) {
                throw new Error('Client format incorrect in %s.', cfgfile);
            }
            new klein.Client(node).run();
            n++;
        });
    }
    if (n == 0) {
        throw new Error('No available settings for server or client in %s.', cfgfile);
    }
} catch (e) {
    console.log(e.toString());
    process.exit(1);
}