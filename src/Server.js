// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'crypto'
import cors from 'cors'

import { PrismaClient } from '@prisma/client'
import { uploadFile, deleteFile } from './S3.js'

const app = express()
const prisma = new PrismaClient()

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/api/image/upload', cors(), upload.single('image'), async (req, res) => {
    console.log("Received request to upload image!")
    console.log("Extracting information from the request...")
    const type = req.body.type
    const id = req.body.id
    const index = req.body.index
    const file = req.file

    console.log(`\tImage type: ${type}`)
    console.log(`\tID: ${id}`)
    console.log(`\tIndex: ${index}`)
    console.log(`\tFile: ${file.originalname}`)

    console.log("Generating image key and image hash...")
    const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const fileBuffer = await sharp(file.buffer).toBuffer()

    if (type === "profile") {
        console.log("Creating profile request to S3")
        const key = 'assets/img/profile/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        console.log("Checking if profile already exists...")
        const profileCheck = await prisma.profile.findUnique({
            where: { userId: parseInt(id) }
        })

        if (profileCheck !== null) {
            res.status(500)
            console.log("Profile already exists. Aborting.")
            return
        } else {
            const post = await prisma.profile.create({
                data: { userId: parseInt(id), image: key, }
            })
            await uploadFile(fileBuffer, key, file.mimetype)

            res.status(200)
            console.log("Image upload complete.")
        }
    }

    if (type === "listing") {
        console.log("Creating listing request to S3")
        const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        console.log("Checking if listing already exists...")
        const listingCheck = await prisma.listing.findUnique({
            where: { listingId: parseInt(id) }
        })

        if (listingCheck != null) {
            res.status(500)
            return
        } else {
            const post = await prisma.listing.create({
                data: { listingId: parseInt(id), index: parseInt(index), image: key, }
            })
            await uploadFile(fileBuffer, key, file.mimetype)

            res.status(200)
            console.log("Image upload complete.")
        }
    }
})

app.post('/api/image/update', cors(), upload.single('image'), async (req, res) => {
    const type = req.body.type
    const id = req.body.id
    const index = req.body.index
    const file = req.file

    const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const fileBuffer = await sharp(file.buffer).toBuffer()

    if (type === "profile") {
        const key = 'assets/img/profile/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        const oldKey = await prisma.profile.findUnique({
            where: { userId: parseInt(id) }
        })

        const post = await prisma.profile.update({
            where: { userId: parseInt(id), },
            data: { image: key, }
        })
        await uploadFile(fileBuffer, key, file.mimetype)
        await deleteFile(oldKey.image)

        res.status(200)

    if (type === "listing") {
        const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        const post = await prisma.listing.update({
            where: { listingId: parseInt(id) },
            data: { index: parseInt(index), }
        })
        await uploadFile(fileBuffer, key, file.mimetype)

        res.status(200)
    }
    }
})

app.post("/api/image/delete", cors(), upload.single('image'), async (req, res) => {
    const type = req.body.type
    const id = req.body.id
    const index = req.body.index

    switch (type) {
        case "profile":
            const profile = await prisma.profile.findUnique({
                where: { userId: parseInt(id) }
            })

            await prisma.profile.delete({
                where: { userId: parseInt(id) }
            })
            await deleteFile(profile.image)

            res.status(200)
            break;

        case "listing":
            const listing = await prisma.listing.findFirst({
                where: { listingId: parseInt(id), index: parseInt(index) }
            })

            await prisma.listing.deleteMany({
                where: { listingId: parseInt(id), index: parseInt(index) }
            })
            await deleteFile(listing.image)

            res.status(200)
            break;
    }
})

app.listen(7355, () => console.log("listening on port 7355"))
