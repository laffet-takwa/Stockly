Add-Type -AssemblyName System.Drawing

$ErrorActionPreference = 'Stop'
$assetDirectory = Join-Path (Split-Path -Parent $PSScriptRoot) 'docs/assets'
New-Item -ItemType Directory -Force -Path $assetDirectory | Out-Null

function Get-Color([string]$Value) {
    return [System.Drawing.ColorTranslator]::FromHtml($Value)
}

function Draw-Text($Graphics, [string]$Text, [float]$X, [float]$Y, [float]$Size, [string]$Color = '#202B29', [string]$Style = 'Regular') {
    $fontStyle = [System.Enum]::Parse([System.Drawing.FontStyle], $Style)
    $font = [System.Drawing.Font]::new('Segoe UI', $Size, $fontStyle, [System.Drawing.GraphicsUnit]::Pixel)
    $brush = [System.Drawing.SolidBrush]::new((Get-Color $Color))
    $Graphics.DrawString($Text, $font, $brush, $X, $Y)
    $brush.Dispose()
    $font.Dispose()
}

function Fill-Card($Graphics, [float]$X, [float]$Y, [float]$Width, [float]$Height, [string]$Color = '#FFFFFF') {
    $brush = [System.Drawing.SolidBrush]::new((Get-Color $Color))
    $Graphics.FillRectangle($brush, $X, $Y, $Width, $Height)
    $brush.Dispose()
}

function Draw-Frame([int]$Step, [bool]$Movement) {
    $bitmap = [System.Drawing.Bitmap]::new(900, 520)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $graphics.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $graphics.Clear((Get-Color '#F4F6F3'))

    Fill-Card $graphics 18 18 864 484 '#FFFFFF'
    Fill-Card $graphics 18 18 166 484 '#192B28'
    Draw-Text $graphics 'stockly.' 38 37 22 '#F3F7F4' 'Bold'
    Draw-Text $graphics 'Atelier Nord' 39 97 13 '#F3F7F4' 'Bold'
    Draw-Text $graphics 'ESPACE DE TRAVAIL' 39 151 9 '#91A29B' 'Bold'
    Draw-Text $graphics 'Vue d’ensemble' 41 180 12 '#AFBEB7'
    Fill-Card $graphics 28 205 146 34 '#31463F'
    Draw-Text $graphics 'Inventaire' 41 215 12 '#F6FAF7' 'Bold'
    Draw-Text $graphics 'Mouvements' 41 254 12 '#AFBEB7'
    Draw-Text $graphics 'Rapports' 41 293 12 '#AFBEB7'
    Draw-Text $graphics 'TK  Takwa K.' 40 458 11 '#D8E4DF' 'Bold'

    Draw-Text $graphics 'Atelier Nord   /   Inventaire' 211 38 11 '#84908C'
    Draw-Text $graphics 'GESTION DES STOCKS' 211 83 9 '#82918B' 'Bold'
    Draw-Text $graphics 'Votre inventaire.' 211 100 26 '#263431' 'Bold'
    Draw-Text $graphics 'Suivez vos produits et gardez le bon rythme.' 211 132 12 '#89938F'

    $statLabels = @('Valeur du stock', 'References', 'Stock faible', 'Unites disponibles')
    $statValues = @('8 420 EUR', '8', '2', '268')
    $statX = @(211, 374, 537, 700)
    for ($index = 0; $index -lt 4; $index++) {
        Fill-Card $graphics $statX[$index] 164 151 76 '#FFFFFF'
        Draw-Text $graphics $statLabels[$index] ($statX[$index] + 12) 176 10 '#798680'
        Draw-Text $graphics $statValues[$index] ($statX[$index] + 12) 195 19 $(if ($index -eq 2) { '#BD7843' } else { '#263430' }) 'Bold'
        Draw-Text $graphics $(if ($index -eq 2) { 'Sous le seuil minimum' } else { 'Mis a jour a l’instant' }) ($statX[$index] + 12) 222 8 '#98A19D'
    }

    Fill-Card $graphics 211 253 657 230 '#FFFFFF'
    Draw-Text $graphics 'CATALOGUE' 228 268 8 '#98A29D' 'Bold'
    Draw-Text $graphics 'Produits   8' 228 283 15 '#283632' 'Bold'
    Fill-Card $graphics 211 310 657 27 '#FBFCFB'
    Draw-Text $graphics 'PRODUIT' 229 318 8 '#9BA59F' 'Bold'
    Draw-Text $graphics 'CATEGORIE' 467 318 8 '#9BA59F' 'Bold'
    Draw-Text $graphics 'QUANTITE' 625 318 8 '#9BA59F' 'Bold'
    Draw-Text $graphics 'STATUT' 758 318 8 '#9BA59F' 'Bold'

    $names = @('Casque Studio Pro', 'Lampe de bureau Halo', 'Carnet Horizon A5', 'Clavier mecanique 75%')
    $categories = @('Electronique', 'Maison', 'Papeterie', 'Electronique')
    $quantities = @(24, 6, 73, 18)
    $statuses = @('En stock', 'Stock faible', 'En stock', 'En stock')
    for ($row = 0; $row -lt 4; $row++) {
        $rowY = 340 + ($row * 34)
        $isActive = if ($Movement) { $row -eq 0 -and $Step -ge 1 } else { $row -eq ($Step % 4) }
        if ($isActive) { Fill-Card $graphics 212 $rowY 655 33 '#F1F7F2' }
        Draw-Text $graphics $names[$row] 229 ($rowY + 8) 10 '#3A4842' 'Bold'
        Draw-Text $graphics $categories[$row] 467 ($rowY + 8) 9 '#75817B'
        $quantity = $quantities[$row]
        if ($Movement -and $row -eq 0 -and $Step -ge 1) { $quantity += [Math]::Min($Step, 5) }
        Draw-Text $graphics ([string]$quantity) 637 ($rowY + 8) 10 '#394740' 'Bold'
        $statusColor = if ($row -eq 1) { '#AD7D3F' } else { '#48816A' }
        Draw-Text $graphics $statuses[$row] 758 ($rowY + 8) 9 $statusColor 'Bold'
    }

    if ($Movement) {
        $toastY = if ($Step -eq 0) { 428 } else { 417 - (($Step % 2) * 3) }
        Fill-Card $graphics 607 $toastY 250 42 '#EAF5ED'
        Draw-Text $graphics $(if ($Step -eq 0) { 'Mouvement en cours...' } else { '+5 unites enregistrees' }) 622 ($toastY + 12) 11 '#397F64' 'Bold'
    }

    $graphics.Dispose()
    return $bitmap
}

