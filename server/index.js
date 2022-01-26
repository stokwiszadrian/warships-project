const client = require('./config/psqlClient')
global.WebSocket = require('ws')
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
    server.subscribe('warships/server/#')
    }

    const onFailure = (msg) => {
        console.log("Connection attempt to host 127.0.0.1 failed.")
        setTimeout(MQTTconnect, reconnectTimeout)
    }

    const onMessageArrived = (msg) => {
        console.log(Object.keys(msg))
        console.log(`Received a message from ${msg.destinationName}: ${JSON.parse(msg.payloadString).kek}`)
    }

    console.log("connecting to mqtt")
    const options = {
        timeout: 3,
        onSuccess: onConnect,
        onFailure: onFailure,
    }
    server.onMessageArrived = onMessageArrived
    server.connect(options)
})
.catch(err => console.error('An error occurred while connecting to the database', err.stack));