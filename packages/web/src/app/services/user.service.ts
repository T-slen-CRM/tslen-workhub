import { Injectable } from '@angular/core';
import { HttpClient } from "@angular/common/http";
import {BehaviorSubject, Observable} from "rxjs";


@Injectable({
    providedIn: 'root'
})
export class UserService {
     userFirstName: BehaviorSubject<string>;
     userLastName: BehaviorSubject<string>;
     userId: BehaviorSubject<number>;

    constructor(private http: HttpClient) {
        this.userFirstName = new BehaviorSubject(null);
        this.userLastName = new BehaviorSubject(null);
        this.userId = new BehaviorSubject(null);
    }

    setUserFirstName(firstName: string){
        this.userFirstName.next(firstName);
    }
    setUserLastName(lastName: string){
        this.userLastName.next(lastName);
    }
    setUserId(id: number){
        this.userId.next(id);
    }
    getUserId(){
        return this.userId
    }

}

