@echo off
cls
title ����С����
:menu
cls
color 0A
echo.
echo       ==============================
echo        ��ѡ��Ҫ���еĲ�����Ȼ�󰴻س�
echo       ==============================
echo.
echo        1.�����˵���ʼ�������ɱ����˵����޸ļ���ծȨ����
echo.
echo        2.���ݱ����˵��ͼ���ծȨ�б������˵�
echo.
echo        3.�������棨�����
echo.
echo        Q.�˳�
echo.
echo.
:cho
set choice=
set /p choice=          ��ѡ��:
IF NOT "%choice%"=="" SET choice=%choice:~0,1%
if /i "%choice%"=="1" goto profit
if /i "%choice%"=="2" goto zd
if /i "%choice%"=="3" goto saveProfit
if /i "%choice%"=="Q" goto endd
echo ѡ����Ч������������
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



