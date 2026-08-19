import {FormControl, FormGroup} from "@angular/forms";

export interface IDaysOffSettings {
    id?: number;
    title: string;
    value: string;
    color: string;
    icon: string;
}
export interface IDaysOffValue {
    id: number;
    hospital: string;
    timeOff: string;
    vocation: string;
    transfer: string;
    home: string;
    useScheduler?: number;
    resetYearly?: number;
    company?: {
        id: number;
        country: string;
        name: string;
        daysOffSchedulers?: IDaysOffScheduler[];
    };
}
export interface IDaysOffScheduler {
    id?: number;
    requestType: string;
    timeCoefficient: number;
    repeatBy: string;
    companyId: number;
}

export interface IDaysOffValueForm {
    id: FormControl<number | null>;
    hospital: FormControl<string | null>;
    timeOff: FormControl<string | null>;
    vocation: FormControl<string | null>;
    transfer: FormControl<string | null>;
    home: FormControl<string | null>;
    useScheduler: FormControl<number | null>;
    resetYearly: FormControl<number | null>;
    company: {
        id: FormControl<number | null>;
        country: FormControl<string | null>;
        name: FormControl<string | null>;
        daysOffSchedulers?: FormControl<IDaysOffScheduler[] | null>;
    } | FormGroup;
}
