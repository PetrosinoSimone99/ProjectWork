<?php

namespace App\Enum;


enum AgreementStatus: string{
    case PENDING = 'PENDING';
    case ACCEPTED = 'ACCEPTED';
    case CANCELLED = 'CANCELLED';
    case REFUSED = 'REFUSED';
    case CONTESTED = 'CONTESTED';
    case VOID = 'VOID';
}