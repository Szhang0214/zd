@echo off
cls
title 商务小工具
:menu
cls
color 0A
echo.
echo       ==============================
echo        请选择要进行的操作，然后按回车
echo       ==============================
echo.
echo        1.根据账单初始数据生成本月账单，修改既有债权数据
echo.
echo        2.根据本月账单和既有债权列表，制作账单
echo.
echo        3.保存收益（还款金额）
echo.
echo        Q.退出
echo.
echo.
:cho
set choice=
set /p choice=          请选择:
IF NOT "%choice%"=="" SET choice=%choice:~0,1%
if /i "%choice%"=="1" goto profit
if /i "%choice%"=="2" goto zd
if /i "%choice%"=="3" goto saveProfit
if /i "%choice%"=="Q" goto endd
echo 选择无效，请重新输入
echo.
goto cho

:profit
node profit.js
goto cho

:zd
node zd.js
goto cho

:saveProfit
node saveProfit.js
goto cho