function Set-GifProperty($Image, [int]$Id, [int]$Type, [byte[]]$Value) {
    $property = [System.Runtime.Serialization.FormatterServices]::GetUninitializedObject([System.Drawing.Imaging.PropertyItem])
    $property.Id = $Id
    $property.Type = $Type
    $property.Len = $Value.Length
    $property.Value = $Value
    $Image.SetPropertyItem($property)
}

function Save-AnimatedGif([string]$Path, [bool]$Movement) {
    $frames = @()
    $frameCount = if ($Movement) { 6 } else { 5 }
    for ($step = 0; $step -lt $frameCount; $step++) {
        $frames += ,(Draw-Frame $step $Movement)
    }

    $delays = [byte[]]::new($frameCount * 4)
    for ($index = 0; $index -lt $frameCount; $index++) {
        $delay = 55
        $delays[$index * 4] = [byte]($delay -band 255)
        $delays[$index * 4 + 1] = [byte](($delay -shr 8) -band 255)
    }
    Set-GifProperty $frames[0] 0x5100 4 $delays
    Set-GifProperty $frames[0] 0x5101 3 ([byte[]]@(0, 0, 0, 0))

    $gifCodec = [System.Drawing.Imaging.ImageCodecInfo]::GetImageEncoders() | Where-Object { $_.MimeType -eq 'image/gif' } | Select-Object -First 1
    $parameters = [System.Drawing.Imaging.EncoderParameters]::new(1)
    $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::SaveFlag, [long][System.Drawing.Imaging.EncoderValue]::MultiFrame)
    $frames[0].Save($Path, $gifCodec, $parameters)

    for ($index = 1; $index -lt $frameCount; $index++) {
        $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::SaveFlag, [long][System.Drawing.Imaging.EncoderValue]::FrameDimensionTime)
        $frames[0].SaveAdd($frames[$index], $parameters)
    }
    $parameters.Param[0] = [System.Drawing.Imaging.EncoderParameter]::new([System.Drawing.Imaging.Encoder]::SaveFlag, [long][System.Drawing.Imaging.EncoderValue]::Flush)
    $frames[0].SaveAdd($parameters)

    foreach ($frame in $frames) { $frame.Dispose() }
    Write-Output "Created $Path"
}

Save-AnimatedGif (Join-Path $assetDirectory 'inventory-overview.gif') $false
Save-AnimatedGif (Join-Path $assetDirectory 'stock-movement.gif') $true