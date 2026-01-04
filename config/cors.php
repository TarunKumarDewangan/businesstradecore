<?php

return [
    /*
        |--------------------------------------------------------------------------
        | Cross-Origin Resource Sharing (CORS) Configuration
        |--------------------------------------------------------------------------
        */

    'paths' => ['api/*', 'sanctum/csrf-cookie'],

    'allowed_methods' => ['*'],

    // Allow Localhost AND Live Domain
    'allowed_origins' => [
        'http://localhost:5173',      // Vite Local
        'http://127.0.0.1:5173',      // Vite IP
        'https://businesstradecore.in', // Live Site (HTTPS)
        'http://businesstradecore.in',  // Live Site (HTTP)
    ],

    'allowed_origins_patterns' => [],

    'allowed_headers' => ['*'],

    'exposed_headers' => [],

    'max_age' => 0,

    'supports_credentials' => true, // Changed to true often helps with Sanctum
];
