/**
 * Created by xueleixi on 2017/11/29.
 * 年丰盈自动填充数据
 *
 */
var fs = require('fs');
var iconv = require('iconv-lite');
var zdFile = 'data/账单原始数据.xlsx';
var jqFile = "data/既有债权列表.xlsx";
var outFile = "账单-yyyymmdd.csv";
var process = require('process');
let utils = require('./utils');
utils.extend_Date();

var zdLines = utils.readXlsx(zdFile);//账单数据
//
// console.log(zdLines.forEach(function (v) {
//     console.log(v.join(','));
// }));
// process.exit(-1)
// printHeader(lines);

/**
 * 账单
 */
//第一行是表头
let zdHeader = zdLines.splice(0, 1)[0];
var zdHeaderLine = zdHeader.join(',');
// //删除空行
// lines.forEach(function (line, idx) {
//     if (line.trim() == '') {
//         lines.splice(idx, 1);
//     }
// });
var curDate = new Date();

var gRows = [];
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
    company:'公司',
    report_start_date: 1,//自动生成
    report_end_date: 2,//自动生成
    report_date: 3,//自动生成
    total_money: 4,//自动生成
    profit: 5,//自动生成
};
//债权字段位置
var posJq = {
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

(function updatePosZd() {
    let idx = 0;
    for (let i in posZd) {
        if (typeof posZd[i] == "number") {
            posZd[i] = idx;
        } else {
            posZd[i] = zdHeader.indexOf(posZd[i]);
        }
        idx += 1;
    }
})();

// console.log(zdHeader)
print('poszd', posZd);
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
};

compute_gains();
console.log(gRows);
process.exit(-1);

check_zq_data();
write_gains_csv();

//检查债权列表数据
function check_zq_data() {
    // console.log(gRows);

    var jqLines = readCsvToLines(jqFile);
    var jqRows = [];
    // printHeader(jqLines);
    var jqHeader = jqLines.splice(0, 1);
    // console.log(jqLines);
    var jqFieldCnt = 0;
    for (var i in posJq) {
        jqFieldCnt++;
    }
    // console.log("jq fields:"+jqFieldCnt);
    var code_last = -1;//出借编号
    var jqDict = {//以出借编号位key,每出借信息数组为value

    };//key:code val:[]
    jqLines.forEach(function (line, idx) {
        var fields = line.split(',');
        if (fields.length != jqFieldCnt) {
            console.error('债权列表数据列数不对:' + line);
        }
        fields.forEach(function (v, idx) {
            fields[idx] = v.trim();//每个字段去掉空格
        });

        if (!(fields[posJq.lent_code] in jqDict)) {
            jqDict[fields[posJq.lent_code]] = [];
        }
        jqDict[fields[posJq.lent_code]].push(fields);

        jqRows.push(fields);
    });
    //修改债权数据  todo
    // 本期还款金额	还款期限（月）	剩余还款月数
    // 475	12	8
    // 4.51	4	2
    for (var code in jqDict) {
        var rows = jqDict[code];
        var newRow = [];//==最后一行
        for (var j = 0; i < jqFieldCnt; j++) {
            newRow[j] = '';
        }
        newRow[posJq.lent_code] = rows[0][posJq.lent_code];
        newRow[posJq.rate] = rows[0][posJq.rate];
        var profits = 0.00;
        rows.forEach(function (row) {
            //还款期限-1
            row[posJq.remain_months] = row[posJq.remain_months] - 1;
            profits += parseFloat(row[posJq.repay_money]);
        });
        newRow[posJq.borrow_money] = round(profits, 2);//本期应还款金额
        rows.push(newRow);
    }
    //生成新的债权数据
    jqRows = [];
    for (var i in jqDict) {
        jqRows = jqRows.concat(jqDict[i].map(function (v) {
            return v.join(',');
        }));
    }
    write_jq_csv(jqRows, jqHeader);
    console.log("-- 新的债权列表 --")
    console.log(jqRows);
}

