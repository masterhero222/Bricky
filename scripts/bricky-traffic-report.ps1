[CmdletBinding()]
param(
    [string]$Server = "root@94.72.143.22"
)

$ErrorActionPreference = "Stop"
$Host.UI.RawUI.WindowTitle = "Bricky Traffic Report"

function Read-ReportPeriod {
    Write-Host ""
    Write-Host "BRICKY.BG - TRAFFIC REPORT" -ForegroundColor Cyan
    Write-Host "1. Today"
    Write-Host "2. Yesterday"
    Write-Host "3. Last 7 days"
    Write-Host "4. Last 30 days"
    Write-Host "5. Custom number of days"
    Write-Host ""

    $choice = (Read-Host "Choose 1-5").Trim()
    $utcToday = (Get-Date).ToUniversalTime().Date

    switch ($choice) {
        "1" { return @{ From = $utcToday; To = $utcToday.AddDays(1); Label = "today" } }
        "2" { return @{ From = $utcToday.AddDays(-1); To = $utcToday; Label = "yesterday" } }
        "3" { return @{ From = $utcToday.AddDays(-6); To = $utcToday.AddDays(1); Label = "last-7-days" } }
        "4" { return @{ From = $utcToday.AddDays(-29); To = $utcToday.AddDays(1); Label = "last-30-days" } }
        "5" {
            $daysText = (Read-Host "Number of days (1-90)").Trim()
            $days = 0
            if (-not [int]::TryParse($daysText, [ref]$days) -or $days -lt 1 -or $days -gt 90) {
                throw "The number of days must be between 1 and 90."
            }
            return @{ From = $utcToday.AddDays(-($days - 1)); To = $utcToday.AddDays(1); Label = "last-$days-days" }
        }
        default { throw "Invalid choice." }
    }
}

function Test-PublicIp {
    param([string]$Address)

    $parsed = $null
    if (-not [System.Net.IPAddress]::TryParse($Address, [ref]$parsed)) { return $false }
    if ($parsed.AddressFamily -ne [System.Net.Sockets.AddressFamily]::InterNetwork) { return $false }

    $bytes = $parsed.GetAddressBytes()
    if ($bytes[0] -eq 10 -or $bytes[0] -eq 127) { return $false }
    if ($bytes[0] -eq 192 -and $bytes[1] -eq 168) { return $false }
    if ($bytes[0] -eq 172 -and $bytes[1] -ge 16 -and $bytes[1] -le 31) { return $false }
    if ($bytes[0] -eq 169 -and $bytes[1] -eq 254) { return $false }
    return $true
}

function Get-GeoCache {
    param([string]$Path)

    if (-not (Test-Path -LiteralPath $Path)) { return @{} }
    try {
        $stored = Get-Content -LiteralPath $Path -Raw | ConvertFrom-Json
        $cache = @{}
        foreach ($property in $stored.PSObject.Properties) {
            $cache[$property.Name] = $property.Value
        }
        return $cache
    }
    catch {
        return @{}
    }
}

function Resolve-VisitorLocation {
    param(
        [string]$Ip,
        [hashtable]$Cache
    )

    if ($Cache.ContainsKey($Ip)) { return $Cache[$Ip] }
    if (-not (Test-PublicIp -Address $Ip)) {
        $Cache[$Ip] = [pscustomobject]@{ Country = "Local/server"; City = "-"; Isp = "-" }
        return $Cache[$Ip]
    }

    try {
        $response = Invoke-RestMethod -Uri "https://ipwho.is/$Ip" -TimeoutSec 8
        if ($response.success -eq $false) { throw $response.message }
        $Cache[$Ip] = [pscustomobject]@{
            Country = if ($response.country) { [string]$response.country } else { "Unknown" }
            City = if ($response.city) { [string]$response.city } else { "Unknown" }
            Isp = if ($response.connection.isp) { [string]$response.connection.isp } else { "Unknown" }
        }
    }
    catch {
        $Cache[$Ip] = [pscustomobject]@{ Country = "Lookup unavailable"; City = "-"; Isp = "-" }
    }
    return $Cache[$Ip]
}

