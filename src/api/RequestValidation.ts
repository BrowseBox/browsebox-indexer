// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { Request } from 'express';

enum RequestType {
    PROFILE = 'profile',
    LISTING = 'listing',
}

/**
 * Validates a request based on the specified request type and the provided Request object.
 * @function
 * @param {string} requestType - The type of request to validate.
 * @param {Request} req - The Express Request object.
 * @returns {boolean} - Returns true if the request is valid, false otherwise.
 */
function requestValidation(requestType: string, req: Request) {
    const type = req.body.type;
    const id = req.body.id;
    const index = req.body.index;

    switch (requestType) {
        case RequestType.PROFILE:
            if (!id || id === undefined) {
                return false;
            } else {
                return true;
            }

        case RequestType.LISTING:
            if (!id || id === undefined || !index || index === undefined) {
                return false;
            } else {
                return true;
            }

        default:
            return true;
    }
}

export { requestValidation, RequestType };
