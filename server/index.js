global.WebSocket = require('ws')
const client = require('./config/psqlClient')
const mqtt = require('paho-mqtt')
const server = new mqtt.Client('127.0.0.1', 8000, "serwer")

client
.connect()
.then(() => {
  console.log('Connected to PostgreSQL');

  client.query(`CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    login VARCHAR(60) NOT NULL,
    password VARCHAR(60) NOT NULL,
    active BOOLEAN NOT NULL
  );
  `);

  const onConnect = () => {
    console.log("Connected")
    client.subscribe('warships/server/#')
    }

    const onFailure = (msg) => {
        console.log("Connection attempt to host 127.0.0.1 failed.")
        setTimeout(MQTTconnect, reconnectTimeout)
    }

    const onMessageArrived = (msg) => {
        console.log(Object.keys(msg))
        console.log(`Received a message from ${msg.destinationName}: ${msg.payloadString}`)
    }

    const MQTTconnect = () => {
        console.log("connecting to mqtt")
        const options = {
            timeout: 3,
            onSuccess: onConnect,
            onFailure: onFailure,
            onMessageArrived: onMessageArrived
        }
        client.connect(options)
    }

    MQTTconnect()
})