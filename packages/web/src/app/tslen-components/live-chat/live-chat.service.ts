import {Injectable, signal} from '@angular/core';
import { UserGeneralData} from "../../interfaces/userConfig";

@Injectable({
  providedIn: 'root'
})
export class LiveChatService {
  private _selectedChatId = signal<UserGeneralData>({} as UserGeneralData);
  public readonly selectedChatId = this._selectedChatId.asReadonly();
  private _activeCallData = signal<{callerId: number, calleeId: number} | null>(null);
  public readonly activeCallData = this._activeCallData.asReadonly();

  setSelectedChatId(selectedChatId: UserGeneralData) {
    this._selectedChatId.set(selectedChatId);
  }
  getSelectedChatId() {
    return this.selectedChatId;
  }
    setActiveCallData(data: {callerId: number, calleeId: number} | null) {
        this._activeCallData.set(data);
    }
    getActiveCallData() {
        return this.activeCallData;
    }


}
