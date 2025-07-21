const express = require('express');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const jsonServer = require('json-server');
const app = express();
const cors = require('cors');
const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

let { genKey, startServer, addPeer, removePeer, managePeer, resetServer } = require('./middleware/commands');

const router = jsonServer.router(path.join(__dirname, 'db', 'base.json'));
const db = router.db;

app.use(express.static(path.join(__dirname, 'dist')));

app.use(cookieParser())
app.use(cors({
  origin: 'http://192.168.31.78:5173',
  credentials: true,
  methods: ['GET, HEAD, PUT, PATCH, POST, DELETE'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));


// Use json-server's router at /db
//app.use('/db', router);

let reuseCheck = (req, res, next) => {
    try{
        const ip_pool = db.get('reuse').value();

        if(ip_pool.length > 0){
            let allocated = ip_pool.shift()
            req.address = allocated
            db.set('reuse', ip_pool).write()
            next()
        }
        else {
            let address = db.get('ip').value()
            req.address = address[0]
            let allocated = address[0].split('.')
            if(parseInt(allocated[3]) <= 254){
                allocated = `${allocated[0]}.${allocated[1]}.${allocated[2]}.${parseInt(allocated[3])+1}`
                db.set('ip', [allocated]).write()
                next()
            }
        }
    }
    catch(err){
        console.log('Error at line no. 238 - ', err)
        res.status(500).json({ status: 'failed', message: 'Internal server error' });
    }
}

async function createQr(req, res, next) {
    try{
        const server = db.get('peers').find({ id: '10.0.0.1' }).value();
        const client = db.get('peers').find({ id: req.body.address }).value();
        
        let clientKey = client['private']
        let serverKey = server['public']
    
    let template = `[Interface]
PrivateKey = ${clientKey}
Address = ${req.body.address}/24

[Peer]
PublicKey = ${serverKey}
AllowedIPs = 0.0.0.0/0,::/0
PersistentKeepalive = 25
Endpoint = ${process.env.SERVERIP}:51820`

        console.log(template);
        
        QRCode.toFile(`qrcode/${req.body.address}.png`, template, function (err) {
            if(err) {
                console.log('Error at line no. 155 - ', err)
                res.status(500).json({status: 'failed', message: 'Failed to create QR'})
            }
            
            const fileData = fs.readFileSync(`qrcode/${req.body.address}.png`);

            const base64String = fileData.toString('base64');

            const ext = path.extname(`qrcode/${req.body.address}.png`).substring(1);
            const mimeType = `image/${ext}`;

            req.qrcode = `data:${mimeType};base64,${base64String}`

            console.log('Success at line no. 82 - QR generated')

            next()
        });
    }
    catch(err){
        console.log('Error at line no. 174 - ', err)
        res.status(500).json({status: 'failed', message: 'Failed to create QR'})
    }
}

async function createConf(req, res, next) {
    try{
        const server = db.get('peers').find({ id: '10.0.0.1' }).value();
        const client = db.get('peers').find({ id: req.body.address }).value();
        
        let clientKey = client['private']
        let serverKey = server['public']
    
    let template = `[Interface]
PrivateKey = ${clientKey}
Address = ${req.body.address}/24

[Peer]
PublicKey = ${serverKey}
AllowedIPs = 0.0.0.0/0,::/0
PersistentKeepalive = 25
Endpoint = ${process.env.SERVERIP}:51820`

        console.log(template);
        fs.writeFileSync(`confs/${req.body.address}.conf`, template);
        next()
    }
    catch(err){
        console.log('Error at line no. 134 - ', err)
        res.status(500).json({status: 'failed', message: 'Failed to create Conf file'})
    }
}

function verify(req, res, next){
    // const authHeader = req.headers.authorization;
    // if (!authHeader) return res.sendStatus(401);

    // const token = authHeader.split(' ')[1];

    const token = req.cookies.token;

    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'SECRET_KEY', (err, decode) => {
        if(err){
            console.log(err);
            return res.sendStatus(403);
        }
        req.user = decode
        next()
    });
}

app.post('/vpn/auth', async(req, res) => {
    const { password } = req.body;
    let storedHash = process.env.PASSWORD || "$2a$12$99gPlVjhHEPCrk4cFqVrvub0BqkHxItP4TcP1LU6HzAvI4QiD.4yu"

    const isMatch = await bcrypt.compare(password, storedHash);
    if (isMatch) {
        console.log('✅ Password is correct');
        const token = jwt.sign({ username: "admin" }, 'SECRET_KEY', { expiresIn: '1h' });

        res.cookie('token', token, { 
            httpOnly: true,
            secure: false,
            maxAge: 1000 * 60 * 60 * 24  // 1 day
        })

        res.status(200).json({ authenticated: true, token, message: 'Logged in successfully' });
    } else {
        console.log('❌ Password is incorrect');
        res.status(401).json({ message: 'Invalid credentials' });
    }
});

app.get('/vpn/verify', (req, res) => {
    // const authHeader = req.headers.authorization;
    // if (!authHeader) return res.sendStatus(401);

    // const token = authHeader.split(' ')[1];

    const token = req.cookies.token;

    if (!token) return res.sendStatus(401);

    jwt.verify(token, 'SECRET_KEY', (err, username) => {
        if(err){
            console.log(err);
            return res.sendStatus(403);
        }

        res.json({ authenticated: true });
    });
})

app.post('/vpn/logout', (req, res) => {
    const token = req.cookies.token;

    if (!token) return res.sendStatus(401);

    res.clearCookie('token', token, {
        httpOnly: true,
        secure: false,
        maxAge: 1000 * 60 * 60 * 24  // 1 day
    })

    res.status(200).json({ authenticated: false })    
});

app.get('/vpn/start', verify, genKey, startServer, (req, res) => {
    const newPeer = {
        id: '10.0.0.1',
        ip: '10.0.0.1',
        name: 'server',
        public: req.key.public,
        private: req.key.private
    }


    db.get('peers').push(newPeer).write();
    res.status(201).json({exec: 'success'})
})

app.post('/vpn/create', verify, genKey, reuseCheck, addPeer, (req, res) => {
    const newPeer = {
        id: req.address,
        ip: req.address,
        name: req.body.name,
        public: req.key.public,
        private: req.key.private,
        allow: true
    }

    db.get('peers').push(newPeer).write();
    res.status(200).json({exec: 'success', address: req.address, key: req.key })
})

app.post('/vpn/delete', verify, removePeer, (req, res) => {
    const id = req.body.address
    const peer = db.get('peers').find({ id }).value();

    if (!peer) return res.status(404).json({ error: 'User not found' });
    db.get('reuse').push(id).write()
    db.get('peers').remove({ id }).write();
    res.status(200).json({exec: 'success', address: req.address, key: req.body.peer })
})

app.post('/vpn/update', verify, managePeer, (req, res) => {
    db.get('peers').find({ id: req.body.address }).assign({ allow: req.body.cmd }).write();
    res.status(200).json({exec: 'success', key: req.body.peer })
})

app.get('/vpn/reset', verify, resetServer, (req, res) => {
    db.set('ip', ["10.0.0.2"]).write();
    db.set('reuse', []).write();
    db.set('peers', []).write();
    res.status(200).json({exec: 'success'})
})

app.get('/vpn/read', verify, (req, res) => {
    const peers = db.get('peers').value();
    res.status(200).json({exec: 'success', peers })
});

app.post('/vpn/qr', verify, createQr, (req, res) => {
    res.status(200).json({exec: 'success', qr: req.qrcode })
    //res.status(200).sendFile(path.join(__dirname, 'qrcode', `${req.body.address}.png`))
})

app.post('/vpn/conf', verify, createConf, (req, res) => {
    res.status(200).download(path.join(__dirname, 'confs', `${req.body.address}.conf`))
})

app.get(/(.*)/, (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
    console.log('Wireguard API Server Running on Port:', 3000);
});