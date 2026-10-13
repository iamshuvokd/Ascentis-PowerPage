param([string]$Directory = "$PSScriptRoot/build", [switch]$NewTablesOnly)
$ErrorActionPreference='Stop'
[xml]$xml=Get-Content (Join-Path $Directory 'customizations.xml') -Raw -Encoding UTF8
$model=Get-Content "$PSScriptRoot/schema/model.json" -Raw -Encoding UTF8 | ConvertFrom-Json
if ($NewTablesOnly) {
    $newTableKeys = @('appuser','consultanttabupdate','financialinformation','financialrevenueregion','legalinformation','biminformation','sustainabilityesg','officeleader','ratingscore','kamdriverrating','engagementcontact','country','ratingcriterion','kamdriver')
    $model.tables = @($model.tables | Where-Object { $_.key -in $newTableKeys })
    $model.relationships = @()
}
$entities=@($xml.ImportExportXml.Entities.Entity)
foreach($table in $model.tables) {
    $entity=@($entities | Where-Object { $_.EntityInfo.entity.GetAttribute('Name').ToLower() -eq $table.logicalName })
    if($entity.Count -ne 1){throw "Expected exactly one table $($table.logicalName)"}
    foreach($column in $table.columns | Where-Object type -ne 'file') {
        $attribute=$entity[0].EntityInfo.entity.attributes.SelectSingleNode("attribute[LogicalName='$($column.name)']")
        if(!$attribute){throw "Missing $($table.logicalName).$($column.name)"}
        if($column.type -eq 'uuid') {
            $relationship=@($xml.ImportExportXml.EntityRelationships.EntityRelationship | Where-Object { $_.ReferencingEntityName -eq $table.logicalName -and $_.ReferencingAttributeName -eq $column.name })
            if($relationship.Count -ne 1){throw "Missing/duplicate lookup relationship for $($column.name)"}
            if(!$relationship[0].RelationshipDescription -or !$relationship[0].EntityRelationshipRoles){throw "Incomplete relationship metadata for $($column.name)"}
        }
    }
}
foreach($expected in $model.relationships) {
    $relationship=@($xml.ImportExportXml.EntityRelationships.EntityRelationship | Where-Object { $_.GetAttribute('Name') -eq $expected.name })
    if($relationship.Count -ne 1 -or $relationship[0].EntityRelationshipType -ne 'ManyToMany'){throw "Missing/duplicate N:N $($expected.name)"}
    if(@($relationship[0].EntityRelationshipRoles.EntityRelationshipRole).Count -ne 2){throw "Missing relationship roles $($expected.name)"}
}
Write-Output "PASS: $($model.tables.Count) tables, mapped scalar/lookup columns and $($model.relationships.Count) N:N relationships present."
Write-Output 'Known omissions: File column, alternate keys, server business logic, security roles and portal permissions.'
