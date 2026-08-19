import { DataSource, EntitySubscriberInterface, EventSubscriber } from 'typeorm';
import { Company } from '../entities/company.entity';

@EventSubscriber()
export class CompanySubscriber implements EntitySubscriberInterface<Company>{
    // private readonly logger = new Logger(CompanySubscriber.name);
    constructor (dataSource: DataSource) {
        dataSource.subscribers.push(this);
    }
    listenTo () {
        return Company;
    }
    async afterInsert (/*event: InsertEvent<Company>*/): Promise<void> {
        // TODO: delete this logic if you send this options from frontend/client
        // TODO: to crete company with companyDaysOffRules and daysOffSchedulers use next EP and body:
        // POST http://localhost:4004/api/v1/company
        // BODY:
        //{
        //     "id": 2,
        //     "companyDaysOffRules": [
        //         {
        //             "id": null,
        //             "timeOff": 10,
        //             "hospital": 10,
        //             "vocation": 10,
        //             "transfer": 10,
        //             "home": 10,
        //             "useScheduler": 0,
        //             "resetYearly": 0
        //         }
        //     ],
        //     "daysOffSchedulers": [
        //         { "id": null, "requestType": "timeOff", "timeCoefficient": 0, "repeatBy": "month"},
        //     {id: null, requestType: 'vocation', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'transfer', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'home', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'hospital', timeCoefficient: 0, repeatBy: 'month'},
        //     ]
        // }
        // const companyEntity = event.entity;
        // const companyId = event.entity.id;
        // const entityManager = event.manager;
        // // insert into CompanyDaysOffRules
        // const companyDaysOffRules: CompanyDaysOffRules[] = [
        //   {
        //     id: null,
        //     timeOff: 10,
        //     hospital: 10,
        //     vocation: 10,
        //     transfer: 10,
        //     home: 10,
        //     useScheduler: 0
        //   }
        //   ];
        // // insert into DaysOffSchedulerEntity
        // const daysOffSchedulers: DaysOffSchedulerEntity[] = [
        //     { id: null, requestType: 'timeOff', timeCoefficient: 0, repeatBy: 'month'},
        //     {id: null, requestType: 'vocation', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'transfer', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'home', timeCoefficient: 0, repeatBy: 'month'},
        //     { id: null, requestType: 'hospital', timeCoefficient: 0, repeatBy: 'month'},
        // ];
        // const daysOffSchedulersEntity = daysOffSchedulers.map(
        //     (entity) => new DaysOffSchedulerEntity(entity)
        // );
        //
        // companyEntity.companyDaysOffRules = companyDaysOffRules.map(entity => new CompanyDaysOffRules(entity));
        // companyEntity.daysOffSchedulers = daysOffSchedulersEntity;
        //
        // console.log(daysOffSchedulersEntity);
        // await entityManager.save(daysOffSchedulersEntity);
    }
}
