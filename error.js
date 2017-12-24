

function compute_nfy_month_profit(lent_money, irate, months) {
    let nthMonthProfit = 0.00;
    // print(lent_money)
    lent_money = parseFloatStr(lent_money);
    // error(lent_money)
    let nextMonthProfit = round(lent_money * irate / 100);//一个月收益

    for (let i = 0; i < months; i++) {
        lent_money += nextMonthProfit;
        nthMonthProfit = nextMonthProfit;
        nextMonthProfit = round(lent_money * irate / 100);
    }
    // Math.round(1.325*100)/100
    return round(nthMonthProfit);
}


