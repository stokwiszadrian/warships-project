// window.addEventListener("load", function (event) { 
//  const es = new EventSource("http://localhost:7000/events/datetime");
 
//  es.addEventListener("message", function(event) {
//   const adElement = document.getElementById("ad");

//   adElement.textContent = event.data;
//  });
 
// });
const mqtt = require('paho-mqtt')
const client = new mqtt.Client('127.0.0.1', 8000, "client")


const onConnect = () => {
    console.log("Connected")
    const message = new mqtt.Message("Hello world")
    message.destinationName = 'test'
    console.log(message, client)
    client.send(message)
}

const MQTTconnect = () => {
    console.log("connecting to mqtt")
    const options = {
        timeout: 3,
        onSuccess: onConnect
    }
    client.connect(options)
}

MQTTconnect()