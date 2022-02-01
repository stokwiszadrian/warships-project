const mqtt = require('paho-mqtt')
const { v4: uuidv4 } = require('uuid')
const id = uuidv4()
const client = new mqtt.Client('127.0.0.1', 8000, id)
const reconnectTimeout = 2000
const crypto = require('crypto')

import Cookies from 'js-cookie'
import axios from 'axios'

const main = document.getElementById("mainlogin")
const dashboard = document.getElementById("dashboard")
const register = document.getElementById("register")
const lobby = document.getElementById("lobby")
const board = document.getElementById("main")
const settings = document.getElementById("settings")


// zaznaczanie, że użytkownik jest nieaktywny po odświeżeniu / wyłączeniu okna
function onUnload() {
	if (Cookies.get('user')){
		axios.patch("http://localhost:5000/users/logout", { login: Cookies.get('user') })
	}
	return null;
}
window.addEventListener("beforeunload", onUnload, false)

// funkcja losująca 256-bitową liczbę do autoryzacji ciasteczek
function rnd256() {
	const bytes = new Uint8Array(32)
	window.crypto.getRandomValues(bytes)
	const bytesHex = bytes.reduce((o, v) => o + ('00' + v.toString(16)).slice(-2), '');
  
	return BigInt('0x' + bytesHex).toString(10);
  }

console.log(rnd256().length)  


// cookie auth
if (Cookies.get('user') && Cookies.get('auth')) {
	axios.get(`http://localhost:5000/cookieauth/${Cookies.get('user')}/${Cookies.get('auth')}`)
	.then(async res => {
		main.style.display = "none"
		dashboard.style.display = "grid"
		main.getElementsByClassName("error")[0].style.display = "none"
		dashboard.getElementsByClassName("usergreeting")[0].textContent = `Welcome back, ${Cookies.get('user')}`
		const lobbies = (await axios.get("http://localhost:5000/lobbies")).data
		lobbyListGenerate(lobbies)
		console.log(Cookies.get('user'))
		await axios.delete(`http://localhost:5000/cookieauth/${Cookies.get('user')}/${Cookies.get('auth')}`)
		Cookies.set('user', Cookies.get('user'), { expires: 7 })
		Cookies.set('auth', rnd256(), { expires: 7 })
		await axios.post('http://localhost:5000/cookieauth', {
			user: Cookies.get('user'),
			authnum: Cookies.get('auth')
		})
		await axios.patch("http://localhost:5000/users/login", { login: Cookies.get('user') })
	})
	.catch(rej => {
		console.log(rej.response)
	})
}
else {
    console.log("Nikt nie jest zalogowany")
}

// powrót do lobby po odświeżeniu / wyjsciu ( nie działa z lobby.closed )

if (Cookies.get('lobby')) {
    axios.get(`http://localhost:5000/lobbies/${Cookies.get('lobby')}`)
    .then(async res => {
        dashboard.style.display = "none"
        lobby.getElementsByClassName("lobbyname")[0].textContent = Cookies.get('lobby')
        lobby.style.display = "grid"
        board.style.display = "block"
		axios.get(`http://localhost:5000/lobbies/checkowner/${Cookies.get('user')}`)
		.then(res => {
			lobby.getElementsByClassName("updatelobby")[0].style.display = "block"
			lobby.getElementsByClassName("updatelobby")[1].style.display = "block"
			const options = {
				timeout: 3,
				onSuccess: onConnect,
				onFailure: onFailure
			}
			MQTTconnect(options)
		})
        .catch(rej => {
			const options = {
				timeout: 3,
				onSuccess: onJoin,
				onFailure: onFailure
			}
			MQTTconnect(options)
		})
    })
    .catch(async rej => {
		axios.get(`http://localhost:5000/lobbies/checkowner/${Cookies.get('user')}`)
		.then(async res => {
			await axios.delete(`http://localhost:5000/lobbies/${Cookies.get('user')}`)
			console.log(rej)
        	Cookies.remove('lobby')
		})
		.catch(rej => {
			console.log(rej)
        	Cookies.remove('lobby')
		})
    })
}

// generowanie listy pokoi

async function lobbyListGenerate(lobbies) {
	const lobbylist = dashboard.getElementsByClassName("lobbylist")[0]
		while (lobbylist.firstChild) {
			lobbylist.removeChild(lobbylist.firstChild)
		}
		const firstentry = document.createElement('div')
		firstentry.className = 'lobbylisting entry'
		lobbylist.appendChild(firstentry)
		console.log(lobbies)
		lobbies.forEach(lobbylisting => {
			if (!lobbylisting.closed) {
				const lastLobbyListing = Array.prototype.at.call(lobbylist.getElementsByClassName("lobbylisting"), -1)
				const newlobby = document.createElement('div')
				newlobby.setAttribute('class', `lobbylisting ${lobbylisting.owner}`)
				const lobbyname = document.createElement('h4')
				lobbyname.textContent = lobbylisting.name
				const lobbyowner = document.createElement('h5')
				lobbyowner.textContent = lobbylisting.owner
				const joinbutton = document.createElement('button')
				joinbutton.type = 'button'
				joinbutton.textContent = 'Join'
				joinbutton.addEventListener('click', () => joinLobbyHandler(lobbylisting.name), false)
				newlobby.appendChild(lobbyname)
				newlobby.appendChild(lobbyowner)
				newlobby.appendChild(joinbutton)
				lastLobbyListing.parentElement.insertBefore(newlobby, lastLobbyListing.nextSibling)
			}
		})
}

