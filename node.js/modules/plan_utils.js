"use strict";

var fs = require('fs');
var path = require('path');
var planModules = {};

function getAllPlanFiles(inputFolder, filter, recursive) {
	var files = [];
	
	var scan = function (fol) {
		var stats = fs.statSync(fol)
		if (stats.isFile()) {
			var filename = fol.split('/').pop();
			var filetype = filename.toLowerCase();
			if (filetype.substr(0,4) == 'plan') {
				if (!filter || (filetype == filter)) {
					files.push({
						filename: filename,
						filetype: filetype,
						fullname: fol,
						subfolder: fol.substr(inputFolder.length)
					});
				}
			}
		} else if (recursive && stats.isDirectory()) {
			var f = fs.readdirSync(fol);
			for (var i = 0; i < f.length; i++) scan(fol + '/' + f[i]);
		}
	}
	scan(inputFolder);
	return files;
}

function decodeFiles(files, outputFolder) {
	files.each(function (file) {
		decodeFile(file, outputFolder);
	});
}

function decodeFile(file, outputFolder) {
	var outputFile = path.normalize(outputFolder + file.subfolder);
	console.log(file.subfolder);
	switch (file.filetype) {
		case 'planb':    decodePlanB(    file.fullname, outputFile); break;
		case 'planbz':   decodePlanBZ(   file.fullname, outputFile); break;
		case 'plankgeo': decodePlanKGEO( file.fullname, outputFile); break;
		case 'planlauf': decodePlanLAUF( file.fullname, outputFile); break;
		case 'planw':    decodePlanW(    file.fullname, outputFile); break;
		default:
	}
}

exports.decodeFiles = decodeFiles;
exports.getAllPlanFiles = getAllPlanFiles;



function decodePlanW(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	
	var list2BlockSize;
	switch (header.version) {
		case '4.0':
			header.listLength2 = f.readInteger(2);
			header.listLength1 = f.readInteger(2);
			header.unknown.push(f.getHexDump(8));
			list2BlockSize = 2;
		break;
		case '4.1':
			header.listLength2 = f.readInteger(4);
			header.listLength1 = f.readInteger(4);
			header.unknown.push(f.getHexDump(10));
			list2BlockSize = 4;
		break;
		default:
			console.error('ERROR: unknown Version "' + header.version + '"');
	}
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [],
		data2 = [];
	
	for (var i = 0; i < header.listLength1; i++) data1.push(f.readInteger(list2BlockSize));
	
	for (var i = 0; i < header.listLength2; i++) data2.push(f.getBinDump(46));
	
	header.bytesLeft = f.check(outputFile);
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
	exportTSV(outputFile, '2', data2);
}

function decodePlanB(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	
	header.unknown.push(f.getHexDump(6));
	
	header.listLength1 = f.readInteger(4);
	header.listLength2 = f.readInteger(4);
	
	header.unknown.push(f.getHexDump(4));
	header.unknown.push(f.readString(17));
	header.unknown.push(f.readString(30));
	header.unknown.push(f.getHexDump(6));
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [],
		data2 = [];
		
	for (var i = 0; i < header.listLength1; i++) {
		data1[i] = [];
		data1[i][0] = f.readInteger(2);
		data1[i][1] = f.readInteger(2);
		data1[i][2] = f.readInteger(2);
		data1[i][3] = f.readInteger(4);
		data1[i][4] = f.readInteger(4);
	}
	
	for (var i = 0; i < header.listLength2; i++) {
		data2[i] = [];
		data2[i][0] = f.readInteger(4);
		data2[i][1] = f.readInteger(4);
	}
	
	for (var i = 0; i < header.listLength2; i++) {
		data2[i][2] = f.readNullString();
	}
	
	header.bytesLeft = f.check(outputFile);
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
	exportTSV(outputFile, '2', data2);
}

