<?php

namespace App\Enum;


enum QueueType: string
{
    case OFFER = 'OFFER';
    case REQUEST = 'REQUEST';
}