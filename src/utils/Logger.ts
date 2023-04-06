// Copyright (c) BrowseBox. Licensed under the MIT Licence.
// See the LICENCE file in the repository root for full licence text.

import fs from 'fs';

enum LogLevel {
    VERBOSE = 'verbose',
    WARNING = 'warning',
    ERROR = 'error',
}

let currentLogFileName: string | null = null;

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

    if (!currentLogFileName) {
        currentLogFileName = getLogFileName();
    }

    fs.appendFile(logDirectory + currentLogFileName, logMessage + '\n', (err) => {
        if (err) {
            console.error(`Error writing to log file: ${err.message}.`);
        }
    });
};

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

function padText(text: string, length: number): string {
    return (text + ' '.repeat(length)).substring(0, length);
}

export { log, LogLevel, padText };
