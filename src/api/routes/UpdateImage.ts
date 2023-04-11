// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import sharp from 'sharp';
import crypto from 'crypto';

import express, { Express, Request, Response } from 'express';
import multer, { Options } from 'multer';

import { PrismaClient } from '@prisma/client';
import { uploadFile, deleteFile } from '../../S3.ts';
import { log, LogLevel, padText } from '../../utils/Logger.ts';
import { generateImageKey } from '../../utils/KeyGeneration.ts';
import { requestValidation, RequestType } from '../RequestValidation.ts';

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
 * @route POST /api/image/update/profile
 * @desc Update an existing image for a user profile.
 * @param {number} id - The user ID.
 * @param {File} image - The updated image file.
 */
app.post('/api/image/update/profile', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("| Received API request to update a profile image.");
        log("Extracting information from the request...");
        const id = req.body.id;
        const file = req.file;

        if (!requestValidation(RequestType.UPDATE_PROFILE, req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        // For some reason typescript intellisense doesn't recognise that we're already checking for validity via the requestValidation function.
        // This is just a workaround to make intellisense happy.
        if (!file) {
            res.status(400).json({ message: "Missing image file." });
            log("Missing image file. Aborting.", LogLevel.WARNING);
            return;
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

            log("Profile image updated.");
        } else {
            res.status(500).json({ message: "Failed to fetch old key from database." });
            log("Failed to fetch old key from database.", LogLevel.ERROR);
            return;
        }

        log("Listing image updated.");

        const url = "https://" + process.env.S3_BUCKET + ".s3.us-west-2.amazonaws.com/" + key;
        log("Sending image URL to client.");
        res.status(200).json({ message: "Listing image updated.", imageUrl: url });
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
 * @route POST /api/image/update/listing
 * @desc Update an existing image for a listing.
 * @param {number} id - The listing ID.
 * @param {number} index - The order of the image for listing images.
 * @param {File} image - The updated image file.
 */
app.post('/api/image/update/listing', upload.single('image'), async (req: Request, res: Response) => {
    try {
        log("| Received API request to update a listing image.");
        log("Extracting information from the request...");
        const id = req.body.id;
        const index = req.body.index;
        const file = req.file;

        if (!requestValidation(RequestType.UPDATE_LISTING, req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        // For some reason typescript intellisense doesn't recognise that we're already checking for validity via the requestValidation function.
        // This is just a workaround to make intellisense happy.
        if (!file) {
            res.status(400).json({ message: "Missing image file." });
            log("Missing image file. Aborting.", LogLevel.WARNING);
            return;
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

        // For listings, we are unable to delete the old image from S3 due to Prisma requiring a single filter for the where clause.
        // This issue is relatively minor until our S3 bucket starts to fill up, so we will leave it as is for now.
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

        log("Listing image updated.");

        const url = "https://" + process.env.S3_BUCKET + ".s3.us-west-2.amazonaws.com/" + key;
        log("Sending image URL to client.");
        res.status(200).json({ message: "Listing image updated.", imageUrl: url });
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
