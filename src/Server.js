// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express from 'express'
import multer from 'multer'
import sharp from 'sharp'
import crypto from 'crypto'

import { PrismaClient } from '@prisma/client'
import { uploadFile, deleteFile } from './S3.js'

const app = express()
const prisma = new PrismaClient()

const storage = multer.memoryStorage()
const upload = multer({ storage: storage })

app.post('/api/image/upload', upload.single('image'), async (req, res) => {
    const type = req.body.type
    const id = req.body.id
    const index = req.body.index
    const file = req.file

    const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex')
    const fileBuffer = await sharp(file.buffer).toBuffer()

    if (type === "profile") {
        const key = 'assets/img/profile/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        const profileCheck = await prisma.profile.findUnique({
            where: { userId: parseInt(id) }
        })

        if (profileCheck) {
            res.status(500).send("Profile already exists - use update instead.")
            return
        }

        const post = await prisma.profile.create({
            data: { userId: parseInt(id), image: key, }
        })
        await uploadFile(fileBuffer, key, file.mimetype)

        res.status(200).send("Profile created.")
    }

    if (type === "listing") {
        const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        const listingCheck = await prisma.listing.findUnique({
            where: { listingId: parseInt(id) }
        })

        if (listingCheck) {
            res.status(500).send("Listing already exists - use update instead.")
            return
        }

        const post = await prisma.listing.create({
            data: { listingId: parseInt(id), index: parseInt(index), image: key, }
        })
        await uploadFile(fileBuffer, key, file.mimetype)

        res.status(200).send("Listing created.")
    }
})

// TODO: Ensure that if for some reason if two users share the same image, it doesn't get deleted
app.post('/api/image/update', upload.single('image'), async (req, res) => {
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

        res.status(200).send("Profile updated.")
    }

    if (type === "listing") {
        const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6)

        const oldKey = await prisma.listing.findFirst({
            where: { listingId: parseInt(id), index: parseInt(index) }
        })


        const post = await prisma.listing.update({
            where: { listingId: parseInt(id), image: key, },
            data: { index: parseInt(index), }
        })
        await uploadFile(fileBuffer, key, file.mimetype)
        await deleteFile(oldKey.image)

        res.status(200).send("Listing updated.")
    }

})

app.post("/api/image/delete", upload.single('image'), async (req, res) => {
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

            res.status(200).send("Profile deleted.")
            break;

        case "listing":
            const listing = await prisma.listing.findFirst({
                where: { listingId: parseInt(id), index: parseInt(index) }
            })

            await prisma.listing.delete({
                where: { listingId: parseInt(id), index: parseInt(index) }
            })
            await deleteFile(listing.image)

            res.status(200).send("Listing deleted.")
            break;
    }
})

app.listen(7355, () => console.log("listening on port 7355"))
