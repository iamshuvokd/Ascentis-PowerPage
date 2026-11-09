# Live Dataverse schema - ConsultantDatabaseSolution (CDB Development)

Generated 2026-11-05 from a fresh `pac solution export` (customizations.xml). This is the live truth; `phase-1.dbml` is the older design and is now out of date (see drift list).
Notation: `column:type->target`, ` *` = required. `primarykey` rows omitted. Lookups without a target are shown untargeted because the export only names targets for some relationships; infer from the column name.
Ownership in brackets (UserOwned / OrgOwned). Native `contact` has custom lookup `asc_consultantid`.

## N:N relationships live
bimproject_discipline, consultant_bimdiscipline (new), consultant_discipline, consultant_region, consultant_sector, engagement_discipline, projectreference_discipline.
(operatorapproval_discipline and operatorapproval_region N:N are gone, replaced by tables.)

## Drift vs phase-1.dbml (live now differs)
**New tables not in dbml:** asc_auditlog, asc_bimdiscipline, asc_bimprojectdiscipline, asc_completenessrule, asc_confidentialitysignatory, asc_contacttype, asc_engagementsdisciplines, asc_ignoredemaildomain, asc_operatorapprovalsregions, asc_projectreferencediscipline, asc_userrole.
**dbml tables missing live:** none found (all dbml tables exist live). asc_appuser is now only (asc_number, asc_user lookup) - no name/email/role columns. asc_office has no asc_country text / leader1-3; now asc_countryid lookup + asc_officeleaderid. Reference lists discipline/region/sector/service/firmtype/documenttype/certificationtype/kamdriver have only asc_name live (no asc_sortorder); only operator and ratingcriterion keep it.
**Changed columns:** consultant lost asc_bimcapability, asc_bimoperatorcount, asc_workedwithus; gained asc_averagerating, asc_engagementcount, asc_dataeditor, asc_disciplineids/regionids/sectorids (text), asc_lastupdated, asc_lastupdatedby, asc_revenuepct_europe. contact.asc_contacttype is now a lookup to asc_contacttype. bimproject.lod is lookup asc_bimprojectlod. projectreference: country is asc_countryid lookup; start/completion year are datetime. engagement: country is asc_countryid lookup; gained asc_name, asc_ratingcount, asc_latestratingscore. attachment gained asc_name, asc_origin, asc_status, asc_attachedfile (file column) and lost asc_contact_id. rating: gained asc_assignby, asc_consultant_id, asc_iscurrent, asc_returnreason, asc_overallscorecalc; criteria are named score columns (coordination, cost, creativity, drawings, functional, responsiveness, timeline) instead of criteria1-7. kamprofile gained asc_name. portalsubmission gained asc_isreview, asc_submittedon; asc_tab is a picklist. country gained asc_code, asc_label, asc_minlen, asc_maxlen. projecttype gained asc_ishotel. lod primary is asc_lodname.

## Tables

### asc_AppUser [UserOwned]
  asc_number:nvarchar
  asc_user:lookup *

### asc_attachment [UserOwned]
  asc_attachedfile:file
  asc_consultant_id:lookup->asc_consultant
  asc_documenttype_id:lookup->asc_DocumentType
  asc_filename:nvarchar
  asc_filesizemb:decimal
  asc_name:nvarchar *
  asc_origin:picklist
  asc_projectreference_id:lookup->asc_projectreference
  asc_status:picklist
  asc_uploadedby_id:lookup->SystemUser
  asc_uploadedon:datetime

### asc_AuditLog [UserOwned]
  asc_action:picklist
  asc_actor:lookup
  asc_eventtime:datetime
  asc_number:nvarchar
  asc_object:nvarchar
  asc_origin:picklist

### asc_BIMDiscipline [UserOwned]
  asc_bimdisciplinenumber:nvarchar
  asc_biminformationid:lookup
  asc_disciplineid:lookup

### asc_biminformation [UserOwned]
  asc_bimcapability:picklist *
  asc_bimoperatorcount:int
  asc_consultant_id:lookup->asc_consultant *
  asc_number:nvarchar *

