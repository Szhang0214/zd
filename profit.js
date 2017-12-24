let fs = require('fs');
let iconv = require('iconv-lite');
let zdFile = 'data/账单初始数据.xlsx';
let jqFile = "data/既有债权列表.xlsx";
let outFile = "账单-yyyymmdd.csv";
let process = require('process');
const utils = require('./utils');
const error = utils.error;
const print = utils.print;
const MyDate = require('./utils').MyDate;
const parseFloatStr = require('./utils').parseFloatStr;
const removeEmptyLines=require('./utils').removeEmptyLines;
const updatePosZd=require('./utils').updatePosZd;
utils.extend_Date();

//账单字段位置
let posZd = require('./utils').posZd();;
let zdRawLines = utils.readXlsx(zdFile);//账单数据

let zdLines = removeEmptyLines(zdRawLines);
print("请检查账单有效行数：" + zdLines.length);


/**
 * 账单
 */
//第一行是表头
let zdHeader = zdLines.splice(0, 1)[0];
// console.log(zdHeader);
let zdHeaderLine = zdHeader.join(',');
// //删除空行
// lines.forEach(function (line, idx) {
//     if (line.trim() == '') {
//         lines.splice(idx, 1);
//     }
// });
let curDate = new Date();

let zdRows = [];//账单数据
let zdDict = {};// 'lent_code'=>[info],

updatePosZd(posZd,zdHeader);

