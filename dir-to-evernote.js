#!/usr/bin/env node
/*
 * dir-to-evernote.js <dir_path>
 * Import Whole dir files as seperated note into a newly created local notebook.
 *  -  notebook named as <rootDirName: date>
 *  -  filename as note title
 *  -  file attached as attachment
 *  -  tags will be applied as root dir name and parent dir name of target file.
 * Copyright (C) 2017 Reggie Zhang <reggy.zhang@gmail.com>
 * Licensed under the terms of The GNU Lesser General Public License (LGPLv3):
 * http://www.opensource.org/licenses/lgpl-3.0.html
 *
 */

const SYNC_DIR_NAME = '.en-sync';
function initProgressBar(totalLength) {
    const ProgressBar = require('progress');
    return new ProgressBar(':percent|:bar|  :current/:total  elapsed: :elapseds  eta: :etas', {
        complete: '█',
        incomplete: ' ',
        width: 40,
        total: totalLength
    });
}
function getSyncEntryDirPath(dirPath) {
    return `${dirPath}/${SYNC_DIR_NAME}`;
}
function getSyncEntryFilePath(dirPath, filename) {
    return `${getSyncEntryDirPath(dirPath)}/.${filename}.json`;
}
function shouldByPass(dirPath, filename, entry) {
    const fs = require('fs');
    const md5file = require('md5-file');
    const evernote = require('evernote-jxa');
    var syncEntryDirPath = getSyncEntryDirPath(dirPath);
    if (!fs.existsSync(syncEntryDirPath)) fs.mkdirSync(syncEntryDirPath);
    var syncEntryFilePath = getSyncEntryFilePath(dirPath, filename);
    var syncEntryFileExist = fs.existsSync(syncEntryFilePath);
    if (!syncEntryFileExist) return false;
    var syncEntry = JSON.parse(fs.readFileSync(syncEntryFilePath));
    var originalMd5 = syncEntry.md5;
    var latestMd5 = md5file.sync(`${dirPath}/${filename}`);
    if (originalMd5 !== latestMd5) {
        // delete old note
        var nbName = evernote.deleteNote(syncEntry.noteId.trim());
        if (nbName) entry.notebook = nbName;
    }
    return originalMd5 === latestMd5;
}
/*
* Entry: {withText: 'blabla', title: 'blabla', notebook: 'name', tags:['rootDir', 'parentDir'], attachments:['/tm/file']}
*/
function doFillEntries(entries, dirPath, rootDirName, notebookName) {
    const junk = require('junk');
    const fs = require('fs');
    const dir = fs.readdirSync(dirPath);
    dir.forEach(function (filename) {
        if (junk.is(filename)) return;
        if (/^\./.test(filename)) return;
        if (fs.lstatSync(`${dirPath}/${filename}`).isDirectory()) {
            return doFillEntries(entries, `${dirPath}/${filename}`, rootDirName, notebookName);
        }
        var entry = initSyncEntry(dirPath, filename, notebookName, rootDirName);
        if (shouldByPass(dirPath, filename, entry)) return;
        entries.push(entry);
    });
    return entries;
}
function initSyncEntry(dirPath, filename, notebookName, rootDirName) {
    const path = require('path');
    var entry = new Object();
    entry.SyncEntry = getSyncEntryFilePath(dirPath, filename);
    entry.withText = filename;
    entry.title = filename;
    entry.notebook = notebookName;
    entry.attachments = [`${dirPath}/${filename}`];
    entry.tags = [rootDirName, dirPath.split(path.sep).pop()];
    return entry;
}
function completeSyncEntry(entry) {
    const fs = require('fs');
    entry.syncDate = new Date();
    entry.md5 = require('md5-file').sync(entry.attachments[0]);//.execSync(`md5 "${entry.attachments[0]}"`).toString();
    var fd = fs.openSync(entry.SyncEntry, 'w');
    fs.writeSync(fd, JSON.stringify(entry, null, '    '));
    fs.closeSync(fd);
}

function fillEntries(entries, dirPath, notebookName) {
    const path = require('path');
    var rootDirName = dirPath.split(path.sep).pop();
    if (!notebookName) notebookName = `${rootDirName}: ${new Date().toDateString()}`;
    return doFillEntries(entries, dirPath, rootDirName, notebookName);
}
function preparePrarmsFile(entry) {
    const uuidV4 = require('uuid/v4');
    const fs = require('fs');
    const os = require('os');
    var paramsFilePath = `${os.tmpdir()}/${uuidV4()}.json`;
    fs.writeFileSync(paramsFilePath, JSON.stringify(entry));
    return paramsFilePath;
}

function main(argv) {
    const program = require('commander');
    const fs = require('fs');
    const evernote = require('evernote-jxa');
    program
        .version('0.1.5')
        .option('-n, --notebook <notebook>', 'Target Notebook Name, if not specified, a local notebook will be created named by root folder name and date.')
        .arguments('<path>')
        .parse(argv);
    if (!program.args.length) program.help();
    var dirPath = program.args[0];
    
    console.log('Calculating...');
    var entries = fillEntries(new Array(), dirPath, program.notebook);
    var bar = initProgressBar(entries.length);
    require('async-foreach').forEach(entries, function (entry) {
        try {
            bar.tick(1);
            evernote.createNotebook(entry.notebook);
            var paramsFilePath = preparePrarmsFile(entry);
            entry.noteId = evernote.createNote(paramsFilePath);
            completeSyncEntry(entry);
        } catch (e) {
            console.log(e);
        } finally {
            fs.unlinkSync(paramsFilePath);
            var done = this.async();
            setImmediate(done);
        }
    });
}

if (typeof require != 'undefined' && require.main == module) {
    main(process.argv);
}
