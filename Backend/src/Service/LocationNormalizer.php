<?php
declare(strict_types=1);

namespace App\Service;

/** Canonical spelling for known Italian municipalities; preserves unknown text. */
final class LocationNormalizer
{
    private static ?array $locations = null;

    public static function normalize(?string $value): ?string
    {
        if ($value === null || trim($value) === '') { return null; }
        $value = preg_replace('/\s+/u', ' ', trim($value));
        if (self::$locations === null) {
            self::$locations = [];
            $catalog = json_decode(file_get_contents(dirname(__DIR__, 3).'/Context_and_DB_V2/province-comuni.json'), true, flags: JSON_THROW_ON_ERROR);
            foreach ($catalog as $province => $towns) {
                foreach ($towns as $town) {
                    $canonical = "$town - $province";
                    self::$locations[mb_strtolower($canonical)] = $canonical;
                    $key = mb_strtolower($town);
                    self::$locations[$key] = array_key_exists($key, self::$locations) ? null : $canonical;
                }
            }
        }
        return self::$locations[mb_strtolower($value)] ?? $value;
    }
}
