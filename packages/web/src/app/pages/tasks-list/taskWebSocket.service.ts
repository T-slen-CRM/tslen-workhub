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
    const observable = new Observable<any>(observer => {
      const handler = (data: any) => observer.next(data);
      this.socket.on(event, handler);
      // Remove only this listener on unsubscribe. The socket is a shared,
      // providedIn: 'root' singleton with multiple independent subscribers
      // (task list live updates, task-detail live comments, ...) — disconnecting
      // it here would tear down every other subscriber's connection too, the
      // moment any single one of them unsubscribes (e.g. a task card closing).
      return () => { this.socket.off(event, handler); };
    });
    return observable;
  }
}
