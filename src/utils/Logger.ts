// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import fs from 'fs';

enum LogLevel {
    VERBOSE = 'verbose',
    WARNING = 'warning',
    ERROR = 'error',
}

/**
 * Logs a message with a specified log level and timestamp.
 * @param {string} message - The message to be logged.
 * @param {LogLevel} level - The log level (default: LogLevel.VERBOSE).
 */
const log = (message: string, level: LogLevel = LogLevel.VERBOSE): void => {
    const now = new Date();
    const localDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).split('/').reverse().join('-');

    const localTimeStamp = now.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
    });

    const logMessage: string = `${localDate} ${localTimeStamp} [${level}]: ${message}`;
    console.log(logMessage);

    const logDirectory = './logs/';
    if (!fs.existsSync(logDirectory)) {
        fs.mkdirSync(logDirectory);
    }

    const logFileName = getLogFileName();
    fs.appendFile(logDirectory + logFileName, logMessage, (err) => {
        if (err) {
            console.error(`Error writing to log file: ${err.message}.`);
        }
    });
};

/**
 * Returns the log file name in the format "YYYY-MM-DD-N.log" where "N" is a unique log number.
 * @returns {string} The log file name.
 */
function getLogFileName(): string {
    const now = new Date();
    const localDate = now.toLocaleDateString('en-US', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
    }).split('/').reverse().join('-');

    let logNumber = 0;
    let logFileName = `${localDate}-${logNumber}.log`;

    while (fs.existsSync('./logs/' + logFileName)) {
        logNumber++;
        logFileName = `${localDate}-${logNumber}.log`;
    }

    return logFileName;
}

/**
 * Pads a text string with spaces on the right side up to the specified length.
 * @param {string} text - The text to be padded.
 * @param {number} length - The total length of the padded text.
 * @returns {string} The padded text.
 */
function padText(text: string, length: number): string {
    return (text + ' '.repeat(length)).substring(0, length);
}

export { log, LogLevel, padText };
