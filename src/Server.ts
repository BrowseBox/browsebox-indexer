// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import cors from 'cors';
import multer from 'multer';

import express, { Express, Request, Response, NextFunction } from 'express';

import { log, LogLevel } from './utils/Logger.ts';

const app: Express = express();

app.use(express.json());
app.use(cors());

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

const uploadImage = require('./api/routes/UploadImage');
app.use(uploadImage);

const updateImage = require('./api/routes/UpdateImage');
app.use(updateImage);

const retrieveImage = require('./api/routes/RetrieveImage');
app.use(retrieveImage);

const deleteImage = require('./api/routes/DeleteImage');
app.use(deleteImage);

app.listen(7355, () => log("Starting BrowseBox indexer service on port: 7355"));
