const { exec, execSync } = require('child_process');
const fs = require('fs');

/* Generate private and public key */
let genKey = (req, res, next) => {
    return new Promise((resolve, reject) => {
        const privateKey = execSync('wg genkey').toString().trim();

        const publicKey = execSync(`echo ${privateKey} | wg pubkey`).toString().trim();

        let key = {private: privateKey, public: publicKey}

        resolve(key)
    })
    .then((key) => {
        req.key = key
        console.log('Generated private and public key -- [17]');
        next()
    })
    .catch((err) => {
        console.log('Error at line no. 21 [middleware] - ', err)
        res.status(500).json({ error: err });
    })
}

/* Configure and run the server */
let startServer = (req, res, next) => {
    return new Promise((resolve, reject) => {
        const wgConfig = `
        [Interface]
PrivateKey = ${req.key.private}
Address = 10.0.0.1/24
ListenPort = 51820

# Enable IP forwarding and set up NAT using iptables
PostUp = iptables -t nat -A POSTROUTING -o eth0 -j MASQUERADE
PostUp = iptables -A FORWARD -i wg0 -j ACCEPT
PostUp = iptables -A FORWARD -o wg0 -j ACCEPT

# Clean up iptables rules on interface shutdown
PostDown = iptables -t nat -D POSTROUTING -o eth0 -j MASQUERADE
PostDown = iptables -D FORWARD -i wg0 -j ACCEPT
PostDown = iptables -D FORWARD -o wg0 -j ACCEPT`

        fs.writeFile('/etc/wireguard/wg0.conf', wgConfig.trim(), { mode: 0o600 }, (err) => {
            if (err) {
                console.log('Error -- [47] - ', err)
            } else {
                let run = `wg-quick up wg0`;

                try {
                    execSync(run);
                    resolve()
                } catch (err) {
                    reject(err.message)
                }
            }
        });
    })
    .then(() => {
        console.log('Wireguard (wg0) started successfully - [62]')
        next()
    })
    .catch((err) => {
        console.log('Error -- [65] - ', err)
        res.status(500).json({ error: err });
    })
}

/* Add new peer */
let addPeer = (req, res, next) => {
    return new Promise((resolve, reject) => {
        let add = `wg set wg0 peer ${req.key.public} endpoint ${process.env.SERVERIP}:5182 allowed-ips ${req.address}/32 persistent-keepalive 25`;

        try {
            execSync(add);
            resolve()
        } catch (err) {
            reject(err.message)
        }
    })
    .then(() => {
        console.log('Peer added successfully -- [83]')
        next()
    })
    .catch((err) => {
        console.log('Error at line no. 87 [middleware] - ', err)
        res.status(500).json({ error: err });
    })
}

/* Remove the peer */
let removePeer = (req, res, next) => {
    let remove = `wg set wg0 peer ${req.body.peer} remove`

    return new Promise((resolve, reject) => {
        execSync(remove);
        resolve()
    })
    .then(() => {
        console.log('Peer removed successfully - [101]')
        next()
    })
    .catch((err) => {
        console.log('Error at line no. 105 [middleware] - ', err)
        res.status(500).json({ error: err });
    })
}

/* Block or unblock the peer */
function managePeer(req, res, next){

    if(req.body.cmd == true){
        let cmd = `wg set wg0 peer ${req.body.peer} allowed-ips ${req.body.address}/32`

        return new Promise((resolve, reject) => {
            execSync(cmd);
            resolve()
        })
        .then(() => {
            console.log('Success at line no. 121 [middleware] - IP unblocked')
            next()
        })
        .catch((err) => {
            console.log('Error at line no. 125 [middleware] - ', err)
            res.status(500).json({ error: err });
        })
    }
    else{
        let cmd = `wg set wg0 peer ${req.body.peer} allowed-ips 0.0.0.0/32`

        return new Promise((resolve, reject) => {
            execSync(cmd);
            resolve()
        })
        .then(() => {
            console.log('Success at line no. 137 [middleware] - IP blocked')
            next()
        })
        .catch((err) => {
            console.log('Error at line no. 141 [middleware] - ', err)
            res.status(500).json({ error: err });
        })
    }
}

/* Reset peer's and ip pool */
function resetServer(res, req, next){
    return new Promise((resolve, reject) => {
        try {
            execSync(`wg-quick down wg0`);
            console.log('wg0 set to down');
            execSync(`rm -rf /etc/wireguard/wg0.conf`);
            console.log('wg0 config removed');
            resolve()
        } catch (err) {
            reject(err)
        }
    })
    .then(() => {
        console.log('Success at line no. 161 [middleware] - Hard reset')
        next()
    })
    .catch((err) => {
        console.log('Error at line no. 165 [middleware] - ', err)
        res.status(500).json({ error: err });
    })
}

module.exports = { genKey, startServer, addPeer, removePeer, managePeer, resetServer }
