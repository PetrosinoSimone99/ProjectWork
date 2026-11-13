<?php

namespace App\Controller;

use App\Manager\AgreementManager;
use App\Manager\UserManager;
use App\Entity\User;
use App\Exception\ResourceNotFound;
use Symfony\Bundle\FrameworkBundle\Controller\AbstractController;
use Symfony\Component\HttpFoundation\JsonResponse;
use Symfony\Component\Routing\Attribute\Route;

#[Route('/api')]
final class AgreementController extends AbstractController
{
    private AgreementManager $agreementManager;
    private UserManager $userManager;

    public function __construct(AgreementManager $agreementManager, UserManager $userManager){
        $this->agreementManager = $agreementManager;
        $this->userManager = $userManager;
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
        }catch(\Exception $e){
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        }

    }
    #[Route('/create-exchange-agreement', name: 'create-exchange-agreement', methods: ['POST'])]
    public function createExchangeAgreement(): JsonResponse
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
            
            if(!is_numeric($data['otherParticipant'])){
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'Bad Request'
                ]], 400);
            }

            $this->agreementManager->createExchangeAgreement($user, (int)$data['otherParticipant']);
            return $this->json([
                'success' => [
                    'code' => 201,
                    'message' => 'Exchange agreement created successfully',
                ],
            ], 201);
            
        }catch(\JsonException $e){
            return $this->json(['error' => [
                'code' => 400,
                'message' => $e->getMessage()
            ]], 400);
        }
        catch(\Exception){
                return $this->json(['error' => [
                    'code' => 500,
                    'message' => 'Internal Server Error'
                ]], 500);
        }
    }

    #[Route('/send-agreement-response', name: 'send-agreement-response', methods: ['POST'])]
    public function sendResponse(): JsonResponse
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
            
            if(!is_numeric($data['agreementId']) || !is_bool($data['response'])){
                return $this->json(['error' => [
                    'code' => 400,
                    'message' => 'Bad Request'
                ]], 400);
            }
            
            $this->agreementManager->sendResponse($user, (int)$data['agreementId'], (bool)$data['response']);
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
        catch(\ResourceNotFound){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
         catch(\Exception $e){
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error'
            ]], 500);
        } 
    }

    #[Route('/send-agreement-details', name: 'send-agreement-details', methods: ['GET'])]
    public function sendAgreementDetails(): JsonResponse
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
            /*$data = [
                'agreementId' => 1,
                'beneficiaryId' => 2,
                'fromRemote' => false,
                'startDate' => '2024-06-01',
                'endDate' => '2024-06-30'
            ];*/
            if(!is_array($data)) {
                throw new \JsonException('Invalid JSON data');
            }

            $this->agreementManager->sendAgreementDetails($user, $data);
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
        catch(\Exception $e){
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
        }catch(\ResourceNotFound $e){
            return $this->json(['error' => [
                'code' => 404,
                'message' => 'Resource not found'
            ]], 404);
        }
        catch(\Exception $e){
            return $this->json(['error' => [
                'code' => 500,
                'message' => 'Internal Server Error' . $e->getMessage()
            ]], 500);
        }
    }
}
