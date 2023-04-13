// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import sharp from 'sharp';
import crypto from 'crypto';

import express, { Express, Request, Response } from 'express';
import multer, { Options } from 'multer';

import { PrismaClient } from '@prisma/client';
import { uploadFile } from '../../S3.ts';
import { log, LogLevel, padText } from '../../utils/Logger.ts';
import { generateImageKey } from '../../utils/KeyGeneration.ts';
import { requestValidation, RequestType } from '../RequestValidation.ts';

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

/**
 * @route POST /api/image/upload/profile
 * @desc Upload an image for a user profile.
 * @param {number} id - The user ID for profiles or listing ID for listings.
 * @param {File} image - The image file to be uploaded.
 */
app.post('/api/image/upload/profile', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("| Received API request to upload a profile image.");
        log("Extracting information from the request...");
        const id = req.body.id;
        const file = req.file;

        // For some reason typescript intellisense doesn't recognise that we're already checking for validity via the requestValidation function.
        // This is just a workaround to make intellisense happy.
        if (!file) {
            res.status(400).json({ message: "Missing image file." });
            log("Missing image file. Aborting.", LogLevel.WARNING);
            return;
        }

        if (!requestValidation(RequestType.UPLOAD_PROFILE, req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            log(padText("ID:", 16) + id);
            log(padText("File:", 16) + file.originalname);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("ID:", 16) + id);
        log(padText("File:", 16) + file.originalname);

        log("Generating image hash and image key...");
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        log(`Image hash: ${imageHash}`);

        const key = generateImageKey("profile", imageHash, file.mimetype);
        log(`Image key: ${key}`);

        const fileBuffer = await sharp(file.buffer).toBuffer();
        log("File buffer created.");

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

            log("Uploading image to S3...", LogLevel.VERBOSE);
            await uploadFile(fileBuffer, key, file.mimetype);

            log("Image upload complete.");
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
 * @route POST /api/image/upload/listing
 * @desc Upload an image for a listing.
 * @param {number} id - The listing ID.
 * @param {number} index - The order of the image for listing images.
 * @param {File} image - The image file to be uploaded.
 */
app.post('/api/image/upload/listing', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("| Received API request to upload a listing image.");
        log("Extracting information from the request...");

        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        // For some reason typescript intellisense doesn't recognise that we're already checking for validity via the requestValidation function.
        // This is just a workaround to make intellisense happy.
        if (!file) {
            res.status(400).json({ message: "Missing image file." });
            log("Missing image file. Aborting.", LogLevel.WARNING);
            return;
        }

        if (!requestValidation(RequestType.UPLOAD_LISTING, req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            log(padText("ID:", 16) + id);
            log(padText("Index:", 16) + index);
            log(padText("File:", 16) + file.originalname);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("ID:", 16) + id);
        log(padText("Index:", 16) + index);
        log(padText("File:", 16) + file.originalname);

        log("Generating image hash and image key...");
        const imageHash = crypto.createHash('sha256').update(file.buffer).digest('hex');
        log(`Image hash: ${imageHash}`);

        const key = generateImageKey("listing", imageHash, file.mimetype);
        log(`Image key: ${key}`);

        const fileBuffer = await sharp(file.buffer).toBuffer();
        log("File buffer created.");

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

module.exports = app;
