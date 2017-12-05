/**
 * Created by xueleixi on 2017/11/29.
 * 年丰盈自动填充数据
 *
 */
var fs = require('fs');
var iconv = require('iconv-lite');
var file = '账单原始数据.csv';
var process = require('process');
require('./utils').extend_Date()


var bytes = fs.readFileSync(file);
var content = iconv.decode(bytes, 'gbk');
var lines = content.split("\r\n");//客户名称
var header = {};

function test(call) {
    call();
    process.exit(1);
}

extractHeader(lines);

//第一行是表头 第二行是占位符
var headerLine=lines.splice(0, 1);

lines.forEach(function (line, idx) {
    if (line.trim() == '') {
        lines.splice(idx, 1);
    }
});
console.log(lines)

var gRows = [];
var pos_user=0;
var pos_sex=1;
var pos_code=2;
var pos_product = 3;
var pos_rate = 4;//利润率
var pos_lent_date = 5;//初始出借日期
var pos_lent_money = 6;//初始出借金额
var pos_report_start_date = 7;
var pos_report_end_date = 8;//报告周期（结束时间）
var pos_report_date = 9;//报告日期
var pos_total_money = 10;//报告日资产总量
var pos_profit=11;

var interest={
    '年丰盈':{
        //应还款
        '8%':0.644,
        '9%':0.721,
        '10%':0.8,
        '11%':0.874,
        "12%":0.95,
        "13%":1.024,
        "14%":1.1,
        "15%":1.172
    },
};

for (var i = 0; i < lines.length; i++) {
    //初始出借金额的货币形式ie."50,000.00"包含分隔符'，',要进行转换
    var line = lines[i].trim().replace(/\"(\d+)\,(\d+)\.00\"/,'$1$2').split(',');
    line.forEach(function (v, k) {
        line[k] = v.trim();
    });
    compute_money(line);
    var date_report_begin=new Date(line[pos_lent_date]);
    var curDate = new Date();
    //当前用户 账单需要几个月的收益信息
    var month_diff= (curDate.getYear()-date_report_begin.getYear())*12+curDate.getMonth()-date_report_begin.getMonth();
    gRows.push(line.join(','));
    //生成每个月的数据
    var period = 0;
    switch (line[pos_product]) {
        case '年丰盈':
            period = 12;
            break;
        case '月润通':
            //todo
            break;
        default:
            period = 0;
    }
    //第一个月的已经有了
    for (var i = 1; i < period - 1 && i<month_diff; i++) {
        var newLine = line.slice();//数组复制
        var oldDate = new Date(newLine[pos_report_start_date]);
        // 月数增加
        oldDate.setMonth(oldDate.getMonth() + i);
        newLine[pos_report_start_date] = oldDate.format('yyyy.MM.dd');
        oldDate.setMonth(oldDate.getMonth() + 1);
        newLine[pos_report_end_date] = oldDate.format('yyyy.MM.dd');

        var oldReportDate = new Date(newLine[pos_report_date]);
        oldReportDate.setMonth(oldReportDate.getMonth() + i);
        newLine[pos_report_date] = oldReportDate.format("yyyy.MM.dd");
        compute_money(newLine);
        gRows.push(newLine.join(','));
    }

}

console.log("--- 收益 ---")
//
write_gains_csv();



function compute_money(line) {
    var product=line[pos_product];
    if(!(product in interest)){
        console.error('未知产品：'+product);
        process.exit(-1);
    }
    var rate=line[pos_rate];
    if (!(rate in interest[product])){
        console.error('未知利润率：'+product+rate);
        process.exit(-1);
    }
    var irate=interest[product][rate];
//报告期资产
    var d1 = new Date(line[pos_lent_date].trim());
    var d2 = new Date(line[pos_report_end_date].trim());
    //计算投了多少个月了
    var months = d2.getYear() * 12 + d2.getMonth() - d1.getYear() * 12 - d1.getMonth();
    // console.log(d2.format('yyyyMMdd'),d1.format('yyyyMMdd'));
    // console.log('months='+months);
    var rate = parseFloat(line[pos_rate]) / 100;//12%
    var profit = line[pos_lent_money] * rate / 12 * months;
    line[pos_total_money] = parseInt(line[pos_lent_money]) + profit;
//报告期新的收益


    var newProfit=compute_month_profit(line[pos_lent_money],line[pos_rate],irate,months);
    line[pos_profit]=newProfit;
}
//年丰盈月收益
function round(month_profit,number) {
    number=number||2;
    return Number(Number(month_profit).toFixed(number));
}
function compute_month_profit(lent_money, rate, irate, months) {
    var total=0.00;
    rate=parseFloat(rate)/100;//'12%'
    lent_money=parseFloat(lent_money);
    var month_profit=round(lent_money*rate*irate/12*1,2);//一个月收益
    for(var i=0;i<months;i++){
        total+=month_profit;
        month_profit=round(month_profit*rate*irate/12*1);
        // console.log(month_profit)//当新的月收益为几块钱时，生成的新收益四舍五入后为0
    }
    return round(total,2).toFixed(2);
}

//收益表
function write_gains_csv() {
    write_csv = require('./utils').write_csv;
    var d = new Date();
    gRows.unshift(headerLine);
    var sy_file = '收益-' + d.format("yyMMdd") + '.csv';
    write_csv(gRows, sy_file);
    console.log("written to "+sy_file);

}


function extractHeader(lines) {
    lines[0].split(',').forEach(function (v, idx) {
        // console.log(idx + ':"' + v + '",')
        header[idx] = (v.trim())
    });
}
function printHeader(lines) {
    console.log("header:");
    for (i in header){
        console.log(i+":"+header[i]);
    }
}



