#!/usr/bin/env osascript -l JavaScript

/*
 * create-EN-note-attachment.js <en.json> 
 * en.json example:
 * {withText: 'blabla', title: 'blabla', notebook: 'name', tags:['a', 'b'], attachments:['/tm/file']}
 * Copyright (C) 2017 Reggie Zhang <reggy.zhang@gmail.com>
 * Licensed under the terms of The GNU Lesser General Public License (LGPLv3):
 * http://www.opensource.org/licenses/lgpl-3.0.html
 * 
 */
"use strict";

var EN = Application("Evernote");
EN.includeStandardAdditions = true;

var app = Application.currentApplication();
app.includeStandardAdditions = true;

function parseParams(filePath) {
    var path = Path(filePath);
    var file = app.openForAccess(path, { writePermission: false });
    var noteObj;
    if (app.getEof(file) > 0) {
        noteObj = JSON.parse($.NSString.alloc.initWithUTF8String(app.read(file)).cString);
        app.closeAccess(file);
    }
    return noteObj;
}
function createNotebook(name) {
    if (!findNotebook(name)) {
        EN.createNotebook(name, {withType: "local only"});
    }
}
function findNotebook(name) {
    return EN.notebooks().find(elem => elem.name() === name);
}

function updateAttachments(params) {
    params.attachments.forEach(function(item, index){
        params.attachments[index] = Path(item);
    });
}
function run(argv) { 
    try {
        var params = parseParams(argv[0]);
        createNotebook(params.notebook);
        updateAttachments(params);
        return EN.createNote(params).id().trim();
    } catch (e) {
        console.log(e);
    }
}
