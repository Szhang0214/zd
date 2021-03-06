const iconv = require('iconv-lite');
const fs = require('fs');
const rd = require('rd');
const process = require('process');
const path = require('path');
const unzip = require('unzip');

//每三位用一个逗号分隔
Number.prototype.formatMoney = function (places, thousand, decimal) {
    places = !isNaN(places = Math.abs(places)) ? places : 2;
    thousand = thousand || ",";
    decimal = decimal || ".";
    var number = this,
        negative = number < 0 ? "-" : "",
        i = parseInt(number = Math.abs(+number || 0).toFixed(places), 10) + "",
        j = (j = i.length) > 3 ? j % 3 : 0;
    return negative + (j ? i.substr(0, j) + thousand : "") + i.substr(j).replace(/(\d{3})(?=\d)/g, "$1" + thousand) + (places ? decimal + Math.abs(number - i).toFixed(places).slice(2) : "");
};

extend_Date();


//rows 是一个数组
function write_csv(rows, path) {
    if (!path) {
        console.error('write_csv no path');
        process.exit(-1);
    }
    var str = rows.join("\r\n");
    buf = iconv.encode(str, 'gbk')
    fs.writeFileSync(path, buf);
}

function readFile(dir, sep) {
    // 同步列出目录下的所有文件
    var files = rd.readFileSync(dir);
    var shortFiles = [];
    files.forEach(function (v, idx, arr) {
        var index = v.indexOf(sep) + sep.length + 1;
        var zipName = v.substring(index);
        if (v.indexOf('word/document.xml') != -1) {
            console.log(v);
            // 2017/07/30
        }
        shortFiles.push(zipName);
    });
    return [shortFiles, files];
}

function zip(filesArr, filename) {
    if (filesArr.length != 2 || filesArr[0].length != filesArr[1].length) {
        console.error("zip input invalid");
        return false;
    }
    filename = filename || 'test.zip';

    var shortFiles = filesArr[0];
    var files = filesArr[1];

    var zip = new require('node-zip')();

    for (var i = 0; i < shortFiles.length; i++) {
        zip.file(shortFiles[i], fs.readFileSync(files[i]));
    }
    var data = zip.generate({base64: false, compression: 'DEFLATE'});
    filename = `生成的账单/${filename}`;
    console.log("filename =" + filename);
    fs.writeFileSync(filename, data, 'binary');
}

