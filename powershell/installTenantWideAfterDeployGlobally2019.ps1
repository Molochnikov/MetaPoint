Uninstall-Module -Name SharepointPnPPowershellOnline
Install-Module -Name SharePointPnPPowerShellOnline -RequiredVersion 3.0.1808.0
Import-Module -Name SharePointPnPPowerShellOnline -Force
Connect-PnPOnline -Url http://win-ilm3n2d1r60/ -CurrentCredentials
$props = @"
{
"Title": "PortalFooterApplicationCustomizer",
"MyLinks": "Ссылки",
"ToggleButtonOpen": "Открыть",
"ToggleButtonClose": "Закрыть",
"Edit": "Изменить",
"EditTitle": "Выбрать ссылки",
"MyLinksSaveSuccess": "Ссылки успешно сохранены!",
"MyLinksSaveFailed": "Ошибка при сохранении ссылок!",
"linksListTitle": "footer_links.json"
}
"@
Add-PnPCustomAction `
    -Title "HelloWorld" `
    -Name "HelloWorld" `
    -Location "ClientSideExtension.ApplicationCustomizer" `
    -ClientSideComponentId "94ea29a1-4b88-491d-982c-3edeaf6168ae" `
    -ClientSideComponentProperties $props -Scope Site

#Get-PnpCustomAction -Scope All
#Remove-PnPCustomAction -Identity "e3ad70d2-72cf-4675-994d-d5ac1cd3a5f0" -Scope Site