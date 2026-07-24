<?php

declare(strict_types=1);

header('Content-Type: image/png');
header('Cache-Control: public, max-age=300, stale-while-revalidate=86400');
header('X-Content-Type-Options: nosniff');

$mascotPath = __DIR__ . '/assets/images/cinnamoroll.png';

if (!function_exists('imagecreatetruecolor')) {
    if (is_file($mascotPath)) {
        readfile($mascotPath);
    }
    exit;
}

/** @return GdImage */
function colour_image(int $width, int $height, int $red, int $green, int $blue, int $alpha = 0)
{
    $image = imagecreatetruecolor($width, $height);
    imagealphablending($image, false);
    imagesavealpha($image, true);
    $colour = imagecolorallocatealpha($image, $red, $green, $blue, $alpha);
    imagefilledrectangle($image, 0, 0, $width, $height, $colour);
    imagealphablending($image, true);
    return $image;
}

/** @return array{width:int,height:int} */
function scaled_text_size(string $text, int $scale, int $font = 5): array
{
    return [
        'width' => imagefontwidth($font) * strlen($text) * $scale,
        'height' => imagefontheight($font) * $scale,
    ];
}

/** @param GdImage $image @param array{0:int,1:int,2:int} $rgb */
function scaled_text($image, int $x, int $y, string $text, int $scale, array $rgb, int $font = 5): void
{
    $baseWidth = max(1, imagefontwidth($font) * strlen($text));
    $baseHeight = imagefontheight($font);
    $source = colour_image($baseWidth, $baseHeight, 255, 255, 255, 127);
    $sourceColour = imagecolorallocate($source, $rgb[0], $rgb[1], $rgb[2]);
    imagestring($source, $font, 0, 0, $text, $sourceColour);
    imagecopyresized(
        $image,
        $source,
        $x,
        $y,
        0,
        0,
        $baseWidth * $scale,
        $baseHeight * $scale,
        $baseWidth,
        $baseHeight
    );
    imagedestroy($source);
}

/** @param GdImage $image @param array{0:int,1:int,2:int} $rgb */
function centered_text(
    $image,
    int $left,
    int $top,
    int $right,
    int $bottom,
    string $text,
    int $scale,
    array $rgb,
    int $font = 5
): void {
    $size = scaled_text_size($text, $scale, $font);
    $x = $left + (int) floor((($right - $left + 1) - $size['width']) / 2);
    $y = $top + (int) floor((($bottom - $top + 1) - $size['height']) / 2);
    scaled_text($image, max($left, $x), max($top, $y), $text, $scale, $rgb, $font);
}

$width = 1200;
$height = 630;
$image = imagecreatetruecolor($width, $height);
imagealphablending($image, true);
imagesavealpha($image, true);

$background = imagecolorallocate($image, 255, 238, 247);
$paper = imagecolorallocate($image, 255, 253, 254);
$shadow = imagecolorallocatealpha($image, 100, 72, 91, 85);
$edgeLight = imagecolorallocate($image, 255, 255, 255);
$edgeDark = imagecolorallocate($image, 151, 129, 144);
$titlePink = imagecolorallocate($image, 216, 111, 165);
$titlePinkLight = imagecolorallocate($image, 236, 160, 197);
$toolbarPink = imagecolorallocate($image, 255, 246, 251);
$linePink = imagecolorallocate($image, 242, 226, 236);
$ink = imagecolorallocate($image, 81, 71, 93);
$buttonPink = imagecolorallocate($image, 248, 220, 235);

$inkRgb = [81, 71, 93];
$accentRgb = [194, 78, 137];
$whiteRgb = [255, 255, 255];

imagefilledrectangle($image, 0, 0, $width, $height, $background);

$x0 = 95;
$y0 = 65;
$x1 = 1105;
$y1 = 565;

