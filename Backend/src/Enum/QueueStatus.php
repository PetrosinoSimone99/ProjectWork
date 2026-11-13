<?php

namespace App\Enum;


enum QueueStatus: string
{
    case OPEN = 'OPEN';
    case IN_PROGRESS = 'IN_PROGRESS';
    case CLOSED = 'CLOSED';
}