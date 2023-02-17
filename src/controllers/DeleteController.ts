// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import { Request, Response, NextFunction } from 'express';
import axios, { AxiosResponse } from 'axios';

const profilePostRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response: AxiosResponse = await axios.post('http://localhost:3000/api/upload/profile', {
            payload: req.body.payload
        });
        res.send(response.data);
    } catch (err) {
        console.error(err);
    }
}

const listingPostRequest = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const response: AxiosResponse = await axios.post('http://localhost:3000/api/upload/listing', {
            payload: req.body.payload
        });
        res.send(response.data);
    } catch (err) {
        console.error(err);
    }
}

export default { profilePostRequest, listingPostRequest };
