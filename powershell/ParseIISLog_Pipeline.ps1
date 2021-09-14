#Clear-Host
$location = 'D:\Logs\IISLogs\W3SVC16______\'
$file = $location + 'u_ex' + [DateTime]::Today.AddDays(-1).ToString('yyMMdd') + '.log' 
#$file = 'C:\root\W3SVC16______\u_ex191210.log'

if(!(Test-Path $file)) {exit 1}

$hdr = @{
    "date" = 0
    "s-computername" = 0
    "cs-method" = 0
    "cs(Referer)" = 0
    "sc-status" = 0
    "cs-uri-stem" = 0
    "cs-username" = 0
}

filter SplitAndHeader {
    $a = ($_ -split " ")
    if ($_ -match "^#F") {
        $i = -1
        $a | ForEach-Object {
            if ($hdr.ContainsKey($_)) {
                $hdr[$_] = $i
            }
            $i++
        }
    } else {
        $o = [PSCustomObject]@{
            "Date" = $a[$hdr["date"]]
            "Computer" = $a[$hdr["s-computername"]]
            "Uri" = $a[$hdr["cs-uri-stem"]]
            "Method" =  $a[$hdr["cs-method"]]
            "User" =  $a[$hdr["cs-username"]]
            "Referer" = $a[$hdr["cs(Referer)"]]
            "Status" = $a[$hdr["sc-status"]]
        }
        $o
    }
}

function InsertHits
{
    [CmdletBinding()]
    Param
    (
        [Parameter(ValueFromPipeline)]
        [System.Object]$obj
    )

    Begin
    {
        $dataSource= 'WIN-7H3DMP63MKP' #"SPSQL"
        $database = 'RSHB_Traffic'
        $connectionString = "Server=$dataSource;Integrated Security=SSPI;Database=$database"

        $connection = New-Object System.Data.SqlClient.SqlConnection
        $connection.ConnectionString = $connectionString
        $connection.Open()
        $command = $connection.CreateCommand()
        $command.CommandType = [System.Data.CommandType]::Text
    }
    Process
    {
        $hits = $obj.Count
        $uri = $obj.Name
        $date = $obj.Group[0].Date
        $comp = $obj.Group[0].Computer

        $query = "INSERT INTO [dbo].[IISlogFromDefPage] `
            ([date],[uri],[comp],[hits]) `
                VALUES `
            ('$date',N'$uri','$comp',$hits)"

        $command.CommandText = $query
        $command.ExecuteNonQuery()
    }
    End
    {
        $connection.Dispose()
    }
}

#$date = @{label="Date";expression={$_[$hdr["date"]]}}
#$name = @{label="ComputerName";expression={$_[$hdr["s-computername"]]}}
#$uri = @{label="Uri";expression={$_[$hdr["cs-uri-stem"]]}}

$watch = [System.Diagnostics.Stopwatch]::StartNew()
$watch.Start()

Get-Content $file -Encoding UTF8 |
    Where-Object {$_ -notmatch "^#[D,S,V]"} |
    SplitAndHeader |
    Where-Object {
        $_.Method -eq 'GET' -and `
        $_.User -ne '-' -and `
        $_.User -ne 'system\account' -and `
        $_.Status -eq '200' -and `
        $_.Referer -eq 'https://portal1/page.aspx' -and `
        $_.Uri -notmatch '(.jpg|.css|.svc|.js|.png|.gif|.ico|.eot|.svg|.ashx|.woff)'
    } |
    Select-Object Date,Computer,Uri,User |
    Group-Object -Property Uri |
    InsertHits | Out-Null


$watch.Stop()
Write-Output $watch.Elapsed