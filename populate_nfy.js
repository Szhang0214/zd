/**
 * Created by xueleixi on 2017/11/29.
 * 年丰盈自动填充数据
 *
 */
var fs = require('fs');
var iconv = require('iconv-lite');
var file = 'bills.csv';
var process = require('process');

var bytes = fs.readFileSync(file);
var content = iconv.decode(bytes, 'gbk');
var lines = content.split("\r\n");//客户名称
var header = {};

extractHeader(lines);
printHeader(lines);
extend_Date();
// process.exit(1);

//第一行是表头 第二行是占位符
var headerLine=lines.splice(0, 1);
var replaceCharLine=lines.splice(0, 1);

lines.forEach(function (line, idx) {
    if (line.trim() == '') {
        lines.splice(idx, 1);
    }
});
console.log(lines)

var gRows = [];
var pos_lent_money = 6;//初始出借金额
var pos_rate = 4;//利润率
var pos_report_end_date = 8;//报告周期（结束时间）
var pos_lent_date = 5;//初始出借日期
var pos_total_money = 10;//报告日资产总量
var pos_product = 3;
var pos_report_start_date = 7;
var pos_report_date = 9;


function compute_total_money(line) {
    var d1 = new Date(line[pos_lent_date].trim());
    var d2 = new Date(line[pos_report_end_date].trim());
    //计算投了多少个月了
    var months = d2.getYear() * 12 + d2.getMonth() - d1.getYear() * 12 - d1.getMonth();
    var rate = parseFloat(line[pos_rate]) / 100;//12%
    var profit = line[pos_lent_money] * rate / 12 * months;
    line[pos_total_money] = parseInt(line[pos_lent_money]) + profit;
    // return {m1: m1, m2: m2, rate: rate};
}

for (var i = 0; i < lines.length; i++) {
    var line = lines[i].split(',');
    line.forEach(function (v, k) {
        line[k] = v.trim();
    })
    compute_total_money(line);
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
    for (var i = 1; i < period - 1; i++) {
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
        compute_total_money(newLine);
        gRows.push(newLine.join(','));
    }

}

console.log("--- 收益 ---")
console.log(gRows);
//
write_gains_csv();



//收益表
function write_gains_csv() {
    write_csv = require('./utils').write_csv;
    var d = new Date();
    gRows.unshift(headerLine);
    write_csv(gRows, '收益-' + d.getTime() + '.csv');
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

