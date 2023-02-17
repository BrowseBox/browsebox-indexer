// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { S3Client, PutObjectCommand, DeleteObjectCommand, ObjectCannedACL } from '@aws-sdk/client-s3';
import { ImageJsonRequest } from './Models/Image';
import { ComputeSha256Hash, Base64ToArrayBuffer } from './Utils/ServerUtils';

// Create an Amazon S3 client service object.
const s3Client = new S3Client({
    region: "us-west-2",
    credentials: {
        accessKeyId: process.env.S3_KEY ?? '',
        secretAccessKey: process.env.S3_SECRET ?? ''
    },
    forcePathStyle: true,
});

let jsonString = '';
// TODO: Replace this with a JSON string from the client.
const S3Request: ImageJsonRequest = JSON.parse(jsonString);

// Required parameters for upload operations.
const uploadParams = {
    Bucket: process.env.S3_BUCKET ?? '',
    Key: ComputeSha256Hash(S3Request.payload),
    ObjectCannedACL: ObjectCannedACL.public_read,
    ContentLength: Base64ToArrayBuffer(S3Request.payload).byteLength,
    ContentType: "image/png",
    Body: S3Request.payload
};

// Required parameters for delete operations.
const deleteParams = {
    Bucket: process.env.S3_BUCKET ?? '',
    Key: ComputeSha256Hash(S3Request.payload)
};

// Upload image data to S3.
const Upload = async () => {
    try {
        const data = await s3Client.send(new PutObjectCommand(uploadParams));
        console.log(data);
    } catch (err) {
        console.error(err);
    }
}

// Delete image data from S3.
const Delete = async () => {
    try {
        const data = await s3Client.send(new DeleteObjectCommand(deleteParams));
        console.log(data);
    } catch (err) {
        console.error(err);
    }
}
