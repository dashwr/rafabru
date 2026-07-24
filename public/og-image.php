<?php

declare(strict_types=1);

header('Content-Type: image/png');
header('Cache-Control: public, max-age=86400, stale-while-revalidate=604800');
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

/** @param GdImage $image */
function scaled_text($image, int $x, int $y, string $text, int $scale, int $colour): void
{
    $font = 5;
    $baseWidth = imagefontwidth($font) * strlen($text);
    $baseHeight = imagefontheight($font);
    $source = colour_image(max(1, $baseWidth), $baseHeight, 255, 255, 255, 127);
    $sourceColour = imagecolorallocate($source, 81, 71, 93);
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
$accent = imagecolorallocate($image, 194, 78, 137);
$buttonPink = imagecolorallocate($image, 248, 220, 235);
$blue = imagecolorallocate($image, 207, 234, 255);

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
scaled_text($image, $x0 + 50, $y0 + 14, 'rafa & bru.exe', 2, $edgeLight);

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

scaled_text($image, 585, 205, 'rafa & bru', 5, $ink);
scaled_text($image, 590, 315, 'links, songs & little memories', 2, $accent);

imagefilledrectangle($image, 590, 390, 820, 448, $buttonPink);
imageline($image, 590, 390, 820, 390, $edgeLight);
imageline($image, 590, 390, 590, 448, $edgeLight);
imagesetthickness($image, 3);
imageline($image, 820, 390, 820, 448, $edgeDark);
imageline($image, 590, 448, 820, 448, $edgeDark);
imagesetthickness($image, 1);
scaled_text($image, 625, 403, 'open our corner', 2, $ink);
scaled_text($image, 590, 495, 'made with love <3', 2, $ink);

imagepng($image, null, 7);
imagedestroy($image);
