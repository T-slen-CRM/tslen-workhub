import { Injectable } from '@angular/core';
import {io } from "socket.io-client";
import {Observable} from "rxjs";
import {ConfigurationService} from "../../services/ConfigurationService";

@Injectable({
  providedIn: 'root',
})
export class TaskWebSocketService {
  private socket: any;
  constructor(private configService: ConfigurationService) {
    const jwtToken = localStorage.getItem("jwtToken");
    const url = this.configService.getApiHost(false);
    const socketOptions = {
      extraHeaders: {
        authorization: 'Bearer ' + jwtToken,
      },
      //withCredentials: true,
    };
    this.socket = io(url + '/tasks', socketOptions);
  }


  sendMessage(event: string, message: any){
    this.socket.emit(event, message);
  }

  getMessages(event: string) {
    const observable = new Observable<{ user: string, message: string }>(observer => {
      this.socket.on(event, (data) => {
        observer.next(data);
      });
      return () => { this.socket.disconnect(); };
    });
    return observable;
  }
}
