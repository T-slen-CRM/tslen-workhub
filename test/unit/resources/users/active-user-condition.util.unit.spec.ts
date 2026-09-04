import { activeUserCondition, isUserActive } from '../../../../src/resources/users/utils/active-user-condition.util';

describe('activeUserCondition', () => {
    it('returns the isActive/lastDayInCompany SQL fragment scoped to the given alias', () => {
        expect(activeUserCondition('user')).toBe(
            '"user"."isActive" = 1 AND ("user"."lastDayInCompany" IS NULL OR "user"."lastDayInCompany" >= NOW())',
        );
    });

    it('uses whatever alias is given, not a hardcoded one', () => {
        expect(activeUserCondition('u')).toBe(
            '"u"."isActive" = 1 AND ("u"."lastDayInCompany" IS NULL OR "u"."lastDayInCompany" >= NOW())',
        );
    });
});

describe('isUserActive', () => {
    it('is true for an active user with no lastDayInCompany', () => {
        expect(isUserActive({ isActive: 1, lastDayInCompany: null })).toBe(true);
    });

    it('is false when isActive is not 1', () => {
        expect(isUserActive({ isActive: 0, lastDayInCompany: null })).toBe(false);
    });

    it('is true when lastDayInCompany is today or in the future', () => {
        const future = new Date(Date.now() + 24 * 60 * 60 * 1000);
        expect(isUserActive({ isActive: 1, lastDayInCompany: future })).toBe(true);
    });

    it('is false when lastDayInCompany is in the past', () => {
        const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
        expect(isUserActive({ isActive: 1, lastDayInCompany: past })).toBe(false);
    });
});