### asc_bimproject [UserOwned]
  asc_bimprojectlod:lookup
  asc_consultant_id:lookup->asc_consultant *
  asc_gfa:int *
  asc_location:nvarchar *
  asc_name:nvarchar *

### asc_BIMProjectDiscipline [UserOwned]
  asc_bimprojectdisciplinenumber:nvarchar
  asc_bimprojectid:lookup
  asc_disciplineid:lookup

### asc_CertificationType [UserOwned]
  asc_name:nvarchar *

### asc_CompletenessRule [OrgOwned]
  asc_columnname:nvarchar
  asc_conditioncolumn:nvarchar
  asc_conditionvalue:nvarchar
  asc_consultantcolumn:nvarchar
  asc_name:nvarchar *
  asc_ruletype:picklist *
  asc_tab:picklist
  asc_tablename:nvarchar *
  asc_weight:int *

### asc_Confidentialitysignatory [UserOwned]
  asc_signatoryname:nvarchar
  asc_signature:image
  asc_title:nvarchar

### asc_consultant [UserOwned]
  asc_akaname:nvarchar
  asc_averagerating:decimal
  asc_completeness:decimal
  asc_confackn:bit
  asc_confacknby:nvarchar
  asc_confackndate:datetime
  asc_dataeditor:lookup
  asc_disciplineids:nvarchar
  asc_engagementcount:int
  asc_firmtype_id:lookup->asc_FirmType
  asc_kam_id:lookup->SystemUser
  asc_lastupdated:datetime
  asc_lastupdated_esg:datetime
  asc_lastupdated_financial:datetime
  asc_lastupdated_legal:datetime
  asc_lastupdated_overview:datetime
  asc_lastupdatedby:nvarchar
  asc_leadreviewer_id:lookup->SystemUser
  asc_name:nvarchar *
  asc_regionids:nvarchar
  asc_revenuepct_africa:decimal
  asc_revenuepct_europe:decimal
  asc_revenuepct_middleeast:decimal
  asc_revenuepct_other:decimal
  asc_revenuepct_southasia:decimal
  asc_sectorids:nvarchar
  asc_status:picklist *
  asc_statuscomment:ntext
  asc_website:nvarchar

### asc_ConsultantDiscipline [UserOwned]
  asc_consultantid:lookup *
  asc_disciplineid:lookup *
  asc_number:nvarchar *

### asc_ConsultantRegions [UserOwned]
  asc_consultantid:lookup *
  asc_number:nvarchar *
  asc_regionid:lookup *

### asc_ConsultantSectors [UserOwned]
  asc_consultantid:lookup *
  asc_number:nvarchar *
  asc_sectorid:lookup *

### asc_consultanttabupdate [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_name:nvarchar *
  asc_tab:nvarchar *
  asc_updatedby_id:lookup->SystemUser
  asc_updatedon:datetime

### asc_consultationcategory [UserOwned]
  asc_number:nvarchar *

### asc_contact [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_contacttype:lookup
  asc_firstname:nvarchar *
  asc_jobtitle:nvarchar
  asc_lastname:nvarchar *
  asc_number:nvarchar *
  asc_phone:nvarchar *
  asc_regionid:lookup->asc_Region
  asc_status:nvarchar *
  asc_workemail:nvarchar *

### asc_ContactType [UserOwned]
  asc_contacttypename:nvarchar

### asc_country [UserOwned]
  asc_code:nvarchar
  asc_label:nvarchar
  asc_maxlen:int
  asc_minlen:int
  asc_name:nvarchar *
  asc_region_id:lookup->asc_Region

### asc_Discipline [OrgOwned]
  asc_name:nvarchar *

### asc_DocumentType [OrgOwned]
  asc_name:nvarchar *

### asc_duplicateoverride [UserOwned]
  asc_consultantid:lookup->asc_consultant
  asc_justification:ntext
  asc_matchedvalue:nvarchar
  asc_number:nvarchar *
  asc_recordtype:nvarchar

### asc_engagement [UserOwned]
  asc_city:nvarchar *
  asc_clientname:nvarchar *
  asc_consultant_id:lookup->asc_consultant *
  asc_countryid:lookup
  asc_enddate:datetime
  asc_latestratingscore:decimal
  asc_name:nvarchar *
  asc_projectname:nvarchar *
  asc_ratingcount:int
  asc_startdate:datetime
  asc_status:picklist *

