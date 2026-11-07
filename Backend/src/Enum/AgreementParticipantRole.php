<?php

namespace App\Enum;

enum AgreementParticipantRole: string{
    case PROVIDER = 'Provider';
    case BENEFICIARY = 'Beneficiary';
}