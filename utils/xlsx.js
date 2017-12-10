/**
 * Created by xueleixi on 2017/12/5.
 */



var xlsx = require('node-xlsx').default;
var fs = require('fs');

// Parse a file
// const workSheetsFromFile = xlsx.parse(`${__dirname}/../既有债权列表.xlsx`);
//
// let sheet1 = workSheetsFromFile[0]['data'];
// sheet1.forEach(function (v) {
//     console.log(v.length);
// });

// write a file
// const data = [[1, 2, 3], [true, false, null, 'sheetjs'], ['foo', 'bar', new Date('2014-02-19T14:30Z'), '0.3'], ['baz', null, 'qux','0007819']];
// var buffer = xlsx.build([{name: "mySheetName", data: data}]); // Returns a buffer
// fs.writeFileSync('1.xlsx',buffer);


const utils=require('./index');
var file='data/既有债权列表.xlsx';
var contents=utils.readXlsx(file);
console.log(contents);
