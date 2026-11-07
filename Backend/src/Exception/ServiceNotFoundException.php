<?php

declare(strict_types=1);

namespace App\Exception;

/** A service disappeared while its mutation was waiting for a row lock. */
final class ServiceNotFoundException extends \RuntimeException
{
}
