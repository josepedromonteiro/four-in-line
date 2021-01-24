import { Injectable } from '@angular/core';
import { DEFAULT_PLAYER_1_COLOR, DEFAULT_PLAYER_2_COLOR } from '../../start/containers/start/start.component';

@Injectable({
  providedIn: 'root'
})
export class ThemeService {


  player1Color: string = DEFAULT_PLAYER_1_COLOR;
  player2Color: string = DEFAULT_PLAYER_2_COLOR;

  constructor() {
  }

  setPlayer1Color(color: string) {
    this.player1Color = color;
    document.documentElement.style.setProperty('--player-1-color', color);
  }

  setPlayer2Color(color: string) {
    this.player2Color = color;
    document.documentElement.style.setProperty('--player-2-color', color);
  }
}
