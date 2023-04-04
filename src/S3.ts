// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";
import { log, LogLevel } from "./utils/Logger.ts";

const bucketName: string = process.env.S3_BUCKET ?? "";
const region: string = "us-west-2";
const accessKeyId: string = process.env.S3_KEY ?? "";
const secretAccessKey: string =  process.env.S3_SECRET ?? "";

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
});

/**
 * Uploads a file to an S3 bucket.
 *
 * @param {Buffer} fileBuffer - The file buffer.
 * @param {string} key - The name of the file to be uploaded.
 * @param {string} mimetype - The MIME type of the file.
 * @throws {Error} - If there is an error during the upload process.
 */
export async function uploadFile(fileBuffer: Buffer, key: string, mimetype: string): Promise<void> {
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: key,
        ContentType: mimetype,
        ACL: 'public-read',
    };

    log("Sent upload request to S3.");
    try {
        await s3Client.send(new PutObjectCommand(uploadParams));
        log(`File uploaded successfully: ${key}`);
    } catch (error) {
        if (error instanceof Error) {
            log(`Error uploading file: ${error.message}`, LogLevel.ERROR);
            throw error;
        }
    }
}

/**
 * Deletes a file from an S3 bucket.
 *
 * @param {string} key - The name of the file to be deleted.
 * @throws {Error} - If there is an error during the deletion process.
 */
export async function deleteFile(key: string): Promise<void> {
    const deleteParams = {
        Bucket: bucketName,
        Key: key,
    };

    log("Sent delete request to S3.");
    try {
        await s3Client.send(new DeleteObjectCommand(deleteParams));
        log(`File deleted successfully: ${key}`);
    } catch (error: any) {
        if (error instanceof Error) {
            log(`Error uploading file: ${error.message}`, LogLevel.ERROR);
            throw error;
        }
    }
}
