import { BadRequestException } from '@nestjs/common';
import { toSqlSafeInteger } from '../../../../src/common/utils/sql-safe-integer';

describe('toSqlSafeInteger', () => {
    it('returns a valid integer unchanged', () => {
        expect(toSqlSafeInteger(42, 'companyId')).toBe(42);
    });

    it('throws for a non-integer number', () => {
        expect(() => toSqlSafeInteger(1.5, 'companyId')).toThrow(BadRequestException);
    });

    it('throws for a non-numeric value smuggled past the type system', () => {
        expect(() => toSqlSafeInteger('1; DROP TABLE users;--' as unknown as number, 'companyId'))
            .toThrow(BadRequestException);
    });
});