imagefilledrectangle($image, $x0 + 14, $y0 + 14, $x1 + 14, $y1 + 14, $shadow);
imagefilledrectangle($image, $x0, $y0, $x1, $y1, $paper);
imageline($image, $x0, $y0, $x1, $y0, $edgeLight);
imageline($image, $x0, $y0, $x0, $y1, $edgeLight);
imagesetthickness($image, 4);
imageline($image, $x1, $y0, $x1, $y1, $edgeDark);
imageline($image, $x0, $y1, $x1, $y1, $edgeDark);
imagesetthickness($image, 1);

imagefilledrectangle($image, $x0 + 6, $y0 + 6, $x1 - 6, $y0 + 54, $titlePink);
for ($x = $x0 + 550; $x < $x1 - 6; $x++) {
    imagefilledrectangle($image, $x, $y0 + 6, $x, $y0 + 54, $titlePinkLight);
}

imagefilledrectangle($image, $x0 + 16, $y0 + 16, $x0 + 41, $y0 + 41, $toolbarPink);
imagerectangle($image, $x0 + 16, $y0 + 16, $x0 + 41, $y0 + 41, $edgeLight);
centered_text($image, $x0 + 50, $y0 + 6, $x0 + 390, $y0 + 54, 'rafa & bru.exe', 2, $whiteRgb, 4);

$buttonX = $x1 - 122;
foreach (['_', '[]', 'x'] as $index => $symbol) {
    $left = $buttonX + ($index * 35);
    imagefilledrectangle($image, $left, $y0 + 16, $left + 28, $y0 + 43, $buttonPink);
    imagerectangle($image, $left, $y0 + 16, $left + 28, $y0 + 43, $edgeLight);
    imageline($image, $left + 28, $y0 + 16, $left + 28, $y0 + 43, $edgeDark);
    imageline($image, $left, $y0 + 43, $left + 28, $y0 + 43, $edgeDark);
    imagestring($image, 3, $left + 8, $y0 + 21, $symbol, $ink);
}

imagefilledrectangle($image, $x0 + 6, $y0 + 54, $x1 - 6, $y0 + 87, $toolbarPink);
imagestring($image, 4, $x0 + 20, $y0 + 64, 'File   Links   Music', $ink);

for ($y = $y0 + 112; $y < $y1 - 5; $y += 38) {
    imageline($image, $x0 + 7, $y, $x1 - 7, $y, $linePink);
}

if (is_file($mascotPath) && function_exists('imagecreatefrompng')) {
    $mascot = @imagecreatefrompng($mascotPath);
    if ($mascot !== false) {
        imagealphablending($mascot, true);
        imagesavealpha($mascot, true);
        imagecopyresized($image, $mascot, 155, 130, 0, 0, 338, 405, imagesx($mascot), imagesy($mascot));
        imagedestroy($mascot);
    }
}

$textLeft = 545;
$textRight = 1055;
centered_text($image, $textLeft, 175, $textRight, 275, 'rafa & bru', 5, $inkRgb, 5);
centered_text($image, $textLeft, 285, $textRight, 350, 'links, songs & little memories', 2, $accentRgb, 4);

$ctaLeft = 575;
$ctaTop = 385;
$ctaRight = 885;
$ctaBottom = 450;
imagefilledrectangle($image, $ctaLeft, $ctaTop, $ctaRight, $ctaBottom, $buttonPink);
imageline($image, $ctaLeft, $ctaTop, $ctaRight, $ctaTop, $edgeLight);
imageline($image, $ctaLeft, $ctaTop, $ctaLeft, $ctaBottom, $edgeLight);
imagesetthickness($image, 3);
imageline($image, $ctaRight, $ctaTop, $ctaRight, $ctaBottom, $edgeDark);
imageline($image, $ctaLeft, $ctaBottom, $ctaRight, $ctaBottom, $edgeDark);
imagesetthickness($image, 1);
centered_text($image, $ctaLeft + 8, $ctaTop + 5, $ctaRight - 8, $ctaBottom - 5, 'open our corner', 2, $inkRgb, 4);
centered_text($image, $textLeft, 475, $textRight, 535, 'made with love <3', 2, $inkRgb, 5);

imagepng($image, null, 7);
imagedestroy($image);
