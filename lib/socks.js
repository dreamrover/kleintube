'use strict';
const util = require('util');

const VERSION = 5;

const AUTH = {
    NO_AUTH: 0,
    GSSAPI: 1,
    USERNAME_PASSWD: 2,
    IANA_ASSIGNED: 3, // 0x03 to 0x7f
    RESERVED: 0x80, // 0x80 to 0xfe
    NO_ACCEPTABLE_METHODS: 0xff
};

const CMD = {
    CONNECT: 1,
    BIND: 2,
    UDP_ASSOCIATE: 3
};

const ATYP = {
    IP_V4_ADDR: 1,
    DOMAINNAME: 3,
    IP_V6_ADDR: 4
};

const REP = {
    SUCCEEDED: 0,
    SOCKS_SERV_FAILURE: 1,
    CONN_NOT_ALLOWED: 2,
    NETWORK_UNREACHABLE: 3,
    HOST_UNREACHABLE: 4,
    CONN_REFUSED: 5,
    TTL_EXPIRED: 6,
    CMD_NOT_SURPPORTED: 7,
    ATYP_NOT_SUPPORTED: 8
};

function parseNegotiation(data) {
    if (data.length < 3) {
        return {ok: false};
    }
    var arr = Buffer.from(data);
    var ver = arr.readUInt8(0);
    var n = arr.readUInt8(1);
    var method = arr.readUInt8(2);
    if (ver != VERSION || n < 1 || method != AUTH.NO_AUTH) {
        return {ok: false, msg: Buffer.from([VERSION, AUTH.NO_ACCEPTABLE_METHODS])};
    }
    return {ok: true, msg: Buffer.from([VERSION, AUTH.NO_AUTH])};
}

function generateReply(rep = REP.SUCCEEDED) {
    var rep = Buffer.alloc(10);
    rep.writeUInt8(VERSION);
    rep.writeUInt8(rep, 1);
    rep.writeUInt8(ATYP.IP_V4_ADDR, 3);
    return rep;
}

function parseRequest(data) {
    var host;
    var port;
    if (data.length < 8) {
        return {ok: false};
    }
    var buf = Buffer.from(data);
    var ver = buf.readUInt8(0);
    var cmd = buf.readUInt8(1);
    if (ver != VERSION || cmd != CMD.CONNECT) {
        return {ok: false, msg: generateReply(REP.CMD_NOT_SURPPORTED)};
    }
    var atyp = buf.readUInt8(3);
    switch (atyp) {
        case ATYP.DOMAINNAME:
            let alen = buf.readUInt8(4);
            host = buf.toString('utf8', 5, 5+alen);
            port = buf.readUInt16BE(5+alen);
            break;
        case ATYP.IP_V4_ADDR:
            if (data.length < 10) {
                return {ok: false, msg: generateReply(REP.CONN_NOT_ALLOWED)};
            }
            host = util.format('%d.%d.%d.%d', buf[4], buf[5], buf[6], buf[7]);
            port = buf.readUInt16BE(8);
            break;
        case ATYP.IP_V6_ADDR:
            if (data.length < 22) {
                return {ok: false, msg: generateReply(REP.CONN_NOT_ALLOWED)};
            }
            host = util.format('%s:%s:%s:%s:%s:%s:%s:%s', buf.toString('hex',4,6), buf.toString('hex',6,8), buf.toString('hex',8,10), buf.toString('hex',10,12), buf.toString('hex',12,14), buf.toString('hex',14,16), buf.toString('hex',16,18), buf.toString('hex',18,20));
            port = buf.readUInt16BE(20);
            break;
        default:
            return {ok: false, msg: generateReply(REP.ATYP_NOT_SUPPORTED)};
    }
    return {ok: true, host: host, port: port};
}

module.exports = {
    parseNegotiation: parseNegotiation,
    generateReply: generateReply,
    parseRequest: parseRequest
};