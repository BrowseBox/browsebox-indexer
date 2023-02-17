// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { createHash } from 'crypto';

// Convert a base64 string to a Uint8Array ArrayBuffer.
function Base64ToArrayBuffer(base64: any) {
    let binaryString = window.atob(base64);
    let length = binaryString.length;
    let bytes = new Uint8Array(length);

    for (let i = 0; i < length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes.buffer;
}

// Compute the SHA256 hash of a string. Used to generate S3 object keys.
function ComputeSha256Hash(rawData: string) {
    const hash = createHash('sha256');
    hash.update(rawData);

    return hash.digest('hex');
}

export { Base64ToArrayBuffer, ComputeSha256Hash };
