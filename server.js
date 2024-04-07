const express = require('express')
const dotenv = require('dotenv')
const cors = require('cors')
const { connectDB } = require('./config/db')
const fileRoute = require('./routes/File')
const {v2 : cloudinary} = require('cloudinary')

dotenv.config()

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_API_CLOUD,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const app = express()
const PORT = process.env.PORT || 8000

connectDB()
app.use(cors())

app.use(express.json())

app.use(express.urlencoded({
    extended: true
}))

app.use('/api/files', fileRoute)

app.listen(PORT, () => {
    console.log(`server listening at ${PORT}`);
})