### asc_engagementcontact [UserOwned]
  asc_contactid:lookup->asc_contact *
  asc_engagement_id:lookup->asc_engagement *
  asc_number:nvarchar *
  asc_role:nvarchar

### asc_EngagementsDisciplines [UserOwned]
  asc_disciplinesid:lookup
  asc_engagementsdisciplinesnumber:nvarchar
  asc_engagementsid:lookup

### asc_financialinformation [UserOwned]
  asc_backloginhand:decimal
  asc_backlogratio:decimal
  asc_consultant_id:lookup->asc_consultant *
  asc_effectiveyear:int *
  asc_fiscalformat:nvarchar
  asc_number:nvarchar *
  asc_revenuen1:decimal *
  asc_revenuen2:decimal
  asc_revenuen3:decimal

### asc_financialrevenueregion [UserOwned]
  asc_financialinformation_id:lookup->asc_financialinformation *
  asc_number:nvarchar *
  asc_region_id:lookup->asc_Region *
  asc_revenuepct:decimal

### asc_FirmType [OrgOwned]
  asc_name:nvarchar *

### asc_ignoredemaildomain [OrgOwned]
  asc_name:nvarchar *
  asc_note:nvarchar

### asc_invitation [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_email:nvarchar
  asc_expireson:datetime *
  asc_issuedon:datetime *
  asc_number:nvarchar *
  asc_purpose:nvarchar *
  asc_revoked:bit
  asc_token:nvarchar *

### asc_kamcomarketing [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_description:nvarchar *
  asc_number:nvarchar *
  asc_status:nvarchar
  asc_statusdate:datetime

### asc_kamdriver [UserOwned]
  asc_name:nvarchar *

### asc_kamdriverrating [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_kamdriver_id:lookup->asc_kamdriver *
  asc_number:nvarchar *
  asc_rating:int

### asc_kamleadreceived [UserOwned]
  asc_clientname:nvarchar *
  asc_consultant_id:lookup->asc_consultant *
  asc_leaddate:datetime *
  asc_leadowner:nvarchar *
  asc_leadstatus:nvarchar
  asc_number:nvarchar *
  asc_projectname:nvarchar *
  asc_referralcomment:nvarchar
  asc_referraltype:nvarchar *
  asc_services:nvarchar

### asc_kamleadshared [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_leaddate:datetime *
  asc_leadowner:nvarchar *
  asc_number:nvarchar *
  asc_projectname:nvarchar *
  asc_referralcomment:nvarchar
  asc_referralstatus:nvarchar
  asc_referraltype:nvarchar *
  asc_servicesproposed:nvarchar

### asc_kamprofile [UserOwned]
  asc_clientmanagement:int
  asc_comarketingdriver:int
  asc_commercialrecip:int
  asc_consultant_id:lookup->asc_consultant *
  asc_designintegrity:int
  asc_name:nvarchar *
  asc_stakeholdermgmt:int

### asc_legalinformation [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_holdspi:bit *
  asc_indemnified:bit *
  asc_indemnitydetails:ntext
  asc_litigation:bit *
  asc_litigationdetails:ntext
  asc_number:nvarchar *
  asc_piaggregate:decimal
  asc_piperoccurrence:decimal

### asc_lod [UserOwned]
  asc_lodname:nvarchar
  asc_number:nvarchar *

### asc_note [UserOwned]
  asc_authorid:lookup *
  asc_comment:ntext *
  asc_consultant_id:lookup->asc_consultant *
  asc_name:nvarchar *

### asc_office [UserOwned]
  asc_address:ntext
  asc_consultant_id:lookup->asc_consultant *
  asc_countryid:lookup *
  asc_headcount:int
  asc_name:nvarchar *
  asc_officeleaderid:lookup *
  asc_region_id:lookup->asc_Region *

### asc_officeleader [UserOwned]
  asc_email:nvarchar
  asc_leadernumber:int *
  asc_name:nvarchar *
  asc_office_id:lookup->asc_office *
  asc_phone:nvarchar
  asc_position:nvarchar

### asc_Operator [OrgOwned]
  asc_name:nvarchar *
  asc_sortorder:int