function deleteAll(path) {
    var files = [];
    if (fs.existsSync(path)) {
        files = fs.readdirSync(path);
        files.forEach(function (file, index) {
            var curPath = path + "/" + file;
            if (fs.statSync(curPath).isDirectory()) { // recurse
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
function makeDocx(docsDir, fileName) {
    // console.log("makeDocx start");
    fileName = fileName || new Date().getTime() + ".docx"
    var sep = docsDir.substring(docsDir.lastIndexOf('/'));
    var filesArr = readFile(docsDir, sep);
    zip(filesArr, fileName);
    // deleteAll(docsDir);
    // console.log("makeDocx end");

}
function MyDate(fullYear, month, date) {
    if (arguments.length == 3) {
        this.fullYear = fullYear;
        this.month = month;
        this.date = date;
    } else if (arguments.length == 1) {

        let d = arguments[0];
        if (d instanceof Date || d instanceof MyDate) {
            this.fullYear = d.getFullYear();
            this.month = d.getMonth();
            this.date = d.getDate();
        } else {
            this.fullYear = d[0];
            this.month = parseInt(d[1]) - 1;//月份转化-1
            this.date = d[2];
        }

    }

}
MyDate.prototype.setFullYear = function (fullYear) {
    this.fullYear = fullYear;
}
MyDate.prototype.setMonth = function (month) {
    this.month = month;
}
MyDate.prototype.setDate = function (date) {
    this.date = date;
}

MyDate.prototype.getFullYear = function () {
    let number = parseInt(this.fullYear);
    if (isNaN(number)) {
        error('not number:' + this.fullYear);
    }
    return number;
}
MyDate.prototype.getMonth = function () {
    return parseInt(this.month);
}
MyDate.prototype.getDate = function () {
    return parseInt(this.date);
}
MyDate.prototype.toString = function () {
    return this.fullYear + ";" + this.month + ";" + this.date;
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
    };
    MyDate.prototype.format = function (fmt) {
        var o = {
            "M+": this.getMonth() + 1, //月份
            "d+": this.getDate(), //日
        };
        if (/(y+)/.test(fmt)) fmt = fmt.replace(RegExp.$1, (this.getFullYear() + "").substr(4 - RegExp.$1.length));
        for (var k in o)
            if (new RegExp("(" + k + ")").test(fmt)) fmt = fmt.replace(RegExp.$1, (RegExp.$1.length == 1) ? (o[k]) : (("00" + o[k]).substr(("" + o[k]).length)));
        return fmt;
    };
    MyDate.prototype.formatReportDay = function () {
        let m = this.getMonth() + 1;
        // yyyy.MM.dd
        return this.getFullYear() + "." + (m < 10 ? "0" + m : "" + m) + "." + (m == 2 ? '28' : '30');
    };
    MyDate.prototype.formatReportEnd = function () {
        let m = this.getMonth() + 1;
        let mths = [1,3, 5, 7, 8, 10, 12];
        if (this.getDate() >30 && mths.indexOf(m) == -1) {
            this.setDate(30);
        }
        if(m==2 && this.getDate()>28){
            this.setDate(28);
        }
        let date=this.getDate();
        let dateStr = date < 10 ? '0' + date : date;
        return this.getFullYear() + "." + (m < 10 ? "0" + m : "" + m) + "." + dateStr;
    };
// var time1 = new Date().Format("yyyy.MM.dd");
//     var time2 = new Date().Format("yyyy-MM-dd HH:mm:ss");
}


/** 数字金额大写转换(可以处理整数,小数,负数) */
function smalltoBIG(n) {
    var fraction = ['角', '分'];
    var digit = ['零', '壹', '贰', '叁', '肆', '伍', '陆', '柒', '捌', '玖'];
    var unit = [['元', '万', '亿'], ['', '拾', '佰', '仟']];
    var head = n < 0 ? '欠' : '';
    n = Math.abs(n);

    var s = '';

    for (var i = 0; i < fraction.length; i++) {
        s += (digit[Math.floor(n * 10 * Math.pow(10, i)) % 10] + fraction[i]).replace(/零./, '');
    }
    s = s || '整';
    n = Math.floor(n);

    for (var i = 0; i < unit[0].length && n > 0; i++) {
        var p = '';
        for (var j = 0; j < unit[1].length && n > 0; j++) {
            p = digit[n % 10] + unit[1][j] + p;
            n = Math.floor(n / 10);
        }
        s = p.replace(/(零.)*零$/, '').replace(/^$/, '零') + unit[0][i] + s;
    }
    return head + s.replace(/(零.)*零元/, '元').replace(/(零.)+/g, '零').replace(/^整$/, '零元整');
}

const xlsx = require('node-xlsx').default;

function readXlsx(filename) {
    // Parse a file
    const workSheetsFromFile = xlsx.parse(filename);
    let sheet1 = workSheetsFromFile[0]['data'];
    return sheet1;
}
function deepCopy(source) {
    var result = {};

    for (var key in source) {
        result[key] = typeof source[key] === 'object' ? deepCoyp(source[key]) : source[key];
    }
    return result;
};

function writeXlsx(filename, data) {
    var buffer = xlsx.build([{name: filename, data: data}]); // Returns a buffer
    if (filename.indexOf('.xlsx') == -1) {
        filename += '.xlsx';
    }
    fs.writeFileSync('生成的excel' + path.sep + filename, buffer);
}


function print() {
    for (let i = 0; i < arguments.length; i++) {
        console.error(arguments[i]);
    }
    console.log('')
}

function error() {
    for (let i = 0; i < arguments.length; i++) {
        console.error(arguments[i]);
    }
    console.log('error');
    process.exit();
}


/**
 * 根据文件名和临时目录，返回一个相关的随机的目录
 * @param file
 * @param output_dir
 * @returns {string}
 */
function getDocxTmpDir(file, output_dir) {
    var name = path.basename(file);
    var index = name.lastIndexOf('.');
    var filename = name.substr(0, index);
    //压缩后的文件异步生成，防止命名冲突
    var docx_dir = output_dir + path.sep + filename + (new Date().getTime() + parseInt(Math.random() * 100000));
    fs.writeFileSync(output_dir + path.sep + '/log' + (new Date().format('yyyy.MM.dd')) + '.txt', docx_dir + "\r\n", {flag: 'a+'});
    return docx_dir;
}

/**
 * 如果目录不存在，则创建目录
 * @param output_dir
 */
function createDirIfNonExist(output_dir) {
    //生成output目录ª
    if (!fs.existsSync(output_dir)) {
        fs.mkdirSync(output_dir);
    } else {
        deleteAll(output_dir);
        fs.mkdirSync(output_dir);
    }
}
/**
 *
 * @param file
 * @param output 解压后的目录
 * @param args 最后一个参数作为回调参数
 */
function unzipFile(file, output, ...args) {
    if (args.length < 1) {
        error("unzipFile 需要至少一个file,一个callback参数");
    }
    let callback = args[args.length - 1];
    let docxTmpDir = getDocxTmpDir(file, output);
    fs.createReadStream(file)
        .pipe(unzip.Extract({path: docxTmpDir}))
        .on('close', function (err) {
            if (err) throw err;
            callback(docxTmpDir, ...args);
        });
}

function readCsvToLines(filename) {
    var bytes = fs.readFileSync(filename);
    var content = iconv.decode(bytes, 'gbk');
    var lines = content.split("\r\n");//客户名称
    return lines;
}

/**
 * 以map的key为正则，map.value为要替换的值，对html进行替换并返回替换后的内容
 * @param html
 * @param map
 * @returns {*}
 */
function replacePlaceHolders(html, map) {
    //局部替换
    for (var r1 in map) {
        var e = new RegExp(r1);//局部替换
        html = html.replace(e, map[r1]);
    }
    return html;
}


//把字符串或者数字转换为float,字符串中'%'，','会被替换
function parseFloatStr(str) {
    switch (typeof str) {
        case 'string':
            // 12.00%
            if (str.indexOf('%') > 0) {
                return parseFloat(str.replace('%', '')) / 100;
            }
            // 300,000.00
            return parseFloat(str.replace(/\,/g, ''));
        case 'number':
            return parseFloat(str);
        default:
            throw new Error(str + ' is not string:' + typeof str);
    }
}

function removeEmptyLines(lines) {
    let validLines = 0;

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].length > 1) {
            validLines++
        } else {
            break;
        }
    }
    return lines.splice(0, validLines);
}

function updatePosZd(posZd, zdHeader) {
    let idx = 0;
    for (let i in posZd) {
        if (typeof posZd[i] == "number") {
            posZd[i] = idx;
        } else {
            posZd[i] = zdHeader.indexOf(posZd[i]);
        }
        idx += 1;
    }
}

let posZd = {
    user: '用户名',
    sex: '称呼',
    lent_code: '出借编号',
    product: '产品名称',
    rate: '利润率',
    lent_date: '初始出借日期',
    lent_money: '初始出借金额',
    id_code: '身份证号',
    company: '公司',
    report_start_date: '报告开始日期',//自动生成
    report_end_date: '报告结束日期',//自动生成
    report_date: '报告日期',//自动生成
    total_money: '报告日资产总额',//自动生成
    profit: '报告期内收益',//自动生成
};

module.exports = {
    write_csv: write_csv,
    readFile: readFile,
    zip: zip,
    deleteAll: deleteAll,
    makeDocx: makeDocx,
    extend_Date: extend_Date,
    smalltoBIG,
    readXlsx,
    deepCopy,
    writeXlsx,
    print,
    error,
    getDocxTmpDir,
    createDirIfNonExist,
    unzipFile,
    readCsvToLines,
    replacePlaceHolders,
    MyDate,
    parseFloatStr,
    removeEmptyLines,
    updatePosZd,
    posZd: function () {
        return posZd;
    },
};