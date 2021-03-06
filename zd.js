let fs = require('fs');
let path = require('path');
const utils = require('./utils');

const unzip = require('unzip');
const process = require('process');
const rd = require('rd');
const iconv = require('iconv-lite');
const error = utils.error;
const print = utils.print;
const cheerio = require('cheerio');
const unzipFile = utils.unzipFile;
const createDirIfNonExist = utils.createDirIfNonExist;
const replacePlaceHolders=utils.replacePlaceHolders;
const parseFloatStr = require('./utils').parseFloatStr;

let curDate = new Date();
//年丰盈五个月报告
let zd_file = '生成的excel'+path.sep+'账单-' + curDate.format("yyMMdd") + '.xlsx';
let jq_file = '生成的excel'+path.sep+'既有债权列表-' + curDate.format("yyMMdd") + '.xlsx';
let tpl_path = 'word_tpls';
let tpl_tmp_path = 'output';
let tpl_files;//模板文件数组

let companyNames = {
    '北京': 'bj',
    '上海': 'sh',
    '天下': 'tx',
    '润川行': 'rcx',
};

//账单字段位置
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
//债权字段位置
let posJq = {
    lent_code: '出借编号',//
    borrower: '借款人',//
    id_code: '借款人证件号',//
    certificate: '证书编号',//
    identity: '债务人情况',//债务人身份（企业法人）
    usage: '借款用途',//借款用途
    borrow_money: '初始受让债权价值',
    borrow_money2: '报告日持有债权价值（元）',
    repay_day: '还款起始日期',//还款起始日期
    repay_money: '本期还款金额',//本期还款金额
    repay_months: '还款期限（月）',//还款期限（月）
    remain_months: '剩余还款月数',//剩余还款月数
    rate: '预计债权收益率（年）',//预计债权收益率（年）

};
// let fieldLength = Object.keys(posZd).length;//账单csv列数
// let jqFieldLength = Object.keys(posJq).length;//债权csv列数

createDirIfNonExist(tpl_tmp_path);

/**
 * 年丰盈 map
 */
