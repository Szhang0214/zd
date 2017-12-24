/**
 * Created by xueleixi on 2017/12/24.
 * 把收益保存到db
 */

const dao = require('./utils/profitdb');
const db = dao.getDb();
require('./utils/index').extend_Date();
const utils = require('./utils/index');
let posZd=utils.posZd();



let curDate = new Date();
let fileName = '生成的excel/' + curDate.format('账单-yyMMdd') + '.xlsx';

let zdLines = utils.readXlsx(fileName);
let zdHeader=zdLines.splice(0,1)[0];
utils.updatePosZd(posZd,zdHeader);


db.serialize(function () {
    //
    // dao.getOne('11','12',function (row) {
    //     process.exit(-1);
    //
    // });

    zdLines.forEach(function (zdLine) {

        let date = zdLine[posZd.report_date];
        let month=date.substr(0,date.substr(0,date.length-3));

        dao.insertProfits([
            {
                lent_code: zdLine[posZd.lent_code],
                report_date: month,
                profit: zdLine[posZd.profit]
            }
        ]);
    });

    // dao.getAll(null,function (rows) {
    //     console.log(`共有 ${rows.length}条记录`);
    // });

    // dao.deleteAll(function () {
    //     console.log(arguments);
    //     dao.getAll(null, function (rows) {
    //         console.log(`删除后，还剩${rows.length}`)
    //     });
    // });
});