// logowanie

async function formSubmit() {
    Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
    const credentials = {
        login: main.getElementsByTagName("input")[0].value,
        password: crypto.createHash('sha256').update(main.getElementsByTagName("input")[1].value).digest('base64')
    }
    main.getElementsByTagName("input")[0].value = ""
    main.getElementsByTagName("input")[1].value = ""
    axios.post("http://localhost:5000/users/login", credentials)
    .then(async res => {
        main.style.display = "none"
        dashboard.style.display = "grid"
        main.getElementsByClassName("error")[0].style.display = "none"
        dashboard.getElementsByClassName("usergreeting")[0].textContent = `Welcome back, ${credentials.login}`
		const lobbies = (await axios.get("http://localhost:5000/lobbies")).data
		lobbyListGenerate(lobbies)
        Cookies.set('user', credentials.login, { expires: 7 })
		Cookies.set('auth', rnd256(), { expires: 7 })
		await axios.post("http://localhost:5000/cookieauth", {
			user: Cookies.get('user'),
			authnum: Cookies.get('auth')
		})
    })
    .catch(rej => {
        if (rej.response.status == 401) {
            main.getElementsByClassName("wrongcredentials")[0].style.display = "block"
        }
        else if (rej.response.status == 402) {
            main.getElementsByClassName("loggedin")[0].style.display = "block"
        }
    })

}

// wylogowywanie

async function logout() {
    Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
    await axios.patch("http://localhost:5000/users/logout", { login: Cookies.get('user') })
	await axios.delete(`http://localhost:5000/cookieauth/${Cookies.get('user')}/${Cookies.get('auth')}`)
    Cookies.remove('user')
	Cookies.remove('auth')
    logoutButton.parentElement.style.display = "none"
    main.style.display = "grid"
}

// rejestracja

async function addUser() {
    Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
    const login = register.getElementsByTagName("input")[0]
    const pass1 = register.getElementsByTagName("input")[1]
    const pass2 = register.getElementsByTagName("input")[2]
    if (login.value.replaceAll(" ", "") == "" || pass1.value.replaceAll(" ", "") == "" || pass2.value.replaceAll(" ", "") == "") {
        register.getElementsByClassName("inputs")[0].style.display = "block"
    }
    else if (pass1.value === pass2.value) {
        const hash = crypto.createHash('sha256').update(pass1.value).digest('base64')
        const credentials = {
            login: login.value,
            password: hash
        }
        axios.post("http://localhost:5000/users/newuser",credentials)
        .then(res => {
            register.style.display = "none"
            main.style.display = "grid"
            login.value = ""
            pass1.value = ""
            pass2.value = ""
        })
        .catch(rej => {
            if (rej.response.status == 500) {
                register.getElementsByClassName("login")[0].style.display = "block"
            }
        })
    }
    else {
        register.getElementsByClassName("wrongpass")[0].style.display = "block"
    }
}

// przejscie do ekranu rejestracji

function moveToRegister() {
    main.style.display = "none"
    register.style.display = "grid"
}

// tworzenie nowego lobby

async function newLobbyHandler() {
    axios.post("http://localhost:5000/lobbies/newlobby", {
        owner: Cookies.get('user'),
        name: `${Cookies.get('user')}'s game`
    })
    .then(res => {
        Cookies.set('lobby', `${Cookies.get('user')}'s game`)
        dashboard.style.display = "none"
        lobby.style.display = "grid"
        board.style.display = "block"
		lobby.getElementsByClassName("updatelobby")[0].style.display = "block"
		lobby.getElementsByClassName("updatelobby")[1].style.display = "block"
        lobby.getElementsByClassName("lobbyname")[0].textContent = `${Cookies.get('user')}'s game`
        const options = {
            timeout: 3,
            onSuccess: onConnect,
            onFailure: onFailure
        }
        MQTTconnect(options)
		//document.getElementById("lobby").loc
		//$("#lobby").load(window.location.href + " #lobby")
    })
    .catch(rej => {
        dashboard.getElementsByClassName("nonewlobby")[0].style.display = "block"
        console.log(rej.response)
    })
}

// dołączanie do lobby