// Noch nicht fertig:
function decodePlanBZ(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	header.listLength2 = f.readInteger(4);
	header.unknown.push(f.readInteger(1));	
	header.unknown.push(f.readInteger(1));	
	header.unknown.push(f.readInteger(2));	
	header.unknown.push(f.readInteger(2));	
	header.listLength1 = f.readInteger(4);
	header.unknown.push(f.readInteger(4));
	
	header.unknown.push(f.getHexDump(4));
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [],
		data2 = [];
	
	for (var i = 0; i < header.listLength1; i++) {
		data1[i] = [];
		data1[i][0] = f.readInteger(4);
		data1[i][1] = f.readInteger(2);
	}
	
	for (var i = 0; i < header.listLength2; i++) {
		data2[i] = f.readInteger(1);
	}
	
	header.bytesLeft = f.check(outputFile);
	if (header.bytesLeft > 0) {
		console.log('#;' + header.unknown.join(';') + ';' + header.bytesLeft );
	}
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
	exportTSV(outputFile, '2', data2);
}

function decodePlanKGEO(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	header.listLength1 = f.readInteger(4);
	
	header.unknown.push(f.readInteger(2));
	header.unknown.push(f.readInteger(2));
	header.unknown.push(f.readInteger(2));
	header.unknown.push(f.readInteger(2));
	header.unknown.push(f.readInteger(2));
	
	header.description = f.readString(header.size - f.pos);
	
	var data1 = [];
	
	for (var i = 0; i < header.listLength1; i++) {
		data1[i] = [];
		data1[i][0] = f.readInteger(-2);
	}
	
	for (var i = 0; i < header.listLength1; i++)	data1[i][1] = f.readInteger(-2);
	for (var i = 0; i < header.listLength1; i++)	data1[i][2] = f.readInteger(-2);
	for (var i = 0; i < header.listLength1; i++)	data1[i][3] = f.readInteger(-2);
	
	header.bytesLeft = f.check(outputFile);
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
}

function decodePlanLAUF(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	header.listLength1 = f.readInteger(4);
	header.unknown.push(f.readInteger(4));
	header.offset1 = f.readInteger(4);
	header.unknown.push(f.getHexDump(4));
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [];
	
	for (var i = 0; i < header.listLength1; i++) {
		data1[i] = [];
		data1[i][0] = f.readInteger(4);
	}
	data1.push([f.length]);
	
	var i = 0;
	while (f.pos < f.length) {
		if (f.pos >= data1[i+1][0]) i++;
		data1[i].push(f.readInteger(4));
	}
	
	data1.pop();

	header.bytesLeft = f.check(outputFile);
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
}

function decodePlanW(filename, outputFile) {
	var header = {unknown:[]};
	
	var f = new PlanFile(filename);
	
	header.size = f.readInteger(2);
	header.version = f.readInteger(2) + '.' + f.readInteger(2);
	header.creationDate = f.readTimestamp();
	
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	f.checkBytes('20 20 20 20 20');
	
	var list2BlockSize;
	switch (header.version) {
		case '4.0':
			header.listLength2 = f.readInteger(2);
			header.listLength1 = f.readInteger(2);
			header.unknown.push(f.getHexDump(8));
			list2BlockSize = 2;
		break;
		case '4.1':
			header.listLength2 = f.readInteger(4);
			header.listLength1 = f.readInteger(4);
			header.unknown.push(f.getHexDump(10));
			list2BlockSize = 4;
		break;
		default:
			console.error('ERROR: unknown Version "' + header.version + '"');
	}
	
	header.description = f.readString(header.size - f.pos);
	
	var
		data1 = [],
		data2 = [];
	
	for (var i = 0; i < header.listLength1; i++) data1.push(f.readInteger(list2BlockSize));
	
	for (var i = 0; i < header.listLength2; i++) data2.push(f.getBinDump(46));
	
	header.bytesLeft = f.check(outputFile);
	
	exportHeader(outputFile, header);
	exportTSV(outputFile, '1', data1);
	exportTSV(outputFile, '2', data2);
}