function diffMonths(curDate, lentDate) {
    return (curDate.getYear() - lentDate.getYear()) * 12 + curDate.getMonth() - lentDate.getMonth();
}
function addMonths(oldDate,months) {
    var reportEndDate=new Date(oldDate);
    let months2=months+oldDate.getMonth();
    if(months2 >= 12){
        reportEndDate.setMonth(months2-12);
        reportEndDate.setYear(oldDate.getYear()+1);
    }else {
        reportEndDate.setMonth(months2);//报告日
    }
    return reportEndDate.format('yyyy.MM.dd');
}
function compute_gains() {
    // var curDate=new Date(curDate);
    // var curMonth = curDate.getMonth() + 1;
    for (var i = 0; i < zdLines.length; i++) {
        // 初始出借金额的货币形式ie."50,000.00"包含分隔符'，',要进行转换
        // var line = zdLines[i].trim().replace(/\"(\d+)\,(\d+)\.00\"/, '$1$2').split(',');
        // line.forEach(function (v, k) {
        //     line[k] = v.trim();
        // });
        let line = zdLines[i];
        var lentDate = new Date(line[posZd.lent_date]);
        var reportDate=new Date(lentDate);
        //计算报告日、报告开始日、报告结束日
        if (lentDate.getDate() <= 15) {
            reportDate.setDate(15);
        } else {
            if (lentDate.getMonth()+1  == 2) {
                reportDate.setDate(28);
            } else {
                reportDate.setDate(30);
            }
        }
        line[posZd.report_date] = addMonths(reportDate,1);
        // 报告开始日期
        line[posZd.report_start_date] = lentDate.format('yyyy.MM.dd');
        //报告结束日期
        line[posZd.report_end_date] =addMonths(lentDate,1);


        compute_money(line);
        //当前用户 账单需要几个月的收益信息
        var months = diffMonths(curDate, lentDate);
        gRows.push(line.join(','));
        //生成每个月的数据
        var period = 0;
        switch (line[posZd.product]) {
            case '年丰盈':
                period = 12;
                break;
            case '月润通':
                //todo
                break;
            default:
                period = 0;
        }



        for (var i = 1; i < period - 1 && i < months; i++) {
            var newLine = line.slice();//生成每一期的数据
            var oldDate = new Date(newLine[posZd.report_start_date]);
            // 月数增加
            newLine[posZd.report_start_date] = addMonths(oldDate,i);
            newLine[posZd.report_end_date] = addMonths(oldDate,i+1);

            var oldReportDate = new Date(newLine[posZd.report_date]);
            newLine[posZd.report_date] = addMonths(oldReportDate,i);
            compute_money(newLine);
            gRows.push(newLine.join(','));
        }

    }
}

function compute_money(line) {
    var product = line[posZd.product];
    if (!(product in interest)) {
        console.error('未知产品：' + product);
        console.log(product);
        console.log(line)
        process.exit(-1);
    }
    var rate = parseFloat(line[posZd.rate]);

    for (i in interest[product]) {
    }
    if (!(rate in interest[product])) {
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
    var months = diffMonths(d2,lentDate);

    // console.log(d2.format('yyyyMMdd'),d1.format('yyyyMMdd'));
    // console.log('months='+months);
    var rate = parseFloat(line[posZd.rate]);//12%
    var profit = line[posZd.lent_money] * rate / 12 * months;
    line[posZd.total_money] = parseInt(line[posZd.lent_money]) + profit;

//报告期新的收益
    var newProfit = compute_month_profit(line[posZd.lent_money], line[posZd.rate], irate, months);
    line[posZd.profit] = newProfit;
}
//年丰盈月收益
function round(month_profit, number) {
    number = number || 2;
    return Number(Number(month_profit).toFixed(number));
}
function compute_month_profit(lent_money, rate, irate, months) {
    var total = 0.00;
    rate = parseFloat(rate);//'12%'
    lent_money = parseFloat(lent_money);
    var month_profit = round(lent_money * rate * irate / 12 * 1, 2);//一个月收益
    for (var i = 0; i < months; i++) {
        total += month_profit;
        month_profit = round(month_profit * rate * irate / 12 * 1);
        // console.log(month_profit)//当新的月收益为几块钱时，生成的新收益四舍五入后为0
    }
    return round(total, 2).toFixed(2);
}

//收益表
function write_gains_csv() {
    var write_csv = require('./utils').write_csv;
    var d = new Date();
    gRows.unshift(zdHeaderLine);
    var sy_file = '账单-' + d.format("yyMMdd") + '.csv';
    write_csv(gRows, sy_file);
    console.log("written to " + sy_file);

}
//债权表
function write_jq_csv(rows, headerLine) {
    var write_csv = require('./utils').write_csv;
    var d = new Date();
    rows.unshift(headerLine);
    var jq_file = '既有债权列表-' + d.format("yyMMdd") + '.csv';
    write_csv(rows, jq_file);
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

function print(msg1, msg2) {
    console.log(msg1);
    console.log(msg2);
    console.log('')
}