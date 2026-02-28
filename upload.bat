@echo off
echo ========================================
echo   上传项目到云服务器
echo ========================================
echo.

set HOST=36.103.236.162
set USER=root
set PASSWORD=@hk06751705127AB
set LOCAL_PATH=%~dp0minimax-deploy
set REMOTE_PATH=/project

echo 正在上传 %LOCAL_PATH% 到 %HOST%:%REMOTE_PATH%
echo.

rem 使用 scp 上传 (需要安装 sshpass 或使用其他方式)
scp -r -P 22 %LOCAL_PATH%\* %USER%@%HOST%:%REMOTE_PATH%/

echo.
echo 上传完成！
pause
