const express = require('express')
const multer = require('multer')
const router = express.Router()
const { v2: cloudinary } = require('cloudinary')
const File = require('../models/File')
const https = require('https')
const nodemailer = require('nodemailer')
const createEmailTemplate = require("../utils/createEmailTemplate")
const dotenv = require('dotenv')

dotenv.config()

const storage = multer.diskStorage({})
let upload = multer({
    storage
})

router.post("/upload", upload.single("myFile"), async (req, res) => {
    try {
        if (!req.file)
            return res.status(400).json({ message: "Hey bro! We Need The File" });

        console.log(req.file);
        let uploadedFile;
        try {
            uploadedFile = await cloudinary.uploader.upload(req.file.path, {
                folder: "sharedFile",
                resource_type: "auto"
            });
        } catch (error) {
            console.log(error);
            return res.status(400).json({ message: "Cloudinary Error" });
        }

        const { originalname } = req.file;
        const { secure_url, bytes, format } = uploadedFile;

        const file = await File.create({
            filename: originalname,
            sizeInBytes: bytes,
            secure_url,
            format
        });

        res.status(200).json({
            id: file._id,
            downloadPageLink: `${process.env.API_BASE_ENDPOINT_CLIENT}download/${file._id}`
        })

    } catch (error) {
        console.log(error)
    }
})

router.get("/:id", async (req, res) => {

    try {
        const id = req.params.id
        const file = await File.findById(id)
        if (!file) {
            return res.status(404).json({ message: "File Does Not Exist" })
        }
        const { filename, sizeInBytes, format } = file;
        return res.status(200).json({
            name: filename,
            sizeInBytes: sizeInBytes,
            format: format,
            id: id
        });

    } catch (error) {
        return res.status(500).json({ message: "Server Error" })
    }
})

router.get("/:id/download", async (req, res) => {

    try {
        const id = req.params.id
        const file = await File.findById(id)
        if (!file) {
            return res.status(404).json({ message: "File Does Not Exist" })
        }

        https.get(new URL(file.secure_url.toString()), (fileStream) => fileStream.pipe(res))

    } catch (error) {
        return res.status(500).json({ message: "Server Error" })
    }
})

router.post("/email", async (req, res) => {
    //1. validate request

    const { id, emailFrom, emailTo } = req.body

    //2. check if file does exist or not
    const file = await File.findById(id)
    if (!file) {
        return res.status(400).json({ message: "File does not exist" })
    }

    //3. create transporter 

    const transporter = nodemailer.createTransport({
        host: process.env.BREVO_SMTP_HOST,
        port: 587,
        secure: false,
        auth: {
            user: process.env.BREVO_SMTP_USER,
            pass: process.env.BREVO_SMTP_PASSWORD,
        },
        requireTLS: true,
        tls: {
            ciphers: 'SSLv3'
        }
    });

    //4. prepare the email data
    const { filename, sizeInBytes } = file;
    const fileSize = `${(Number(sizeInBytes) / (1024 * 1024)).toFixed(2)} MB`;
    const downloadPageLink = `${process.env.API_BASE_ENDPOINT_CLIENT}download/${id}`;

    const mailOption = {
        from: emailFrom, // sender address
        to: emailTo, // list of receivers
        subject: "Hello , File Shared With You ✔", // Subject line
        text: `${emailFrom} shared a file with you`, // plain text body
        html: createEmailTemplate(emailFrom, downloadPageLink, filename, fileSize), // html body
    }


    //5. send email using transporter

    transporter.sendMail(mailOption, async (err, info) => {
        if (err) {
            console.log(err);
            return res.status(500).json({
                message: "server error"
            });
        }

        file.sender = emailFrom;
        file.receiver = emailTo;

        await file.save()
        return res.status(200).json({
            message: "Email sent"
        })


    })

    //6. save the data and send the response
})



module.exports = router