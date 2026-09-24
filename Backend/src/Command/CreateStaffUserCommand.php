<?php

declare(strict_types=1);

namespace App\Command;

use App\Entity\User;
use App\Repository\UserRepository;
use Doctrine\ORM\EntityManagerInterface;
use Symfony\Component\Console\Attribute\AsCommand;
use Symfony\Component\Console\Command\Command;
use Symfony\Component\Console\Input\InputArgument;
use Symfony\Component\Console\Input\InputInterface;
use Symfony\Component\Console\Output\OutputInterface;
use Symfony\Component\PasswordHasher\Hasher\UserPasswordHasherInterface;

#[AsCommand(name: 'app:create-staff', description: 'Creates the first staff account.')]
class CreateStaffUserCommand extends Command
{
    public function __construct(private readonly UserRepository $users, private readonly EntityManagerInterface $entityManager, private readonly UserPasswordHasherInterface $passwordHasher)
    {
        parent::__construct();
    }

    protected function configure(): void
    {
        $this
            ->addArgument('name', InputArgument::REQUIRED)
            ->addArgument('surname', InputArgument::REQUIRED)
            ->addArgument('username', InputArgument::REQUIRED)
            ->addArgument('email', InputArgument::REQUIRED)
            ->addArgument('password', InputArgument::REQUIRED);
    }

    protected function execute(InputInterface $input, OutputInterface $output): int
    {
        $name = trim((string) $input->getArgument('name'));
        $surname = trim((string) $input->getArgument('surname'));
        $username = trim((string) $input->getArgument('username'));
        $email = trim((string) $input->getArgument('email'));
        $password = (string) $input->getArgument('password');

        if ($name === '' || $surname === '' || $username === '' || !filter_var($email, FILTER_VALIDATE_EMAIL) || strlen($password) < 8) {
            $output->writeln('<error>Use valid values and a password of at least 8 characters.</error>');
            return Command::INVALID;
        }

        if ($this->users->findOneByUsernameOrEmail($username, $email) !== null) {
            $output->writeln('<error>The username or email address is already in use.</error>');
            return Command::FAILURE;
        }

        // Staff accounts can only be created on the server through this command.
        $staff = new User($name, $surname, $username, $email);
        $staff->setRoles([User::ROLE_STAFF]);
        $staff->setPassword($this->passwordHasher->hashPassword($staff, $password));
        $this->entityManager->persist($staff);
        $this->entityManager->flush();

        $output->writeln(sprintf('<info>Staff account "%s" was created.</info>', $staff->getUsername()));
        return Command::SUCCESS;
    }
}
