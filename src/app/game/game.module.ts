import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { GameComponent } from './containers/game/game.component';
import { BoardComponent } from './components/board/board.component';
import { HudComponent } from './components/hud/hud.component';
import { RouterModule, Routes } from '@angular/router';
import { PlayersHudComponent } from './components/players-hud/players-hud.component';
import {ClipboardModule} from 'ngx-clipboard';
import { MatSnackBarModule } from '@angular/material/snack-bar';

const ROUTES: Routes = [
  { path: ':id/:name', component: GameComponent },
  { path: ':id', component: GameComponent, },];

@NgModule({
  declarations: [
    GameComponent,
    BoardComponent,
    HudComponent,
    PlayersHudComponent,
  ],
  imports: [
    SharedModule,
    RouterModule.forChild(ROUTES),
    ClipboardModule,
    MatSnackBarModule
  ]
})
export class GameModule {

}
