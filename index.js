const express = require('express');
const jsonServer = require('json-server');
const app = express();
const path = require('path');
let { genKey, startServer, addPeer, removePeer, managePeer, resetServer } = require('./middleware/commands');

const router = jsonServer.router(path.join(__dirname, 'db', 'base.json'));

const db = router.db;

app.use(express.json());

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
            if(parseInt(allocated[3]) <= 255){
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

app.get('/', (req, res) => {
    res.status(200).send('Server online')
})

app.get('/start', genKey, startServer, (req, res) => {
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

app.post('/create', genKey, reuseCheck, addPeer, (req, res) => {
    const newPeer = {
        id: req.address,
        ip: req.address,
        name: req.body.name,
        public: req.key.public,
        private: req.key.private
    }

    db.get('peers').push(newPeer).write();
    res.status(200).json({exec: 'success', address: req.address, key: req.key })
})

app.post('/delete', removePeer, (req, res) => {
    const id = req.body.address
    const peer = db.get('peers').find({ id }).value();

    if (!peer) return res.status(404).json({ error: 'User not found' });
    db.get('reuse').push(id).write()
    db.get('peers').remove({ id }).write();
    res.status(200).json({exec: 'success', address: req.address, key: req.body.peer })
})

app.post('/update', managePeer, (req, res) => {
    res.status(200).json({exec: 'success', key: req.body.peer })
})

app.get('/reset', resetServer, (req, res) => {
    db.set('ip', ["10.0.0.2"]).write();
    db.set('reuse', []).write();
    db.set('peers', []).write();
    res.status(200).json({exec: 'success'})
})

app.get('/read', (req, res) => {
    const peers = db.get('peers').value();
    res.status(200).json({exec: 'success', peers })
});

app.listen(process.env.PORT || 3000, () => {
    console.log('Wireguard API Server Running on Port:', 3000);
});