$period = Read-ReportPeriod
$fromUtc = [datetime]$period.From
$toUtc = [datetime]$period.To

Write-Host ""
Write-Host "Connecting to $Server. Enter the SSH password when prompted..." -ForegroundColor Yellow
$remoteCommand = "zcat -f /var/log/nginx/access.log* 2>/dev/null"
$rawLines = & ssh -o ConnectTimeout=10 $Server $remoteCommand
if ($LASTEXITCODE -ne 0) { throw "Could not read the NGINX access logs over SSH." }

$logPattern = '^(?<ip>\S+) \S+ \S+ \[(?<date>[^\]]+)\] "(?<method>\S+) (?<url>\S+) [^"]+" (?<status>\d{3}) \S+ "(?<referrer>[^"]*)" "(?<agent>[^"]*)"'
$botPattern = '(?i)bot|crawler|spider|slurp|headless|preview|facebookexternalhit|bingpreview|curl|wget|python|go-http-client|uptime|monitor'
$scannerPathPattern = '(?i)(\.php|\.env|\.git|wp-|wordpress|xmlrpc|cgi-bin|server-status|actuator|vendor/|ReportServer|HNAP1|boaform|solr|login\.action)'
$staticPattern = '(?i)^/(api/|assets/|uploads/|src/media_files/|vite\.svg|favicon\.|robots\.txt|sitemap\.xml|llms\.txt)|\.(css|js|map|png|jpe?g|gif|webp|svg|ico|woff2?|ttf|json|mp4|webm)(\?|$)'
$applicationPagePattern = '(?i)^/$|^/(about|blog(?:/[^/?]+)?|reset-password|repair-map|client/profile|worker/(?:login|register|profile|[^/?]+)|workers(?:/[^/?]+)?|worker-preview|requests|admin|auth(?:/(?:login|register|verify-email))?)(?:\?|$)'
$events = [System.Collections.Generic.List[object]]::new()

foreach ($line in $rawLines) {
    $match = [regex]::Match($line, $logPattern)
    if (-not $match.Success) { continue }

    try {
        $timestamp = [datetimeoffset]::ParseExact(
            $match.Groups["date"].Value,
            "dd/MMM/yyyy:HH:mm:ss zzz",
            [Globalization.CultureInfo]::InvariantCulture
        ).UtcDateTime
    }
    catch { continue }

    if ($timestamp -lt $fromUtc -or $timestamp -ge $toUtc) { continue }
    $status = [int]$match.Groups["status"].Value
    $method = $match.Groups["method"].Value
    $url = $match.Groups["url"].Value
    $agent = $match.Groups["agent"].Value

    if ($method -notin @("GET", "HEAD") -or $status -lt 200 -or $status -ge 400) { continue }

    $events.Add([pscustomobject]@{
        Ip = $match.Groups["ip"].Value
        TimestampUtc = $timestamp
        Url = $url
        Referrer = $match.Groups["referrer"].Value
        Agent = $agent
        IsBot = $agent -match $botPattern -or $url -match $scannerPathPattern
        IsPage = $url -notmatch $staticPattern -and $url -match $applicationPagePattern
    })
}

$humanPageViews = @($events | Where-Object { -not $_.IsBot -and $_.IsPage })
$botRequests = @($events | Where-Object IsBot)
$uniqueIps = @($humanPageViews | Select-Object -ExpandProperty Ip -Unique)

Write-Host ""
Write-Host "PERIOD (UTC): $($fromUtc.ToString('yyyy-MM-dd')) to $($toUtc.AddSeconds(-1).ToString('yyyy-MM-dd HH:mm'))" -ForegroundColor Cyan
Write-Host "Estimated unique visitors: $($uniqueIps.Count)" -ForegroundColor Green
Write-Host "Human page views:          $($humanPageViews.Count)"
Write-Host "Filtered bot requests:     $($botRequests.Count)"
Write-Host "All successful requests:   $($events.Count)"
Write-Host ""
Write-Host "Note: unique IP is an estimate. Several people may share one IP, and one person may use several IPs." -ForegroundColor DarkGray