async function joinLobbyHandler(name) {
    // const name = dashboard.getElementsByTagName("input")[0].value
    axios.get(`http://localhost:5000/lobbies/${name}`)
    .then(async res => {
        Cookies.set('lobby', res.data.name)
        console.log(res, "niby się udało")
        lobby.getElementsByClassName("lobbyname")[0].textContent = res.data.name
        dashboard.style.display = "none"
        lobby.style.display = "grid"
        board.style.display = "block"
		await axios.patch("http://localhost:5000/lobbies/closed", {name: res.data.name})
        const options = {
            timeout: 3,
            onSuccess: onJoin,
            onFailure: onFailure
        }
        MQTTconnect(options)
		// window.location.reload()
    })
    .catch(rej => {
        dashboard.getElementsByClassName("nojoinlobby")[0].style.display = "block"
        console.log(rej.response)
    })
}

// wysyłanie wiadomości

const sendMsgHandler = () => {
    console.log("im here")
    const name = lobby.getElementsByClassName("lobbyname")[0].textContent
    const msg = lobby.getElementsByClassName("msg")[0].value
    console.log(`warships/${name}/chat/${Cookies.get("user")}/msg`)
    client.send(`warships/${name}/chat/${Cookies.get("user")}/msg`, msg)
	lobby.getElementsByClassName("msg")[0].value = ""
}

// wychodzenie z lobby

const leaveLobbyHandler = async () => {
    const username = Cookies.get('user')
    const name = lobby.getElementsByClassName("lobbyname")[0].textContent
	Cookies.remove('lobby')
    axios.get(`http://localhost:5000/lobbies/checkowner/${username}`)
    .then(async res => {
        console.log("Owner left")
        axios.delete(`http://localhost:5000/lobbies/${username}`)
        .then(res => {
            client.send(`warships/${name}/chat/${username}/end`, "end")
			window.location.reload()
        })
        .catch(rej => console.log(rej))
    })
    .catch(async rej => {
        console.log("user left")
		await axios.patch("http://localhost:5000/lobbies/open", {name: name})
        lobby.style.display = "none"
        board.style.display = "none"
        dashboard.style.display = "grid"
        client.send(`warships/${name}/chat/${username}/dc`, "dc")
        console.log(client.isConnected())
        client.disconnect()
		window.location.reload()
    })
}

// zmiana nazwy lobby

async function changeLobbyNameHandler() {
	Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
	const oldname = Cookies.get("lobby")
	const newname = lobby.getElementsByClassName("newname")[0].value
	axios.patch("http://localhost:5000/lobbies/newname", {
		oldName: oldname,
		newName: newname
	})
	.then(res => {
		lobby.getElementsByClassName("lobbyname")[0].textContent = newname
		client.send(`warships/${oldname}/chat/${Cookies.get('user')}/newname`, newname)
		Cookies.set('lobby', newname, { expires: 7 })
		client.subscribe(`warships/${newname}/chat/#`)
    	client.subscribe(`warships/${newname}/game/#`)
	})
}

// filtrowanie pokoi

async function filterLobbies() {
	const name = dashboard.getElementsByTagName("input")[0].value
	if (name !== ""){
		const lobbies = (await axios.get(`http://localhost:5000/lobbies/lobbyfilter/${name}`)).data
		lobbyListGenerate(lobbies)
	} else {
		const lobbies = (await axios.get(`http://localhost:5000/lobbies`)).data
		lobbyListGenerate(lobbies)
	}
}

// przejscie do ustawien

function settingsHandler() {
	dashboard.style.display = "none"
	board.style.display = "none"
	settings.style.display = "grid"
}

// powrot do dashboard

function returnHandler() {
	settings.style.display = "none"
	dashboard.style.display = "grid"
}

// zmiana nazwy użytkownika

async function changeNameHandler() {
	Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
	const newname = settings.getElementsByClassName("name")[0].value
	console.log(newname)
	axios.patch("http://localhost:5000/users/changename", {
		oldname: Cookies.get('user'),
		newname: newname
	})
	.then(res => {
		Cookies.set('user', newname, { expires: 7})
		window.location.reload()
	})
	.catch(rej => {
		console.log(rej)
		console.log(settings.getElementsByClassName("login")[0])
		settings.getElementsByClassName("login")[0].style.display = "block"
	})
}

// zmiana hasła

async function changePassHandler() {
	Array.prototype.forEach.call(document.getElementsByClassName("error"), (error) => error.style.display = "none")
	const username = Cookies.get('user')
	const oldpass = settings.getElementsByClassName("oldpass")[0].value
	const newpass1 = settings.getElementsByClassName("newpass1")[0].value
	const newpass2 = settings.getElementsByClassName("newpass2")[0].value
	console.log(oldpass)
	if (newpass1 !== newpass2) {
		settings.getElementsByClassName("wrongpass")[0].style.display = "block"
	}
	else {
		axios.patch(`http://localhost:5000/users/changepass/${username}`, {
			oldpass: crypto.createHash('sha256').update(oldpass).digest('base64'),
			newpass: crypto.createHash('sha256').update(newpass1).digest('base64')
		})
		.then(res => {
			window.location.reload()
		})
		.catch(rej => {
			console.log(rej)
			settings.getElementsByClassName("authfail")[0].style.display = "block"
		})
	}
}

// powrót do ekranu logowania

