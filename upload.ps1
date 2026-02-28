# PowerShell 上传脚本
# 将此脚本保存为 upload.ps1 并执行

$Host = "36.103.236.162"
$User = "root"
$Password = "@hk06751705127AB"
$LocalPath = "D:\opencode-workspace\minimax-deploy"
$RemotePath = "/project"

# 创建凭据
$SecurePassword = ConvertTo-SecureString $Password -AsPlainText -Force
$Credential = New-Object System.Management.Automation.PSCredential($User, $SecurePassword)

# 使用 Session 选项
$SessionOption = New-PSSessionOption -SkipCACheck -SkipCNCheck -SkipRevocationCheck

# 建立远程会话
Write-Host "正在连接 $Host ..."
$Session = New-PSSession -ComputerName $Host -Credential $Credential -SessionOption $SessionOption -ErrorAction Stop

Write-Host "已连接！正在创建远程目录..."
Invoke-Command -Session $Session -ScriptBlock {
    param($path)
    if (!(Test-Path $path)) {
        New-Item -ItemType Directory -Path $path -Force
    }
} -ArgumentList $RemotePath

Write-Host "正在上传文件..."

# 复制文件
Copy-Item -Path "$LocalPath\*" -Destination $RemotePath -Recurse -ToSession $Session

Write-Host "上传完成！"

# 查看结果
$Result = Invoke-Command -Session $Session -ScriptBlock {
    param($path)
    Get-ChildItem $ Select-Object Name,path | Mode
} -ArgumentList $RemotePath

Write-Host ""
Write-Host "远程目录内容："
$Result

# 关闭会话
Remove-PSSession $Session
