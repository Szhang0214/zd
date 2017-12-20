
var fs = require('fs');
var iconv = require('iconv-lite');
var zdFile = 'data/账单初始数据.xlsx';
var jqFile = "data/既有债权列表.xlsx";
var outFile = "账单-yyyymmdd.csv";
var process = require('process');
const utils = require('./utils');
const error = utils.error;
const print = utils.print;
utils.extend_Date();

function parseFloatStr(str) {
    switch (typeof str){
        case 'string':
            // 12.00%
            if(str.indexOf('%')>0){
                return parseFloat(str.replace('%',''))/100;
            }
            // 300,000.00
            return parseFloat(str.replace(',',''));
        case 'number':
            return parseFloat(str)
        default:
            throw new Error('not string');
    }
}


var zdLines = utils.readXlsx(zdFile);//账单数据

/**
 * 账单
 */
//第一行是表头
let zdHeader = zdLines.splice(0, 1)[0];
// console.log(zdHeader);
var zdHeaderLine = zdHeader.join(',');
// //删除空行
// lines.forEach(function (line, idx) {
//     if (line.trim() == '') {
//         lines.splice(idx, 1);
//     }
// });
var curDate = new Date();

var zdRows = [];//账单数据
let zdDict = {};// 'lent_code'=>[info],
//账单字段位置
var posZd = {
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
//债权字段位置
var posJq = {
    lent_code: '出借编号',//
    borrower: '借款人',//
    id_code: '借款人证件号',//
    certificate: '证书编号',//
    identity: '债务人情况',//债务人身份（企业法人）
    usage: '借款用途',//借款用途
    borrow_money: '初始受让债权价值',//初始受让债权价值
    borrow_money2: '报告日持有债权价值（元）',//初始受让债权价值
    repay_day: '还款起始日期',//还款起始日期
    repay_money: '本期还款金额',//本期还款金额
    repay_months: '还款期限（月）',//还款期限（月）
    remain_months: '剩余还款月数',//剩余还款月数
    rate: '预计债权收益率（年）',//预计债权收益率（年）

};

(function updatePosZd(posZd) {
    let idx = 0;
    for (let i in posZd) {
        if (typeof posZd[i] == "number") {
            posZd[i] = idx;
        } else {
            posZd[i] = zdHeader.indexOf(posZd[i]);
        }
        idx += 1;
    }
})(posZd);


// console.log(zdHeader)
// print('poszd', posZd);
// process.exit(-1);


let interest = {
    '年丰盈': {
        //应还款
        0.08: 0.644,
        0.09: 0.721,
        0.10: 0.8,
        0.11: 0.874,
        0.12: 0.95,
        0.13: 1.024,
        0.14: 1.1,
        0.15: 1.172
    },
    '月润通': {
        //应还款
        // 10.8/100/12
    },
    '单季丰': {
        0.06: 0.498,
        0.07: 0.58,
    },
    '双季盈': {
        0.08: 0.656,
        0.09: 0.74,
        0.10: 0.82,
        0.11: 0.896,
    }
};

compute_gains();
// console.log(zdRows);
// process.exit(-1);

check_jq_data();
write_gains_csv();

//检查债权列表数据
function check_jq_data() {
    // var jqLines = readCsvToLines(jqFile);
    var jqLines = utils.readXlsx(jqFile);
    var jqRows = [];
    // printHeader(jqLines);
    var jqHeaderFields = jqLines.splice(0, 1)[0];
    // var jqHeader = jqHeaderFields.join(',');
    var jqHeader = jqHeaderFields;
    (function updatePosJq() {
        let idx = 0;
        for (let i in posJq) {
            if (typeof posJq[i] == "number") {
                posJq[i] = idx;
            } else {
                posJq[i] = jqHeaderFields.indexOf(posJq[i]);
            }
            idx += 1;
        }
    })();
    // error('posJq',posJq);

    // console.log(jqLines);
    var jqFieldCnt = 0;
    for (var i in posJq) {
        jqFieldCnt++;
    }
    // console.log("jq fields:"+jqFieldCnt);
    var code_last = -1;//出借编号
    var jqDict = {//以出借编号位key,每出借信息数组为value

    };//key:code val:[]
    // print('jqLines',jqLines);
    jqLines.forEach(function (line, idx) {
        // var fields = line.split(',');
        var fields = line;
        if (fields.length <10) {
            // print('债权列表数据列数不对',fields.length+'!='+jqFieldCnt,line)
            return;
        }else if(fields.length<jqFieldCnt){
            fields[posJq.certificate] = fields[posJq.certificate] ? fields[posJq.certificate] : '';
            fields[posJq.identity] = '企业法人';
            fields[posJq.usage] = '资金周转';
        }
        fields.forEach(function (v, idx) {
            if (v.trim) {
                fields[idx] = v.trim();//每个字段去掉空格
            }

        });

        // error('fields',fields);

        if (!(fields[posJq.lent_code] in jqDict)) {
            jqDict[fields[posJq.lent_code]] = [];
        }
        jqDict[fields[posJq.lent_code]].push(fields);

        jqRows.push(fields);
    });
    // error('jqDict',jqDict,'zdDict',zdDict);

    //修改债权数据  todo
    // 本期还款金额	还款期限（月）	剩余还款月数
    // 475	12	8
    // 4.51	4	2
    for (var code in jqDict) {
        var rows = jqDict[code];

        let product = zdDict[code][posZd.product];
        if (product == undefined) {
            error(`债权产品未知：`, zdDict);
        }
        //todo 借款到期，把钱转入下一个人
        var fulfilled_ids=[];
        var fulfilledRows=[];
        rows.forEach(function (row,idx) {
            //还款期限-1
            let remain_months = row[posJq.remain_months] - 1;
            if(remain_months==0){
                fulfilled_ids.push(idx);
            }else {
                row[posJq.remain_months] = remain_months;
            }
            parseJqRow(row);
        });

        for(let i=0;i<fulfilled_ids.length;i++){
            // fulfilledRows.push(rows.splice(fulfilled_ids[i],1));
            fulfilledRows.push(rows[fulfilled_ids[i]]);
        }

        //todo 月润通到期没处理，逻辑本身也比较简单
        if (product == '月润通') {
            rows.forEach(function (row) {
               formatJqRow(row)
            });
            //月润通每月返回利润
            continue;
        }

        var newRow = [];//年丰盈 新增记录
        for (var j = 0; i < jqFieldCnt; j++) {
            newRow[j] = '';
        }
        newRow[posJq.lent_code] = rows[0][posJq.lent_code];
        let eRate=rows[0][posJq.rate];
        if(typeof eRate=='string' && eRate.indexOf('%')>0){
            newRow[posJq.rate]=eRate;
        }else {//小数表示形式
            newRow[posJq.rate] = (rows[0][posJq.rate]*100).formatMoney()+'%';
        }
        var profits = 0.00;
        let deadlineMoney=0.00;
        rows.forEach(function (row) {
            profits += parseFloatStr(row[posJq.repay_money]);
        });
        //加上借款到期的钱 删除到期数据
        for(let i=0;i<fulfilled_ids.length;i++){
            profits += fulfilledRows[i][posJq.repay_money];
            deadlineMoney += fulfilledRows[i][posJq.borrow_money];
            // error('b:'+deadlineMoney);
            rows.splice(fulfilled_ids[i],1);
        }

        let borrowMoneyNumber = round(profits+deadlineMoney, 2);
        newRow[posJq.borrow_money] = borrowMoneyNumber;//初始受让债权价值
        newRow[posJq.borrow_money2] = newRow[posJq.borrow_money];//初始受让债权价值
        let rate=zdDict[code][posZd.rate];
        let irate=interest[product][rate];

        // print(newRow[posJq.borrow_money],irate,1);

        newRow[posJq.repay_money] = compute_nfy_month_profit(borrowMoneyNumber,irate,1);//本期应还款金额
        newRow[posJq.identity] = '企业法人';
        newRow[posJq.usage] = '资金周转';
        rows.push(newRow);
        rows.forEach(function (row) {
            formatJqRow(row)
        });
    }
    //生成新的债权数据
    jqRows = [];
    for (var i in jqDict) {
        jqRows = jqRows.concat(jqDict[i].map(function (v) {
            // return v.join(',');
            return v;
        }));
    }
    write_jq_csv(jqRows, jqHeader);
    console.log("-- 新的债权列表 --")
    // console.log(jqRows);
}

//对债券原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
function parseJqRow(row) {
    row[posJq.borrow_money]=parseFloatStr(row[posJq.borrow_money]);
    row[posJq.borrow_money2]=parseFloatStr(row[posJq.borrow_money2]);
    row[posJq.repay_money]=parseFloatStr(row[posJq.repay_money]);
    row[posJq.rate]=parseFloatStr(row[posJq.rate]);
}

//把数字、利率转换陈word表示形式(千分制、%)
function formatJqRow(row){
    row[posJq.borrow_money]=parseFloatStr(row[posJq.borrow_money]).formatMoney();
    row[posJq.borrow_money2]=parseFloatStr(row[posJq.borrow_money2]).formatMoney();
    row[posJq.repay_money]=parseFloatStr(row[posJq.repay_money]).formatMoney();
    row[posJq.rate]=(parseFloatStr(row[posJq.rate])*100).toFixed(2)+'%';
}

//对账单原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
function parseZdRow(row) {
    row[posZd.lent_money]=parseFloatStr(row[posZd.lent_money]);
    row[posJq.rate]=parseFloatStr(row[posZd.rate]);
}
//把数字、利率转换陈word表示形式(千分制、%)
function formatZdRow(row){
}

function diffMonths(curDate, lentDate) {
    return (curDate.getYear() - lentDate.getYear()) * 12 + curDate.getMonth() - lentDate.getMonth();
}

function addMonths(oldDate, months) {
    var reportEndDate = new Date(oldDate);
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    return reportEndDate.format('yyyy.MM.dd');
}


function compute_gains() {
    for (var i1 = 0; i1 < zdLines.length; i1++) {
        // 初始出借金额的货币形式ie."50,000.00"包含分隔符'，',要进行转换
        // var line = zdLines[i].trim().replace(/\"(\d+)\,(\d+)\.00\"/, '$1$2').split(',');
        // line.forEach(function (v, k) {
        //     line[k] = v.trim();
        // });
        let line = zdLines[i1];
        parseZdRow(line);

        zdDict[line[posZd.lent_code]] = line;

        var lentDate = new Date(line[posZd.lent_date]);
        var reportDate = new Date(lentDate);
        //计算报告日、报告开始日、报告结束日
        if (lentDate.getDate() <= 15) {
            reportDate.setDate(15);
        } else {
            if (lentDate.getMonth() + 1 == 2) {
                reportDate.setDate(28);
            } else {
                reportDate.setDate(30);
            }
        }
        line[posZd.report_date] = addMonths(reportDate, 1);
        // 报告开始日期
        line[posZd.report_start_date] = lentDate.format('yyyy.MM.dd');
        //报告结束日期
        line[posZd.report_end_date] = addMonths(lentDate, 1);


        compute_money(line);
        //当前用户 账单需要几个月的收益信息
        var months = diffMonths(curDate, lentDate);
        // zdRows.push(line.join(','));
        zdRows.push(line);
        //生成每个月的数据
        var period = 0;
        switch (line[posZd.product]) {
            case '年丰盈':
                period = 12;
                break;
            case '月润通':
                period = 12;
                break;
            case '单季丰':
                period = 4;
                break;
            case '双季盈':
                period = 6;
                break;
            default:
                error('产品周期-未知产品');
        }


        for (var i = 1; i < period - 1 && i < months; i++) {
            var newLine = line.slice();//生成每一期的数据
            var oldDate = new Date(newLine[posZd.report_start_date]);
            // 月数增加
            newLine[posZd.report_start_date] = addMonths(oldDate, i);
            newLine[posZd.report_end_date] = addMonths(oldDate, i + 1);

            var oldReportDate = new Date(newLine[posZd.report_date]);
            newLine[posZd.report_date] = addMonths(oldReportDate, i);
            compute_money(newLine);
            // zdRows.push(newLine.join(','));
            zdRows.push(newLine);
        }

    }
}

function compute_money(line) {
    if(line[posZd.product]==undefined){
        error('数据错误',line);
    }
    var product = line[posZd.product].trim();
    if (!(product in interest)) {
        console.error('未知产品：' + product);
        console.log(product);
        console.log(line)
        process.exit(-1);
    }
    var rate = parseFloatStr(line[posZd.rate]);

    // for (i in interest[product]) {
    // }
    //出月润通以外每月的利息都会作为本次再次买入
    if (product != '月润通' && !(rate in interest[product])) {
        console.error('未知利润率：' + product + rate);
        console.log(product);
        console.log(line)
        console.log(interest[product])
        process.exit(-1);
    }
    var irate = interest[product][rate];

//报告期资产
    var lentDate = new Date(line[posZd.lent_date].trim());
    var d2 = new Date(line[posZd.report_end_date].trim());
    //计算投了多少个月了
    var months = diffMonths(d2, lentDate);

    // console.log(d2.format('yyyyMMdd'),d1.format('yyyyMMdd'));
    // console.log('months='+months);
    var rate = parseFloatStr(line[posZd.rate]);//12%
    var profit = line[posZd.lent_money] * rate / 12 * months;
    line[posZd.lent_money] = Number(line[posZd.lent_money]).toFixed(2);
    if(product=='月润通'){
        line[posZd.total_money]=line[posZd.lent_money];
    }else {
        line[posZd.total_money] = round(parseInt(line[posZd.lent_money]) + profit, 2).toFixed(2);
    }

//报告期新的收益
    var newProfit;
    switch (product) {
        case '年丰盈':
        case '单季丰':
        case '双季盈':
            newProfit = compute_nfy_month_profit(line[posZd.lent_money], irate, months);
            break;
        case '月润通':
            // /100/12
            newProfit = round(line[posZd.lent_money] * rate / 12).toFixed(2);
            break;
        default:
            error(`未知产品类型:${product}`);
    }
    line[posZd.profit] = newProfit;
}
//年丰盈月收益
function round(num, digits) {
    // return Number(Number(month_profit).toFixed(number));
    return Math.round(num * 100) / 100;
}
function compute_nfy_month_profit(lent_money, irate, months) {
    var totalProfit = 0.00;
    // print(lent_money)
    lent_money = parseFloatStr(lent_money);
    // error(lent_money)
    var month_profit = round(lent_money * irate / 100, 2);//一个月收益
    for (var i = 0; i < months; i++) {
        lent_money += month_profit;
        totalProfit = month_profit;
        month_profit = round(lent_money * irate / 100);
    }
    // Math.round(1.325*100)/100
    return round(totalProfit, 2).toFixed(2);
}

//收益表
function write_gains_csv() {
    var write_csv = require('./utils').write_csv;
    var d = new Date();
    // zdRows.unshift(zdHeaderLine);
    zdRows.unshift(zdHeader);
    var sy_file = '账单-' + d.format("yyMMdd");
    // write_csv(zdRows, sy_file);
    utils.writeXlsx(sy_file, zdRows);
    console.log("written to " + sy_file);

}
//债权表
function write_jq_csv(rows, headerLine) {
    // var write_csv = require('./utils').write_csv;
    var d = new Date();
    rows.unshift(headerLine);
    var jq_file = '既有债权列表-' + d.format("yyMMdd") + '.xlsx';
    // write_csv(rows, jq_file);
    utils.writeXlsx(jq_file, rows);
    console.log("written to " + jq_file);

}


function printHeader(lines) {
    var header = {};
    lines[0].split(',').forEach(function (v, idx) {
        // console.log(idx + ':"' + v + '",')
        header[idx] = (v.trim())
    });
    console.log("header:");
    for (i in header) {
        console.log(i + ":" + header[i]);
    }
}

function readCsvToLines(filename) {
    var bytes = fs.readFileSync(filename);
    var content = iconv.decode(bytes, 'gbk');
    var lines = content.split("\r\n");//客户名称
    return lines;
}
function test(call) {
    call();
    process.exit(1);
}

