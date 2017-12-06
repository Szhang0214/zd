var fs = require('fs');
var path = require('path');
var utils = require('./utils');
var makeDocx = require('./utils').makeDocx;
const unzip = require('unzip');
const process = require('process');
const modify_doc = require('./modify_doc').modify_doc;
const rd = require('rd');
const iconv = require('iconv-lite');
require('./utils').extend_Date();
const cheerio = require('cheerio');


//年丰盈五个月报告
var sy_file = 'zs/账单.csv';
var zq_file = 'zs/既有债权列表.csv';
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
    var fieldLength = 12;//账单csv列数
    var zqFieldLength = 12;//债权csv列数

    var posZd = {
        user: 0,
        sex: 1,
        code: 2,
        product: 3,
        rate: 4,
        lent_date: 5,
        lent_money: 6,
        report_start_date: 7,
        report_end_date: 8,
        report_date: 9,
        total_money: 10,//自动生成
        should_pay: 11,//自动生成
        shourang: 11,//自动生成
        profit: 11,//自动生成
        // var pos_shouhui = 14;//报告日回收金额
    };
//债权字段位置
    var posZq = {
        code: 0,//出借编号
        borrower: 1,//借款人
        id_code: 2,//借款人证件号
        certificate: 3,//证书编号
        identity: 4,//债务人身份（企业法人）
        usage: 5,//借款用途
        borrow_money: 6,//初始受让债权价值
        repay_day: 7,//还款起始日期
        repay_money: 8,//本期还款金额
        repay_months: 9,//还款期限（月）
        remain_months: 10,//剩余还款月数
        rate: 11,//预计债权收益率（年）
    };



    var map = {
        //每个key必须完全不同，不然再正则匹配的时候会出问题
        global: {
            "RUSER": "张三",
            "RSEX": "女士",
            "RRPT_BG_DATE": "2017.06.28",
            "RRPT_ED_DATE": "2017.07.28",
            "RRPT_DATE": "2017.07.30",
            "RLT_CODE": "000987",
            "RPODUCT": "年丰盈",
            "RLT_BG_DATE": "2017.02.28",
            "RLT_BG_MONEY": "50,000.00",
            "RRPD_MONEY": "55，000.00",
            "yyyy": "/分隔的报告日期-年",
            "mm": "/分隔的报告日期-月",
            "dd": "/分隔的报告日期-日",
        },
        part: {
            //收益信息
            "R1DATE": "",//报告日期
            "R1SHPAY": "",
            "R1SRMN": "",
            "R1HSMN": "",
            "R1BGRZC": "",
            "R1BGRSY": "",
        },
        zq: {//债权
            global: {
                "R2_SUM1": "汇总债权价值",//R2_SUM1 汇总债权价值
                "R2_SUM2": "汇总利息", // R2_SUM2 汇总利息
            },
            part: {
                "R2BORROWER": "借款人",
                "R2BORROWER_CODE": "借款人身份证",
                "R2BORROWER_MONEY1": "初始受让金额",
                "R2BORROWER_MONEY2": "持有金额",
                "R2BORROWER_RPD": "起始还款日",
                "R2BORROWER_RPM": "本期还款金额",
                "R2_MTH": "还款约束",
                "R2_REM": "剩余还款约束",
                "R2_RATE": "利润率",
            }
        },
        zqzr: {//债权转让
            global:{
                "RIDCODE":"客户身份证号",
                "R3BORROWER_MONEY": "人民币数字",
                "R3BORROWER_MONEYT": "人民币老写",
            },
            part:{
                "R3BORROWER": "借款人",
                "R3BORROWER_CODE": "借款人身份证号",
                "R3BORROWER_MONEY": "初始借款金额",
                "R3BORROWER_CERTIFICATE": "证书",
                "R3BORROWER_IDENTITY": "身份",
                "R3BORROWER_USE": "用途",
                "R3BORROWER_RPD": "起始还款日期",
                "R3BORROWER_RPM": "还款期限",
                "R3BORROWER_REM": "剩余还款月",
                "R3BORROWER_RATE": "收益",
            }

        }

    };


    var lines =readCsvToLines(sy_file);
    var zqLines=readCsvToLines(zq_file);
// 去掉header
    lines.splice(0, 1);
    zqLines.splice(0, 1);

    var userBills = {};//code=>[],数组的长度就是账单的期数
    var userZq={};//code=>[]

