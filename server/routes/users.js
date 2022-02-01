const express = require("express");
const client = require('../config/psqlClient');
const router = express.Router({mergeParams: true});
const crypto = require('crypto')

router.get('/:username', async (req, res) => {
    const check = await client.query("SELECT * FROM users WHERE login = $1", [ req.params.username ])
    if (!check.rows[0]) {
        return res.status(401).send("USER_NOT_FOUND")
    }
    console.log(check.rows[0].active)
    return check.rows[0].active ? res.sendStatus(200) : res.status(401).send("USER_LOGED_IN")
})

router.post('/login', async (req, res) => {
    const data = req.body
    // const hash = crypto.createHash('sha256').update(data.password).digest('base64')
    const checkCredentials = await client.query("SELECT * FROM users WHERE login = $1 AND password = $2", [data.login, data.password])
    if (!checkCredentials.rows[0]) {
        return res.status(401).send("AUTHENTICATION_FAILED")
    }

    if (checkCredentials.rows[0].active) {
        return res.status(402).send("USER_ALREADY_LOGGED_IN")
    }
    
    client.query(`UPDATE users SET active = TRUE WHERE id=${checkCredentials.rows[0].id}`)

    return res.sendStatus(200)
})

router.patch('/changename', async (req, res) => {
    const data = req.body
    const duplicate = await client.query("SELECT * FROM users WHERE login = $1", [ data.newname ]);
    if(duplicate.rows[0]) {
        console.log(duplicate)
        return res.status(500).send("USERNAME_DUPLICATE")
    }
    await client.query('UPDATE users SET login = $1 WHERE login = $2', [ data.newname, data.oldname ])
    await client.query('UPDATE cookieauth SET username = $1 WHERE username = $2', [ data.newname, data.oldname ])
    return res.sendStatus(200)
})

router.patch('/changepass/:user', async (req, res) => {
    const data = req.body
    const check = await client.query("SELECT * FROM users WHERE login = $1 AND password = $2", [ req.params.user, data.oldpass ]);
    if(!check.rows[0]) {
        return res.status(401).send("AUTHENTICATION FAILED")
    }
    await client.query('UPDATE users SET password = $1 WHERE login = $2 AND password = $3', [ data.newpass, req.params.user, data.oldpass ])
    return res.sendStatus(200)
})

router.post('/newuser', async (req, res) => {
    const data = req.body
    const duplicate = await client.query("SELECT * FROM users WHERE login = $1", [ data.login ]);
    if(duplicate.rows[0]) {
        console.log(duplicate)
        return res.status(500).send("USERNAME_DUPLICATE")
    }
    const newuser = await client.query(`
    INSERT INTO users (login, password, active) VALUES ($1, $2, FALSE) RETURNING *
    `, [data.login, data.password])
    console.log(`user ${data.login} has been added`)
    return res.send(newuser.rows[0])
})

router.patch('/logout', async (req, res) => {
    console.log("user logging out")
    const data = req.body
    const logout = await client.query(`UPDATE users SET active=FALSE WHERE login=$1`, [ data.login ])
    res.sendStatus(200)
})

router.patch('/login', async (req, res) => {
    console.log("user logging in")
    const data = req.body
    const login = await client.query("UPDATE users SET active=TRUE WHERE login=$1", [ data.login ])
    res.sendStatus(200)
})

router.delete('/:username', async (req, res) => {
    const del = await client.query("DELETE FROM users WHERE login=$1", [ req.params.username ])
    res.sendStatus(200)
})

module.exports = router