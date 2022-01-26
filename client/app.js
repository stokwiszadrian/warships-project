const express = require('express')
const app = express()
const detect = require('detect-port')

app.use(express.static('public'))
const port = 3000

detect(port, (err, _port) => {
    if (err) {
        console.log(err)
    }

    if (port == _port) {
        app.listen(port, () => {
            console.log(`Listening on port ${port}...`)
        })
    } else {
        app.listen(_port, () => {
            console.log(`Listening on port ${_port}...`)
        })
    }
})
