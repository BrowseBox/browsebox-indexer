// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express, { Express, Request } from 'express';

import { PrismaClient } from '@prisma/client';
import { log, LogLevel, padText } from '../../utils/Logger.ts';
import { requestValidation, RequestType } from '../RequestValidation.ts';

const app: Express = express();
const prisma = new PrismaClient();

app.use(express.json());

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

        if (!requestValidation(RequestType.PROFILE, req)) {
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

        if (!requestValidation(RequestType.LISTING, req)) {
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

module.exports = app;
