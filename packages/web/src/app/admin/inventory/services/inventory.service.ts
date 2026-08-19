import {inject, Injectable} from '@angular/core';
import {FormBuilder, Validators} from '@angular/forms';
import {DataService} from '../../../services/data.service';
import {IInventory, IInventoryHistory} from '../interfaces/inventory';

@Injectable({
    providedIn: 'root'
})
export class InventoryService {
    private fb = inject(FormBuilder);
    private dataService = inject(DataService);

    getCreateInventoryForm() {
        return this.fb.group({
            id: [null],
            name: ['', Validators.required],
            description: [''],
            serialNumber: [''],
            category: ['', Validators.required],
            location: [''],
            department: [''],
            subDivision: [''],
            warrantyDate: [null],
            code: ['', Validators.required],
            userId: [],
            price: [''],
        });
        }
    getAllUsers()  {
       return  this.dataService.getObservableData('/users');
    }

    getInventory() {
        return this.dataService.getObservableData('/inventory');
    }
    saveInventory(data: IInventory) {
        const userId = data.userId;
        if (userId) {
            const inventoryByUserHistory: IInventoryHistory = this.prepareUserHistoryInventory(data);
            data.inventoryByUserHistory = [inventoryByUserHistory];
        }
        return this.dataService.postData('/inventory/create', data);
    }
    getOneInventory(id: number) {
        return this.dataService.getObservableData('/inventory/' + id);

    }
    updateInventory(id: number, data: IInventory, inventoryHistory: IInventoryHistory[] = [], previousUserId?: number | null) {
        if(data.userId !== previousUserId) {
            if(Array.isArray(inventoryHistory) && inventoryHistory.length === 0) {
                const inventoryByUserHistory: IInventoryHistory = this.prepareUserHistoryInventory(data);
                data.inventoryByUserHistory = [inventoryByUserHistory];
            }
            else if(Array.isArray(inventoryHistory) && inventoryHistory.length > 0) {
                const lastHistory = inventoryHistory[inventoryHistory.length - 1];
                if(lastHistory && !lastHistory.endDate) {
                    lastHistory.endDate = new Date().toISOString().split('T')[0];
                }
                const newHistory = this.prepareUserHistoryInventory(data);
                data.inventoryByUserHistory = [...inventoryHistory, newHistory];
            }
        }
        return this.dataService.updateData('/inventory/', id, data);
    }

    formatDateReadable(dateStr: string): string {
        const date = new Date(dateStr);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    prepareUserHistoryInventory(data: IInventory) {
        return {
            userId: data.userId,
            startDate: new Date().toISOString().split('T')[0],
            endDate: null,
        };
    }
}
