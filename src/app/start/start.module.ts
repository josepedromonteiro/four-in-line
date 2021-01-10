import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { RouterModule, Routes } from '@angular/router';
import { StartComponent } from './containers/start/start.component';
import { FormsModule } from '@angular/forms';

const ROUTES: Routes = [{path: '', component: StartComponent}];

@NgModule({
  declarations: [
    StartComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(ROUTES),
    FormsModule
  ]
})
export class StartModule {

}
