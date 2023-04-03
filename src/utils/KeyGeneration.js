// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

function generateImageKey(imageHash, type) {
    const prefix = type === 'profile' ? 'assets/img/profile/' : 'assets/img/listing/';
    const key = `${prefix}${imageHash.substring(0, 1)}/${imageHash.substring(0, 2)}/${imageHash}.${file.mimetype.substring(6)}`;

    return key;
}

export { generateImageKey };
