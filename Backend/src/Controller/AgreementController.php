<?php

namespace App\Controller;

use App\Manager\AgreementManager;
use App\Manager\UserManager;
use App\Entity\User;
use App\Exception\ResourceNotFound;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\HttpFoundation\Request;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class AgreementController extends AbstractController
{
    private AgreementManager $agreementManager;
    private UserManager $userManager;
    private \Psr\Log\LoggerInterface $logger;

    public function __construct(AgreementManager $agreementManager, UserManager $userManager, \Psr\Log\LoggerInterface $logger){
        $this->agreementManager = $agreementManager;
        $this->userManager = $userManager;
        $this->logger = $logger;
    }
    #[Route('/get-agreements', name: 'get-agreements', methods: ['GET'])]
    public function getAgreements(): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }

        try{
            $agreementsDTO = $this->agreementManager->getAgreements($user);
            return $this->json([
                'success' => [
                    'code' => 200,
                    'message' => 'Agreements retrieved successfully',
                    'agreements' => $agreementsDTO
                ],
            ], 200);
        }catch(\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger->error('Agreement request failed', ['exception' => $e]);
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        }

    }
    #[Route('/create-exchange-agreement', name: 'create-exchange-agreement', methods: ['POST'])]
    public function createExchangeAgreement(Request $request): JsonResponse
    {

        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }
        
        try {
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);

            if(!is_array($data)) {
                throw new \JsonException('Invalid JSON data');
            }
            
            $otherParticipant = $data['otherParticipant'] ?? null;
            if(!is_numeric($otherParticipant)){
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'Bad Request'
                ]], 400);
            }

            $serviceId = $data['serviceId'] ?? null;
            if (!is_int($serviceId) || $serviceId < 1) { return $this->json(['error' => 'serviceId must be a positive integer.'], 400); }
            $autoAccepted = $this->agreementManager->createExchangeAgreement($user, (int)$otherParticipant, $serviceId);
            return $this->json([
                'success' => [
                    'code' => 201,
                    'message' => 'Exchange agreement created successfully',
                    'autoAccepted' => $autoAccepted,
                ],
            ], 201);
            
        }catch(\JsonException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => $e->getMessage()
            ]], 400);
        }
        catch(\InvalidArgumentException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => $e->getMessage()
            ]], 400);
        }
        catch(ResourceNotFound $e){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger?->error('Agreement request failed', ['exception' => $e]);
                return $this->json(['error' => [
                    'code' => 500,
                    'message' => 'Internal Server Error'
                ]], 500);
        }
    }

    #[Route('/send-agreement-response', name: 'send-agreement-response', methods: ['POST'])]
    public function sendResponse(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }
        try{
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if(!is_array($data)) {
                throw new \JsonException('Invalid JSON data');
            }
            
            $agreementId = $data['agreementId'] ?? null;
            $response = $data['response'] ?? null;
            if(!is_numeric($agreementId) || !is_bool($response)){
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'Bad Request'
                ]], 400);
            }
            $this->agreementManager->sendResponse($user, (int)$agreementId, $response);
            return $this->json([
                'success' => [
                    'code' => 200,
                    'message' => 'Response sent successfully'
                ],
            ], 200);
        }
        catch(\JsonException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => 'Bad Request'
            ]], 400);
        }
        catch(ResourceNotFound){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\DomainException){
            return $this->json(['error' => [
                'code' => 409,
                'message' => 'Conflict'
            ]], 409);
        }
         catch(\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger?->error('Agreement request failed', ['exception' => $e]);
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        } 
    }

    #[Route('/send-agreement-details', name: 'send-agreement-details', methods: ['POST'])]
    public function sendAgreementDetails(Request $request): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }
        try{
            $data = json_decode($request->getContent(), true, 512, JSON_THROW_ON_ERROR);
            if(!is_array($data)) {
                throw new \JsonException('Invalid JSON data');
            }

            $agreementId = $data['agreementId'] ?? null;
            if (!is_numeric($agreementId) || (int) $agreementId < 1) {
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'Bad Request'
                ]], 400);
            }
            $notes = $data['notes'] ?? null;
            if (!is_string($notes) || mb_strlen(trim($notes)) < 1 || mb_strlen(trim($notes)) > 500) {
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'notes must be 1 to 500 characters.'
                ]], 400);
            }
            $this->agreementManager->sendAgreementDetails($user, (int) $agreementId, trim($notes));
            return $this->json([
                'success' => [
                    'code' => 200,
                    'message' => 'Agreement details sent successfully'
                ],
            ], 200);
        }catch(\JsonException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => 'Bad Request'
            ]], 400);
        }
        catch(\InvalidArgumentException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => $e->getMessage()
            ]], 400);
        }
        catch(ResourceNotFound $e){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger?->error('Agreement request failed', ['exception' => $e]);
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        }
    }

    #[Route('/cancel-agreement/{agreementId}', name: 'cancel-agreement', methods: ['POST'])]
    public function cancelAgreement(int $agreementId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }
        try{
            $this->agreementManager->cancelAgreement($user, $agreementId);
            return $this->json([
                'success' => [
                    'code' => 200,
                    'message' => 'Agreement cancelled successfully'
                ],
            ], 200);
        }catch(ResourceNotFound $e){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger?->error('Agreement request failed', ['exception' => $e]);
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        }
    }

    #[Route('/accept-agreement-details/{agreementId}', name: 'accept-agreement-details', methods: ['POST'])]
    public function acceptAgreementDetails(int $agreementId): JsonResponse
    {
        $user = $this->getUser();
        if(!$user instanceof User){
            return $this->json(['error' => [
                'code' => 401,
                'message' => 'Unauthorized'
            ]], 401);
        }
        try{
            $this->agreementManager->acceptAgreementDetails($user, $agreementId);
            return $this->json([
                'success' => [
                    'code' => 200,
                    'message' => 'Agreement details accepted successfully'
                ],
            ], 200);
        }catch(ResourceNotFound $e){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\DomainException|\Doctrine\DBAL\Exception\UniqueConstraintViolationException $e){
            return $this->json(['error' => 'The operation conflicts with the current state.'], 409);
        }
        catch(\Exception $e){
            $this->logger?->error('Agreement request failed', ['exception' => $e]);
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        }
    }
}
