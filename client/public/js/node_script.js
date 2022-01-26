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

function pushFunction(b) {
    switch (b.id) {
        case 'one':
            console.log("ONE")
            window.history.pushState("", "", "http://localhost:3000/one")
            window.history.forward()
            console.log(window.history)
        case 'two':
            console.log("TWO")
            window.history.pushState("", "", "http://localhost:3000/two ")
            window.history.forward()
            console.log(window.history)
        // default:
        //     console.log("ZAMN")
            
    }
}

const bttn = document.getElementsByClassName('swap')
console.log(bttn[0])
if (bttn){
    bttn[0].addEventListener("click", function() {pushFunction(bttn[0])}, false)
}


MQTTconnect() 