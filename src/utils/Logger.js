// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

/**
 * Enum for log levels.
 * @readonly
 * @enum {string}
 */
const LogLevel = {
    VERBOSE: 'verbose',
    WARNING: 'warning',
    ERROR: 'error',
};

/**
 * Logs a message with a specified log level and timestamp.
 * @param {string} message - The message to be logged.
 * @param {LogLevel} level - The log level (default: LogLevel.VERBOSE).
 */
const log = (message, level = LogLevel.VERBOSE) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
    console.log(`${timestamp} [${level}]: ${message}`);
};

/**
 * Pads a text string with spaces on the right side up to the specified length.
 * @param {string} text - The text to be padded.
 * @param {number} length - The total length of the padded text.
 * @returns {string} The padded text.
 */
function padText(text, length) {
    return (text + ' '.repeat(length)).substring(0, length);
}

export { log, LogLevel, padText };
