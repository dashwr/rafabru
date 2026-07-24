<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
require dirname(__DIR__) . '/app/wall.php';

$database = rafabru_wall_database();
rafabru_wall_migrate($database);

fwrite(STDOUT, "Wall database ready: " . rafabru_wall_database_path() . PHP_EOL);
