const mqtt = require('paho-mqtt')
const { v4: uuidv4 } = require('uuid')
const id = uuidv4()
const client = new mqtt.Client('127.0.0.1', 8000, id)
const reconnectTimeout = 2000
import Cookies from 'js-cookie'

const main = document.getElementById("main")
const dashboard = document.getElementById("dashboard")
const register = document.getElementById("register")

if (Cookies.get('user')) {
    main.style.display = "none"
    dashboard.style.display = "block"
    main.getElementsByClassName("error")[0].style.display = "none"
    dashboard.getElementsByClassName("usergreeting").textContent = `Welcome back, ${Cookies.get('user')}`
    console.log(Cookies.get('user'))
}
else {
    console.log("Nikt nie jest zalogowany")
}

function formSubmit() {
    const credentials = {
        login: main.getElementsByTagName("input")[0].value,
        password: main.getElementsByTagName("input")[1].value
    }
    main.getElementsByTagName("input")[0].value = ""
    main.getElementsByTagName("input")[1].value = ""
    console.log(credentials)
    client.send(`warships/${id}/server/user/login`, JSON.stringify(credentials))
}

function logout() {
    Cookies.remove('user')
    logoutButton.parentElement.style.display = "none"
    main.style.display = "block"
}

function addUser() {
    Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
    const login = register.getElementsByTagName("input")[0]
    const pass1 = register.getElementsByTagName("input")[1]
    const pass2 = register.getElementsByTagName("input")[2]
    if (login.value.replaceAll(" ", "") == "" || pass1.value.replaceAll(" ", "") == "" || pass2.value.replaceAll(" ", "") == "") {
        register.getElementsByClassName("inputs")[0].style.display = "block"
    }

    else if (pass1.value === pass2.value) {
        const credentials = {
            login: login.value,
            password: pass1.value
        }
        login.value = ""
        pass1.value = ""
        pass2.value = ""
        client.send(`warships/${id}/server/user/add`, JSON.stringify(credentials))
        register.style.display = "none"
        main.style.display = "block"
    }
    else {
        register.getElementsByClassName("wrongpass")[0].style.display = "block"
    }
}

function moveToRegiser() {
    main.style.display = "none"
    register.style.display = "block"
}

const loginButton = main.getElementsByClassName("submit")[0]
const newUserButton = main.getElementsByClassName("register")[0]
const logoutButton = dashboard.getElementsByClassName("logout")[0]
const registerButton = register.getElementsByClassName("submit")[0]
loginButton.addEventListener("click", formSubmit, false)
logoutButton.addEventListener("click", logout, false)
registerButton.addEventListener("click", addUser, false)
newUserButton.addEventListener("click", moveToRegiser, false)


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
            main.style.display = "none"
            dashboard.style.display = "block"
            main.getElementsByClassName("error")[0].style.display = "none"
            dashboard.getElementsByClassName("usergreeting")[0].textContent = `Welcome back, ${data.user}`
            Cookies.set('user', data.user, { expires: 1 })
            break;

        case "AUTHENTICATION FAILED":
            console.log("FAILED")
            main.getElementsByClassName("error")[0].style.display = "block"
            break;

        case "LOGIN_DUPLICATE":
            console.log("LOGIN_DUPLICATE")
            register.getElementsByClassName("login").style.display = "block"
            break;

        default: 
            main.getElementsByClassName("error")[0].style.display = "none"
            console.log("What is this?")
    }
}

const onConnectionLost = (res) => {
    if (res.errorCode !== 0) {
        console.log(`onConnectoinLost: ${res.errorMessagge}`)
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
    client.onConnectionLost = onConnectionLost
    client.connect(options)
}


MQTTconnect() 