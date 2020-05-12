const Item = require('../models/Item');
const Comment = require('../models/Comment');
const Media = require('../models/Media');
const User = require('../models/User');
const path = require('path');
const mkdirp = require('mkdirp');
	const rimraf = require('rimraf');
const fs = require('fs');
const sharp = require('sharp');
const sizeOf = require('image-size');
const Promise = require('bluebird');


// paths/constants
fileInputName = "qqfile",
publicDir = path.join(__dirname, '../public/'),
nodeModulesDir = path.join(__dirname, '../node_modules/'),
uploadedFilesPath = path.join(__dirname, '../uploads/'),
chunkDirName = "chunks",
port = process.env.SERVER_PORT || 8080,
maxFileSize = process.env.MAX_FILE_SIZE || 52428800; // in bytes, 0 for unlimited

exports.upload = (req, res) => {
    onSimpleUpload(req.body, req.file, req, res);
}

exports.delete = (req, res) => {
    var uuid = req.params.uuid;

    Media.findOne({_id: uuid}).exec()
    	.then((media) => media.remove())
    	.then(() => res.send({}))
    	.catch((error) => {
    		console.log("error: " + error);
    		res.status(500).send();
    	})

}

function createSizes(path, file) {
    return sharp(path + '/' + file).resize(768).toFile(path + '/768_' + file)
        .then(() => {
            return [{path: path + '/768_' + file, width: 768}];
        });
}


function createMediaAndSendResponse(req, res, uuid, filename, responseData) {
	var dir = uploadedFilesPath + uuid + "/",
        path = dir + filename;        


    createSizes(uploadedFilesPath + uuid, filename)
        .then((altSizes) => {
            const media = new Media({
                path: path,
                altSizes: altSizes,
                size: sizeOf(path),
        //      description: ???,
                user: req.user._id,
                likes: 0
            });            
            return media.save();
        })
    	.then((media) => {
    		console.log("new media: " + JSON.stringify(media));
    		responseData.success = true;
    		responseData.newUuid = media._id; 
    		res.send(responseData)
    	})
    	.catch((error) => {
            responseData.error = "Problem saving media: " + error;
            res.send(responseData);
    	})
}

function onSimpleUpload(fields, file, req, res) {
    var uuid = fields.qquuid,
        responseData = {
            success: false
        };

    file.name = fields.qqfilename;  

    if (isValid(file.size)) {
        moveUploadedFile(file, uuid, function() {
        		createMediaAndSendResponse(req, res, uuid, file.name, responseData);
            },
            function() {
                responseData.error = "Problem copying the file!";
                res.send(responseData);
            });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function onChunkedUpload(fields, file, req, res) {
    var size = parseInt(fields.qqtotalfilesize),
        uuid = fields.qquuid,
        index = fields.qqpartindex,
        totalParts = parseInt(fields.qqtotalparts),
        responseData = {
            success: false
        };

    file.name = fields.qqfilename;
    

    if (isValid(size)) {
        storeChunk(file, uuid, index, totalParts, function() {
            if (index < totalParts - 1) {
        		createMediaAndSendResponse(req, res, uuid, file.name, responseData);
            }
            else {
                combineChunks(file, uuid, function() {
		        		createMediaAndSendResponse(req, res, uuid, file.name, responseData);
                    },
                    function() {
                        responseData.error = "Problem conbining the chunks!";
                        res.send(responseData);
                    });
            }
        },
        function(reset) {
            responseData.error = "Problem storing the chunk!";
            res.send(responseData);
        });
    }
    else {
        failWithTooBigFile(responseData, res);
    }
}

function failWithTooBigFile(responseData, res) {
    responseData.error = "Too big!";
    responseData.preventRetry = true;
    res.send(responseData);
}

function isValid(size) {
    return maxFileSize === 0 || size < maxFileSize;
}

function moveFile(destinationDir, sourceFile, destinationFile, success, failure) {
    mkdirp(destinationDir, function(error) {
        var sourceStream, destStream;

        if (error) {
            console.error("Problem creating directory " + destinationDir + ": " + error);
            failure();
        }
        else {
            sourceStream = fs.createReadStream(sourceFile);
            destStream = fs.createWriteStream(destinationFile);

            sourceStream
                .on("error", function(error) {
                    console.error("Problem copying file: " + error.stack);
                    destStream.end();
                    failure();
                })
                .on("end", function(){
                    destStream.end();
                    success();
                })
                .pipe(destStream);
        }
    });
}

function moveUploadedFile(file, uuid, success, failure) {
    var destinationDir = uploadedFilesPath + uuid + "/",
        fileDestination = destinationDir + file.name;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function storeChunk(file, uuid, index, numChunks, success, failure) {
    var destinationDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        chunkFilename = getChunkFilename(index, numChunks),
        fileDestination = destinationDir + chunkFilename;

    moveFile(destinationDir, file.path, fileDestination, success, failure);
}

function combineChunks(file, uuid, success, failure) {
    var chunksDir = uploadedFilesPath + uuid + "/" + chunkDirName + "/",
        destinationDir = uploadedFilesPath + uuid + "/",
        fileDestination = destinationDir + file.name;


    fs.readdir(chunksDir, function(err, fileNames) {
        var destFileStream;

        if (err) {
            console.error("Problem listing chunks! " + err);
            failure();
        }
        else {
            fileNames.sort();
            destFileStream = fs.createWriteStream(fileDestination, {flags: "a"});

            appendToStream(destFileStream, chunksDir, fileNames, 0, function() {
                rimraf(chunksDir, function(rimrafError) {
                    if (rimrafError) {
                        console.log("Problem deleting chunks dir! " + rimrafError);
                    }
                });
                success();
            },
            failure);
        }
    });
}

function appendToStream(destStream, srcDir, srcFilesnames, index, success, failure) {
    if (index < srcFilesnames.length) {
        fs.createReadStream(srcDir + srcFilesnames[index])
            .on("end", function() {
                appendToStream(destStream, srcDir, srcFilesnames, index + 1, success, failure);
            })
            .on("error", function(error) {
                console.error("Problem appending chunk! " + error);
                destStream.end();
                failure();
            })
            .pipe(destStream, {end: false});
    }
    else {
        destStream.end();
        success();
    }
}

function getChunkFilename(index, count) {
    var digits = new String(count).length,
        zeros = new Array(digits + 1).join("0");

    return (zeros + index).slice(-digits);
}