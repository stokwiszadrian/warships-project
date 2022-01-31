const client = require('./config/psqlClient')
// global.WebSocket = require('ws')
// const mqtt = require('paho-mqtt')
// const server = new mqtt.Client('127.0.0.1', 8000, "serwer")
const cors = require('cors')
const express = require('express')
const users = require("./routes/users")
const lobbies = require("./routes/lobbies")
const cookieauth = require("./routes/cookieauth")

const app = express()
app.use(express.json())
app.use(cors())
app.use("/users", users)
app.use("/lobbies", lobbies)
app.use("/cookieauth", cookieauth)

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

    CREATE TABLE IF NOT EXISTS lobbies (
        id SERIAL PRIMARY KEY,
        owner VARCHAR(60) UNIQUE NOT NULL,
        name VARCHAR(60) NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cookieauth (
      id SERIAL PRIMARY KEY,
      username VARCHAR(60) NOT NULL,
      authnum VARCHAR(80) NOT NULL
    );
  `);

  const port = 5000
  app.listen(port, () => {
      console.log(`API server listening at http://localhost:${port}`)
  })
})
.catch(err => console.error('An error occurred while connecting to the database', err.stack));

//   const onConnect = () => {
//     console.log("Connected")
//     server.subscribe('warships/+/server/#')
//     }

//     const onFailure = (msg) => {
//         console.log("Connection attempt to host 127.0.0.1 failed.")
//         setTimeout(MQTTconnect, reconnectTimeout)
//     }

//     const onMessageArrived = async (msg) => {
//         const route = msg.destinationName.split("/")
//         const data = JSON.parse(msg.payloadString)
//         console.log(route)
//         topic = `warships/${route[1]}/response`
//         switch (route[3]) {
//             case "user":
//                 switch (route[4]) {
//                     case "add":

//                         const duplicate = await client.query("SELECT * FROM users WHERE login = $1", [ data.login ]);

//                             if(duplicate.rows[0]) {
//                                 console.log(duplicate)
//                                 server.send(topic, JSON.stringify({
//                                     response: "LOGIN_DUPLICATE"
//                                     })
//                                 )
//                                 console.log("LOGIN_DUPLICATE")
//                                 break;
//                             }
//                         await client.query(`
//                         INSERT INTO users (login, password, active) VALUES ($1, $2, FALSE) RETURNING *
//                         `, [data.login, data.password])
//                         console.log(`user ${data.login} has been added`)
//                         server.send(topic, JSON.stringify({
//                             response: "USER ADD OK"
//                         }))
//                         break;

//                     case "login":
//                         const check = await client.query("SELECT * FROM users WHERE login = $1 AND password = $2", [data.login, data.password])
//                             if(check.rows[0]) {
//                                 server.send(topic, JSON.stringify({
//                                     response: "LOGIN OK",
//                                     user: check.rows[0].login
//                                 }))
//                             }
//                             else {
//                                 server.send(topic, JSON.stringify({
//                                     response: "AUTHENTICATION FAILED"
//                                 }))
//                             }
//                         break;
                    
//                     default:
//                         console.log("Action not recognized")
//                 }


//             default:
//                 console.log("Action not recognized")
//         }
//         // console.log(`Received a message from ${msg.destinationName}: ${JSON.parse(msg.payloadString)}`)
//     }

//     console.log("connecting to mqtt")
//     const options = {
//         timeout: 3,
//         onSuccess: onConnect,
//         onFailure: onFailure,
//     }
//     server.onMessageArrived = onMessageArrived
//     server.connect(options)