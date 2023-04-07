// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { Request } from 'express';

enum RequestType {
    UPLOAD_PROFILE = 'upload-profile',
    UPLOAD_LISTING = 'upload-listing',
    UPDATE_PROFILE = 'upload-profile',
    UPDATE_LISTING = 'upload-listing',
    DELETE_PROFILE = 'delete-profile',
    DELETE_LISTING = 'delete-listing',
}

/**
 * Validates a request based on the specified request type and the provided Request object.
 * @function
 * @param {string} requestType - The type of request to validate.
 * @param {Request} req - The Express Request object.
 * @returns {boolean} - Returns true if the request is valid, false otherwise.
 */
function requestValidation(requestType: string, req: Request) {
    const id = req.body.id;
    const index = req.body.index;
    const file = req.file;

    switch (requestType) {
        case RequestType.UPLOAD_PROFILE || RequestType.UPDATE_PROFILE:
            if (!id || id === undefined || !file || file === undefined) {
                return false;
            } else {
                return true;
            }

        case RequestType.UPLOAD_LISTING || RequestType.UPDATE_LISTING:
            if (!id || id === undefined || !index || index === undefined || !file || file === undefined) {
                return false;
            } else {
                return true;
            }

        case RequestType.DELETE_PROFILE:
            if (!id || id === undefined) {
                return false;
            } else {
                return true;
            }

        case RequestType.DELETE_LISTING:
            if (!id || id === undefined || !index || index === undefined) {
                return false;
            } else {
                return true;
            }
    }
}

export { requestValidation, RequestType };
