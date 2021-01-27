import { AfterViewInit, Component, ElementRef, OnDestroy, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import { StateProps, Store } from '../../../store';
import { GameService } from '../../../shared/services/game.service';
import { ActivatedRoute, Router } from '@angular/router';
import { GameUtils } from '../../game-utils';
import { LocalStorageService } from '../../../shared/services/local-storage.service';
import { PlayerNameDialogComponent } from '../../../shared/components/player-name-dialog/player-name-dialog.component';
import { Player } from '../../../models/player.model';
import { Board } from '../../../models/board.model';
import { Players } from '../../../models/players.model';
import { MatchSettings } from '../../../models/match-settings.model';
import { PlayerValue } from '../../../shared/enums/player-value.enum';
import { DEFAULTS } from '../../../defaults';
import { combineLatest, forkJoin, Observable, of, Subject, Subscription, throwError } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { debounceTime, distinctUntilChanged, first, map, switchMap, take, tap } from 'rxjs/operators';

import * as FP from 'fingerpose';
import * as Handpose from '@tensorflow-models/handpose';
import { incredibleGesture, palmGesture, pointerGesture, rockGesture, thumbsDownGesture } from './gestures/gestures';
import Peer from 'peerjs';
import { PeerService } from '../../../shared/services/peer/peer.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { VoiceRecognitionService } from '../../../shared/services/voice-recognition.service';
import { v4 as uuidv4 } from 'uuid';
import { Socket } from 'ngx-socket-io';
import { PlayerRole } from '../../../shared/enums/player-role.enum';

export const gestureStrings: { [key: string]: string } = {
  thumbs_up: '👍',
  pointer: '👆',
  victory: '✌',
  thumbs_down: '👎',
  incredible: '👌',
  palm: '🖐',
  rock: '🤘'
};

interface VideoElement {
  muted: boolean;
  srcObject: MediaStream;
  userId: string;
}

@Component({
  selector: 'app-game',
  templateUrl: './game.component.html',
  styleUrls: ['./game.component.scss'],
  encapsulation: ViewEncapsulation.None
})
export class GameComponent implements OnInit, OnDestroy, AfterViewInit {


  @ViewChild('videoElement2') theirVideo: ElementRef;
  matchId$ = this.store.select<string>(StateProps.matchId);

  board$: Observable<Board> = this.store.select<Board>(StateProps.board);
  activePlayer$: Observable<Player> = this.store.select<Player>(StateProps.activePlayer);
  winnerPlayer$: Observable<Player> = this.store.select<Player>(StateProps.winnerPlayer);
  players$: Observable<Players> = this.store.select<Players>(StateProps.players);
  settings$: Observable<MatchSettings> = this.store.select<MatchSettings>(StateProps.settings);
  private onCameraReady: Subject<MediaStream> = new Subject<MediaStream>();

  private subscription: Subscription;

  private gameUtils: GameUtils;

  private playerNumber$: Subject<number> = new Subject<number>();
  public playerNumber: number;

  private cameraConstraints = {
    audio: false,
    video: {
      facingMode: 'user',
      width: 320,
      height: 240,
      frameRate: { max: 30 }
    }
  };

  currentPlayer: Player;

  loading: boolean;
  public gesture: string;
  private gestureChanged: Subject<string>;

  public voice: string;

  private myStream: MediaStream;
  private playerName: string;


  currentUserId: string = uuidv4();
  videos: VideoElement[] = [];

  constructor(private store: Store,
              private storage: LocalStorageService,
              public gameService: GameService,
              private dialog: MatDialog,
              private router: Router,
              private route: ActivatedRoute,
              private peerService: PeerService,
              private themeService: ThemeService,
              private voiceRecognitionService: VoiceRecognitionService,
              private elRef: ElementRef,
              private socket: Socket) {
    this.gestureChanged = new Subject<string>();
    this.gestureChanged.pipe(
      distinctUntilChanged(),
      debounceTime(200),
    ).subscribe((value) => {
      this.gesture = value;
    });
  }

  ngAfterViewInit(): void {
    // this.initCamera();
  }

  ngOnInit() {
    this.loading = true;

    this.subscription = this.route.params
      .pipe(
        switchMap(({ id, name }) => {
          this.playerName = name;
          return this.gameService.matchExists(id);
        }),
        switchMap(matchId => {
          if (!matchId) {
            return throwError('Match not found');
          }

          this.gameService.setMatchId(matchId);
          this.peerService.matchId = matchId;

          let setColor;
          if (this.playerName) {
            setColor = this.gameService.setPlayer2Color();
          }

          return forkJoin({ setColor: of(setColor), settings: this.gameService.settings$().pipe(first()) }).pipe(
            map((result: { setColor: string, settings: MatchSettings }) => {
              return result.settings;
            })
          );
        }),
        switchMap((settings: MatchSettings) => {

          // init game utils
          this.gameUtils = new GameUtils(settings);

          if (settings.player1Color) {
            this.themeService.setPlayer1Color(settings.player1Color);
          }

          if (settings.player2Color) {
            this.themeService.setPlayer2Color(settings.player2Color);
          }

          // subscribe to main objects
          return combineLatest([
            this.gameService.activePlayer$(),
            this.gameService.winnerPlayer$(),
            this.gameService.players$().pipe(tap(() => this.playersUpdated())),
            this.gameService.board$().pipe(tap(() => this.boardUpdated())),
            this.gameService.settings$().pipe(tap((settings_: MatchSettings) => {
              if (settings_.player1Color) {
                this.themeService.setPlayer1Color(settings_.player1Color);
              }
              if (settings_.player2Color) {
                this.themeService.setPlayer2Color(settings_.player2Color);
              }
            }))
          ]);

        })
      )
      .subscribe(
        () => {
          this.loading = false;
          setTimeout(() => {
            this.initViewComponents();
          }, 500);
        },
        () => {

          // match does not exist, redirect
          this.loading = false;
          this.router.navigate(['/']);
        }
      );
  }

  ngOnDestroy() {
    this.subscription.unsubscribe();
  }

  private initViewComponents(): void {
    if (this.playerNumber) {
      this.initCamera(this.playerNumber);
      return;
    }

    this.playerNumber$.pipe(
      take(1)
    ).subscribe((value) => {
      this.initCamera(value);
    });
  }

  private boardUpdated(): void {

    /*
     * run only when both players are playing
     * (exit if there's already a winner or the min players count hasn't been reached yet)
     */

    if (this.store.value.winnerPlayer || this.playersCount < 2) {
      return;
    }

    /*
     * check the board to see if there's a winner.
     * if there's no winner then change turn
     * otherwise end the match (will set the winner to db)
     */

    const board = this.store.value.board;
    const winnerValue = this.gameUtils.getWinnerValue(board);

    if (winnerValue === null) {
      this.changeTurn();

    } else {

      const winnerPlayer = this.getPlayerByValue(winnerValue);
      this.gameService.endMatch(winnerPlayer);

    }

  }

  private getPlayerByValue(val: PlayerValue): Player {
    return Object
      .keys(this.store.value.players)
      .map(id => this.store.value.players[id])
      .find(player => player.value === val);
  }

  private playersUpdated(): void {

    // identify my role for this match (check localStorage)
    const currentRole = this.storage.getMyRoleForMatch(this.gameService.matchId);

    if (currentRole === PlayerRole.Player1) {
      this.playerNumber$.next(1);
      this.playerNumber = 1;
    }

    if (currentRole === PlayerRole.Player2) {
      this.playerNumber$.next(2);
      this.playerNumber = 2;
    }


    // if I have no role and there aren't 2 players yet, I become the player 2
    if (currentRole === null && this.playersCount < 2) {

      // prompt player 2 to get his nickname

      this.playerNumber$.next(2);
      this.playerNumber = 2;

      if (this.playerName) {
        this.gameService
          .setMeAsPlayer2(this.playerName)
          .then(() => this.setCurrentPlayer());
      } else {
        this.dialog
          .open(PlayerNameDialogComponent)
          .afterClosed()
          .subscribe(name => {
            const player2Name = name || DEFAULTS.player2Name;
            this.gameService
              .setMeAsPlayer2(player2Name)
              .then(() => this.setCurrentPlayer());
          });
      }
    } else {
      this.setCurrentPlayer();
    }

  }

  private setCurrentPlayer(): void {
    const id = this.storage.getPlayerId();
    this.currentPlayer = this.store.value.players[id];
  }

  get playersCount(): number {
    try {
      return Object.keys(this.store.value.players).length;
    } catch (e) {
      return 0;
    }
  }

  get isMyTurn(): boolean {
    try {
      return this.currentPlayer.id === this.store.value.activePlayer.id;
    } catch (e) {
      return false;
    }
  }

  onMark({ row, col }: { row: number, col: number }): void {
    const board = [...this.store.value.board];
    board[row][col] = this.currentPlayer.value;
    this.gameService.setBoard(board);
  }

  private getEnemyPlayer(): Player {

    const enemyPlayerId = Object
      .keys(this.store.value.players)
      .find(id => id !== this.storage.getPlayerId());

    return this.store.value.players[enemyPlayerId];

  }

  private changeTurn() {
    this.disableSpeechRecognition();

    // deny the other player to change turn for me
    // also, exit if i didn't move yet
    if (!this.isMyTurn) {
      return;
    }

    const enemyPlayer = this.getEnemyPlayer();
    return this.gameService.setActivePlayer(enemyPlayer);

  }


  private async initCamera(playerNumber: number = 1) {
    const video = document.querySelector(`#my-video`) as HTMLVideoElement;
    video.width = this.cameraConstraints.video.width;
    video.height = this.cameraConstraints.video.height;

    if (navigator.mediaDevices.getUserMedia) {
      navigator.mediaDevices.getUserMedia(this.cameraConstraints)
        .then((stream: MediaStream) => {
          video.srcObject = stream;
          // Init fingerpose
          this.initFingerPose();
          this.myStream = stream;
          this.onCameraReady.next(stream);

          // identify my role for this match (check localStorage)
          // Videocall


          this.setupVideoCall();

        })
        .catch((error) => {
          console.error('Something went wrong!', error);
        });
    }
  }

  private async initFingerPose(): Promise<void> {

    const video = document.querySelector('#my-video') as HTMLVideoElement;
    const canvas = document.querySelector('#my-canvas') as HTMLCanvasElement;
    const ctx = canvas.getContext('2d');
    // const resultLayer = document.querySelector('#pose-result') as HTMLDivElement;

    const knownGestures = [
      FP.Gestures.VictoryGesture,
      FP.Gestures.ThumbsUpGesture,
      thumbsDownGesture,
      pointerGesture,
      incredibleGesture,
      palmGesture,
      rockGesture
    ];


    const GE = new FP.GestureEstimator(knownGestures);

    // load handpose model
    const model = await Handpose.load();


    // main estimation loop
    const estimateHands = async () => {

      // clear canvas overlay
      ctx.clearRect(0, 0, this.cameraConstraints.video.width, this.cameraConstraints.video.height);
      // resultLayer.innerText = '';

      // get hand landmarks from video
      // Note: Handpose currently only detects one hand at a time
      // Therefore the maximum number of predictions is 1
      const predictions = await model.estimateHands(video, true);

      for (let i = 0; i < predictions.length; i++) {

        // draw colored dots at each predicted joint position
        for (const part in predictions[i].annotations) {
          for (const point of predictions[i].annotations[part]) {
            // drawPoint(ctx, point[0], point[1], 3, landmarkColors[part]);
          }
        }

        // now estimate gestures based on landmarks
        // using a minimum confidence of 7.5 (out of 10)
        const est = GE.estimate(predictions[i].landmarks, 7.5);

        if (est.gestures.length > 0) {

          // find gesture with highest confidence
          const result = est.gestures.reduce((p, c) => {
            return (p.confidence > c.confidence) ? p : c;
          });
          this.gestureChanged.next(result.name);
        }
      }


      // ...and so on
      setTimeout(() => {
        estimateHands();
      }, 1000 / this.cameraConstraints.video.frameRate.max);
    };

    estimateHands();
    console.log('Starting predictions');
  }


  get isSpeechRecognitionEnabled(): boolean {
    return this.voiceRecognitionService.isSpeechRecognitionEnabled;
  }

  enableSpeechRecognition() {
    this.voiceRecognitionService.start();
  }

  disableSpeechRecognition() {
    this.voiceRecognitionService.stop();
  }

  setupVideoCall() {
    console.log(`Initialize Peer with id ${this.currentUserId}`);

    const currentRole = this.storage.getMyRoleForMatch(this.gameService.matchId);
    console.log(currentRole);
    if (currentRole === 1) {
      this.gameService.getPeerId().subscribe((peerId) => {
        console.log('get peer to set', peerId);
        if (!peerId) {
          this.gameService.setPeerId(this.currentUserId);
        }
      });
    }

    // this.route.params.subscribe((params) => {
    //   console.log(params);


    this.gameService.getPeerId().subscribe((peerId: string) => {
      console.log('get peer', peerId);


      const myPeer = new Peer(this.currentUserId, {
        key: 'peerjs',
        host: 'connect-4-peerjs.herokuapp.com',
        port: 443,
        secure: true
      });

      myPeer.on('open', userId => {
        console.log('opened');
        this.socket.emit('join-room', peerId, userId);
      });


      // myPeer.on('connection', (conn: DataConnection) => {
      //   console.log('connection');
      //   conn.on('open', () => {
      //     console.log('opened');
      //     console.log('opened');
      //     this.socket.emit('join-room', peerId, this.currentUserId);
      //   });
      // });

      navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      })
        .catch((err) => {
          console.error('[Error] Not able to retrieve user media:', err);
          return null;
        })
        .then((stream: MediaStream | null) => {
          if (stream) {
            this.addMyVideo(stream);
          }

          myPeer.on('call', (call) => {
            console.log('receiving call...', call);
            call.answer(stream);

            call.on('stream', (otherUserVideoStream: MediaStream) => {
              console.log('receiving other stream', otherUserVideoStream);

              this.addOtherUserVideo(call.metadata.userId, otherUserVideoStream);
            });

            call.on('error', (err) => {
              console.error(err);
            });
          });

          this.socket.on('user-connected', (userId) => {
            console.log('Receiving user-connected event', `Calling ${userId}`);

            // Let some time for new peers to be able to answer
            setTimeout(() => {
              const call = myPeer.call(userId, stream, {
                metadata: { userId: this.currentUserId },
              });
              call.on('stream', (otherUserVideoStream: MediaStream) => {
                console.log('receiving other user stream after his connection');
                this.addOtherUserVideo(userId, otherUserVideoStream);
              });

              call.on('close', () => {
                this.videos = this.videos.filter((video) => video.userId !== userId);
              });
            }, 1000);
          });
        });


      this.socket.on('user-disconnected', (userId) => {
        console.log(`receiving user-disconnected event from ${userId}`);
        this.videos = this.videos.filter(video => video.userId !== userId);
      });

    });
    // });

  }

  addMyVideo(stream: MediaStream) {
    // this.videos.push({
    //   muted: true,
    //   srcObject: stream,
    //   userId: this.currentUserId,
    // });
  }

  addOtherUserVideo(userId: string, stream: MediaStream) {
    const alreadyExisting = this.videos.some(video => video.userId === userId);
    if (alreadyExisting) {
      console.log(this.videos, userId);
      return;
    }
    this.videos.push({
      muted: false,
      srcObject: stream,
      userId,
    });
  }

  onLoadedMetadata(event: Event) {
    (event.target as HTMLVideoElement).play();
  }
}
