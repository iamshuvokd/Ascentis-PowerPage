param([string]$OutputDirectory = "$PSScriptRoot/build", [switch]$NewTablesOnly, [string[]]$OnlyKeys)
$ErrorActionPreference = 'Stop'
[xml]$custom = Get-Content "$PSScriptRoot/snapshots/before/customizations.xml" -Raw -Encoding UTF8
[xml]$solution = Get-Content "$PSScriptRoot/snapshots/before/solution.xml" -Raw -Encoding UTF8
$model = Get-Content "$PSScriptRoot/schema/model.json" -Raw -Encoding UTF8 | ConvertFrom-Json
# Stable node references via XPath - the dynamic .Entities / .RootComponents property returns a
# [string] (InnerText) instead of the element once it has zero Entity/RootComponent children, so
# every later access goes through these variables rather than re-querying the dynamic property.
$entitiesNode = $custom.SelectSingleNode('//Entities')
$rootComponentsNode = $solution.SelectSingleNode('//SolutionManifest/RootComponents')
$entityRelationshipsNode = $custom.SelectSingleNode('//EntityRelationships')
if ($NewTablesOnly -or $OnlyKeys) {
    # This baseline snapshot (snapshots/before/customizations.xml) predates the 17 custom tables
    # already deployed on 10 Sept 2026, so the full model rebuilds them from scratch and strips
    # their FormXml/SavedQueries/RibbonDiffXml - safe for a first-time create, not safe to
    # re-import onto tables that already have real live forms/views. Restrict to an explicit
    # table-key list (-OnlyKeys), or the default 14 tables added on 16 Sept 2026 (-NewTablesOnly,
    # none introduce new N:N relationships) so already-live tables are never re-declared or
    # touched by this package.
    $newTableKeys = if ($OnlyKeys) { $OnlyKeys } else { @('appuser','consultanttabupdate','financialinformation','financialrevenueregion','legalinformation','biminformation','sustainabilityesg','officeleader','ratingscore','kamdriverrating','engagementcontact','country','ratingcriterion','kamdriver') }
    $model.tables = @($model.tables | Where-Object { $_.key -in $newTableKeys })
    $model.relationships = @()
    if ($model.tables.Count -ne $newTableKeys.Count) { throw "Expected $($newTableKeys.Count) tables ($($newTableKeys -join ', ')), found $($model.tables.Count) - check the key spelling or schema/model.json." }
}
$template = $entitiesNode.Entity[0].CloneNode($true)
if ($NewTablesOnly -or $OnlyKeys) {
    # The baseline snapshot itself faithfully carries the 8 original reference tables (real
    # export, not reconstructed), so importing it as-is would be low-risk on its own merits -
    # but to make this package unambiguously touch nothing except the selected tables, strip
    # those carried-over reference-table entities and their RootComponent entries entirely.
    foreach ($entity in @($entitiesNode.Entity)) { [void]$entitiesNode.RemoveChild($entity) }
    foreach ($rc in @($rootComponentsNode.RootComponent)) { [void]$rootComponentsNode.RemoveChild($rc) }
}
function Set-Value($node, $name, $value) {
    $child = $node.SelectSingleNode($name)
    if (!$child) { $child = $node.OwnerDocument.CreateElement($name); [void]$node.AppendChild($child) }
    $child.InnerText = [string]$value
}
function Add-Xml($parent, [string]$xml) {
    $fragment = $parent.OwnerDocument.CreateDocumentFragment(); $fragment.InnerXml = $xml
    [void]$parent.AppendChild($fragment)
}
function Format-EscapedXml([string]$value) { [System.Security.SecurityElement]::Escape($value) }
foreach ($table in $model.tables) {
    $logical = $table.logicalName
    $entity = @($entitiesNode.Entity) | Where-Object { $_ -and $_.EntityInfo.entity.GetAttribute('Name').ToLower() -eq $logical }
    if (!$entity) {
        $entity = $template.CloneNode($true)
        $replaced = $entity.OuterXml.Replace('asc_CertificationType', $logical).Replace('asc_certificationtype', $logical).Replace('Certification Types', (Format-EscapedXml ($table.label + 's'))).Replace('Certification Type', (Format-EscapedXml $table.label))
        $entity.InnerXml = ([xml]$replaced).DocumentElement.InnerXml
        # Platform generates default forms/views; do not duplicate IDs from the backup.
        foreach ($name in @('FormXml','SavedQueries','RibbonDiffXml')) { $node=$entity.SelectSingleNode($name); if($node){[void]$entity.RemoveChild($node)} }
        $entity.EntityInfo.entity.Descriptions.Description.SetAttribute('description', 'Phase 1 consultant database: ' + $table.label)
        Set-Value $entity.EntityInfo.entity 'IsAuditEnabled' '1'
        [void]$entitiesNode.AppendChild($entity)
        Add-Xml $rootComponentsNode "<RootComponent type=`"1`" schemaName=`"$logical`" behavior=`"0`" />"
        # The cloned template's own primary name attribute is always 'asc_name' text. Some
        # tables need a differently-named and/or autonumber primary column instead (Dataverse
        # can never rename a schema name after creation, so this only matters at creation time -
        # existing tables just keep whatever they already have). Rename the cloned attribute in
        # place so the columns loop below recognizes it as already present and does not also
        # create a second, orphaned column under the new name.
        if ($table.primaryName -and $table.primaryName -ne 'asc_name') {
            $primaryAttr = $entity.EntityInfo.entity.attributes.SelectSingleNode("attribute[LogicalName='asc_name']")
            $primaryColumnDef = $table.columns | Where-Object { $_.name -eq $table.primaryName } | Select-Object -First 1
            if ($primaryAttr -and $primaryColumnDef) {
                $primaryAttr.SetAttribute('PhysicalName', $table.primaryName)
                Set-Value $primaryAttr 'Name' $table.primaryName
                Set-Value $primaryAttr 'LogicalName' $table.primaryName
                $primaryLabel = if ($primaryColumnDef.label) { $primaryColumnDef.label } else { $table.primaryName.Substring(4) }
                $primaryAttr.displaynames.displayname.SetAttribute('description', $primaryLabel)
                if ($primaryColumnDef.description) { $primaryAttr.Descriptions.Description.SetAttribute('description', $primaryColumnDef.description) }
                if ($table.primaryNameAutonumber) { Set-Value $primaryAttr 'AutoNumberFormat' '{SEQNUM:4}' }
            }
        }
    }
    $attributes=$entity.EntityInfo.entity.attributes
    foreach ($column in $table.columns) {
        if($attributes.SelectSingleNode("attribute[LogicalName='$($column.name)']")){continue}
        # File metadata is deliberately excluded from this legacy XML build; use the
        # explicit FileAttributeMetadata request described in README after import.
        if($column.type -eq 'file'){continue}
        $sourceType = switch ($column.type) {'int' {'int'} 'date' {'datetime'} 'datetime' {'datetime'} 'uuid' {'lookup'} default {'nvarchar'}}
        $attribute = ($template.EntityInfo.entity.attributes.attribute | Where-Object Type -eq $sourceType | Select-Object -First 1).CloneNode($true)
        $attribute.SetAttribute('PhysicalName',$column.name)
        Set-Value $attribute 'Name' $column.name
        Set-Value $attribute 'LogicalName' $column.name
        Set-Value $attribute 'IsCustomField' 1
        Set-Value $attribute 'IsAuditEnabled' 1
        Set-Value $attribute 'ValidForCreateApi' 1
        Set-Value $attribute 'ValidForUpdateApi' 1
        Set-Value $attribute 'RequiredLevel' $(if($column.required){'required'}else{'none'})
        Set-Value $attribute 'DisplayMask' 'ValidForAdvancedFind|ValidForForm|ValidForGrid'
        $label = if ($column.label) { $column.label } else { $column.name.Substring(4).Replace('_',' ') }
        $attribute.displaynames.displayname.SetAttribute('description',$label)
        $attribute.Descriptions.Description.SetAttribute('description',$column.description)
        if($sourceType -eq 'nvarchar') {
            Set-Value $attribute 'MaxLength' 200
            Set-Value $attribute 'Length' 400
        }
        switch($column.type) {
            'text' {Set-Value $attribute 'Type' 'ntext'; Set-Value $attribute 'MaxLength' $(if($column.name -in @('asc_before','asc_after')){1048576}else{4000}); Set-Value $attribute 'Length' 'max'; Set-Value $attribute 'Format' 'text'}
            'decimal' {
                foreach($name in @('MaxLength','Length','Format')){[void]$attribute.RemoveChild($attribute.SelectSingleNode($name))}
                Set-Value $attribute 'Type' 'decimal'; Set-Value $attribute 'MinValue' 0; Set-Value $attribute 'MaxValue' 100000000000; Set-Value $attribute 'Accuracy' 2
            }
            'boolean' {
                foreach($name in @('MaxLength','Length','Format')){[void]$attribute.RemoveChild($attribute.SelectSingleNode($name))}
                Set-Value $attribute 'Type' 'bit'; Set-Value $attribute 'AppDefaultValue' 0
                Add-Xml $attribute "<optionset Name=`"$($logical)_$($column.name)`"><OptionSetType>bit</OptionSetType><IsGlobal>0</IsGlobal><IsCustomizable>1</IsCustomizable><options><option value=`"0`"><labels><label description=`"No`" languagecode=`"1033`" /></labels></option><option value=`"1`"><labels><label description=`"Yes`" languagecode=`"1033`" /></labels></option></options></optionset>"
            }
            'date' {Set-Value $attribute 'Format' 'date'; Set-Value $attribute 'Behavior' 2}
            'uuid' {
                if(!$column.target){throw "Unmapped lookup $logical.$($column.name)"}
                $target=if($column.target -eq 'systemuser'){'SystemUser'}else{'asc_'+$column.target}
                $relationship='asc_'+$table.key+'_'+$column.name.Substring(4)
                Add-Xml $entityRelationshipsNode "<EntityRelationship Name=`"$relationship`"><EntityRelationshipType>OneToMany</EntityRelationshipType><IsCustomizable>1</IsCustomizable><ReferencingEntityName>$logical</ReferencingEntityName><ReferencedEntityName>$target</ReferencedEntityName><CascadeAssign>NoCascade</CascadeAssign><CascadeDelete>Restrict</CascadeDelete><CascadeReparent>NoCascade</CascadeReparent><CascadeShare>NoCascade</CascadeShare><CascadeUnshare>NoCascade</CascadeUnshare><ReferencingAttributeName>$($column.name)</ReferencingAttributeName></EntityRelationship>"
            }
        }
        if($table.key -eq 'consultant' -and $column.name -in @('asc_status','asc_statuscomment')){Set-Value $attribute 'IsSecured' 1}
        [void]$attributes.AppendChild($attribute)
    }
}
foreach($relationship in $model.relationships) {
    Add-Xml $entityRelationshipsNode "<EntityRelationship Name=`"$($relationship.name)`"><EntityRelationshipType>ManyToMany</EntityRelationshipType><IsCustomizable>1</IsCustomizable><FirstEntityName>asc_$($relationship.left)</FirstEntityName><SecondEntityName>asc_$($relationship.right)</SecondEntityName><IntersectEntityName>$($relationship.name)</IntersectEntityName></EntityRelationship>"
    Add-Xml $rootComponentsNode "<RootComponent type=`"10`" schemaName=`"$($relationship.name)`" behavior=`"0`" />"
}
$solution.ImportExportXml.SolutionManifest.Version='1.1.0.0'
foreach($relationship in @($entityRelationshipsNode.EntityRelationship)) {
    if($relationship -and !$relationship.SelectSingleNode('RelationshipDescription')) {
        Add-Xml $relationship '<RelationshipDescription><Descriptions><Description description="Phase 1 consultant database relationship" languagecode="1033" /></Descriptions></RelationshipDescription>'
        if($relationship.EntityRelationshipType -eq 'OneToMany') {
            Add-Xml $relationship "<EntityRelationshipRoles><EntityRelationshipRole><NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption><NavPaneArea>Details</NavPaneArea><NavPaneOrder>10000</NavPaneOrder><NavigationPropertyName>$($relationship.ReferencingAttributeName)</NavigationPropertyName><RelationshipRoleType>1</RelationshipRoleType></EntityRelationshipRole><EntityRelationshipRole><NavigationPropertyName>$($relationship.GetAttribute('Name'))</NavigationPropertyName><RelationshipRoleType>0</RelationshipRoleType></EntityRelationshipRole></EntityRelationshipRoles>"
        } else {
            Add-Xml $relationship "<EntityRelationshipRoles><EntityRelationshipRole><NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption><NavPaneArea>Details</NavPaneArea><NavPaneOrder>10000</NavPaneOrder><NavigationPropertyName>$($relationship.GetAttribute('Name'))</NavigationPropertyName><RelationshipRoleType>2</RelationshipRoleType><AssociationRoleOrdinal>1</AssociationRoleOrdinal></EntityRelationshipRole><EntityRelationshipRole><NavPaneDisplayOption>UseCollectionName</NavPaneDisplayOption><NavPaneArea>Details</NavPaneArea><NavPaneOrder>10000</NavPaneOrder><NavigationPropertyName>$($relationship.GetAttribute('Name'))</NavigationPropertyName><RelationshipRoleType>2</RelationshipRoleType><AssociationRoleOrdinal>2</AssociationRoleOrdinal></EntityRelationshipRole></EntityRelationshipRoles>"
        }
    }
}
[void](New-Item -ItemType Directory -Path $OutputDirectory -Force)
$custom.Save((Join-Path $OutputDirectory 'customizations.xml'))
$solution.Save((Join-Path $OutputDirectory 'solution.xml'))
Copy-Item -LiteralPath "$PSScriptRoot/snapshots/before/[Content_Types].xml" -Destination $OutputDirectory -Force
Add-Type -AssemblyName System.IO.Compression.FileSystem
$zipName = if ($OnlyKeys) { 'ConsultantDatabaseSolution-only-' + ($OnlyKeys -join '-') + '-1.1.0.0.zip' } elseif ($NewTablesOnly) { 'ConsultantDatabaseSolution-newtables-1.1.0.0.zip' } else { 'ConsultantDatabaseSolution-1.1.0.0.zip' }
$zip=Join-Path $PSScriptRoot $zipName
if(Test-Path -LiteralPath $zip){Remove-Item -LiteralPath $zip}
[System.IO.Compression.ZipFile]::CreateFromDirectory($OutputDirectory,$zip)
Write-Output "Built $zip ($($model.tables.Count) tables, $($model.relationships.Count) N:N relationships). File column and alternate keys require follow-up metadata provisioning."
