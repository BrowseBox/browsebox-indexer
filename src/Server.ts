// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import sharp from 'sharp';
import crypto from 'crypto';
import cors from 'cors';

import express, { Express, Request, Response, NextFunction } from 'express';
import multer, { Options } from 'multer';

import { PrismaClient } from '@prisma/client';
import { uploadFile, deleteFile } from './S3.ts';
import { log, LogLevel, padText } from './utils/Logger.ts';
import { generateImageKey } from './utils/KeyGeneration.ts';

require('dotenv').config();

const app: Express = express();
const prisma = new PrismaClient();

// Multer configuration details.
const upload = multer({
    storage: multer.memoryStorage(),
    // Add 10MB file size limit on requests.
    limits: {
        fileSize: 10 * 1024 * 1024
    },
    fileFilter: (req: Request, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Invalid file type'), false);
        }
    },
} as Options);

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
app.post('/api/image/upload', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("Received API request to upload image.");
        log("Extracting information from the request...");
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        // Validate the request to ensure all required parameters are present.
        if (!type || type === undefined || !id || id === undefined || (type === 'listing' && index === undefined) || !file || (type !== 'profile' && type !== 'listing')) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("Image type:", 16) + type);
        log(padText("ID:", 16) + id);
        log(padText("Index:", 16) + index);
        log(padText("File:", 16) + file.originalname);

        log("Generating image hash and image key...");
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        log(`Image hash: ${imageHash}`);

        const key = generateImageKey(type, imageHash, file.mimetype);
        log(`Image key: ${key}`);

        const fileBuffer = await sharp(file.buffer).toBuffer();
        log("File buffer created.");

        if (type === "profile") {
            log("Creating profile request to S3...");
            log("Checking if profile already exists...");

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
                log("Creating profile in database.");
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

                log("Image upload complete.");
            }
        }

        if (type === "listing") {
            log("Creating listing request to S3.");
            log("Checking if listing already exists...");

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
                log("Listing already exists. Aborting.", LogLevel.WARNING);
                return;
            } else {
                log("Creating listing in database.");
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

                log("Uploading image to S3...");
                await uploadFile(fileBuffer, key, file.mimetype);

                log("Image upload complete.");
            }
        }

        const url = "https://" + process.env.S3_BUCKET + ".s3.us-west-2.amazonaws.com/" + key;
        log("Sending image URL to client.");
        res.status(200).json({ message: "Image upload complete.", imageUrl: url });
        log("Image URL: " + url);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({
                message: 'Internal server error'
            });

            log("Internal server error: " + error.message, LogLevel.ERROR);
        }
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
app.post('/api/image/update', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("Received API request to update image.");
        log("Extracting information from the request...");
        const type = req.body.type;
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        // Validate the request to ensure all required parameters are present.
        if (!type || type === undefined || !id || id === undefined || (type === 'listing' && index === undefined) || !file || (type !== 'profile' && type !== 'listing')) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("Image type:", 16) + type);
        log(padText("ID:", 16) + id);
        log(padText("Index:", 16) + index);
        log(padText("File:", 16) + file.originalname);

        log("Generating image hash and image key...");
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        log(`Image hash: ${imageHash}`);

        const key = generateImageKey(type, imageHash, file.mimetype);
        log(`Image key: ${key}`);

        const fileBuffer = await sharp(file.buffer).toBuffer();
        log("File buffer created.");

        if (type === "profile") {
            log("Updating profile image...");
            log("Fetching old image key from database...");

            const oldKey = await prisma.profile.findUnique({
                where: {
                    userId: parseInt(id)
                }
            }).catch(error => {
                log("Database error while fetching old image key: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while fetching old image key." });
                return;
            });

            if (oldKey) {
                log("Updating image key in database...");
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

                log("Uploading image to S3...");
                await uploadFile(fileBuffer, key, file.mimetype);

                log("Deleting old image from S3...");
                await deleteFile(oldKey.image);

                res.status(200).json({ message: "Profile image updated." });
                log("Profile image updated.");
            } else {
                res.status(500).json({ message: "Failed to fetch old key from database." });
                log("Failed to fetch old key from database.", LogLevel.ERROR);
            }
        }

        // For listings, we are unable to delete the old image from S3 due to Prisma requiring a single filter for the where clause.
        // This issue is relatively minor until our S3 bucket starts to fill up, so we will leave it as is for now.
        if (type === "listing") {
            log("Updating listing image...");
            log("Updating listing in database...");

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

            log("Uploading image to S3...");
            await uploadFile(fileBuffer, key, file.mimetype);

            res.status(200).json({ message: "Listing image updated." });
            log("Listing image updated.");
        }
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({
                message: 'Internal server error'
            });

            log("Internal server error: " + error.message, LogLevel.ERROR);
        }
    }
});

