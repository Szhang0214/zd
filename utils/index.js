const iconv=require('iconv-lite');
const fs=require('fs');
const rd=require('rd');


//rows 是一个数组
function write_csv(rows,path) {
    if(!path){
        console.error('write_csv no path');
        process.exit(-1);
    }
    var str=rows.join("\r\n");
    buf = iconv.encode(str,'gbk')
    fs.writeFileSync(path,buf);
}

function readFile(dir,sep) {
    // 同步列出目录下的所有文件
    var files = rd.readFileSync(dir);
    var shortFiles=[];
    // console.log(files.length)
    files.forEach(function (v,idx,arr) {
        var index=v.indexOf(sep)+sep.length+1;
        var zipName=v.substring(index);
        if (v.indexOf('word/document.xml')!=-1){
            console.log(v);

            // 2017/07/30
        }
        shortFiles.push(zipName);
    });
    // console.log(files.length);
    // for(i=0;i<files.length;i++){
    //     console.log(shortFiles[i]+"\t\t=>"+files[i]);
    // }
    return [shortFiles,files];
}

function zip(filesArr,filename) {
    if (filesArr.length!=2 || filesArr[0].length!=filesArr[1].length){
        console.error("zip input invalid");
        return false;
    }
    filename=filename||'test.zip';
    console.log("filename ="+filename);
    var shortFiles=filesArr[0];
    var files=filesArr[1];

    var zip = new require('node-zip')();

    for(var i=0;i<shortFiles.length;i++ ){
        zip.file(shortFiles[i], fs.readFileSync(files[i]));
    }
    var data = zip.generate({ base64:false, compression: 'DEFLATE' });
// it's important to use *binary* encode
    fs.writeFileSync(filename, data, 'binary');
}

function deleteAll(path) {
    var files = [];
    if(fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function(file, index) {
            var curPath = path + "/" + file;
            if(fs.statSync(curPath).isDirectory()) { // recurse
                deleteAll(curPath);
            } else { // delete file
                fs.unlinkSync(curPath);
            }
        });
        fs.rmdirSync(path);
    }
};

module.exports={
    write_csv:write_csv,
    readFile:readFile,
    zip:zip,
    deleteAll:deleteAll,
};