### asc_operatorapproval [UserOwned]
  asc_brands:nvarchar
  asc_consultant_id:lookup->asc_consultant *
  asc_number:nvarchar *
  asc_operator_id:lookup->asc_Operator *

### asc_operatorapprovaldiscipline [UserOwned]
  asc_disciplineid:lookup->asc_Discipline *
  asc_number:nvarchar *
  asc_operatorapproval_id:lookup->asc_operatorapproval *

### asc_OperatorApprovalsRegions [UserOwned]
  asc_operatorapprovalsid:lookup
  asc_operatorapprovalsregionsnumber:nvarchar
  asc_regionsid:lookup

### asc_portalsubmission [UserOwned]
  asc_after:ntext
  asc_before:ntext
  asc_consultant_id:lookup->asc_consultant *
  asc_isreview:bit *
  asc_number:nvarchar *
  asc_rejectreason:ntext
  asc_reviewedby_id:lookup->SystemUser
  asc_revieweddate:datetime
  asc_status:picklist *
  asc_submittedby_id:lookup->asc_contact
  asc_submittedon:datetime
  asc_tab:picklist

### asc_projectreference [UserOwned]
  asc_attachment_id:lookup->asc_attachment
  asc_brand:nvarchar
  asc_completionyear:datetime
  asc_consultant_id:lookup->asc_consultant *
  asc_countryid:lookup *
  asc_gfa:int
  asc_keys:int
  asc_name:nvarchar *
  asc_projectstatus:picklist *
  asc_region_id:lookup->asc_Region *
  asc_startyear:datetime *

### asc_ProjectReferenceDiscipline [UserOwned]
  asc_disciplineid:lookup
  asc_projectreferencedisciplinenumber:nvarchar
  asc_projectreferenceid:lookup

### asc_projectreferencetype [UserOwned]
  asc_number:nvarchar *
  asc_projectreference_id:lookup->asc_projectreference *
  asc_projecttype_id:lookup->asc_projecttype *

### asc_projecttype [UserOwned]
  asc_ishotel:bit
  asc_projecttypename:nvarchar *

### asc_rating [UserOwned]
  asc_assignby:lookup *
  asc_comment:ntext
  asc_consultant_id:lookup->asc_consultant
  asc_engagement_id:lookup->asc_engagement *
  asc_iscurrent:bit
  asc_locked:bit
  asc_name:nvarchar *
  asc_overallscore:decimal
  asc_overallscorecalc:decimal
  asc_rater_id:lookup->SystemUser
  asc_ratingdate:datetime
  asc_returnreason:ntext
  asc_scorecoordination:int
  asc_scorecost:int
  asc_scorecreativity:int
  asc_scoredrawings:int
  asc_scorefunctional:int
  asc_scoreresponsiveness:int
  asc_scoretimeline:int
  asc_workflowstatus:picklist

### asc_ratingcriterion [UserOwned]
  asc_name:nvarchar *
  asc_sortorder:int

### asc_ratingscore [UserOwned]
  asc_name:nvarchar *
  asc_rating_id:lookup->asc_rating *
  asc_ratingcriterion_id:lookup->asc_ratingcriterion *
  asc_score:int *

### asc_Region [OrgOwned]
  asc_name:nvarchar *

### asc_Sector [OrgOwned]
  asc_name:nvarchar *

### asc_Service [OrgOwned]
  asc_name:nvarchar *

### asc_shareholder [UserOwned]
  asc_consultant_id:lookup->asc_consultant *
  asc_equitypct:decimal *
  asc_name:nvarchar *

### asc_sustainabilityesg [UserOwned]
  asc_accreditedcount:int
  asc_consultant_id:lookup->asc_consultant *
  asc_esgcert:bit *
  asc_esgcertdetails:ntext
  asc_esgframework:ntext
  asc_esgqa:bit *
  asc_esgqadetails:ntext
  asc_esgreporting:bit *
  asc_number:nvarchar *

### asc_UserRole [UserOwned]
  asc_isadmin:bit *
  asc_isappuser:bit *
  asc_iskamlead:bit *
  asc_issuperuser:bit *
  asc_user:lookup
  asc_userrolesnumber:nvarchar *
