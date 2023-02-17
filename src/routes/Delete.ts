// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import express from 'express';
import controllers from '../controllers/DeleteController';

const router = express.Router();
router.post('/delete/profile', controllers.profilePostRequest);
router.post('/delete/listing', controllers.listingPostRequest);

export = router;
