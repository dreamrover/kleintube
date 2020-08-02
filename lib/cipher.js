'use strict';
const crypto = require('crypto');

function Cipher(key) {
    var cipher;
    // 256-bit key
    this.key = Buffer.alloc(32);
    this.key.write(key);
    // 96-bit nonce
    this.nonce = [undefined, undefined];
    this.aad = [Buffer.alloc(16, 0xaa), Buffer.alloc(16, 0xaa)];

    this.encrypt = function(raw) {
        if (this.nonce[0] == undefined) {
            let sec = Math.floor(Date.now()/1000);
            let rand = Math.floor((Math.random()-0.5)*100);
            //console.log('first: %d+(%d)=%d', sec, rand, sec+rand);
            this.nonce[0] = Buffer.alloc(12, 0x70);
            this.nonce[0].writeBigUInt64BE(BigInt(sec+rand));
            cipher = crypto.createCipheriv('chacha20-poly1305', this.key, this.nonce[0], { authTagLength: 16 });
            cipher.setAAD(this.aad[0]);
            crypto.randomFillSync(this.nonce[0], 1, 7);
            //console.log('nonce: '+this.nonce[0].toString('hex'));
            raw = Buffer.concat([this.nonce[0].slice(0, 8), Buffer.from(raw)]);
        } else {
            cipher = crypto.createCipheriv('chacha20-poly1305', this.key, this.nonce[0], { authTagLength: 16 });
            cipher.setAAD(this.aad[0]);
            let n = this.nonce[0].readBigUInt64BE();
            n++;
            //console.log('n: '+n.toString(16));
            this.nonce[0].writeBigUInt64BE(n);
        }
        var data = cipher.update(raw);
        cipher.final();
        var mac = cipher.getAuthTag()
        return Buffer.concat([data, mac]);
    }

    this.decrypt = function(msg) {
        var decipher;
        var raw;
        var ex;
        if (this.nonce[1] == undefined) {
            if (msg.length < 25) {
                throw new Error('message too short to decrypt');
            }
            let crack = false;
            let sec = Math.floor(Date.now()/1000);
            this.nonce[1] = Buffer.alloc(12, 0x70);
            for (let i=0; i<200; i++) {
                sec += i & 1 ? i : -i;
                this.nonce[1].writeBigUInt64BE(BigInt(sec));
                decipher = crypto.createDecipheriv("chacha20-poly1305", this.key, this.nonce[1], { authTagLength: 16 });
                decipher.setAAD(this.aad[1]);
                raw = decipher.update(msg.slice(0, -16));
                decipher.setAuthTag(msg.slice(-16));
                try {
                    decipher.final();
                } catch (e) {
                    ex = e;
                    continue;
                }
                raw.copy(this.nonce[1], 0, 0, 8);
                //console.log('nonce: '+this.nonce[1].toString('hex'));
                raw = raw.slice(8);
                crack = true;
                break;
            }
            if (!crack) {
                throw ex;
            } 
        } else {
            if (msg.length < 17) {
                throw new Error('message too short to decrypt');
            }
            decipher = crypto.createDecipheriv("chacha20-poly1305", this.key, this.nonce[1], { authTagLength: 16 });
            decipher.setAAD(this.aad[1]);
            raw = decipher.update(msg.slice(0, -16));
            decipher.setAuthTag(msg.slice(-16));
            decipher.final();
            let n = this.nonce[1].readBigUInt64BE();
            n++;
            //console.log('n: '+n.toString(16));
            this.nonce[1].writeBigUInt64BE(n);
        }
        return raw;
    }
}

module.exports = Cipher;