$cacheDirectory = Join-Path $env:LOCALAPPDATA "Bricky"
$cachePath = Join-Path $cacheDirectory "traffic-geo-cache.json"
New-Item -ItemType Directory -Path $cacheDirectory -Force | Out-Null
$geoCache = Get-GeoCache -Path $cachePath

$visitorRows = [System.Collections.Generic.List[object]]::new()
$topVisitorGroups = @($humanPageViews | Group-Object Ip | Sort-Object Count -Descending)
$lookupLimit = [Math]::Min(50, $topVisitorGroups.Count)

if ($lookupLimit -gt 0) {
    Write-Host ""
    Write-Host "Resolving locations for up to $lookupLimit visitor IPs..." -ForegroundColor Yellow
}

foreach ($group in $topVisitorGroups) {
    $location = if ($visitorRows.Count -lt $lookupLimit) {
        Resolve-VisitorLocation -Ip $group.Name -Cache $geoCache
    }
    else {
        [pscustomobject]@{ Country = "Not resolved"; City = "-"; Isp = "-" }
    }

    $first = ($group.Group | Sort-Object TimestampUtc | Select-Object -First 1).TimestampUtc
    $last = ($group.Group | Sort-Object TimestampUtc -Descending | Select-Object -First 1).TimestampUtc
    $visitorRows.Add([pscustomobject]@{
        Ip = $group.Name
        Country = $location.Country
        City = $location.City
        PageViews = $group.Count
        FirstVisitUtc = $first.ToString("yyyy-MM-dd HH:mm:ss")
        LastVisitUtc = $last.ToString("yyyy-MM-dd HH:mm:ss")
        Isp = $location.Isp
    })
}

$geoCache | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath $cachePath -Encoding UTF8

Write-Host ""
Write-Host "TOP COUNTRIES" -ForegroundColor Cyan
$visitorRows | Where-Object { $_.Country -ne "Not resolved" } | Group-Object Country | Sort-Object Count -Descending |
    Select-Object -First 15 @{Name = "Country"; Expression = { $_.Name }}, @{Name = "Visitors"; Expression = { $_.Count }} |
    Format-Table -AutoSize

Write-Host "TOP CITIES" -ForegroundColor Cyan
$visitorRows | Where-Object { $_.City -notin @("-", "Unknown") } | Group-Object City, Country | Sort-Object Count -Descending |
    Select-Object -First 15 @{Name = "Location"; Expression = { $_.Name }}, @{Name = "Visitors"; Expression = { $_.Count }} |
    Format-Table -AutoSize

Write-Host "TOP PAGES" -ForegroundColor Cyan
$humanPageViews | ForEach-Object { ($_.Url -split '\?')[0] } | Group-Object | Sort-Object Count -Descending |
    Select-Object -First 15 @{Name = "Page"; Expression = { $_.Name }}, @{Name = "Views"; Expression = { $_.Count }} |
    Format-Table -AutoSize

Write-Host "TRAFFIC SOURCES" -ForegroundColor Cyan
$humanPageViews | ForEach-Object {
    if ([string]::IsNullOrWhiteSpace($_.Referrer) -or $_.Referrer -eq "-") { "Direct / unknown" }
    else {
        try { ([uri]$_.Referrer).Host }
        catch { $_.Referrer }
    }
} | Group-Object | Sort-Object Count -Descending |
    Select-Object -First 15 @{Name = "Source"; Expression = { $_.Name }}, @{Name = "PageViews"; Expression = { $_.Count }} |
    Format-Table -AutoSize

$desktop = [Environment]::GetFolderPath("Desktop")
$stamp = Get-Date -Format "yyyyMMdd-HHmmss"
$csvPath = Join-Path $desktop "bricky-visitors-$($period.Label)-$stamp.csv"
$visitorRows | Export-Csv -LiteralPath $csvPath -NoTypeInformation -Encoding UTF8

Write-Host "Detailed visitor report saved to:" -ForegroundColor Green
Write-Host $csvPath
