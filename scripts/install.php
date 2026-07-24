<?php

declare(strict_types=1);

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "This installer must be run from the command line.\n");
    exit(1);
}

$root = dirname(__DIR__);
$dataDir = rtrim((string) (getenv('RAFABRU_DATA_DIR') ?: '/home1/raf32088/rafabru-data'), '/');
$username = (string) (getenv('RAFABRU_ADMIN_USERNAME') ?: 'serafim');
$password = (string) (getenv('RAFABRU_ADMIN_PASSWORD') ?: '');
$force = in_array('--force', $argv, true);

function promptHidden(string $prompt): string
{
    fwrite(STDOUT, $prompt);
    $sttyMode = shell_exec('stty -g 2>/dev/null');

    if (is_string($sttyMode) && trim($sttyMode) !== '') {
        shell_exec('stty -echo 2>/dev/null');
        $value = trim((string) fgets(STDIN));
        shell_exec('stty ' . escapeshellarg(trim($sttyMode)) . ' 2>/dev/null');
        fwrite(STDOUT, PHP_EOL);
        return $value;
    }

    return trim((string) fgets(STDIN));
}

if ($password === '') {
    $password = promptHidden('Administrator password: ');
}

if ($password === '') {
    fwrite(STDERR, "The administrator password cannot be empty.\n");
    exit(1);
}

if (!is_dir($dataDir) && !mkdir($dataDir, 0750, true) && !is_dir($dataDir)) {
    fwrite(STDERR, "Could not create data directory: {$dataDir}\n");
    exit(1);
}

$audioDir = $dataDir . '/audio';
if (!is_dir($audioDir) && !mkdir($audioDir, 0750, true) && !is_dir($audioDir)) {
    fwrite(STDERR, "Could not create audio directory: {$audioDir}\n");
    exit(1);
}

$configPath = $dataDir . '/config.php';
if (is_file($configPath) && !$force) {
    fwrite(STDERR, "Configuration already exists. Use --force only when intentionally replacing its password.\n");
    exit(1);
}

$config = [
    'data_dir' => $dataDir,
    'session_name' => 'rafabru_admin',
    'session_timeout' => 1800,
    'max_upload_bytes' => 25 * 1024 * 1024,
    'admin_username' => $username,
    'admin_password_hash' => password_hash($password, PASSWORD_DEFAULT),
];

$configContents = "<?php\n\ndeclare(strict_types=1);\n\nreturn " . var_export($config, true) . ";\n";
if (file_put_contents($configPath, $configContents, LOCK_EX) === false) {
    fwrite(STDERR, "Could not write {$configPath}\n");
    exit(1);
}
chmod($configPath, 0640);

$templates = [
    'settings.json',
    'links.json',
    'redirects.json',
    'songs.json',
];

foreach ($templates as $name) {
    $destination = $dataDir . '/' . $name;
    $source = $root . '/storage/templates/' . $name;

    if (!is_file($destination) && is_file($source)) {
        copy($source, $destination);
        chmod($destination, 0640);
    }
}

fwrite(STDOUT, "Rafabru private data initialized in {$dataDir}.\n");
fwrite(STDOUT, "Administrator username: {$username}\n");
fwrite(STDOUT, "The plain password was not written to disk.\n");
