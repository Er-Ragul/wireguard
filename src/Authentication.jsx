import React, { useState, useEffect } from "react";
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const api = axios.create({
  baseURL: "http://localhost:3000",  // change it
  withCredentials: true,
});

function Authentication(){

    const navigate = useNavigate()
    let [password, setPassword] = useState("")
    let [active, setActive] = useState(true)

    useEffect(() => {
        verify()
    }, [])

    function verify(){
        try{
            //const token = localStorage.getItem('token');

            api.get(`/vpn/verify`)
            .then(response => {
                console.log('Authorized');
                navigate("/dashboard")
            })
            .catch(error => {
                console.log('Need to login');
                setActive(false)
            })
        }
        catch(error){
            console.log('Unable to establish connection', error);
        }
    }

    async function authenticate(){
        if(password.length > 0){
            try{
                let response = await api.post(`/vpn/auth`, { password });
                if(response.data.authenticated){
                    //localStorage.setItem('token', response.data.token);
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
                <div className="column is-8-desktop is-8-tablet is-6-mobile has-text-centered">
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