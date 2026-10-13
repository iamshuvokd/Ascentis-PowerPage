param(
    [string]$EnvironmentUrl = 'https://org84e19bfd.crm8.dynamics.com',
    [string]$PacPath = "$PSScriptRoot\pac-2.11.2\tools\pac.exe",
    [switch]$DescribeToken
)

$ErrorActionPreference = 'Stop'

$requestPath = Join-Path $PSScriptRoot 'schema\file-column.request.json'
$request = Get-Content -LiteralPath $requestPath -Raw -Encoding UTF8 | ConvertFrom-Json

$tokenOutput = & $PacPath auth token
if ($LASTEXITCODE -ne 0) {
    throw 'pac auth token failed.'
}

$tokenLine = @($tokenOutput | Where-Object { $_ -match '^Bearer\s+|eyJ' })[0]
$token = ($tokenLine -replace '^Bearer\s+', '').Trim()
if (!$token) {
    throw 'pac auth token returned no token.'
}

if ($DescribeToken) {
    $payloadSegment = $token.Split('.')[1]
    $payloadSegment = $payloadSegment.Replace('-', '+').Replace('_', '/')
    while ($payloadSegment.Length % 4) {
        $payloadSegment += '='
    }
    $payloadJson = [Text.Encoding]::UTF8.GetString([Convert]::FromBase64String($payloadSegment))
    $payload = $payloadJson | ConvertFrom-Json
    Write-Output "TOKEN: aud=$($payload.aud); appid=$($payload.appid); tid=$($payload.tid); scp=$($payload.scp); roles=$($payload.roles -join ',')"
    return
}

$headers = @{
    Authorization = "Bearer $token"
    Accept = 'application/json'
    'OData-MaxVersion' = '4.0'
    'OData-Version' = '4.0'
}

$metadataUrl = "$EnvironmentUrl/api/data/v9.2/EntityDefinitions(LogicalName='asc_attachment')/Attributes(LogicalName='asc_file')"

try {
    $existing = Invoke-RestMethod -Method Get -Uri $metadataUrl -Headers $headers
    Write-Output "EXISTS: asc_attachment.asc_file ($($existing.AttributeTypeName.Value), MaxSizeInKB=$($existing.MaxSizeInKB))"
    return
}
catch {
    $statusCode = $_.Exception.Response.StatusCode.value__
    if ($statusCode -ne 404) {
        throw
    }
}

$createHeaders = $headers.Clone()
$createHeaders['Content-Type'] = 'application/json; charset=utf-8'
$createHeaders['MSCRM.SolutionUniqueName'] = $request.headers.'MSCRM.SolutionUniqueName'

$createUrl = "$EnvironmentUrl$($request.path)"
$body = $request.body | ConvertTo-Json -Depth 20

Invoke-RestMethod -Method Post -Uri $createUrl -Headers $createHeaders -Body $body | Out-Null
Write-Output 'CREATED: asc_attachment.asc_file'
