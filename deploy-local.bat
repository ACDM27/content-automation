@echo off
echo ========================================
echo   快速部署脚本
echo ========================================

cd /d %~dp0

echo.
echo [1] 打包项目...
powershell -Command "Compress-Archive -Path 'minimax-deploy\*' -DestinationPath 'project.zip' -Force"

echo.
echo [2] 项目已打包为 project.zip
echo.
echo 请执行以下步骤：
echo.
echo   1. 访问云服务器控制台
echo   2. 上传 project.zip 到服务器
echo   3. 在服务器上执行：
echo      unzip -o project.zip -d /project
echo      cd /project/minimax-deploy
echo      docker-compose up -d
echo.
echo 或使用 WinSCP：
echo   主机: 36.103.236.162
echo   用户名: root
echo   密码: @hk06751705127AB
echo.
pause
