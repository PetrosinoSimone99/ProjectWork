<?php

declare(strict_types=1);

namespace App\Command;

use App\Service\ChainService;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;

#[AsCommand(name: 'app:chains:process', description: 'Search due chains and cancel expired searches or confirmations.')]
final class ProcessChainsCommand extends Command
{
    public function __construct(private ChainService $chains) { parent::__construct(); }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $output->writeln('Processed '.$this->chains->processDue().' due chains.');
        return Command::SUCCESS;
    }
}
