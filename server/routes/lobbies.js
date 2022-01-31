const express = require("express");
const client = require('../config/psqlClient');
const router = express.Router({mergeParams: true});

router.post("/newlobby", async (req, res) => {
    const data = req.body
    const duplicateOwner = await client.query("SELECT * FROM lobbies WHERE owner = $1", [ data.owner ]);
    if(duplicateOwner.rows[0]) {
        return res.status(500).send("OWNER_DUPLICATE")
    }

    const duplicateName = await client.query("SELECT * FROM lobbies WHERE name = $1", [ data.name ]);
    if(duplicateName.rows[0]) {
        return res.status(500).send("NAME_DUPLICATE")
    }

    const checkUser = await client.query("SELECT * FROM users WHERE login = $1", [ data.owner ])
    if(checkUser.rows.length === 0) {
        return res.status(500).send("USER_NOT_FOUND")
    }

    const newlobby = await client.query(`INSERT INTO lobbies (owner, name) VALUES ($1, $2) RETURNING *`, [data.owner, data.name])
    console.log(`lobby ${data.name} has been added`)
    return res.send(newlobby.rows[0])
})

router.get("/", async (req, res) => {

})

router.get("/checkowner/:owner", async (req, res) => {
    const checkName = await client.query("SELECT * FROM lobbies WHERE owner = $1", [ req.params.owner ])
    return checkName.rows[0] ? res.send(checkName.rows[0]) : res.sendStatus(500)
})

router.get("/:lobbyname", async (req, res) => {
    const checkName = await client.query("SELECT * FROM lobbies WHERE name LIKE $1", [ `%${req.params.lobbyname}%` ])
    return checkName.rows[0] ? res.send(checkName.rows[0]) : res.sendStatus(500)
})

router.delete("/:owner", async (req, res) => {
    const del = await client.query("DELETE FROM lobbies WHERE owner = $1", [ req.params.owner ])
    return res.sendStatus(200)
})

module.exports = router