const process = require('process');
const sqlite3 = require('sqlite3').verbose();

let dbFile = 'data/db';
let db = null;

function getDb() {
    if (db == null) {
        db = new sqlite3.Database(dbFile, dbError('数据库打开失败'));
        createProfitTable();
    }
    return db;
}


function createProfitTable() {
    let db = getDb();
    db.serialize(function () {
        db.run("create table if not exists profit(lent_code varchar(20),report_date char(10),profit varchar(15),primary key(lent_code,report_date))",
            function (err) {
                if (err) {
                    console.error('建表失败');
                }
            });
    }, function (err) {
        if (!err) {
            console.error(err);
        } else {
            db.close();
        }
    });
}

/**
 * 插入一个出借编号对应的每期账单的收益（会删除掉旧数据）
 * @param profitDictArray
 */
function insertProfits(profitDictArray,callback) {
    if(profitDictArray.length==0){
        return;
    }
    let db = getDb();
    db.serialize(function () {
        profitDictArray.forEach(function (profitDict) {
            let lentCode = profitDict['lent_code'];
            let reportDate = profitDict['report_date'];
            let profit = profitDict['profit'];
            let reportMonth=reportDate.substr(0,reportDate.length-3);
            console.log(reportMonth)
            db.run(`delete from profit where lent_code='${lentCode}' and report_date='${reportMonth}' `, dbError('删除旧数据失败'));
            db.run(`insert into profit values('${lentCode}','${reportMonth}','${profit}')`, dbError('插入新数据失败'));
        });
    });
}

function dbError(msg) {
    return function (err) {
        if (err) {
            console.error(msg);
            console.error(err);
            process.exit(-1);
        }
    }
}

function getAll(lentCode, callback) {
    let db = getDb();
    let sql ;
    if(lentCode){
        sql= `select * from profit where lent_code='${lentCode}'`
    }else {
        sql="select * from profit";
    }

    db.all(sql, function (err, rows) {
        if (!err) {
            callback(rows)
        }
        else {
            console.error('查询失败');
            console.error(err);
            process.exit(-1);
        }
    });
}

function getOne(lentCode, reportDate, callback) {
    let db = getDb();
    db.get(`select * from profit where lent_code='${lentCode}' and report_date='${reportDate}' `, function (err, row) {
        if (err) {
            console.error('查询失败:');
            console.error(err);
            process.exit(-1);
        }
        else {
            callback(row);
        }
    });
}

function deleteAll(callback) {
    db.run("delete from profit",function () {
        callback && callback(arguments);
    });
}

module.exports = {
    createProfitTable,
    insertProfits,
    getOne,
    getAll,
    getDb,
    deleteAll,
};

