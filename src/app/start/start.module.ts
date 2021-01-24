import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { RouterModule, Routes } from '@angular/router';
import { StartComponent } from './containers/start/start.component';
import { FormsModule } from '@angular/forms';
import { ColorPickerComponent } from './containers/start/color-picker/color-picker.component';

const ROUTES: Routes = [{path: '', component: StartComponent}];

@NgModule({
  declarations: [
    StartComponent,
    ColorPickerComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(ROUTES),
    FormsModule
  ]
})
export class StartModule {

}