let gMap = {
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
        "RIDCODE": "客户身份证号",
    },
    part: {
        //收益信息
        "R1DATE": "",//报告日期
        "R1SHPAY": "",//报告期借款人应还款金额
        "R1SRMN": "",//受让债权金额 月润通为0
        "R1HSMN": "",//回收金额
        "R1BGRZC": "",//报告日资产总额
        "R1BGRSY": "",//报告日收益
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
            "R2_MTH": "还款期限",
            "R2_REM": "剩余还款月数",
            "R2_RATE": "利润率",
        }
    },
    zqzr: {//债权转让
        global: {
            "R3BORROWER_MONEY": "人民币数字",
            "R3BORROWER_MNYT": "人民币老写",
        },
        part: {
            "R3BORROWER1": "借款人",
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


let zdLines = utils.readXlsx(zd_file);
let jqLines = utils.readXlsx(jq_file);
// 去掉header
let zdHeader = zdLines.splice(0, 1)[0];
let jqHeaderFields = jqLines.splice(0, 1)[0];

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


let userBills = {};//code=>[],数组的长度就是账单的期数
let userJq = {};//code=>[]

//生成用户账单
convertUserBills();
//生成债权
convertUserJq();
// console.log(userJq);
// 对账单中的占位符进行替换
//异步变为同步操作
let lentCodes=Object.keys(userBills);//出借编号

for(let idx in lentCodes){
    makeOneBill(lentCodes[idx]);
}

function makeOneBill(code) {
    let rows = userBills[code];
    // console.log("-------" + rows[0][posZd.user]);

    let tplFile = `${tpl_path}/`;
    let product = rows[0][posZd.product].trim();
    let company = rows[0][posZd.company].trim();
    let enCompany=companyNames[company];
    if(enCompany==undefined){
        error(`未知公司：${company}`);
    }
    let needZqZr=true;//是否需要填写债权转让信息
    switch (product){
        case '年丰盈':
        case '单季丰':
        case '双季盈':
            let n = rows.length == 1 ? 1 : 2;
            tplFile+=`${n}_${enCompany}.docx`;
            break;
        case '月润通':
            tplFile +=`1_${enCompany}.docx`;//只有一页
            needZqZr=false;
            break;
        default:
            error(`未知产品类型:${product}`)
    }
    // print('模板文件：',tplFile);

    unzipFile(tplFile, tpl_tmp_path,rows, code, processData);

    function processData(docPath,rows, code)
    {
        console.log(code,'start');

        //防止多个协程处理，相互污染全局数据
        let map=JSON.parse(JSON.stringify(gMap));

        //异步处理，定义局部变量
        //修改内容
        let fileToModify = docPath + '/word/document.xml';
        let document = fs.readFileSync(fileToModify, 'utf8');
        //根据收益表修改内容
        let first = true;
        if (first) {
            //总信息，一个报告中只有一次
            map.global.RUSER = rows[0][posZd.user];
            map.global.RSEX = rows[0][posZd.sex];
            map.global.RRPT_BG_DATE = rows[rows.length - 1][posZd.report_start_date];
            map.global.RRPT_ED_DATE = rows[rows.length - 1][posZd.report_end_date];
            map.global.RRPT_DATE = rows[rows.length - 1][posZd.report_date];//报告日设置为最后一个报告日,作为当前的报告日
            map.global.RLT_CODE = code;
            map.global.RPODUCT = rows[0][posZd.product];
            map.global.RLT_BG_DATE = rows[0][posZd.lent_date];
            map.global.RLT_BG_MONEY = parseFloatStr(rows[0][posZd.lent_money]).formatMoney();
            map.global.RRPD_MONEY = parseFloatStr(rows[rows.length - 1][posZd.total_money]).formatMoney();//报告日资产
            let reportDate = new Date(map.global.RRPT_DATE);
            // console.log(map.global.RRPT_DATE);
            map.global.yyyy = reportDate.format('yyyy');
            map.global.mm = reportDate.format('MM');
            map.global.dd = reportDate.format('dd');
            //客户身份证号
            map.global.RIDCODE = rows[0][posZd.id_code];
            first = false;
            //替换
            for (let r1 in map.global) {
                let e = new RegExp(r1, 'g');//全局替换
                document = document.replace(e, map.global[r1]);
            }

        }
        const $ = cheerio.load(document, {xmlMode: true});
        //收益列表
        (function () {
            //收益表
            let tProfit = $('w\\:tbl').eq(1);
            //替换行
            let $replaceTr = tProfit.find('w\\:tr').eq(2);
            //替换收益行
            for (let j = 0; j < rows.length; j++) {
                map.part.R1DATE = rows[j][posZd.report_date];
                map.part.R1SHPAY = parseFloatStr(rows[j][posZd.profit]).formatMoney();
                if(product=='月润通'){
                    map.part.R1HSMN = parseFloatStr(rows[j][posZd.profit]).formatMoney();
                    map.part.R1SRMN = '0.00';
                }else {
                    map.part.R1SRMN = parseFloatStr(rows[j][posZd.profit]).formatMoney();
                    map.part.R1HSMN = '0.00';
                }
                map.part.R1BGRZC = parseFloatStr(rows[j][posZd.total_money]).formatMoney();
                map.part.R1BGRSY = map.part.R1SHPAY;
                let $trClone = $replaceTr.clone();
                let html = $trClone.html();
                // console.log($trClone.text());
                // console.log(map.part);
                let rHtml = replacePlaceHolders(html, map.part);
                $trClone.html(rHtml);
                tProfit.append($trClone);
            }
            $replaceTr.remove();
        })();

        //既有债权列表
        map.zq.global.R2_SUM1=0.00;
        map.zq.global.R2_SUM2=0.00;
        (function () {
            // 债权表
            let tZq = $('w\\:tbl').eq(2);
            let sumTr = tZq.find('w\\:tr').last();
            //替换行
            let $replaceTr = tZq.find('w\\:tr').eq(2);
            let jqRows = userJq[code];//当前账单的债权列表
            if (jqRows == undefined) {
                //首期没有债权 todo
                error(`账单${code}没有对应的债权`)
            }
            //替换债权行

            for (let j = 0; j < jqRows.length; j++) {
                map.zq.part.R2BORROWER = jqRows[j][posJq.borrower];
                map.zq.part.R2BORROWER_CODE = jqRows[j][posJq.id_code];
                map.zq.part.R2BORROWER_MONEY1 = jqRows[j][posJq.borrow_money];
                map.zq.part.R2BORROWER_MONEY2 = map.zq.part.R2BORROWER_MONEY1;
                map.zq.part.R2BORROWER_RPD = jqRows[j][posJq.repay_day];
                map.zq.part.R2BORROWER_RPM = jqRows[j][posJq.repay_money];
                map.zq.part.R2_MTH = jqRows[j][posJq.repay_months];
                map.zq.part.R2_REM = jqRows[j][posJq.remain_months];
                // error('rate',jqRows[j][posJq.rate],jqRows[j]);
                let pRate = jqRows[j][posJq.rate];
                if(typeof pRate=="string"){
                    pRate=pRate.replace('%','')/100;
                }
                map.zq.part.R2_RATE = Number(pRate * 100).toFixed(2) + '%';
                map.zq.global.R2_SUM1 += parseFloatStr(map.zq.part.R2BORROWER_MONEY2);

                map.zq.global.R2_SUM2 += parseFloatStr(map.zq.part.R2BORROWER_RPM);
                let $trClone = $replaceTr.clone();
                let html = $trClone.html();
                // console.log($trClone.text());
                // console.log(map.zq.part);
                let rHtml = replacePlaceHolders(html, map.zq.part);
                $trClone.html(rHtml);
                $trClone.insertBefore(sumTr);
                //债权转让信息
                if (needZqZr && j == jqRows.length - 1) {
                    //R2BORROWER_MONEY2
                    map.zqzr.global.R3BORROWER_MONEY = map.zq.part.R2BORROWER_MONEY2;
                    map.zqzr.global.R3BORROWER_MNYT = utils.smalltoBIG(Number((map.zq.part.R2BORROWER_MONEY2 + '').replace(',', '')));
                    // console.log("-------", map.zqzr.global.R3BORROWER_MONEY, map.zqzr.global.R3BORROWER_MNYT);

                    map.zqzr.part.R3BORROWER1 = map.zq.part.R2BORROWER;
                    map.zqzr.part.R3BORROWER_CODE = map.zq.part.R2BORROWER_CODE;
                    map.zqzr.part.R3BORROWER_MONEY = map.zq.part.R2BORROWER_MONEY1;
                    map.zqzr.part.R3BORROWER_CERTIFICATE = jqRows[j][posJq.certificate];
                    map.zqzr.part.R3BORROWER_IDENTITY = jqRows[j][posJq.identity];
                    map.zqzr.part.R3BORROWER_USE = jqRows[j][posJq.usage];
                    map.zqzr.part.R3BORROWER_RPD = map.zq.part.R2BORROWER_RPD;
                    map.zqzr.part.R3BORROWER_RPM = map.zq.part.R2_MTH;
                    map.zqzr.part.R3BORROWER_REM = map.zq.part.R2_REM;
                    map.zqzr.part.R3BORROWER_RATE = map.zq.part.R2_RATE;
                }
            }

            //计算汇总数据 global
            map.zq.global.R2_SUM1 = map.zq.global.R2_SUM1.formatMoney();
            map.zq.global.R2_SUM2 = map.zq.global.R2_SUM2.formatMoney();//转换成人民币表示形式
            $replaceTr.remove();
        })();

        //修改其他的汇总数据
        let html = $.html();
        html = html.replace(/R2_SUM1/, map.zq.global.R2_SUM1);
        html = html.replace(/R2_SUM2/, map.zq.global.R2_SUM2);
        console.log("====>",map.zq.global.R2_SUM1,map.zq.global.R2_SUM2);
        if(map.zq.global.R2_SUM1<1 || map.zq.global.R2_SUM2<1){
            error('汇总数据计算错误',map.zq.global);
        }
        //SN:序号替换
        for (let i = 0; i < rows.length; i++) {
            html = html.replace(/SN/, i + 1);
        }
        //修改债权转让
        if(needZqZr){
            for (let i in  map.zqzr.part) {
                let reg = new RegExp(i);
                html = html.replace(reg, map.zqzr.part[i]);
            }
            for (let j in  map.zqzr.global) {
                let reg = new RegExp(j, 'g');
                html = html.replace(reg, map.zqzr.global[j]);
            }
        }

        //修改document.xml
        fs.writeFileSync(fileToModify, html);

        //文件改好了，应该压缩成docx,然后删除目录继续下一个
        let tDate=new Date();
        tDate.setMonth(tDate.getMonth()-1);
        utils.makeDocx(docPath, rows[0][posZd.user] + rows[0][posZd.lent_code]+'-'+tDate.format("MM月账单") + ".docx");
        console.log(code,'end');

    }
}

//对账单原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
// function parseZdRow(row) {
//     row[posZd.lent_money] = parseFloatStr(row[posZd.lent_money]);
//     row[posJq.total_money] = parseFloatStr(row[posZd.rate]);
// }
//
// //对债券原始数据处理，把千分制数字转换为正常数字，把带%的小数转换成正常的小数
// function parseJqRow(row) {
//     row[posJq.borrow_money] = parseFloatStr(row[posJq.borrow_money]);
//     row[posJq.borrow_money2] = parseFloatStr(row[posJq.borrow_money2]);
//     row[posJq.repay_money] = parseFloatStr(row[posJq.repay_money]);
//     row[posJq.rate] = parseFloatStr(row[posJq.rate]);
// }

function convertUserBills() {
    for (let i = 0; i < zdLines.length; i++) {
        // let fields = lines[i].split(',');
        let fields = zdLines[i];
        //去掉多余空格
        fields.forEach(function (v, k) {
            if (v.trim) {
                fields[k] = v.trim()
            }
        });
        let code = fields[posZd.lent_code];//合同编号
        if (code in userBills) {

        } else {
            userBills[code] = [];
        }
        userBills[code].push(fields);

    }
}

function convertUserJq() {

    for (let i = 0; i < jqLines.length; i++) {
        // let fields = jqLines[i].split(',');
        let fields = jqLines[i];
        //去掉多余空格
        fields.forEach(function (v, k) {
            if (v.trim) {
                fields[k] = v.trim();
            }
        });
        let code = fields[posJq.lent_code];//合同编号
        if (code in userJq) {

        } else {
            userJq[code] = [];
        }
        userJq[code].push(fields);

    }
}
