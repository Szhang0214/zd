/**
 * Created by xueleixi on 2017/11/30.
 */


var util=require('./utils');

//测试写csv文件
// util.write_csv(["中国","美国"],'./1.csv');

// util.deleteAll('unzip/output/151203961059');

// lines=['1','2','\r\n','4','5','\r\n'];
//
// lines.splice(0, 2);
// lines.forEach(function (line,idx) {
//     if (line.trim()==''){
//         lines.splice(idx,1);
//     }
// });
//
// console.log(lines)

str="R用户，R性别，您好\r\nR用户，R性别，您好";
map={
    "R用户":"张三",
    "R性别":"女士",
    "R报告开始日期":"2017.06.28",
    "R报告结束日期":"2017.07.28",
    "R报告日期":"2017.07.30",
    "R出借编号":"000987",
    "R产品类型":"年丰盈",
    "R初始出借日期":"2017.02.28",
    "R初始出借金额":"50,000.00",
    //收益信息
    "R报告日期1":"",
    "R应还款金额1":"",
    "R受让债权金额1":"",
    "R回收金额1":"",
    "R报告日资产1":"",
    "R报告日收益1":"",
    
    "R报告日期2":"",
    "R应还款金额2":"",
    "R受让债权金额2":"",
    "R回收金额2":"",
    "R报告日资产2":"",
    "R报告日收益2":"",

    "R报告日期3":"",
    "R应还款金额3":"",
    "R受让债权金额3":"",
    "R回收金额3":"",
    "R报告日资产3":"",
    "R报告日收益3":"",

    "R报告日期4":"",
    "R应还款金额4":"",
    "R受让债权金额4":"",
    "R回收金额4":"",
    "R报告日资产4":"",
    "R报告日收益4":"",

    "R报告日期5":"",
    "R应还款金额5":"",
    "R受让债权金额5":"",
    "R回收金额5":"",
    "R报告日资产5":"",
    "R报告日收益5":"",

    "R报告日期6":"",
    "R应还款金额6":"",
    "R受让债权金额6":"",
    "R回收金额6":"",
    "R报告日资产6":"",
    "R报告日收益6":"",

    "R报告日期7":"",
    "R应还款金额7":"",
    "R受让债权金额7":"",
    "R回收金额7":"",
    "R报告日资产7":"",
    "R报告日收益7":"",

    "R报告日期8":"",
    "R应还款金额8":"",
    "R受让债权金额8":"",
    "R回收金额8":"",
    "R报告日资产8":"",
    "R报告日收益8":"",

    "R报告日期9":"",
    "R应还款金额9":"",
    "R受让债权金额9":"",
    "R回收金额9":"",
    "R报告日资产9":"",
    "R报告日收益9":"",

    "R报告日期10":"",
    "R应还款金额10":"",
    "R受让债权金额10":"",
    "R回收金额10":"",
    "R报告日资产10":"",
    "R报告日收益10":"",

    "R报告日期11":"",
    "R应还款金额11":"",
    "R受让债权金额11":"",
    "R回收金额11":"",
    "R报告日资产11":"",
    "R报告日收益11":"",


};
for (i in map){
    var e=new RegExp(i,'g');
    str=str.replace(e,map[i]);
}
console.log(str);