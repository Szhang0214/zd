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


var rd=require('rd');

files=rd.readFileSync('word_tpls/');
console.log(files);