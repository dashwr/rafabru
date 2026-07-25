<?php

declare(strict_types=1);

require dirname(__DIR__) . '/app/bootstrap.php';
require dirname(__DIR__) . '/app/wall.php';

$database = rafabru_wall_database();
rafabru_wall_migrate($database);

$database->exec(
    'UPDATE wall_notes
     SET rotation = CASE ABS(post_number) % 6
         WHEN 0 THEN -1.35
         WHEN 1 THEN 0.85
         WHEN 2 THEN -0.55
         WHEN 3 THEN 1.25
         WHEN 4 THEN -0.95
         ELSE 0.45
     END
     WHERE ABS(rotation) < 0.001'
);

fwrite(STDOUT, "Wall database ready: " . rafabru_wall_database_path() . PHP_EOL);
