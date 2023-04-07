// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { Request } from 'express';

enum RequestType {
    DELETE_PROFILE = 'delete-profile',
    DELETE_LISTING = 'delete-listing',
}

function requestValidation(requestType: string, req: Request) {
    const type = req.body.type;
    const id = req.body.id;
    const index = req.body.index;

    switch (requestType) {
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

        default:
            return true;
    }
}

export { requestValidation };
