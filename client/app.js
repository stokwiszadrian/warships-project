const express = require('express')
const app = express()
const detect = require('detect-port')

app.use(express.static('public'))

app.get('/one', (req, res) => {
    res.render('index.ejs')
})

app.get('/two', (req, res) => {
    res.render('index2.ejs')
})


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
