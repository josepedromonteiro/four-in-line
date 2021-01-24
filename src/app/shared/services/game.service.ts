import { Injectable } from '@angular/core';
import { CreateMatchData } from '../../models/create-match-data.model';
import { Match } from '../../models/match.model';
import { StateProps, Store } from '../../store';
import { Player } from '../../models/player.model';
import { PlayerRole } from '../enums/player-role.enum';
import { LocalStorageService } from './local-storage.service';
import { PlayerValue } from '../enums/player-value.enum';
import { Board } from '../../models/board.model';
import { Players } from '../../models/players.model';
import { MatchSettings } from '../../models/match-settings.model';
import { GameUtils } from '../../game/game-utils';
import firebase from 'firebase/app';
import { AngularFireDatabase } from '@angular/fire/database';
import { Observable } from 'rxjs';
import { first, map, take, tap } from 'rxjs/operators';
import { PeerService } from './peer/peer.service';
import Peer from 'peerjs';
import { ThemeService } from './theme.service';

@Injectable()
export class GameService {

  constructor(private db: AngularFireDatabase,
              private storage: LocalStorageService,
              private store: Store,
              private peerService: PeerService,
              private themeService: ThemeService) {

  }

  private getInitialMatchData(data: CreateMatchData): Observable<Partial<Match>> {

    // set host player data
    const player: Player = {
      id: this.storage.getPlayerId(),
      value: PlayerValue.Player1,
      role: PlayerRole.Player1,
      name: data.player1Name
    };

    // set match preferences
    const settings: MatchSettings = {
      numRows: data.boardNumRows,
      numCols: data.boardNumCols,
      four: data.four,
      ghostHelper: data.ghostHelper,
      player1Color: this.themeService.player1Color,
      player2Color: this.themeService.player2Color,
    };

    // get a brand new board
    const utils = new GameUtils(settings);
    const board = utils.getEmptyBoard();

    return this.peerService.createPeer().pipe(
      map((peer: Peer) => {
        return {
          startAt: firebase.database.ServerValue.TIMESTAMP,
          activePlayer: player,
          settings,
          board,
          players: {
            [player.id]: player
          },
          peerConnection: {
            id: peer.id
          }
        };
      })
    );


  }

  createMatch(data: CreateMatchData): Promise<string> {
    const matchId = this.db.createPushId();
    this.storage.setMyRoleForMatch(matchId, PlayerRole.Player1);
    return new Promise<string>((resolve, _) => {
      this.getInitialMatchData(data).pipe(
        take(1)
      ).subscribe((matchData: Partial<Match>) => {
        const addToDB: Promise<string> = this.db.object(matchId)
          .set(matchData)
          .then(() => matchId);
        return resolve(addToDB);
      });
    });

  }

  matchExists(matchId: string): Observable<string> {
    return this.db.object(matchId).valueChanges().pipe(
      first(),
      map(n => !!n ? matchId : null)
    );
  }

  get matchId(): string {
    return this.store.value.matchId;
  }

  setMatchId(matchId: string): void {
    this.store.set(StateProps.matchId, matchId);
  }

  board$(): Observable<Board> {
    return this.db
      .object<Board>(`${this.matchId}/${StateProps.board}`)
      .valueChanges()
      .pipe(
        tap(next => this.store.set(StateProps.board, next))
      );
  }

  setBoard(board: Board) {
    return this.db.object(`${this.matchId}/${StateProps.board}`).set(board);
  }

  activePlayer$(): Observable<Player> {
    return this.db
      .object<Player>(`${this.matchId}/${StateProps.activePlayer}`)
      .valueChanges()
      .pipe(
        tap(next => this.store.set(StateProps.activePlayer, next))
      );
  }

  setActivePlayer(player: Player) {
    return this.db.object(`${this.matchId}/${StateProps.activePlayer}`).set(player);
  }

  winnerPlayer$(): Observable<Player> {
    return this.db
      .object<Player>(`${this.matchId}/${StateProps.winnerPlayer}`)
      .valueChanges()
      .pipe(
        tap(next => this.store.set(StateProps.winnerPlayer, next))
      );
  }

  endMatch(winnerPlayer: Player) {
    const endAt = firebase.database.ServerValue.TIMESTAMP;
    const data: Partial<Match> = { winnerPlayer, endAt };
    return this.db.object(this.matchId).update(data);
  }

  players$(): Observable<Players> {
    return this.db
      .object<Players>(`${this.matchId}/${StateProps.players}`)
      .valueChanges()
      .pipe(
        tap(next => this.store.set(StateProps.players, next))
      );
  }

  setMeAsPlayer2(name: string): Promise<Player> {

    const player: Player = {
      id: this.storage.getPlayerId(),
      value: PlayerValue.Player2,
      role: PlayerRole.Player2,
      name
    };

    this.storage.setMyRoleForMatch(this.matchId, PlayerRole.Player2);

    return this.db
      .object(`${this.matchId}/${StateProps.players}/${player.id}`)
      .set(player)
      .then(() => player);

  }

  settings$(): Observable<MatchSettings> {
    return this.db
      .object<MatchSettings>(`${this.matchId}/${StateProps.settings}`)
      .valueChanges()
      .pipe(
        tap(next => this.store.set(StateProps.settings, next))
      );
  }


}
