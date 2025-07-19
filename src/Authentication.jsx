import React, { useState, useEffect } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

let url = "/"

const api = axios.create({
  baseURL: url,
  withCredentials: true,
});

function Authentication(){

    const navigate = useNavigate()
    let [password, setPassword] = useState("")
    let [active, setActive] = useState(true)

    useEffect(() => {
        verify()
    }, [])

    async function verify() {
        try{
            const response = await api.get('/vpn/verify');
            if (response.data.authenticated) {
                console.log('Authorized');
                navigate("/dashboard")
            } else {
                setActive(false)
                console.log('Need to login');
            }
        }
        catch(error){
            console.log('Unable to establish connection', error);
        }
    }

    async function authenticate(){
        if(password.length > 0){
            try{
                let response = await api.post('/vpn/auth', { password });
                if(response.data.authenticated){
                    navigate("/dashboard")
                }
            } 
            catch(err){
                alert('Incorrect password. Please try again.');
            }
        }
        else{
            alert('Please enter a password')
        }
    }

    return(
        <section className="section is-medium is-flex is-justify-content-center">
            <div className="columns is-flex is-justify-content-center">
                <div className="column is-10-desktop is-6-mobile has-text-centered">
                    <div>
                        <p className="poppins-semibold is-size-4">Ragul's VPN</p>
                        <p className="poppins-regular help">WireGuard Dashboard</p>
                        <img src="/vpn-logo.png" width={150}/>
                    </div>
                    <div className="mt-4">
                        <input className="input poppins-regular has-text-centered" type="password" placeholder="Password" onChange={(e) => setPassword(e.target.value)}/>
                        <button className="button poppins-regular is-outlined mt-5" disabled={active} onClick={authenticate} style={{ backgroundColor: "#8B53FF" }}>Login</button>
                    </div>
                </div>
            </div>
        </section>
    )
}

export default Authentication;