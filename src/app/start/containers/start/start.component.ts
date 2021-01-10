import { Component, ViewEncapsulation } from '@angular/core';
import { GameService } from '../../../shared/services/game.service';
import { Router } from '@angular/router';
import { CreateMatchData } from '../../../models/create-match-data.model';
import { DEFAULTS } from '../../../defaults';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';

export enum ANIMATION_STATE {
  CLOSED,
  OPENED,
  DOCKED
}

@Component({
  selector: 'app-start',
  templateUrl: './start.component.html',
  styleUrls: ['./start.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class StartComponent {

  public viewData: {
    rightExpanded: ANIMATION_STATE;
    leftExpanded: ANIMATION_STATE;
  } = {
    rightExpanded: ANIMATION_STATE.DOCKED,
    leftExpanded: ANIMATION_STATE.DOCKED
  };

  public readonly ANIMATION_STATE: typeof ANIMATION_STATE = ANIMATION_STATE;
  public gameId = '';
  public playerName = '';

  constructor(private dialog: MatDialog,
              private router: Router,
              private gameService: GameService) {

  }

  public expandLeft(): void {
    if ((this.viewData.leftExpanded === ANIMATION_STATE.CLOSED || this.viewData.leftExpanded === ANIMATION_STATE.DOCKED)) {
      this.viewData.leftExpanded = ANIMATION_STATE.OPENED;
    } else {
      this.viewData.leftExpanded = ANIMATION_STATE.DOCKED;
      this.viewData.rightExpanded = ANIMATION_STATE.DOCKED;
      return;
    }

    if (this.viewData.rightExpanded === ANIMATION_STATE.OPENED || this.viewData.rightExpanded === ANIMATION_STATE.DOCKED) {
      this.viewData.rightExpanded = ANIMATION_STATE.CLOSED;
    }
  }

  public expandRight(): void {

    if ((this.viewData.rightExpanded === ANIMATION_STATE.CLOSED || this.viewData.rightExpanded === ANIMATION_STATE.DOCKED)) {
      this.viewData.rightExpanded = ANIMATION_STATE.OPENED;
    } else {
      this.viewData.leftExpanded = ANIMATION_STATE.DOCKED;
      this.viewData.rightExpanded = ANIMATION_STATE.DOCKED;
      return;
    }

    if (this.viewData.leftExpanded === ANIMATION_STATE.OPENED || this.viewData.leftExpanded === ANIMATION_STATE.DOCKED) {
      this.viewData.leftExpanded = ANIMATION_STATE.CLOSED;
    }
  }

  newGame() {
    const data: CreateMatchData = {
      player1Name: this.playerName || DEFAULTS.player1Name,
      boardNumCols: DEFAULTS.boardNumCols,
      boardNumRows: DEFAULTS.boardNumRows,
      four: DEFAULTS.four,
      ghostHelper: DEFAULTS.enableGhostHelper
    };

    this.gameService
      .createMatch(data)
      .then(matchId => this.router.navigate([`/${matchId}`]));

  }

  enrollGame() {
    if (!this.gameId) {
      return;
    }
    this.gameService.matchExists(this.gameId).pipe(
      take(1),
    ).subscribe((result: string) => {
      if (result) {
        this.router.navigate([`/${this.gameId}`]);
      }
    });
  }

}