function returnToMainHandler() {
	register.style.display = "none"
	main.style.display = "grid"
}

// przyciski i ich eventy

const loginButton = main.getElementsByClassName("submit")[0]
const newUserButton = main.getElementsByClassName("register")[0]
const logoutButton = dashboard.getElementsByClassName("logout")[0]
const registerButton = register.getElementsByClassName("submit")[0]
const newLobbyButton = dashboard.getElementsByClassName("newlobby")[0]
const searchLobbyButton = dashboard.getElementsByClassName("submit")[0]
const sendMsgButton = lobby.getElementsByClassName("sendmsg")[0]
const leaveLobbyButton = lobby.getElementsByClassName("leave")[0]
const changeLobbyNameButton = lobby.getElementsByClassName("setnewname")[0]
const accountsettingsbutton = dashboard.getElementsByClassName("settings")[0]
const settingsreturnbutton = settings.getElementsByClassName("settingsreturn")[0]
const settingsnamebutton = settings.getElementsByClassName("changename")[0]
const settingspassbutton = settings.getElementsByClassName("changepass")[0]
const registerreturnbutton = register.getElementsByClassName("return")[0]

registerreturnbutton.addEventListener("click", returnToMainHandler, false)
settingsnamebutton.addEventListener("click", changeNameHandler, false)
settingspassbutton.addEventListener("click", changePassHandler, false)
settingsreturnbutton.addEventListener("click", returnHandler, false)
accountsettingsbutton.addEventListener("click", settingsHandler, false)
changeLobbyNameButton.addEventListener("click", changeLobbyNameHandler, false)
sendMsgButton.addEventListener("click", sendMsgHandler, false)
newLobbyButton.addEventListener("click", newLobbyHandler, false)
loginButton.addEventListener("click", formSubmit, false)
logoutButton.addEventListener("click", logout, false)
registerButton.addEventListener("click", addUser, false)
newUserButton.addEventListener("click", moveToRegister, false)
searchLobbyButton.addEventListener("click", filterLobbies, false)
leaveLobbyButton.addEventListener("click", leaveLobbyHandler, false)

// ------------  MQTT --------------

// on connect dla dołączających

const onJoin = () => {
	const lobbyname = Cookies.get('lobby')
	const username = Cookies.get('user')
	console.log("Connected, id:", lobbyname, username)
	client.subscribe(`warships/${lobbyname}/chat/#`)
	client.subscribe(`warships/${lobbyname}/game/#`)
	console.log(`subscribed to warships/${lobbyname}/chat/#`)
	console.log(`subscribed to warships/${lobbyname}/game/#`)
	client.send(`warships/${lobbyname}/chat/${username}/connected`, "connected")
}

// onconnect dla hosta

const onConnect = () => {
    const lobbyname = Cookies.get('lobby')
    const username = Cookies.get('user')
    console.log("Connected, id:", lobbyname, username)
    client.subscribe(`warships/${lobbyname}/chat/#`)
    client.subscribe(`warships/${lobbyname}/game/#`)
	console.log(`subscribed to warships/${lobbyname}/chat/#`)
	console.log(`subscribed to warships/${lobbyname}/game/#`)
}

const onFailure = (msg) => {
    console.log("Connection attempt to host 127.0.0.1 failed.")
    setTimeout(MQTTconnect, reconnectTimeout)
}

// obsługa wiadomości

