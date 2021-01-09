import { Injectable } from '@angular/core';
import { Board } from './models/board.model';
import { Player } from './models/player.model';
import { Players } from './models/players.model';
import { MatchSettings } from './models/match-settings.model';
import { BehaviorSubject, Observable } from 'rxjs';
import { distinctUntilChanged, pluck } from 'rxjs/operators';

export const StateProps = {
  matchId: 'matchId',
  board: 'board',
  activePlayer: 'activePlayer',
  winnerPlayer: 'winnerPlayer',
  players: 'players',
  settings: 'settings'
};

interface State {
  matchId: string;
  board: Board;
  activePlayer: Player;
  winnerPlayer: Player;
  players: Players;
  settings: MatchSettings;
}

const initialState = {
  matchId: undefined,
  board: undefined,
  activePlayer: undefined,
  winnerPlayer: undefined,
  players: undefined,
  settings: undefined,
};

@Injectable()
export class Store {

  private subject = new BehaviorSubject<State>(initialState);
  private store = this.subject.asObservable().pipe(distinctUntilChanged());

  get value() {
    return this.subject.value;
  }

  select<T>(name: string): Observable<T> {
    return this.store.pipe(pluck(name));
  }

  set(name: string, val: any) {
    this.subject.next({
      ...this.value,
      [name]: val
    });
  }

}
