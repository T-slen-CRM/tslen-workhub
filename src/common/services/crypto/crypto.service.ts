import { Injectable } from '@nestjs/common';
import * as bcrypt from 'bcrypt';

@Injectable()
export class CryptoService {
    async encrypt (value: string): Promise<string> {
        const salt = bcrypt.genSaltSync();
        return await bcrypt.hash(value, salt);
    }
    async compareHashedValues (value: string, hashedValue: string): Promise<boolean> {
        return bcrypt.compare(value, hashedValue);
    }
}
