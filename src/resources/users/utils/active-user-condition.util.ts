import { Users } from '../entities/users.entity';

// Mirrors auth.service.ts's findActiveUserByEmail login gate - the one
// reference definition of "active" for every place a user is being
// LISTED (not looked up by an already-known/trusted id - see each call
// site for why it does or doesn't use this). Fully double-quoted so the
// same fragment is valid both as a QueryBuilder .andWhere()/join
// condition and concatenated into a raw .getQuery()/entityManager.query()
// string - both styles are used across the call sites.
export function activeUserCondition (alias: string): string {
    return `"${alias}"."isActive" = 1 AND ("${alias}"."lastDayInCompany" IS NULL OR "${alias}"."lastDayInCompany" >= NOW())`;
}

export function isUserActive (user: Pick<Users, 'isActive' | 'lastDayInCompany'>): boolean {
    if (user.isActive !== 1) {
        return false;
    }
    if (!user.lastDayInCompany) {
        return true;
    }
    return new Date(user.lastDayInCompany) >= new Date();
}
