// Variables
var playerFleet, cpuFleet; // flota własna i przeciwnika
var attemptedHits = []; // ??

// Object Constructors
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
		$(".text").text(output.sunk(this.name, this.ships[pos].name)); // wiadomość - dany statek danego gracza ( name ) zatopiony
		if (this == playerFleet) bot.sizeOfShipSunk = this.ships[pos].length;
		this.ships.splice(pos, 1); // usuwa element classy Ship z floty
		if (this.ships.length == 0) {
			$(".text").text(output.lost(this.name)); // jeśli nie ma statków, to ten gracz przegrywa
		}
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
				if (this.ships[i].hitPoints == 0) return this.removeShip(i); // jeśli statek ma 0 hp, usuwa go ^
				else return this.shipHit(this.ships[i].name); // wypisuje wiadomość o trafieniu
			}
		}
		return false;
	};
}

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
	"welcome": " > Welcome to BattleShip.  Use the menu above to get started.",
	"not": " > This option is not currently available.",
	"player1": " > Would you like to place your own ships or have the computer randomly do it for you?",
	"self": " > Use the mouse and the Horizontal and Vertial buttons to place your ships on the bottom grid.",
	"overlap": " > You can not overlap ships.  Please try again.",
	"start": " > Use the mouse to fire on the top grid.  Good Luck!",
	placed: function(name) { return " > Your " + name + " been placed."; },
	hit: function(name, type) { return " > " + name + "'s ship was hit." },
	miss: function(name) { return " > " + name + " missed!" },
	sunk: function(user, type) { return " > " + user + "'s " + type + " was sunk!" },
	lost: function(name) { return " > " + name + " has lost his fleet!!  Game Over." },
};

// Objects for playing the game and bot for playing the computer
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
				var bool = cpuFleet.checkIfHit(num); // sprawdza, czy w flocie przeciwnika jest trafienie ( MQTT )
				if (false == bool) {
					$(".text").text(output.miss("You")); // wypisuje wiadomość o pudle
					$(this).children().addClass("miss"); // nadaje polu klasę "niewypału"
				} else $(this).children().addClass("hit"); // nadaje polu klasę trafiony
				$(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click"); // usuwa atrybuty onclick itp ( pole wyłączone )
				// Check if it's the end of the game
				if (cpuFleet.ships.length == 0) {
 					$(".top").find(".points").off("mouseenter").off("mouseover").off("mouseleave").off("click");

 				} else setTimeout(bot.select, 800);
			} // end of if
		});
	},
}
// plansza gracza
var bottomBoard = {
	currentHits: [], // obecnie trafienia ?
	checkAttempt: function(hit) {
		if (playerFleet.checkIfHit(hit)) { // sprawdza czy strzał trafił
			// Insert hit into an array for book keeping
			bottomBoard.currentHits.push(hit); // wrzuca pole do listy trafionych, for some reason
      if (this.currentHits.length > 1) bot.prev_hit = true; // 
			// display hit on the grid
			$(".bottom").find("." + hit).children().addClass("hit"); // wyświetla trafienie na planszy
			if (bottomBoard.hasShipBeenSunk()) { // some bot ai shit, jeśli statek został zatopiony
				// clear flags
				bot.hunting = bot.prev_hit = false;
				if (bot.sizeOfShipSunk == bottomBoard.currentHits.length) { // some bot ai shit ( MQTT wysyła info o trafieniu)
					bot.num_misses = bot.back_count = bot.nextMove.length = bottomBoard.currentHits.length = bot.sizeOfShipSunk = bot.currrent = 0;
				} else {
					bot.special =  bot.case1 = true;
				}
				// check for special cases
				if (bot.specialHits.length > 0) bot.special = true;
				// check for end of game.	
			}
			return true;
		} else {
			$(".bottom").find("." + hit).children().addClass("miss"); // zaznacza pole jako nietrafione
			bot.current = bottomBoard.currentHits[0];
			bot.prev_hit = false;
			if (bottomBoard.currentHits.length > 1) { // some bot ai shit ( MQTT wysyła info o nietrafieniu)
				bot.back = true;
				bot.num_misses++;
			}
			if (bot.case2) {
				bot.special = true;
				bot.case2 = false;
			}
			return false;
		}
	},

	hasShipBeenSunk: function() {
		if (bot.sizeOfShipSunk > 0) return true; // ?
		else return false;
	}
}

//  Create the games grids and layout
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
	$(".text").text(output.welcome); // przywitanie
})

// Start the game setup
// tutaj jest menu - być może niepotrzebne?
$(document).ready(function() {
	$(".one").on("click", function() {
		$(".text").text(output.player1); // singleplayer ? zmien na "rozpocznij układanie"
		gameSetup(this);
	});
});

// wybór układania
function gameSetup(t) {
	$(t).off() && $(".two").off();
	$(".one").addClass("self").removeClass("one").text("Place My Own");
	$(".multi").addClass("random").removeClass("multi").text("Random");

	$(".self").off("click").on("click", function() {
		$(".text").text(output.self);
		selfSetup(playerFleet); 
	});
	$(".random").off("click").on("click", function() {
		playerFleet = new Fleet("Player 1");
		playerFleet.initShips();
		randomSetup(playerFleet);
	});
}


function selfSetup() {
	$(".self").addClass("horz").removeClass("self").text("Horizontal");
	$(".random").addClass("vert").removeClass("random").text("Vertical");
	
	// initialize the fleet
	playerFleet = new Fleet("Player 1"); // tworzenie nowej floty ( MQTT - nazwa użytkownika here)
	playerFleet.initShips(); // zainicjowanie statków
	// light up the players ship board for placement
	placeShip(playerFleet.ships[playerFleet.currentShip], playerFleet);
}

function randomSetup(fleet) {
	// Decide if the ship will be placed vertically or horizontally 
	// if 0 then ship will be places horizontally if 1 vertically
	// setShip(location, ship, "vert", fleet, "self");
	if (fleet.currentShip >= fleet.numOfShips) return; // regard against undefined length
	
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
				// clear the call stack
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
 } // end of setShip()

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
	 		} // end of for loop
	 	} // end of for loop
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
	 } // end of if/else 
	if (genFleet == cpuFleet && genFleet.currentShip < genFleet.numOfShips) {
		if (orientation == "horz") genFleet.ships[genFleet.currentShip++].populateHorzHits(loc);
	 	else genFleet.ships[genFleet.currentShip++].populateVertHits(loc);
	 	if (genFleet.currentShip == genFleet.numOfShips) {
	 		// clear the call stack
	 		setTimeout(startGame, 500);
	 	} else randomSetup(genFleet);
	 }
	return false;
 } // end of checkOverlap()


function startGame() {
 	$(".layout").fadeOut("fast", function() {
 		$(".console").css( { "margin-top" : "31px" } );
 	});
 	$(".text").text(output.start); // rozpoczęcie gry, wyświetlenie info
 	// Generate all possible hits for Player 1
	 // losuje pola dla bota do strzelania
 	highlightBoard();
 }

 function highlightBoard() {
 	if (playerFleet.ships.length == 0) {
 		$(".top").find(".points").off("mouseenter").off("mouseleave").off("click");
 	} else {
	 	$(".top").find(".points").off("mouseenter mouseover").on("mouseenter mouseover", function() {
			// only allow target highlight on none attempts
			if(!($(this).hasClass("used"))) topBoard.highlight(this);
		});
	 }
}


