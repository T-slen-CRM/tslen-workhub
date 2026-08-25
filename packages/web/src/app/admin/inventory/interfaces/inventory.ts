export interface IInventory {
    id: number;
    name: string;
    description: string;
    price: string;
    category: string;
    location: string;
    department: string;
    subDivision: string;
    warrantyDate: string;
    code: string;
    userId?: number;
    user?: IUsers | null;
    inventoryByUserHistory?: IInventoryHistory[];
}
export interface IUsers {
    id: number;
    firstName: string;
    lastName: string;
    email: string;
    emailSpare: string | null;
    country: string;
    password: string;
    avatar: string | null;
    company: string;
    address: string | null;
    phone: string | null;
    skype: string | null;
    balance: string;
    birthDay: string | null;
    chiefId: number;
    companyId: number;
    eventsByUsers: any[];
    firstDayInCompany: string;
    isActive: number;
    jobPosition: string | null;
    lastLogin: string;
    loginCount: number;
    managerId: number;
    ownerId: number;
    tokenReset: string | null;
    useDarkTheme: number;
    tokenActivation: string | null;
    role: "admin" | "advert" | "wlsowner" | "manager";
    userProbation: string | null;
    prepay: number;
}

export interface IInventoryHistory {
    id?: number;
    inventoryId?: number;
    userId: number;
    startDate: string;
    endDate: string | null;
    user?: IUsers;
    formattedStartDate?: string;
    formattedEndDate?: string;
    userName?: string;
}