/**
 * @route GET /api/image/retrieve/profile/:id/
 * @desc Retrieve the image hash for a user profile.
 * @param {number} id - The user ID.
 * @returns {string} imageHash - The hash of the requested image.
 */
app.get('/api/image/retrieve/profile/:id', async (req, res) => {
    let profile;
    let key;

    try {
        log("Received API request to retrieve image.");
        log("Extracting information from the request...");
        const id = req.params.id;

        if (!id || id === undefined) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("Image type:", 16) + "profile");
        log(padText("ID:", 16) + id);

        log("Retrieving profile image...");
        profile = await prisma.profile.findUnique({
            where: {
                userId: parseInt(id)
            }
        }).catch(error => {
            log("Database error while fetching profile: " + error.message, LogLevel.ERROR);
            res.status(500).json({ message: "Database error while fetching profile." });
            return;
        });

        if (profile) {
            key = profile.image;
            log(`Image Key: ${key}`);
            log("Profile image retrieved.");
        } else {
            res.status(500).json({ message: "Failed to retrieve profile from database." });
            log("Failed to retrieve profile from database.", LogLevel.ERROR);
            return;
        }

        const url = "https://" + process.env.S3_BUCKET + ".s3.us-west-2.amazonaws.com/" + key;
        log("Sending image URL to client.");
        res.status(200).json({ imageUrl: url });
        log("Image URL: " + url);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({
                message: 'Internal server error'
            });

            log("Internal server error: " + error.message, LogLevel.ERROR);
        }
    }
});

/**
 * @route GET /api/image/retrieve/listing/:id/:index
 * @desc Retrieve the image hash for a listing.
 * @param {number} id - The listing ID.
 * @param {number} index - The order of the image for listing images.
 * @returns {string} imageHash - The hash of the requested image.
 */
app.get('/api/image/retrieve/listing/:id/:index', async (req, res) => {
    let listing;
    let key;

    try {
        log("Received API request to retrieve image.");
        log("Extracting information from the request...");
        const id = req.params.id;
        const index = req.params.index;

        if (!id || id === undefined || !index || index === undefined) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("Image type:", 16) + "listing");
        log(padText("ID:", 16) + id);
        log(padText("Index:", 16) + index);

        log("Retrieving listing image...");
        listing = await prisma.listing.findFirst({
            where: {
                listingId: parseInt(id),
                index: parseInt(index)
            }
        }).catch(error => {
            log("Database error while fetching listing: " + error.message, LogLevel.ERROR);
            res.status(500).json({ message: "Database error while fetching listing." });
            return;
        });

        if (listing) {
            key = listing.image;
            log(`Image Key: ${key}`);
            log("Listing image retrieved.");
        } else {
            res.status(500).json({ message: "Failed to retrieve listing from database." });
            log("Failed to retrieve listing from database.", LogLevel.ERROR);
            return;
        }

        const url = "https://" + process.env.S3_BUCKET + ".s3.us-west-2.amazonaws.com/" + key;
        log("Sending image URL to client.");
        res.status(200).json({ imageUrl: url });
        log("Image URL: " + url);
    } catch (error) {
        if (error instanceof Error) {
            res.status(500).json({
                message: 'Internal server error'
            });

            log("Internal server error: " + error.message, LogLevel.ERROR);
        }
    }
});


// Error handling for multer errors and other unchecked errors.
app.use((error: unknown, req: Request, res: Response, next: NextFunction) => {
    if (error instanceof multer.MulterError) {
        log ("File upload error: " + error.message, LogLevel.ERROR);
        res.status(400).json({
            message: 'File upload error'
        });
    } else if (error) {
        log ("Unchecked error: " + error, LogLevel.ERROR);
        res.status(400).json({
            message: error
        });
    } else {
        next();
    }
});

// Enable rate limiting for all requests to the API.
// Currently set to 100 requests per minute for each IP address.
const rateLimit = require('express-rate-limit')
const limiter = rateLimit({
    windowMs: 1 * 60 * 1000,
    max: 100,
});

app.use(limiter);

const deleteImage = require('./api/routes/DeleteImage');
app.use(deleteImage);

app.listen(7355, () => log("Starting BrowseBox indexer service on port: 7355"));
