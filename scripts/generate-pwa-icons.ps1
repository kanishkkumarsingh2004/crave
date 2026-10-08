Add-Type -AssemblyName System.Drawing

$sizes = @(72, 96, 128, 144, 152, 180, 192, 384, 512)
$darkBg = [System.Drawing.Color]::FromArgb(24, 32, 28) # #18201c
$whiteText = [System.Drawing.Color]::FromArgb(255, 255, 255)
$limeDot = [System.Drawing.Color]::FromArgb(217, 244, 71) # #d9f447

function Generate-Icon([int]$size, [string]$outputPath, [bool]$isMaskable) {
    $bmp = [System.Drawing.Bitmap]::new($size, $size)
    $g = [System.Drawing.Graphics]::FromImage($bmp)
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
    $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    
    # Fill background
    $bgBrush = [System.Drawing.SolidBrush]::new($darkBg)
    $g.FillRectangle($bgBrush, 0, 0, $size, $size)

    # Scale for icon
    [float]$scale = if ($isMaskable) { 0.70 } else { 0.88 }
    [float]$boxW = [float]($size * $scale)
    [float]$boxH = [float]($size * $scale)
    [float]$originX = [float](($size - $boxW) / 2.0)
    [float]$originY = [float](($size - $boxH) / 2.0)

    [float]$fontSize = [float]($boxH * 0.65)
    $font = [System.Drawing.Font]::new("Arial", $fontSize, [System.Drawing.FontStyle]'Bold', [System.Drawing.GraphicsUnit]::Pixel)
    $textBrush = [System.Drawing.SolidBrush]::new($whiteText)
    $dotBrush = [System.Drawing.SolidBrush]::new($limeDot)

    $fmt = [System.Drawing.StringFormat]::new()
    $fmt.Alignment = [System.Drawing.StringAlignment]::Center
    $fmt.LineAlignment = [System.Drawing.StringAlignment]::Center

    # Center rectangle
    [float]$textX = [float]($originX - ($boxW * 0.08))
    [float]$textY = [float]($originY - ($boxH * 0.05))
    $rectF = [System.Drawing.RectangleF]::new($textX, $textY, $boxW, $boxH)
    $g.DrawString("c", $font, $textBrush, $rectF, $fmt)

    # Lime square dot (crave signature)
    [float]$dotSize = [float][Math]::Max(4.0, [float]($boxW * 0.12))
    [float]$dotX = [float]($originX + ($boxW * 0.70))
    [float]$dotY = [float]($originY + ($boxH * 0.58))
    $g.FillRectangle($dotBrush, $dotX, $dotY, $dotSize, $dotSize)

    $bmp.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

    $g.Dispose()
    $bmp.Dispose()
    $bgBrush.Dispose()
    $textBrush.Dispose()
    $dotBrush.Dispose()
    $font.Dispose()
    $fmt.Dispose()
    Write-Host "Success: $outputPath ($size x $size)"
}

foreach ($s in $sizes) {
    Generate-Icon -size $s -outputPath "public/icons/icon-${s}x${s}.png" -isMaskable $false
}

Generate-Icon -size 192 -outputPath "public/icons/icon-maskable-192x192.png" -isMaskable $true
Generate-Icon -size 512 -outputPath "public/icons/icon-maskable-512x512.png" -isMaskable $true
Generate-Icon -size 180 -outputPath "public/apple-touch-icon.png" -isMaskable $false
Generate-Icon -size 192 -outputPath "public/icons/apple-touch-icon.png" -isMaskable $false

Write-Host "All icons generated successfully!"
