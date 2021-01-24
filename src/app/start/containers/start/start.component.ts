import { Component, ViewEncapsulation } from '@angular/core';
import { GameService } from '../../../shared/services/game.service';
import { Router } from '@angular/router';
import { CreateMatchData } from '../../../models/create-match-data.model';
import { DEFAULTS } from '../../../defaults';
import { MatDialog } from '@angular/material/dialog';
import { take } from 'rxjs/operators';
import { ThemeService } from '../../../shared/services/theme.service';

export enum ANIMATION_STATE {
  CLOSED,
  OPENED,
  DOCKED
}

export const DEFAULT_PLAYER_1_COLOR = '#FF69BA';
export const DEFAULT_PLAYER_2_COLOR = '#06aab4';

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
  public columns = 5;
  public player1Colors: string[] = ['#FF69BA', '#F7B32B', '#80b918'];
  public player1Color = DEFAULT_PLAYER_1_COLOR;


  public player2Colors: string[] = ['#06aab4', '#fb5d5d', '#f4a261'];
  public player2Color = DEFAULT_PLAYER_2_COLOR;

  constructor(private dialog: MatDialog,
              private router: Router,
              private gameService: GameService,
              private themeService: ThemeService) {

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
      boardNumCols: this.columns  || DEFAULTS.boardNumCols,
      boardNumRows: DEFAULTS.boardNumRows,
      four: DEFAULTS.four,
      ghostHelper: DEFAULTS.enableGhostHelper,
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
    ).subscribe(async (result: string) => {
      if (result) {
        this.router.navigate([`/${this.gameId}/${this.playerName}`]);
      }
    });
  }

  onPlayer1ColorChange(color: string) {
    this.themeService.setPlayer1Color(color);
  }

  onPlayer2ColorChange(color: string) {
    this.themeService.setPlayer2Color(color);
  }
}
