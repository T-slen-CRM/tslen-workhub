export interface IDaysOffObject{
    id?: number;
    hospital: IDaysOffItem;
    timeOff: IDaysOffItem;
    vocation: IDaysOffItem;
}
export interface IDaysOffItem{
    name: string;
    value: number | string;
    color: string;
    icon: string;
}
