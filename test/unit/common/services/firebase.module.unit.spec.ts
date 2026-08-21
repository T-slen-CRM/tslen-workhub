import { createFirebaseService } from '../../../../src/common/services/firebase/firebase.module';
import { FirebaseService } from '../../../../src/common/services/firebase/firebase.service';
import { ConfigService } from '@nestjs/config';

describe('createFirebaseService', () => {
    it('resolves with a FirebaseService instance even when init() fails (e.g. missing credentials file)', async () => {
        const configService = {
            get: jest.fn().mockReturnValue('credentials/does-not-exist.json'),
        } as unknown as ConfigService;

        const result = await createFirebaseService(configService);

        expect(result).toBeInstanceOf(FirebaseService);
    });
});
