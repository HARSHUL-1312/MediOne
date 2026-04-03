$jsFiles = Get-ChildItem -Path "c:\hack\swasthyatra\js" -Filter "*.js"
$cssFiles = Get-ChildItem -Path "c:\hack\swasthyatra\css" -Filter "*.css"
$htmlFile = Get-Item "c:\hack\swasthyatra\index.html"
$allFiles = @($jsFiles) + @($cssFiles) + @($htmlFile)

foreach ($f in $allFiles) {
    $content = [System.IO.File]::ReadAllText($f.FullName)
    if ($content.Contains("SwasthYatra")) {
        $content = $content.Replace("SwasthYatra", "MediOne")
        [System.IO.File]::WriteAllText($f.FullName, $content)
        Write-Output "Updated: $($f.Name)"
    }
}
Write-Output "Done!"
