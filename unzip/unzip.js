/**
 * Created by xueleixi on 2017/12/1.
 */
const fs=require('fs');
const unzip=require('unzip');
const path=require('path');
const process=require('process');

var file = './1512039610598.docx';

//创建目录，目录名字和文件名一样
var name = path.basename(file);
var index=name.lastIndexOf('.');
var filename=name.substr(0,index-1);
console.log(filename);
var output_dir = 'output';

//unzip
var docx_dir = output_dir+ path.sep+filename;
if (fs.existsSync(docx_dir)){
    fs.rmdirSync(docx_dir);
    console.log('删除'+docx_dir)
}
fs.mkdirSync(docx_dir);

// -end 创建目录

// 解压文件
fs.createReadStream(file).pipe(unzip.Extract({ path: docx_dir})).on('close',function (err) {
    if(err) throw err;
    console.log('解压完成');
    modifyDocument();
});
// -end 解压文件


function modifyDocument() {
    //修改内容
    var document=docx_dir+'/word/document.xml';
    var contents=fs.readFileSync(document,'utf8');
    contents=contents.replace(/0009082/g,'1118888');
// -end 修改内容
    fs.writeFile(document, contents,function (err) {
        if (err) throw err;
        console.log("修改完成")
    });

}







