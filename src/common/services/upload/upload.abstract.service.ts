export abstract class UploadAbstractService {
 abstract uploadImage (file: any, destDir?: string): Promise<any>;
}
