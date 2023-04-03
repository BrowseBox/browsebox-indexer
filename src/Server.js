// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express from 'express';
import multer from 'multer';
import sharp from 'sharp';
import crypto from 'crypto';
import cors from 'cors';

import { PrismaClient } from '@prisma/client';
import { rateLimit } from 'express-rate-limit';
import { uploadFile, deleteFile } from './S3.js';
import { log, LogLevel } from './utils/Logger.js';

const app = express();
const prisma = new PrismaClient();

// Multer configuration details.
const upload = multer({
    storage: multer.memoryStorage(),
    // Add 10MB file size limit on requests.
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req, file, cb) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    },
});

app.use(express.json());
app.use(cors());

/**
 * @route POST /api/image/upload
 * @desc Upload an image for a user profile or listing.
 * @param {string} type - The image type, either "profile" or "listing".
 * @param {number} id - The user ID for profiles or listing ID for listings.
 * @param {number} index - The order of the image for listing images. Only required for listing images.
 * @param {File} image - The image file to be uploaded.
 */
app.post('/api/image/upload', upload.single('image'), async (req, res) => {
    try {
        log("Received request to upload image!", LogLevel.VERBOSE);
        log("Extracting information from the request...", LogLevel.VERBOSE);
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        log(`\tImage type: ${type}\tID: ${id}\tIndex: ${index}\tFile: ${file.originalname}`, LogLevel.VERBOSE);

        log("Generating image key and image hash...", LogLevel.VERBOSE);
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const fileBuffer = await sharp(file.buffer).toBuffer();

        if (type === "profile") {
            log("Creating profile request to S3", LogLevel.VERBOSE);
            const key = 'assets/img/profile/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6);

            log("Checking if profile already exists...", LogLevel.VERBOSE);
            const profileCheck = await prisma.profile.findUnique({
                where: {
                    userId: parseInt(id)
                }
            });

            if (profileCheck !== null) {
                res.status(500);
                log("Profile already exists. Aborting.", LogLevel.WARNING);
                return;
            } else {
                const post = await prisma.profile.create({
                    data: {
                        userId: parseInt(id),
                        image: key,
                    }
                });
                await uploadFile(fileBuffer, key, file.mimetype);

                res.status(200);
                log("Image upload complete.", LogLevel.VERBOSE);
            }
        }

        if (type === "listing") {
            log("Creating listing request to S3", LogLevel.VERBOSE);
            const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6);

            log("Checking if listing already exists...", LogLevel.VERBOSE);
            const listingCheck = await prisma.listing.findUnique({
                where: {
                    listingId: parseInt(id)
                }
            });

            if (listingCheck != null) {
                res.status(500);
                return;
            } else {
                const post = await prisma.listing.create({
                    data: {
                        listingId: parseInt(id),
                        index: parseInt(index),
                        image: key,
                    }
                });
                await uploadFile(fileBuffer, key, file.mimetype);

                res.status(200);
                log("Image upload complete.", LogLevel.VERBOSE);
            }
        }
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/image/update
 * @desc Update an existing image for a user profile or listing.
 * @param {string} type - The image type, either "profile" or "listing".
 * @param {number} id - The user ID for profiles or listing ID for listings.
 * @param {number} index - The order of the image for listing images. Only required for listing images.
 * @param {File} image - The updated image file.
 */
app.post('/api/image/update', upload.single('image'), async (req, res) => {
    try {
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const fileBuffer = await sharp(file.buffer).toBuffer();

        if (type === "profile") {
            const key = 'assets/img/profile/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6);

            const oldKey = await prisma.profile.findUnique({
                where: {
                    userId: parseInt(id)
                }
            });

            const post = await prisma.profile.update({
                where: {
                    userId: parseInt(id),
                },
                data: {
                    image: key,
                }
            });
            await uploadFile(fileBuffer, key, file.mimetype);
            await deleteFile(oldKey.image);

            res.status(200);

            if (type === "listing") {
                const key = 'assets/img/listing/' + imageHash.toString().substring(0, 1) + '/' + imageHash.toString().substring(0, 2) + '/' + imageHash + '.' + file.mimetype.substring(6);

                const post = await prisma.listing.update({
                    where: {
                        listingId: parseInt(id)
                    },
                    data: {
                        index: parseInt(index),
                    }
                });
                await uploadFile(fileBuffer, key, file.mimetype);

                res.status(200);
            }
        }
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

/**
 * @route POST /api/image/delete
 * @desc Delete an existing image for a user profile or listing.
 * @param {string} type - The image type, either "profile" or "listing".
 * @param {number} id - The user ID for profiles or listing ID for listings.
 * @param {number} index - The order of the image for listing images. Only required for listing images.
 */
app.post("/api/image/delete", upload.single('image'), async (req, res) => {
    try {
        switch (type) {
            case "profile":
                const profile = await prisma.profile.findUnique({
                    where: {
                        userId: parseInt(id)
                    }
                });

                await prisma.profile.delete({
                    where: {
                        userId: parseInt(id)
                    }
                });
                await deleteFile(profile.image);

                res.status(200);
                break;

            case "listing":
                const listing = await prisma.listing.findFirst({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                });

                await prisma.listing.deleteMany({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                });
                await deleteFile(listing.image);

                res.status(200);
                break;
        }
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

/**
 * @route GET /api/image/retrieve/:type/:id/:index
 * @desc Retrieve the image hash for a user profile or listing.
 * @param {string} type - The image type, either "profile" or "listing".
 * @param {number} id - The user ID for profiles or listing ID for listings.
 * @param {number} index - The order of the image for listing images. Only required for listing images.
 * @returns {string} imageHash - The hash of the requested image.
 */
app.get('/api/image/retrieve/:type/:id/:index', async (req, res) => {
    try {
        const type = req.params.type;
        const id = req.params.id;
        const index = req.params.index;

        switch (type) {
            case "profile":
                const profile = await prisma.profile.findUnique({
                    where: {
                        userId: parseInt(id)
                    }
                });

                res.status(200).send(profile.image);
                break;

            case "listing":
                const listing = await prisma.listing.findFirst({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                });

                res.status(200).send(listing.image);
                break;
        }
    } catch (error) {
        res.status(500).json({
            message: 'Internal server error'
        });
    }
});

// Error handling for multer errors and other unchecked errors.
app.use((error, req, res, next) => {
    if (error instanceof multer.MulterError) {
        res.status(400).json({
            message: 'File upload error'
        });
    } else if (error) {
        res.status(400).json({
            message: error.message
        });
    } else {
        next();
    }
});

// Enable rate limiting for all requests to the API.
const limiter = rateLimit({
    // 1 minute window for requests.
    windowMs: 1 * 60 * 1000,
    // Limit each IP to 100 requests per windowMs.
    max: 100,
});

app.use(limiter);

app.listen(7355, () => log("Starting BrowseBox indexer service on port: 7355", LogLevel.VERBOSE));
