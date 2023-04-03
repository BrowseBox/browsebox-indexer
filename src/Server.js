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
import { generateImageKey } from './utils/KeyGeneration.js';

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
        log("Received API request to upload image.", LogLevel.VERBOSE);
        log("Extracting information from the request...", LogLevel.VERBOSE);
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        // Validate the request to ensure all required parameters are present.
        if (!type || !id || (type === 'listing' && index === undefined) || !file) {
            res.status(400).json({ message: "Missing required parameters." });
            log("Missing required parameters. Aborting.", LogLevel.WARNING);
            return;
        }

        log(`\tImage type: ${type}\tID: ${id}\tIndex: ${index}\tFile: ${file.originalname}`, LogLevel.VERBOSE);

        log("Generating image key and image hash...", LogLevel.VERBOSE);
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const fileBuffer = await sharp(file.buffer).toBuffer();
        const key = generateImageKey(imageHash, type);

        if (type === "profile") {
            log("Creating profile request to S3...", LogLevel.VERBOSE);
            log("Checking if profile already exists...", LogLevel.VERBOSE);

            const profileCheck = await prisma.profile.findUnique({
                where: {
                    userId: parseInt(id)
                }
            }).catch(error => {
                log("Database error while checking profile: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while checking profile." });
                return;
            });

            if (profileCheck !== null) {
                res.status(400).json({ message: "Profile already exists." });
                log("Profile already exists. Aborting.", LogLevel.WARNING);
                return;
            } else {
                log("Creating profile in database.", LogLevel.VERBOSE);
                await prisma.profile.create({
                    data: {
                        userId: parseInt(id),
                        image: key,
                    }
                }).catch(error => {
                    log("Database error while creating profile: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while creating profile." });
                    return;
                });

                log("Uploading image to S3...", LogLevel.VERBOSE)
                await uploadFile(fileBuffer, key, file.mimetype);

                res.status(200).json({ message: "Image upload complete." });
                log("Image upload complete.", LogLevel.VERBOSE);
            }
        }

        if (type === "listing") {
            log("Creating listing request to S3.", LogLevel.VERBOSE);
            log("Checking if listing already exists...", LogLevel.VERBOSE);

            const listingCheck = await prisma.listing.findUnique({
                where: {
                    listingId: parseInt(id)
                }
            }).catch(error => {
                log("Database error while checking listing: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while checking listing." });
                return;
            });

            if (listingCheck != null) {
                res.status(400).json({ message: "Listing already exists." });
                return;
            } else {
                log("Creating listing in database.", LogLevel.VERBOSE);
                await prisma.listing.create({
                    data: {
                        listingId: parseInt(id),
                        index: parseInt(index),
                        image: key,
                    }
                }).catch(error => {
                    log("Database error while creating profile: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while creating profile." });
                    return;
                });

                log("Uploading image to S3...", LogLevel.VERBOSE);
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
        log("Received API request to update image.", LogLevel.VERBOSE);
        log("Extracting information from the request...", LogLevel.VERBOSE);
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        // Validate the request to ensure all required parameters are present.
        if (!type || !id || (type === 'listing' && index === undefined) || !file) {
            res.status(400).json({ message: "Missing required parameters." });
            log("Missing required parameters. Aborting.", LogLevel.WARNING);
            return;
        }

        log(`\tImage type: ${type}\tID: ${id}\tIndex: ${index}\tFile: ${file.originalname}`, LogLevel.VERBOSE);

        log("Generating image key and image hash...", LogLevel.VERBOSE);
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        const fileBuffer = await sharp(file.buffer).toBuffer();
        const key = generateImageKey(imageHash, type);

        if (type === "profile") {
            log("Updating profile image...", LogLevel.VERBOSE);
            log("Fetching old image key from database...", LogLevel.VERBOSE);

            const oldKey = await prisma.profile.findUnique({
                where: {
                    userId: parseInt(id)
                }
            }).catch(error => {
                log("Database error while fetching old image key: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while fetching old image key." });
                return;
            });

            log("Updating image key in database...", LogLevel.VERBOSE);
            await prisma.profile.update({
                where: {
                    userId: parseInt(id),
                },
                data: {
                    image: key,
                }
            }).catch(error => {
                log("Database error while updating image key: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while updating image key." });
                return;
            });

            log("Uploading image to S3...", LogLevel.VERBOSE);
            await uploadFile(fileBuffer, key, file.mimetype);

            log("Deleting old image from S3...", LogLevel.VERBOSE);
            await deleteFile(oldKey.image);

            res.status(200).json({ message: "Profile image updated." });
            log("Profile image updated.", LogLevel.VERBOSE);
        }

        // For listings, we are unable to delete the old image from S3 due to Prisma requiring a single filter for the where clause.
        // This issue is relatively minor until our S3 bucket starts to fill up, so we will leave it as is for now.
        if (type === "listing") {
            log("Updating listing image...", LogLevel.VERBOSE);
            log("Updating listing in database...", LogLevel.VERBOSE);

            await prisma.listing.update({
                where: {
                    listingId: parseInt(id)
                },
                data: {
                    index: parseInt(index),
                    image: key,
                }
            }).catch(error => {
                log("Database error while updating listing: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while updating listing." });
                return;
            });

            log("Uploading image to S3...", LogLevel.VERBOSE);
            await uploadFile(fileBuffer, key, file.mimetype);

            res.status(200).json({ message: "Listing image updated." });
            log("Listing image updated.", LogLevel.VERBOSE);
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
        log("Received API request to delete image.", LogLevel.VERBOSE);
        log("Extracting information from the request...", LogLevel.VERBOSE);
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;

        // Validate input to ensure all required parameters are present.
        if (!type || !id || (type === 'listing' && index === undefined)) {
            res.status(400).json({ message: "Missing required parameters." });
            log("Missing required parameters. Aborting.", LogLevel.WARNING);
            return;
        }

        log(`\tImage type: ${type}\tID: ${id}\tIndex: ${index}`, LogLevel.VERBOSE);

        switch (type) {
            case "profile":
                log("Deleting profile image...", LogLevel.VERBOSE);
                const profile = await prisma.profile.findUnique({
                    where: {
                        userId: parseInt(id)
                    }
                }).catch(error => {
                    log("Database error while fetching profile: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while fetching profile." });
                    return;
                });

                await prisma.profile.delete({
                    where: {
                        userId: parseInt(id)
                    }
                }).catch(error => {
                    log("Database error while deleting profile: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while deleting profile." });
                    return;
                });

                log("Deleting image from S3...", LogLevel.VERBOSE);
                await deleteFile(profile.image);

                res.status(200).json({ message: "Profile image deleted." });
                log("Profile image deleted.", LogLevel.VERBOSE);
                break;

            case "listing":
                log("Deleting listing image...", LogLevel.VERBOSE);
                const listing = await prisma.listing.findFirst({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                }).catch(error => {
                    log("Database error while fetching listing: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while fetching listing." });
                    return;
                });

                await prisma.listing.deleteMany({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                }).catch(error => {
                    log("Database error while deleting listing: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while deleting listing." });
                    return;
                });

                log("Deleting image from S3...", LogLevel.VERBOSE);
                await deleteFile(listing.image);

                res.status(200).json({ message: "Listing image deleted." });
                log("Listing image deleted.", LogLevel.VERBOSE);
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
        log("Received API request to retrieve image.", LogLevel.VERBOSE);
        log("Extracting information from the request...", LogLevel.VERBOSE);
        const type = req.params.type;
        const id = req.params.id;
        const index = req.params.index;

        // Validate input to ensure all required parameters are present.
        if (!type || !id || (type === 'listing' && index === undefined)) {
            res.status(400).json({ message: "Missing required parameters." });
            log("Missing required parameters. Aborting.", LogLevel.WARNING);
            return;
        }

        log(`\tImage type: ${type}\tID: ${id}\tIndex: ${index}`, LogLevel.VERBOSE);

        switch (type) {
            case "profile":
                log("Retrieving profile image...", LogLevel.VERBOSE);
                const profile = await prisma.profile.findUnique({
                    where: {
                        userId: parseInt(id)
                    }
                }).catch(error => {
                    log("Database error while fetching profile: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while fetching profile." });
                    return;
                });

                res.status(200).send(profile.image);
                log("Profile image retrieved.", LogLevel.VERBOSE);
                break;

            case "listing":
                log("Retrieving listing image...", LogLevel.VERBOSE);
                const listing = await prisma.listing.findFirst({
                    where: {
                        listingId: parseInt(id),
                        index: parseInt(index)
                    }
                }).catch(error => {
                    log("Database error while fetching listing: " + error.message, LogLevel.ERROR);
                    res.status(500).json({ message: "Database error while fetching listing." });
                    return;
                });

                res.status(200).send(listing.image);
                log("Listing image retrieved.", LogLevel.VERBOSE);
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
// Currently set to 100 requests per minute for each IP address.
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
});

app.use(limiter);

app.listen(7355, () => log("Starting BrowseBox indexer service on port: 7355", LogLevel.VERBOSE));
