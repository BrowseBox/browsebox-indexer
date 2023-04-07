// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express, { Express, Request } from 'express';
import multer, { Options } from 'multer';

import { PrismaClient } from '@prisma/client';
import { deleteFile } from '../../S3.ts';
import { log, LogLevel, padText } from '../../utils/Logger.ts';
import { requestValidation } from '../RequestValidation.ts';

const app: Express = express();
const prisma = new PrismaClient();

// Multer configuration details.
const upload = multer({
    storage: multer.memoryStorage(),
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
 * @route POST /api/image/delete/profile
 * @desc Delete an existing image for a user profile.
 * @param {number} id - The user ID.
 */
app.post("/api/image/delete/profile", upload.single('image'), async (req, res) => {
    let profile;

    try {
        log("Received API request to delete image.");
        log("Extracting information from the request...");
        const id = req.body.id;

        if (!requestValidation('delete', req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("ID:", 16) + id);

        log("Deleting profile image...");
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
            await prisma.profile.delete({
                where: {
                    userId: parseInt(id)
                }
            }).catch(error => {
                log("Database error while deleting profile: " + error.message, LogLevel.ERROR);
                res.status(500).json({ message: "Database error while deleting profile." });
                return;
            });

            log("Deleting image from S3...");
            await deleteFile(profile.image);

            res.status(200).json({ message: "Profile image deleted." });
            log("Profile image deleted.");
            return;
        } else {
            res.status(500).json({ message: "Failed to delete profile from database." });
            log("Failed to delete profile from database.", LogLevel.ERROR);
            return;
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
 * @route POST /api/image/delete/listing
 * @desc Delete an existing image for a listing.
 * @param {number} id - The listing ID.
 * @param {number} index - The order of the image for listing images.
 */
app.post("/api/image/delete/listing", upload.single('image'), async (req, res) => {
    let listing;

    try {
        log("Received API request to delete image.");
        log("Extracting information from the request...");
        const id = req.body.id;
        const index = req.body.index;

        if (!requestValidation('delete', req)) {
            res.status(400).json({ message: "Missing or invalid required parameters." });
            log("Missing or invalid required parameters. Aborting.", LogLevel.WARNING);
            return;
        } else {
            log("Request validated. All required parameters present.");
        }

        log(padText("ID:", 16) + id);
        log(padText("Index:", 16) + index);

        log("Deleting listing image...");
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

            log("Deleting image from S3...");
            await deleteFile(listing.image);

            res.status(200).json({ message: "Listing image deleted." });
            log("Listing image deleted.");
            return;
        } else {
            res.status(500).json({ message: "Failed to delete listing from database." });
            log("Failed to delete listing from database.", LogLevel.ERROR);
            return;
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

module.exports = app;
