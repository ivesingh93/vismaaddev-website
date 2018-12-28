import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { RouterModule, Routes } from '@angular/router';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';

import { AppComponent } from './app.component';
import { RecordingFormComponent } from './rest/recordings/recording-form/recording-form.component';
import { RecordingListComponent } from './rest/recordings/recording-list/recording-list.component';
import { RecordingsComponent } from './rest/recordings/recordings.component';
import {NgbModule} from '@ng-bootstrap/ng-bootstrap';

import {RestService} from './rest/shared/rest.service';
import {MatChipsModule, MatTabsModule} from '@angular/material';

import { DatePickerModule } from 'ng2-datepicker';
import { SelectModule } from 'ng2-select';
import { ToastrModule } from 'ngx-toastr';
import { TreeModule } from 'angular-tree-component';
import {MatListModule} from '@angular/material';
import { KeysValuePipe } from './shared/pipes/keys-value.pipe';
import { LoopObjectsPipe } from './shared/pipes/loop-objects.pipe';
import {MatCheckboxModule} from '@angular/material';
import { UploadShabadsComponent } from './rest/shabads/upload-shabads/upload-shabads.component';
import { ShabadsComponent } from './rest/shabads/shabads.component';
import { ShabadsThemesComponent } from './rest/shabads-themes/shabads-themes.component';
import { KeysPipe } from './shared/pipes/keys.pipe';
import { RaagiShabadsComponent } from './rest/raagi-shabads/raagi-shabads.component';
import { UploadShabadsFromLocalComponent } from './rest/shabads/upload-shabads-from-local/upload-shabads-from-local.component';
import { UploadKathaComponent } from './rest/katha-recordings/upload-katha/upload-katha.component';
import {KathaService} from "./rest/shared/katha.service";


const appRoutes: Routes = [
  {path: 'recordings', component: RecordingsComponent},
  {path: 'shabads', component: ShabadsComponent},
  // {path: 'shabads_themes', component: ShabadsThemesComponent},
  {path: 'raagi_shabads', component: RaagiShabadsComponent},
  {path: 'upload_shabads_from_local', component: UploadShabadsFromLocalComponent},
  {path: 'upload_katha', component: UploadKathaComponent}
];


@NgModule({
  declarations: [
    AppComponent,
    RecordingFormComponent,
    RecordingListComponent,
    RecordingsComponent,
    KeysValuePipe,
    LoopObjectsPipe,
    UploadShabadsComponent,
    ShabadsComponent,
    ShabadsThemesComponent,
    KeysPipe,
    RaagiShabadsComponent,
    UploadShabadsFromLocalComponent,
    UploadKathaComponent
  ],
  imports: [
    BrowserModule,
    FormsModule,
    ReactiveFormsModule,
    HttpModule,
    DatePickerModule,
    SelectModule,
    ToastrModule.forRoot(),
    BrowserAnimationsModule,
    TreeModule,
    RouterModule.forRoot(appRoutes),
    NgbModule.forRoot(),
    MatTabsModule,
    MatListModule,
    MatChipsModule,
    MatCheckboxModule
  ],
  providers: [RestService, KathaService],
  bootstrap: [AppComponent]
})
export class AppModule { }
