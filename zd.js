var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var makeDocx = require('./utils').makeDocx;
const unzip = require('unzip');
const process = require('process');
const modify_doc = require('./modify_doc').modify_doc;
const rd = require('rd');
const iconv = require('iconv-lite');
require('./utils').extend_Date()

//年丰盈五个月报告
var sy_file = '收益.csv';
var tpl_path = 'word_tpls';
var tpl_tmp_path = 'output';
var tpl_files;//模板文件数组

var curDate = new Date();
// console.log(d.format("yyyy/MM/dd"));
//
// process.exit(-1);
createTplDirs(tpl_path, tpl_tmp_path);

makeDocxs(tpl_tmp_path);


function getDocxTmpDir(file, output_dir) {
    var name = path.basename(file);
    var index = name.lastIndexOf('.');
    var filename = name.substr(0, index);
    var docx_dir = output_dir + path.sep + filename;
    return docx_dir;
}

function createTplDirs(tpl_path, output_dir) {
    //生成output目录
    if (!fs.existsSync(output_dir)) {
        fs.mkdirSync(output_dir);
    }

    // tpl_files=rd.readFileSync(tpl_path);
    // tpl_files.forEach(function (file,v) {
    //     createTplDir(file,output_dir);
    // });
}

function createTplDir(file, output_dir) {
//unzip
    var docx_dir = getDocxTmpDir(file, output_dir);

    if (fs.existsSync(docx_dir)) {
        fs.rmdirSync(docx_dir);
        console.log('删除' + docx_dir)
    }
    fs.mkdirSync(docx_dir);
// -end 创建目录
}

function unzipFile(file, callback) {
    fs.createReadStream(file).pipe(unzip.Extract({path: getDocxTmpDir(file, tpl_tmp_path)})).on('close', function (err) {
        if (err) throw err;
        console.log('解压完成');
        callback();
    });
}

function makeDocxs(tpl_tmp_path) {
    var fieldLength = 16;//csv列数

    var pos_user = 0;
    var pos_sex = 1;
    var pos_code = 2;
    var pos_product = 3;
    var pos_rate = 4;//利润率
    var pos_lent_date = 5;//初始出借日期
    var pos_lent_money = 6;//初始出借金额
    var pos_report_start_date = 7;
    var pos_report_end_date = 8;//报告周期（结束时间）
    var pos_report_date = 9;//报告日期
    var pos_total_money = 10;//报告日资产总量
    var pos_unused = 11;
    var pos_should_pay = 12;
    var pos_shourang = 13;//报告日受让金额
    var pos_shouhui = 14;//报告日回收金额
    var pos_profit = 15;//报告期内收益


    var map = {
        //每个key必须完全不同，不然再正则匹配的时候会出问题
        global: {
            "R用户": "张三",
            "R性别": "女士",
            "R报告开始日期": "2017.06.28",
            "R报告结束日期": "2017.07.28",
            "R报告日": "2017.07.30",
            "R出借编号": "000987",
            "R产品类型": "年丰盈",
            "R初始出借日期": "2017.02.28",
            "R初始出借金额": "50,000.00",
            "R报告日资产": "55，000.00",
            "yyyy": "/分隔的报告日期-年",
            "mm": "/分隔的报告日期-月",
            "dd": "/分隔的报告日期-日",
        },
        part: {
            //收益信息
            "R1DATE": "",//报告日期
            "R1应还款金额": "",
            "R1受让金额": "",
            "R1回收金额": "",
            "R1报告日资产": "",
            "R1报告日收益": "",
        }

    };


    var bytes = fs.readFileSync(sy_file);
    var contents = iconv.decode(bytes, 'gbk');
    var lines = contents.split("\r\n");
// 去掉header
    lines.splice(0, 1);

    var userBills = {};//code=>[],数组的长度就是账单的期数


//生成用户账单
    convertUserBills();
    // console.log(userBills);
// 对账单中的占位符进行替换
    replaceData();


    function replaceData() {
        for (var code in userBills) {
            var rows = userBills[code];

            var n = rows.length == 1 ? 1 : 2;
            var tplFile = tpl_path + "/nfy/nfy_" + n + ".docx";//TODO 根据产品修改
            console.log(tplFile)
            unzipFile(tplFile, function () {
                //修改内容
                var docPath = tpl_tmp_path + '/nfy_' + n;//解压后的文件路径
                var fileToModify = docPath + '/word/document.xml';
                var document = fs.readFileSync(fileToModify, 'utf8');
                //根据收益表修改内容
                var first = true;
                if (first) {
                    //总信息，一个报告中只有一次
                    map.global.R用户 = rows[0][pos_user];
                    map.global.R性别 = rows[0][pos_sex];
                    map.global.R报告开始日期 = rows[0][pos_report_start_date];
                    map.global.R报告结束日期 = rows[0][pos_report_end_date];
                    map.global.R报告日 = rows[rows.length - 1][pos_report_date];//报告日设置为最后一个报告日,作为当前的报告日
                    map.global.R出借编号 = code;
                    map.global.R产品类型 = rows[0][pos_product];
                    map.global.R初始出借日期 = rows[0][pos_lent_date];
                    map.global.R初始出借金额 = rows[0][pos_lent_money];
                    map.global.R报告日资产 = rows[rows.length - 1][pos_total_money];//报告日资产
                    first = false;
                    //替换
                    for (var r1 in map.global) {
                        var e = new RegExp(r1, 'g');//全局替换
                        document = document.replace(e, map.global[r1]);
                    }
                }
                //列表单独的信息
                for (var j = 0; j < rows.length; j++) {
                    map.part.R1DATE = rows[j][pos_report_date];
                    map.part.R1应还款金额 = rows[j][pos_should_pay];
                    map.part.R1受让金额 = rows[j][pos_shourang];
                    map.part.R1回收金额 = rows[j][pos_shouhui];
                    map.part.R1报告日资产 = rows[j][pos_total_money];
                    map.part.R1报告日收益 = rows[j][pos_profit];
                    //局部替换
                    for (var r1 in map.part) {
                        var e = new RegExp(r1);//局部替换
                        document = document.replace(e, map.part[r1]);
                    }
                }
                fs.writeFileSync(fileToModify, document);
                //文件改好了，应该压缩成docx,然后删除目录继续下一个
                utils.makeDocx(docPath, rows[0][pos_user] + curDate.format("yy年MM月账单") + ".docx");
            });


        }
    }

    function convertUserBills() {
        for (var i = 0; i < lines.length; i++) {
            var fields = lines[i].split(',');
            // console.log("length:"+fields.length);
            if (fields.length != fieldLength) {
                console.error("第" + (i + 1) + "行数据不对");
                process.exit(-1);
            }
            // console.log(fields);
            // process.exit(-1);
            //去掉多余空格
            fields.forEach(function (v, k) {
                fields[k] = v.trim();
            });
            var code = fields[pos_code];//合同编号
            if (code in userBills) {

            } else {
                userBills[code] = [];
            }
            userBills[code].push(fields);

        }
    }
}