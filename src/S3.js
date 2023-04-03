// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3"
import { LogLevel, log } from "./utils/Logger.js";

const bucketName = process.env.S3_BUCKET
const region = "us-west-2"
const accessKeyId = process.env.S3_KEY
const secretAccessKey = process.env.S3_SECRET

/**
 * An instance of the AWS S3 client with specified region and credentials.
 * @type {S3Client}
 */
const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})

/**
 * Uploads a file to an S3 bucket.
 *
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} key - The name of the file to be uploaded.
 * @param {string} mimetype - The MIME type of the file.
 * @throws {Error} - If there is an error during the upload process.
 */
export async function uploadFile(fileBuffer, key, mimetype) {
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: key,
        ContentType: mimetype,
        ACL: 'public-read',
    };

    log("Sent upload request to S3.", LogLevel.VERBOSE);
    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        log(`File uploaded successfully: ${key}`, LogLevel.VERBOSE);
    } catch (error) {
        log(`Error uploading file: ${error.message}`, LogLevel.ERROR);
        throw error;
    }
}

/**
 * Deletes a file to from an S3 bucket.
 *
 * @param {string} key - The name of the file to be deleted.
 * @throws {Error} - If there is an error during the deletion process.
 */
export async function deleteFile(key) {
    const deleteParams = {
        Bucket: bucketName,
        Key: key,
    }

    log("Sent delete request to S3.", LogLevel.VERBOSE);
    try {
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        log(`File deleted successfully: ${key}`, LogLevel.VERBOSE);
    } catch (error) {
        log(`Error deleting file: ${error.message}`, LogLevel.ERROR);
        throw error;
    }
}

/**
 * Generates a pre-signed URL for the specified S3 object key.
 *
 * @async
 * @param {string} key - The S3 object key for the image.
 * @returns {Promise<string>} A promise that resolves to the pre-signed URL.
 * @throws {Error} If there is an error generating the signed URL.
 */
export async function getSignedUrl(key) {
    const params = {
        Bucket: bucketName,
        Key: key
    }

    return new Promise((resolve, reject) => {
        s3Client.getSignedUrl('getObject', params, (error, url) => {
            if (error) {
                log(`Error generating signed URL: ${error.message}`, LogLevel.ERROR);
                reject(error);
            } else {
                log(`Generated signed URL: ${url}`, LogLevel.VERBOSE);
                resolve(url);
            }
        });
    });
}
