import { Injectable } from '@angular/core'
import { Subject } from 'rxjs'
import { VoiceAction, VoiceActionEnum } from '../enums/voice-action.enum'

declare var webkitSpeechRecognition: any

@Injectable({
  providedIn: 'root'
})
export class VoiceRecognitionService {

  recognition = new webkitSpeechRecognition()
  isSpeechRecognitionEnabled = false

  selectedColumn: number
  public onVoiceChanged: Subject<VoiceAction> = new Subject<VoiceAction>()

  constructor() { }

  init() {
    this.recognition.lang = 'en-US'

    this.recognition.addEventListener('result', (e) => {
      const transcript = Array.from(e.results)
        .map((result) => result[0])
        .map((result) => result.transcript)
        .join('')
      console.log(transcript)

      this.columnAction(transcript)
      this.playAction(transcript)
    })
  }

  start() {
    this.recognition.start()
    this.isSpeechRecognitionEnabled = true
    console.log("Speech recognition started")
    this.recognition.addEventListener('end', () => {
      if (this.isSpeechRecognitionEnabled) {
        this.recognition.start()
      } else {
        this.recognition.stop()
      }
    })
  }

  stop() {
    this.recognition.stop()
    this.isSpeechRecognitionEnabled = false
    console.log("End speech recognition")
  }

  columnAction(transcript: string) {
    switch (transcript) {
      case "one":
      case "1":
        console.log("one")
        this.selectedColumn = 0
        break
      case "two":
      case "2":
        console.log("two")
        this.selectedColumn = 1
        break
      case "three":
      case "3":
        console.log("three")
        this.selectedColumn = 2
        break
      case "four":
      case "4":
        console.log("four")
        this.selectedColumn = 3
        break
      case "five":
      case "5":
        console.log("five")
        this.selectedColumn = 4
        break
      case "six":
      case "6":
        console.log("six")
        this.selectedColumn = 5
        break
      case "seven":
      case "7":
        console.log("seven")
        this.selectedColumn = 6
        break
      default:
        console.log("default")
        this.selectedColumn = -1
        return
    }

    this.onVoiceChanged.next({ action: VoiceActionEnum.COLUMN, value: this.selectedColumn })
  }

  playAction(transcript: string) {
    switch (transcript) {
      case "start":
      case "play":
        console.log("play")
        this.onVoiceChanged.next({ action: VoiceActionEnum.START, value: "play" })
        break
      default:
        console.log("default")
        return
    }
  }
}
