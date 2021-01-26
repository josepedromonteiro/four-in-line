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
import { debounceTime, distinctUntilChanged, first, map, switchMap, tap } from 'rxjs/operators';

import * as FP from 'fingerpose';
import * as Handpose from '@tensorflow-models/handpose';
import { incredibleGesture, palmGesture, pointerGesture, rockGesture, thumbsDownGesture } from './gestures/gestures';
import Peer from 'peerjs';
import { PeerService } from '../../../shared/services/peer/peer.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { VoiceRecognitionService } from '../../../shared/services/voice-recognition.service';

export const gestureStrings: { [key: string]: string } = {
  thumbs_up: '👍',
  pointer: '👆',
  victory: '✌',
  thumbs_down: '👎',
  incredible: '👌',
  palm: '🖐',
  rock: '🤘'
};

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

  constructor(private store: Store,
              private storage: LocalStorageService,
              public gameService: GameService,
              private dialog: MatDialog,
              private router: Router,
              private route: ActivatedRoute,
              private peerService: PeerService,
              private themeService: ThemeService,
              private voiceRecognitionService: VoiceRecognitionService,
              private elRef: ElementRef) {
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
    this.initCamera();
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

    // if I have no role and there aren't 2 players yet, I become the player 2
    if (currentRole === null && this.playersCount < 2) {

      // prompt player 2 to get his nickname

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

    const video = document.querySelector(`#pose-video-${playerNumber}`) as HTMLVideoElement;
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

          let peer: Peer;
          const currentRole = this.storage.getMyRoleForMatch(this.gameService.matchId);

          // if (currentRole === 1) {
          //   peer = new Peer({ initiator: true, stream });
          // } else {
          //   peer = new Peer();
          // }
          // peer.on('signal', data => {
          //   console.log('signal');
          // });
          //
          // peer.on('data', data => {
          //   console.log('data');
          // });
          //
          // peer.on('stream', (streamReceived: MediaStream) => {
          //   // got remote video stream, now let's show it in a video tag
          //   const videoElement: HTMLVideoElement = document.querySelector('#pose-video-2');
          //
          //   if ('srcObject' in videoElement) {
          //     videoElement.srcObject = streamReceived;
          //   } else {
          //     (videoElement as HTMLImageElement).src = window.URL.createObjectURL(streamReceived); // for older browsers
          //   }
          //
          //   videoElement.play();
          // });

        })
        .catch((error) => {
          console.error('Something went wrong!', error);
        });
    }
  }

  private async initFingerPose(): Promise<void> {

    const video = document.querySelector('#pose-video-1') as HTMLVideoElement;
    const canvas = document.querySelector('#pose-canvas-1') as HTMLCanvasElement;
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

  // private connectVideo(stream: MediaStream) {
  //   console.log('CREATED VIDEO');
  //
  //   this.peerService.peer.pipe(
  //     take(1)
  //   ).subscribe((peer: Peer) => {
  //     const call = peer.call(peer.id, stream);
  //     call.on('stream', (remoteStream: MediaStream) => {
  //       const video = (this.theirVideo.nativeElement as HTMLVideoElement);
  //       video.src = URL.createObjectURL(remoteStream);
  //       video.play();
  //     });
  //   });
  // }

  // private anwserVideo() {
  //   console.log('ANWSER VIDEO');
  //   if (navigator.mediaDevices.getUserMedia) {
  //     navigator.mediaDevices.getUserMedia(this.cameraConstraints)
  //       .then((stream: MediaStream) => {
  //         this.peerService.peer.pipe(
  //           take(1)
  //         ).subscribe((peer: Peer) => {
  //           peer.on('call', (call_: Peer.MediaConnection) => {
  //             call_.answer(stream);
  //             call_.on('stream', (remoteStream: MediaStream) => {
  //               const video = (this.theirVideo.nativeElement as HTMLVideoElement);
  //               video.srcObject = remoteStream;
  //               video.play();
  //             });
  //           });
  //         });
  //
  //       })
  //       .catch((error) => {
  //         console.error('Something went wrong!', error);
  //       });
  //   }
  // }


  userId: string;
  partnerId: string;
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;

  init(): Peer {
    console.log('INIT');
    this.myEl = this.elRef.nativeElement.querySelector('#pose-video-1');
    this.partnerEl = this.elRef.nativeElement.querySelector('#pose-video-2');
    return this.peerService.init(this.userId, this.myEl, this.partnerEl);
  }

  call() {
    console.log('CALL');
    this.peerService.call(this.partnerId);
    // this.swapVideo('my-video');
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
}
