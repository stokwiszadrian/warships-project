const express = require("express");
const client = require('../config/psqlClient');
const router = express.Router({mergeParams: true});

router.post("/newlobby", async (req, res) => {
    const data = req.body
    const duplicateOwner = await client.query("SELECT * FROM lobbies WHERE owner = $1", [ data.owner ]);
    if(duplicateOwner.rows[0]) {
        return res.status(500).send("OWNER_DUPLICATE")
    }

    const checkUser = await client.query("SELECT * FROM users WHERE login = $1", [ data.owner ])
    if(checkUser.rows.length === 0) {
        return res.status(500).send("USER_NOT_FOUND")
    }

    const newlobby = await client.query(`INSERT INTO lobbies (owner, name, closed) VALUES ($1, $2, FALSE) RETURNING *`, [data.owner, data.name])
    console.log(`lobby ${data.name} has been added`)
    return res.send(newlobby.rows[0])
})

router.get("/", async (req, res) => {
    const lobbies = await client.query("SELECT * FROM lobbies")
    res.send(lobbies.rows)
})

router.get("/checkowner/:owner", async (req, res) => {
    const checkName = await client.query("SELECT * FROM lobbies WHERE owner = $1", [ req.params.owner ])
    console.log(checkName.rows[0] ? checkName.rows[0] : "kek")
    return checkName.rows[0] ? res.send(checkName.rows[0]) : res.sendStatus(500)
})

router.get("/:lobbyname", async (req, res) => {
    const checkName = await client.query("SELECT * FROM lobbies WHERE name = $1", [ req.params.lobbyname ])
    if (checkName.rows[0]) {
        return checkName.rows[0].closed ? res.sendStatus(401) : res.send(checkName.rows[0])
    }
    return res.sendStatus(500)
})

router.get("/lobbyfilter/:filter", async (req, res) => {
    console.log("FILTER", req.params.filter)
    const filtered = await client.query("SELECT * FROM lobbies WHERE name LIKE $1", [ `%${req.params.filter}%` ])
    return res.send(filtered.rows)
})

router.delete("/:owner", async (req, res) => {
    console.log("deleting lobby")
    const del = await client.query("DELETE FROM lobbies WHERE owner = $1", [ req.params.owner ])
    return res.sendStatus(200)
})

router.patch("/newname", async (req, res) => {
    const data = req.body
    const update = await client.query("UPDATE lobbies SET name = $1 WHERE name = $2", [ data.newName, data.oldName ])
    res.sendStatus(200)
})

router.patch("/closed", async (req, res) => {
    const data = req.body
    const update = await client.query("UPDATE lobbies SET closed=TRUE WHERE name = $1", [ data.name ])
    console.log(update, data.name)
    res.sendStatus(200)
})

router.patch("/open", async (req, res) => {
    const data = req.body
    const update = await client.query("UPDATE lobbies SET closed=FALSE WHERE name = $1", [ data.name ])
    console.log(update, data.name)
    res.sendStatus(200)
})

module.exports = router