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

const updateImage = require('./api/routes/UpdateImage');
app.use(updateImage);

const retrieveImage = require('./api/routes/RetrieveImage');
app.use(retrieveImage);

const deleteImage = require('./api/routes/DeleteImage');
app.use(deleteImage);

app.listen(7355, () => log("Starting BrowseBox indexer service on port: 7355"));
