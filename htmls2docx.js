var fs = require('fs');
var path = require('path');
var utils=require('./utils');
var readFile=require('./utils').readFile;
var zip=require('./utils').zip;
const unzip=require('unzip');
const process=require('process');

//年丰盈五个月报告
var file = 'word_tpls/nfy/nfy_05.docx';

var name = path.basename(file);
var index=name.lastIndexOf('.');
var filename=name.substr(0,index-1);
var output_dir = 'output';//存放docx解压后的临时文件
var docx_dir = output_dir+ path.sep+filename;

console.log("docx_dir:"+docx_dir);

createDirs();
unzipFiles(function () {
    modifyDocument();
    makeDocx();
});



function createDirs() {
//创建目录，目录名字和文件名一样
    if (!fs.existsSync(output_dir)){
        fs.mkdirSync(output_dir);
    }
//unzip
    if (fs.existsSync(docx_dir)) {
        fs.rmdirSync(docx_dir);
        console.log('删除' + docx_dir)
    }
    fs.mkdirSync(docx_dir);

// -end 创建目录
}

function unzipFiles(callback) {
// 解压文件
    fs.createReadStream(file).pipe(unzip.Extract({path: docx_dir})).on('close', function (err) {
        if (err) throw err;
        console.log('解压完成');
        callback();
    });
// -end 解压文件
}

function modifyDocument() {
    //修改内容
    var document=docx_dir+'/word/document.xml';
    var contents=fs.readFileSync(document,'utf8');
    contents=contents.replace(/0009082/g,'1118888');
// -end 修改内容
    fs.writeFileSync(document, contents);
    console.log("modifyDocument 修改完成")

}


function makeDocx() {
    console.log("makeDocx start");
    var d = new Date();
    var template_dir = docx_dir;
    var sep = template_dir.substring(template_dir.lastIndexOf('/'));

    var filesArr = readFile(template_dir, sep);

    zip(filesArr, d.getTime() + ".docx");

    utils.deleteAll(template_dir);
    console.log("makeDocx end");

}