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
    login VARCHAR(60) UNIQUE NOT NULL,
    password VARCHAR(60) NOT NULL,
    active BOOLEAN NOT NULL
  );
  `);

  const onConnect = () => {
    console.log("Connected")
    server.subscribe('warships/+/server/user/add')
    }

    const onFailure = (msg) => {
        console.log("Connection attempt to host 127.0.0.1 failed.")
        setTimeout(MQTTconnect, reconnectTimeout)
    }

    const onMessageArrived = async (msg) => {
        const route = msg.destinationName.split("/")
        const data = JSON.parse(msg.payloadString)
        console.log(route)
        topic = `warships/${route[1]}/response`
        switch (route[3]) {
            case "user":
                
                switch (route[4]) {
                    case "add":

                        const duplicate = await client.query("SELECT * FROM users WHERE login = $1", [ data.login ]);

                            if(duplicate.rows[0]) {
                                server.send(topic, "TITLE_DUPLICATE")
                                console.log("TITLE_DUPLICOATE")
                                break;
                            }
                        await client.query(`
                        INSERT INTO users (login, password, active) VALUES ($1, $2, FALSE) RETURNING *
                        `, [data.login, data.password])
                        console.log(`user ${data.login} has been added`)
                        server.send(topic, 'OK')
                    
                    default:
                        console.log("Action not recognized")
                }


            default:
                console.log("Action not recognized")
        }
        // console.log(`Received a message from ${msg.destinationName}: ${JSON.parse(msg.payloadString)}`)
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