<?php

declare(strict_types=1);

?><!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="robots" content="noindex, nofollow">
    <title>rafabru</title>
    <style>
        :root {
            color-scheme: light;
            font-family: "MS Sans Serif", Tahoma, Verdana, sans-serif;
            background: #fff4fa;
            color: #465369;
        }

        * {
            box-sizing: border-box;
        }

        body {
            min-height: 100vh;
            margin: 0;
            display: grid;
            place-items: center;
            padding: 24px;
            background:
                radial-gradient(circle at 20% 20%, #ffffff 0 34px, transparent 35px),
                radial-gradient(circle at 78% 32%, #cce9ff 0 28px, transparent 29px),
                #fff4fa;
        }

        .window {
            width: min(520px, 100%);
            border: 2px solid;
            border-color: #ffffff #8d899b #8d899b #ffffff;
            background: #fffcfe;
            box-shadow: 8px 8px 0 rgba(141, 137, 155, 0.16);
        }

        .titlebar {
            display: flex;
            justify-content: space-between;
            align-items: center;
            min-height: 34px;
            padding: 5px 7px;
            background: #f2cbdf;
            font-weight: 700;
        }

        .controls {
            letter-spacing: 4px;
            color: #465369;
        }

        .content {
            padding: 36px 28px;
            text-align: center;
        }

        h1 {
            margin: 0 0 12px;
            font-size: clamp(1.6rem, 6vw, 2.4rem);
        }

        p {
            margin: 0 auto 24px;
            max-width: 34rem;
            line-height: 1.6;
        }

        .status {
            display: inline-block;
            border: 2px solid;
            border-color: #ffffff #8d899b #8d899b #ffffff;
            padding: 10px 16px;
            background: #cce9ff;
            font-weight: 700;
        }
    </style>
</head>
<body>
    <main class="window" aria-labelledby="page-title">
        <div class="titlebar">
            <span>♡ rafabru.exe</span>
            <span class="controls" aria-hidden="true">_ □ ×</span>
        </div>
        <section class="content">
            <h1 id="page-title">our little corner</h1>
            <p>The tiny links page is being assembled. The finished version will live here soon.</p>
            <span class="status">☁ setup in progress ☁</span>
        </section>
    </main>
</body>
</html>