//生成用户账单
    convertUserBills();
    //生成债权
    convertUserZq();
    console.log(userZq);
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
                    map.global.RUSER = rows[0][posZd.user];
                    map.global.RSEX = rows[0][posZd.sex];
                    map.global.RRPT_BG_DATE = rows[0][posZd.report_start_date];
                    map.global.RRPT_ED_DATE = rows[0][posZd.report_end_date];
                    map.global.RRPT_DATE = rows[rows.length - 1][posZd.report_date];//报告日设置为最后一个报告日,作为当前的报告日
                    map.global.RLT_CODE = code;
                    map.global.RPODUCT = rows[0][posZd.product];
                    map.global.RLT_BG_DATE = rows[0][posZd.lent_date];
                    map.global.RLT_BG_MONEY = rows[0][posZd.lent_money];
                    map.global.RRPD_MONEY = rows[rows.length - 1][posZd.total_money];//报告日资产
                    var reportDate = new Date(map.global.RRPT_DATE);
                    console.log(map.global.RRPT_DATE);
                    map.global.yyyy = reportDate.format('yyyy');
                    map.global.mm = reportDate.format('MM');
                    map.global.dd = reportDate.format('dd');
                    first = false;
                    //替换
                    for (var r1 in map.global) {
                        var e = new RegExp(r1, 'g');//全局替换
                        document = document.replace(e, map.global[r1]);
                    }
                }
                const $ = cheerio.load(document, {xmlMode: true});
                //收益列表
                (function () {
                    //收益表
                    var tProfit = $('w\\:tbl').eq(1);
                    //替换行
                    var $replaceTr = tProfit.find('w\\:tr').eq(2);
                    //替换收益行
                    for (var j = 0; j < rows.length; j++) {
                        map.part.R1DATE = rows[j][posZd.report_date];
                        map.part.R1SHPAY = rows[j][posZd.should_pay];
                        map.part.R1SRMN = rows[j][posZd.shourang];
                        map.part.R1HSMN = '0.00';
                        map.part.R1BGRZC = rows[j][posZd.total_money];
                        map.part.R1BGRSY = rows[j][posZd.profit];
                        var $trClone = $replaceTr.clone();
                        var html = $trClone.html();
                        // console.log($trClone.text());
                        // console.log(map.part);
                        var rHtml = replaceProfitLine(html, map.part);
                        $trClone.html(rHtml);
                        tProfit.append($trClone);
                    }
                    $replaceTr.remove();
                })();

                //既有债权列表
                (function () {
                    // 债权表
                    var tZq = $('w\\:tbl').eq(2);
                    var sumTr = tZq.find('w\\:tr').last();
                    //替换行
                    var $replaceTr = tZq.find('w\\:tr').eq(2);
                    var zqRows=userZq[code];//当前账单的债权列表
                    //替换债权行
                    for (var j = 0; j < zqRows.length; j++) {
                        map.zq.part.R2BORROWER = zqRows[j][posZq.borrower];
                        map.zq.part.R2BORROWER_CODE = zqRows[j][posZq.id_code];
                        map.zq.part.R2BORROWER_MONEY1 = zqRows[j][posZq.borrow_money];
                        map.zq.part.R2BORROWER_MONEY2 = map.zq.part.R2BORROWER_MONEY1;
                        map.zq.part.R2BORROWER_RPD = zqRows[j][posZq.repay_day];
                        map.zq.part.R2BORROWER_RPM = zqRows[j][posZq.repay_money];
                        map.zq.part.R2_MTH = zqRows[j][posZq.repay_months];
                        map.zq.part.R2_REM = zqRows[j][posZq.remain_months];
                        map.zq.part.R2_RATE = zqRows[j][posZq.rate];
                        var $trClone = $replaceTr.clone();
                        var html = $trClone.html();
                        // console.log($trClone.text());
                        // console.log(map.zq.part);
                        var rHtml = replaceProfitLine(html, map.zq.part);
                        $trClone.html(rHtml);
                        $trClone.insertBefore(sumTr);
                    }
                    //todo 计算汇总数据 global
                    $replaceTr.remove();
                })();


                fs.writeFileSync(fileToModify, $.html());
                //文件改好了，应该压缩成docx,然后删除目录继续下一个
                utils.makeDocx(docPath, rows[0][posZd.user] + curDate.format("yy年MM月账单") + ".docx");
            });


        }
    }

    function replaceProfitLine(html, map) {
        //局部替换
        for (var r1 in map) {
            var e = new RegExp(r1);//局部替换
            html = html.replace(e, map[r1]);
        }
        return html;
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
            var code = fields[posZd.code];//合同编号
            if (code in userBills) {

            } else {
                userBills[code] = [];
            }
            userBills[code].push(fields);

        }
    }
    function convertUserZq() {

        for (var i = 0; i < zqLines.length; i++) {
            var fields = zqLines[i].split(',');
            // console.log("length:"+fields.length);
            if (fields.length != zqFieldLength) {
                console.error("债权 第" + (i + 1) + "行数据不对");
                process.exit(-1);
            }
            // console.log(fields);
            // process.exit(-1);
            //去掉多余空格
            fields.forEach(function (v, k) {
                fields[k] = v.trim();
            });
            var code = fields[posZq.code];//合同编号
            if (code in userZq) {

            } else {
                userZq[code] = [];
            }
            userZq[code].push(fields);

        }
    }
}

function readCsvToLines(filename) {
    var bytes = fs.readFileSync(filename);
    var content = iconv.decode(bytes, 'gbk');
    var lines = content.split("\r\n");//客户名称
    return lines;
}