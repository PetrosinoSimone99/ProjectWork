<?php


namespace App\Enum;

enum ExchangeMutualStatus: string
{
    case IN_ATTESA = 'IN_ATTESA';
    case ACCETTATO = 'ACCETTATO';
    case RIFIUTATO = 'RIFIUTATO';
}