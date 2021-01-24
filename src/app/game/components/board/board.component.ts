import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  EventEmitter,
  Input,
  OnChanges,
  Output,
  Renderer2,
  SimpleChanges,
  ViewChild
} from '@angular/core';
import { PlayerValue } from '../../../shared/enums/player-value.enum';
import { MatchSettings } from '../../../models/match-settings.model';
import { Player } from '../../../models/player.model';
import { PlayerRole } from '../../../shared/enums/player-role.enum';
import { Board } from '../../../models/board.model';
import { gestureStrings } from '../../containers/game/game.component';
import { Subject } from 'rxjs';

@Component({
  selector: 'app-board',
  templateUrl: './board.component.html',
  styleUrls: ['./board.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class BoardComponent implements OnChanges {

  playerValue = PlayerValue;

  @Input()
  board: Board;

  @Input()
  settings: MatchSettings;

  @Input()
  isDisabled: boolean;

  @Input()
  winnerPlayer: Player;

  @Input()
  currentPlayer: Player;

  @Input()
  gesture: string;


  @ViewChild('tableEl')
  tableEl: ElementRef;

  @Output()
  mark = new EventEmitter<{ row: number; col: number; }>();

  public readonly rows: string[] = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
  public activeHover: { column: number, row: number } = null;
  public PlayersRoles: typeof PlayerRole = PlayerRole;
  public readonly EMOJIS: string[] = Object.keys(gestureStrings);
  public readonly GESTURES: { [p: string]: string } = gestureStrings;

  constructor(private renderer: Renderer2) {

  }

  public ngOnChanges(changes: SimpleChanges) {
    if (changes?.gesture?.currentValue) {
      const col: number = this.EMOJIS.indexOf(this.gesture);
      if (col < 0) {
        return;
      }
      this.onCellHover(0, col, true);
    }
  }

  onCellClick(row: number, col: number) {
    if (this.isDisabled) {
      return;
    }

    this.clearHoverState(row, col);
    this.mark.emit(this.getTargetCell(col));
  }

  private getTargetCell(col: number, i = 1): { row: number, col: number } {
    const numRows = this.settings.numRows;
    const row = numRows - i;

    if (this.board[row][col] === 0) {
      return { row, col };

    } else if (i < numRows) {
      i++;
      return this.getTargetCell(col, i);
    }
  }

  private clearHoverState(row: number, col: number) {

    // disable all hover styling and behaviors
    this.highlightColumn(col, false);
    this.setGhostMark(col, false);

  }

  onCellHover(row: number, col: number, enable: boolean) {
    this.board[0].forEach((_, index) => {
      this.clearHoverState(0, index);
    });


    if (enable) {
      this.activeHover = { column: col, row: this.getTargetCell(col).row };
    } else {
      this.activeHover = null;
    }
    if (!this.isDisabled) {
      this.highlightColumn(col, enable);
      this.setGhostMark(col, enable);
    }
  }

  private highlightColumn(colIndex: number, enable: boolean) {
    const selectorClassName = `.td-col${colIndex}`;
    const highlightClassName = 'highlight';
    const list = this.tableEl.nativeElement.querySelectorAll(selectorClassName);


    for (let i = 0; i < list.length; i++) {
      const el = list.item(i);

      if (enable) {
        this.renderer.addClass(el, highlightClassName);
      } else {
        this.renderer.removeClass(el, highlightClassName);
      }
    }

  }

  private setGhostMark(colIndex: number, enable: boolean) {
    if (!this.settings.ghostHelper) {
      return;
    }

    const targetCell = this.getTargetCell(colIndex);

    if (targetCell && targetCell.row >= 0) {

      const { row, col } = targetCell;
      const selectorClassName = `.cell-row${row}.cell-col${col}`;
      const ghostClassName = this.currentPlayer?.role === PlayerRole.Player1 ? 'player1-ghost' : 'player2-ghost';
      const el = this.tableEl.nativeElement.querySelector(selectorClassName);

      if (enable) {
        this.renderer.addClass(el, ghostClassName);
      } else {
        this.renderer.removeClass(el, ghostClassName);
      }
    }

  }


}
