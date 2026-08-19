import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

export function generateAvatarFilename (userId: string, originalName: string): string {
    const extension = path.extname(originalName);
    return `${userId}_${Date.now()}_${uuidv4()}${extension}`;
}
