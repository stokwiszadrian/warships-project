const mqtt = require('paho-mqtt')
const { v4: uuidv4 } = require('uuid')
const id = uuidv4()
const client = new mqtt.Client('127.0.0.1', 8000, id)
const reconnectTimeout = 2000

function formSubmit() {
    const credentials = {
        login: document.getElementsByTagName("input")[0].value,
        password: document.getElementsByTagName("input")[1].value
    }
    console.log(credentials)
    client.send(`warships/${id}/server/user/login`, JSON.stringify(credentials))
}

function dashSwap() {
dashboardButton.parentElement.style.display = "none"
document.getElementById("mqtt").style.display = "block"
}

const loginButton = document.getElementById("submit")
const dashboardButton = document.getElementById("dashboard").getElementsByClassName("swap")[0]
loginButton.addEventListener("click", formSubmit, false)
dashboardButton.addEventListener("click", dashSwap, false)


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
            loginButton.parentElement.style.display = "none"
            document.getElementById("dashboard").style.display = "block"
            document.getElementsByClassName("error")[0].style.display = "none"
            document.getElementById("usergreeting").textContent = `Welcome back, ${data.user}`
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