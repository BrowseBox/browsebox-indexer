// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express from 'express';
import controllers from '../controllers/UploadController';

const router = express.Router();
router.post('/upload/profile', controllers.profilePostRequest);
router.post('/upload/listing', controllers.listingPostRequest);

export = router;
