import React, { useState, useEffect } from "react"
import axios from "axios"
import { useNavigate } from 'react-router-dom';

let url = "/"

const api = axios.create({
  baseURL: url,
  withCredentials: true,
});

function Dashboard(){

    const navigate = useNavigate()
    let [loaded, setLoaded] = useState(false)
    let [active, setActive] = useState(false)
    let [peer, setPeer] = useState([])
    let [modal, setModal] = useState(false)
    let [qrmodal, setQrmodal] = useState(false)
    let [name, setName] = useState("")
    let [qrcode, setQrcode] = useState(null)

    useEffect(() => {
        verify()
    }, [])

    async function verify() {
      const res = await api.get(`/vpn/verify`);
      if (res.data.authenticated) {
        console.log('Authorized');
        setLoaded(true)
        read()
      } else {
        console.log('Error');
        navigate("/")
      }
    }

    function start(){
        api.get(`/vpn/start`)
        .then((response) => {
            setActive(true)
            alert("Wireguard device is up")
        })
        .catch((error) => {
            console.log(error);
        })        
    }

    function read(){
        api.get(`/vpn/read`)
        .then((response) => {
            if(response.data.peers.length > 0){
                setActive(true)
            }
            else{
                setActive(false)
            }
            setPeer(response.data.peers.slice(1))
        })
        .catch((error) => {
            console.log(error);
        })
    }

    function openModel(){
        if(active){
            setModal(!modal)
        }
        else {
            alert('The WireGuard device is down. Please activate it and try again.')
        }
    }

    function create(){
        if(name.length != 0){
            api.post(`/vpn/create`, { name })
            .then((response) => {
                read()
                setModal(false)
            })
            .catch((error) => {
                console.log(error);
            })
        }
        else{
            alert('Name should not be empty')
        }
    }

    function update(client, index){
        api.post(`/vpn/update`, {
            "cmd": !client.allow,
            "address": client.ip,
            "peer": client.public
        })
        .then((response) => {
            read()
        })
        .catch((error) => {
            console.log(error);
        })
    }

    function remove(client, index){
        api.post(`/vpn/delete`, {
            "address": client.ip,
            "peer": client.public
        })
        .then((response) => {
            read()
        })
        .catch((error) => {
            console.log(error);
        })
    }

    function reset(){
        api.get(`/vpn/reset`)
        .then((response) => {
            read()
            alert("Wireguard device is down")
        })
        .catch((error) => {
            console.log(error);
        })
    }

    function getqrcode(client, index){
        api.post(`/vpn/qr`, { address: client.ip })
        .then((response) => {
            setQrcode(response.data.qr)
            setQrmodal(!qrmodal)
        })
        .catch((error) => {
            console.log(error);
        })
    }

    async function getconf(client, index){
        try{
            const response = await api.post(`/vpn/conf`, { address: client.ip }, { responseType: 'blob' });

            const blob = new Blob([response.data]);
            const downloadUrl = window.URL.createObjectURL(blob);

            const link = document.createElement('a');
            link.href = downloadUrl;
            link.download = `${client.name}.conf`;
            document.body.appendChild(link);
            link.click();

            window.URL.revokeObjectURL(downloadUrl);
            document.body.removeChild(link);
        }
        catch(error){
            console.error('Download failed:', error);
        }        
    }

    function logout(){
        api.post(`/vpn/logout`)
        .then((response) => {
            navigate('/')
        })
        .catch((error) => {
            console.log(error);
            alert('Logout failed. Please try again')
        })
    }

    return(
        loaded ?
            <div>
                <section className="section">
                    <div className="columns is-flex is-justify-content-center">
                        {/* Title */}
                        <div className="column is-8-desktop">
                            {/* Title */}
                            <div className="is-flex is-justify-content-space-between is-align-items-center">
                                <div>
                                    <p className="is-size-5 poppins-bold has-text-black">Ragul's VPN</p>
                                    <p className="help">WireGuard Dashboard <span className="tag is-light">v1.0.0</span></p>
                                </div>                            
                                <button className="button poppins-regular is-danger is-small is-outlined" onClick={logout}>Logout</button>
                            </div>
                            <hr />
                            <div className="is-flex is-justify-content-space-between is-align-items-center">
                                <div><p className="subtitle poppins-semibold has-text-black">Clients</p></div>
                                <div>
                                    <button className="button is-info is-outlined poppins-regular is-small" onClick={openModel}>New Client</button>
                                    <button className="button is-danger is-outlined poppins-regular is-small ml-3" onClick={reset}><img src="/reset.png" width={18}/></button>
                                    <button className={`button ${active ? 'is-primary' : 'is-danger'} poppins-regular is-small ml-3`} onClick={start}><img src="/power.png" width={18}/></button>
                                </div>
                            </div>
                            {/* Peers List */}
                            <div className="mt-6">
                                {
                                    peer.map((client, index) => {
                                        return(
                                            <div className="box" key={index}>
                                                <div className="is-flex is-justify-content-space-between is-align-items-center">
                                                    {/* Left */}
                                                    <div className="is-flex is-align-items-center">
                                                        <div>
                                                            <img src="/user.png" width={30}/>
                                                        </div>
                                                        <div className="ml-3">
                                                            <p className="poppins-bold has-text-black">{client.name}</p>
                                                            <p className="help poppins-regular">{client.ip}</p>
                                                        </div>
                                                    </div>
                                                    {/* Right */}
                                                    <div className="is-flex is-align-items-center">
                                                        <span className="ml-5" onClick={() => update(client, index)}>
                                                            <img src={client.allow == true ? '/on-button.png' : '/off-button.png'} width={36} />
                                                        </span>
                                                        <span className="ml-5">
                                                            <img src="/qr-code.png" width={23} onClick={() => getqrcode(client, index)} />
                                                        </span>
                                                        <span className="ml-5">
                                                            <img src="/file.png" width={24} onClick={() => getconf(client, index)} />
                                                        </span>
                                                        <span className="ml-4" onClick={() => remove(client, index)}>
                                                            <img src="/trash.png" width={26} />
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        </div>
                    </div>
                    <div className={`modal ${modal ? 'is-active': null } p-6`}>
                        <div className="modal-background"></div>
                        <div className="modal-card">
                            <section className="modal-card-body has-text-centered">
                                <p className="subtitle poppins-semibold has-text-black">New Client</p>
                                <input className="input has-text-centered poppins-regular" type="text" placeholder="Enter Client Name" required onChange={(e) => setName(e.target.value)}/>
                                <div className="is-flex is-justify-content-space-between mt-5">
                                    <button className="button is-success is-outlined poppins-regular" onClick={create}>Add Client</button>
                                    <button className="button is-danger is-outlined poppins-regular" onClick={() => setModal(!modal)}>Cancel</button>
                                </div>
                            </section>
                        </div>
                    </div>
                    <div className={`modal ${qrmodal ? 'is-active' : null} p-6`}>
                        <div className="modal-background"></div>
                        <div className="modal-content">
                            <p className="image is-square">
                                {
                                    qrmodal ? <img src={qrcode} /> : null
                                }
                            </p>
                        </div>
                        <button className="modal-close is-large" aria-label="close" onClick={() => setQrmodal(!qrmodal)}></button>
                    </div>
                </section>
            </div>:
            <section className="hero is-fullheight is-flex is-justify-content-center is-align-items-center">
                <h1 className="poppins-bold title is-size-2">{`<Loading />`}</h1>
            </section>
    )
}

export default Dashboard