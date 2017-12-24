/**
 *
 * Created by xueleixi on 2017/12/22.
 */



var async = require("async");

function doWork(file, callback) {
    // Do funky stuff with file
    console.log(file);
    setTimeout(function () {
        callback()
    },2000);
}

var queue = async.queue(doWork, 4); // Run ten simultaneous uploads

queue.drain = function() {
    console.log("完成!");
};

files=['a','b','c','d','e','f','g','h','i'];
// Queue your files for upload
queue.push(files);

queue.concurrency = 4; // Increase to twenty simultaneous uploads