//债权字段位置
let posJq = {
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
    // let jqLines = readCsvToLines(jqFile);
    let jqRawLines = utils.readXlsx(jqFile);
    let jqLines = removeEmptyLines(jqRawLines);
    print("请检查债权有效行数:" + jqLines.length);
    let jqRows = [];
    // printHeader(jqLines);
    let jqHeaderFields = jqLines.splice(0, 1)[0];
    // let jqHeader = jqHeaderFields.join(',');
    let jqHeader = jqHeaderFields;
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
    let jqFieldCnt = 0;
    for (let i in posJq) {
        jqFieldCnt++;
    }
    // console.log("jq fields:"+jqFieldCnt);
    let code_last = -1;//出借编号
    let jqDict = {//以出借编号位key,每出借信息数组为value

    };//key:code val:[]
    // print('jqLines',jqLines);
    jqLines.forEach(function (line, idx) {
        // let fields = line.split(',');
        let fields = line;
        if (fields.length < 10) {
            print('债权列表数据列数不对',fields.length+'!='+jqFieldCnt,line)
            return;
        } else if (fields.length < jqFieldCnt) {
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

    //修改债权数据
    // 本期还款金额	还款期限（月）	剩余还款月数
    // 475	12	8
    // 4.51	4	2
    for (let code in jqDict) {
        let rows = jqDict[code];

        let zdInfo = zdDict[code];
        if (zdInfo == undefined) {
            error("缺少出借编号对应的账单数据，编号为:" + code)
        }
        let product = zdInfo[posZd.product];
        if (product == undefined) {
            error(`账单数据中的产品类型未知：`, zdDict);
        }
        //借款到期，把钱转入下一个人
        let fulfilled_ids = [];
        let fulfilledRows = [];
        rows.forEach(function (row, idx) {
            //还款期限-1
            let remain_months = row[posJq.remain_months] - 1;
            if (remain_months == 0) {
                fulfilled_ids.push(idx);
            } else {
                row[posJq.remain_months] = remain_months;
            }
            parseJqRow(row);
        });

        for (let i = 0; i < fulfilled_ids.length; i++) {
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

        let newRow = [];//年丰盈 新增记录
        for (let j = 0; j < jqFieldCnt; j++) {
            newRow[j] = '';
        }
        newRow[posJq.lent_code] = rows[0][posJq.lent_code];
        let eRate = rows[0][posJq.rate];
        if (typeof eRate == 'string' && eRate.indexOf('%') > 0) {
            newRow[posJq.rate] = eRate;
        } else {//小数表示形式
            newRow[posJq.rate] = (rows[0][posJq.rate] * 100).formatMoney() + '%';
        }
        let profits = 0.00;
        let deadlineMoney = 0.00;
        // rows.forEach(function (row) {
        //     profits += parseFloatStr(row[posJq.repay_money]);
        // });

        let interest2 = interest[product][parseFloatStr(zdInfo[posZd.rate])];
        let m=diffMonths(new Date(),new Date(zdInfo[posZd.lent_date].trim()))-1;

        profits=compute_nfy_month_profit(zdInfo[posZd.lent_money],interest2,m);
        //加上借款到期的钱 删除到期数据
        for (let i = 0; i < fulfilled_ids.length; i++) {
            // profits += fulfilledRows[i][posJq.repay_money];
            deadlineMoney += fulfilledRows[i][posJq.borrow_money];
            // error('b:'+deadlineMoney);
            rows.splice(fulfilled_ids[i], 1);
        }

        let borrowMoneyNumber = round(profits + deadlineMoney, 2);
        newRow[posJq.borrow_money] = borrowMoneyNumber;//初始受让债权价值
        newRow[posJq.borrow_money2] = newRow[posJq.borrow_money];//初始受让债权价值

        // print(newRow[posJq.borrow_money],irate,1);

        newRow[posJq.repay_money] = compute_nfy_month_profit(borrowMoneyNumber, interest2, 1);//本期应还款金额
        newRow[posJq.identity] = '企业法人';
        newRow[posJq.usage] = '资金周转';
        rows.push(newRow);
        rows.forEach(function (row) {
            formatJqRow(row)
        });
    }
    //生成新的债权数据
    jqRows = [];
    for (let i in jqDict) {
        jqRows = jqRows.concat(jqDict[i].map(function (v) {
            // return v.join(',');
            return v;
        }));
    }
    // 首期账单添加债权数据()
    Object.keys(zdDict).forEach(function (lent_code) {
        if(!(lent_code in jqDict)){
            console.log("首期账单,出借编号为："+lent_code);
            let zdInfo = zdDict[lent_code];

            let newRow=[];
            for (let i in posJq){
                newRow[posJq[i]]='';
            }
            newRow[posJq.lent_code]=lent_code;
            newRow[posJq.identity] = '企业法人';
            newRow[posJq.usage] = '资金周转';
            newRow[posJq.borrow_money]=newRow[posJq.borrow_money2] = zdInfo[posZd.lent_money];
            newRow[posJq.rate] = zdInfo[posZd.rate];
            let product = zdInfo[posZd.product];
            let repayMoney;
            switch (product) {
                case '年丰盈':
                case '单季丰':
                case '双季盈':
                    let irate = interest[zdInfo[product]][parseFloatStr(zdInfo[posZd.rate])];
                    repayMoney = compute_nfy_month_profit(newRow[posZd.lent_money], irate, 1);
                    break;
                case '月润通':
                    // /100/12
                    repayMoney = round(parseFloatStr(zdInfo[posZd.lent_money]) * parseFloatStr(zdInfo[posZd.rate]) / 12);
                    break;
                default:
                    error(`未知产品类型:${product}`);
            }
            newRow[posJq.repay_money] = repayMoney;
            formatJqRow(newRow);
            jqRows.push(newRow);
        }
    });

    write_jq_csv(jqRows, jqHeader);
    // console.log("-- 新的债权列表 --")
    // console.log(jqRows);
}

//对债券原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
function parseJqRow(row) {
    row[posJq.borrow_money] = parseFloatStr(row[posJq.borrow_money]);
    row[posJq.borrow_money2] = parseFloatStr(row[posJq.borrow_money2]);
    row[posJq.repay_money] = parseFloatStr(row[posJq.repay_money]);
    row[posJq.rate] = parseFloatStr(row[posJq.rate]);
}

//把数字、利率转换陈word表示形式(千分制、%)
function formatJqRow(row) {
    row[posJq.borrow_money] = parseFloatStr(row[posJq.borrow_money]).formatMoney();
    row[posJq.borrow_money2] = parseFloatStr(row[posJq.borrow_money2]).formatMoney();
    row[posJq.repay_money] = parseFloatStr(row[posJq.repay_money]).formatMoney();
    row[posJq.rate] = (parseFloatStr(row[posJq.rate]) * 100).toFixed(2) + '%';
}

//把数字、利率转换陈word表示形式(千分制、%)
function formatZdRow(row) {
    row[posZd.lent_money] = parseFloatStr(row[posZd.lent_money]).formatMoney();
    row[posZd.total_money] = parseFloatStr(row[posZd.total_money]).formatMoney();
    row[posZd.profit] = parseFloatStr(row[posZd.profit]).formatMoney();
    row[posZd.rate] = (parseFloatStr(row[posZd.rate]) * 100).toFixed(2) + '%';
}

//对账单原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
function parseZdRow(row) {
    row[posZd.lent_money] = parseFloatStr(row[posZd.lent_money]);
    row[posJq.rate] = parseFloatStr(row[posZd.rate]);
}

function diffMonths(curDate, lentDate) {
    return (curDate.getYear() - lentDate.getYear()) * 12 + curDate.getMonth() - lentDate.getMonth();
}

function addMonths(oldDate, months) {
    let input = "--" + oldDate.getFullYear() + "-" + oldDate.getMonth() + "-" + months + "-" + oldDate.getDate();
    let reportEndDate = new MyDate(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    let dateStr = reportEndDate.format('yyyy.MM.dd');
    return dateStr;
}

function addMonths1(oldDate, months) {
    let input = "--" + oldDate.getFullYear() + "-" + oldDate.getMonth() + "-" + months + "-" + oldDate.getDate();
    let reportEndDate = new MyDate(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    let dateStr = reportEndDate.format('yyyy.MM.dd');
    return dateStr;
}
function addMonths2(oldDate, months) {
    let input = "--" + oldDate.getFullYear() + "-" + oldDate.getMonth() + "-" + months + "-" + oldDate.getDate();
    let reportEndDate = new MyDate(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    let dateStr = reportEndDate.format('yyyy.MM.dd');
    return dateStr;
}
function addMonths3(oldDate, months) {
    let input = "--" + oldDate.getFullYear() + "-" + oldDate.getMonth() + "-" + months + "-" + oldDate.getDate();
    let reportEndDate = new MyDate(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    let dateStr = reportEndDate.format('yyyy.MM.dd');
    return dateStr;
}

function addMonths4(oldDate, months) {
    let input = "--" + oldDate.getFullYear() + "-" + oldDate.getMonth() + "-" + months + "-" + oldDate.getDate();
    let reportEndDate = new MyDate(oldDate.getFullYear(), oldDate.getMonth(), oldDate.getDate());
    let months2 = months + oldDate.getMonth();
    if (months2 >= 12) {
        reportEndDate.setMonth(months2 - 12);
        reportEndDate.setFullYear(oldDate.getFullYear() + 1);
    } else {
        reportEndDate.setMonth(months2);//报告日
    }
    let dateStr = reportEndDate.format('yyyy.MM.dd');
    // console.log(input+"==>最终报告日期4:"+dateStr);
    return dateStr;
}
function compute_gains() {
    for (let i1 = 0; i1 < zdLines.length; i1++) {
        let line = zdLines[i1];
        parseZdRow(line);

        zdDict[line[posZd.lent_code]] = line;

        let lentDate = new Date(line[posZd.lent_date]);
        let reportDate = new Date(lentDate);
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
        // console.log("----"+'出借日期:'+line[posZd.lent_date]+'报告日期:'+reportDate.format('yyyy-MM-dd'));

        line[posZd.report_date] = addMonths4(reportDate, 1);
        // 报告开始日期
        line[posZd.report_start_date] = lentDate.format('yyyy.MM.dd');
        //报告结束日期
        line[posZd.report_end_date] = addMonths3(lentDate, 1);


        compute_money(line);
        //当前用户 账单需要几个月的收益信息
        let months = diffMonths(curDate, lentDate);
        // zdRows.push(line.join(','));
        zdRows.push(line);
        //生成每个月的数据
        let period = 0;
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


        for (let i = 1; i < period - 1 && i < months; i++) {
            let newLine = line.slice();//生成每一期的数据
            parseZdRow(newLine);
            let oldDate = new MyDate(newLine[posZd.report_start_date].split(/[./]/));
            // 月数增加
            newLine[posZd.report_start_date] = addMonths2(oldDate, i);
            newLine[posZd.report_end_date] = addMonths1(oldDate, i + 1);

            let oldReportDate = new MyDate(newLine[posZd.report_date].split(/[./]/));
            // oldReportDate.setMonth(oldReportDate.getMonth()-1);//仿照Date
            newLine[posZd.report_date] = addMonths(oldReportDate, i);
            compute_money(newLine);
            // zdRows.push(newLine.join(','));
            zdRows.push(newLine);
        }

        formatZdRow(line)
    }
}

/**
 * 计算账单的数据：借款人应还款金额,受让金额，实际收益
 * @param line
 */
function compute_money(line) {
    if (line[posZd.product] == undefined) {
        error('数据错误', line);
    }
    let product = line[posZd.product].trim();
    if (!(product in interest)) {
        console.error('未知产品：' + product);
        console.log(product);
        console.log(line)
        process.exit(-1);
    }
    let rate = parseFloatStr(line[posZd.rate]);
    //出月润通以外每月的利息都会作为本次再次买入
    if (product != '月润通' && !(rate in interest[product])) {
        console.error('未知利润率：' + product + rate);
        console.log(product);
        console.log(line)
        console.log(interest[product]);
        process.exit(-1);
    }
    let irate = interest[product][rate];

//报告期资产
    let lentDate = new Date(line[posZd.lent_date].trim());
    let endDate = new Date(line[posZd.report_end_date].trim());
    //计算投了多少个月了
    let months = diffMonths(endDate, lentDate);

    let rate1 = parseFloatStr(line[posZd.rate]);//12%
    let profit = round(line[posZd.lent_money] * rate1 / 12 * months,2);
    // line[posZd.lent_money] = Number(line[posZd.lent_money]).toFixed(2);
    if (product == '月润通') {
        line[posZd.total_money] = line[posZd.lent_money];
    } else {
        line[posZd.total_money] = line[posZd.lent_money]+ profit;
    }

//报告期新的收益
    let newProfit;
    switch (product) {
        case '年丰盈':
        case '单季丰':
        case '双季盈':
            newProfit = compute_nfy_month_profit(line[posZd.lent_money], irate, months);
            break;
        case '月润通':
            // /100/12
            newProfit = round(line[posZd.lent_money] * rate / 12);
            break;
        default:
            error(`未知产品类型:${product}`);
    }
    line[posZd.profit] = newProfit;

    formatZdRow(line);
}
//把number或者number字符串进行四舍五入，保留digits小数位,返回number
function round(num, digits) {
    digits = digits || 2;
    return Math.round(num * Math.pow(10,digits)) / (Math.pow(10,digits));
}
//同round,返回字符串
function roundStr(num, digits) {
   return ""+round(num,digits);
}
//计算非月润通收益
function compute_nfy_month_profit(lent_money, irate, months) {
    let nthMonthProfit = 0.00;
    // print(lent_money)
    lent_money = parseFloatStr(lent_money);
    // error(lent_money)
    let nextMonthProfit = round(lent_money * irate / 100);//一个月收益

    for (let i = 0; i < months; i++) {
        nthMonthProfit += nextMonthProfit;
        nextMonthProfit = round(nthMonthProfit * irate / 100);
    }
    return round(nthMonthProfit);
}

//收益表
function write_gains_csv() {
    let write_csv = require('./utils').write_csv;
    let d = new Date();
    // zdRows.unshift(zdHeaderLine);
    zdRows.unshift(zdHeader);
    let sy_file = '账单-' + d.format("yyMMdd");
    // write_csv(zdRows, sy_file);
    utils.writeXlsx(sy_file, zdRows);
    console.log("written to " + sy_file);

}
//债权表
function write_jq_csv(rows, headerLine) {
    // let write_csv = require('./utils').write_csv;
    let d = new Date();
    rows.unshift(headerLine);
    let jq_file = '既有债权列表-' + d.format("yyMMdd") + '.xlsx';
    // write_csv(rows, jq_file);
    utils.writeXlsx(jq_file, rows);
    console.log("written to " + jq_file);

}






