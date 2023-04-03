// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

const LogLevel = {
    VERBOSE: 'verbose',
    WARNING: 'warning',
    ERROR: 'error',
};

const log = (message, level = LogLevel.VERBOSE) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`${timestamp} [${level}]: ${message}`);
};

export { log, LogLevel };
