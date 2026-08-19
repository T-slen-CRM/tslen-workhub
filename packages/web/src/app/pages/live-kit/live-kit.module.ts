import { NgModule } from '@angular/core';
import {CommonModule, NgOptimizedImage} from '@angular/common';
import { LiveKitRoutingModule } from './live-kit-routing.module';
import { LiveKitComponent } from './live-kit.component';
import { CallUsersOnlineComponent } from 'src/app/components/table-live-kit/table-live-kit.component';
import { ComponentsModule } from 'src/app/components/components.module';
import { ModalLiveKit } from 'src/app/components/model-live-kit/model-live-kit.component';
import { TranslateModule } from '@ngx-translate/core';
import {CallButtonRendererComponent} from "../../components/callButton/buttonRender.component";

@NgModule({
    declarations: [
        ModalLiveKit
    ],
    exports: [
        ModalLiveKit
    ],
    imports: [
        TranslateModule,
        CommonModule,
        LiveKitRoutingModule,
        ComponentsModule,
        CallButtonRendererComponent,
        CallUsersOnlineComponent,
        NgOptimizedImage,
        LiveKitComponent
    ]
})
export class LiveKitModule {}
