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

/**
 * 根据解压后的doc所在目录从新生成docx文件
 * @param docsDir
 * @param fileName
 */
function makeDocx(docsDir,fileName) {
    console.log("makeDocx start");
    fileName=fileName||new Date().getTime()+ ".docx"
    var sep = docsDir.substring(docsDir.lastIndexOf('/'));
    var filesArr = readFile(docsDir, sep);
    zip(filesArr, fileName);
    deleteAll(docsDir);
    console.log("makeDocx end");

}


function extend_Date() {
    // 对Date的扩展，将 Date 转化为指定格式的String
// 月(M)、日(d)、小时(h)、分(m)、秒(s)、季度(q) 可以用 1-2 个占位符，
// 年(y)可以用 1-4 个占位符，毫秒(S)只能用 1 个占位符(是 1-3 位的数字)
// 例子：
// (new Date()).Format("yyyy-MM-dd hh:mm:ss.S") ==> 2006-07-02 08:09:04.423
// (new Date()).Format("yyyy-M-d h:m:s.S")      ==> 2006-7-2 8:9:4.18
    Date.prototype.Format = Date.prototype.format = function (fmt) { //author: meizz
        var o = {
            "M+": this.getMonth() + 1, //月份
            "d+": this.getDate(), //日
            "h+": this.getHours(), //小时
            "m+": this.getMinutes(), //分
            "s+": this.getSeconds(), //秒
            "q+": Math.floor((this.getMonth() + 3) / 3), //季度
            "S": this.getMilliseconds() //毫秒
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    }

// var time1 = new Date().Format("yyyy.MM.dd");
//     var time2 = new Date().Format("yyyy-MM-dd HH:mm:ss");
}

module.exports={
    write_csv:write_csv,
    readFile:readFile,
    zip:zip,
    deleteAll:deleteAll,
    makeDocx:makeDocx,
    extend_Date:extend_Date,
};