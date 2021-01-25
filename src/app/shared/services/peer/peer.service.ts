import { Injectable } from '@angular/core';
import Peer from 'peerjs';
import { v4 as uuidv4 } from 'uuid';
import { Subject } from 'rxjs';
import { take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PeerService {

  // private peer_: Peer;
  // public connection: DataConnection;
  // public lastPeerId: string;
  // public matchId: string;
  //
  //
  // constructor(private db: AngularFireDatabase) {
  // }
  //
  // public get peer(): Observable<Peer> {
  //   if (!this.peer_) {
  //     return this.getMatchData(this.matchId).pipe(
  //       mergeMap((matchData: Partial<Match>) => {
  //         if (matchData.peerConnection.id) {
  //           return this.connectToPeer(matchData.peerConnection.id);
  //         } else {
  //           return this.createPeer();
  //         }
  //       })
  //     );
  //   }
  //
  //   return of(this.peer_);
  // }
  //
  // public createPeer(id: string = null): Observable<Peer> {
  //   console.log('peer connect');
  //   this.peer_ = new Peer(id, { debug: 2 });
  //
  //   this.peer_.on('connection', (c: DataConnection) => {
  //     // Allow only a single connection
  //     if (this.connection && this.connection.open) {
  //       c.on('open', () => {
  //         c.send('Already connected to another client');
  //         setTimeout(() => {
  //           c.close();
  //         }, 500);
  //       });
  //       return;
  //     }
  //
  //     this.connection = c;
  //     console.log('Connected to: ' + this.connection.peer);
  //   });
  //
  //
  //   this.peer_.on('disconnected', () => {
  //     console.log('Connection lost. Please reconnect');
  //
  //     // Workaround for peer.reconnect deleting previous id
  //     this.peer_.id = this.lastPeerId;
  //     // this.peer._lastServerId = this.lastPeerId;
  //     this.peer_.reconnect();
  //   });
  //   this.peer_.on('close', () => {
  //     this.connection = null;
  //     console.log('Connection destroyed');
  //   });
  //   this.peer_.on('error', (err) => {
  //     console.log(err);
  //     alert('' + err);
  //   });
  //
  //
  //   return new Observable<Peer>(subscriber => {
  //     this.peer_.on('open', (id_: string) => {
  //       // Workaround for peer.reconnect deleting previous id
  //       if (this.peer_.id === null) {
  //         console.log('Received null id from peer open');
  //         this.peer_.id = this.lastPeerId;
  //       } else {
  //         this.lastPeerId = this.peer_.id;
  //       }
  //
  //       console.log('ID: ' + this.peer_.id);
  //       subscriber.next(this.peer_);
  //       subscriber.complete();
  //     });
  //   });
  // }
  //
  // public connectToPeer(matchId): Observable<Peer> {
  //   return this.peer.pipe(
  //     take(1),
  //     map((peer: Peer) => {
  //       this.connection = peer.connect(matchId);
  //       return this.peer_;
  //     })
  //   );
  // }
  //
  // public getMatchData(id: string): Observable<Partial<Match>> {
  //   return this.db.object<Partial<Match>>(id).valueChanges();
  // }

  options: Peer.PeerJSOption = {
    debug: 3
  };
  peer: Peer;
  myStream: MediaStream;
  myEl: HTMLMediaElement;
  partnerEl: HTMLMediaElement;
  public matchId: string;
  private streamReady: Subject<void> = new Subject<void>();

  stun = 'stun.l.google.com:19302';
  mediaConnection: Peer.MediaConnection;
  stunServer: RTCIceServer = {
    urls: 'stun:' + this.stun,
  };

  constructor() {
    // this.getMedia();
  }

  getMedia() {
    return navigator.getUserMedia({ audio: true, video: true }, (stream: MediaStream) => {
      this.handleSuccess(stream);
    }, (error) => {
      this.handleError(error);
    });
  }

  init(userId: string, myEl: HTMLMediaElement, partnerEl: HTMLMediaElement): Peer {
    this.myEl = myEl;
    this.partnerEl = partnerEl;
    try {
      this.getMedia();
    } catch (e) {
      this.handleError(e);
    }
    return this.createPeer(userId);
  }

  createPeer(userId: string): Peer {
    this.peer = new Peer(uuidv4(), this.options);
    this.peer.on('open', () => {
      this.wait();
    });
    return this.peer;
  }

  call(partnerId: string) {
    // this.peer = new Peer();
    // this.peer.connect(this.matchId);
    // this.getMedia();
    if (!this.myStream) {
      this.streamReady.pipe(
        take(1)
      ).subscribe(() => {
        const call = this.peer.call(partnerId, this.myStream);
        call.on('stream', (stream) => {
          this.partnerEl.srcObject = stream;
        });
      });
    } else {
      const call = this.peer.call(partnerId, this.myStream);
      call.on('stream', (stream) => {
        // this.partnerEl.srcObject = stream;
        alert('STREAM');
      });
    }
  }


  wait() {
    this.peer.on('call', (call) => {
      call.answer(this.myStream);
      call.on('stream', (stream) => {
        // this.partnerEl.srcObject = stream;
        console.error('hello')
      });
    });

    this.peer.on('connection', () => {
      console.error('connection')
    });
  }

  handleSuccess(stream: MediaStream) {
    this.myStream = stream;
    this.myEl.srcObject = stream;
    this.streamReady.next();
  }

  handleError(error: any) {
    if (error.name === 'ConstraintNotSatisfiedError') {
      // const v = constraints.video;
      // this.errorMsg(`The resolution ${v.width.exact}x${v.height.exact} px is not supported by your device.`);
      this.errorMsg(`The resolution px is not supported by your device.`);
    } else if (error.name === 'PermissionDeniedError') {
      this.errorMsg('Permissions have not been granted to use your camera and ' +
        'microphone, you need to allow the page access to your devices in ' +
        'order for the demo to work.');
    }
    this.errorMsg(`getUserMedia error: ${error.name}`, error);
  }

  errorMsg(msg: string, error?: any) {
    // const errorElement = document.querySelector('#errorMsg');
    // errorElement.innerHTML += `<p>${msg}</p>`;
    // if (typeof error !== 'undefined') {
    console.error(error);
    console.error(msg);
    // }
  }
}
