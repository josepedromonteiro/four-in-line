import { ChangeDetectionStrategy, Component, Input, ViewEncapsulation } from '@angular/core';
import { Player } from '../../../models/player.model';
import { PlayerRole } from '../../../shared/enums/player-role.enum';
import { MatSnackBar } from '@angular/material/snack-bar';
import { GameService } from '../../../shared/services/game.service';

@Component({
  selector: 'app-players-hud',
  templateUrl: './players-hud.component.html',
  styleUrls: ['./players-hud.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class PlayersHudComponent {

  @Input()
  players: { [id: string]: Player };

  @Input()
  activePlayer: Player;

  @Input()
  matchId: string;

  @Input()
  isMyTurn: boolean = false;

  playerRole = PlayerRole;

  constructor(private _snackBar: MatSnackBar) {
  }

  get playerIds() {
    if (!this.players) {
      return [];
    }

    return Object.keys(this.players);

  }


  openSnackBar() {
    this._snackBar.open(`Game id copied!`,null, {
      duration: 2000,
    });
  }

}
