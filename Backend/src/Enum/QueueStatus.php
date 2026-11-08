<?php

namespace App\Enum;


enum QueueStatus: string
{
    case OPEN = 'OPEN';
    case CLOSED = 'CLOSED';
}