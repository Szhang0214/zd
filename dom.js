/**
 * Created by xueleixi on 2017/12/5.
 */

var fs=require('fs');
var process=require('process');
var xmlFile='nfy_2/word/document.xml';

const cheerio = require('cheerio');
const $ = cheerio.load(fs.readFileSync(xmlFile,'utf-8'),{ xmlMode: true});

// console.log($.html())
console.log($('w\\:tbl').length);
//收益表
var tProfit = $('w\\:tbl').eq(1);
// 债权表
var tZq = $('w\\:tbl').eq(2);

// console.log(tProfit.text());

//收益表增加一行
// w:tr

var month;
var $replaceTr;
month=1;

// R1DATE    R1DATE
// R1应还款金额 R1SHPAY
// R1受让金额   R1SRMN
// R1回收金额   R1HSMN
// R1报告日资产 R1BGRZC
// R1报告日收益 R1BGRSY




function replaceProfitLine(html) {
    html = html.replace('R1BGRSY', '收益');
    html = html.replace('R1DATE', 'XXXDATE');
    html = html.replace('R1HSMN', '回收金额');
    html = html.replace('R1BGRZC', '资产');
    return html;
}

//替换行
$replaceTr=tProfit.find('w\\:tr').eq(2);
//替换收益行
for(var j=0;j<month;j++){
    $trClone=$replaceTr.clone();
    var html=$trClone.html();
    var rHtml=replaceProfitLine(html);
    // console.log($(rHtml).text());
    $trClone.html(rHtml);
    // console.log($trClone.text());
    tProfit.append($trClone);
}

$replaceTr.remove();
// console.log(tProfit.text().trim());
// console.log($.html());

fs.writeFileSync(xmlFile,$.html());



