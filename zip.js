var fs = require('fs');
var path = require('path');

// The zip library needs to be instantiated:
var zip = new require('node-zip')();

// You can add multiple files by performing subsequent calls to zip.file();
// the first argument is how you want the file to be named inside your zip,
// the second is the actual data:
zip.file('a/file1.txt', fs.readFileSync(path.join(__dirname, 'file1.txt')));
zip.file('b/file2.txt', fs.readFileSync(path.join(__dirname, 'file2.txt')));

var data = zip.generate({ base64:false, compression: 'DEFLATE' });

// it's important to use *binary* encode
fs.writeFileSync('test.zip', data, 'binary');


// var zip = new JSZip();
// zip.file("Hello.txt", "Hello World\n");
// var img = zip.folder("images");
// img.file("smile.gif", imgData, {base64: true});
// zip.generateAsync({type:"blob"})
//     .then(function(content) {
//         // see FileSaver.js
//         saveAs(content, "example.zip");
//     });