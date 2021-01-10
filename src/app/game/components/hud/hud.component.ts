import { AfterViewInit, ChangeDetectionStrategy, Component, Input, ViewChild } from '@angular/core';
import { Player } from '../../../models/player.model';
import { PlayerRole } from '../../../shared/enums/player-role.enum';
import { environment } from '../../../../environments/environment';
import * as Clipboard from 'clipboard';
import { MatButton } from '@angular/material/button';

@Component({
  selector: 'app-hud',
  templateUrl: './hud.component.html',
  styleUrls: ['./hud.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HudComponent implements AfterViewInit {

  @Input()
  currentPlayer: Player;

  @Input()
  matchId: string;

  @Input()
  playersCount: number;

  @ViewChild('copyLinkBtn')
  copyLinkBtn: MatButton;

  ngAfterViewInit() {

    if (this.copyLinkBtn) {
      const clipboard = new Clipboard(this.copyLinkBtn._getHostElement(), {
        text: () => `${this.matchId}`
      });
    }

  }

  get isPlayer1() {
    try {
      return this.currentPlayer.role === PlayerRole.Player1;
    } catch (e) {
      return false;
    }
  }

}
