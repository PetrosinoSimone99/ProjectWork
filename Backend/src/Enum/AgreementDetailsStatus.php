<?php

namespace App\Enum;

enum AgreementDetailsStatus: string
{
    case UNCOMPILED = 'UNCOMPILED';
    case COMPILED = 'COMPILED';
}