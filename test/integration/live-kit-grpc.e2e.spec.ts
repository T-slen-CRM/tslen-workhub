import { Test, TestingModule } from '@nestjs/testing';
import { LiveKitGrpcController } from '../../src/resources/live-kit/microservice/live-kit.grpc.controller';
import { LiveKitGrpcService } from '../../src/resources/live-kit/microservice/live-kit.grpc.service';
import { dto, webhook } from '../../test/shared/live-kit';

describe('LiveKitGrpcController', () => {
    let controller: LiveKitGrpcController;
    let service: LiveKitGrpcService;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [LiveKitGrpcController],
            providers: [
                {
                    provide: LiveKitGrpcService,
                    useValue: {
                        serviceGrpc: jest.fn()
                    },
                },
            ],
        }).compile();

        controller = module.get<LiveKitGrpcController>(LiveKitGrpcController);
        service = module.get<LiveKitGrpcService>(LiveKitGrpcService);
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    it('should call serviceGrpc with the correct data and return result', async () => {
        const expectedResult = { token: 'mock-token' };
        jest.spyOn(service, 'serviceGrpc').mockResolvedValue(expectedResult);

        const result = await controller.liveKitToken(dto);

        expect(service.serviceGrpc).toHaveBeenCalledWith(dto);
        expect(result).toEqual(expectedResult);
    });

    describe('livekitWebhook', () => {
        it('should log the data and return success response', () => {
            const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

            const result = controller.livekitWebhook(webhook);

            expect(result).toEqual({ success: 'r' });
            expect(consoleSpy).toHaveBeenCalledWith('data', webhook);

            consoleSpy.mockRestore();
        });
    });
});
