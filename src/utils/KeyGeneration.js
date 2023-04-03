// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

/**
 * Generate an S3 image key based on type, image hash, and mimetype.
 *
 * @param {string} type - The image type, either "profile" or "listing".
 * @param {string} imageHash - The hash of the image file.
 * @param {string} mimetype - The mimetype of the image file.
 * @return {string} - The generated image key.
 */
function generateImageKey(type, imageHash, mimetype) {
    const extension = mimetype.split('/')[1];
    const folder = type === "profile" ? "profile" : "listing";
    const key = `assets/img/${folder}/${imageHash.substring(0, 1)}/${imageHash.substring(0, 2)}/${imageHash}.${extension}`;
    return key;
}

export { generateImageKey };
