const mqtt = require('paho-mqtt')
const { v4: uuidv4 } = require('uuid')
const id = uuidv4()
const client = new mqtt.Client('127.0.0.1', 8000, id)
const reconnectTimeout = 2000
import Cookies from 'js-cookie'

if (Cookies.get('user')) {
    document.getElementById("main").style.display = "none"
    document.getElementById("dashboard").style.display = "block"
    document.getElementsByClassName("error")[0].style.display = "none"
    document.getElementById("usergreeting").textContent = `Welcome back, ${Cookies.get('user')}`
    console.log(Cookies.get('user'))
}
else {
    console.log("Nikt nie jest zalogowany")
}

function formSubmit() {
    const credentials = {
        login: document.getElementsByTagName("input")[0].value,
        password: document.getElementsByTagName("input")[1].value
    }
    document.getElementsByTagName("input")[0].value = ""
    document.getElementsByTagName("input")[1].value = ""
    console.log(credentials)
    client.send(`warships/${id}/server/user/login`, JSON.stringify(credentials))
}

function logout() {
    Cookies.remove('user')
    logoutButton.parentElement.style.display = "none"
    document.getElementById("main").style.display = "block"
}

const loginButton = document.getElementById("submit")
const logoutButton = document.getElementsByClassName("logout")[0]
loginButton.addEventListener("click", formSubmit, false)
logoutButton.addEventListener("click", logout, false)


const onConnect = () => {
    console.log("Connected, id:", id)
    client.subscribe(`warships/${id}/response`)
}

const onFailure = (msg) => {
    console.log("Connection attempt to host 127.0.0.1 failed.")
    setTimeout(MQTTconnect, reconnectTimeout)
}

const onMessageArrived = (msg) => {
    console.log(msg)
    console.log(`Received a message from ${msg.destinationName}: ${msg.payloadString}`)
    const data = JSON.parse(msg.payloadString)
    switch(data.response) {
        case "LOGIN OK":
            console.log("SUCCESS")
            document.getElementById("main").style.display = "none"
            document.getElementById("dashboard").style.display = "block"
            document.getElementsByClassName("error")[0].style.display = "none"
            document.getElementById("usergreeting").textContent = `Welcome back, ${data.user}`
            Cookies.set('user', data.user, { expires: 1 })
            break;

        case "AUTHENTICATION FAILED":
            console.log("FAILED")
            document.getElementsByClassName("error")[0].style.display = "block"
            break;

        default: 
            document.getElementsByClassName("error")[0].style.display = "none"
            console.log("What is this?")
    }
}

const MQTTconnect = () => {
    console.log("connecting to mqtt")
    const options = {
        timeout: 3,
        onSuccess: onConnect,
        onFailure: onFailure
    }
    client.onMessageArrived = onMessageArrived
    client.connect(options)
}


MQTTconnect() 