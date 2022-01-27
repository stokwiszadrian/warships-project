const mqtt = require('paho-mqtt')
const client = new mqtt.Client('127.0.0.1', 8000, "client")
const reconnectTimeout = 2000
 
const onConnect = () => {
    console.log("Connected")
    client.subscribe('test')
    const message = new mqtt.Message("Hello world")
    message.destinationName = 'test'
    console.log(message, client)
    client.send(message)
}

const onFailure = (msg) => {
    console.log("Connection attempt to host 127.0.0.1 failed.")
    setTimeout(MQTTconnect, reconnectTimeout)
}

const onMessageArrived = (msg) => {
    console.log(`Received a message from ${msg.destinationName}: ${msg.payloadString}`)
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

function mqttSwap() {
        mqttButton.parentElement.style.display = "none"
        document.getElementById("dashboard").style.display = "block"
}

function dashSwap() {
    dashboardButton.parentElement.style.display = "none"
    document.getElementById("mqtt").style.display = "block"
}

const mqttButton = document.getElementById("mqtt").getElementsByClassName("swap")[0]
const dashboardButton = document.getElementById("dashboard").getElementsByClassName("swap")[0]
mqttButton.addEventListener("click", mqttSwap, false)
dashboardButton.addEventListener("click", dashSwap, false)


MQTTconnect() 