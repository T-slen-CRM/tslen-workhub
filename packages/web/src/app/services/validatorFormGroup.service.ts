import { Injectable } from '@angular/core';
import {FormGroup, ValidationErrors, ValidatorFn} from "@angular/forms";
import {compareAsc} from "date-fns";

@Injectable({
  providedIn: 'root'
})
export class ValidatorFormGroupService {

  constructor() { }

  public requireMinimumBudget() : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const totalBudget = group.controls['totalBudget'];
      if (totalBudget.value < 25) {
        totalBudget.setErrors({requireMinimumBudget: true});
      } else {
        totalBudget.setErrors(null);
      }

      return;
    };
  }
  public requireMinimumDailyCap() : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const dailyCap = group.controls['dailyCap'];
      if (dailyCap.value > 0 && dailyCap.value < 25) {
        dailyCap.setErrors({requireMinimumDailyCap: true});
      } else {
        dailyCap.setErrors(null);
      }

      return;
    };
  }

  public requireStartBeforeEnd(): ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const startControl = group.controls.start;
      const endControl = group.controls.end;
      const startValue = new Date(startControl.value);
      const endValue = new Date(endControl.value);
      if (compareAsc(startValue, endValue) === 1){
        startControl.setErrors({requireStartBeforeEnd: true});
        endControl.setErrors({requireStartBeforeEnd: true});
      } else {
        startControl.setErrors(null);
        endControl.setErrors(null);
      }
      return;
    };
  }
  public requireMinimumBidPrice() : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const bidPrice = group.controls['bidPrice'];

      if (bidPrice.value < 0.2) {
        bidPrice.setErrors({requireMinimumBidPrice: true});
      } else {
        bidPrice.setErrors(null);
      }
      return;
    };
  }
  public requireConfirmPassword() : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const confirmPassword = group.controls['confirmPassword'];
      const password = group.controls['password'];
      if (password.value !== confirmPassword.value) {
        confirmPassword.setErrors({requireConfirmPassword: true});
      }
      return;
    };
  }
  public requireSpecialSymbols(controlName: string) : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const elementControl = group.controls[controlName];
      const iChars = "!@#$%^&*()+=-[]\\\';,./{}|\":<>?";
      for (let i=0; i < elementControl.value.length; i++){
        if (iChars.indexOf(elementControl.value[i]) !== -1){
          elementControl.setErrors({requireSpecialSymbols: true});
        } else if (/\s/.test(elementControl.value)) {
          elementControl.setErrors({requireSpaces: true});
        }
      }
      return;
    };
  }
  public checkDuplicateSspName(name: string, allSsp: any){
    const filter = allSsp.filter(item => item.name === name);
    const isDuplicate = filter.length > 0;
    return isDuplicate
  }
  public requireMaxAutorulesDaysLimit() : ValidatorFn{
    return (group: FormGroup): ValidationErrors => {
      const limit = group.controls['ruleTime'];
      if (limit.value > 30) {
        limit.setErrors({requireMaxAutorulesDaysLimit: true});
      } else {
        limit.setErrors(null);
      }

      return;
    };
  }
}
