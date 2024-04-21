@echo off
setlocal
chcp 65001

:: 接收参数
set COMMAND=%1

:: 安全性提醒
echo 此脚本将使用 PowerShell 来下载和解压文件。

:: 检测 PowerShell 是否可用
powershell -command "exit" >nul 2>&1
if %errorlevel% neq 0 (
    echo PowerShell 不可用，请确保你的系统支持 PowerShell。
    exit /b 1
)

set NODE_VERSION=v20.11.0
set NODE_DIR=node_%NODE_VERSION%
set PROJECT_ZIP_URL=https://github.com/MortarHQ/Mortar-Daemon/archive/refs/heads/master.zip
set PROJECT_DIR=Mortar-Daemon-master
set NODE_UNZIP_DIR=node-%NODE_VERSION%-win-x64

:: 检测当前目录是否拥有指定版本的 Node.js
if not exist "%NODE_DIR%" (
    echo Node.js %NODE_VERSION% 未在当前目录找到，正在使用 PowerShell 下载...
    mkdir "%NODE_DIR%"
    cd "%NODE_DIR%"
    powershell -command "Invoke-WebRequest -Uri https://nodejs.org/dist/%NODE_VERSION%/%NODE_UNZIP_DIR%.zip -OutFile %NODE_UNZIP_DIR%.zip"
    powershell -command "Expand-Archive -Path %NODE_UNZIP_DIR%.zip -DestinationPath ."

    cd %NODE_UNZIP_DIR%
    cd ..
    echo Node.js %NODE_VERSION% 安装完成。
) else (
    echo 使用当前目录下的 Node.js %NODE_VERSION%。
)

set NODE_DIR=%CD%\%NODE_DIR%\%NODE_UNZIP_DIR%
echo Node.js目录：%NODE_DIR%
set PATH=%NODE_DIR%;%PATH%

if not exist "%PROJECT_DIR%" (
    echo 使用 PowerShell 下载项目文件...
    powershell -command "Invoke-WebRequest -Uri %PROJECT_ZIP_URL% -OutFile project.zip"
    powershell -command "Expand-Archive -Path project.zip -DestinationPath ."
    echo 项目文件下载并解压完成。
) else (
    echo 项目目录已存在。
)

cd "%PROJECT_DIR%"

echo 使用 Node.js %NODE_VERSION% 安装依赖...
call npm install
if errorlevel 1 (
    echo 安装依赖失败，尝试重新安装...
    call npm install
)

echo ==================================================
if "%COMMAND%"=="start" (
    echo 尝试启动项目...
    call npm start
    if errorlevel 1 (
        echo 启动失败，尝试重新安装依赖...
        call npm install
        call npm start
    )
) else if "%COMMAND%"=="dev" (
    echo 尝试以开发模式启动项目...
    call npm run dev
    if errorlevel 1 (
        echo 启动失败，尝试重新安装依赖...
        call npm install
        call npm run dev
    )
) else (
    echo 安装完成！
    echo.
    echo 启动指令
    echo		生产模式，请运行：install.bat start
    echo		开发模式，请运行：install.bat dev
    echo.
)
echo ==================================================

echo 脚本运行完成，即将退出……
pause
