const express = require("express");
const client = require('../config/psqlClient');
const router = express.Router({mergeParams: true});

router.post("/", async (req, res) => {
    const data = req.body
    const post = await client.query("INSERT INTO cookieauth (username, authnum) VALUES ($1, $2)", [ data.user, data.authnum ])
    return res.sendStatus(200)
})

router.get("/:user/:authnum", async (req, res) => {
    const get = await client.query("SELECT * FROM cookieauth WHERE username = $1 AND authnum = $2", [ req.params.user, req.params.authnum ])
    return get.rows[0] ? res.sendStatus(200) : res.sendStatus(401)
})

router.delete("/:user/:authnum", async (req, res) => {
    const del = await client.query("DELETE FROM cookieauth WHERE username = $1 AND authnum = $2", [ req.params.user, req.params.authnum ])
    return res.sendStatus(200)
})

module.exports = router