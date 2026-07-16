param(
  [Parameter(Mandatory=$true)][string]$Path,
  [int]$Rows = 10,
  [int]$Cols = 40
)

Add-Type -AssemblyName System.IO.Compression.FileSystem

function Get-ZipText($zip, [string]$name) {
  $entry = $zip.GetEntry($name)
  if ($null -eq $entry) { return $null }
  $reader = New-Object System.IO.StreamReader($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Dispose() }
}

function Get-ColIndex([string]$cellRef) {
  $letters = ($cellRef -replace '\d', '').ToUpperInvariant()
  $n = 0
  foreach ($ch in $letters.ToCharArray()) {
    $n = $n * 26 + ([int][char]$ch - [int][char]'A' + 1)
  }
  return $n
}

$zip = [System.IO.Compression.ZipFile]::OpenRead($Path)
try {
  $shared = New-Object 'System.Collections.Generic.List[string]'
  $sharedXmlText = Get-ZipText $zip 'xl/sharedStrings.xml'
  if ($sharedXmlText) {
    foreach ($m in [regex]::Matches($sharedXmlText, '<si\b.*?</si>', 'Singleline')) {
      $parts = @()
      foreach ($tm in [regex]::Matches($m.Value, '<t(?:\s[^>]*)?>(.*?)</t>', 'Singleline')) {
        $parts += [System.Net.WebUtility]::HtmlDecode($tm.Groups[1].Value)
      }
      $shared.Add(($parts -join ''))
    }
  }

  [xml]$workbook = (Get-ZipText $zip 'xl/workbook.xml')
  [xml]$rels = (Get-ZipText $zip 'xl/_rels/workbook.xml.rels')
  $wbNs = New-Object System.Xml.XmlNamespaceManager($workbook.NameTable)
  $wbNs.AddNamespace('x', 'http://schemas.openxmlformats.org/spreadsheetml/2006/main')
  $wbNs.AddNamespace('r', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $relNs = New-Object System.Xml.XmlNamespaceManager($rels.NameTable)
  $relNs.AddNamespace('pr', 'http://schemas.openxmlformats.org/package/2006/relationships')

  $sheet = $workbook.SelectSingleNode('//x:sheets/x:sheet[1]', $wbNs)
  $rid = $sheet.GetAttribute('id', 'http://schemas.openxmlformats.org/officeDocument/2006/relationships')
  $rel = $rels.SelectSingleNode("//pr:Relationship[@Id='$rid']", $relNs)
  $target = $rel.Target
  if (-not $target.StartsWith('xl/')) { $target = 'xl/' + $target }
  $out = @()
  $sheetEntry = $zip.GetEntry($target)
  $reader = [System.Xml.XmlReader]::Create($sheetEntry.Open())
  try {
    while ($reader.Read()) {
      if ($reader.NodeType -ne [System.Xml.XmlNodeType]::Element -or $reader.LocalName -ne 'row') { continue }
      $rowXml = $reader.ReadOuterXml()
      [xml]$rowDoc = $rowXml
      $vals = New-Object string[] $Cols
      foreach ($c in $rowDoc.DocumentElement.ChildNodes) {
        if ($c.LocalName -ne 'c') { continue }
        $idx = Get-ColIndex $c.r
        if ($idx -lt 1 -or $idx -gt $Cols) { continue }
        $text = ''
        foreach ($child in $c.ChildNodes) {
          if ($child.LocalName -eq 'v') { $text = $child.InnerText }
          if ($child.LocalName -eq 'is') { $text = $child.InnerText }
        }
        if ($c.t -eq 's' -and $text -match '^\d+$') { $text = $shared[[int]$text] }
        $vals[$idx - 1] = $text
      }
      $out += (($vals | ForEach-Object { if ($_ -eq $null) { '' } else { $_ } }) -join "`t")
      if ($out.Count -ge $Rows) { break }
    }
  } finally {
    $reader.Close()
  }
  "Sheet: $($sheet.name)"
  $out
} finally {
  $zip.Dispose()
}
