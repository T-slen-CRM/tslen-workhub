import { MailService } from '../../../../src/common/services/mail/mail.service';
import { TestBed } from '@automock/jest';

describe('Mail service', () => {
    let service: MailService;
    beforeAll(() => {
        const { unit } = TestBed.create(MailService).compile();
        service = unit;
    });
    it('should be define', () => {
        expect(service).toBeDefined();
    });
    it('should send mail', async () => {
        const options = {
            to: '',
            from: '',
            subject: '',
            text: ''
        };
        const mockedSendMail = new Promise((resolve: (value: string)=>void) => resolve(''));
        jest.spyOn(service, 'sendMail').mockResolvedValue(mockedSendMail);
        const result = await service.sendMail(options);
        expect(result).toBe('');
    });


});
