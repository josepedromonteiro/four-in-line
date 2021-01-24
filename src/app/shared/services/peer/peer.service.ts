import { Injectable } from '@angular/core';
import Peer, { DataConnection } from 'peerjs';
import { Observable, of } from 'rxjs';
import { Match } from '../../../models/match.model';
import { AngularFireDatabase } from '@angular/fire/database';
import { map, mergeMap, take } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class PeerService {

  private peer_: Peer;
  public connection: DataConnection;
  public lastPeerId: string;
  public matchId: string;


  constructor(private db: AngularFireDatabase) {
  }

  public get peer(): Observable<Peer> {
    if (!this.peer_) {
      return this.getMatchData(this.matchId).pipe(
        mergeMap((matchData: Partial<Match>) => {
          if (matchData.peerConnection.id) {
            return this.connectToPeer(matchData.peerConnection.id);
          } else {
            return this.createPeer();
          }
        })
      );
    }

    return of(this.peer_);
  }

  public createPeer(id: string = null): Observable<Peer> {
    console.log('peer connect');
    this.peer_ = new Peer(id, { debug: 2 });

    this.peer_.on('connection', (c: DataConnection) => {
      // Allow only a single connection
      if (this.connection && this.connection.open) {
        c.on('open', () => {
          c.send('Already connected to another client');
          setTimeout(() => {
            c.close();
          }, 500);
        });
        return;
      }

      this.connection = c;
      console.log('Connected to: ' + this.connection.peer);
    });


    this.peer_.on('disconnected', () => {
      console.log('Connection lost. Please reconnect');

      // Workaround for peer.reconnect deleting previous id
      this.peer_.id = this.lastPeerId;
      // this.peer._lastServerId = this.lastPeerId;
      this.peer_.reconnect();
    });
    this.peer_.on('close', () => {
      this.connection = null;
      console.log('Connection destroyed');
    });
    this.peer_.on('error', (err) => {
      console.log(err);
      alert('' + err);
    });


    return new Observable<Peer>(subscriber => {
      this.peer_.on('open', (id_: string) => {
        // Workaround for peer.reconnect deleting previous id
        if (this.peer_.id === null) {
          console.log('Received null id from peer open');
          this.peer_.id = this.lastPeerId;
        } else {
          this.lastPeerId = this.peer_.id;
        }

        console.log('ID: ' + this.peer_.id);
        subscriber.next(this.peer_);
        subscriber.complete();
      });
    });
  }

  public connectToPeer(matchId): Observable<Peer> {
    return this.peer.pipe(
      take(1),
      map((peer: Peer) => {
        this.connection = peer.connect(matchId);
        return this.peer_;
      })
    );
  }

  public getMatchData(id: string): Observable<Partial<Match>> {
    return this.db.object<Partial<Match>>(id).valueChanges();
  }
}
