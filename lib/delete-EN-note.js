#!/usr/bin/env osascript -l JavaScript

/*
 * delete-EN-note.js <en.json> 
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

function run(argv) {
    try {
        var notebookName = null;
        var noteId = argv[0];
        var note = EN.notebooks()[0].notes.byId(noteId);
        if (note) {
            notebookName = note.notebook().name();
            EN.delete(note);
        }
        return notebookName;
    } catch (e) {
        console.log(e);
    }
}