function PlanFile(filename) {
	var me = this;
	me.buffer = fs.readFileSync(filename);
	me.length = me.buffer.length;
	me.pos = 0;
	
	me.readInteger = function(n) {
		switch (n) {
			case  1: return _readByte();
			case  2: return _readWord();
			case -2: return _readWord(true);
			case  4: return _readLong();
			default: console.error('################ ERROR: Vermisse die Anzahl der Bytes');
		}
	}
	
	me.readString = function(n, movePointer) {
		var p = me.pos;
		if (movePointer !== false) me.pos += n;
		return me.buffer.toString('binary', p, p+n);
	}
	
	me.readNullString = function() {
		var s = me.pos;
		var n = s;
		for (var i = s; i < me.buffer.length; i++) {
			if (me.buffer.readUInt8(i) == 0) {
				n = i - s;
				me.pos = i+1;
				break;
			}
		}
		return me.buffer.toString('binary', s, s + n);
	}
	
	me.checkBytes = function(text) {
		text = text.split(' ');
		for (var i = 0; i < text.length; i++) {
			var v1 = parseInt(text[i], 16);
			var v2 = _readByte();
			if (v1 != v2) console.error('################ ERROR: Bytes sind nicht identisch');
		}
	}
	
	me.readTimestamp = function() {
		return (new Date(_readLong()*1000)).toJSON();
	}
	
	function _readLong() {
		var p = me.pos;
		me.pos += 4;
		return me.buffer.readUInt32LE(p);
	}
	
	function _readWord(signed) {
		var p = me.pos;
		me.pos += 2;
		if (signed) {
			return me.buffer.readInt16LE(p);
		} else {
			return me.buffer.readUInt16LE(p);
		}
	}
	
	function _readByte() {
		var p = me.pos;
		me.pos += 1;
		return me.buffer.readUInt8(p);
	}
	
	function _clamp(text, l) {
		return text.substr(text.length-l);
	}
	
	me.getHexDump = function(n) {
		var s = [];
		for (var i = 0; i < n; i++) {
			var v = _readByte();
			s.push(_clamp('000'+v.toString(16), 2));
		}
		return s.join(' ');
	}
	
	me.getBinDump = function(n) {
		var n = Math.min(n, me.length - me.pos);
		var b = new Buffer(n*8);
		var p = 0;
		for (var i = 0; i < n; i++) {
			var v = _readByte();
			for (var j = 0; j < 8; j++) {
				b.writeUInt8((v > 127) ? 108 : 48, p);
				p++;
				v = (v & 0x7F) << 1;
			}
		}
		return b.toString('binary');
	}
	
	me.check = function (outputFile) {
		var filename1 = outputFile+'_rest.raw';
		var filename2 = outputFile+'_rest.bin.raw';
		ensureFolderFor(filename1);
		ensureFolderFor(filename2);
		
		if (me.pos < me.length) {
			var n = me.length - me.pos;
			fs.writeFileSync(filename1, me.readString(n, false), 'binary');
			fs.writeFileSync(filename2, me.getBinDump(n), 'binary');
			console.log('WARNING: Still "'+n+'" bytes left!');
			return n;
		} else {
			if (fs.existsSync(filename1)) fs.unlinkSync(filename1);
			if (fs.existsSync(filename2)) fs.unlinkSync(filename2);
		}
	}
	
	return me;
}



function exportHeader(outputFile, data) {
	var filename = outputFile+'_header.json';
	ensureFolderFor(filename);
	fs.writeFileSync(filename, JSON.stringify(data, null, '\t'), 'utf8');
}

function exportTSV(outputFile, listName, data) {
	var a = [];
	if (Object.prototype.toString.call(data[0]) === '[object Array]') {
		for (var i = 0; i < data.length; i++) {
			a.push(data[i].join('\t'));
		}
	} else {
		a = data;
	}
	var filename = outputFile+'_'+listName+'.tsv';
	ensureFolderFor(filename);
	fs.writeFileSync(filename, a.join('\n'), 'binary');
}

function ensureFolderFor(filename) {
	var dirname = path.dirname(filename);
	if (!fs.existsSync(dirname)) {
		ensureFolderFor(dirname);
		fs.mkdirSync(dirname);
	}
}

if (!Array.prototype.each) {
	Array.prototype.each = function(fun) {
		var t = Object(this);
		var len = t.length;
		for (var i = 0; i < len; i++) {
			if (i in t) fun(t[i], i);
		}
	};
}