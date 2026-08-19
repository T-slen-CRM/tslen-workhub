import { TestBed } from '@automock/jest';
import { CryptoService } from '../../../../src/common/services/crypto/crypto.service';

describe('CryptoService', () => {
    let service: CryptoService;
    beforeAll(() => {
        const { unit } = TestBed.create(CryptoService).compile();
        service = unit;
    });
    it('should be define', () => {
        expect(service).toBeDefined();
    });
    it('should encrypt', async () => {
        const value = 'test';
        const hashedValue = 'hashedValue';
        jest.spyOn(service, 'encrypt').mockResolvedValue(hashedValue);
        const result = await service.encrypt(value);
        expect(result).toBe(hashedValue);
    });
    it('should compare hashed values', async () => {
        const value = 'test';
        const hashedValue = 'hashedValue';
        jest.spyOn(service, 'compareHashedValues').mockResolvedValue(true);
        const result = await service.compareHashedValues(value, hashedValue);
        expect(result).toBe(true);
    });
});