const onMessageArrived = (msg) => {
	console.log(msg.destinationName, msg.payloadString)
    const topic = msg.destinationName.split("/")
    const username = Cookies.get('user')
    const content = msg.payloadString
    const lobbyname = topic[1]
    const sender = topic[3]
    if (topic[2] == "chat"){
        const messagebox = lobby.getElementsByClassName("messagebox")[0]
        const lastmsg = Array.prototype.at.call(messagebox.getElementsByClassName("message"), 0)
        const newmsg = document.createElement('div')
        let msgcontent = ""
        switch (topic[4]) {
            case "end":
				window.location.reload(true)
                lobby.style.display = "none"
                board.style.display = "none"
				alert("Session ended by host")
				dashboard.getElementsByClassName("sessionend")[0].style.display = "block"
				Cookies.remove("lobby")
                client.disconnect()
                break;

            case "msg":
                msgcontent = document.createTextNode(`${sender}: ${msg.payloadString}`)
                newmsg.appendChild(msgcontent)
                newmsg.setAttribute('class', `message ${lobby.getElementsByClassName("message").length + 1}`)
                lastmsg.parentElement.insertBefore(newmsg, lastmsg)
                break;

            case "dc": 
				window.location.reload(true)
                msgcontent =  document.createTextNode(`${sender} has left.`)
                newmsg.appendChild(msgcontent)
                newmsg.setAttribute('class', `message ${lobby.getElementsByClassName("message").length + 1}`)
                lastmsg.parentElement.insertBefore(newmsg, lastmsg.nextSibling)
				break;

            case "connected":
                msgcontent = document.createTextNode(`${sender} has joined.`)
                newmsg.appendChild(msgcontent)
                newmsg.setAttribute('class', `message ${lobby.getElementsByClassName("message").length + 1}`)
                lastmsg.parentElement.insertBefore(newmsg, lastmsg.nextSibling)
				client.send(`warships/${lobbyname}/chat/${username}/full`, "full")
                break;

			case "full":
				$(".text").text(output.welcome)
				$(document).ready(function() {
					$(".one").on("click", function() {
						$(".text").text(output.player1); // singleplayer ? zmien na "rozpocznij układanie"
						gameSetup(this);
					});
				});
				break;

			case "newname":
				lobby.getElementsByClassName("lobbyname")[0].textContent = content
				Cookies.set("lobby", content, { expires: 7 })
				client.subscribe(`warships/${content}/chat/#`)
    			client.subscribe(`warships/${content}/game/#`)
				break;
        }

    }
    else {
		//if (topic[4] == "start") setTimeout(startGame, 500)
        if (sender !== username) {
            switch (topic[4]) {
                case "shot":
                    const shipnum = playerFleet.ships.length
                    const bool = playerFleet.checkIfHit(parseInt(content))
                    console.log(bool)
                    if (!bool) {
                        // console.log($(".bottom").find(`.${content}`))
                        // console.log($(".bottom").find(".points"))
                        $(".text").text(output.miss("Enemy")); // wypisuje wiadomość o pudle 
                        $(".bottom").find(`.${content}`).children().addClass("miss"); // nadaje polu klasę "niewypału"
                        client.send(`warships/${lobbyname}/game/${username}/miss`, content)
                    } else {
                        // console.log($(".bottom").find(".points"))
                        $(".text").text(output.hit("Your"))
                        $(".bottom").find(`.${content}`).children().addClass("hit"); // nadaje polu klasę trafiony
                        client.send(`warships/${lobbyname}/game/${username}/hit`, content)
                        if (shipnum > playerFleet.ships.length) {
                            client.send(`warships/${lobbyname}/game/${username}/sunk`, "sunk")
                            $(".text").text(output.sunk("Your"))
                        }
                    }
                    console.log(playerFleet.ships)
                    if (playerFleet.ships.length == 0) {
                        $(".text").text(output.lost);
                        $(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click"); // usuwa atrybuty onclick itp ( pole wyłączone )
                        client.send(`warships/${lobbyname}/game/${username}/end`, "end")
                        break;
                    } 
                    $(".top").find(".points").off("mouseenter mouseover").on("mouseenter mouseover", function() {
                        // only allow target highlight on none attempts
                        console.log(this)
                        if(!($(this).hasClass("used"))) topBoard.highlight(this);
                    }); // usuwa atrybuty onclick itp ( pole wyłączone )
                    // ?? ^

                    break;

                case "miss": 
                    $(".top").find(`.${content}`).children().addClass("miss");
                    $(".text").text(output.miss("You"));
                    $(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click");
                    break;
                
                case "hit": 
                    $(".top").find(`.${content}`).children().addClass("hit");
                    $(".text").text(output.hit("Enemy's"));
                    $(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click");
                    break;

                case "sunk":
                    $(".text").text(output.sunk("Enemy's"))
                    break;

                case "end":
                    $(".text").text(output.won);
                    $(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click"); // usuwa atrybuty onclick itp ( pole wyłączone )
					break;

				case "check":
					// console.log("dotarłem do czeka", playerFleet.currentShip)
					if (playerFleet.currentShip == playerFleet.numOfShips) client.send(`warships/${lobbyname}/game/${username}/start`, "start")
					break;

				case "start":
					setTimeout(startGame, 500)
					
			}
        }
		else {
			
			if (topic[4] == "start") setTimeout(startGame, 500)
		}
    }
}

const onConnectionLost = (res) => {
    console.log(res.errorCode)
    if (res.errorCode !== 0) {
        console.log(`onConnectoinLost: ${res.errorMessagge}`)
    }

}

const MQTTconnect = (options) => {
    console.log("connecting to mqtt")
    client.onMessageArrived = onMessageArrived
    client.onConnectionLost = onConnectionLost
    client.connect(options)
}

// ----------- BATTLESHIPS ---------------

// zmienne
var playerFleet, cpuFleet; // flota własna i przeciwnika
var attemptedHits = []; // ??

// Konstruktor floty
function Fleet(name) {
	this.name = name;
	this.shipDetails = [{ "name": "carrier", "length": 5 },
						{ "name": "battleship", "length": 4 },
						{ "name": "cruiser", "length": 3 },
						{ "name": "destroyer", "length": 3 },
						{ "name": "frigate", "length": 2 }];
	this.numOfShips = this.shipDetails.length; // lista statków
	this.ships = []; 
	this.currentShipSize = 0; // rozmiar obecnie wybranego statku
	this.currentShip = 0; // obecnie wybrany statek
	this.initShips = function() {
		for(var i = 0; i < this.numOfShips; i++) {  // tworzy statki z klasy Ships
			this.ships[i] = new Ship(this.shipDetails[i].name);
			this.ships[i].length = this.shipDetails[i].length;
		}
	};
	this.removeShip = function(pos) {
		this.numOfShips--; // usuwa statek z floty
		this.ships.splice(pos, 1); // usuwa element classy Ship z floty
		return true;
	};
	this.shipHit = function(ship_name) {
		$(".text").text(output.hit(this.name)); // "statek gracza (name) został trafiony"
		return true;
	}
	this.checkIfHit = function(point) { // sprawdzanie trafienia
		for(var i = 0; i < this.numOfShips; i++) { // dla każdego statku
			if (this.ships[i].checkLocation(point)) {
				this.ships[i].getRidOf(this.ships[i].hitPoints.indexOf(point)); // usuwa punkt hp statku
                console.log(this.ships[i].hitPoints)
				if (this.ships[i].hitPoints == 0) return this.removeShip(i); // jeśli statek ma 0 hp, usuwa go ^
				else return this.shipHit(this.ships[i].name); // wypisuje wiadomość o trafieniu
			}
		}
		return false;
	};
}

// Konstruktor statku

function Ship(name){
	this.name = name;
	this.length = 0; // długość statku
	this.hitPoints = []; // punkty hp ( są to odniesienia do pól planszy ?)
	this.populateHorzHits = function(start) {
		for (var i = 0; i < this.length; i++, start++) { // początkowy indeks pola - mouseover, idzie w prawo odpowiednia dlugosc
			this.hitPoints[i] = start;
		}
	};
	this.populateVertHits = function(start) {
		for (var i = 0; i < this.length; i++, start += 10) { // poczatkowy indek pola - mouseover, idzie w dol odpowienia dlugosc
			this.hitPoints[i] = start;						// lista jest pewnie od 0 do 100, dlatego +=10
		}
	};
	this.checkLocation = function(loc) {
		for (var i = 0; i < this.length; i++) {
			if (this.hitPoints[i] == loc) return true;		// sprawdza czy dany indeks jest indeksem segmentu statku
		}
		return false;
	};
	this.getRidOf = function(pos) {
		this.hitPoints.splice(pos, 1); // "usuwa" dany segment
	}
}

// wiadomości
var output = {
	"wait": " > Waiting for an opponent...",
	"welcome": " > Welcome to BattleShip.  Use the menu above to get started.",
	"not": " > This option is not currently available.",
	"player1": " > Would you like to place your own ships or have the computer randomly do it for you?",
	"self": " > Use the mouse and the Horizontal and Vertial buttons to place your ships on the bottom grid.",
	"overlap": " > You can not overlap ships.  Please try again.",
	"waitForOpponent": " > Opponent isn't ready yet. Waiting...",
	"start": " > Use the mouse to fire on the top grid.  Good Luck!",
	placed: function(name) { return " > Your " + name + " been placed."; },
	hit: function(name, type) { return " > " + name + " ship was hit." },
	miss: function(name) { return " > " + name + " missed!" },
	sunk: function(user, type) { return " > " + user + " ship was sunk!" },
	"lost": " >You have lost your fleet.  You lost!",
    "won": " >Enemy's fleet is sunk.  You won!"
};

// plansza przeciwnika
var topBoard = {
	allHits: [], // wszystkie trafienia ?
	highlight: function(square) {
		$(square).addClass("target").off("mouseleave").on("mouseleave", function() { // podświetlanie po najechaniu na pole
			$(this).removeClass("target"); 
		});

		$(square).off("click").on("click", function() {
			if(!($(this).hasClass("used"))) {
				$(this).removeClass("target").addClass("used"); // nadaje polu klasę used ( pewnie żeby nie można było ponownie na nie kliknąć)// pobiera indeks pola z klasy
				var num = parseInt($(this).attr("class").slice(15)); // pobiera indeks pola z klasy
                const lobbyname = Cookies.get('lobby')
                const username = Cookies.get('user')
                client.send(`warships/${lobbyname}/game/${username}/shot`, `${num}`)
			} 
		});
	},
}

//  Tworzenie planszy
playerFleet = new Fleet("Player 1");
playerFleet.initShips();
$(document).ready(function() {
	for (var i = 1; i <= 100; i++) {
		// The number and letter designators
		if (i < 11) {
			$(".top").prepend("<span class='aTops'>" + Math.abs(i - 11) + "</span>");
			$(".bottom").prepend("<span class='aTops'>" + Math.abs(i - 11) + "</span>");
			$(".grid").append("<li class='points offset1 " + i + "'><span class='hole'></span></li>");
		} else {
			$(".grid").append("<li class='points offset2 " + i + "'><span class='hole'></span></li>");
		}
		if (i == 11) {
			$(".top").prepend("<span class='aTops hidezero'>" + Math.abs(i - 11) + "</span>");
			$(".bottom").prepend("<span class='aTops hidezero'>" + Math.abs(i - 11) + "</span>");
		}
		if (i > 90) {
			$(".top").append("<span class='aLeft'>" + 
								String.fromCharCode(97 + (i - 91)).toUpperCase() + "</span>");
			$(".bottom").append("<span class='aLeft'>" + 
								String.fromCharCode(97 + (i - 91)).toUpperCase() + "</span>");
		}
	}
	$(".text").text(output.wait); // przywitanie
})

// wybór układania
function gameSetup(t) {
	$(t).off() && $(".two").off();
	$(".one").addClass("self").removeClass("one").text("Place My Own");
	$(".multi").addClass("random").removeClass("multi").text("Random");
	// lobby.getElementsByClassName("one").style.display = "block"
	$(".self").off("click").on("click", function() {
		$(".text").text(output.self);
		selfSetup(playerFleet); 
	});
	$(".random").off("click").on("click", function() {
		// playerFleet = new Fleet("Player 1");
		// playerFleet.initShips();
		randomSetup(playerFleet);
	});
}

// samo układanie
function selfSetup() {
	$(".self").addClass("horz").removeClass("self").text("Horizontal");
	$(".random").addClass("vert").removeClass("random").text("Vertical");
	placeShip(playerFleet.ships[playerFleet.currentShip], playerFleet);
}

// losowe układanie

function randomSetup(fleet) {
	if (fleet.currentShip >= fleet.numOfShips) return;
	
	var orien = Math.floor((Math.random() * 10) + 1);
	var length = fleet.ships[fleet.currentShip].length;
	
	if (orien < 6) {
		// create a random number betwee 1 and 6
		var shipOffset = 11 - fleet.ships[fleet.currentShip].length; 
		var horiz = Math.floor((Math.random() * shipOffset) + 1);
		var vert = Math.floor(Math.random() * 9);
		var randNum = parseInt(String(vert) + String(horiz));
		if (fleet == cpuFleet) checkOverlap(randNum, length, "horz", fleet);
		else setShip(randNum, fleet.ships[fleet.currentShip], "horz", fleet, "random");
	} else {
		var shipOffset = 110 - (fleet.ships[fleet.currentShip].length * 10);
		var randNum = Math.floor((Math.random() * shipOffset) + 1);
	
		if (fleet == cpuFleet) checkOverlap(randNum, length, "vert", fleet); 
		else setShip(randNum, fleet.ships[fleet.currentShip], "vert", fleet, "random");
	}
}

function createCpuFleet() {
	// create a random ship placement for the cpu's fleet
	cpuFleet = new Fleet("CPU");
	cpuFleet.initShips();
	randomSetup(cpuFleet);
}


function placeShip(ship, fleet) {
	// check orientation of ship and highlight accordingly
	var orientation = "horz";
	$(".vert").off("click").on("click", function() { // zmiana orientacji po kliknięciu na przycisk, domyslnie horz
		orientation = "vert";
	});
	$(".horz").off("click").on("click", function() {
		orientation = "horz";
	});
	// when the user enters the grid have the ships lenght highlighted with the
	// ships length.
	$(".bottom").find(".points").off("mouseenter").on("mouseenter", function() {
		var num = $(this).attr('class').slice(15); // wybranie indeksu pola startowego
		//
		if (orientation == "horz") displayShipHorz(parseInt(num), ship, this, fleet);
		else displayShipVert(parseInt(num), ship, this, fleet);
	});
}


function displayShipHorz(location, ship, point, fleet) { // wyświetlanie położenia statku poziomo
	var endPoint = location + ship.length - 2;
	if (!(endPoint % 10 >= 0 && endPoint % 10 < ship.length - 1)) {
		for (var i = location; i < (location + ship.length); i++) {
			$(".bottom ." + i).addClass("highlight"); //
		}
		$(point).off("click").on("click", function() {
			setShip(location, ship, "horz", fleet, "self"); // ustawienie statku
		});
	}
	$(point).off("mouseleave").on("mouseleave", function() {
		removeShipHorz(location, ship.length); // wyłączenie highlitu
	});
}

function displayShipVert(location, ship, point, fleet) { // wyświetlanie położenia statku pionowo
	var endPoint = (ship.length * 10) - 10;
	var inc = 0; 
	if (location + endPoint <= 100) {
		for (var i = location; i < (location + ship.length); i++) {
			$(".bottom ." + (location + inc)).addClass("highlight");
			inc = inc + 10;
		}
		$(point).off("click").on("click", function() {
			setShip(location, ship, "vert", fleet, "self");
		});
	}
	$(point).off("mouseleave").on("mouseleave", function() {
		removeShipVert(location, ship.length); // wyłączenie highlitu
	});
}

function removeShipHorz(location, length) {
	for (var i = location; i < location + length; i++) {
		$(".bottom ." + i).removeClass("highlight");
	}
}

function removeShipVert(location, length) {
	var inc = 0;
	for (var i = location; i < location + length; i++) {
		$(".bottom ." + (location + inc)).removeClass("highlight");
		inc = inc + 10;
	}
}

function setShip(location, ship, orientation, genericFleet, type) { // ustawienie statku, rodzaj statku, orientacja, flota ( flota gracza )
	if (!(checkOverlap(location, ship.length, orientation, genericFleet))) { // sprawdza, czy pola statku nakładają się na siebie
		if (orientation == "horz") {										
			genericFleet.ships[genericFleet.currentShip].populateHorzHits(location); // ustanawia dla danego statku pola hp
			$(".text").text(output.placed(genericFleet.ships[genericFleet.currentShip].name + " has"));
			for (var i = location; i < (location + ship.length); i++) {
				$(".bottom ." + i).addClass(genericFleet.ships[genericFleet.currentShip].name); // dodaje klasę z nazwą danego statku
				$(".bottom ." + i).children().removeClass("hole"); // usuwa "znaczek"
			}
			if (++genericFleet.currentShip == genericFleet.numOfShips) { // końńczenie układania - wszystkie statki ułożone
				$(".text").text(output.placed("ships have"));
				$(".bottom").find(".points").off("mouseenter");
				// clear the call stack
				setTimeout(createCpuFleet, 100);
			} else {
				if (type == "random") randomSetup(genericFleet); // ustawianie statku (rng albo samemu)
				else placeShip(genericFleet.ships[genericFleet.currentShip], genericFleet);
			}
			
		} else {
			var inc = 0;
			genericFleet.ships[genericFleet.currentShip].populateVertHits(location); // to samo, tylko dla pionowego ułożenia
			$(".text").text(output.placed(genericFleet.ships[genericFleet.currentShip].name + " has"));
			for (var i = location; i < (location + ship.length); i++) {
				$(".bottom ." + (location + inc)).addClass(genericFleet.ships[genericFleet.currentShip].name);
				$(".bottom ." + (location + inc)).children().removeClass("hole");
				inc = inc + 10;
			}
			if (++genericFleet.currentShip == genericFleet.numOfShips) {
				$(".text").text(output.placed("ships have"));
				$(".bottom").find(".points").off("mouseenter");
				setTimeout(createCpuFleet, 100);
			} else {
				if (type == "random") randomSetup(genericFleet);
				else placeShip(genericFleet.ships[genericFleet.currentShip], genericFleet);
			}
		}
	} else { // jeśli się nakładają, to wyświetla się info, albo losuje kolejną pozycję ( dla rng )
		if (type == "random") randomSetup(genericFleet);
		else $(".text").text(output.overlap);
	}
 } 

 function checkOverlap(location, length, orientation, genFleet) { // sprawdzanie nakładania się pozycji
 	var loc = location;
 	if (orientation == "horz") {  // dla orientacji poziomej
 		var end = location + length;
	 	for (; location < end; location++) {
	 		for (var i = 0; i < genFleet.currentShip; i++) {
	 			if (genFleet.ships[i].checkLocation(location)) {
	 				if (genFleet == cpuFleet) randomSetup(genFleet); // jeśli flota AI, to losuje inną pozycję
	 				else return true;
	 			}
	 		} 
	 	} 
	 } else { 		// dla orientacji pionowej
	 	var end = location + (10 * length);
	 	for (; location < end; location += 10) {
	 		for (var i = 0; i < genFleet.currentShip; i++) {
	 			if (genFleet.ships[i].checkLocation(location)) {
	 				if (genFleet == cpuFleet) randomSetup(genFleet); // jeśli flota AI, to losuje inną pozycję
	 				else return true;
	 			}
	 		}
	 	}
	 } 
	if (genFleet == cpuFleet && genFleet.currentShip < genFleet.numOfShips) {
		if (orientation == "horz") genFleet.ships[genFleet.currentShip++].populateHorzHits(loc);
	 	else genFleet.ships[genFleet.currentShip++].populateVertHits(loc);
	 	if (genFleet.currentShip == genFleet.numOfShips) {
			console.log("CURRENT SHIP", genFleet.currentShip)
			client.send(`warships/${Cookies.get('lobby')}/game/${Cookies.get('user')}/check`, "check")
			$(".text").text(output.waitForOpponent)
	 	} else {
			randomSetup(genFleet);
			client.send(`warships/${Cookies.get('lobby')}/game/${Cookies.get('user')}/check`, "check")
			$(".text").text(output.waitForOpponent)
		 } 
	 }
	return false;
 } 


function startGame() {
 	$(".layout").fadeOut("fast", function() {
 		$(".console").css( { "margin-top" : "31px" } );
 	});
 	$(".text").text(output.start); // rozpoczęcie gry, wyświetlenie info
 	highlightBoard();
 }

 function highlightBoard() {
 	if (playerFleet.ships.length == 0) {
 		$(".top").find(".points").off("mouseenter").off("mouseleave").off("click");
 	} else {
	 	$(".top").find(".points").off("mouseenter mouseover").on("mouseenter mouseover", function() {
			// only allow target highlight on none attempts
            console.log(this)
			if(!($(this).hasClass("used"))) topBoard.highlight(this);
		});
	 }
}


