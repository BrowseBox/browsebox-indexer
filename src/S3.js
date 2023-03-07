// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3"
import { getSignedUrl } from "@aws-sdk/s3-request-presigner"

const bucketName = process.env.S3_BUCKET
const region = "us-west-2"
const accessKeyId = process.env.S3_KEY
const secretAccessKey = process.env.S3_SECRET

/**
 * The Amazon S3 client.
 * @type {S3Client} s3Client
 */
const s3Client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
})

/**
 * Uploads the file to S3.
 * @param {*} fileBuffer The file buffer.
 * @param {*} fileName The file name.
 * @param {*} mimetype The file mime type.
 * @returns If the file was uploaded successfully.
 */
export function uploadFile(fileBuffer, fileName, mimetype) {
    const uploadParams = {
        Bucket: bucketName,
        Body: fileBuffer,
        Key: fileName,
        ContentType: mimetype,
        ACL: 'public-read'
    }

    return s3Client.send(new PutObjectCommand(uploadParams));
}


export function deleteFile(fileName) {
    const deleteParams = {
        Bucket: bucketName,
        Key: fileName,
    }

    return s3Client.send(new DeleteObjectCommand(deleteParams));
}

export async function getObjectSignedUrl(key) {
    const params = {
        Bucket: bucketName,
        Key: key
    }

    const command = new GetObjectCommand(params);
    const url = await getSignedUrl(s3Client, command, { expiresIn: 60 });

    return url
}
